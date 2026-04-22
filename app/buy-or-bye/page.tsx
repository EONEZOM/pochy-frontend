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

export default function BuyOrByePage() {
  const [images, setImages] = useState<string[]>([])
  const [currentIndex, setCurrentIndex] = useState(-1)
  const [results, setResults] = useState<{ buy: string[]; bye: string[] }>({
    buy: [],
    bye: [],
  })

  const bgX = useMotionValue(0)

  const buyWidth = useTransform(bgX, [-200, 0, 200], ['100%', '50%', '0%'])
  const byeWidth = useTransform(bgX, [-200, 0, 200], ['0%', '50%', '100%'])
  const buyTextOpacity = useTransform(bgX, [-100, 0, 100], [1, 0.5, 0])
  const byeTextOpacity = useTransform(bgX, [-100, 0, 100], [0, 0.5, 1])

  const handleSwipe = (direction: 'left' | 'right') => {
    const targetImage = images[currentIndex]
    const isBuy = direction === 'left'

    setResults((prev) => ({
      buy: isBuy ? [targetImage, ...prev.buy] : prev.buy,
      bye: !isBuy ? [targetImage, ...prev.bye] : prev.bye,
    }))

    animate(bgX, 0, { duration: 0.4, ease: 'easeOut' })

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

            {currentIndex < 0 && (
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
          </AnimatePresence>
        </div>
        <div className="text-white">원하는 곳으로 스와이프 하세요</div>
      </div>
    </div>
  )
}
