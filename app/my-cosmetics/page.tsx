'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { MyCosmeticsHeader } from '@/components/my-cosmetics/MyCosmeticsHeader';
import { MyCosmeticsEmptyView } from '@/components/my-cosmetics/MyCosmeticsEmptyView';
import { MyCosmeticsPouchHome } from '@/components/my-cosmetics/MyCosmeticsPouchHome';
import { fetchPouchList, getPouchListQueryKey } from '@/lib/pouch-setup';

function MyCosmeticsListContent() {
  const searchParams = useSearchParams();
  const searchQuery = searchParams.get('q') ?? '';

  const {
    data: pouchData,
    isLoading: isPouchLoading,
    isError: isPouchError,
  } = useQuery({
    queryKey: getPouchListQueryKey(),
    queryFn: fetchPouchList,
  });

  const pouches = pouchData?.result?.pouchList ?? [];
  const hasPouches = pouches.length > 0;
  const isDefaultFilters = searchQuery === '';

  const showRegisteredEmpty =
    !isPouchLoading && !isPouchError && !hasPouches && isDefaultFilters;
  const showPouchHome = hasPouches && isDefaultFilters;

  if (showPouchHome && !isPouchLoading && !isPouchError) {
    return (
      <div className="relative">
        <MyCosmeticsPouchHome pouches={pouches} />
      </div>
    );
  }

  return (
    <div className="relative">
      {!showRegisteredEmpty ? <MyCosmeticsHeader /> : null}
      <main className="px-5 pb-4">
        {isPouchLoading ? (
          <div className="flex min-h-[60vh] items-center justify-center text-sm text-zinc-500">
            내 화장품을 불러오는 중...
          </div>
        ) : isPouchError ? (
          <div className="flex min-h-[60vh] items-center justify-center text-sm text-red-500">
            목록을 불러오지 못했습니다.
          </div>
        ) : showRegisteredEmpty ? (
          <MyCosmeticsEmptyView />
        ) : null}
      </main>
    </div>
  );
}

export default function MyCosmeticsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center text-sm text-zinc-500">
          내 화장품을 불러오는 중...
        </div>
      }
    >
      <MyCosmeticsListContent />
    </Suspense>
  );
}
