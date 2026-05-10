'use client';

/**
 * 위시 스캔 결과 확인 / 수정 그리드
 * Figma: `포치 공유용` > `위시 - 스캔수정` (node-id: 782-7709)
 * - 헤더: 「사진으로 등록하기」, 좌측 뒤로가기만
 * - 안내 박스: `#FFF7FC`, 라운드 8px, 11px 본문
 * - 그리드: 가로 3열, 간격 16px, 타일 최대 130×130 (`aspect-square`)
 * - 하단 CTA: 「위시리스트 등록하기」, 배경 `#FF93DB`, 높이 56px
 */

import { useState } from 'react';
import ProductDetailForm from '@/components/wishlist/ProductDetailForm';
import ResultCard from '@/components/wishlist/ResultCard';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';

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

  return (
    <div className="relative flex min-h-0 flex-1 basis-0 flex-col bg-white">
      <Header
        title="사진으로 등록하기"
        onBack={onCancel}
        className="h-10 min-h-10 border-0 bg-white/95 px-[20px] py-2.5 shadow-none backdrop-blur-[30px] [&_h3]:leading-5 [&_h3]:font-bold [&_h3]:text-[#161618]"
      />

      <div className="flex min-h-0 flex-1 flex-col px-[20px] pt-4 pb-6">
        <div className="mb-4 rounded-lg bg-[#FFF7FC] px-2.5 py-2.5">
          <p className="!text-[14px] !leading-[150%] font-normal whitespace-pre-line text-[#161618]">
            {`총 ${results.length}개의 제품이 정리되었어요!💄\n어떤 내용이 담겼는지 하나씩 눌러볼까요?`}
          </p>
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="grid w-full grid-cols-3 gap-4 pb-4">
            {results.map((item, idx) => (
              <ResultCard
                key={`${String(item.product_name)}-${idx}`}
                item={item}
                onSelect={() => setSelectedIndex(idx)}
                onDelete={() => handleDelete(idx)}
              />
            ))}
          </div>
        </div>

        <div className="mt-auto mb-[-60px] shrink-0 pt-4">
          <Button
            type="button"
            onClick={onSave}
            disabled={results.length === 0}
            className="h-14 w-full rounded-full border-0 bg-[#FF93DB] px-6 text-base font-bold text-[#161618] hover:bg-[#FF85D5] disabled:opacity-40"
          >
            위시리스트 등록하기
          </Button>
        </div>
      </div>
    </div>
  );
}
