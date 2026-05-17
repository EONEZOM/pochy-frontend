'use client';

import { useParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { keepPreviousData } from '@tanstack/react-query';
import {
  useSearchMyCosmetics,
  useGetCosmeticDetail,
} from '@/api/generated/my-cosmetics-controller/my-cosmetics-controller';
import type { MyCosmeticsResponseDTO } from '@/api/model';
import { WishCardImage } from '@/components/wishlist/WishCardImage';
import { Header } from '@/components/layout/Header';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from '@/components/ui/carousel';
import { getCategoryLabels } from '@/utils/category';
import { cn } from '@/lib/utils';

export default function MyCosmeticsDetailPage() {
  const params = useParams();
  const [api, setApi] = useState<CarouselApi>();
  const cosmeticId = Number(params.id);
  const isValidId = Number.isFinite(cosmeticId) && cosmeticId > 0;
  const [selectedId, setSelectedId] = useState(cosmeticId);
  const [currentIndex, setCurrentIndex] = useState<number | null>(null);

  const { data: listData, isLoading: isListLoading } = useSearchMyCosmetics({
    size: 100,
    sort: 'desc',
  });
  const listItems: MyCosmeticsResponseDTO[] = useMemo(
    () => (listData?.result?.content ?? []) as MyCosmeticsResponseDTO[],
    [listData],
  );

  const listItemById = useMemo(
    () => listItems.find((v) => v.id === selectedId),
    [listItems, selectedId],
  );

  const initialIndex = listItems.findIndex((v) => v.id === cosmeticId);
  const safeInitialIndex = initialIndex >= 0 ? initialIndex : 0;
  const activeIndex = currentIndex ?? safeInitialIndex;

  const {
    data: detailData,
    isFetching: isDetailFetching,
    isError: isDetailError,
    isFetched: isDetailFetched,
  } = useGetCosmeticDetail(selectedId, {
    query: {
      enabled: isValidId,
      placeholderData: keepPreviousData,
      retry: (failureCount, error) => {
        const status = (error as { response?: { status?: number } })?.response
          ?.status;
        if (status === 404) {
          return false;
        }
        if (status === 401 || status === 403) {
          return false;
        }
        return failureCount < 2;
      },
    },
  });

  const detailItem = detailData?.result as MyCosmeticsResponseDTO | undefined;
  const currentItem = detailItem ?? listItemById;

  const categoryLabels = useMemo(
    () => getCategoryLabels(currentItem?.category, currentItem?.subCategory),
    [currentItem],
  );

  useEffect(() => {
    if (!api) return;

    const handleSelect = () => {
      const index = api.selectedScrollSnap();
      setCurrentIndex(index);
      const item = listItems[index];
      if (!item?.id) return;
      setSelectedId(item.id);
      window.history.replaceState(null, '', `/my-cosmetics/${item.id}`);
    };

    api.on('select', handleSelect);
    return () => { api.off('select', handleSelect); };
  }, [api, listItems]);

  const isPageLoading =
    isListLoading || (!currentItem && (!isDetailFetched || isDetailFetching));

  if (isPageLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-sm text-zinc-400">
        화장품 정보를 불러오는 중...
      </div>
    );
  }

  if (!currentItem) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-2 px-5 text-center text-sm text-zinc-400">
        <p>{'화장품 정보를 찾을 수 없어요.'}</p>
        {isDetailError ? (
          <p className="text-xs text-zinc-300">
            {'삭제되었거나 목록에 없는 제품일 수 있어요.'}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="relative max-w-120 py-5">
      <Header className="-mt-5 mb-5" title="상세 보기" />

      <div>
        {/* 브랜드 / 제품명 */}
        <div className={cn('text-center transition-opacity duration-200', isDetailFetching && 'opacity-40')}>
          <p className="text-sm font-medium text-zinc-500">{currentItem.brand}</p>
          <h2 className="text-xl font-bold">{currentItem.name}</h2>
        </div>

        {/* 캐러셀 */}
        <div className="relative mt-4">
          <Carousel
            setApi={setApi}
            opts={{
              startIndex: safeInitialIndex,
              align: 'center',
              loop: listItems.length > 2,
              containScroll: false,
            }}
            className="w-full"
          >
            <CarouselContent>
              {listItems.map((item, index) => (
                <CarouselItem
                  key={item.id}
                  className={cn('py-5 transition-all', 'basis-[50%]')}
                >
                  <div
                    className={cn(
                      'relative aspect-2/3 w-full rounded-3xl bg-white shadow transition-all duration-500',
                      activeIndex === index ? 'scale-100 opacity-100' : 'scale-90 opacity-40',
                    )}
                  >
                    <div className="absolute inset-0 overflow-hidden rounded-3xl">
                      <WishCardImage
                        officialImage={item.imgUrl ?? ''}
                        captureImage={item.captureUrl ?? ''}
                        productName={item.name ?? ''}
                        fill
                        priority={index === safeInitialIndex}
                        loading={
                          Math.abs(index - safeInitialIndex) <= 1
                            ? 'eager'
                            : 'lazy'
                        }
                      />
                    </div>
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
          </Carousel>
        </div>

        {/* 상세 정보 */}
        <div className={cn('transition-opacity duration-200', isDetailFetching && 'opacity-40')}>
          <AnimatePresence mode="wait">
            <motion.div
              key={currentItem.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              <DetailRow
                label="카테고리"
                value={`${categoryLabels.main} / ${categoryLabels.sub}`}
              />
              <DetailRow label="특징" value={currentItem.feature ?? '-'} />
              <DetailRow label="메모" value={currentItem.memo || '-'} />
              {currentItem.createdAt && (
                <DetailRow
                  label="등록일"
                  value={new Date(currentItem.createdAt).toLocaleDateString('ko-KR')}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col items-center text-center">
      <span className="font-bold">{label}</span>
      <span>{value}</span>
    </div>
  );
}
