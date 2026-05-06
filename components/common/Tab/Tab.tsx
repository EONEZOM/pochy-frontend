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
  bordered?: boolean;
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
      scrollable ? 'overflow-x-auto scrollbar-hide select-none' : 'flex-wrap',
      variant === 'underline' && [
        'gap-6',
        bordered
          ? 'rounded-2xl border border-mono-gray p-4'
          : 'border-b border-mono-bright-gray px-4 pt-3',
      ],
      variant === 'pill' && 'gap-2 bg-white px-4 py-3',
      className,
    );

    const dragProps = scrollable
      ? {
          ref: registerRef,
          onMouseDown: onDragStart,
          onMouseMove: onDragMove,
          onMouseUp: onDragEnd,
          onMouseLeave: onDragEnd,
        }
      : {};

    const handleClick = (itemValue: string) => {
      if (scrollable && checkIsClickForbidden()) return;
      onChange(itemValue);
    };

    if (variant === 'pill') {
      return (
        <div className={containerClass} {...dragProps}>
          {items.map((item) => {
            const isActive = value === item.value;
            return (
              <button
                key={item.value}
                type="button"
                onClick={() => handleClick(item.value)}
                className={cn(
                  'h-10 shrink-0 rounded-full border px-5 text-sm font-semibold transition-colors',
                  isActive
                    ? 'bg-brand-classic border-transparent text-white'
                    : 'border-mono-bright-gray text-mono-dark-gray bg-transparent',
                )}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      );
    }

    // underline variant
    return (
      <div className={containerClass} {...dragProps}>
        {items.map((item) => {
          const isActive = value === item.value;
          return (
            <button
              key={item.value}
              type="button"
              onClick={() => handleClick(item.value)}
              className={cn(
                'shrink-0 cursor-pointer border-b-2 pb-3 text-sm font-bold transition-all',
                isActive
                  ? 'border-brand-pink text-brand-pink'
                  : 'text-mono-dark-gray border-transparent',
              )}
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
