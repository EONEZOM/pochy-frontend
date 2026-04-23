'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { extractImageFileData } from '@/utils/image-utils'
import { useAnalyzeCosmeticCapture } from '@/hooks/mutation/useAnalyzeCosmeticCapture'
import { useWishlistStore } from '@/store/wishlistStore'
import { X } from 'lucide-react'
import Image from 'next/image'
import { ImageFileData } from '@/types/image'
import RegisterReviewStep from '@/components/wishlist/RegisterReviewStep'
import { Button } from '@/components/ui/button'

export default function WishlistRegisterPage() {
  const router = useRouter()
  const [images, setImages] = useState<ImageFileData[]>([])
  const [analysisResults, setAnalysisResults] = useState<any[]>([])
  const [isReviewStep, setIsReviewStep] = useState(false)

  const addItem = useWishlistStore((state) => state.addItem)
  const { mutate: analyze, isPending } = useAnalyzeCosmeticCapture()

  // 이미지 업로드 핸들러
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const data = extractImageFileData(e.target.files)
    setImages((prev) => [...prev, ...data])
  }

  // 이미지 개별 삭제
  const removeImage = (index: number) => {
    const target = images[index]
    URL.revokeObjectURL(target.previewUrl)
    setImages(images.filter((_, i) => i !== index))
  }

  // 분석 시작 (GPT 호출)
  const startAnalysis = async () => {
    if (images.length === 0) return alert('이미지를 선택해주세요.')

    const fileArray = images.map((img) => img.file)
    analyze(fileArray, {
      onSuccess: (data) => {
        setAnalysisResults(data.results)
        setIsReviewStep(true)
      },
      onError: (err) => alert('분석 중 오류 발생: ' + err.message),
    })
  }

  // 저장 (Zustand 스토어에 추가 + persist)
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
    <div className="flex min-h-screen flex-col items-center justify-between p-5">
      <div className="w-full">
        {/* 이미지 업로드 영역 */}
        <div className="flex flex-col items-center justify-center">
          <label className="flex h-11 w-50 cursor-pointer items-center justify-center rounded-2xl border-2 border-dashed border-zinc-200 bg-zinc-50 hover:bg-zinc-100">
            <span className="font-bold">캡쳐 사진 등록하기</span>
            <input
              type="file"
              multiple
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
          </label>
        </div>
        {/* 프리뷰 리스트 */}
        <div className="mt-6 grid w-full grid-cols-3 gap-3">
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
      <Button
        onClick={startAnalysis}
        disabled={isPending || images.length === 0}
        className="h-11 w-50 font-bold"
      >
        {isPending ? 'AI 분석 중...' : `${images.length}개의 이미지 분석하기`}
      </Button>
    </div>
  )
}
