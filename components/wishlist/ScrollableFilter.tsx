// components/wishlist/ScrollableFilter.tsx
'use client'

import { memo } from 'react'
import { useDragScroll } from '@/hooks/useDragScroll'
import { cn } from '@/lib/utils'

interface ScrollableFilterProps {
  items: { label: string; value: string }[]
  currentValue: string
  onChange: (value: any) => void
  containerClass?: string
  itemClass?: (isActive: boolean) => string
}

export const ScrollableFilter = memo(
  ({
    items,
    currentValue,
    onChange,
    containerClass,
    itemClass,
  }: ScrollableFilterProps) => {
    const {
      registerRef,
      onDragStart,
      onDragMove,
      onDragEnd,
      isDrag,
      checkIsClickForbidden,
    } = useDragScroll()

    return (
      <div
        ref={registerRef}
        onMouseDown={onDragStart}
        onMouseMove={onDragMove}
        onMouseUp={onDragEnd}
        onMouseLeave={onDragEnd}
        className={cn(
          'scrollbar-hide flex overflow-x-auto select-none',
          containerClass,
        )}
      >
        {items.map((item) => {
          const isActive = currentValue === item.value
          return (
            <button
              key={item.value}
              onClick={() => {
                // 드래그가 아닐 때만 이벤트 실행
                if (!checkIsClickForbidden()) onChange(item.value)
              }}
              className={cn(
                'shrink-0 cursor-pointer transition-all',
                itemClass?.(isActive),
              )}
            >
              {item.label}
            </button>
          )
        })}
      </div>
    )
  },
)

ScrollableFilter.displayName = 'ScrollableFilter'
