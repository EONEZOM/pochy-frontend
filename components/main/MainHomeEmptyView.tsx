'use client';

import Image from 'next/image';
import Link from 'next/link';

import { cn } from '@/lib/utils';

/**
 * Figma `홈 - 처음` (1:3590) — 리스트가 모두 비었을 때 전체 화면
 * https://www.figma.com/design/ozRGHFE4rnqkqnikqCh7Pg/%ED%8F%AC%EC%B9%98-%EC%9E%84%EC%8B%9C?node-id=1-3590
 *
 * 에셋: `public/main` (지퍼·일러스트), 로고 `/figma/login/hero-1.svg`, 립스틱 `/main/hero-2.png`
 */

type EmptyNavTile = {
  href: string;
  illustrationSrc: string;
  illustrationWidth: number;
  illustrationHeight: number;
  illustrationClassName?: string;
};

const EMPTY_NAV_TILES: EmptyNavTile[] = [
  {
    href: '/wish',
    illustrationSrc: '/figma/main/home-empty-wish.svg',
    illustrationWidth: 88,
    illustrationHeight: 87,
  },
  {
    href: '/my-cosmetics',
    illustrationSrc: '/figma/main/home-empty-my.svg',
    illustrationWidth: 72,
    illustrationHeight: 104,
  },
  {
    href: '/feed',
    illustrationSrc: '/figma/main/home-empty-feed.svg',
    illustrationWidth: 120,
    illustrationHeight: 55,
    illustrationClassName: 'max-h-[72px] w-auto',
  },
  {
    href: '/profile',
    illustrationSrc: '/figma/main/home-empty-프로필(없음).svg',
    illustrationWidth: 104,
    illustrationHeight: 104,
    illustrationClassName: 'max-h-[88px] w-auto',
  },
];

export function MainHomeEmptyView() {
  return (
    <div
      className={cn(
        'flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden bg-white',
      )}
    >
      <div className="relative h-[min(28dvh,140px)] w-full shrink-0 overflow-hidden">
        <Image
          src="/figma/main/윗지퍼.svg"
          alt=""
          fill
          unoptimized
          className="object-cover object-bottom"
          sizes="360px"
          priority
        />
        <Image
          src="/figma/main/윗지퍼찍찍.svg"
          alt=""
          fill
          unoptimized
          className="object-cover object-bottom"
          sizes="360px"
        />
        <div className="absolute inset-0 flex items-center justify-center px-4 pt-2 pb-6">
          <Image
            src="/figma/login/hero-1.svg"
            alt="POCHY"
            width={144}
            height={96}
            unoptimized
            className="h-auto w-[min(132px,36vw)] object-contain drop-shadow-[0_2px_6px_rgba(0,0,0,0.18)]"
            priority
          />
        </div>
      </div>

      <div
        className={cn(
          'flex min-h-0 flex-1 flex-col justify-end overflow-hidden px-5 py-4',
          'bg-[linear-gradient(180deg,#FFFFFF_0%,#FFF5FC_45%,#FFC6EC_100%)]',
        )}
      >
        <nav
          className="mx-auto grid w-full max-w-[300px] grid-cols-2 gap-x-5 gap-y-6"
          aria-label="빈 홈 빠른 이동"
        >
          {EMPTY_NAV_TILES.map((tile) => (
            <Link
              key={tile.href}
              href={tile.href}
              className="group flex flex-col items-center gap-2.5 text-center focus-visible:ring-2 focus-visible:ring-[#FF60CA]/50 focus-visible:ring-offset-2 focus-visible:outline-none"
            >
              <span className="relative flex h-[104px] w-full max-w-[130px] items-center justify-center">
                <Image
                  src={tile.illustrationSrc}
                  alt=""
                  width={tile.illustrationWidth}
                  height={tile.illustrationHeight}
                  unoptimized
                  className={cn(
                    'h-auto max-h-[96px] w-auto object-contain transition-transform duration-200 group-active:scale-[0.98]',
                    tile.illustrationClassName,
                  )}
                />
              </span>
            </Link>
          ))}
        </nav>
      </div>

      <div className="relative h-[min(26dvh,152px)] w-full shrink-0 overflow-hidden">
        <Image
          src="/figma/main/아래지퍼.svg"
          alt=""
          fill
          unoptimized
          className="absolute top-[100px] left-0 z-10 h-full w-full object-cover object-top"
          sizes="360px"
        />
        <Image
          src="/figma/main/지퍼꼬다리.svg"
          alt=""
          width={72}
          height={72}
          unoptimized
          className="absolute bottom-5 left-3 h-auto w-[min(20vw,72px)] object-contain drop-shadow-sm"
        />
        <Image
          src="/figma/login/hero-2.png"
          alt=""
          width={500}
          height={400}
          unoptimized
          className="absolute right-[-100px] bottom-2 z-10 object-contain drop-shadow-[0_2px_8px_rgba(0,0,0,0.2)]"
        />
      </div>

      <div
        className={cn(
          'shrink-0 overflow-hidden px-5 pt-2 pb-3',
          'bg-[linear-gradient(180deg,#FFF5FC_0%,#FFC6EC_100%)]',
        )}
      >
        <nav
          className="mx-auto grid w-full max-w-[300px] grid-cols-2 gap-x-5 gap-y-6"
          aria-label="빈 홈 빠른 이동"
        >
          {EMPTY_NAV_TILES.map((tile) => (
            <Link
              key={tile.href}
              href={tile.href}
              className="group flex flex-col items-center gap-2.5 text-center focus-visible:ring-2 focus-visible:ring-[#FF60CA]/50 focus-visible:ring-offset-2 focus-visible:outline-none"
            >
              <span className="relative flex h-[104px] w-full max-w-[130px] items-center justify-center">
                <Image
                  src={tile.illustrationSrc}
                  alt=""
                  width={tile.illustrationWidth}
                  height={tile.illustrationHeight}
                  unoptimized
                  className={cn(
                    'h-auto max-h-[96px] w-auto object-contain transition-transform duration-200 group-active:scale-[0.98]',
                    tile.illustrationClassName,
                  )}
                />
              </span>
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}
