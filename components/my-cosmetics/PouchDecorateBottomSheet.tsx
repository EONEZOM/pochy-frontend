'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { useGetWappenList } from '@/api/generated/wappen-controller/wappen-controller';

import {
  POUCH_ITEMS_SHEET_BOTTOM_OFFSET,
  POUCH_ITEMS_SHEET_SNAP_COLLAPSED,
  POUCH_ITEMS_SHEET_SNAP_EXPANDED,
} from '@/components/my-cosmetics/PouchItemsBottomSheet';
import type { MyCosmeticsResponseDTO } from '@/api/model';
import { getCosmeticImageSrc, getWappenImageSrc } from '@/lib/pouch-canvas';
import { cn } from '@/lib/utils';

type DecorateTab = 'sticker' | 'wappen';

type PouchDecorateBottomSheetProps = {
  selectedItems: MyCosmeticsResponseDTO[];
  isExpanded: boolean;
  onExpandedChange: (isExpanded: boolean) => void;
  onAddCosmetic: (item: MyCosmeticsResponseDTO) => void;
  onAddWappen: (wappen: { wappenId: number; imageUrl: string }) => void;
};

export function PouchDecorateBottomSheet({
  selectedItems,
  isExpanded,
  onExpandedChange,
  onAddCosmetic,
  onAddWappen,
}: PouchDecorateBottomSheetProps) {
  const [activeTab, setActiveTab] = useState<DecorateTab>('sticker');

  const { data: wappenData, isLoading: isWappenLoading } = useGetWappenList({
    pageable: { page: 0, size: 100 },
  });

  const wappens = wappenData?.result?.wappens ?? [];

  const sheetHeight = isExpanded
    ? `calc(var(--app-height) * ${POUCH_ITEMS_SHEET_SNAP_EXPANDED})`
    : `calc(var(--app-height) * ${POUCH_ITEMS_SHEET_SNAP_COLLAPSED})`;

  return (
    <div
      className="absolute inset-x-0 z-30 mx-auto flex w-full max-w-120 min-w-90 flex-col items-center"
      style={{ bottom: POUCH_ITEMS_SHEET_BOTTOM_OFFSET }}
    >
      <button
        type="button"
        className={cn(
          'border-mono-bright-gray text-mono-dark-gray mb-2 flex size-11 shrink-0 items-center justify-center rounded-full border bg-white shadow-[0_2px_8px_rgba(0,0,0,0.12)]',
          'transition-transform active:scale-95',
        )}
        aria-label={isExpanded ? '\uC2DC\uD2B8 \uC811\uAE30' : '\uC2DC\uD2B8 \uD3BC\uCE58\uAE30'}
        aria-expanded={isExpanded}
        onClick={() => {
          onExpandedChange(!isExpanded);
        }}
      >
        <ChevronDown
          className={cn(
            'size-7 transition-transform duration-300',
            isExpanded && 'rotate-180',
          )}
        />
      </button>

      <section
        aria-label={'\uD30C\uC6B0\uCE58 \uAFBE\uBBF8\uAE30'}
        className={cn(
          'flex w-full flex-col overflow-hidden rounded-t-3xl bg-white shadow-[0_-4px_4px_rgba(0,0,0,0.1)]',
          'transition-[height] duration-300 ease-out',
        )}
        style={{ height: sheetHeight, maxHeight: '100%' }}
      >
        <div className="flex shrink-0 flex-col items-center pt-3 pb-2">
          <div className="bg-mono-bright-gray h-2 w-[120px] rounded-full opacity-50" />
        </div>

        <p className="text-mono-jet shrink-0 px-5 pb-2 text-center text-sm font-normal">
          {'\uC2A4\uD2F0\uCEE4\uB97C \uBD99\uC5EC \uD30C\uC6B0\uCE58\uB97C \uAFBE\uBA70\uBCF4\uC138\uC694'}
        </p>

        <div className="border-mono-bright-gray flex shrink-0 border-b">
          <button
            type="button"
            className={cn(
              'flex-1 py-3 text-xs font-bold',
              activeTab === 'sticker'
                ? 'border-b-2 border-[#FF60CA] text-[#FF60CA]'
                : 'text-mono-dark-gray',
            )}
            onClick={() => {
              setActiveTab('sticker');
            }}
          >
            {'\uC2A4\uD2F0\uCEE4'}
          </button>
          <button
            type="button"
            className={cn(
              'flex-1 py-3 text-xs font-bold',
              activeTab === 'wappen'
                ? 'border-b-2 border-[#FF60CA] text-[#FF60CA]'
                : 'text-mono-dark-gray',
            )}
            onClick={() => {
              setActiveTab('wappen');
            }}
          >
            {'\uC640\uD5A8'}
          </button>
        </div>

        <DecorateScrollArea
          activeTab={activeTab}
          selectedItems={selectedItems}
          isWappenLoading={isWappenLoading}
          wappens={wappens}
          onAddCosmetic={onAddCosmetic}
          onAddWappen={onAddWappen}
        />
      </section>
    </div>
  );
}

