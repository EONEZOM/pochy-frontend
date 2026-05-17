'use client';

import Image from 'next/image';
import Link from 'next/link';

import { cn } from '@/lib/utils';

const POUCHY_SRC = '/figma/my/pouchy.svg';
const TOUCH_HINT_SRC = '/figma/my/touch.svg';

export function MyCosmeticsEmptyView() {
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
      aria-label={'내 화장품 비어 있음'}
    >
      <div className="flex w-full flex-col items-center gap-6 text-center">
        <h2 className="text-sm leading-relaxed font-semibold text-[#FF60CA]">
          {'파우치가 비어있어요'}
          <br />
          {'당신의 취향에 맞게 파우치를 채워보세요'}
        </h2>

        <Link
          href="/my-cosmetics/create"
          className={cn(
            'group relative flex max-w-[min(320px,78vw)] touch-manipulation flex-col items-center rounded-3xl p-2',
            'transition-transform duration-200 active:scale-[0.98]',
            'focus-visible:ring-2 focus-visible:ring-[#FF60CA]/50 focus-visible:ring-offset-2 focus-visible:outline-none',
          )}
          aria-label={'새 파우치 만들기'}
        >
          <Image
            src={POUCHY_SRC}
            alt=""
            width={350}
            height={450}
            unoptimized
            className="pointer-events-none h-auto w-full max-w-[min(350px,80vw)] object-contain drop-shadow-[0_6px_20px_rgba(255,96,202,0.2)]"
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
              unoptimized
              className="pointer-events-none h-auto w-40 max-w-[min(18vw,45px)] object-contain"
            />
          </div>
        </Link>
      </div>
    </div>
  );
}
