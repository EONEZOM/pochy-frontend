'use client';

import { useParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { WishCardImage } from '@/components/wishlist/WishCardImage';
import { Share2, Download, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useYoutubeReview } from '@/hooks/queries/useYoutubeReview';
import { Header } from '@/components/layout/Header';
import {
  useReadWishCosmeticsDetail,
  useReadWishCosmeticsList,
} from '@/api/generated/wish-cosmetics/wish-cosmetics';
import { keepPreviousData } from '@tanstack/react-query';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from '@/components/ui/carousel';
import { getCategoryLabels } from '@/utils/category';
import { cn } from '@/lib/utils';

export default function WishlistDetailPage() {
  const params = useParams();
  const [showCapture, setShowCapture] = useState(false);
  const [api, setApi] = useState<CarouselApi>();
  const wishId = Number(params.id);
  const isValidWishId = Number.isFinite(wishId) && wishId > 0;
  const [selectedWishId, setSelectedWishId] = useState(wishId);

  const { data: listData, isLoading: isListLoading } = useReadWishCosmeticsList({
    size: 100,
    sort: 'desc',
  });
  const wishItems = useMemo(() => listData?.result?.content ?? [], [listData]);

  const initialIndex = wishItems.findIndex(
    (v) => String(v.wishCosmeticsId) === String(wishId),
  );
  const safeInitialIndex = initialIndex >= 0 ? initialIndex : 0;
  const [currentIndex, setCurrentIndex] = useState(
    safeInitialIndex,
  );

  useEffect(() => {
    if (initialIndex !== -1) {
      setCurrentIndex(initialIndex);
    }
  }, [initialIndex]);

  useEffect(() => {
    setSelectedWishId(wishId);
  }, [wishId]);

  const { data: detailData, isFetching: isDetailFetching } =
    useReadWishCosmeticsDetail(selectedWishId, {
      query: {
        enabled: !!selectedWishId && isValidWishId,
        // 슬라이드 전환 시 이전 데이터를 유지해 전체 로딩 화면을 방지합니다.
        placeholderData: keepPreviousData,
      },
    });
  const currentItem = detailData?.result;

  const categoryLabels = useMemo(
    () => getCategoryLabels(currentItem?.category, currentItem?.subCategory),
    [currentItem],
  );
  const searchQuery = currentItem
    ? `${currentItem.brand} ${currentItem.productName}`
    : '';
  const { data: youtubeData, isLoading: isYoutubeLoading } =
    useYoutubeReview(searchQuery);
  const currentCaptureImageSrc =
    currentItem?.captureImageUrl ??
    currentItem?.productImageUrl ??
    '/icons/imgplus.svg';

  const handleShare = async () => {
    const shareUrl =
      typeof window !== 'undefined' ? window.location.href : `/wish/${params.id}`;

    try {
      if (navigator.share) {
        await navigator.share({
          title: currentItem?.productName ?? '위시리스트',
          text: currentItem?.brand ?? '',
          url: shareUrl,
        });
        return;
      }

      await navigator.clipboard.writeText(shareUrl);
      alert('링크가 복사되었습니다.');
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        alert('공유 링크를 복사하지 못했습니다.');
      }
    }
  };

  const handleCaptureShare = async () => {
    if (!currentCaptureImageSrc) return;

    try {
      if (navigator.share) {
        await navigator.share({
          title: `${currentItem?.productName ?? '위시템'} 캡처`,
          url: currentCaptureImageSrc,
        });
        return;
      }

      await navigator.clipboard.writeText(currentCaptureImageSrc);
      alert('이미지 링크가 복사되었습니다.');
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        alert('공유에 실패했습니다.');
      }
    }
  };

  const handleCaptureDownload = async () => {
    if (!currentCaptureImageSrc) return;

    try {
      const response = await fetch(currentCaptureImageSrc);
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = `wish-capture-${currentItem?.wishCosmeticsId ?? 'image'}.jpg`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(objectUrl);
    } catch {
      window.open(currentCaptureImageSrc, '_blank', 'noopener,noreferrer');
    }
  };

  useEffect(() => {
    if (!api) return;

    const handleSelect = () => {
      const index = api.selectedScrollSnap();
      setCurrentIndex(index);
      const selectedId = wishItems[index]?.wishCosmeticsId;
      if (!selectedId) return;
      setSelectedWishId(selectedId);
      // router.replace 대신 History API를 직접 사용합니다.
      // router.replace는 [id] 동적 라우트 전환 시 페이지를 remount시켜 깜빡임이 발생합니다.
      window.history.replaceState(null, '', `/wish/${selectedId}`);
    };

    api.on('select', handleSelect);

    return () => {
      api.off('select', handleSelect);
    };
  }, [api, wishItems]);

  // 목록 최초 로드 또는 데이터가 아직 없을 때만 전체 화면 블로킹
  if (isListLoading || !currentItem) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-sm text-zinc-400">
        위시 상세를 불러오는 중...
      </div>
    );
  }

  return (
    <div className="relative max-w-120 py-5">
      <Header
        className="-mt-5 mb-5"
        title="상세 보기"
        rightIcons={[{ kind: 'share', onClick: handleShare }]}
      />

      <div className="">
        <div className={cn('text-center transition-opacity duration-200', isDetailFetching && 'opacity-40')}>
          <p className="text-sm font-medium text-zinc-500">{currentItem.brand}</p>
          <h2 className="text-xl font-bold">{currentItem.productName}</h2>
        </div>

        <div className="relative mt-4">
          <Carousel
            setApi={setApi}
            opts={{
              startIndex: safeInitialIndex,
              align: 'center',
              loop: wishItems.length > 2,
              containScroll: false,
            }}
            className="w-full"
          >
            <CarouselContent>
              {wishItems.map((item, index) => (
                <CarouselItem
                  key={item.wishCosmeticsId}
                  className={cn('py-5 transition-all', 'basis-[50%]')}
                >
                  <div
                    className={cn(
                      'relative aspect-2/3 w-full rounded-3xl bg-white shadow transition-all duration-500',
                      currentIndex === index
                        ? 'scale-100 opacity-100'
                        : 'scale-90 opacity-40',
                    )}
                  >
                    <div className="absolute inset-0 overflow-hidden rounded-3xl">
                      <WishCardImage
                        officialImage={item.productImageUrl ?? ''}
                        captureImage={item.captureImageUrl ?? ''}
                        productName={item.productName ?? ''}
                        fill
                      />
                    </div>
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
          </Carousel>
        </div>

        <div className={cn('transition-opacity duration-200', isDetailFetching && 'opacity-40')}>
          <AnimatePresence mode="wait">
            <motion.div
              key={currentItem.wishCosmeticsId}
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
              <DetailRow label="가격" value={String(currentItem.price ?? '-')} />
              <DetailRow label="메모" value={currentItem.memo || '-'} />
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="mt-8 flex justify-center">
          <button
            onClick={() => setShowCapture(true)}
            className="text-sm font-bold text-zinc-900 underline underline-offset-4"
          >
            내가 전에 캡처 했던 화면 보기
          </button>
        </div>

        <section className="mt-12 px-5">
          <h3 className="mb-4 px-1 text-lg font-bold text-zinc-900">
            연관 리뷰 영상
          </h3>

          <Carousel
            opts={{
              align: 'start',
              containScroll: 'trimSnaps',
            }}
            className="w-full"
          >
            <CarouselContent className="-ml-4">
              {isYoutubeLoading
                ? [1, 2, 3].map((n) => (
                    <CarouselItem key={n} className="basis-[38%] pl-4">
                      <div className="h-40 w-full animate-pulse rounded-xl bg-zinc-100" />
                      <div className="mt-2 h-4 w-3/4 animate-pulse rounded bg-zinc-100" />
                    </CarouselItem>
                  ))
                : youtubeData?.items?.map((video) => (
                    <CarouselItem
                      key={video.id.videoId}
                      className="basis-[38%] pl-4"
                    >
                      <a
                        href={`https://www.youtube.com/watch?v=${video.id.videoId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group block transition-transform active:scale-95"
                      >
                        <div className="relative aspect-video w-full overflow-hidden rounded-xl">
                          <Image
                            src={video.snippet.thumbnails.high.url}
                            alt={video.snippet.title}
                            fill
                            className="object-cover"
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
        </section>
      </div>

      <AnimatePresence>
        {showCapture && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-5"
          >
            <button
              onClick={() => setShowCapture(false)}
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
                src={currentCaptureImageSrc}
                alt="원본 캡처 화면"
                fill
                className="object-contain"
              />
            </motion.div>

            <div className="absolute bottom-10 flex gap-6">
              <button
                type="button"
                onClick={() => void handleCaptureShare()}
                className="flex flex-col items-center gap-2 text-white"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-black">
                  <Share2 size={20} />
                </div>
                <span className="text-xs">공유하기</span>
              </button>
              <button
                type="button"
                onClick={() => void handleCaptureDownload()}
                className="flex flex-col items-center gap-2 text-white"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-black">
                  <Download size={20} />
                </div>
                <span className="text-xs">저장하기</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
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
