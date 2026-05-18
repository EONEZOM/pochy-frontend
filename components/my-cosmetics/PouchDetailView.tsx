'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

import { Header } from '@/components/layout/Header';
import { PouchDetailBottomSheet } from '@/components/my-cosmetics/PouchDetailBottomSheet';
import {
  getPouchSheetHeightCSSValue,
} from '@/components/my-cosmetics/pouch-sheet-constants';
import { POUCH_ITEMS_SHEET_BOTTOM_OFFSET } from '@/components/my-cosmetics/PouchSheetChrome';
import { buildPouchEditItemsPath, buildPouchSharePath } from '@/lib/pouch-setup';
import { resolveDisplayImageSrc } from '@/lib/next-image-src';
import { resolveMediaUrl } from '@/lib/resolve-media-url';

type PouchDetailViewProps = {
  pouchId: number;
  pouchName: string;
  imageUrl: string | null;
};

export function PouchDetailView({
  pouchId,
  pouchName,
  imageUrl,
}: PouchDetailViewProps) {
  const router = useRouter();
  const [isSheetExpanded, setIsSheetExpanded] = useState(false);

  const sheetHeight = getPouchSheetHeightCSSValue(isSheetExpanded);
  const displayImageUrl = imageUrl
    ? resolveDisplayImageSrc(resolveMediaUrl(imageUrl))
    : null;

  return (
    <div className="relative flex h-(--app-height) w-full flex-col overflow-hidden bg-white">
      <Header
        title={pouchName}
        onBack={() => {
          router.push('/my-cosmetics');
        }}
        className="shrink-0 border-b border-zinc-100 pt-[var(--safe-area-top)]"
        rightIcons={[
          {
            kind: 'register',
            ariaLabel: '파우치 수정',
            iconSrc: '/icons/PenNewSquare.svg',
            onClick: () => {
              router.push(buildPouchEditItemsPath(pouchId, pouchName));
            },
          },
          {
            kind: 'share',
            ariaLabel: '공유하기',
            onClick: () => {
              router.push(buildPouchSharePath(pouchId, pouchName));
            },
          },
        ]}
      />

      <div
        className="flex min-h-0 flex-1 items-center justify-center px-4 pt-2"
        style={{
          paddingBottom: `calc(${sheetHeight} + ${POUCH_ITEMS_SHEET_BOTTOM_OFFSET})`,
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

      <PouchDetailBottomSheet
        pouchId={pouchId}
        isExpanded={isSheetExpanded}
        onExpandedChange={setIsSheetExpanded}
      />
    </div>
  );
}
