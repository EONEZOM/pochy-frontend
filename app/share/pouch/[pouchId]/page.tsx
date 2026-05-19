'use client';

import { Suspense } from 'react';
import { useParams, useSearchParams } from 'next/navigation';

import { useGetFeedCosmetics } from '@/api/generated/feed/feed';
import { useGetSharePouchDetail } from '@/api/generated/pouch/pouch';
import { PouchPublicShareView } from '@/components/my-cosmetics/PouchPublicShareView';
import type { SharePouchDetailDto } from '@/lib/pouch-share-display';

function PouchPublicSharePageContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const pouchId = Number.parseInt(String(params.pouchId ?? ''), 10);
  const nameFromQuery = searchParams.get('name') ?? '';

  const isValidPouchId = Number.isFinite(pouchId) && pouchId > 0;

  const { data: shareData, isLoading: isShareLoading } = useGetSharePouchDetail(
    pouchId,
    { query: { enabled: isValidPouchId, retry: false } },
  );

  const shareDetail = shareData?.result as SharePouchDetailDto | undefined;
  const hasShareDetail = Boolean(shareDetail);

  const { data: feedCosmeticsData, isLoading: isFeedCosmeticsLoading } =
    useGetFeedCosmetics(pouchId, {
      query: {
        enabled: isValidPouchId && hasShareDetail,
        retry: false,
      },
    });

  const pouchName =
    nameFromQuery || shareDetail?.name?.trim() || '파우치';

  const feedCosmetics = feedCosmeticsData?.result ?? [];

  if (!isValidPouchId) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-sm text-zinc-500">
        {'파우치를 찾지 못했습니다.'}
      </div>
    );
  }

  if (!isShareLoading && !shareDetail) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-sm text-zinc-500">
        {'공유된 파우치를 불러오지 못했습니다.'}
      </div>
    );
  }

  return (
    <PouchPublicShareView
      pouchName={pouchName}
      shareDetail={shareDetail}
      feedCosmetics={feedCosmetics}
      isShareLoading={isShareLoading}
      isFeedCosmeticsLoading={isFeedCosmeticsLoading}
    />
  );
}

export default function PouchPublicSharePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center text-sm text-zinc-500">
          {'불러오는 중...'}
        </div>
      }
    >
      <PouchPublicSharePageContent />
    </Suspense>
  );
}
