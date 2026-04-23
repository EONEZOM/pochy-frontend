'use client'

import { useParams } from 'next/navigation'
import { useState } from 'react'
import Image from 'next/image'
import { Share2, Download, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useWishlistStore } from '@/store/wishlistStore'
import { useYoutubeReview } from '@/hooks/queries/useYoutubeReview'

export default function WishlistDetailPage() {
  const params = useParams()
  const [showCapture, setShowCapture] = useState(false)

  const wishItems = useWishlistStore((state) => state.items)

  const item = wishItems.find((v) => String(v.id) === String(params.id))

  const searchQuery = item ? `${item.brand_name} ${item.product_name}` : ''
  const { data, isLoading } = useYoutubeReview(searchQuery)

  if (!item) {
    return (
      <div className="flex h-screen items-center justify-center">
        아이템을 찾을 수 없습니다.
      </div>
    )
  }

  return (
    <div className="relative min-h-screen p-5">
      <div className="">
        {/* 제품 정보 헤더 */}
        <div className="text-center">
          <h2 className="text-xl font-bold">{item.product_name}</h2>
          <p className="mt-2 text-sm font-medium text-zinc-500">
            {item.brand_name}
          </p>
        </div>

        {/* 상품 이미지 영역 (Carousel UI?) */}
        <div className="relative mt-4 flex w-full items-center justify-center px-20">
          <div className="relative aspect-2/3 w-full overflow-hidden rounded-2xl bg-zinc-100 shadow-inner">
            <Image
              src={item.official_image}
              alt={item.product_name}
              fill
              className="object-cover"
            />
          </div>
        </div>

        {/* 인디케이터 (캐러셀 적용시 연동) */}
        <div className="mt-4 flex justify-center gap-2">
          <div className="h-2 w-2 rounded-full bg-zinc-200" />
          <div className="h-2 w-2 rounded-full bg-zinc-400" />
          <div className="h-2 w-2 rounded-full bg-zinc-200" />
        </div>

        {/* 상세 정보 테이블 */}
        <div className="mt-8 space-y-4 text-center">
          <DetailRow label="가격" value="네이버 쇼핑 연동 예정" isPlaceholder />
          <DetailRow label="특징" value={item.product_details} />
          <DetailRow label="분류" value={item.category} />
          <DetailRow label="메모" value={item.user_memo || '-'} />
        </div>

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

          {isLoading ? (
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
              {data?.items?.map((video: any) => (
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
                src={item.image_url} // 실제 구현 시에는 별도의 원본 full-size URL 연결?
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
  )
}

// 상세 정보 행 컴포넌트
function DetailRow({
  label,
  value,
  isPlaceholder = false,
}: {
  label: string
  value: string
  isPlaceholder?: boolean
}) {
  return (
    <div className="flex items-start">
      <span className="w-16 shrink-0 font-bold">{label}</span>
      <span
        className={`flex-1 font-medium ${isPlaceholder ? 'text-zinc-400' : 'text-zinc-700'}`}
      >
        {value}
      </span>
    </div>
  )
}
