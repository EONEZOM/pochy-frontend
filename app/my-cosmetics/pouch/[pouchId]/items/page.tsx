'use client';

import { Suspense, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';

import { PouchItemsPicker } from '@/components/my-cosmetics/PouchItemsPicker';
import {
  buildPouchEditItemsPath,
  DRAFT_POUCH_ID,
  readPendingPouchName,
} from '@/lib/pouch-setup';

function PouchItemsPageContent() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const pouchId = String(params.pouchId ?? '');
  const nameFromQuery = searchParams.get('name') ?? '';
  const pouchName = nameFromQuery || readPendingPouchName() || '';
  const mode = searchParams.get('mode') ?? '';
  const isEditMode = mode === 'edit';

  const numericPouchId = Number.parseInt(pouchId, 10);
  const hasNumericPouchId =
    Number.isFinite(numericPouchId) && numericPouchId > 0;
  const shouldRedirectToEdit =
    hasNumericPouchId && !isEditMode && pouchId !== DRAFT_POUCH_ID;

  useEffect(() => {
    if (!shouldRedirectToEdit) {
      return;
    }
    router.replace(buildPouchEditItemsPath(numericPouchId, pouchName));
  }, [
    numericPouchId,
    pouchName,
    router,
    shouldRedirectToEdit,
  ]);

  if (shouldRedirectToEdit) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-sm text-zinc-500">
        불러오는 중...
      </div>
    );
  }

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
