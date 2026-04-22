'use client'

import Link from 'next/link'
import { Plus } from 'lucide-react'
import Image from 'next/image'
import MOCK_WISH_ITEMS from '@/app/mock/mockWishlistItems.json'
import { useEffect, useState } from 'react'
import { useWishlistStore } from '@/store/wishlistStore'

export default function WishlistPage() {
  // TODO: 백엔드 API 연동 필요
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
            <p>아직 등록한 제품이 없어요!</p>
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
                  src={item.image_url}
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

      {/* 등록 페이지 이동 Button */}
      <Link
        href="/wishlist/register"
        className="fixed right-6 bottom-6 flex size-14 items-center justify-center rounded-full bg-zinc-900 text-white"
      >
        <Plus size={28} />
      </Link>
    </div>
  )
}
