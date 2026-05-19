'use client';

import Image from 'next/image';
import Link from 'next/link';

import { MainHomeBottomZipperWithLip } from '@/components/main/MainHomeBottomZipperWithLip';
import { MainHomeTopZipperWithLogo } from '@/components/main/MainHomeTopZipperWithLogo';
import { cn } from '@/lib/utils';

/**
 * Figma `홈 - 처음` (1:3590) — 위시·마이 파우치에 등록된 항목이 없을 때 메인 전체
 * https://www.figma.com/design/ozRGHFE4rnqkqnikqCh7Pg/%ED%8F%AC%EC%B9%98-%EC%9E%84%EC%8B%9C?node-id=1-3590
 *
 * 레이어: 루트 배경 그라데이션 → 그 위에 지퍼·로고·그리드·립 (`public/figma/main/*`).
 * 로고: `public/figma/login/hero-1.svg`.
 */

type EmptyNavTile = {
  href: string;
  /** 스크린리더용 짧은 설명 */
  label: string;
  /** 이미지 아래 표시 이름 */
  displayName: string;
  illustrationSrc: string;
};

const EMPTY_NAV_TILES: EmptyNavTile[] = [
  {
    href: '/wish',
    label: '위시로 이동',
    displayName: 'Wish List',
    illustrationSrc: '/figma/main/home-empty-wish.svg',
  },
  {
    href: '/my-cosmetics',
    label: '내 화장품으로 이동',
    displayName: 'My Pouch',
    illustrationSrc: '/figma/main/home-empty-my.svg',
  },
  {
    href: '/feed',
    label: '피드로 이동',
    displayName: 'Feed',
    illustrationSrc: '/figma/main/home-empty-feed.svg',
  },
  {
    href: '/profile',
    label: '마이페이지로 이동',
    displayName: 'Profile',
    illustrationSrc: '/figma/main/home-empty-profile.svg',
  },
];

/** 2×2 그리드에서 네 칸 일러스트 박스 동일 크기 */
const TILE_ILLUSTRATION_BOX =
  'relative mx-auto aspect-square w-[min(38vw,148px)] max-w-[148px] shrink-0 sm:w-[min(34vw,156px)] sm:max-w-[156px]';

const HOME_EMPTY_GRADIENT =
  'linear-gradient(180deg, #FFFFFF 0%, #FFF5FC 42%, #FFC6EC 100%)';

export function MainHomeEmptyView() {
  return (
    <div
      className={cn(
        'relative flex min-h-0 w-full flex-1 flex-col overflow-hidden overscroll-none',
        'min-h-[calc(var(--app-height)-env(safe-area-inset-bottom))]',
      )}
      style={{ background: HOME_EMPTY_GRADIENT }}
    >
      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
        <MainHomeTopZipperWithLogo
          panelClassName="h-[min(calc(var(--app-height)*0.44),224px)]"
          imageClassName="scale-x-[1.32] scale-y-[1.16] sm:scale-x-[1.36] sm:scale-y-[1.2]"
        />

        {/* 중단: 2×2 */}
        <div className="relative z-20 flex min-h-0 flex-1 flex-col justify-center overflow-hidden px-3 py-4 sm:px-5">
          <nav
            className="mx-auto grid w-full max-w-full grid-cols-2 gap-x-3 gap-y-10 sm:gap-x-8 sm:gap-y-14"
            aria-label="빈 홈 빠른 이동"
          >
            {EMPTY_NAV_TILES.map((tile, tileIndex) => (
              <Link
                key={tile.href}
                href={tile.href}
                aria-label={tile.label}
                className="group flex min-w-0 flex-col items-center gap-2.5 overflow-hidden text-center focus-visible:ring-2 focus-visible:ring-[#FF60CA]/50 focus-visible:ring-offset-2 focus-visible:outline-none"
              >
                <span
                  className={cn(
                    TILE_ILLUSTRATION_BOX,
                    'overflow-hidden p-1 transition-transform duration-200',
                    'scale-100 group-active:scale-[0.97] sm:group-active:scale-[0.98]',
                  )}
                >
                  <Image
                    src={tile.illustrationSrc}
                    alt=""
                    fill
                    sizes="(max-width: 640px) 38vw, 522px"
                    priority={tileIndex < 2}
                    {...(tileIndex === 0
                      ? { fetchPriority: 'high' as const }
                      : {})}
                    decoding="async"
                    className="scale-110 object-contain"
                  />
                </span>
                <span className="text-mono-jet mt-[-10px] max-w-full truncate px-1 text-[20px] leading-5 font-bold">
                  {tile.displayName}
                </span>
              </Link>
            ))}
          </nav>
        </div>

        <MainHomeBottomZipperWithLip
          className="-mt-1 pt-[10px] sm:-mt-5"
          panelClassName="h-[min(calc(var(--app-height)*0.32),180px)]"
          imageClassName="scale-105"
        />
      </div>
    </div>
  );
}
