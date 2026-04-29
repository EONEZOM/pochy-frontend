'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Suspense, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  FILTER_CATEGORIES,
  FilterMainCategory,
  FilterSubCategory,
} from '@/constants/category';
import { CategoryFilterArea } from '@/components/wishlist/CategoryFilterArea';
import { ExtraNav } from '@/components/common/ExtraNav';
import { Modal } from '@/components/common/Modal';
import { WishlistHeader } from '@/components/wishlist/WishlistHeader';
import { useReadWishCosmeticsList } from '@/api/generated/wish-cosmetics/wish-cosmetics';
import type { ReadListDto } from '@/api/model';

type WishListItem = {
  id: number;
  brand_name: string;
  product_name: string;
  main_category: string;
  sub_category: string;
  official_image: string;
};

const toWishListItem = (item: ReadListDto): WishListItem => ({
  id: item.wishCosmeticsId as number,
  brand_name: item.brand ?? '',
  product_name: item.productName ?? '',
  main_category: item.category ?? '',
  sub_category: item.subCategory ?? '',
  official_image: item.productImageUrl ?? '',
});

function WishlistPageContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [isScanModalOpen, setIsScanModalOpen] = useState(false);

  const searchQuery = searchParams.get('q') || '';
  const currentCategory =
    (searchParams.get('category') as FilterMainCategory) || 'All';
  const currentSub = (searchParams.get('sub') as FilterSubCategory) || 'All';
  const sortOrder = searchParams.get('sort') || 'latest';

  const { data, isLoading, isError } = useReadWishCosmeticsList({
    keyword: searchQuery || undefined,
    category: currentCategory !== 'All' ? currentCategory : undefined,
    subCategory: currentSub !== 'All' ? currentSub : undefined,
    // price 정렬은 API DTO에 가격 필드가 없어 서버 기본 정렬로 fallback
    sort: sortOrder === 'oldest' ? 'asc' : 'desc',
    size: 100,
  });

  const filteredItems = useMemo(() => {
    return (data?.result?.content ?? [])
      .filter((item): item is ReadListDto & { wishCosmeticsId: number } =>
        typeof item.wishCosmeticsId === 'number',
      )
      .map(toWishListItem);
  }, [data?.result?.content]);

  const handleMainChange = (category: FilterMainCategory) => {
    const params = new URLSearchParams(searchParams);
    if (category === 'All') {
      params.delete('category');
    } else {
      params.set('category', category);
    }
    params.delete('sub'); // 대분류가 바뀌면 소분류 필터는 제거
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

  const activeSubCategories = useMemo(
    () =>
      FILTER_CATEGORIES.find((c) => c.value === currentCategory)
        ?.subCategories || [],
    [currentCategory],
  );

  return (
    <div className="relative">
      <WishlistHeader />

      {/* 카테고리 필터링 영역 */}
      <CategoryFilterArea
        mainCategories={FILTER_CATEGORIES}
        activeSubCategories={activeSubCategories}
        currentCategory={currentCategory}
        currentSub={currentSub}
        onMainChange={handleMainChange}
        onSubChange={handleSubChange}
      />

      <main className="p-4">
        {isLoading ? (
          <div className="flex min-h-[60vh] items-center justify-center text-sm text-zinc-500">
            위시리스트를 불러오는 중...
          </div>
        ) : isError ? (
          <div className="flex min-h-[60vh] items-center justify-center text-sm text-red-500">
            위시리스트를 불러오지 못했습니다.
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="flex min-h-[60vh] flex-col items-center justify-center">
            <div className="font-bold">첫 번째 위시템을 기다리고 있어요.</div>
            <div className="text-mono-dark-gray">
              + 버튼을 눌러 등록해 보세요.
            </div>
          </div>
        ) : (
          <div className="flex gap-3 pb-4">
            {/* 짝수/홀수 인덱스로 열을 직접 분배해 정렬 순서(최신순 등)가
                왼→오 읽기 순서와 일치하도록 합니다. */}
            {[0, 1].map((colIndex) => (
              <div key={colIndex} className="flex flex-1 flex-col gap-3">
                {filteredItems
                  .filter((_, i) => i % 2 === colIndex)
                  .map((item) => (
                    <Link
                      key={item.id}
                      href={`/wish/${item.id}`}
                      className="group border-mono-bright-gray block overflow-hidden rounded-2xl border bg-white shadow-sm transition-shadow hover:shadow-md"
                    >
                      {/* 이미지 영역 */}
                      <div className="bg-mono-bright-gray relative w-full">
                        {item.official_image ? (
                          <Image
                            src={item.official_image}
                            alt={item.product_name}
                            width={500}
                            height={700}
                            className="w-full object-cover"
                          />
                        ) : (
                          <div className="flex aspect-3/4 w-full items-center justify-center">
                            <Image
                              src="/icons/imgplus.svg"
                              alt=""
                              width={32}
                              height={32}
                              unoptimized
                              className="opacity-30"
                            />
                          </div>
                        )}
                      </div>

                      {/* 텍스트 영역 */}
                      <div className="flex flex-col items-center gap-0.5 px-2 py-3">
                        <span className="text-mono-dark-gray w-full truncate text-center text-sm">
                          {item.brand_name}
                        </span>
                        <span className="text-mono-jet w-full truncate text-center text-sm font-semibold">
                          {item.product_name}
                        </span>
                      </div>
                    </Link>
                  ))}
              </div>
            ))}
          </div>
        )}
      </main>

      {/* 등록 페이지 이동 Popover */}
      <div className="pointer-events-none fixed bottom-16 left-1/2 z-50 w-full max-w-120 -translate-x-1/2">
        <div className="relative h-24">
          <div className="absolute right-5 bottom-5">
            <ExtraNav
              items={[
                {
                  label: '스캔해서 등록하기',
                  onClick: () => setIsScanModalOpen(true),
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

      {/* 스캔 모달 */}
      <Modal
        open={isScanModalOpen}
        onOpenChange={setIsScanModalOpen}
        variant="warning"
        title="주의"
        description={`등록할 상품이 잘 나온 사진을\n준비해주세요!\n\n여러개의 제품의 경우\n정확도가 떨어질 수 있습니다.`}
        confirmText="확인"
        onConfirm={() => router.push('/wish/register/scan')}
      />
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
