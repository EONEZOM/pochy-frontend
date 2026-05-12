'use client';

/**
 * 내 화장품 스캔 등록 페이지
 *
 * 3단계 AI 파이프라인:
 *   1. YOLO 객체 인식: 이미지에서 화장품 위치를 감지하고 크롭합니다.
 *      탐지 실패 시 전체 이미지를 그대로 사용합니다.
 *   2. GPT Vision 분석 (/api/my-cosmetics/vision BFF):
 *      크롭 이미지를 GPT-4o에 전달해 브랜드/제품명/카테고리/특징을 추출합니다.
 *      is_cosmetic=false인 항목은 자동으로 필터링합니다.
 *   3. @imgly/background-removal 배경 제거:
 *      화장품으로 인식된 크롭에 대해 누끼를 딥니다.
 *      실패 시 원본 크롭을 대신 사용합니다(소리 없이 넘어감).
 *
 * 단계 완료 후 MyCosmeticsReviewStep으로 전환되어
 * 사용자가 결과를 확인·수정하고 최종 저장합니다.
 *
 * 저장: lib/my-cosmetics-register.ts의 registerMyCosmeticsMultipart 사용.
 * captureImages: 누끼 성공 시 메모리의 `nukkiBlob`에서 File 생성( blob: fetch 미사용 ).
 * Orval 생성 훅이 아닌 수동 래퍼를 쓰는 이유는 해당 파일 주석 참고.
 */

import { useRef, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { X } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import MyCosmeticsReviewStep from '@/components/my-cosmetics/MyCosmeticsReviewStep';
import type { NukkiResult } from '@/components/my-cosmetics/NukkiResultCard';
import { detectWithYolo, cropBox } from '@/utils/yolo-detect';
import { registerMyCosmeticsMultipart } from '@/lib/my-cosmetics-register';

interface PreviewImage {
  file: File;
  previewUrl: string;
}

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
  const mime =
    blob.type && blob.type.length > 0 ? blob.type : 'image/png';
  const ext =
    mime === 'image/jpeg' || mime === 'image/jpg'
      ? 'jpg'
      : mime === 'image/webp'
        ? 'webp'
        : 'png';
  return new File([blob], `capture-${index}.${ext}`, { type: mime });
};

/**
 * 저장용 캡처 File. 누끼 Blob이 있으면 그대로 사용하고, 없으면 `src`(data URL 등) 또는 크롭 폴백.
 */
const nukkiResultToCaptureFile = async (
  r: NukkiResult,
  index: number,
): Promise<File> => {
  if (r.nukkiBlob instanceof Blob) {
    return blobToCaptureFile(r.nukkiBlob, index);
  }
  return srcToCaptureFile(r.src, r.cropBase64, index);
};

/**
 * 리뷰 `src`(누끼 실패 시 data URL 등) → 업로드용 File.
 * `blob:`는 `nukkiBlob`가 없을 때만 시도하며, 실패 시 `cropBase64`로 폴백합니다.
 */
const srcToCaptureFile = async (
  src: string,
  cropBase64Fallback: string,
  index: number,
): Promise<File> => {
  const trimmed = String(src ?? '').trim();

  if (trimmed.startsWith('data:')) {
    return dataUrlToFile(trimmed, index);
  }

  const fallback = () => dataUrlToFile(cropBase64Fallback, index);

  if (trimmed.startsWith('blob:')) {
    try {
      const res = await fetch(trimmed);
      if (!res.ok) {
        return fallback();
      }
      const blob = await res.blob();
      return blobToCaptureFile(blob, index);
    } catch {
      return fallback();
    }
  }

  try {
    const res = await fetch(trimmed);
    if (!res.ok) {
      return fallback();
    }
    const blob = await res.blob();
    return blobToCaptureFile(blob, index);
  } catch {
    return fallback();
  }
};

const loadImageElement = (src: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const img = document.createElement('img');
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('이미지 로드 실패'));
    img.src = src;
  });

