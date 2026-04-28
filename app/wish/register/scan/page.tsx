'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { extractImageFileData } from '@/utils/image-utils';
import { useAnalyzeCosmeticCapture } from '@/hooks/mutation/useAnalyzeCosmeticCapture';
import { X } from 'lucide-react';
import Image from 'next/image';
import { ImageFileData } from '@/types/image';
import RegisterReviewStep from '@/components/wishlist/RegisterReviewStep';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/common/Modal';
import Header from '@/components/layout/Header/Header';
import type { CreateDetailDto } from '@/api/model';
import { createWishCosmeticsMultipart } from '@/api/wish-cosmetics';

type AnalysisResult = Record<string, unknown>;

const normalizePrice = (value: unknown): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const normalizeImageUrl = (value: unknown): string | undefined => {
  const url = String(value ?? '').trim();
  if (!url || url.startsWith('blob:')) return undefined;
  return url;
};

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
  const [isTipModalOpen, setIsTipModalOpen] = useState(true);
  const [images, setImages] = useState<ImageFileData[]>([]);
  const [analysisResults, setAnalysisResults] = useState<AnalysisResult[]>([]);
  const [isReviewStep, setIsReviewStep] = useState(false);
  const [isCreatePending, setIsCreatePending] = useState(false);

  const { mutate: analyze, isPending } = useAnalyzeCosmeticCapture();

  // 이미지 업로드 핸들러
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const data = extractImageFileData(e.target.files);
    setImages((prev) => [...prev, ...data]);
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

    const fileArray = images.map((img) => img.file);
    analyze(fileArray, {
      onSuccess: (data) => {
        setAnalysisResults(data.results);
        setIsReviewStep(true);
      },
      onError: (err) => alert('분석 중 오류 발생: ' + err.message),
    });
  };

  // 저장 (백엔드 API 저장)
  const handleSave = async () => {
    if (isCreatePending) return;
    if (analysisResults.length === 0) {
      alert('등록할 항목이 없습니다.');
      return;
    }

    const request: CreateDetailDto[] = analysisResults.map((item) => ({
      name: String(item.product_name ?? ''),
      brand: String(item.brand_name ?? ''),
      category: String(item.main_category ?? ''),
      subCategory: String(item.sub_category ?? ''),
      feature: String(item.features ?? ''),
      memo: String(item.memo ?? ''),
      price: normalizePrice(item.price),
      productImageUrl: normalizeImageUrl(item.official_image ?? item.image_url),
    }));

    setIsCreatePending(true);
    try {
      const normalizedCaptureImages = buildCaptureImagesForRequest(
        images.map((img) => img.file),
        request.length,
      );

      await createWishCosmeticsMultipart({
        request,
        captureImages: normalizedCaptureImages,
      });
      alert('위시리스트에 등록되었습니다.');
      router.push('/wish');
    } catch {
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
    <div className="flex h-full flex-col">
      <Header title="스캔 등록" />

      <div className="flex flex-1 flex-col items-center justify-between p-5">
        <div className="w-full">
          {images.length === 0 ? (
            // 이미지 없을 때 - 넓은 버튼
            <label className="border-mono-gray hover:bg-mono-bright-gray flex w-full cursor-pointer items-center justify-center gap-3 rounded-2xl border-2 border-dashed py-8 transition-colors">
              <Image
                src="/icons/imgplus.svg"
                alt=""
                width={32}
                height={32}
                unoptimized
                className="opacity-50"
              />
              <span className="text-mono-dark-gray text-sm font-bold">
                캡쳐 사진 등록하기
              </span>
              <input
                type="file"
                multiple
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />
            </label>
          ) : (
            // 이미지 있을 때 - 그리드
            <div className="grid w-full grid-cols-3 gap-3">
              {images.map((img, idx) => (
                <div
                  key={idx}
                  className="border-mono-bright-gray bg-mono-bright-gray relative aspect-square overflow-hidden rounded-2xl border"
                >
                  <Image
                    src={img.previewUrl}
                    alt="preview"
                    fill
                    className="object-cover"
                  />
                  <button
                    onClick={() => removeImage(idx)}
                    className="absolute top-1.5 right-1.5 flex size-5 items-center justify-center rounded-full bg-black/50 text-white"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
              {/* ✅ 이미지와 동일한 사이즈의 추가 버튼 */}
              <label className="border-mono-gray hover:bg-mono-bright-gray flex aspect-square cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed transition-colors">
                <Image
                  src="/icons/imgplus.svg"
                  alt=""
                  width={24}
                  height={24}
                  unoptimized
                  className="opacity-40"
                />
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </label>
            </div>
          )}
        </div>

        {/* 스캔 버튼 */}
        <Button
          onClick={startAnalysis}
          disabled={isPending || images.length === 0}
          className="bg-mono-jet text-mono-white h-11 rounded-full px-5 py-3 text-sm font-bold transition-opacity disabled:opacity-30"
        >
          {isPending || isCreatePending
            ? 'AI 분석 중...'
            : `${images.length}개의 이미지 스캔하기`}
        </Button>

        {/* 팁 모달 */}
        <Modal
          open={isTipModalOpen}
          onOpenChange={setIsTipModalOpen}
          variant="warning" // warning 아이콘 = warning.svg
          title="팁"
          description={`제품 사진은 물론,\n이름만 적힌 텍스트 캡쳐본도 포치가\n똑똑하게 읽어드려요!`}
          confirmText="확인"
          closeOnOverlayClick={false} // ✅ 배경 클릭으로 못 닫게
        />
      </div>
    </div>
  );
}
