'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import { ChevronDown } from 'lucide-react';

import {
  FILTER_CATEGORIES,
  type FilterMainCategory,
  type FilterSubCategory,
} from '@/constants/category';
import { CategoryFilterArea } from '@/components/wishlist/CategoryFilterArea';
import { WishCardImage } from '@/components/wishlist/WishCardImage';
import type { MyCosmeticsResponseDTO } from '@/api/model';
import { cn } from '@/lib/utils';

export const POUCH_ITEMS_SHEET_SNAP_COLLAPSED = 0.4;
export const POUCH_ITEMS_SHEET_SNAP_EXPANDED = 0.6;
export const POUCH_ITEMS_SHEET_TOGGLE_RESERVE = '3rem';
export const POUCH_ITEMS_SHEET_BOTTOM_OFFSET = '40px';

const POUCH_ITEM_MEMO_MAX_LEN = 60;

type PouchItemsBottomSheetProps = {
  items: MyCosmeticsResponseDTO[];
  isLoading: boolean;
  selectedOrder: number[];
  itemMemos: Record<number, string>;
  isExpanded: boolean;
  onExpandedChange: (isExpanded: boolean) => void;
  onToggleItem: (id: number) => void;
  onMemoChange: (id: number, memo: string) => void;
};

export function PouchItemsBottomSheet({
  items,
  isLoading,
  selectedOrder,
  itemMemos,
  isExpanded,
  onExpandedChange,
  onToggleItem,
  onMemoChange,
}: PouchItemsBottomSheetProps) {
  const [currentCategory, setCurrentCategory] =
    useState<FilterMainCategory>('All');
  const [currentSub, setCurrentSub] = useState<FilterSubCategory>('All');

  const selectedIds = useMemo(() => new Set(selectedOrder), [selectedOrder]);

  const selectionIndexById = useMemo(() => {
    const map = new Map<number, number>();
    selectedOrder.forEach((id, index) => {
      map.set(id, index + 1);
    });
    return map;
  }, [selectedOrder]);

  const activeSubCategories = useMemo(
    () =>
      FILTER_CATEGORIES.find((c) => c.value === currentCategory)
        ?.subCategories || [],
    [currentCategory],
  );

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (currentCategory !== 'All' && item.category !== currentCategory) {
        return false;
      }
      if (currentSub !== 'All' && item.subCategory !== currentSub) {
        return false;
      }
      return true;
    });
  }, [items, currentCategory, currentSub]);

  const handleMainChange = (category: FilterMainCategory) => {
    setCurrentCategory(category);
    setCurrentSub('All');
  };

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
        aria-label={
          isExpanded
            ? '\uC2DC\uD2B8 \uC811\uAE30'
            : '\uC2DC\uD2B8 \uD3BC\uCE58\uAE30'
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
        aria-label={'\uD30C\uC6B0\uCE58 \uD654\uC7A5\uD488 \uC120\uD0DD'}
        className={cn(
          'flex w-full flex-col overflow-hidden rounded-t-3xl bg-white shadow-[0_-4px_4px_rgba(0,0,0,0.1)]',
          'transition-[height] duration-300 ease-out',
        )}
        style={{ height: sheetHeight, maxHeight: '100%' }}
      >
        <div className="flex shrink-0 flex-col items-center pt-3 pb-2">
          <div className="bg-mono-bright-gray h-2 w-[120px] rounded-full opacity-50" />
        </div>

        <h2 className="text-mono-jet shrink-0 px-5 pb-3 text-center text-sm font-normal">
          {'\uD30C\uC6B0\uCE58\uC5D0 \uB123\uC744 \uD654\uC7A5\uD488\uC744 \uACE8\uB77C\uBCF4\uC138\uC694'}
        </h2>

        <CategoryFilterArea
          mainCategories={FILTER_CATEGORIES}
          activeSubCategories={activeSubCategories}
          currentCategory={currentCategory}
          currentSub={currentSub}
          onMainChange={handleMainChange}
          onSubChange={setCurrentSub}
        />

        <div className="scrollbar-hide min-h-0 flex-1 overflow-y-auto px-5 pt-2 pb-28">
          {isLoading ? (
            <p className="text-mono-dark-gray py-8 text-center text-sm">
              {'\uD654\uC7A5\uD488\uC744 \uBD88\uB7EC\uC624\uB294 \uC911...'}
            </p>
          ) : filteredItems.length === 0 ? (
            <p className="text-mono-dark-gray py-8 text-center text-sm">
              {'\uB4F1\uB85D\uB41C \uD654\uC7A5\uD488\uC774 \uC5C6\uC5B4\uC694.'}
            </p>
          ) : (
            <ul className="mx-auto flex w-full flex-col gap-4">
              {filteredItems.map((item) => {
                const id = item.id;
                if (id == null) {
                  return null;
                }
                const isSelected = selectedIds.has(id);
                const selectionIndex = selectionIndexById.get(id);
                const memoValue = itemMemos[id] ?? '';

                return (
                  <li key={id}>
                    <div className="flex w-full items-start gap-4">
                      <button
                        type="button"
                        onClick={() => {
                          onToggleItem(id);
                        }}
                        className={cn(
                          'relative size-24 shrink-0 border',
                          isSelected
                            ? 'border-[#FF60CA] bg-[#FFF7FC]'
                            : 'border-[#DCDCDC] bg-[#F3F3F3]',
                        )}
                        aria-pressed={isSelected}
                      >
                        <div className="absolute inset-0 flex items-center justify-center p-2">
                          <div className="relative h-[54px] w-[48px]">
                            <WishCardImage
                              officialImage={item.imgUrl ?? ''}
                              captureImage={item.captureUrl ?? ''}
                              productName={item.name ?? ''}
                              fill
                              className="object-contain drop-shadow-[5px_5px_2px_rgba(0,0,0,0.2)]"
                            />
                          </div>
                        </div>
                        <span
                          className={cn(
                            'absolute top-1 right-1 flex size-3.5 items-center justify-center rounded-full border text-[11px] leading-none font-normal',
                            isSelected
                              ? 'border-[#FF60CA] bg-[#FF60CA] text-white'
                              : 'border-[#DCDCDC] bg-white text-transparent',
                          )}
                          aria-hidden={!isSelected}
                        >
                          {isSelected ? selectionIndex : null}
                        </span>
                      </button>

                      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            onToggleItem(id);
                          }}
                          className="flex w-full flex-col gap-0.5 text-left"
                          aria-pressed={isSelected}
                        >
                          <span className="truncate text-sm leading-4 font-bold text-[#B7B7B7]">
                            {item.brand || '\uBE0C\uB79C\uB4DC\uBA85'}
                          </span>
                          <span className="line-clamp-2 text-[11px] leading-[150%] font-normal text-[#161618]">
                            {item.name}
                          </span>
                        </button>

                        {isSelected ? (
                          <div
                            className="relative min-h-[41px] w-full rounded bg-[#F3F3F3] px-3 py-2 pr-8"
                            onClick={(e) => {
                              e.stopPropagation();
                            }}
                          >
                            <textarea
                              value={memoValue}
                              maxLength={POUCH_ITEM_MEMO_MAX_LEN}
                              onChange={(e) => {
                                onMemoChange(id, e.target.value);
                              }}
                              placeholder={
                                '\uC790\uC720\uB86D\uAC8C \uBA54\uBAA8\uB97C \uB0A8\uACA8\uBCF4\uC138\uC694'
                              }
                              rows={2}
                              className="w-full resize-none border-0 bg-transparent p-0 text-[11px] leading-[150%] font-normal text-[#161618] outline-none placeholder:text-[#161618]"
                              aria-label={`${item.name ?? '\uD654\uC7A5\uD488'} \uBA54\uBAA8`}
                            />
                            <Image
                              src="/icons/PenNewSquare.svg"
                              alt=""
                              width={14}
                              height={14}
                              unoptimized
                              className="pointer-events-none absolute top-2 right-2 size-3.5 shrink-0 opacity-80"
                              aria-hidden
                            />
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
