'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  extractImageFileData,
  revokeImagePreviewUrls,
} from '@/utils/image-utils'
import { useAnalyzeCosmeticCapture } from '@/hooks/mutation/useAnalyzeCosmeticCapture'
import { useWishlistStore } from '@/store/wishlistStore'
import { X, Upload, Check } from 'lucide-react'
import Image from 'next/image'
import { ImageFileData } from '@/types/image'
import RegisterReviewStep from '@/components/wishlist/RegisterReviewStep'

export default function WishlistRegisterPage() {
  const router = useRouter()
  const [images, setImages] = useState<ImageFileData[]>([])
  const [analysisResults, setAnalysisResults] = useState<any[]>([])
  const [isReviewStep, setIsReviewStep] = useState(false)

  const addItem = useWishlistStore((state) => state.addItem)
  const { mutate: analyze, isPending } = useAnalyzeCosmeticCapture()

  // 1. 이미지 업로드 핸들러
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const data = extractImageFileData(e.target.files)
    setImages((prev) => [...prev, ...data])
  }

  // 2. 이미지 개별 삭제
  const removeImage = (index: number) => {
    const target = images[index]
    URL.revokeObjectURL(target.previewUrl)
    setImages(images.filter((_, i) => i !== index))
  }

  // 3. 분석 시작 (GPT 호출)
  const startAnalysis = () => {
    if (images.length === 0) return alert('이미지를 선택해주세요.')

    const imageUrls = images.map((img) => img.previewUrl)
    analyze(imageUrls, {
      onSuccess: (data) => {
        setAnalysisResults(data.results)
        setIsReviewStep(true)
      },
      onError: (err) => alert('분석 중 오류 발생: ' + err.message),
    })
  }

  // 4. 최종 저장 (Zustand 스토어에 추가)
  const handleSave = () => {
    analysisResults.forEach((item) => {
      addItem({
        ...item,
        id: Date.now() + Math.random(),
        user_memo: '',
      })
    })
    alert('위시리스트에 등록되었습니다.')
    router.push('/wishlist')
  }

  if (isReviewStep) {
    return (
      <RegisterReviewStep
        results={analysisResults}
        setResults={setAnalysisResults}
        onSave={handleSave}
        onCancel={() => {
          if (confirm('수정 중인 내용이 사라집니다. 취소하시겠습니까?')) {
            setIsReviewStep(false)
          }
        }}
      />
    )
  }

  return (
    <div className="flex min-h-screen flex-col bg-white p-5">
      <header className="flex items-center justify-between py-4">
        <h1 className="text-xl font-bold">위시템 등록</h1>
        <button onClick={() => router.back()} className="text-zinc-400">
          <X />
        </button>
      </header>

      {/* 이미지 업로드 영역 */}
      <div className="mt-6 flex-1">
        <label className="flex aspect-video w-full cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-zinc-200 bg-zinc-50 hover:bg-zinc-100">
          <Upload className="text-zinc-400" />
          <span className="mt-2 text-sm font-medium text-zinc-500">
            캡처 이미지 추가하기
          </span>
          <input
            type="file"
            multiple
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
        </label>

        {/* 프리뷰 리스트 */}
        <div className="mt-6 grid grid-cols-3 gap-3">
          {images.map((img, idx) => (
            <div
              key={idx}
              className="relative aspect-square overflow-hidden rounded-lg bg-zinc-100"
            >
              <Image
                src={img.previewUrl}
                alt="preview"
                fill
                className="object-cover"
              />
              <button
                onClick={() => removeImage(idx)}
                className="absolute top-1 right-1 rounded-full bg-black/50 p-1 text-white"
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={startAnalysis}
        disabled={isPending || images.length === 0}
        className="mt-10 w-full rounded-2xl bg-zinc-900 py-4 font-bold text-white disabled:bg-zinc-200"
      >
        {isPending ? 'AI 분석 중...' : `${images.length}개의 이미지 분석하기`}
      </button>
    </div>
  )
}
