'use client';

import { useMemo, useState, type MouseEvent as ReactMouseEvent } from 'react';
import Image from 'next/image';

import {
  FILTER_CATEGORIES,
  type FilterMainCategory,
  type FilterSubCategory,
} from '@/constants/category';
import { SwipeActionRow } from '@/components/common/SwipeActionRow';
import { PouchSheetChrome } from '@/components/my-cosmetics/PouchSheetChrome';
import { CategoryFilterArea } from '@/components/wishlist/CategoryFilterArea';
import { WishCardImage } from '@/components/wishlist/WishCardImage';
import type { MyCosmeticsResponseDTO } from '@/api/model';
import { resolveStoredCosmeticCategories } from '@/lib/cosmetic-category-normalize';
import { getMyCosmeticsWishCardImageProps } from '@/lib/my-cosmetics-display-image';
import { useWarmMyCosmeticsItems } from '@/hooks/useWarmRouteImages';
import { cn } from '@/lib/utils';

export {
  POUCH_ITEMS_SHEET_SNAP_COLLAPSED,
  POUCH_ITEMS_SHEET_SNAP_EXPANDED,
  POUCH_ITEMS_SHEET_TOGGLE_RESERVE,
  POUCH_ITEMS_SHEET_BOTTOM_OFFSET,
} from '@/components/my-cosmetics/pouch-sheet-constants';

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
  openSwipeRowId?: number | null;
  onOpenSwipeRowIdChange?: (id: number | null) => void;
  onEditItem?: (id: number) => void;
  onDeleteItem?: (id: number) => void;
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
  openSwipeRowId = null,
  onOpenSwipeRowIdChange,
  onEditItem,
  onDeleteItem,
}: PouchItemsBottomSheetProps) {
  const [currentCategory, setCurrentCategory] =
    useState<FilterMainCategory>('All');
  const [currentSub, setCurrentSub] = useState<FilterSubCategory>('All');

  useWarmMyCosmeticsItems(items);

  const selectedIds = useMemo(() => new Set(selectedOrder), [selectedOrder]);

  const itemIdSet = useMemo(() => {
    const set = new Set<number>();
    for (const item of items) {
      if (item.id != null && item.id > 0) {
        set.add(item.id);
      }
    }
    return set;
  }, [items]);

  const selectionIndexById = useMemo(() => {
    const map = new Map<number, number>();
    let displayIndex = 1;
    for (const id of selectedOrder) {
      if (!itemIdSet.has(id)) {
        continue;
      }
      map.set(id, displayIndex);
      displayIndex += 1;
    }
    return map;
  }, [itemIdSet, selectedOrder]);

  const activeSubCategories = useMemo(
    () =>
      FILTER_CATEGORIES.find((c) => c.value === currentCategory)
        ?.subCategories || [],
    [currentCategory],
  );

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const { main, sub } = resolveStoredCosmeticCategories(
        item.category,
        item.subCategory,
      );
      if (currentCategory !== 'All' && main !== currentCategory) {
        return false;
      }
      if (currentSub !== 'All' && sub !== currentSub) {
        return false;
      }
      return true;
    });
  }, [items, currentCategory, currentSub]);

  const handleMainChange = (category: FilterMainCategory) => {
    setCurrentCategory(category);
    setCurrentSub('All');
  };

  return (
    <PouchSheetChrome
      ariaLabel={'파우치 화장품 선택'}
      isExpanded={isExpanded}
      onExpandedChange={onExpandedChange}
    >
      <h2 className="text-mono-jet shrink-0 px-5 pb-3 text-center text-sm font-normal">
        {'파우치에 넣을 화장품을 골라보세요'}
      </h2>

      <CategoryFilterArea
        mainCategories={FILTER_CATEGORIES}
        activeSubCategories={activeSubCategories}
        currentCategory={currentCategory}
        currentSub={currentSub}
        onMainChange={handleMainChange}
        onSubChange={setCurrentSub}
      />

      <div className="scrollbar-hide min-h-0 flex-1 overflow-y-auto overscroll-y-contain overscroll-x-contain px-5 pt-2 pb-36 [-webkit-overflow-scrolling:touch] [touch-action:pan-y]">
        {isLoading ? (
          <p className="text-mono-dark-gray py-8 text-center text-sm">
            {'화장품을 불러오는 중...'}
          </p>
        ) : filteredItems.length === 0 ? (
          <p className="text-mono-dark-gray py-8 text-center text-sm">
            {'등록된 화장품이 없어요.'}
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
              const isSwipeOpen = openSwipeRowId === id;
              const hasSwipeActions = Boolean(onEditItem && onDeleteItem);

              const handleToggleItem = (
                event: ReactMouseEvent<HTMLButtonElement>,
              ) => {
                event.stopPropagation();
                if (isSwipeOpen) {
                  onOpenSwipeRowIdChange?.(null);
                  return;
                }
                onToggleItem(id);
              };

              const rowMain = (
                <div className="flex w-full items-start gap-4">
                  <button
                    type="button"
                    onClick={handleToggleItem}
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
                          {...getMyCosmeticsWishCardImageProps(item)}
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
                      onClick={handleToggleItem}
                      className="flex w-full flex-col gap-0.5 text-left"
                      aria-pressed={isSelected}
                    >
                      <span className="truncate text-sm leading-4 font-bold text-[#B7B7B7]">
                        {item.brand || '브랜드명'}
                      </span>
                      <span className="line-clamp-2 text-[11px] leading-[150%] font-normal text-[#161618]">
                        {item.name}
                      </span>
                    </button>

                    {isSelected ? (
                      <div
                        className="relative min-h-[41px] w-full rounded bg-[#F3F3F3] px-3 py-2 pr-8"
                        onPointerDown={(e) => {
                          e.stopPropagation();
                        }}
                        onTouchStart={(e) => {
                          e.stopPropagation();
                        }}
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
                          onFocus={() => {
                            onExpandedChange(true);
                          }}
                          placeholder={'자유롭게 메모를 남겨보세요'}
                          rows={2}
                          className="relative z-10 w-full touch-manipulation resize-none border-0 bg-transparent p-0 text-[11px] leading-[150%] font-normal text-[#161618] outline-none placeholder:text-[#161618]"
                          aria-label={`${item.name ?? '화장품'} 메모`}
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
              );

              return (
                <li key={id}>
                  {hasSwipeActions ? (
                    <SwipeActionRow
                      rowId={id}
                      isOpen={isSwipeOpen}
                      onOpenChange={(open) => {
                        onOpenSwipeRowIdChange?.(open ? id : null);
                      }}
                      actions={[
                        {
                          key: 'edit',
                          label: '수정',
                          onClick: () => {
                            onEditItem?.(id);
                          },
                        },
                        {
                          key: 'delete',
                          label: '삭제',
                          tone: 'danger',
                          onClick: () => {
                            onDeleteItem?.(id);
                          },
                        },
                      ]}
                    >
                      {rowMain}
                    </SwipeActionRow>
                  ) : (
                    rowMain
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </PouchSheetChrome>
  );
}
