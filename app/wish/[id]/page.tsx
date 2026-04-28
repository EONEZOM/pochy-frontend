'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { Share2, Download, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWishlistStore } from '@/store/wishlistStore';
import { useYoutubeReview } from '@/hooks/queries/useYoutubeReview';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from '@/components/ui/carousel';
import { getCategoryLabels } from '@/utils/category';

export default function WishlistDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [showCapture, setShowCapture] = useState(false);
  const [api, setApi] = useState<CarouselApi>();

  // 현재 임시로 Store에서 가져옴
  const wishItems = useWishlistStore((state) => state.items);

  // 초기 인덱스 설정 (URL의 id와 일치하는 아이템 찾기)
  const initialIndex = wishItems.findIndex(
    (v) => String(v.id) === String(params.id),
  );
  const [currentIndex, setCurrentIndex] = useState(
    initialIndex !== -1 ? initialIndex : 0,
  );

  // 현재 선택된 아이템 정보
  const currentItem = wishItems[currentIndex];
  const categoryLabels = useMemo(
    () =>
      getCategoryLabels(currentItem?.main_category, currentItem?.sub_category),
    [currentItem],
  );
  const searchQuery = currentItem
    ? `${currentItem.brand_name} ${currentItem.product_name}`
    : '';
  const { data: youtubeData, isLoading: isYoutubeLoading } =
    useYoutubeReview(searchQuery);

  // 캐러셀 움직임 감지하여 상태 업데이트
  useEffect(() => {
    if (!api) return;

    api.on('select', () => {
      const index = api.selectedScrollSnap();
      setCurrentIndex(index);
      router.replace(`/wish/${wishItems[index].id}`, { scroll: false });
    });
  }, [api, wishItems, router]);

  if (!currentItem)
    return (
      <div className="flex h-screen items-center justify-center">
        아이템이 없습니다.
      </div>
    );

  return (
    <div className="relative min-h-screen max-w-120 py-5">
      <div className="">
        {/* 제품 정보 헤더 */}
        <div className="text-center">
          <p className="text-sm font-medium text-zinc-500">
            {currentItem.brand_name}
          </p>
          <h2 className="text-xl font-bold">{currentItem.product_name}</h2>
        </div>

        {/* 상품 이미지 영역 (Carousel UI?) */}
        <div className="relative mt-4">
          <Carousel
            setApi={setApi}
            opts={{
              startIndex: initialIndex,
              align: 'center', // 센터 정렬
              loop: true, // 무한 루프
            }}
            className="w-full"
          >
            <CarouselContent>
              {wishItems.map((item, index) => (
                <CarouselItem key={item.id} className="basis-[50%] py-5">
                  <div
                    className={`relative aspect-2/3 w-full rounded-3xl bg-white shadow transition-all duration-500 ${
                      currentIndex === index
                        ? 'scale-100 opacity-100'
                        : 'opacity-60'
                    }`}
                  >
                    <div className="absolute inset-0 overflow-hidden rounded-3xl">
                      <Image
                        src={item.official_image}
                        alt={item.product_name}
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

        {/* 상세 정보 테이블 */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentItem.id} // ID가 바뀔 때마다 애니메이션 실행
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="space-y-4"
          >
            <DetailRow label="대분류" value={categoryLabels.main} />
            <DetailRow label="소분류" value={categoryLabels.sub} />
            <DetailRow label="특징" value={currentItem.features} />
            <DetailRow label="가격" value={currentItem.price} />
            <DetailRow label="메모" value={currentItem.memo || '-'} />
          </motion.div>
        </AnimatePresence>

        {/* 캡처 화면 보기 버튼 */}
        <div className="mt-8 flex justify-center">
          <button
            onClick={() => setShowCapture(true)}
            className="text-sm font-bold text-zinc-900 underline underline-offset-4"
          >
            내가 전에 캡처 했던 화면 보기
          </button>
        </div>

        {/* 제품 연관 리뷰 영상 불러오는 영역 */}
        <section className="mt-12">
          <h3 className="mb-4 text-lg font-bold text-zinc-900">
            연관 리뷰 영상
          </h3>

          {isYoutubeLoading ? (
            <div className="flex gap-4 overflow-x-auto">
              {[1, 2, 3].map((n) => (
                <div
                  key={n}
                  className="h-40 w-64 shrink-0 animate-pulse rounded-xl bg-zinc-100"
                />
              ))}
            </div>
          ) : (
            <div className="scrollbar-hide flex gap-4 overflow-x-auto pb-4">
              {youtubeData?.items?.map((video: any) => (
                <a
                  key={video.id.videoId}
                  href={`https://www.youtube.com/watch?v=${video.id.videoId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-64 shrink-0 transition-transform active:scale-95"
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
              ))}
            </div>
          )}
        </section>
      </div>

      {/* 캡처 원본 보기 모달 (Framer Motion) */}
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
              className="relative aspect-1/2 w-full"
            >
              <Image
                src={currentItem.image_url} // 실제 구현 시에는 별도의 원본 full-size URL 연결?
                alt="원본 캡처 화면"
                fill
                className="object-contain"
              />
            </motion.div>

            <div className="absolute bottom-10 flex gap-6">
              <button className="flex flex-col items-center gap-2 text-white">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-black">
                  <Share2 size={20} />
                </div>
                <span className="text-xs">공유하기</span>
              </button>
              <button className="flex flex-col items-center gap-2 text-white">
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

// 상세 정보 행 컴포넌트
function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col items-center text-center">
      <span className="font-bold">{label}</span>
      <span>{value}</span>
    </div>
  );
}
