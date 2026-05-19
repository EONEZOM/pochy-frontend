'use client';

import type { ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';

import {
  getPouchSheetHeightCSSValue,
  POUCH_ITEMS_SHEET_BOTTOM_OFFSET,
} from '@/components/my-cosmetics/pouch-sheet-constants';
import { cn } from '@/lib/utils';

export { POUCH_ITEMS_SHEET_BOTTOM_OFFSET };

type PouchSheetChromeProps = {
  ariaLabel: string;
  isExpanded: boolean;
  onExpandedChange: (isExpanded: boolean) => void;
  /** 하단 내비 여백. 공개 공유 페이지는 `0px`. */
  bottomOffset?: string;
  children: ReactNode;
};

export function PouchSheetHandle() {
  return (
    <div className="flex shrink-0 flex-col items-center pt-3 pb-2">
      <div className="bg-mono-bright-gray h-2 w-[120px] rounded-full opacity-50" />
    </div>
  );
}

export function PouchSheetChrome({
  ariaLabel,
  isExpanded,
  onExpandedChange,
  bottomOffset = POUCH_ITEMS_SHEET_BOTTOM_OFFSET,
  children,
}: PouchSheetChromeProps) {
  const sheetHeight = getPouchSheetHeightCSSValue(isExpanded);

  return (
    <div
      className="absolute inset-x-0 z-30 mx-auto flex w-full max-w-120 min-w-90 flex-col items-center"
      style={{ bottom: bottomOffset }}
    >
      <button
        type="button"
        className={cn(
          'border-mono-bright-gray text-mono-dark-gray mb-2 flex size-11 shrink-0 items-center justify-center rounded-full border bg-white shadow-[0_2px_8px_rgba(0,0,0,0.12)]',
          'transition-transform active:scale-95',
        )}
        aria-label={
          isExpanded
            ? '시트 접기'
            : '시트 펼치기'
        }
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
        aria-label={ariaLabel}
        className={cn(
          'flex min-h-0 w-full flex-col overflow-x-hidden rounded-t-3xl bg-white shadow-[0_-4px_4px_rgba(0,0,0,0.1)]',
          'transition-[height] duration-300 ease-out',
        )}
        style={{ height: sheetHeight, maxHeight: '100%' }}
      >
        <PouchSheetHandle />
        {children}
      </section>
    </div>
  );
}
