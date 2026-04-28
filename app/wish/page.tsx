'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useMemo, useState } from 'react';
import { useWishlistStore } from '@/store/wishlistStore';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  FILTER_CATEGORIES,
  FilterMainCategory,
  FilterSubCategory,
} from '@/constants/category';
import { CategoryFilterArea } from '@/components/wishlist/CategoryFilterArea';
import { ExtraNav } from '@/components/common/ExtraNav';
import { Modal } from '@/components/common/Modal';

export default function WishlistPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // TODO: 백엔드 API 연동 필요
  const [isScanModalOpen, setIsScanModalOpen] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  const wishItems = useWishlistStore((state) => state.items);

  const searchQuery = searchParams.get('q') || '';
  const currentCategory =
    (searchParams.get('category') as FilterMainCategory) || 'All';
  const currentSub = (searchParams.get('sub') as FilterSubCategory) || 'All';

  // 백엔드 완성 시 이 부분은 API 호출 결과로 대체
  const filteredItems = useMemo(() => {
    return wishItems.filter((item) => {
      const matchesSearch =
        searchQuery === '' ||
        item.product_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.brand_name.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesMain =
        currentCategory === 'All' || item.main_category === currentCategory;

      const matchesSub =
        currentSub === 'All' || item.sub_category === currentSub;

      return matchesSearch && matchesMain && matchesSub;
    });
  }, [wishItems, searchQuery, currentCategory, currentSub]);

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

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  const activeSubCategories = useMemo(
    () =>
      FILTER_CATEGORIES.find((c) => c.value === currentCategory)
        ?.subCategories || [],
    [currentCategory],
  );

  if (!isHydrated) return null;

  return (
    <div className="relative min-h-screen">
      {/* 카테고리 필터링 영역 */}
      <CategoryFilterArea
        mainCategories={FILTER_CATEGORIES}
        activeSubCategories={activeSubCategories}
        currentCategory={currentCategory}
        currentSub={currentSub}
        onMainChange={handleMainChange}
        onSubChange={handleSubChange}
      />

      <main className="p-5">
        {filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center">
            <p>등록된 제품이 없습니다</p>
          </div>
        ) : (
          <div className="columns-2 gap-4 space-y-4">
            {/* Masonry 스타일 레이아웃 */}
            {filteredItems.map((item: any) => (
              <Link
                key={item.id}
                href={`/wish/${item.id}`}
                className="flex flex-col gap-4 overflow-hidden rounded-2xl p-4 shadow-lg"
              >
                <div className="overflow-hidden rounded-2xl border-2">
                  <Image
                    src={item.official_image}
                    alt={item.product_name}
                    width={500}
                    height={700}
                    className="w-full object-cover"
                  />
                </div>
                <div className="flex w-full flex-col items-center justify-center">
                  <div className="">{item.brand_name}</div>
                  <div className="w-full truncate text-center">
                    {item.product_name}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>

      {/* 등록 페이지 이동 Popover */}
      <div className="pointer-events-none fixed bottom-0 left-1/2 z-50 w-full max-w-120 -translate-x-1/2">
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
