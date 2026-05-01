'use client';

import { Suspense, useMemo } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useSearchMyCosmetics } from '@/api/generated/my-cosmetics-controller/my-cosmetics-controller';
import type { MyCosmeticsResponseDTO } from '@/api/model';
import { WishCardImage } from '@/components/wishlist/WishCardImage';
import { MyCosmeticsHeader } from '@/components/my-cosmetics/MyCosmeticsHeader';
import Image from 'next/image';

function MyCosmeticsListContent() {
  const searchParams = useSearchParams();

  const sortOrder = searchParams.get('sort') ?? 'latest';
  const searchQuery = searchParams.get('q') ?? '';

  const { data, isLoading, isError } = useSearchMyCosmetics({
    keyword: searchQuery || undefined,
    sort: sortOrder === 'oldest' ? 'asc' : 'desc',
    size: 100,
  });

  const items: MyCosmeticsResponseDTO[] = useMemo(
    () => (data?.result?.content ?? []) as MyCosmeticsResponseDTO[],
    [data],
  );

  return (
    <div className="relative">
      <MyCosmeticsHeader />

      <main className="p-4">
        {isLoading ? (
          <div className="flex min-h-[60vh] items-center justify-center text-sm text-zinc-500">
            내 화장품을 불러오는 중...
          </div>
        ) : isError ? (
          <div className="flex min-h-[60vh] items-center justify-center text-sm text-red-500">
            목록을 불러오지 못했습니다.
          </div>
        ) : items.length === 0 ? (
          <div className="flex min-h-[60vh] flex-col items-center justify-center gap-2">
            <p className="font-bold">아직 등록된 화장품이 없어요.</p>
            <p className="text-mono-dark-gray text-sm">스캔해서 파우치를 채워보세요!</p>
          </div>
        ) : (
          <div className="flex w-full gap-3 pb-4">
            {[0, 1].map((colIndex) => (
              <div key={colIndex} className="flex min-w-0 flex-1 flex-col gap-3">
                {items
                  .filter((_, i) => i % 2 === colIndex)
                  .map((item) => (
                    <Link
                      key={item.id}
                      href={`/my-cosmetics/${item.id}`}
                      className="border-mono-bright-gray block w-full min-w-0 overflow-hidden rounded-2xl border bg-white shadow-sm transition-shadow hover:shadow-md"
                    >
                      <div className="bg-mono-bright-gray relative w-full">
                        <WishCardImage
                          officialImage={item.imgUrl ?? ''}
                          captureImage={item.captureUrl ?? ''}
                          productName={item.name ?? ''}
                        />
                      </div>
                      <div className="flex min-w-0 flex-col items-center gap-0.5 px-2 py-3">
                        <span className="text-mono-dark-gray w-full truncate text-center text-sm">
                          {item.brand}
                        </span>
                        <span className="text-mono-jet w-full truncate text-center text-sm font-semibold">
                          {item.name}
                        </span>
                      </div>
                    </Link>
                  ))}
              </div>
            ))}
          </div>
        )}
      </main>

      {/* 등록 버튼 */}
      <div className="pointer-events-none fixed bottom-16 left-1/2 z-50 w-full max-w-120 -translate-x-1/2">
        <div className="relative h-24">
          <div className="absolute bottom-5 right-5">
            <Link href="/my-cosmetics/register" className="pointer-events-auto">
              <button className="bg-mono-jet flex size-12 items-center justify-center rounded-full shadow-lg">
                <Image src="/icons/imgplus.svg" alt="등록" width={24} height={24} unoptimized className="invert" />
              </button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MyCosmeticsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center text-sm text-zinc-500">
          내 화장품을 불러오는 중...
        </div>
      }
    >
      <MyCosmeticsListContent />
    </Suspense>
  );
}
