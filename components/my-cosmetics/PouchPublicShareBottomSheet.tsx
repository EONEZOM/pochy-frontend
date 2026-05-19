'use client';

import { useMemo, useState } from 'react';

import { PouchSheetChrome } from '@/components/my-cosmetics/PouchSheetChrome';
import { PouchDetailItemText } from '@/components/my-cosmetics/PouchDetailBottomSheet';
import { CategoryFilterArea } from '@/components/wishlist/CategoryFilterArea';
import {
  FILTER_CATEGORIES,
  type FilterMainCategory,
  type FilterSubCategory,
} from '@/constants/category';
import { resolveStoredCosmeticCategories } from '@/lib/cosmetic-category-normalize';
import type { PouchPublicShareDisplayRow } from '@/lib/pouch-share-display';

type PouchPublicShareBottomSheetProps = {
  items: PouchPublicShareDisplayRow[];
  isLoading: boolean;
  isExpanded: boolean;
  onExpandedChange: (isExpanded: boolean) => void;
};

export function PouchPublicShareBottomSheet({
  items,
  isLoading,
  isExpanded,
  onExpandedChange,
}: PouchPublicShareBottomSheetProps) {
  const [currentCategory, setCurrentCategory] =
    useState<FilterMainCategory>('All');
  const [currentSub, setCurrentSub] = useState<FilterSubCategory>('All');

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
      ariaLabel={'파우치 화장품 메모'}
      isExpanded={isExpanded}
      onExpandedChange={onExpandedChange}
      bottomOffset="0px"
    >
      <CategoryFilterArea
        mainCategories={FILTER_CATEGORIES}
        activeSubCategories={activeSubCategories}
        currentCategory={currentCategory}
        currentSub={currentSub}
        onMainChange={handleMainChange}
        onSubChange={setCurrentSub}
      />

      <div className="scrollbar-hide min-h-0 flex-1 overflow-y-auto px-5 pt-2 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        {isLoading ? (
          <p className="text-mono-dark-gray py-8 text-center text-sm">
            {'불러오는 중...'}
          </p>
        ) : items.length === 0 ? (
          <p className="text-mono-dark-gray py-8 text-center text-sm">
            {'파우치에 등록된 화장품이 없어요.'}
          </p>
        ) : filteredItems.length === 0 ? (
          <p className="text-mono-dark-gray py-8 text-center text-sm">
            {'해당 카테고리의 화장품이 없어요.'}
          </p>
        ) : (
          <ul className="mx-auto flex w-full flex-col gap-4">
            {filteredItems.map((item, index) => {
              const rowKey =
                item.id != null
                  ? `pouch-share-item-${item.id}`
                  : `pouch-share-item-${item.myCosmeticId ?? index}`;
              const memo = (item.memo ?? '').trim();

              return (
                <li key={rowKey}>
                  <div className="flex w-full items-start gap-4">
                    <div className="relative size-24 shrink-0 bg-[#F3F3F3] p-2">
                      <div className="absolute inset-0 flex items-center justify-center p-2">
                        <div className="relative h-[54px] w-[48px]">
                          {item.imageSrc ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={item.imageSrc}
                              alt={item.name ?? ''}
                              className="h-full w-full object-contain drop-shadow-[5px_5px_2px_rgba(0,0,0,0.2)]"
                            />
                          ) : (
                            <span className="text-mono-dark-gray text-[10px]">
                              이미지 없음
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <PouchDetailItemText item={item} memo={memo} />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </PouchSheetChrome>
  );
}
