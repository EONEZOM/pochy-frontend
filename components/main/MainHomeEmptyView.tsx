'use client';

import Image from 'next/image';
import Link from 'next/link';

import { MainHomeBottomZipperWithLip } from '@/components/main/MainHomeBottomZipperWithLip';
import { MainHomeTopZipperWithLogo } from '@/components/main/MainHomeTopZipperWithLogo';
import { cn } from '@/lib/utils';

/**
 * Figma `홈 - 처음` (1:3590) — 위시·마이·피드에 등록된 항목이 없을 때 메인 전체
 * https://www.figma.com/design/ozRGHFE4rnqkqnikqCh7Pg/%ED%8F%AC%EC%B9%98-%EC%9E%84%EC%8B%9C?node-id=1-3590
 *
 * 레이어: 루트 배경 그라데이션 → 그 위에 지퍼·로고·그리드·립 (`public/figma/main/*`).
 * 로고: `public/figma/login/hero-1.svg`.
 */

type EmptyNavTile = {
  href: string;
  label: string;
  illustrationSrc: string;
  illustrationWidth: number;
  illustrationHeight: number;
  illustrationClassName?: string;
};

const EMPTY_NAV_TILES: EmptyNavTile[] = [
  {
    href: '/wish',
    label: 'Wish',
    illustrationSrc: '/figma/main/home-empty-wish.svg',
    illustrationWidth: 400,
    illustrationHeight: 400,
  },
  {
    href: '/my-cosmetics',
    label: 'My',
    illustrationSrc: '/figma/main/home-empty-my.svg',
    illustrationWidth: 300,
    illustrationHeight: 300,
  },
  {
    href: '/feed',
    label: 'Feed',
    illustrationSrc: '/figma/main/home-empty-feed.svg',
    illustrationWidth: 400,
    illustrationHeight: 400,
    illustrationClassName:
      'max-h-[min(36vw,142px)] max-w-[min(92vw,320px)] sm:max-h-[min(32vw,158px)]',
  },
  {
    href: '/profile',
    label: 'Profile',
    illustrationSrc: '/figma/main/home-empty-프로필(없음).svg',
    illustrationWidth: 400,
    illustrationHeight: 400,
    illustrationClassName:
      'max-h-[min(40vw,156px)] sm:max-h-[min(36vw,172px)]',
  },
];

const HOME_EMPTY_GRADIENT =
  'linear-gradient(180deg, #FFFFFF 0%, #FFF5FC 42%, #FFC6EC 100%)';

export function MainHomeEmptyView() {
  return (
    <div
      className={cn(
        'relative flex min-h-0 w-full flex-1 flex-col overflow-hidden',
        'min-h-[calc(100dvh-3.5rem-env(safe-area-inset-bottom))]',
      )}
      style={{ background: HOME_EMPTY_GRADIENT }}
    >
      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
        <MainHomeTopZipperWithLogo />

        {/* 중단: 2×2 */}
        <div className="relative z-20 flex min-h-0 flex-1 flex-col justify-center overflow-hidden px-3 py-4 sm:px-5">
          <nav
            className="mx-auto grid w-full max-w-full grid-cols-2 gap-x-3 gap-y-10 sm:gap-x-8 sm:gap-y-14"
            aria-label="빈 홈 빠른 이동"
          >
            {EMPTY_NAV_TILES.map((tile) => (
              <Link
                key={tile.href}
                href={tile.href}
                aria-label={tile.label}
                className="group flex min-w-0 flex-col items-center gap-2 overflow-hidden text-center focus-visible:ring-2 focus-visible:ring-[#FF60CA]/50 focus-visible:ring-offset-2 focus-visible:outline-none"
              >
                <span className="relative flex h-[min(42vw,168px)] min-h-[148px] w-full max-w-full items-center justify-center overflow-hidden sm:h-[min(38vw,196px)] sm:min-h-[164px]">
                  <Image
                    src={tile.illustrationSrc}
                    alt=""
                    width={tile.illustrationWidth}
                    height={tile.illustrationHeight}
                    unoptimized
                    className={cn(
                      'mx-auto h-auto w-full max-w-[min(42vw,158px)] origin-center object-contain transition-transform duration-200',
                      'max-h-[min(40vw,158px)] sm:max-h-[min(36vw,176px)] sm:max-w-[min(38vw,176px)]',
                      'scale-100 group-active:scale-[0.97] sm:group-active:scale-[0.98]',
                      tile.illustrationClassName,
                    )}
                  />
                </span>
              </Link>
            ))}
          </nav>
        </div>

        <MainHomeBottomZipperWithLip />
      </div>
    </div>
  );
}
