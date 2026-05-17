'use client';

import { Suspense } from 'react';
import { useParams, useSearchParams } from 'next/navigation';

import { PouchItemsPicker } from '@/components/my-cosmetics/PouchItemsPicker';
import { readPendingPouchName } from '@/lib/pouch-setup';

function PouchItemsPageContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const pouchId = String(params.pouchId ?? '');
  const nameFromQuery = searchParams.get('name') ?? '';
  const pouchName = nameFromQuery || readPendingPouchName() || '';
  const mode = searchParams.get('mode') ?? '';

  return (
    <PouchItemsPicker
      key={`${pouchId}-${mode}`}
      pouchId={pouchId}
      pouchName={pouchName}
    />
  );
}

export default function PouchItemsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center text-sm text-zinc-500">
          불러오는 중...
        </div>
      }
    >
      <PouchItemsPageContent />
    </Suspense>
  );
}