function DecorateScrollArea({
  activeTab,
  selectedItems,
  isWappenLoading,
  wappens,
  onAddCosmetic,
  onAddWappen,
}: {
  activeTab: DecorateTab;
  selectedItems: MyCosmeticsResponseDTO[];
  isWappenLoading: boolean;
  wappens: Array<{ wappenId?: number; imageUrl?: string | null }>;
  onAddCosmetic: (item: MyCosmeticsResponseDTO) => void;
  onAddWappen: (wappen: { wappenId: number; imageUrl: string }) => void;
}) {
  return (
    <div className="scrollbar-hide min-h-0 flex-1 overflow-y-auto px-5 pt-4 pb-28">
      {activeTab === 'sticker' ? (
        selectedItems.length === 0 ? (
          <p className="text-mono-dark-gray py-8 text-center text-sm">
            {'\uC120\uD0DD\uD55C \uD654\uC7A5\uD488\uC774 \uC5C6\uC5B4\uC694'}
          </p>
        ) : (
          <div className="grid grid-cols-3 gap-x-4 gap-y-4">
            {selectedItems.map((item) => {
              const id = item.id;
              if (id == null) {
                return null;
              }
              const src = getCosmeticImageSrc(item);
              return (
                <button
                  key={id}
                  type="button"
                  className="relative flex size-24 items-center justify-center bg-[#F3F3F3] p-2"
                  onClick={() => {
                    onAddCosmetic(item);
                  }}
                >
                  {src ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={src}
                      alt={item.name ?? ''}
                      className="max-h-full max-w-full object-contain drop-shadow-md"
                    />
                  ) : (
                    <span className="text-mono-dark-gray text-[10px]">
                      {'\uC774\uBBF8\uC9C0 \uC5C6\uC74C'}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )
      ) : isWappenLoading ? (
        <p className="text-mono-dark-gray py-8 text-center text-sm">
          {'\uC640\uD5A8\uC744 \uBD88\uB7EC\uC624\uB294 \uC911...'}
        </p>
      ) : wappens.length === 0 ? (
        <p className="text-mono-dark-gray py-8 text-center text-sm">
          {'\uB4F1\uB85D\uB41C \uC640\uD5A8\uC774 \uC5C6\uC5B4\uC694'}
        </p>
      ) : (
        <WappenGrid wappens={wappens} onAddWappen={onAddWappen} />
      )}
    </div>
  );
}

function WappenGrid({
  wappens,
  onAddWappen,
}: {
  wappens: Array<{ wappenId?: number; imageUrl?: string | null }>;
  onAddWappen: (wappen: { wappenId: number; imageUrl: string }) => void;
}) {
  return (
    <div className="grid grid-cols-3 gap-x-4 gap-y-4">
      {wappens.map((wappen) => {
        const wappenId = wappen.wappenId;
        if (wappenId == null) {
          return null;
        }
        const src = getWappenImageSrc(wappen);
        return (
          <button
            key={wappenId}
            type="button"
            className="relative flex size-24 items-center justify-center bg-[#F3F3F3] p-2"
            onClick={() => {
              onAddWappen({ wappenId, imageUrl: src });
            }}
          >
            {src ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={src}
                alt=""
                className="max-h-full max-w-full object-contain"
              />
            ) : (
              <span className="text-mono-dark-gray text-[10px]">
                {'\uC640\uD5A8'}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
