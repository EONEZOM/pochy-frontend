'use client';

import { memo } from 'react';
import { FilterMainCategory, FilterSubCategory } from '@/constants/category';
import { Tab } from '@/components/common/Tab';

interface CategoryFilterAreaProps {
  mainCategories: any[];
  activeSubCategories?: any[];
  currentCategory: FilterMainCategory;
  currentSub: FilterSubCategory;
  onMainChange: (val: FilterMainCategory) => void;
  onSubChange: (val: FilterSubCategory) => void;
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
      activeSubCategories.length > 0;

    return (
      <div className="flex flex-col">
        {/* 대분류 - 언더라인형 스크롤 */}
        <Tab
          items={mainCategories}
          value={currentCategory}
          onChange={(val) => onMainChange(val as FilterMainCategory)}
          variant="underline"
          scrollable
        />

        {/* 소분류 - 버튼형 스크롤 */}
        {showSubFilter && (
          <Tab
            items={activeSubCategories}
            value={currentSub}
            onChange={(val) => onSubChange(val as FilterSubCategory)}
            variant="pill"
            scrollable
          />
        )}
      </div>
    );
  },
);

CategoryFilterArea.displayName = 'CategoryFilterArea';
