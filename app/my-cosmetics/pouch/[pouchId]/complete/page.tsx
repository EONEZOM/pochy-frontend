'use client';

import { Suspense } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';

import { PouchCompleteView } from '@/components/my-cosmetics/PouchCompleteView';
import { fetchPouchList, getPouchListQueryKey, readPendingPouchName } from '@/lib/pouch-setup';

function PouchCompletePageContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const pouchId = Number.parseInt(String(params.pouchId ?? ''), 10);
  const nameFromQuery = searchParams.get('name') ?? '';

  const { data } = useQuery({
    queryKey: getPouchListQueryKey(),
    queryFn: fetchPouchList,
    enabled: Number.isFinite(pouchId) && pouchId > 0,
  });

  const pouch = data?.result?.pouchList?.find((p) => p.pouchId === pouchId);
  const pouchName =
    nameFromQuery || readPendingPouchName() || pouch?.name?.trim() || '\uC0C8 \uD30C\uC6B0\uCE58';
  const imageUrl = pouch?.imageUrl ?? null;

  return <PouchCompleteView pouchName={pouchName} imageUrl={imageUrl} />;
}

export default function PouchCompletePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center text-sm text-zinc-500">
          {'\uBD88\uB7EC\uC624\uB294 \uC911...'}
        </div>
      }
    >
      <PouchCompletePageContent />
    </Suspense>
  );
}
