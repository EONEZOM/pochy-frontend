'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';

import { useGetPouchDetail } from '@/api/generated/pouch-controller/pouch-controller';
import type { PouchItemDetailDto } from '@/api/model';
import { PouchSheetChrome } from '@/components/my-cosmetics/PouchSheetChrome';
import {
  dedupePouchDetailRowsByProduct,
  enrichPouchDetailRowWithCosmeticLookup,
  type PouchDetailEnrichedRow,
  usePouchCosmeticsById,
} from '@/lib/pouch-cosmetic-lookup';
import { getCosmeticImageSrc } from '@/lib/pouch-canvas';
import { CategoryFilterArea } from '@/components/wishlist/CategoryFilterArea';
import {
  FILTER_CATEGORIES,
  type FilterMainCategory,
  type FilterSubCategory,
} from '@/constants/category';

type PouchDetailBottomSheetProps = {
  pouchId: number;
  isExpanded: boolean;
  onExpandedChange: (isExpanded: boolean) => void;
};

type PouchDetailRow = PouchDetailEnrichedRow & {
  imageSrc: string;
};

export function PouchDetailBottomSheet({
  pouchId,
  isExpanded,
  onExpandedChange,
}: PouchDetailBottomSheetProps) {
  const [currentCategory, setCurrentCategory] =
    useState<FilterMainCategory>('All');
  const [currentSub, setCurrentSub] = useState<FilterSubCategory>('All');

  const { data: pouchDetailData, isLoading: isPouchDetailLoading } =
    useGetPouchDetail(pouchId);
  const pouchCosmetics = pouchDetailData?.result?.cosmetics;
  const { cosmeticsById, cosmeticsByNameBrand, isLoading: isCosmeticsLookupLoading } =
    usePouchCosmeticsById(pouchCosmetics);

  const pouchItems = useMemo((): PouchDetailRow[] => {
    const cosmetics = pouchCosmetics ?? [];
    const enriched = cosmetics.map((item) =>
      enrichPouchDetailRowWithCosmeticLookup(
        item,
        cosmeticsById,
        cosmeticsByNameBrand,
      ),
    );
    return dedupePouchDetailRowsByProduct(enriched).map((item) => ({
      ...item,
      imageSrc: getCosmeticImageSrc(item),
    }));
  }, [cosmeticsById, cosmeticsByNameBrand, pouchCosmetics]);

  const activeSubCategories = useMemo(
    () =>
      FILTER_CATEGORIES.find((c) => c.value === currentCategory)
        ?.subCategories || [],
    [currentCategory],
  );

  const filteredItems = useMemo(() => {
    return pouchItems.filter((item) => {
      if (currentCategory !== 'All' && item.category !== currentCategory) {
        return false;
      }
      if (currentSub !== 'All' && item.subCategory !== currentSub) {
        return false;
      }
      return true;
    });
  }, [pouchItems, currentCategory, currentSub]);

  const handleMainChange = (category: FilterMainCategory) => {
    setCurrentCategory(category);
    setCurrentSub('All');
  };

  const isLoading = isPouchDetailLoading || isCosmeticsLookupLoading;

  return (
    <PouchSheetChrome
      ariaLabel={'파우치 화장품 메모'}
      isExpanded={isExpanded}
      onExpandedChange={onExpandedChange}
    >
      <CategoryFilterArea
        mainCategories={FILTER_CATEGORIES}
        activeSubCategories={activeSubCategories}
        currentCategory={currentCategory}
        currentSub={currentSub}
        onMainChange={handleMainChange}
        onSubChange={setCurrentSub}
      />

      <div className="scrollbar-hide min-h-0 flex-1 overflow-y-auto px-5 pt-2 pb-28">
        {isLoading ? (
          <p className="text-mono-dark-gray py-8 text-center text-sm">
            {'불러오는 중...'}
          </p>
        ) : pouchItems.length === 0 ? (
          <p className="text-mono-dark-gray py-8 text-center text-sm">
            {'파우치에 등록된 화장품이 없어요.'}
          </p>
        ) : filteredItems.length === 0 ? (
          <p className="text-mono-dark-gray py-8 text-center text-sm">
            {'해당 카테고리의 화장품이 없어요.'}
          </p>
        ) : (
          <ul className="mx-auto flex w-full flex-col gap-4">
            {filteredItems.map((item) => {
              const linkCosmeticId = item.linkCosmeticId;
              const rowKey =
                linkCosmeticId != null && linkCosmeticId > 0
                  ? `cosmetic-${linkCosmeticId}`
                  : item.id != null
                    ? `pouch-item-${item.id}`
                    : null;
              if (rowKey == null) {
                return null;
              }
              const memo = (item.memo ?? '').trim();
              const rowContent = (
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
              );

              if (linkCosmeticId != null && linkCosmeticId > 0) {
                return (
                  <li key={rowKey}>
                    <Link
                      href={`/my-cosmetics/${linkCosmeticId}`}
                      className="block w-full"
                    >
                      {rowContent}
                    </Link>
                  </li>
                );
              }

              return <li key={rowKey}>{rowContent}</li>;
            })}
          </ul>
        )}
      </div>
    </PouchSheetChrome>
  );
}

export function PouchDetailItemText({
  item,
  memo,
}: {
  item: Pick<PouchDetailRow, 'brand' | 'name'>;
  memo: string;
}) {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-1.5">
      <span className="truncate text-sm leading-4 font-bold text-[#B7B7B7]">
        {(item.brand ?? '').trim() || '브랜드명'}
      </span>
      <span className="line-clamp-2 text-[11px] leading-[150%] font-normal text-[#161618]">
        {(item.name ?? '').trim() || '제품명'}
      </span>
      {memo ? (
        <p className="line-clamp-2 text-[11px] leading-[150%] font-normal text-[#161618]">
          {memo}
        </p>
      ) : null}
    </div>
  );
}
