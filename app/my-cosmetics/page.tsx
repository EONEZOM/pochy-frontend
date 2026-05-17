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

  return (
    <div className="relative">
      {!showRegisteredEmpty ? <MyCosmeticsHeader /> : null}
      <main className="px-5 pb-4">
        {isPouchLoading ? (
          <div className="flex min-h-[60vh] items-center justify-center text-sm text-zinc-500">
            {'\uB0B4 \uD654\uC7A5\uD488\uC744 \uBD88\uB7EC\uC624\uB294 \uC911...'}
          </div>
        ) : isPouchError ? (
          <div className="flex min-h-[60vh] items-center justify-center text-sm text-red-500">
            {'\uBAA9\uB85D\uC744 \uBD88\uB7EC\uC624\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4.'}
          </div>
        ) : showRegisteredEmpty ? (
          <MyCosmeticsEmptyView />
        ) : showPouchHome ? (
          <MyCosmeticsPouchHome pouches={pouches} />
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
          {'\uB0B4 \uD654\uC7A5\uD488\uC744 \uBD88\uB7EC\uC624\uB294 \uC911...'}
        </div>
      }
    >
      <MyCosmeticsListContent />
    </Suspense>
  );
}
