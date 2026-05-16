'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';

import { Modal } from '@/components/common/Modal';
import { cn } from '@/lib/utils';
import { useBottomNavVisibility } from '@/providers/bottom-nav-visibility';
import { prefetchQueriesForNavHref } from '@/lib/prefetch-app-tab-queries';

export const BOTTOM_NAV_MAX_WIDTH_CLASS = 'max-w-120';

export type BottomNavItem = {
  href: string;
  label: string;
  /** 비활성 — `public` 기준 URL만 사용 (`/icons/...`). `@/`는 import용이라 `src` 문자열에 쓰면 안 됨 */
  iconPath: string;
  iconActivePath: string;
};

const BOTTOM_NAV_ITEMS: BottomNavItem[] = [
  {
    href: '/',
    label: 'Home',
    iconPath: '/icons/BottomNav/home.svg',
    iconActivePath: '/icons/BottomNav/home-af.svg',
  },
  {
    href: '/my-cosmetics',
    label: 'My',
    iconPath: '/icons/BottomNav/my.svg',
    iconActivePath: '/icons/BottomNav/my-af.svg',
  },
  {
    href: '/wish',
    label: 'Wish',
    iconPath: '/icons/BottomNav/wish.svg',
    iconActivePath: '/icons/BottomNav/wish-af.svg',
  },
  {
    href: '/feed',
    label: 'Feed',
    iconPath: '/icons/BottomNav/feed.svg',
    iconActivePath: '/icons/BottomNav/feed-af.svg',
  },
  {
    href: '/profile',
    label: 'Profile',
    iconPath: '/icons/BottomNav/profile.svg',
    iconActivePath: '/icons/BottomNav/profile-af.svg',
  },
];

const ICON_PX = 24;
export const BOTTOM_NAV_HIDDEN_PATHS = [
  '/opening',
  '/login',
  '/verify',
  '/success',
  '/nickname',
  '/auth',
] as const;
const PREPARING_PATHS = ['/my', '/feed'];

export function isBottomNavHiddenPathname(pathname: string) {
  return BOTTOM_NAV_HIDDEN_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
}

function isNavActive(pathname: string, href: string) {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function BottomNav({ className }: { className?: string }) {
  const pathname = usePathname() ?? '/';
  const queryClient = useQueryClient();
  const [isPreparingModalOpen, setIsPreparingModalOpen] = useState(false);
  const { isHomeEmptyViewActive } = useBottomNavVisibility();
  const shouldHideBottomNav =
    isHomeEmptyViewActive || isBottomNavHiddenPathname(pathname);

  if (shouldHideBottomNav) {
    return null;
  }

  return (
    <>
      <nav
        className={cn(
          // 문서 끝에 두면 긴 페이지에서 탭이 화면 밖으로 밀림 → 뷰포트 하단 고정
          'fixed bottom-0 left-1/2 z-40 w-full -translate-x-1/2 border-t border-mono-bright-gray bg-mono-white pb-(--safe-area-bottom)',
          BOTTOM_NAV_MAX_WIDTH_CLASS,
          className,
        )}
        role="navigation"
        aria-label="하단 내비게이션"
      >
        <ul className="grid grid-cols-5">
          {BOTTOM_NAV_ITEMS.map((item) => {
            const active = isNavActive(pathname, item.href);
            const isPreparingPath = PREPARING_PATHS.includes(item.href);

            return (
              <li key={item.href} className="min-w-0">
                <Link
                  href={item.href}
                  prefetch={!isPreparingPath}
                  className="flex min-h-14 flex-col items-center justify-center gap-1 py-1.5"
                  aria-current={active ? 'page' : undefined}
                  onPointerEnter={() => {
                    if (isPreparingPath) {
                      return;
                    }
                    void prefetchQueriesForNavHref(queryClient, item.href);
                  }}
                  onClick={(event) => {
                    if (isPreparingPath) {
                      event.preventDefault();
                      setIsPreparingModalOpen(true);
                    }
                  }}
                >
                  <div
                    className="relative flex size-6.5 shrink-0 items-center justify-center"
                    aria-hidden
                  >
                    <Image
                      src={item.iconPath}
                      alt=""
                      width={ICON_PX}
                      height={ICON_PX}
                      unoptimized
                      className={cn(
                        'object-contain transition-opacity duration-200',
                        active ? 'opacity-0' : 'opacity-100',
                      )}
                    />
                    <Image
                      src={item.iconActivePath}
                      alt=""
                      width={ICON_PX}
                      height={ICON_PX}
                      unoptimized
                      className={cn(
                        'absolute inset-0 m-auto object-contain transition-opacity duration-200',
                        active ? 'opacity-100' : 'opacity-0',
                      )}
                    />
                  </div>
                  <span
                    className={cn(
                      'max-w-full truncate text-[11px] leading-tight transition-colors',
                      active
                        ? 'font-bold text-(--brand-classic)'
                        : 'text-mono-dark-gray font-normal',
                    )}
                  >
                    {item.label}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <Modal
        open={isPreparingModalOpen}
        onOpenChange={setIsPreparingModalOpen}
        title="준비중"
        description="아직 준비중인 기능이에요."
        confirmText="확인"
        variant="warning"
        showCancel={false}
      />
    </>
  );
}
