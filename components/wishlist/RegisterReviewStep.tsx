'use client';

import { useState } from 'react';
import { AlertCircle } from 'lucide-react';
import ProductDetailForm from '@/components/wishlist/ProductDetailForm';
import ResultCard from '@/components/wishlist/ResultCard';
import { Header } from '@/components/layout/Header';

interface ReviewStepProps {
  results: any[];
  setResults: (results: any[]) => void;
  onSave: () => void;
  onCancel: () => void;
}

export default function RegisterReviewStep({
  results,
  setResults,
  onSave,
  onCancel,
}: ReviewStepProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const handleDelete = (index: number) => {
    if (!confirm('이 항목을 삭제할까요?')) return;
    setResults(results.filter((_, i) => i !== index));
  };

  const handleDetailSubmit = (updatedData: any) => {
    const updatedResults = [...results];
    updatedResults[selectedIndex!] = updatedData;
    setResults(updatedResults);
    setSelectedIndex(null);
  };

  // 상세 수정 뷰
  if (selectedIndex !== null) {
    return (
      <ProductDetailForm
        initialData={results[selectedIndex]}
        showScanWarning={true}
        submitLabel="수정 완료"
        onBack={() => setSelectedIndex(null)}
        onSubmit={handleDetailSubmit}
      />
    );
  }

  // 결과 그리드 뷰
  return (
    <div className="flex flex-col bg-white">
      <Header
        title="스캔 결과 확인"
        showBack
        onBack={onCancel}
        rightIcons={[{ kind: 'register', onClick: onSave }]}
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
            <ResultCard
              key={`${item.product_name}-${idx}`}
              item={item}
              onSelect={() => setSelectedIndex(idx)}
              onDelete={() => handleDelete(idx)}
            />
          ))}
        </div>
      </main>
    </div>
  );
}
