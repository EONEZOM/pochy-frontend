'use client';

import { Suspense } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';

import { PouchShareView } from '@/components/my-cosmetics/PouchShareView';
import { fetchPouchList, getPouchListQueryKey } from '@/lib/pouch-setup';

function PouchSharePageContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const pouchId = Number.parseInt(String(params.pouchId ?? ''), 10);
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
    <PouchShareView pouchId={pouchId} pouchName={pouchName} imageUrl={imageUrl} />
  );
}

export default function PouchSharePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center text-sm text-zinc-500">
          {'\uBD88\uB7EC\uC624\uB294 \uC911...'}
        </div>
      }
    >
      <PouchSharePageContent />
    </Suspense>
  );
}
