'use client'

import Link from 'next/link'
import { Plus, SearchIcon, X } from 'lucide-react'
import Image from 'next/image'
import { useEffect, useState } from 'react'
import { useWishlistStore } from '@/store/wishlistStore'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { FILTER_CATEGORIES, FilterCategory } from '@/constants/category'
import { cn } from '@/lib/utils'

export default function WishlistPage() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // TODO: 백엔드 API 연동 필요
  const [isOpen, setIsOpen] = useState(false)
  const [isHydrated, setIsHydrated] = useState(false)
  const [localSearchQuery, setLocalSearchQuery] = useState(
    searchParams.get('q') || '',
  )

  const wishItems = useWishlistStore((state) => state.items)

  const searchQuery = searchParams.get('q') || ''
  const currentCategory =
    (searchParams.get('category') as FilterCategory) || 'All'

  // 백엔드 완성 시 이 부분은 API 호출 결과로 대체
  const filteredItems = wishItems.filter((item) => {
    const matchesCategory =
      currentCategory === 'All' || item.category === currentCategory
    const matchesSearch =
      item.product_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.brand_name.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCategory && matchesSearch
  })

  const executeSearch = (e?: React.FormEvent, overrideTerm?: string) => {
    e?.preventDefault()

    // overrideTerm이 있으면 그 값을 쓰고, 없으면 로컬 상태값을 사용
    const searchTerm =
      overrideTerm !== undefined ? overrideTerm : localSearchQuery

    const params = new URLSearchParams(searchParams)

    if (searchTerm.trim()) {
      params.set('q', searchTerm.trim())
    } else {
      params.delete('q') // 검색어가 없으면 쿼리 파라미터 삭제
    }

    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }

  const handleCategoryChange = (category: FilterCategory) => {
    const params = new URLSearchParams(searchParams)
    if (category === 'All') {
      params.delete('category')
    } else {
      params.set('category', category)
    }
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }

  useEffect(() => {
    setIsHydrated(true)
  }, [])

  if (!isHydrated) return null

  return (
    <div className="relative min-h-screen">
      {/* 검색바 */}
      <form onSubmit={executeSearch} className="relative mb-4 flex gap-2">
        <div className="relative flex-1">
          <div className="pointer-events-none absolute inset-y-0 left-4 flex items-center">
            <SearchIcon size={18} className="text-zinc-400" />
          </div>
          <input
            type="text"
            value={localSearchQuery}
            onChange={(e) => setLocalSearchQuery(e.target.value)}
            placeholder="제품명 또는 브랜드 검색"
            className="w-full rounded-2xl bg-zinc-100 py-3 pr-10 pl-11 text-sm transition-all outline-none focus:bg-zinc-200"
          />
          {localSearchQuery && (
            <button
              type="button"
              onClick={() => {
                setLocalSearchQuery('')
                executeSearch(undefined, '')
              }}
              className="absolute inset-y-0 right-3 flex items-center text-zinc-400"
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* 검색 버튼 추가 */}
        <button
          type="submit"
          className="shrink-0 rounded-2xl bg-zinc-900 px-5 py-3 text-sm font-bold text-white transition-transform active:scale-95"
        >
          검색
        </button>
      </form>

      {/* 카테고리 필터링 영역 */}
      <div className="scrollbar-hide flex gap-2 overflow-x-auto px-5 pb-4">
        {FILTER_CATEGORIES.map((cat) => (
          <button
            key={cat.value}
            onClick={() => handleCategoryChange(cat.value as FilterCategory)}
            className={cn(
              'shrink-0 rounded-full px-5 py-2 text-sm font-bold transition-all',
              currentCategory === cat.value
                ? 'bg-zinc-900 text-white'
                : 'bg-zinc-100 text-zinc-500',
            )}
          >
            {cat.label}
          </button>
        ))}
      </div>
      <main className="p-5">
        {filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center">
            <p>등록된 제품이 없습니다</p>
          </div>
        ) : (
          <div className="columns-2 gap-4 space-y-4">
            {/* Masonry 스타일 레이아웃 */}
            {filteredItems.map((item: any) => (
              <Link
                key={item.id}
                href={`/wishlist/${item.id}`}
                className="flex flex-col gap-4 overflow-hidden rounded-2xl p-4 shadow-lg"
              >
                <div className="overflow-hidden rounded-2xl border-2">
                  <Image
                    src={item.official_image}
                    alt={item.product_name}
                    width={500}
                    height={700}
                    className="w-full object-cover"
                  />
                </div>
                <div className="flex w-full flex-col items-center justify-center">
                  <div className="">{item.brand_name}</div>
                  <div className="w-full truncate text-center">
                    {item.product_name}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>

      {/* 등록 페이지 이동 Popover */}
      <div className="pointer-events-none fixed bottom-0 left-1/2 z-50 w-full max-w-120 -translate-x-1/2">
        <div className="relative h-24">
          <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
              <Button
                size="icon"
                className="pointer-events-auto absolute right-5 bottom-5 flex size-16 items-center justify-center rounded-full bg-gray-500 text-white shadow-lg transition-all duration-200 active:scale-95"
              >
                {isOpen ? <X size={36} /> : <Plus size={36} />}
              </Button>
            </PopoverTrigger>

            <PopoverContent
              side="top"
              align="end"
              sideOffset={16} // 버튼과의 간격
              className="w-56 rounded-3xl border border-gray-100 bg-white p-1 shadow-xl"
            >
              <div className="flex flex-col">
                <Link
                  href="/wishlist/register/scan"
                  onClick={() => setIsOpen(false)}
                  className="flex w-full items-center justify-center rounded-t-[20px] py-4 text-[15px] font-medium transition-colors hover:bg-gray-100"
                >
                  스캔해서 등록하기
                </Link>

                {/* 구분선 */}
                <div className="h-px w-full bg-gray-100" />

                <Link
                  href="/wishlist/register/direct"
                  onClick={() => setIsOpen(false)}
                  className="flex w-full items-center justify-center rounded-b-[20px] py-4 text-[15px] font-medium transition-colors hover:bg-gray-100"
                >
                  직접 등록하기
                </Link>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </div>
  )
}
