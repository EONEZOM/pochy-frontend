'use client';

import Link from 'next/link';
import { Suspense, useMemo, useState } from 'react';
import Image from 'next/image';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  FILTER_CATEGORIES,
  FilterMainCategory,
  FilterSubCategory,
} from '@/constants/category';
import { CategoryFilterArea } from '@/components/wishlist/CategoryFilterArea';
import { ExtraNav } from '@/components/common/ExtraNav';
import { WishlistHeader } from '@/components/wishlist/WishlistHeader';
import { WishlistEmptyView } from '@/components/wishlist/WishlistEmptyView';
import { useReadWishCosmeticsList } from '@/api/generated/wish-cosmetics/wish-cosmetics';
import type { ReadListDto } from '@/api/model';
import { WishCardImage } from '@/components/wishlist/WishCardImage';
import {
  pickWishCaptureImageUrl,
  pickWishOfficialImageUrl,
} from '@/lib/wish-display-image';
import { usePrefetchDetailOnInteraction } from '@/hooks/usePrefetchDetailOnInteraction';
import { useWarmWishListImages } from '@/hooks/useWarmRouteImages';
import { cn } from '@/lib/utils';

type WishListItem = {
  id: number;
  brand_name: string;
  product_name: string;
  main_category: string;
  sub_category: string;
  official_image: string;
  capture_image: string;
  price: number;
};

const parseWishId = (item: ReadListDto): number | null => {
  const raw = item.wishCosmeticsId;
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    return raw;
  }
  if (typeof raw === 'string') {
    const n = Number.parseInt(raw, 10);
    return Number.isFinite(n) ? n : null;
  }
  return null;
};

const toWishListItem = (item: ReadListDto, id: number): WishListItem => ({
  id,
  brand_name: item.brand ?? '',
  product_name: item.productName ?? '',
  main_category: item.category ?? '',
  sub_category: item.subCategory ?? '',
  official_image: pickWishOfficialImageUrl(item),
  capture_image: pickWishCaptureImageUrl(item),
  price: item.price ?? 0,
});

function WishlistPageContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const getDetailInteractionHandlers = usePrefetchDetailOnInteraction();
  const [isRegisterMenuOpen, setIsRegisterMenuOpen] = useState(false);

  const searchQuery = searchParams.get('q') || '';
  const currentCategory =
    (searchParams.get('category') as FilterMainCategory) || 'All';
  const currentSub = (searchParams.get('sub') as FilterSubCategory) || 'All';
  const sortOrder = searchParams.get('sort') || 'latest';

  const { data, isLoading, isError } = useReadWishCosmeticsList({
    keyword: searchQuery.trim() || undefined,
    category: currentCategory !== 'All' ? currentCategory : undefined,
    subCategory: currentSub !== 'All' ? currentSub : undefined,
    // 가격순은 클라이언트 정렬이므로 서버에는 최신순(desc)으로 전체를 받아옵니다.
    sort: sortOrder === 'oldest' ? 'asc' : 'desc',
    size: 100,
  });

  const filteredItems = useMemo(() => {
    const items = (data?.result?.content ?? [])
      .map((item) => {
        const id = parseWishId(item);
        return id == null ? null : toWishListItem(item, id);
      })
      .filter((item): item is WishListItem => item != null);

    if (sortOrder === 'price-desc') {
      return [...items].sort((a, b) => (b.price ?? 0) - (a.price ?? 0));
    }
    if (sortOrder === 'price-asc') {
      return [...items].sort((a, b) => (a.price ?? 0) - (b.price ?? 0));
    }
    return items;
  }, [data?.result?.content, sortOrder]);

  useWarmWishListImages(filteredItems);

  const handleMainChange = (category: FilterMainCategory) => {
    const params = new URLSearchParams(searchParams);
    if (category === 'All') {
      params.delete('category');
    } else {
      params.set('category', category);
    }
    params.delete('sub');
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const handleSubChange = (sub: FilterSubCategory) => {
    const params = new URLSearchParams(searchParams);
    if (sub === 'All') {
      params.delete('sub');
    } else {
      params.set('sub', sub);
    }
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const handleSort = (sort: string) => {
    const params = new URLSearchParams(searchParams);
    params.set('sort', sort);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const activeSubCategories = useMemo(
    () =>
      FILTER_CATEGORIES.find((c) => c.value === currentCategory)
        ?.subCategories || [],
    [currentCategory],
  );

  const isDefaultFilters =
    searchQuery === '' && currentCategory === 'All' && currentSub === 'All';

  const showRegisteredEmpty =
    !isLoading && !isError && filteredItems.length === 0 && isDefaultFilters;

  const showFilteredEmpty =
    !isLoading && !isError && filteredItems.length === 0 && !isDefaultFilters;

  return (
    <div className="relative">
      <WishlistHeader />

      {!showRegisteredEmpty ? (
        <CategoryFilterArea
          mainCategories={FILTER_CATEGORIES}
          activeSubCategories={activeSubCategories}
          currentCategory={currentCategory}
          currentSub={currentSub}
          onMainChange={handleMainChange}
          onSubChange={handleSubChange}
          leftControl={
            <ExtraNav
              side="bottom"
              align="start"
              selectedKey={sortOrder}
              dimBackdrop
              trigger={
                <button
                  type="button"
                  className="text-mono-dark-gray flex size-8 items-center justify-center"
                  aria-label="정렬 필터"
                >
                  <Image
                    src="/icons/filter.svg"
                    alt=""
                    width={20}
                    height={20}
                  />
                </button>
              }
              items={[
                {
                  key: 'latest',
                  label: '최신순',
                  onClick: () => handleSort('latest'),
                },
                {
                  key: 'oldest',
                  label: '오래된순',
                  onClick: () => handleSort('oldest'),
                },
                {
                  key: 'price-desc',
                  label: '높은 가격순',
                  onClick: () => handleSort('price-desc'),
                },
                {
                  key: 'price-asc',
                  label: '낮은 가격순',
                  onClick: () => handleSort('price-asc'),
                },
              ]}
            />
          }
        />
      ) : null}

      <main className="px-5 pb-4">
        {isLoading ? (
          <div className="flex min-h-[60vh] items-center justify-center text-sm text-zinc-500">
            위시리스트를 불러오는 중...
          </div>
        ) : isError ? (
          <div className="flex min-h-[60vh] items-center justify-center text-sm text-red-500">
            위시리스트를 불러오지 못했습니다.
          </div>
        ) : showRegisteredEmpty ? (
          <WishlistEmptyView />
        ) : showFilteredEmpty ? (
          <div className="text-mono-dark-gray flex min-h-[50vh] flex-col items-center justify-center gap-2 px-4 text-center text-sm">
            <p className="text-mono-jet text-base font-bold">
              조건에 맞는 위시가 없어요
            </p>
            <p>검색어나 카테고리 필터를 바꿔 보세요.</p>
          </div>
        ) : (
          <div className="flex w-full gap-4 pb-4">
            {/* 짝수/홀수 인덱스로 열을 직접 분배해 정렬 순서(최신순 등)가
                왼→오 읽기 순서와 일치하도록 합니다. */}
            {[0, 1].map((colIndex) => (
              <div
                key={colIndex}
                className="flex min-w-0 flex-1 flex-col gap-7"
              >
                {filteredItems
                  .filter((_, i) => i % 2 === colIndex)
                  .map((item, rowIndex) => {
                    const globalIndex = rowIndex * 2 + colIndex;
                    return (
                      <Link
                        key={item.id}
                        href={`/wish/${item.id}`}
                        className="group flex w-full min-w-0 flex-col"
                        {...getDetailInteractionHandlers(`/wish/${item.id}`)}
                      >
                        <div
                          className={cn(
                            'relative aspect-square w-full shrink-0 overflow-hidden',
                            rowIndex % 2 === colIndex
                              ? 'bg-[#FFF7FC]'
                              : 'bg-[#F3F3F3]',
                          )}
                        >
                          <WishCardImage
                            fill
                            officialImage={item.official_image}
                            captureImage={item.capture_image}
                            productName={item.product_name}
                            className="object-contain"
                            priority={globalIndex === 0}
                          />
                        </div>

                        <div className="flex h-14 min-h-14 min-w-0 shrink-0 flex-col gap-0.5 pt-2">
                          <span className="text-mono-dark-gray w-full truncate text-xs">
                            {item.brand_name}
                          </span>
                          <span className="text-mono-jet line-clamp-2 w-full text-sm leading-5 font-semibold">
                            {item.product_name}
                          </span>
                        </div>
                      </Link>
                    );
                  })}
              </div>
            ))}
          </div>
        )}
      </main>

      {/* 등록 FAB — 빈 화면 오버레이(z-35) 위에 표시 */}
      <div className="pointer-events-none fixed bottom-16 left-1/2 z-50 w-full max-w-120 -translate-x-1/2">
        <div
          className={cn(
            'relative pr-5',
            showRegisteredEmpty ? 'h-[168px]' : 'h-24',
          )}
        >
          {showRegisteredEmpty ? (
            <div
              className={cn(
                'pointer-events-none absolute right-2 bottom-[70px] w-[230px] transition-[opacity,filter] duration-200',
                isRegisterMenuOpen && 'opacity-40 grayscale',
              )}
            >
              <Image
                src="/figma/wish/Union.svg"
                alt=""
                width={200}
                height={100}
                className="block h-auto w-full"
                priority
              />
              <p className="text-mono-jet absolute inset-x-3 top-2 bottom-6 flex items-center justify-center text-center text-[10px] leading-snug font-bold whitespace-pre-line">
                {`버튼을 눌러 첫 번째\n위시리스트를 등록해 보세요!`}
              </p>
            </div>
          ) : null}
          <div className="pointer-events-auto absolute right-5 bottom-5">
            <ExtraNav
              dimBackdrop
              onOpenChange={setIsRegisterMenuOpen}
              items={[
                {
                  label: '스캔해서 등록하기',
                  onClick: () => router.push('/wish/register/scan'),
                  icon: '/icons/imgplus.svg',
                },
                {
                  label: '직접 등록하기',
                  href: '/wish/register/direct',
                  icon: '/icons/write.svg',
                },
              ]}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function WishlistPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center text-sm text-zinc-500">
          위시리스트를 불러오는 중...
        </div>
      }
    >
      <WishlistPageContent />
    </Suspense>
  );
}
