'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import Image from 'next/image';
import { Download, Share2, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { keepPreviousData } from '@tanstack/react-query';

import {
  useGetCosmeticDetail,
  useSearchMyCosmetics,
} from '@/api/generated/my-cosmetics-controller/my-cosmetics-controller';
import type { MyCosmeticsResponseDTO } from '@/api/model';
import Input from '@/components/common/Input/Input';
import { Header } from '@/components/layout/Header';
import { WishCardImage } from '@/components/wishlist/WishCardImage';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from '@/components/ui/carousel';
import { COSMETIC_CATEGORIES } from '@/constants/category';
import { useYoutubeReview } from '@/hooks/queries/useYoutubeReview';
import { resolveMediaUrl } from '@/lib/resolve-media-url';
import { cn } from '@/lib/utils';

const MEMO_MAX_LEN = 60;

const readonlyFieldClass =
  'pointer-events-none cursor-default border-[var(--mono-gray)] bg-white text-[var(--mono-jet)] focus-visible:ring-0';

type MyCosmeticsDetailViewProps = {
  routeCosmeticId: number;
};

export function MyCosmeticsDetailView({
  routeCosmeticId,
}: MyCosmeticsDetailViewProps) {
  const [showCapture, setShowCapture] = useState(false);
  const [api, setApi] = useState<CarouselApi>();
  const [selectedId, setSelectedId] = useState(routeCosmeticId);

  const { data: listData, isLoading: isListLoading } = useSearchMyCosmetics({
    size: 100,
    sort: 'desc',
  });
  const listItems: MyCosmeticsResponseDTO[] = useMemo(
    () => (listData?.result?.content ?? []) as MyCosmeticsResponseDTO[],
    [listData],
  );

  const initialIndex = listItems.findIndex((v) => v.id === routeCosmeticId);
  const safeInitialIndex = initialIndex >= 0 ? initialIndex : 0;

  const {
    data: detailData,
    isFetching: isDetailFetching,
    isError: isDetailError,
    isFetched: isDetailFetched,
  } = useGetCosmeticDetail(selectedId, {
    query: {
      enabled: Number.isFinite(selectedId) && selectedId > 0,
      placeholderData: keepPreviousData,
      retry: (failureCount, error) => {
        const status = (error as { response?: { status?: number } })?.response
          ?.status;
        if (status === 404 || status === 401 || status === 403) {
          return false;
        }
        return failureCount < 2;
      },
    },
  });

  const listItemById = useMemo(
    () => listItems.find((v) => v.id === selectedId),
    [listItems, selectedId],
  );
  const detailItem = detailData?.result as MyCosmeticsResponseDTO | undefined;
  const currentItem = detailItem ?? listItemById;

  const searchQuery = currentItem
    ? `${currentItem.brand ?? ''} ${currentItem.name ?? ''}`.trim()
    : '';

  const { data: youtubeData, isLoading: isYoutubeLoading } = useYoutubeReview(
    searchQuery,
    { enabled: searchQuery.length > 0 },
  );

  const captureImageSrcRaw =
    currentItem?.captureUrl?.trim() || currentItem?.imgUrl?.trim() || '';
  const captureImageSrc = captureImageSrcRaw
    ? resolveMediaUrl(captureImageSrcRaw)
    : '/icons/imgplus.svg';

  const viewSubOptions =
    COSMETIC_CATEGORIES.find((c) => c.value === (currentItem?.category ?? ''))
      ?.subCategories ?? [];
  const viewMainCategoryLabel =
    COSMETIC_CATEGORIES.find((c) => c.value === (currentItem?.category ?? ''))
      ?.label ?? '대분류';
  const viewSubCategoryLabel =
    viewSubOptions.find((s) => s.value === (currentItem?.subCategory ?? ''))
      ?.label ?? '소분류';

  useEffect(() => {
    if (!api) {
      return;
    }

    const handleSelect = () => {
      const index = api.selectedScrollSnap();
      const item = listItems[index];
      if (item?.id == null) {
        return;
      }
      setSelectedId(item.id);
      window.history.replaceState(null, '', `/my-cosmetics/${item.id}`);
    };

    api.on('select', handleSelect);
    return () => {
      api.off('select', handleSelect);
    };
  }, [api, listItems]);

  const handleCaptureShare = async () => {
    if (!captureImageSrc || captureImageSrc === '/icons/imgplus.svg') {
      return;
    }

    try {
      if (navigator.share) {
        await navigator.share({
          title: `${currentItem?.name ?? '내 화장품'} 캡처`,
          url: captureImageSrc,
        });
        return;
      }

      await navigator.clipboard.writeText(captureImageSrc);
      alert('이미지 링크가 복사되었습니다.');
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        alert('공유에 실패했습니다.');
      }
    }
  };

  const handleCaptureDownload = async () => {
    if (!captureImageSrc || captureImageSrc === '/icons/imgplus.svg') {
      return;
    }

    try {
      const response = await fetch(captureImageSrc);
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = `my-cosmetic-capture-${currentItem?.id ?? 'image'}.jpg`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(objectUrl);
    } catch {
      window.open(captureImageSrc, '_blank', 'noopener,noreferrer');
    }
  };

  const isPageLoading =
    isListLoading || (!currentItem && (!isDetailFetched || isDetailFetching));

  if (isPageLoading) {
    return (
      <motion.div className="flex min-h-[60vh] items-center justify-center text-sm text-zinc-400">
        화장품 정보를 불러오는 중...
      </motion.div>
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
    <div className="relative flex min-h-0 flex-1 flex-col">
      <div className="sticky top-0 z-40 shrink-0 bg-white pt-[var(--safe-area-top)]">
        <Header
          sticky={false}
          className="border-b border-zinc-100"
          title="제품 상세보기"
          showBack
        />
      </div>

      <div
        className={cn(
          'overflow-anchor-none flex-1 overflow-y-auto px-[20px] pb-36 transition-opacity duration-200',
          isDetailFetching && 'opacity-40',
        )}
      >
        <div className="relative mt-2">
          <Carousel
            key={`carousel-${routeCosmeticId}-${listItems.length}-${initialIndex}`}
            setApi={setApi}
            opts={{
              startIndex: safeInitialIndex,
              align: 'center',
              loop: listItems.length > 2,
            }}
            className="w-full"
          >
            <CarouselContent className="-ml-0">
              {listItems.map((item, index) => (
                <CarouselItem
                  key={item.id}
                  className="basis-full pl-0"
                >
                  <div className="relative mx-auto aspect-square w-full max-w-[280px] overflow-hidden rounded-2xl bg-zinc-100">
                    <WishCardImage
                      officialImage={item.imgUrl ?? ''}
                      captureImage={item.captureUrl ?? ''}
                      productName={item.name ?? ''}
                      fill
                      className="object-contain"
                      priority={index === safeInitialIndex}
                      loading={
                        Math.abs(index - safeInitialIndex) <= 1
                          ? 'eager'
                          : 'lazy'
                      }
                    />
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious
              type="button"
              disabled={listItems.length <= 1}
              className="top-1/2 -left-0 left-1 h-16 w-16 -translate-y-1/2 [&_img]:size-12"
            />
            <CarouselNext
              type="button"
              disabled={listItems.length <= 1}
              className="top-1/2 -right-0 right-1 h-16 w-16 -translate-y-1/2 [&_img]:size-12"
            />
          </Carousel>
        </div>

        <div className="mt-8 space-y-6">
          <DetailFieldRow label="브랜드명">
            <Input
              readOnly
              value={currentItem.brand?.trim() ? currentItem.brand : '-'}
              aria-label="브랜드명"
              className={readonlyFieldClass}
            />
          </DetailFieldRow>

          <DetailFieldRow label="제품명">
            <Input
              readOnly
              value={currentItem.name?.trim() ? currentItem.name : '-'}
              aria-label="제품명"
              className={readonlyFieldClass}
            />
          </DetailFieldRow>

          <div>
            <DetailFieldLabel>분류</DetailFieldLabel>
            <div className="flex items-center gap-3">
              <span className="flex h-8 min-w-0 items-center justify-center rounded-full border border-[var(--brand-pink)] bg-white px-6 text-sm font-bold text-[var(--brand-pink)]">
                {viewMainCategoryLabel}
              </span>
              <span className="flex h-8 min-w-0 items-center justify-center rounded-full bg-[var(--brand-classic)] px-6 text-sm font-bold text-white">
                {viewSubCategoryLabel}
              </span>
            </div>
          </div>

          <DetailFieldRow label="특징">
            <Input
              readOnly
              value={currentItem.feature?.trim() ? currentItem.feature : '-'}
              aria-label="특징"
              className={readonlyFieldClass}
            />
          </DetailFieldRow>

          <div>
            <DetailFieldLabel>메모</DetailFieldLabel>
            <textarea
              readOnly
              value={
                currentItem.memo?.trim()
                  ? currentItem.memo
                  : '메모는 최대 60자까지 입력할 수 있습니다.'
              }
              maxLength={MEMO_MAX_LEN}
              rows={4}
              className={cn(
                'border-mono-gray focus-visible:border-brand-pink w-full resize-none rounded-sm border px-4 py-3 text-sm outline-none focus-visible:ring-0',
                !currentItem.memo?.trim() ? 'text-[var(--mono-dark-gray)]' : '',
                readonlyFieldClass,
              )}
              aria-label="메모"
            />
          </div>

          <div>
            <DetailFieldLabel>원본 사진</DetailFieldLabel>
            <button
              type="button"
              onClick={() => {
                setShowCapture(true);
              }}
              className="relative aspect-square w-28 overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50"
            >
              <Image
                src={captureImageSrc}
                alt=""
                fill
                className="object-cover"
                unoptimized
              />
            </button>
          </div>
        </div>

        <section className="mt-10 border-t border-zinc-100 pt-6">
          <DetailFieldLabel>연관 리뷰 영상</DetailFieldLabel>

          {isYoutubeLoading ? (
            <Carousel
              opts={{
                align: 'start',
                containScroll: 'trimSnaps',
              }}
              className="w-full"
            >
              <CarouselContent className="-ml-4">
                {[1, 2, 3].map((n) => (
                  <CarouselItem key={n} className="basis-[38%] pl-4">
                    <div className="h-40 w-full animate-pulse rounded-xl bg-zinc-100" />
                    <div className="mt-2 h-4 w-3/4 animate-pulse rounded bg-zinc-100" />
                  </CarouselItem>
                ))}
              </CarouselContent>
            </Carousel>
          ) : youtubeData?.items && youtubeData.items.length > 0 ? (
            <Carousel
              opts={{
                align: 'start',
                containScroll: 'trimSnaps',
              }}
              className="w-full"
            >
              <CarouselContent className="-ml-4">
                {youtubeData.items.map((video) => (
                  <CarouselItem
                    key={video.id.videoId}
                    className="basis-[38%] pl-4"
                  >
                    <a
                      href={`https://www.youtube.com/watch?v=${video.id.videoId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group block"
                    >
                      <div className="relative aspect-video w-full overflow-hidden rounded-xl">
                        <Image
                          src={video.snippet.thumbnails.high.url}
                          alt={video.snippet.title}
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      </div>
                      <p className="mt-2 line-clamp-2 text-sm font-semibold text-zinc-900">
                        {video.snippet.title}
                      </p>
                      <p className="text-xs text-zinc-400">
                        {video.snippet.channelTitle}
                      </p>
                    </a>
                  </CarouselItem>
                ))}
              </CarouselContent>
            </Carousel>
          ) : (
            <p className="text-sm text-[var(--mono-dark-gray)]">
              연관 리뷰 영상을 찾을 수 없어요.
            </p>
          )}
        </section>
      </div>

      <AnimatePresence>
        {showCapture ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-5"
          >
            <button
              type="button"
              onClick={() => {
                setShowCapture(false);
              }}
              className="absolute top-6 right-6 z-10 text-white"
            >
              <X size={32} />
            </button>

            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="relative aspect-1/2 w-full max-w-[480px]"
            >
              <Image
                src={captureImageSrc}
                alt="원본 캡처 화면"
                fill
                className="object-contain"
                unoptimized
              />
            </motion.div>

            <div className="absolute bottom-10 flex gap-6">
              <button
                type="button"
                onClick={() => {
                  void handleCaptureShare();
                }}
                className="flex flex-col items-center gap-2 text-white"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-black">
                  <Share2 size={20} />
                </div>
                <span className="text-xs">공유하기</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  void handleCaptureDownload();
                }}
                className="flex flex-col items-center gap-2 text-white"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-black">
                  <Download size={20} />
                </div>
                <span className="text-xs">저장하기</span>
              </button>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function DetailFieldLabel({ children }: { children: ReactNode }) {
  return (
    <div className="text-mono-dark-gray mb-2 text-sm font-semibold">
      {children}
    </div>
  );
}

function DetailFieldRow({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div>
      <DetailFieldLabel>{label}</DetailFieldLabel>
      {children}
    </div>
  );
}
