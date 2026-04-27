'use client';

import { memo } from 'react';
import { useDragScroll } from '@/hooks/useDragScroll';
import { cn } from '@/lib/utils';

interface TabItem {
  label: string;
  value: string;
}

interface TabProps {
  items: TabItem[];
  value: string;
  onChange: (value: string) => void;
  variant?: 'underline' | 'pill';
  // underline일 때 카드형 컨테이너
  bordered?: boolean;
  // 드래그 스크롤 여부
  scrollable?: boolean;
  className?: string;
}

export const Tab = memo(
  ({
    items,
    value,
    onChange,
    variant = 'underline',
    bordered = false,
    scrollable = false,
    className,
  }: TabProps) => {
    const {
      registerRef,
      onDragStart,
      onDragMove,
      onDragEnd,
      checkIsClickForbidden,
    } = useDragScroll();

    const containerClass = cn(
      'flex',
      // 스크롤 여부
      scrollable ? 'overflow-x-auto scrollbar-hide select-none' : 'flex-wrap',
      // variant별 컨테이너 스타일
      variant === 'underline' && [
        'gap-6',
        bordered
          ? // 카드형
            'rounded-2xl border border-mono-gray p-4'
          : // 언더라인형
            'border-b border-mono-bright-gray px-5',
      ],
      variant === 'pill' && 'gap-2 px-5 py-3',
      className,
    );

    const getItemClass = (isActive: boolean) => {
      if (variant === 'underline') {
        return cn(
          'shrink-0 pb-3 text-sm font-bold transition-all border-b-2',
          isActive
            ? 'border-brand-pink text-brand-pink'
            : 'border-transparent text-mono-dark-gray',
        );
      }

      // pill
      return cn(
        'shrink-0 rounded-full px-4 py-1.5 text-xs font-bold transition-all',
        isActive
          ? 'bg-brand-pink text-white'
          : 'border border-mono-gray bg-white text-mono-dark-gray',
      );
    };

    const dragProps = scrollable
      ? {
          ref: registerRef,
          onMouseDown: onDragStart,
          onMouseMove: onDragMove,
          onMouseUp: onDragEnd,
          onMouseLeave: onDragEnd,
        }
      : {};

    return (
      <div className={containerClass} {...dragProps}>
        {items.map((item) => {
          const isActive = value === item.value;
          return (
            <button
              key={item.value}
              onClick={() => {
                if (scrollable && checkIsClickForbidden()) return;
                onChange(item.value);
              }}
              className={cn('cursor-pointer', getItemClass(isActive))}
            >
              {item.label}
            </button>
          );
        })}
      </div>
    );
  },
);

Tab.displayName = 'Tab';
