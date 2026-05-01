'use client';

import { useState } from 'react';
import { X, AlertCircle } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import MyCosmeticsDetailForm from '@/components/my-cosmetics/MyCosmeticsDetailForm';
import type { NukkiResult } from '@/components/my-cosmetics/NukkiResultCard';

interface MyCosmeticsReviewStepProps {
  results: NukkiResult[];
  setResults: (results: NukkiResult[]) => void;
  onSave: () => void;
  onCancel: () => void;
  isSaving?: boolean;
}

export default function MyCosmeticsReviewStep({
  results,
  setResults,
  onSave,
  onCancel,
  isSaving = false,
}: MyCosmeticsReviewStepProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const handleDelete = (index: number) => {
    if (!confirm('이 항목을 삭제할까요?')) return;
    setResults(results.filter((_, i) => i !== index));
  };

  const handleDetailSubmit = (updated: NukkiResult) => {
    const next = [...results];
    next[selectedIndex!] = updated;
    setResults(next);
    setSelectedIndex(null);
  };

  if (selectedIndex !== null) {
    return (
      <MyCosmeticsDetailForm
        item={results[selectedIndex]}
        onBack={() => setSelectedIndex(null)}
        onSubmit={handleDetailSubmit}
      />
    );
  }

  return (
    <div className="flex flex-col bg-white">
      <Header
        title="스캔 결과 확인"
        onBack={onCancel}
        rightIcons={[
          {
            kind: 'register',
            text: isSaving ? '저장 중...' : '저장',
            ariaLabel: '저장',
            onClick: onSave,
          },
        ]}
      />

      <main className="overflow-y-auto p-5">
        <div className="text-mono-jet mb-6 flex items-center gap-2 rounded-xl bg-zinc-50 p-4">
          <AlertCircle size={14} className="shrink-0" />
          <div className="text-xs">
            스캔된 정보를 확인하고 수정이 필요한 항목을 선택하세요.
          </div>
        </div>

        <div className="grid grid-cols-3 gap-x-3 gap-y-6">
          {results.map((item, idx) => (
            <div key={`${item.product_name}-${idx}`} className="group relative">
              <div
                onClick={() => setSelectedIndex(idx)}
                className="relative aspect-square cursor-pointer overflow-hidden rounded-2xl border border-zinc-100 shadow-sm transition-all active:scale-95"
                style={{
                  backgroundImage:
                    'linear-gradient(45deg, #f5f5f5 25%, transparent 25%, transparent 75%, #f5f5f5 75%), linear-gradient(45deg, #f5f5f5 25%, transparent 25%, transparent 75%, #f5f5f5 75%)',
                  backgroundSize: '12px 12px',
                  backgroundPosition: '0 0, 6px 6px',
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.src}
                  alt={item.product_name}
                  className="h-full w-full object-contain p-2 drop-shadow-sm"
                />
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(idx);
                  }}
                  className="absolute right-1.5 top-1.5 z-10 flex size-6 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-md hover:bg-black/60"
                >
                  <X size={12} />
                </button>
              </div>

              <div className="mt-2 cursor-pointer px-1" onClick={() => setSelectedIndex(idx)}>
                <div className="truncate text-[10px] text-zinc-400">
                  {item.brand || '브랜드 미상'}
                </div>
                <div className="mt-0.5 truncate text-xs font-semibold text-zinc-800">
                  {item.product_name || '제품명 미상'}
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
