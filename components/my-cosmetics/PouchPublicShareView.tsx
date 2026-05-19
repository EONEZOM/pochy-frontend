'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';

import { Header } from '@/components/layout/Header';
import { PouchPublicShareBottomSheet } from '@/components/my-cosmetics/PouchPublicShareBottomSheet';
import { getPouchSheetHeightCSSValue } from '@/components/my-cosmetics/pouch-sheet-constants';
import type { FindFeedCosmeticsDto } from '@/api/model';
import { useWarmPouchShareImages } from '@/hooks/useWarmRouteImages';
import {
  buildPouchPublicShareDisplayRows,
  resolvePouchPublicCompositeImageUrl,
  type SharePouchDetailDto,
} from '@/lib/pouch-share-display';

const POUCH_PUBLIC_SHARE_GRADIENT_BG =
  'linear-gradient(180deg, #FFFFFF 0%, #FFF5FC 42%, #FFC6EC 100%)';

type PouchPublicShareViewProps = {
  pouchName: string;
  shareDetail: SharePouchDetailDto | undefined;
  feedCosmetics: FindFeedCosmeticsDto[] | undefined;
  isShareLoading: boolean;
  isFeedCosmeticsLoading: boolean;
};

export function PouchPublicShareView({
  pouchName,
  shareDetail,
  feedCosmetics,
  isShareLoading,
  isFeedCosmeticsLoading,
}: PouchPublicShareViewProps) {
  const [isSheetExpanded, setIsSheetExpanded] = useState(false);

  const sheetHeight = getPouchSheetHeightCSSValue(isSheetExpanded);

  const displayImageUrl = useMemo(
    () => resolvePouchPublicCompositeImageUrl(shareDetail),
    [shareDetail],
  );

  const displayRows = useMemo(
    () => buildPouchPublicShareDisplayRows(shareDetail?.cosmetics, feedCosmetics),
    [feedCosmetics, shareDetail?.cosmetics],
  );

  useWarmPouchShareImages(displayImageUrl, displayRows);

  return (
    <div
      className="relative flex h-(--app-height) w-full flex-col overflow-hidden"
      style={{ background: POUCH_PUBLIC_SHARE_GRADIENT_BG }}
    >
      <Header
        title={pouchName}
        showBack={false}
        className="shrink-0 border-b border-zinc-100/80 bg-transparent pt-[var(--safe-area-top)]"
      />

      <div
        className="flex min-h-0 flex-1 items-center justify-center px-4 pt-2"
        style={{
          paddingBottom: sheetHeight,
        }}
      >
        <div className="flex h-full w-full max-w-[320px] items-center justify-center">
          {displayImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={displayImageUrl}
              alt={pouchName}
              className="h-auto max-h-full w-auto max-w-full object-contain"
            />
          ) : (
            <Image
              src="/figma/my/pouchy.svg"
              alt=""
              width={320}
              height={460}
              unoptimized
              className="h-auto max-h-full w-auto max-w-full object-contain opacity-70"
              priority
            />
          )}
        </div>
      </div>

      <PouchPublicShareBottomSheet
        items={displayRows}
        isLoading={isShareLoading || isFeedCosmeticsLoading}
        isExpanded={isSheetExpanded}
        onExpandedChange={setIsSheetExpanded}
      />
    </div>
  );
}
