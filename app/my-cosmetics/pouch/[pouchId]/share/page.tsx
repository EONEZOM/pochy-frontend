'use client';

import { Suspense } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';

import { getPouchDetail } from '@/api/generated/pouch-controller/pouch-controller';
import { PouchShareView } from '@/components/my-cosmetics/PouchShareView';
import { resolvePouchCompositeImageUrl } from '@/lib/feed-display-image';
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

  const { data: detailData, isLoading: isDetailLoading } = useQuery({
    queryKey: ['/api/pouches', pouchId],
    queryFn: () => getPouchDetail(pouchId),
    enabled: Number.isFinite(pouchId) && pouchId > 0,
  });

  const pouch = data?.result?.pouchList?.find((p) => p.pouchId === pouchId);
  const pouchName = nameFromQuery || pouch?.name?.trim() || '새 파우치';
  const imageUrl = resolvePouchCompositeImageUrl(
    detailData?.result ?? null,
    pouch ?? null,
  );

  if (!Number.isFinite(pouchId) || pouchId <= 0) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-sm text-zinc-500">
        파우치를 찾지 못했습니다.
      </div>
    );
  }

  if (isLoading || isDetailLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-sm text-zinc-500">
        불러오는 중...
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
          불러오는 중...
        </div>
      }
    >
      <PouchSharePageContent />
    </Suspense>
  );
}
