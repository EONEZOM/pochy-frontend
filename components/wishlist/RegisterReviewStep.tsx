'use client'

import { useState } from 'react'
import { ChevronLeft, AlertCircle, X } from 'lucide-react'
import Image from 'next/image'
import ProductDetailForm from '@/components/wishlist/ProductDetailForm'

interface ReviewStepProps {
  results: any[]
  setResults: (results: any[]) => void
  onSave: () => void
  onCancel: () => void
}

export default function RegisterReviewStep({
  results,
  setResults,
  onSave,
  onCancel,
}: ReviewStepProps) {
  // 현재 수정 중인 아이템의 인덱스 (null이면 그리드 뷰)
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const [isSearching, setIsSearching] = useState(false)

  const handleReSearch = async () => {
    const currentItem = results[selectedIndex!]
    const query = `${currentItem.brand_name} ${currentItem.product_name}`

    if (!currentItem.brand_name || !currentItem.product_name) {
      return alert('브랜드명과 제품명을 모두 입력해주세요.')
    }

    setIsSearching(true)
    try {
      const res = await fetch(
        `/api/naver/search?query=${encodeURIComponent(query)}`,
      )
      const data = await res.json()

      if (data.official_image) {
        const updated = [...results]
        updated[selectedIndex!] = {
          ...updated[selectedIndex!],
          official_image: data.official_image, // 이미지 업데이트
          price: data.lowest_price, // 가격 업데이트
          mall_url: data.mall_url, // 쇼핑몰 링크 업데이트
        }
        setResults(updated)
        alert('상품 정보를 새로 가져왔습니다.')
      } else {
        alert('검색 결과가 없습니다. 정보를 직접 수정해주세요.')
      }
    } catch (error) {
      console.error('Re-search error:', error)
      alert('검색 중 오류가 발생했습니다.')
    } finally {
      setIsSearching(false)
    }
  }

  const handleUpdate = (field: string, value: any) => {
    if (selectedIndex === null) return
    const updated = [...results]
    updated[selectedIndex] = { ...updated[selectedIndex], [field]: value }
    setResults(updated)
  }

  const handleDelete = (index: number) => {
    if (!confirm('이 항목을 삭제할까요?')) return
    const updated = results.filter((_, i) => i !== index)
    setResults(updated)
  }

  // 결과 그리드 뷰
  if (selectedIndex === null) {
    return (
      <div className="flex min-h-screen flex-col bg-white">
        <header className="flex items-center justify-between px-5 py-4">
          <button onClick={onCancel}>
            <ChevronLeft size={24} />
          </button>
          <h1 className="text-lg font-bold">위시</h1>
          <button
            onClick={onSave}
            className="rounded-full bg-zinc-200 px-4 py-1 text-sm font-bold text-zinc-600"
          >
            등록
          </button>
        </header>

        <main className="p-5">
          <div className="mb-4 flex items-center gap-2 rounded-lg bg-zinc-50 p-3 text-xs text-zinc-600">
            <AlertCircle size={14} />
            <span>스캔 입력의 경우 정확도가 떨어질 수 있습니다.</span>
          </div>

          <div className="grid grid-cols-3 gap-x-3 gap-y-6">
            {results.map((item, idx) => (
              <div key={idx} className="group relative">
                {/* 이미지 컨테이너 */}
                <div
                  onClick={() => setSelectedIndex(idx)}
                  className="relative aspect-square cursor-pointer overflow-hidden rounded-xl border border-zinc-200 bg-zinc-100 shadow-sm transition-transform active:scale-95"
                >
                  <Image
                    src={item.official_image || item.image_url}
                    alt="result"
                    fill
                    className="object-cover"
                  />

                  {/* 삭제 버튼 (X) */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation() // 상세 페이지 이동 방지
                      handleDelete(idx)
                    }}
                    className="absolute top-1.5 right-1.5 z-10 flex size-6 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm transition-colors hover:bg-black/70"
                  >
                    <X size={14} />
                  </button>
                </div>

                {/* 텍스트 정보 */}
                <div
                  className="mt-2 px-0.5"
                  onClick={() => setSelectedIndex(idx)}
                >
                  <div className="truncate text-[10px] font-medium text-zinc-400">
                    {item.brand_name || '브랜드 미상'}
                  </div>
                  <div className="mt-0.5 truncate text-xs font-bold text-zinc-800">
                    {item.product_name || '제품명 미상'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>
    )
  }

  // --- 화면 2: 상세 수정 뷰 (와이어프레임 3번 대응) ---
  const currentItem = results[selectedIndex]

  if (selectedIndex !== null) {
    return (
      <ProductDetailForm
        initialData={results[selectedIndex]}
        showScanWarning={true}
        submitLabel="수정 완료"
        onBack={() => setSelectedIndex(null)}
        onSubmit={(updatedData) => {
          const updatedResults = [...results]
          updatedResults[selectedIndex] = updatedData
          setResults(updatedResults)
          setSelectedIndex(null)
        }}
      />
    )
  }
}
