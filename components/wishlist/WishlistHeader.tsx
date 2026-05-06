'use client';
import Image from 'next/image';
import { useCallback, useEffect, useState } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import Input from '@/components/common/Input/Input';
import { useDebounce } from '@/hooks/useDebounce';

export function WishlistHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryFromUrl = searchParams.get('q') || '';
  const [localSearchQuery, setLocalSearchQuery] = useState(queryFromUrl);
  const debouncedSearchQuery = useDebounce(localSearchQuery, 350);

  const updateSearchQuery = useCallback(
    (value: string) => {
      const normalized = value.trim();
      const currentQuery = searchParams.get('q') || '';
      if (normalized === currentQuery) {
        return;
      }
      const params = new URLSearchParams(searchParams.toString());
      if (normalized) {
        params.set('q', normalized);
      } else {
        params.delete('q');
      }
      const queryString = params.toString();
      router.replace(queryString ? `${pathname}?${queryString}` : pathname, {
        scroll: false,
      });
    },
    [pathname, router, searchParams],
  );

  useEffect(() => {
    updateSearchQuery(debouncedSearchQuery);
  }, [debouncedSearchQuery, updateSearchQuery]);

  return (
    <div className="sticky top-0 z-30 bg-white/95 px-3 pt-3 pb-2 backdrop-blur-sm">
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="flex size-10 shrink-0 items-center justify-center text-zinc-900"
          aria-label="뒤로 가기"
          onClick={() => router.back()}
        >
          <Image
            src="/icons/back.svg"
            alt=""
            width={24}
            height={24}
            unoptimized
          />
        </button>
        <Input
          type="search"
          placeholder="검색"
          value={localSearchQuery}
          onChange={(e) => {
            setLocalSearchQuery(e.target.value);
          }}
          className="h-11 rounded-lg border-zinc-700 bg-transparent px-4 py-2 text-sm"
          rightElement={
            <button
              type="button"
              aria-label="검색"
              className="text-zinc-700"
              onClick={() => {
                updateSearchQuery(localSearchQuery);
              }}
            >
              <Image
                src="/icons/search.svg"
                alt="돋보기아이콘"
                width={24}
                height={24}
                unoptimized
              />
            </button>
          }
        />
      </div>
    </div>
  );
}
