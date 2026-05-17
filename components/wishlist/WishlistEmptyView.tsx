'use client';

import Image from 'next/image';
import Link from 'next/link';

import { cn } from '@/lib/utils';

/**
 * Figma `위시 - 비었을 때` (1-2704)
 * https://www.figma.com/design/ozRGHFE4rnqkqnikqCh7Pg/%ED%8F%AC%EC%B9%98-%EC%9E%84%EC%8B%9C?node-id=1-2704
 *
 * 앱 레이아웃 셸(`max-w-120` · `layout.tsx`와 동일) 안에서만 덮음.
 * `WishScanAnalyzeLoading`과 동일: `fixed` + 가운데 정렬 컬럼, `bottom-14`로 하단 내비 구역 비움.
 * 카트 탭 → `/wish/register/scan`
 * 카트 일러스트 위에 `public/icons/touch.svg` 터치 유도 오버레이
 */

const CART_SRC = '/figma/wish/카트.svg';
const TOUCH_HINT_SRC = '/icons/touch.svg';

export function WishlistEmptyView() {
  return (
    <div
      className={cn(
        'pointer-events-auto fixed top-0 bottom-14 left-1/2 z-[35] flex w-full max-w-120 min-w-90 -translate-x-1/2 flex-col items-center justify-center px-6',
        'pt-[var(--safe-area-top)]',
      )}
      style={{
        background:
          'linear-gradient(180deg, rgba(255, 255, 255, 1) 12%, rgba(255, 198, 236, 1) 100%)',
      }}
      role="region"
      aria-label="위시리스트가 비어 있음"
    >
      <div className="flex w-full flex-col items-center gap-6 text-center">
        <h2 className="text-sm leading-relaxed font-semibold text-[#FF60CA]">
          갖고 싶은 화장품 캡쳐본을 등록해 보세요!
          <br />
          제품 정보와 가격까지 자동으로 정리해 드릴게요.
        </h2>

        <Link
          href="/wish/register/scan"
          className={cn(
            'group relative flex max-w-[min(450px,88vw)] touch-manipulation flex-col items-center rounded-3xl p-2',
            'transition-transform duration-200 active:scale-[0.98]',
            'focus-visible:ring-2 focus-visible:ring-[#FF60CA]/50 focus-visible:ring-offset-2 focus-visible:outline-none',
          )}
          aria-label="위시 스캔 등록하기"
        >
          <Image
            src={CART_SRC}
            alt=""
            width={400}
            height={294}
            className="pointer-events-none h-auto w-full object-contain drop-shadow-[0_6px_20px_rgba(255,96,202,0.25)]"
            priority
          />

          <div
            className="pointer-events-none absolute top-[50%] left-1/2 z-10 -translate-x-1/2 -translate-y-1/2 select-none"
            aria-hidden
          >
            <Image
              src={TOUCH_HINT_SRC}
              alt=""
              width={70}
              height={90}
              className="pointer-events-none h-auto w-40 max-w-[min(18vw,72px)] object-contain"
            />
          </div>
        </Link>
      </div>
    </div>
  );
}
