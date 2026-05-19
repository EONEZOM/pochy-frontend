'use client';

import { memo, type MouseEvent as ReactMouseEvent } from 'react';
import Image from 'next/image';

import { SwipeActionRow } from '@/components/common/SwipeActionRow';
import { WishCardImage } from '@/components/wishlist/WishCardImage';
import type { MyCosmeticsResponseDTO } from '@/api/model';
import { getMyCosmeticsWishCardImageProps } from '@/lib/my-cosmetics-display-image';
import { cn } from '@/lib/utils';

const POUCH_ITEM_MEMO_MAX_LEN = 60;

export type PouchItemRowProps = {
  item: MyCosmeticsResponseDTO;
  isSelected: boolean;
  selectionIndex: number | undefined;
  memoValue: string;
  isSwipeOpen: boolean;
  hasSwipeActions: boolean;
  imageLoading?: 'lazy' | 'eager';
  onToggleItem: (id: number) => void;
  onMemoChange: (id: number, memo: string) => void;
  onExpandedChange: (isExpanded: boolean) => void;
  onOpenSwipeRowIdChange?: (id: number | null) => void;
  onEditItem?: (id: number) => void;
  onDeleteItem?: (id: number) => void;
};

const PouchItemRowComponent = ({
  item,
  isSelected,
  selectionIndex,
  memoValue,
  isSwipeOpen,
  hasSwipeActions,
  imageLoading = 'lazy',
  onToggleItem,
  onMemoChange,
  onExpandedChange,
  onOpenSwipeRowIdChange,
  onEditItem,
  onDeleteItem,
}: PouchItemRowProps) => {
  const id = item.id;
  if (id == null) {
    return null;
  }

  const handleToggleItem = (event: ReactMouseEvent<HTMLButtonElement>) => {
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
              loading={imageLoading}
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

  return hasSwipeActions ? (
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
  );
};

export const PouchItemRow = memo(PouchItemRowComponent);
