// components/wishlist/CategoryFilterArea.tsx
'use client'

import { memo } from 'react'
import { cn } from '@/lib/utils'
import { FilterMainCategory, FilterSubCategory } from '@/constants/category'
import { ScrollableFilter } from '@/components/wishlist/ScrollableFilter'

interface CategoryFilterAreaProps {
  mainCategories: any[]
  activeSubCategories?: any[]
  currentCategory: FilterMainCategory
  currentSub: FilterSubCategory
  onMainChange: (val: FilterMainCategory) => void
  onSubChange: (val: FilterSubCategory) => void
}

export const CategoryFilterArea = memo(
  ({
    mainCategories,
    activeSubCategories,
    currentCategory,
    currentSub,
    onMainChange,
    onSubChange,
  }: CategoryFilterAreaProps) => {
    // 소분류 노출 조건 판별
    const showSubFilter =
      currentCategory !== 'All' &&
      currentCategory !== 'Etc' &&
      activeSubCategories &&
      activeSubCategories.length > 0

    return (
      <div className="flex flex-col">
        {/* 1단 필터: 대분류 */}
        <ScrollableFilter
          items={mainCategories}
          currentValue={currentCategory}
          onChange={onMainChange}
          containerClass="gap-6 border-b border-zinc-100 px-5"
          itemClass={(isActive) =>
            cn(
              'border-b-2 pb-3 text-sm font-bold transition-all',
              isActive
                ? 'border-zinc-900 text-zinc-900'
                : 'border-transparent text-zinc-400',
            )
          }
        />

        {/* 2단 필터: 소분류 */}
        {showSubFilter && (
          <ScrollableFilter
            items={activeSubCategories}
            currentValue={currentSub}
            onChange={onSubChange}
            containerClass="gap-2 bg-zinc-50/50 px-5 py-3"
            itemClass={(isActive) =>
              cn(
                'shrink-0 rounded-full px-4 py-1.5 text-xs font-bold transition-all',
                isActive
                  ? 'bg-zinc-800 text-white'
                  : 'border border-zinc-200 bg-white text-zinc-500',
              )
            }
          />
        )}
      </div>
    )
  },
)

CategoryFilterArea.displayName = 'CategoryFilterArea'
