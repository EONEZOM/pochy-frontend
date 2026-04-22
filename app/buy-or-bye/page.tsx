'use client'

import { useState } from 'react'
import {
  motion,
  AnimatePresence,
  useMotionValue,
  useTransform,
  animate,
} from 'framer-motion'
import SwipeCard from '@/components/buy-or-bye/SwipeCard'
import { useAnalyzeCosmeticCapture } from '@/hooks/mutation/useAnalyzeCosmeticCapture'

export default function BuyOrByePage() {
  const [images, setImages] = useState<string[]>([])
  const [currentIndex, setCurrentIndex] = useState(-1)
  const [results, setResults] = useState<{ buy: string[]; bye: string[] }>({
    buy: [],
    bye: [],
  })
  const [analysisResults, setAnalysisResults] = useState<any[] | null>(null)

  const {
    mutate: analyze,
    isPending,
    error: apiError,
  } = useAnalyzeCosmeticCapture()

  const bgX = useMotionValue(0)

  const buyWidth = useTransform(bgX, [-200, 0, 200], ['100%', '50%', '0%'])
  const byeWidth = useTransform(bgX, [-200, 0, 200], ['0%', '50%', '100%'])
  const buyTextOpacity = useTransform(bgX, [-100, 0, 100], [1, 0.5, 0])
  const byeTextOpacity = useTransform(bgX, [-100, 0, 100], [0, 0.5, 1])

  const handleSwipe = (direction: 'left' | 'right') => {
    const targetImage = images[currentIndex]
    const isBuy = direction === 'left'

    const nextBuyList = isBuy ? [targetImage, ...results.buy] : results.buy

    setResults((prev) => ({
      buy: nextBuyList,
      bye: !isBuy ? [targetImage, ...prev.bye] : prev.bye,
    }))

    animate(bgX, 0, { duration: 0.4, ease: 'easeOut' })

    if (currentIndex === 0) {
      if (nextBuyList.length > 0) {
        analyze(nextBuyList, {
          onSuccess: (data) => {
            setAnalysisResults(data.results)
            console.log('분석 완료 (토큰 정보는 서버 터미널 확인):', data.usage)
          },
        })
      } else {
        // BUY한 이미지가 하나도 없을 경우
        alert('분석할 화장품이 선택되지 않았습니다.')
      }
    }

    setCurrentIndex((prev) => prev - 1)
  }

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    const urls = files.map((file) => URL.createObjectURL(file))
    setImages(urls)
    setCurrentIndex(urls.length - 1)
    setResults({ buy: [], bye: [] })
    bgX.set(0)
  }

  return (
    <div className="relative flex h-screen w-full flex-col items-center justify-center overflow-hidden">
      {/* 배경 레이어 */}
      <div className="absolute inset-0 flex h-full w-full overflow-hidden">
        {/* BUY 영역 */}
        <motion.div
          style={{ width: buyWidth }}
          className="relative flex h-full flex-col items-center justify-start bg-indigo-400 pt-5"
        >
          <motion.span
            style={{ opacity: buyTextOpacity }}
            className="text-6xl text-white"
          >
            BUY
          </motion.span>
        </motion.div>

        {/* BYE 영역 */}
        <motion.div
          style={{ width: byeWidth }}
          className="relative flex h-full flex-col items-center justify-start bg-rose-300 pt-5"
        >
          <motion.span
            style={{ opacity: byeTextOpacity }}
            className="text-6xl text-white"
          >
            BYE
          </motion.span>
        </motion.div>
      </div>

      {/* 중앙 컨텐츠 영역 */}
      <div className="relative z-10 flex h-full w-full flex-col items-center justify-center gap-4">
        <div className="relative h-[60%] w-[70%]">
          <AnimatePresence mode="popLayout">
            {images.map((src, index) => {
              if (index > currentIndex || index < currentIndex - 1) return null
              const isTop = index === currentIndex

              return (
                <SwipeCard
                  key={src}
                  src={src}
                  onSwipe={handleSwipe}
                  setBgX={(val) => bgX.set(val)}
                  isTop={isTop}
                />
              )
            })}

            {/* 분석 중 로딩 상태 */}
            {currentIndex < 0 && isPending && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex h-full w-full flex-col items-center justify-center rounded-2xl border border-white/20 bg-black/20 backdrop-blur-lg"
              >
                <div className="h-12 w-12 animate-spin rounded-full border-4 border-white/30 border-t-white" />
                <p className="mt-4 font-bold text-white">화장품 식별 중...</p>
              </motion.div>
            )}

            {currentIndex < 0 && !isPending && !analysisResults && (
              <motion.label
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex h-full w-full cursor-pointer items-center justify-center rounded-2xl bg-white shadow-xl"
              >
                <div className="font-bold">클릭하여 파일을 업로드해 주세요</div>
                <input
                  type="file"
                  multiple
                  className="hidden"
                  onChange={handleUpload}
                />
              </motion.label>
            )}

            {/* 분석 결과 뷰 (임시 리스트) 나중에 제거*/}
            {analysisResults && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex h-full w-full flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
              >
                <div className="bg-zinc-900 p-4 text-center">
                  <h3 className="font-bold text-white">
                    분석된 화장품 ({analysisResults.length})
                  </h3>
                </div>
                <div className="flex-1 space-y-4 overflow-y-auto p-4">
                  {analysisResults.length === 0 ? (
                    <p className="py-10 text-center text-zinc-400">
                      식별된 화장품이 없습니다.
                    </p>
                  ) : (
                    analysisResults.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-3 border-b border-zinc-100 pb-3 last:border-0"
                      >
                        <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg bg-zinc-100">
                          <img
                            src={item.image_url}
                            alt={item.product_name}
                            className="h-full w-full object-cover"
                          />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-indigo-500">
                            {item.brand_name}
                          </p>
                          <p className="truncate text-sm font-bold text-zinc-900">
                            {item.product_name}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                <button
                  onClick={() => {
                    setImages([])
                    setAnalysisResults(null)
                    setCurrentIndex(-1)
                  }}
                  className="bg-zinc-100 p-4 text-sm font-bold text-zinc-600 hover:bg-zinc-200"
                >
                  새로 시작하기
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        {!analysisResults && (
          <div className="mt-5 text-sm font-bold text-white/80 drop-shadow-md">
            원하는 곳으로 스와이프 하세요
          </div>
        )}
      </div>
    </div>
  )
}
