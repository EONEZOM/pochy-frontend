'use client';

import { useState } from 'react';
import { useGetWappenList } from '@/api/generated/wappen-controller/wappen-controller';

import { PouchSheetChrome } from '@/components/my-cosmetics/PouchSheetChrome';
import type { MyCosmeticsResponseDTO } from '@/api/model';
import { getCosmeticImageSrc, getWappenImageSrc } from '@/lib/pouch-canvas';
import { cn } from '@/lib/utils';

type DecorateTab = 'sticker' | 'wappen';

type PouchDecorateBottomSheetProps = {
  cosmeticItems: MyCosmeticsResponseDTO[];
  isCosmeticsLoading: boolean;
  isExpanded: boolean;
  onExpandedChange: (isExpanded: boolean) => void;
  onAddCosmetic: (item: MyCosmeticsResponseDTO) => void;
  onAddWappen: (wappen: { wappenId: number; imageUrl: string }) => void;
};

export function PouchDecorateBottomSheet({
  cosmeticItems,
  isCosmeticsLoading,
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

  return (
    <PouchSheetChrome
      ariaLabel="파우치 꾸미기"
      isExpanded={isExpanded}
      onExpandedChange={onExpandedChange}
    >
      <p className="text-mono-jet shrink-0 px-5 pb-2 text-center text-sm font-normal">
        스티커로 파우치를 꾸며보세요!
      </p>

      <DecorateTabRow activeTab={activeTab} onTabChange={setActiveTab} />

      <DecorateScrollArea
        activeTab={activeTab}
        cosmeticItems={cosmeticItems}
        isCosmeticsLoading={isCosmeticsLoading}
        isWappenLoading={isWappenLoading}
        wappens={wappens}
        onAddCosmetic={onAddCosmetic}
        onAddWappen={onAddWappen}
      />
    </PouchSheetChrome>
  );
}

function DecorateTabRow({
  activeTab,
  onTabChange,
}: {
  activeTab: DecorateTab;
  onTabChange: (tab: DecorateTab) => void;
}) {
  return (
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
          onTabChange('sticker');
        }}
      >
        화장품
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
          onTabChange('wappen');
        }}
      >
        와펜
      </button>
    </div>
  );
}

function DecorateScrollArea({
  activeTab,
  cosmeticItems,
  isCosmeticsLoading,
  isWappenLoading,
  wappens,
  onAddCosmetic,
  onAddWappen,
}: {
  activeTab: DecorateTab;
  cosmeticItems: MyCosmeticsResponseDTO[];
  isCosmeticsLoading: boolean;
  isWappenLoading: boolean;
  wappens: Array<{ wappenId?: number; imageUrl?: string | null }>;
  onAddCosmetic: (item: MyCosmeticsResponseDTO) => void;
  onAddWappen: (wappen: { wappenId: number; imageUrl: string }) => void;
}) {
  return (
    <div className="scrollbar-hide min-h-0 flex-1 overflow-y-auto px-5 pt-4 pb-28">
      {activeTab === 'sticker' ? (
        isCosmeticsLoading ? (
          <p className="text-mono-dark-gray py-8 text-center text-sm">
            화장품을 불러오는 중...
          </p>
        ) : cosmeticItems.length === 0 ? (
          <p className="text-mono-dark-gray py-8 text-center text-sm">
            등록된 화장품이 없어요.
          </p>
        ) : (
          <CosmeticStickerGrid
            items={cosmeticItems}
            onAddCosmetic={onAddCosmetic}
          />
        )
      ) : isWappenLoading ? (
        <p className="text-mono-dark-gray py-8 text-center text-sm">
          와펜을 불러오는 중입니다...
        </p>
      ) : wappens.length === 0 ? (
        <p className="text-mono-dark-gray py-8 text-center text-sm">
          와펜이 없습니다.
        </p>
      ) : (
        <WappenGrid wappens={wappens} onAddWappen={onAddWappen} />
      )}
    </div>
  );
}

function CosmeticStickerGrid({
  items,
  onAddCosmetic,
}: {
  items: MyCosmeticsResponseDTO[];
  onAddCosmetic: (item: MyCosmeticsResponseDTO) => void;
}) {
  return (
    <div className="grid grid-cols-3 gap-x-4 gap-y-4">
      {items.map((item) => {
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
                이미지 없음
              </span>
            )}
          </button>
        );
      })}
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
    <div className="grid grid-cols-4 gap-x-3 gap-y-3">
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
            className="relative size-16 overflow-hidden bg-[#F3F3F3]"
            onClick={() => {
              onAddWappen({ wappenId, imageUrl: src });
            }}
          >
            {src ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={src} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="text-mono-dark-gray text-[9px]">와펜</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
