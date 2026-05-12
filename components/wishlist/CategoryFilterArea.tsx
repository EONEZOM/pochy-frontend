'use client';

import { memo, type ReactNode } from 'react';
import { FilterMainCategory, FilterSubCategory } from '@/constants/category';
import { Tab } from '@/components/common/Tab';

type CategoryTabOption = {
  label: string;
  value: string;
};

interface CategoryFilterAreaProps {
  mainCategories: CategoryTabOption[];
  activeSubCategories?: CategoryTabOption[];
  currentCategory: FilterMainCategory;
  currentSub: FilterSubCategory;
  onMainChange: (val: FilterMainCategory) => void;
  onSubChange: (val: FilterSubCategory) => void;
  leftControl?: ReactNode;
}

export const CategoryFilterArea = memo(
  ({
    mainCategories,
    activeSubCategories,
    currentCategory,
    currentSub,
    onMainChange,
    onSubChange,
    leftControl,
  }: CategoryFilterAreaProps) => {
    // 소분류 노출 조건 판별
    const showSubFilter =
      currentCategory !== 'All' &&
      currentCategory !== 'Etc' &&
      activeSubCategories &&
      activeSubCategories.length > 0;

    return (
      <div className="flex flex-col">
        <div className="flex items-center">
          {leftControl ? (
            <div className="border-mono-bright-gray mr-5 flex h-12 w-11 shrink-0 items-center justify-center border-b">
              {leftControl}
            </div>
          ) : null}
          {/* 대분류 - 언더라인형 스크롤 */}
          <Tab
            items={mainCategories}
            value={currentCategory}
            onChange={(val) => onMainChange(val as FilterMainCategory)}
            variant="underline"
            scrollable
            className="min-w-0 flex-1"
          />
        </div>

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
