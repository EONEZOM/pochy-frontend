'use client'

import { useState } from 'react'
import {
  motion,
  AnimatePresence,
  useMotionValue,
  useTransform,
} from 'framer-motion'
import { useMutation } from '@tanstack/react-query'

const convertToBase64 = async (url: string): Promise<string> => {
  const response = await fetch(url)
  const blob = await response.blob()
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(reader.result as string)
    reader.readAsDataURL(blob)
  })
}

function SwipeCard({
  src,
  onSwipe,
}: {
  src: string
  onSwipe: (dir: 'left' | 'right') => void
}) {
  const x = useMotionValue(0)
  const rotate = useTransform(x, [-100, 0, 100], [-10, 0, 10])
  const opacity = useTransform(x, [-150, -100, 0, 100, 150], [0, 1, 1, 1, 0])

  return (
    <motion.div
      style={{ x, rotate, opacity }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      onDragEnd={(_, info) => {
        if (info.offset.x < -100) onSwipe('left')
        else if (info.offset.x > 100) onSwipe('right')
      }}
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{
        x: x.get() < 0 ? -500 : 500,
        opacity: 0,
        transition: { duration: 0.3 },
      }}
      className="absolute inset-0 cursor-grab overflow-hidden rounded-[40px] border-4 border-zinc-800 bg-zinc-900 shadow-2xl select-none active:cursor-grabbing"
    >
      <img
        src={src}
        alt="Product"
        draggable="false"
        className="pointer-events-none h-full w-full object-cover"
      />
      <div className="pointer-events-none absolute top-5 left-5 rounded-full bg-green-500 px-3 py-1 text-xs font-black text-black">
        BUY (←)
      </div>
      <div className="pointer-events-none absolute top-5 right-5 rounded-full bg-red-500 px-3 py-1 text-xs font-black text-white">
        BYE (→)
      </div>
    </motion.div>
  )
}

export default function BuyOrByePage() {
  const [images, setImages] = useState<string[]>([])
  const [currentIndex, setCurrentIndex] = useState(-1)
  const [results, setResults] = useState<{ buy: string[]; bye: string[] }>({
    buy: [],
    bye: [],
  })
  const [analysisData, setAnalysisData] = useState<any>(null)

  const {
    mutate: analyzeImages,
    isPending,
    error: apiError,
  } = useMutation({
    mutationFn: async (buyList: string[]) => {
      const base64Images = await Promise.all(buyList.map(convertToBase64))
      const res = await fetch('/api/vision/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ images: base64Images }),
      })
      if (!res.ok) throw new Error('API 분석에 실패했습니다.')
      return res.json()
    },
    onSuccess: (data) => setAnalysisData(data),
  })

  const handleSwipe = (direction: 'left' | 'right') => {
    const targetImage = images[currentIndex]
    const isBuy = direction === 'left'

    // 결과 상태 업데이트
    setResults((prev) => ({
      buy: isBuy ? [targetImage, ...prev.buy] : prev.buy,
      bye: !isBuy ? [targetImage, ...prev.bye] : prev.bye,
    }))

    // 마지막 카드였을 경우 분석 실행
    if (currentIndex === 0) {
      const finalBuyList = isBuy ? [targetImage, ...results.buy] : results.buy
      if (finalBuyList.length > 0) analyzeImages(finalBuyList)
    }

    setCurrentIndex((prev) => prev - 1)
  }

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    const urls = files.map((file) => URL.createObjectURL(file))
    setImages(urls)
    setCurrentIndex(urls.length - 1)
    setResults({ buy: [], bye: [] })
    setAnalysisData(null)
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-120 flex-col items-center px-5 py-10">
      <h2 className="mb-8 text-2xl font-black text-green-500 italic">
        BUY OR BYE
      </h2>

      <div className="relative mb-12 aspect-[3/4] w-full max-w-80">
        <AnimatePresence mode="popLayout">
          {currentIndex >= 0 ? (
            <SwipeCard
              key={currentIndex}
              src={images[currentIndex]}
              onSwipe={handleSwipe}
            />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center rounded-[40px] border-2 border-dashed border-zinc-800 bg-zinc-900/50 p-6 text-center">
              {isPending ? (
                <div className="space-y-3">
                  <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-green-500 border-t-transparent" />
                  <p className="font-bold text-green-500">
                    GPT가 제품을 분석하고 있습니다...
                  </p>
                </div>
              ) : apiError ? (
                <p className="text-red-500">
                  에러 발생: {(apiError as Error).message}
                </p>
              ) : (
                <label className="cursor-pointer space-y-2">
                  <p className="text-sm font-bold text-zinc-500">
                    분류할 이미지가 없습니다.
                  </p>
                  <p className="text-xs text-zinc-600">클릭하여 새로 업로드</p>
                  <input
                    type="file"
                    multiple
                    className="hidden"
                    onChange={handleUpload}
                  />
                </label>
              )}
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* 분석 결과 데이터 출력 */}
      {analysisData && (
        <div className="mb-8 w-full space-y-4">
          <h3 className="text-lg font-bold text-white">✨ 분석 결과</h3>
          <div className="max-h-60 overflow-auto rounded-2xl border border-zinc-800 bg-zinc-900 p-4 font-mono text-[10px] text-green-400 shadow-xl">
            <pre>{JSON.stringify(analysisData, null, 2)}</pre>
          </div>
        </div>
      )}

      {/* 하단 리스트 UI */}
      <div className="grid w-full grid-cols-2 gap-4">
        <ResultSection
          title="💰 BUY LIST"
          items={results.buy}
          color="text-green-500"
        />
        <ResultSection
          title="👋 BYE LIST"
          items={results.bye}
          color="text-red-500"
        />
      </div>
    </div>
  )
}

function ResultSection({
  title,
  items,
  color,
}: {
  title: string
  items: string[]
  color: string
}) {
  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4">
      <h3 className={`mb-3 text-center text-xs font-black ${color}`}>
        {title}
      </h3>
      <div className="flex flex-wrap gap-2">
        {items.map((src, i) => (
          <img
            key={i}
            src={src}
            className="h-14 w-10 rounded-md object-cover opacity-80"
            alt="Result"
          />
        ))}
      </div>
    </section>
  )
}
