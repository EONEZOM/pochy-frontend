'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { Share2, Download, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useYoutubeReview } from '@/hooks/queries/useYoutubeReview';
import { Header } from '@/components/layout/Header';
import {
  useReadWishCosmeticsDetail,
  useReadWishCosmeticsList,
} from '@/api/generated/wish-cosmetics/wish-cosmetics';
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
  const router = useRouter();
  const [showCapture, setShowCapture] = useState(false);
  const [api, setApi] = useState<CarouselApi>();
  const wishId = Number(params.id);
  const isValidWishId = Number.isFinite(wishId) && wishId > 0;

  const { data: listData, isLoading: isListLoading } = useReadWishCosmeticsList({
    size: 100,
    sort: 'desc',
  });
  const wishItems = useMemo(() => listData?.result?.content ?? [], [listData]);

  const initialIndex = wishItems.findIndex(
    (v) => String(v.wishCosmeticsId) === String(wishId),
  );
  const [currentIndex, setCurrentIndex] = useState(
    initialIndex !== -1 ? initialIndex : 0,
  );

  useEffect(() => {
    if (initialIndex !== -1) {
      setCurrentIndex(initialIndex);
    }
  }, [initialIndex]);

  const currentListItem = wishItems[currentIndex];
  const currentWishId = currentListItem?.wishCosmeticsId ?? wishId;
  const { data: detailData, isLoading: isDetailLoading } =
    useReadWishCosmeticsDetail(currentWishId, {
      query: { enabled: !!currentWishId && isValidWishId },
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

    api.on('select', () => {
      const index = api.selectedScrollSnap();
      setCurrentIndex(index);
      const selectedId = wishItems[index]?.wishCosmeticsId;
      if (!selectedId) return;
      router.replace(`/wish/${selectedId}`, { scroll: false });
    });
  }, [api, wishItems, router]);

  if (isListLoading || isDetailLoading) {
    return (
      <div className="flex items-center justify-center">
        위시 상세를 불러오는 중...
      </div>
    );
  }

  if (!currentItem)
    return (
      <div className="flex items-center justify-center">아이템이 없습니다.</div>
    );

  return (
    <div className="relative max-w-120 py-5">
      <Header
        className="-mt-5 mb-5"
        title="상세 보기"
        rightIcons={[{ kind: 'share', onClick: handleShare }]}
      />

      <div className="">
        <div className="text-center">
          <p className="text-sm font-medium text-zinc-500">{currentItem.brand}</p>
          <h2 className="text-xl font-bold">{currentItem.productName}</h2>
        </div>

        <div className="relative mt-4">
          <Carousel
            setApi={setApi}
            opts={{
              startIndex: initialIndex,
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
                      <Image
                        src={item.productImageUrl ?? '/icons/imgplus.svg'}
                        alt={item.productName ?? ''}
                        fill
                        className="object-cover"
                      />
                    </div>
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
          </Carousel>
        </div>

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
                : youtubeData?.items?.map((video: any) => (
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