export default function MyCosmeticsRegisterPage() {
  const router = useRouter();
  const [images, setImages] = useState<PreviewImage[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [scanStep, setScanStep] = useState('');
  const [results, setResults] = useState<NukkiResult[]>([]);
  const [isReviewStep, setIsReviewStep] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  /** 저장 중 재진입 방지 — `isSaving`은 리렌더 전까지 갱신되지 않아 ref로 동기 차단 */
  const isSaveInFlightRef = useRef(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    const newItems: PreviewImage[] = files.map((file) => ({
      file,
      previewUrl: URL.createObjectURL(file),
    }));
    setImages((prev) => [...prev, ...newItems]);
    e.target.value = '';
  };

  const removeImage = (index: number) => {
    const target = images[index];
    URL.revokeObjectURL(target.previewUrl);
    setImages(images.filter((_, i) => i !== index));
  };

  const startScan = async () => {
    if (images.length === 0) return;

    setIsScanning(true);
    setScanStep('객체 인식 중...');

    try {
      // ─── Step 1: YOLO ─────────────────────────────────────────────
      const allCrops: string[] = [];

      for (let i = 0; i < images.length; i++) {
        setScanStep(`이미지 ${i + 1}/${images.length} 분석 중...`);
        const imgElement = await loadImageElement(images[i].previewUrl);
        const boxes = await detectWithYolo(imgElement);

        if (boxes.length > 0) {
          boxes.forEach((box) => allCrops.push(cropBox(imgElement, box)));
        } else {
          const canvas = document.createElement('canvas');
          canvas.width = imgElement.naturalWidth;
          canvas.height = imgElement.naturalHeight;
          canvas.getContext('2d')?.drawImage(imgElement, 0, 0);
          allCrops.push(canvas.toDataURL('image/jpeg', 0.9));
        }
      }

      // ─── Step 2: GPT Vision ───────────────────────────────────────
      setScanStep('AI가 화장품을 분석 중...');

      const visionRes = await fetch('/api/my-cosmetics/vision', {
        method: 'POST',
        body: JSON.stringify({ images: allCrops }),
        headers: { 'Content-Type': 'application/json' },
      });
      const visionData = await visionRes.json();

      if (!visionRes.ok) {
        throw new Error(visionData.error ?? 'GPT 분석 실패');
      }

      const gptResults: Array<{
        is_cosmetic: boolean;
        brand: string;
        product_name: string;
        product_type: string;
        key_features: string[];
        confidence_score: number;
      }> = visionData.results ?? [];

      const cosmeticItems = gptResults
        .map((item, i) => ({ item, crop: allCrops[i], idx: i }))
        .filter(({ item }) => item.is_cosmetic);

      if (cosmeticItems.length === 0) {
        alert('화장품으로 인식된 항목이 없습니다. 다시 시도해주세요.');
        return;
      }

      // ─── Step 3: 누끼 ─────────────────────────────────────────────
      setScanStep('배경 제거 중...');

      const { removeBackground } = await import('@imgly/background-removal');
      const nukkiResults: NukkiResult[] = [];

      for (let i = 0; i < cosmeticItems.length; i++) {
        const { item, crop, idx } = cosmeticItems[i];
        setScanStep(`배경 제거 중... (${i + 1}/${cosmeticItems.length})`);

        let nukkiSrc = crop;
        let nukkiBlob: Blob | undefined;
        try {
          const blob = await removeBackground(crop, { model: 'isnet_quint8' });
          nukkiBlob = blob;
          nukkiSrc = URL.createObjectURL(blob);
        } catch {
          // 누끼 실패 시 원본 크롭 사용
        }

        nukkiResults.push({
          id: idx,
          src: nukkiSrc,
          nukkiBlob,
          cropBase64: crop,
          brand: item.brand,
          product_name: item.product_name,
          product_type: item.product_type,
          key_features: item.key_features,
          confidence_score: item.confidence_score,
        });
      }

      setResults(nukkiResults);
      setIsReviewStep(true);
    } catch (err) {
      alert('분석 중 오류가 발생했습니다: ' + (err instanceof Error ? err.message : '알 수 없는 오류'));
    } finally {
      setIsScanning(false);
      setScanStep('');
    }
  };

  const handleSave = async () => {
    if (results.length === 0 || isSaveInFlightRef.current) {
      return;
    }
    isSaveInFlightRef.current = true;
    setIsSaving(true);

    try {
      const captureImages = await Promise.all(
        results.map((r, i) => nukkiResultToCaptureFile(r, i)),
      );
      const data = results.map((r) => ({
        name: r.product_name,
        brand: r.brand,
        category: r.product_type,
        feature: r.key_features.join(', '),
      }));

      await registerMyCosmeticsMultipart({ captureImages, data });
      alert('내 화장품 파우치에 저장되었습니다!');
      router.push('/my-cosmetics');
    } catch (err) {
      alert('저장 중 오류가 발생했습니다: ' + (err instanceof Error ? err.message : '알 수 없는 오류'));
    } finally {
      isSaveInFlightRef.current = false;
      setIsSaving(false);
    }
  };

  // ─── 리뷰 스텝 ──────────────────────────────────────────────────────
  if (isReviewStep) {
    return (
      <MyCosmeticsReviewStep
        results={results}
        setResults={setResults}
        onSave={handleSave}
        onCancel={() => {
          if (confirm('스캔 결과가 사라집니다. 처음으로 돌아갈까요?')) {
            setIsReviewStep(false);
            setResults([]);
          }
        }}
        isSaving={isSaving}
      />
    );
  }

  // ─── 업로드 스텝 ────────────────────────────────────────────────────
  return (
    <div className="flex h-full flex-col">
      <Header title="화장품 스캔 등록" />

      <div className="flex flex-1 flex-col items-center justify-between p-5">
        <div className="w-full">
          {images.length === 0 ? (
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
                화장품 사진 등록하기
              </span>
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleFileChange}
              />
            </label>
          ) : (
            <div className="grid w-full grid-cols-3 gap-3">
              {images.map((img, idx) => (
                <div
                  key={idx}
                  className="border-mono-bright-gray bg-mono-bright-gray relative aspect-square overflow-hidden rounded-2xl border"
                >
                  <Image src={img.previewUrl} alt="preview" fill className="object-cover" />
                  <button
                    onClick={() => removeImage(idx)}
                    className="absolute right-1.5 top-1.5 flex size-5 items-center justify-center rounded-full bg-black/50 text-white"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
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
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handleFileChange}
                />
              </label>
            </div>
          )}
        </div>

        <Button
          onClick={startScan}
          disabled={isScanning || images.length === 0}
          className="bg-mono-jet text-mono-white h-11 rounded-full px-5 py-3 text-sm font-bold transition-opacity disabled:opacity-30"
        >
          {isScanning ? 'AI 분석 중...' : `${images.length}개의 이미지 스캔하기`}
        </Button>
      </div>

      {/* 로딩 오버레이 */}
      {isScanning && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-black/50 backdrop-blur-sm">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-white border-t-transparent" />
          <p className="text-sm font-bold text-white">
            {scanStep || 'AI가 화장품을 분석 중입니다...'}
          </p>
        </div>
      )}
    </div>
  );
}
