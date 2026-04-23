'use client'

import { useState, useRef, useEffect } from 'react'
import { Plus, AlertCircle, Search, Loader2 } from 'lucide-react' // 아이콘 추가
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { COSMETIC_CATEGORIES } from '@/constants/category'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface ProductDetailFormProps {
  initialData: any
  onSubmit: (updatedData: any) => void
  onBack: () => void
  submitLabel?: string
  showScanWarning?: boolean
}

export default function ProductDetailForm({
  initialData,
  onSubmit,
  onBack,
  submitLabel = '완료',
  showScanWarning = false,
}: ProductDetailFormProps) {
  const [formData, setFormData] = useState(initialData)
  const [isSearching, setIsSearching] = useState(false) // 검색 로딩 상태
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    return () => {
      if (formData.image_url && formData.image_url.startsWith('blob:')) {
        URL.revokeObjectURL(formData.image_url)
      }
    }
  }, [formData.image_url])

  const formFields = [
    { label: '제품명', field: 'product_name', type: 'text' },
    { label: '브랜드명', field: 'brand_name', type: 'text' },
    { label: '카테고리', field: 'category', type: 'select' },
    { label: '특징', field: 'features', type: 'text' },
    { label: '가격', field: 'price', type: 'text' },
    { label: '메모', field: 'memo', type: 'text' },
  ]

  // 네이버 쇼핑 재검색 로직
  const handleReSearch = async () => {
    const { brand_name, product_name } = formData

    if (!brand_name || !product_name) {
      return alert('브랜드명과 제품명을 모두 입력해야 검색이 가능합니다.')
    }

    const query = `${brand_name} ${product_name}`
    setIsSearching(true)

    try {
      const res = await fetch(
        `/api/naver/search?query=${encodeURIComponent(query)}`,
      )

      if (!res.ok) throw new Error('검색 실패')

      const data = await res.json()

      if (data.official_image) {
        setFormData((prev: any) => {
          // 특징(features) 필드가 비어있는지 확인
          const isFeaturesEmpty =
            !prev.features || String(prev.features).trim() === ''

          // category_list 배열을 ", " 구분자로 합침 (예: 화장품, 색조메이크업, 립스틱)
          const categoryString = data.category_list
            ? data.category_list.join(', ')
            : ''

          return {
            ...prev,
            official_image: data.official_image,
            price: data.lowest_price,
            mall_url: data.mall_url,
            // features가 비어있을 때만 카테고리 정보 삽입, 아니면 기존 값 유지
            features: isFeaturesEmpty ? categoryString : prev.features,
          }
        })
        alert('상품 정보를 새로 가져왔습니다.')
      } else {
        alert('검색 결과가 없습니다. 정보를 직접 확인해주세요.')
      }
    } catch (error) {
      console.error('Naver search error:', error)
      alert('정보를 가져오는 중 오류가 발생했습니다.')
    } finally {
      setIsSearching(false)
    }
  }

  const handleChange = (field: string, value: string) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }))
  }

  const handleImageClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (formData.image_url?.startsWith('blob:')) {
        URL.revokeObjectURL(formData.image_url)
      }
      const previewUrl = URL.createObjectURL(file)
      setFormData((prev: any) => ({
        ...prev,
        official_image: null, // 직접 올릴 때는 네이버 이미지 초기화
        image_url: previewUrl,
        imageFile: file,
      }))
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-white p-5">
      <main className="space-y-6">
        {/* 제품 이미지 섹션 */}
        <div
          onClick={handleImageClick}
          className="group relative mx-auto aspect-square w-64 cursor-pointer overflow-hidden rounded-3xl bg-zinc-100 shadow-inner"
        >
          <Image
            src={
              formData.official_image ||
              formData.image_url ||
              '/placeholder-image.png'
            }
            alt="product"
            fill
            className="object-cover transition-opacity group-hover:opacity-80"
          />
          <div className="absolute inset-0 flex items-center justify-center bg-black/10 opacity-0 transition-opacity group-hover:opacity-100">
            <div className="flex size-12 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-md">
              <Plus size={28} />
            </div>
          </div>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*"
            className="hidden"
          />
        </div>

        {/* 입력 필드 섹션 */}
        <div className="space-y-5">
          {/* 상단 라벨 및 재검색 버튼 */}
          <div className="flex items-center justify-between px-1">
            <span className="text-[11px] font-bold tracking-wider text-zinc-400 uppercase">
              Product Information
            </span>
            <button
              onClick={handleReSearch}
              disabled={isSearching}
              className="flex items-center gap-1.5 text-[12px] font-bold text-indigo-600 transition-colors hover:text-indigo-800 disabled:text-zinc-300"
            >
              {isSearching ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Search size={14} />
              )}
              정보 자동 채우기
            </button>
          </div>

          {formFields.map((input) => (
            <div key={input.field} className="flex flex-col gap-1.5">
              <label className="pl-1 text-xs font-bold text-zinc-700">
                {input.label}
              </label>

              {input.type === 'select' ? (
                /* 카테고리 전용 드롭다운 */
                <Select
                  value={formData[input.field]}
                  onValueChange={(value) => handleChange(input.field, value)}
                >
                  <SelectTrigger className="h-12 w-full rounded-xl border-zinc-200 bg-zinc-50 px-4 transition-all focus:border-zinc-900 focus:ring-0 focus:ring-offset-0">
                    <SelectValue placeholder="카테고리를 선택해주세요" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-zinc-100 shadow-xl">
                    {COSMETIC_CATEGORIES.map((cat) => (
                      <SelectItem
                        key={cat.value}
                        value={cat.value}
                        className="py-3 focus:bg-zinc-50"
                      >
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                /* 일반 텍스트 입력 */
                <input
                  type="text"
                  value={formData[input.field] || ''}
                  onChange={(e) => handleChange(input.field, e.target.value)}
                  placeholder={`${input.label}을 입력해주세요`}
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm transition-all focus:border-zinc-900 focus:bg-white focus:outline-none"
                />
              )}
            </div>
          ))}
        </div>

        {showScanWarning && (
          <div className="flex items-center gap-2 rounded-xl bg-zinc-50 p-4 text-xs text-zinc-500">
            <AlertCircle size={14} className="text-zinc-400" />
            <span>
              스캔 입력의 경우 정보가 정확하지 않을 수 있으니 확인 부탁드려요!
            </span>
          </div>
        )}
      </main>

      <footer className="mt-auto pt-10 pb-6">
        <Button
          onClick={() => onSubmit(formData)}
          className="h-15 w-full rounded-2xl bg-zinc-900 text-lg font-bold text-white shadow-xl transition-transform active:scale-[0.98]"
        >
          {submitLabel}
        </Button>
      </footer>
    </div>
  )
}
