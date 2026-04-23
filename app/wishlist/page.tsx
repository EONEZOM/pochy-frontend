'use client'

import Link from 'next/link'
import { Plus, X } from 'lucide-react'
import Image from 'next/image'
import { useEffect, useState } from 'react'
import { useWishlistStore } from '@/store/wishlistStore'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Button } from '@/components/ui/button'

export default function WishlistPage() {
  // TODO: 백엔드 API 연동 필요
  const [isOpen, setIsOpen] = useState(false)
  const [isHydrated, setIsHydrated] = useState(false)
  const wishItems = useWishlistStore((state) => state.items)

  useEffect(() => {
    setIsHydrated(true)
  }, [])

  if (!isHydrated) return null

  return (
    <div className="relative min-h-screen">
      <main className="p-5">
        {wishItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center">
            <p>등록된 제품이 없습니다</p>
          </div>
        ) : (
          <div className="columns-2 gap-4 space-y-4">
            {/* Masonry 스타일 레이아웃 */}
            {wishItems.map((item: any) => (
              <Link
                key={item.id}
                href={`/wishlist/${item.id}`}
                className="block overflow-hidden rounded-2xl bg-white shadow-sm"
              >
                <Image
                  src={item.official_image}
                  alt={item.product_name}
                  width={500}
                  height={700}
                  className="w-full object-cover"
                />
                <div className="p-4">
                  <div className="text-xs">{item.brand_name}</div>
                  <div className="truncate text-sm">{item.product_name}</div>
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
