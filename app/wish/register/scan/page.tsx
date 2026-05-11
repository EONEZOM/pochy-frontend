'use client';

/**
 * 위시리스트 스캔 등록 페이지
 *
 * Figma: `포치 공유용` > `위시 - 스캔` (node-id: 782-7489)
 * - 프레임 360×812, 본문 폭 320px (좌우 20px 마진)
 * - 헤더: 블러 배경, 타이틀「사진으로 등록하기」, 높이 40px 권장
 * - 업로드 영역: 320×130, 라운드 8px, 핑크 점선 `#FF93DB`, 안내 텍스트 `#FF60CA`
 * - 힌트: warning 아이콘 17px + 본문 11px
 * - 썸네일 그리드: 96×96, 간격 16px, 배경 `#F3F3F3`
 * - CTA: 높이 56px, 라운드 100px — 사진 없음 `#DCDCDC` 비활성 / 사진 있음 `#FF93DB` 활성
 *
 * 2단계 AI 파이프라인:
 *   1. GPT Vision 분석 (useAnalyzeCosmeticCapture 훅):
 *      이미지를 1280px로 리사이징 후 /api/vision/extract BFF를 통해 GPT-4o에 전달.
 *      화장품 정보 추출 후 네이버 쇼핑 API로 공식 이미지/가격 정보를 보강합니다.
 *      → resizedFiles도 함께 반환되어 백엔드 등록 시 재사용됩니다.
 *   2. RegisterReviewStep으로 전환:
 *      사용자가 카드를 클릭해 개별 항목 수정이 가능합니다.
 *      수정 폼(ProductDetailForm)에서 네이버 재검색 버튼으로 정보를 새로 채울 수 있습니다.
 *
 * 내 화장품 스캔(YOLO 포함)과 달리 위시리스트는 사용자가 직접 촬영한 사진이 아닌
 * 온라인 캡처 이미지를 주로 등록하므로 YOLO 객체 인식 단계가 없습니다.
 *
 * 저장: `POST /api/wish-cosmetics/v2` (`createWishCosmeticsV2Multipart`).
 *
 * 진입 시 안내 모달: Figma node-id 782-7577 (`위시 - 스캔` 오버레이)
 *
 * AI 분석 중 로딩: 782-7681 (초반) → 782-7695 (완료 임박) — 동일 레이아웃·로고, 문구만 전환
 *
 * 스캔 실패 모달: Figma node-id 782-7629 (sad 아이콘 + 실패 / 확인)
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { extractImageFileData } from '@/utils/image-utils';
import { useAnalyzeCosmeticCapture } from '@/hooks/mutation/useAnalyzeCosmeticCapture';
import { ImagePlus, X } from 'lucide-react';
import Image from 'next/image';
import { ImageFileData } from '@/types/image';
import RegisterReviewStep from '@/components/wishlist/RegisterReviewStep';
import { Button } from '@/components/ui/button';
import { Header } from '@/components/layout/Header';
import {
  createWishCosmeticsV2Multipart,
  mapScanResultsToV2Request,
} from '@/lib/wish-cosmetics';
import { cn } from '@/lib/utils';
import { Modal } from '@/components/common/Modal';
import { WishScanAnalyzeLoading } from '@/components/wishlist/WishScanAnalyzeLoading';

const MAX_CAPTURE_IMAGES = 9;

type AnalysisResult = Record<string, unknown>;

const buildCaptureImagesForRequest = (
  files: File[],
  requestLength: number,
): File[] => {
  if (files.length === 0 || requestLength <= 0) return [];
  if (files.length >= requestLength) return files.slice(0, requestLength);

  return Array.from({ length: requestLength }, (_, index) => {
    const source = files[index % files.length];
    return source;
  });
};

export default function WishlistRegisterPage() {
  const router = useRouter();
  const [images, setImages] = useState<ImageFileData[]>([]);
  const [analysisResults, setAnalysisResults] = useState<AnalysisResult[]>([]);
  const [resizedFiles, setResizedFiles] = useState<File[]>([]);
  const [isReviewStep, setIsReviewStep] = useState(false);
  const [isCreatePending, setIsCreatePending] = useState(false);
  const [isEntryTipModalOpen, setIsEntryTipModalOpen] = useState(true);
  const [isScanFailModalOpen, setIsScanFailModalOpen] = useState(false);
  const [analyzeLoadingPhase, setAnalyzeLoadingPhase] = useState<0 | 1>(0);

  const { mutate: analyze, isPending } = useAnalyzeCosmeticCapture();

  useEffect(() => {
    if (!isPending) {
      return;
    }
    const timerId = window.setTimeout(() => {
      setAnalyzeLoadingPhase(1);
    }, 2800);
    return () => window.clearTimeout(timerId);
  }, [isPending]);

  // 이미지 업로드 핸들러
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = extractImageFileData(e.target.files);
    setImages((prev) => {
      const room = MAX_CAPTURE_IMAGES - prev.length;
      if (room <= 0) {
        alert('최대 9장까지 등록할 수 있어요.');
        return prev;
      }
      const nextChunk = picked.slice(0, room);
      if (picked.length > room) {
        alert('최대 9장까지 등록할 수 있어요.');
      }
      return [...prev, ...nextChunk];
    });
    e.target.value = '';
  };

  // 이미지 개별 삭제
  const removeImage = (index: number) => {
    const target = images[index];
    URL.revokeObjectURL(target.previewUrl);
    setImages(images.filter((_, i) => i !== index));
  };

  // 분석 시작 (GPT 호출)
  const startAnalysis = async () => {
    if (images.length === 0) return alert('이미지를 선택해주세요.');

    setAnalyzeLoadingPhase(0);
    const fileArray = images.map((img) => img.file);
    analyze(fileArray, {
      onSuccess: (data) => {
        setAnalysisResults(data.results);
        setResizedFiles(data.resizedFiles);
        setIsReviewStep(true);
      },
      onError: (err) => {
        console.error('[WishRegister/scan] 분석 실패:', err);
        setIsScanFailModalOpen(true);
      },
    });
  };

  // 저장 (백엔드 API 저장)
  const handleSave = async () => {
    if (isCreatePending) return;
    if (analysisResults.length === 0) {
      alert('등록할 항목이 없습니다.');
      return;
    }

    const { request, directImageFiles } =
      mapScanResultsToV2Request(analysisResults);

    setIsCreatePending(true);
    try {
      // 분석 시 리사이징된 파일을 재사용합니다.
      // resizedFiles가 없으면 원본 파일로 fallback합니다.
      const sourceFiles =
        resizedFiles.length > 0 ? resizedFiles : images.map((img) => img.file);
      const normalizedCaptureImages = buildCaptureImagesForRequest(
        sourceFiles,
        request.length,
      );

      await createWishCosmeticsV2Multipart({
        request,
        captureImages: normalizedCaptureImages,
        directImages: directImageFiles,
      });
      alert('위시리스트에 등록되었습니다.');
      router.push('/wish');
    } catch (error) {
      console.error('[WishRegister/scan] 등록 실패:', error);
      alert('위시리스트 등록 중 오류가 발생했습니다.');
    } finally {
      setIsCreatePending(false);
    }
  };

  if (isReviewStep) {
    return (
      <RegisterReviewStep
        results={analysisResults}
        setResults={setAnalysisResults}
        onSave={handleSave}
        onCancel={() => {
          if (confirm('수정 중인 내용이 사라집니다. 취소하시겠습니까?')) {
            setIsReviewStep(false);
          }
        }}
      />
    );
  }

  return (
    <div className="relative flex min-h-0 flex-1 basis-0 flex-col bg-white">
      <Header
        title="사진으로 등록하기"
        className="h-10 min-h-10 border-0 bg-white/95 px-[20px] py-2.5 shadow-none backdrop-blur-[30px] [&_h3]:leading-5 [&_h3]:font-bold [&_h3]:text-[#161618]"
      />

      <div className="flex flex-1 flex-col px-[20px] pt-4 pb-6">
        <div className="flex min-h-0 w-full flex-1 flex-col gap-4">
          <div className="flex shrink-0 flex-col gap-2">
            <label
              className={cn(
                'relative flex min-h-[130px] w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-[#FF93DB] bg-white px-4 transition-colors',
                'hover:bg-[#FFF8FD]',
              )}
            >
              <ImagePlus
                className="size-6 shrink-0 text-[#FF60CA]"
                strokeWidth={1.5}
                aria-hidden
              />
              <span className="text-center text-sm leading-[150%] font-normal text-[#FF60CA]">
                터치하여 사진을 추가해 주세요.
              </span>
              <input
                type="file"
                multiple
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />
            </label>

            <div className="flex w-full items-start gap-1">
              <Image
                src="/icons/warning.svg"
                alt=""
                width={17}
                height={17}
                unoptimized
                className="mt-px shrink-0"
              />
              <p className="text-[11px] leading-[150%] font-normal text-[#161618]">
                최대 9장의 이미지를 한꺼번에 등록할 수 있어요.
              </p>
            </div>
          </div>

          {images.length > 0 ? (
            <div className="flex min-h-0 flex-1 flex-col justify-center">
              <div className="flex w-full flex-wrap justify-center gap-4">
                {images.map((img, idx) => (
                  <div
                    key={idx}
                    className="relative h-[130px] w-[130px] shrink-0 overflow-hidden rounded-lg bg-[#F3F3F3]"
                  >
                    <Image
                      src={img.previewUrl}
                      alt={`선택한 이미지 ${idx + 1}`}
                      fill
                      className="object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(idx)}
                      className="absolute top-1 right-1 flex size-5 items-center justify-center rounded-full bg-black/50 text-white"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
                {images.length < MAX_CAPTURE_IMAGES ? (
                  <label className="flex h-[130px] w-[130px] shrink-0 cursor-pointer flex-col items-center justify-center rounded-lg bg-[#F3F3F3] transition-colors hover:bg-[#EAEAEA]">
                    <Image
                      src="/icons/imgplus.svg"
                      alt=""
                      width={24}
                      height={24}
                      unoptimized
                      className="opacity-60"
                    />
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      className="hidden"
                      onChange={handleFileChange}
                    />
                  </label>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>

        <div className="mt-auto flex w-full shrink-0 pt-6">
          <Button
            type="button"
            onClick={startAnalysis}
            disabled={isPending || images.length === 0}
            className={cn(
              'h-14 w-full rounded-full border-0 px-6 text-base font-bold text-[#161618] transition-colors',
              images.length > 0
                ? 'bg-[#FF93DB] hover:bg-[#FF85D5] disabled:pointer-events-none disabled:opacity-70'
                : 'bg-[#DCDCDC] disabled:opacity-50',
            )}
          >
            {isPending ? 'AI 분석 중...' : 'AI로 정보 불러오기'}
          </Button>
        </div>
      </div>

      {isPending ? (
        <WishScanAnalyzeLoading phase={analyzeLoadingPhase} />
      ) : null}

      <Modal
        open={isEntryTipModalOpen}
        onOpenChange={setIsEntryTipModalOpen}
        title=""
        hideIcon
        variant="warning"
        confirmText="확인"
        closeOnOverlayClick={false}
        className="max-w-[340px] rounded-[24px] px-10 py-4 shadow-xl [&_button]:h-10 [&_button]:min-h-10 [&_button]:rounded-full [&_button]:px-8 [&_button]:text-base [&_button]:font-bold"
      >
        <div className="flex flex-col items-center gap-6">
          <h2 className="sr-only">팁</h2>
          <div className="flex flex-col items-center gap-2">
            <Image
              src="/icons/Vector.svg"
              alt=""
              width={27}
              height={36}
              unoptimized
              className="h-9 w-auto shrink-0"
              aria-hidden
            />
            <span className="text-base leading-5 font-bold text-[#FF60CA]">
              팁
            </span>
          </div>
          <p className="text-sm leading-[150%] font-normal whitespace-pre-line text-[#161618]">
            {`선명하고 밝은 사진을 준비해 주세요.\n사진 속 제품이 하나일 때 가장 잘 찾아요!`}
          </p>
        </div>
      </Modal>

      <Modal
        open={isScanFailModalOpen}
        onOpenChange={setIsScanFailModalOpen}
        title=""
        hideIcon
        variant="warning"
        confirmText="확인"
        closeOnOverlayClick={false}
        className="max-w-[340px] rounded-[24px] px-10 py-4 shadow-xl [&_button]:h-10 [&_button]:min-h-10 [&_button]:rounded-full [&_button]:px-8 [&_button]:text-base [&_button]:font-bold"
      >
        <div className="flex flex-col items-center gap-6">
          <h2 className="sr-only">스캔 실패</h2>
          <div className="flex flex-col items-center gap-2">
            <Image
              src="/icons/sad.svg"
              alt=""
              width={36}
              height={36}
              unoptimized
              className="size-9 shrink-0"
              aria-hidden
            />
            <span className="text-base leading-5 font-bold text-[#FF60CA]">
              실패
            </span>
          </div>
          <p className="text-sm leading-[150%] font-normal whitespace-pre-line text-[#161618]">
            {`정보를 찾기 어려웠어요.\n제품이 더 잘 보이는 사진으로\n다시 시도해 주세요.`}
          </p>
        </div>
      </Modal>
    </div>
  );
}
