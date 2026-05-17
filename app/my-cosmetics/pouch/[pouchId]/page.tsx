'use client';

import { Suspense } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';

import { PouchDetailView } from '@/components/my-cosmetics/PouchDetailView';
import { fetchPouchList, getPouchListQueryKey } from '@/lib/pouch-setup';

function PouchDetailPageContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const pouchIdRaw = String(params.pouchId ?? '');
  const pouchId = Number.parseInt(pouchIdRaw, 10);
  const nameFromQuery = searchParams.get('name') ?? '';

  const { data, isLoading } = useQuery({
    queryKey: getPouchListQueryKey(),
    queryFn: fetchPouchList,
    enabled: Number.isFinite(pouchId) && pouchId > 0,
  });

  const pouch = data?.result?.pouchList?.find((p) => p.pouchId === pouchId);
  const pouchName = nameFromQuery || pouch?.name?.trim() || '\uC0C8 \uD30C\uC6B0\uCE58';
  const imageUrl = pouch?.imageUrl ?? null;

  if (!Number.isFinite(pouchId) || pouchId <= 0) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-sm text-zinc-500">
        {'\uD30C\uC6B0\uCE58\uB97C \uCC3E\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4.'}
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-sm text-zinc-500">
        {'\uBD88\uB7EC\uC624\uB294 \uC911...'}
      </div>
    );
  }

  return (
    <PouchDetailView
      pouchId={pouchId}
      pouchName={pouchName}
      imageUrl={imageUrl}
    />
  );
}

export default function PouchDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center text-sm text-zinc-500">
          {'\uBD88\uB7EC\uC624\uB294 \uC911...'}
        </div>
      }
    >
      <PouchDetailPageContent />
    </Suspense>
  );
}
