'use client';

import { useState } from 'react';
import Image from 'next/image';
import { AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { PipelineLog } from '@/components/my-cosmetics/PipelineLog';
import { NukkiResultCard, NukkiResultEmpty } from '@/components/my-cosmetics/NukkiResultCard';
import type { NukkiResult } from '@/components/my-cosmetics/NukkiResultCard';
import { detectWithYolo, cropBox } from '@/utils/yolo-detect';

interface PreviewImage {
  file: File;
  previewUrl: string;
}

const loadImageElement = (src: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const img = document.createElement('img');
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('이미지 로드 실패'));
    img.src = src;
  });

export default function MyCosmeticsRegisterPage() {
  const [images, setImages] = useState<PreviewImage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState('');
  const [logs, setLogs] = useState<string[]>([]);
  const [results, setResults] = useState<NukkiResult[]>([]);
  const [hasRun, setHasRun] = useState(false);

  const addLog = (msg: string) => {
    setLogs((prev) => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev]);
  };

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

  const startPipeline = async () => {
    if (images.length === 0) {
      alert('이미지를 선택해주세요.');
      return;
    }

    setIsLoading(true);
    setResults([]);
    setLogs([]);
    setHasRun(true);
    addLog(`🚀 파이프라인 시작 (총 ${images.length}장)`);

    try {
      // ─── Step 1: YOLO 객체 탐지 ───────────────────────────────────────
      setCurrentStep('1단계: YOLO 엔진 초기화 중...');
      addLog('🔍 YOLO 모델 로드 중...');

      const allCrops: string[] = [];
      let totalDetected = 0;

      for (let imgIdx = 0; imgIdx < images.length; imgIdx++) {
        const { previewUrl } = images[imgIdx];
        setCurrentStep(`1단계: 이미지 ${imgIdx + 1}/${images.length} YOLO 탐지 중...`);
        addLog(`🔎 이미지 ${imgIdx + 1} 탐지 중...`);

        const imgElement = await loadImageElement(previewUrl);
        const boxes = await detectWithYolo(imgElement);

        if (boxes.length > 0) {
          addLog(`  └ ${boxes.length}개 객체 감지됨 (score: ${boxes.map((b) => b.score.toFixed(2)).join(', ')})`);
          boxes.forEach((box) => {
            allCrops.push(cropBox(imgElement, box));
          });
          totalDetected += boxes.length;
        } else {
          // 탐지 실패 시 전체 이미지를 그대로 사용
          addLog(`  └ 탐지된 객체 없음 → 전체 이미지 사용`);
          const canvas = document.createElement('canvas');
          canvas.width = imgElement.naturalWidth;
          canvas.height = imgElement.naturalHeight;
          canvas.getContext('2d')?.drawImage(imgElement, 0, 0);
          allCrops.push(canvas.toDataURL('image/jpeg', 0.9));
          totalDetected += 1;
        }
      }

      addLog(`✂️ 총 ${totalDetected}개 크롭 추출 완료`);

      // ─── Step 2: GPT Vision 분석 ──────────────────────────────────────
      setCurrentStep('2단계: GPT가 화장품을 분석하는 중...');
      addLog(`🤖 GPT Vision에 ${allCrops.length}개 이미지 전송 중...`);

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

      addLog(`✅ GPT 분석 완료 (${visionData.duration}초)`);

      const cosmeticItems = gptResults
        .map((item, i) => ({ item, crop: allCrops[i], idx: i }))
        .filter(({ item }) => item.is_cosmetic);

      addLog(`🧪 화장품 인식: ${cosmeticItems.length}개 / 전체 ${gptResults.length}개`);

      if (cosmeticItems.length === 0) {
        addLog('⚠️ 화장품으로 인식된 항목이 없습니다.');
        setCurrentStep('');
        setIsLoading(false);
        return;
      }

      // ─── Step 3: 누끼 작업 ────────────────────────────────────────────
      setCurrentStep('3단계: 배경 제거(누끼) 작업 중...');
      addLog('✨ 배경 제거 모델 로드 중...');

      const { removeBackground } = await import('@imgly/background-removal');

      for (let i = 0; i < cosmeticItems.length; i++) {
        const { item, crop, idx } = cosmeticItems[i];
        setCurrentStep(`3단계: 누끼 작업 중... (${i + 1}/${cosmeticItems.length})`);
        addLog(`🧼 [${i + 1}] "${item.product_name}" 누끼 작업 중...`);

        let nukkiSrc = crop;
        try {
          const blob = await removeBackground(crop, { model: 'isnet_quint8' });
          nukkiSrc = URL.createObjectURL(blob);
          addLog(`  └ 완료!`);
        } catch {
          addLog(`  └ ⚠️ 누끼 실패, 원본 크롭 사용`);
        }

        setResults((prev) => [
          ...prev,
          {
            id: idx,
            src: nukkiSrc,
            brand: item.brand,
            product_name: item.product_name,
            product_type: item.product_type,
            key_features: item.key_features,
            confidence_score: item.confidence_score,
          },
        ]);
      }

      addLog('🎉 모든 작업 완료!');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '알 수 없는 오류';
      addLog(`❌ 에러: ${message}`);
    } finally {
      setCurrentStep('');
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-full flex-col">
      <Header title="화장품 스캔 등록" />

      <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-5">
        {/* ── 이미지 업로드 그리드 ─────────────────────────────────────── */}
        <div className="grid grid-cols-3 gap-3">
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

          {/* 이미지 추가 버튼 */}
          <label className="border-mono-gray hover:bg-mono-bright-gray flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed transition-colors">
            <Image
              src="/icons/imgplus.svg"
              alt=""
              width={24}
              height={24}
              unoptimized
              className="opacity-40"
            />
            <span className="text-mono-dark-gray text-[10px] font-bold">사진 추가</span>
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleFileChange}
            />
          </label>
        </div>

        {/* ── 분석 시작 버튼 ──────────────────────────────────────────── */}
        <Button
          onClick={startPipeline}
          disabled={isLoading || images.length === 0}
          className="bg-mono-jet text-mono-white h-11 w-full rounded-full text-sm font-bold disabled:opacity-30"
        >
          {isLoading
            ? 'AI 분석 중...'
            : images.length === 0
              ? '화장품 사진을 추가해주세요'
              : `${images.length}장 스캔 시작`}
        </Button>

        {/* ── 파이프라인 로그 ──────────────────────────────────────────── */}
        {(isLoading || logs.length > 0) && (
          <PipelineLog logs={logs} currentStep={isLoading ? currentStep : undefined} />
        )}

        {/* ── 결과 그리드 ─────────────────────────────────────────────── */}
        {hasRun && (
          <div>
            <p className="text-mono-jet mb-3 text-sm font-black">
              분석 결과{results.length > 0 ? ` (${results.length}개)` : ''}
            </p>
            <div className="grid grid-cols-2 gap-3">
              <AnimatePresence>
                {results.length > 0 ? (
                  results.map((item) => <NukkiResultCard key={item.id} item={item} />)
                ) : (
                  !isLoading && <NukkiResultEmpty key="empty" />
                )}
              </AnimatePresence>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
