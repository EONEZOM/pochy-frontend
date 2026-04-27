'use client';

import { memo } from 'react';
import { useDragScroll } from '@/hooks/useDragScroll';
import { cn } from '@/lib/utils';
import { Button } from '@/components/common/Button';

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
          : 'border-b border-mono-bright-gray px-5',
      ],
      variant === 'pill' && 'gap-2 px-5 py-3',
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
              <Button
                key={item.value}
                size="sm"
                variant={isActive ? 'solid' : 'default'}
                onClick={() => handleClick(item.value)}
              >
                {item.label}
              </Button>
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
