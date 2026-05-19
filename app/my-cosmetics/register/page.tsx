'use client';

/**
 * 내 화장품 스캔 등록 페이지
 *
 * UI: `app/wish/register/scan/page.tsx` (위시 - 스캔)과 동일 레이아웃
 *
 * 3단계 AI 파이프라인:
 *   1. YOLO 객체 인식 → 크롭
 *   2. GPT Vision (`/api/vision/extract` + 네이버 보강)
 *   3. @imgly/background-removal 배경 제거
 *
 * 단계 완료 후 RegisterReviewStep(위시 스캔 결과 UI)으로 전환.
 */

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { ImagePlus, X } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/common/Modal';
import RegisterReviewStep from '@/components/wishlist/RegisterReviewStep';
import { WishScanAnalyzeLoading } from '@/components/wishlist/WishScanAnalyzeLoading';
import type { NukkiResult } from '@/components/my-cosmetics/NukkiResultCard';
import { getSearchMyCosmeticsQueryKey } from '@/api/generated/my-cosmetics-controller/my-cosmetics-controller';
import { registerMyCosmeticsFromScan } from '@/lib/my-cosmetics-register';
import { runMyCosmeticsScanPipeline } from '@/lib/my-cosmetics-scan-pipeline';
import {
  nukkiResultToScanFormData,
  scanFormDataToNukkiResult,
} from '@/lib/my-cosmetics-scan-form';
import {
  clearPouchRegisterReturnPath,
  readPouchRegisterReturnPath,
} from '@/lib/pouch-setup';
import { extractImageFileData } from '@/utils/image-utils';
import type { ImageFileData } from '@/types/image';
import { cn } from '@/lib/utils';
import { scheduleScanEntryTipOpen } from '@/lib/scan-entry-tip';
import { resolveMediaUrl } from '@/lib/resolve-media-url';
import { resolveDisplayImageSrc } from '@/lib/next-image-src';

const MAX_CAPTURE_IMAGES = 9;

const MY_COSMETICS_SCAN_ENTRY_TIP_DISMISSED_KEY =
  'my-cosmetics-register-scan-entry-tip-dismissed';

/** data URL → 업로드용 File */
const dataUrlToFile = (dataUrl: string, index: number): File => {
  const parts = dataUrl.split(',');
  const mime = parts[0].match(/:(.*?);/)?.[1] ?? 'image/jpeg';
  const ext = mime.split('/')[1]?.replace('jpeg', 'jpg') ?? 'jpg';
  const binary = atob(parts[1] ?? '');
  const buffer = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    buffer[i] = binary.charCodeAt(i);
  }
  return new File([buffer], `capture-${index}.${ext}`, { type: mime });
};

const blobToCaptureFile = (blob: Blob, index: number): File => {
  const mime = blob.type && blob.type.length > 0 ? blob.type : 'image/png';
  const ext =
    mime === 'image/jpeg' || mime === 'image/jpg'
      ? 'jpg'
      : mime === 'image/webp'
        ? 'webp'
        : 'png';
  return new File([blob], `capture-${index}.${ext}`, { type: mime });
};

const cropBase64ToCaptureFile = (cropBase64: string, index: number): File =>
  dataUrlToFile(cropBase64, index);

const nukkiResultToDirectFile = (
  r: NukkiResult,
  index: number,
): File => {
  if (r.didRemoveBackground === true && r.nukkiBlob instanceof Blob) {
    return blobToCaptureFile(r.nukkiBlob, index);
  }
  return cropBase64ToCaptureFile(r.cropBase64, index);
};

const loadImageElement = (src: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const img = document.createElement('img');
    const displaySrc = resolveDisplayImageSrc(resolveMediaUrl(src));
    if (/^https?:\/\//i.test(displaySrc)) {
      img.crossOrigin = 'anonymous';
    }
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('이미지 로드 실패'));
    img.src = displaySrc;
  });

export default function MyCosmeticsRegisterPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [images, setImages] = useState<ImageFileData[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [results, setResults] = useState<NukkiResult[]>([]);
  const [isReviewStep, setIsReviewStep] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isEntryTipModalOpen, setIsEntryTipModalOpen] = useState(false);
  const [isScanFailModalOpen, setIsScanFailModalOpen] = useState(false);
  const [analyzeLoadingPhase, setAnalyzeLoadingPhase] = useState<0 | 1>(0);
  const isSaveInFlightRef = useRef(false);

  useEffect(() => {
    return scheduleScanEntryTipOpen(
      MY_COSMETICS_SCAN_ENTRY_TIP_DISMISSED_KEY,
      () => {
        setIsEntryTipModalOpen(true);
      },
    );
  }, []);

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

  const removeImage = (index: number) => {
    const target = images[index];
    URL.revokeObjectURL(target.previewUrl);
    setImages(images.filter((_, i) => i !== index));
  };

  const startScan = async () => {
    if (images.length === 0) {
      return;
    }

    setAnalyzeLoadingPhase(0);
    setIsScanning(true);
    const analyzePhaseTimerId = window.setTimeout(() => {
      setAnalyzeLoadingPhase(1);
    }, 2800);

    try {
      const nukkiResults = await runMyCosmeticsScanPipeline(
        images.map((img) => img.previewUrl),
        loadImageElement,
      );

      if (nukkiResults.length === 0) {
        setIsScanFailModalOpen(true);
        return;
      }

      setResults(nukkiResults);
      setIsReviewStep(true);
    } catch (err) {
      console.error('[MyCosmetics/register] 분석 실패:', err);
      setIsScanFailModalOpen(true);
    } finally {
      window.clearTimeout(analyzePhaseTimerId);
      setIsScanning(false);
      setAnalyzeLoadingPhase(0);
    }
  };

  const handleSave = async () => {
    if (results.length === 0 || isSaveInFlightRef.current) {
      return;
    }

    const failedNukkiCount = results.filter(
      (r) => r.didRemoveBackground !== true,
    ).length;
    if (failedNukkiCount > 0) {
      const proceed = window.confirm(
        `배경 제거에 실패한 상품이 ${failedNukkiCount}개 있습니다. 원본 이미지로 저장할까요?`,
      );
      if (!proceed) {
        return;
      }
    }

    isSaveInFlightRef.current = true;
    setIsSaving(true);

    try {
      const captureImages = results.map((r, i) =>
        cropBase64ToCaptureFile(r.cropBase64, i),
      );
      const directImages = results.map((r, i) => nukkiResultToDirectFile(r, i));
      const items = results.map((r) => ({
        name: r.product_name,
        brand: r.brand,
        category: r.main_category,
        subCategory: r.sub_category,
        feature: r.key_features.join(', '),
      }));

      await registerMyCosmeticsFromScan({
        captureImages,
        directImages,
        items,
      });
      await queryClient.invalidateQueries({
        queryKey: getSearchMyCosmeticsQueryKey({ size: 100, sort: 'desc' }),
      });
      const returnPath = readPouchRegisterReturnPath();
      clearPouchRegisterReturnPath();
      alert('내 화장품에 저장되었습니다.');
      router.push(returnPath ?? '/my-cosmetics');
    } catch (err) {
      alert(
        '저장 중 오류가 발생했습니다: ' +
          (err instanceof Error ? err.message : '알 수 없는 오류'),
      );
    } finally {
      isSaveInFlightRef.current = false;
      setIsSaving(false);
    }
  };

  if (isReviewStep) {
    return (
      <RegisterReviewStep
        results={results.map(nukkiResultToScanFormData)}
        setResults={(next) => {
          setResults((prev) =>
            next.map((row, index) =>
              scanFormDataToNukkiResult(row, prev[index]),
            ),
          );
        }}
        onSave={handleSave}
        onCancel={() => {
          if (confirm('수정 중인 내용이 사라집니다. 취소하시겠습니까?')) {
            setIsReviewStep(false);
            setResults([]);
          }
        }}
        saveButtonLabel="내 화장품 등록하기"
        hidePriceOnDetail
        hideYoutubeReview
        isSavePending={isSaving}
        cardImageObjectFit="contain"
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
                className="mt-px shrink-0"
              />
              <p className="text-[11px] leading-[150%] font-normal text-[#161618]">
                최대 9장의 이미지를 한꺼번에 등록할 수 있어요.
              </p>
            </div>
          </div>

          {images.length > 0 ? (
            <div className="flex min-h-0 flex-1 flex-col justify-center">
              <div className="grid w-full grid-cols-3 gap-3 sm:gap-4">
                {images.map((img, idx) => (
                  <div
                    key={idx}
                    className="relative aspect-square w-full min-w-0 overflow-hidden rounded-lg bg-[#F3F3F3]"
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
                  <label className="relative flex aspect-square w-full min-w-0 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-lg bg-[#F3F3F3] transition-colors hover:bg-[#EAEAEA]">
                    <Image
                      src="/icons/imgplus.svg"
                      alt=""
                      width={24}
                      height={24}
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
            onClick={startScan}
            disabled={isScanning || images.length === 0}
            className={cn(
              'h-14 w-full rounded-full border-0 px-6 text-base font-bold text-[#161618] transition-colors',
              images.length > 0
                ? 'bg-[#FF93DB] hover:bg-[#FF85D5] disabled:pointer-events-none disabled:opacity-70'
                : 'bg-[#DCDCDC] disabled:opacity-50',
            )}
          >
            {isScanning ? 'AI 분석 중...' : 'AI로 정보 불러오기'}
          </Button>
        </div>
      </div>

      {isScanning ? (
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
        onConfirm={() => {
          try {
            window.localStorage.setItem(
              MY_COSMETICS_SCAN_ENTRY_TIP_DISMISSED_KEY,
              '1',
            );
          } catch {
            // private mode 등 저장 실패 시 무시
          }
        }}
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
