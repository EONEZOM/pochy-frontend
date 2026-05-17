import fs from 'fs';

const content = `'use client';

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
      ariaLabel="\uD30C\uC6B0\uCE58 \uAF8E\uBBF8\uAE30"
      isExpanded={isExpanded}
      onExpandedChange={onExpandedChange}
    >
      <p className="text-mono-jet shrink-0 px-5 pb-2 text-center text-sm font-normal">
        \uD30C\uC6B0\uCE58\uB97C \uAF8E\uBA74\uBCF4\uC138\uC694!
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
        \uD654\uC7A5\uD488
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
        \uC640\uD39C
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
    <motionlessTabRow className="scrollbar-hide min-h-0 flex-1 overflow-y-auto px-5 pt-4 pb-28">
`;

// Fix motionlessTabRow typo in template - rewrite properly
const fixed = content.replace(/<motionlessTabRow/g, '<div').replace(/<\/motionlessTabRow>/g, '</motionless>');

const rest = `      {activeTab === 'sticker' ? (
        isCosmeticsLoading ? (
          <p className="text-mono-dark-gray py-8 text-center text-sm">
            \uD654\uC7A5\uD488\uC744 \uBD88\uB7EC\uC624\uB294 \uC911...
          </p>
        ) : cosmeticItems.length === 0 ? (
          <p className="text-mono-dark-gray py-8 text-center text-sm">
            \uB4F1\uB85D\uB41C \uD654\uC7A5\uD488\uC774 \uC5C6\uC5B4\uC694.
          </p>
        ) : (
          <CosmeticStickerGrid items={cosmeticItems} onAddCosmetic={onAddCosmetic} />
        )
      ) : isWappenLoading ? (
        <p className="text-mono-dark-gray py-8 text-center text-sm">
          \uC640\uD39C\uC744 \uBD88\uB7EC\uC624\uB294 \uC911\uC785\uB2C8\uB2E4...
        </p>
      ) : wappens.length === 0 ? (
        <p className="text-mono-dark-gray py-8 text-center text-sm">
          \uC640\uD39C\uC774 \uC5C6\uC2B5\uB2C8\uB2E4.
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
              <span className="text-mono-dark-gray text-[10px]">\uC774\uBBF8\uC9C0 \uC5C6\uC74C</span>
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
              <span className="text-mono-dark-gray text-[9px]">\uC640\uD39C</span>
            )}
          </button>
        );
      })}
    </motionlessTabRow>
  );
}
`;

const full = fixed.replace('<motionlessTabRow', '<motionlessTabRow').replace('</motionless>', '</div>').replace(/motionlessTabRow/g, 'motionlessTabRow');

// Actually build cleanly
const clean = `'use client';

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
      ariaLabel="${decode('\uD30C\uC6B0\uCE58 \uAF8E\uBBF8\uAE30')}"
      isExpanded={isExpanded}
      onExpandedChange={onExpandedChange}
    >
      <p className="text-mono-jet shrink-0 px-5 pb-2 text-center text-sm font-normal">
        ${decode('\uD30C\uC6B0\uCE58\uB97C \uAF8E\uBA74\uBCF4\uC138\uC694!')}
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
`;

function decode(s) {
  return s.replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
}

// This script is getting messy - write file directly with decoded strings inline in template literals

fs.writeFileSync('components/my-cosmetics/PouchDecorateBottomSheet.tsx', 
  fs.readFileSync('scripts/write-pouch-decorate-sheet.mjs', 'utf8').includes('PouchSheetChrome') ? '' : ''
);
