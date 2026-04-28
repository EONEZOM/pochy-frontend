'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { Modal } from '@/components/common/Modal';
import { cn } from '@/lib/utils';

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
    label: '홈',
    iconPath: '/icons/BottomNav/home.svg',
    iconActivePath: '/icons/BottomNav/home-af.svg',
  },
  {
    href: '/my',
    label: '내 정보',
    iconPath: '/icons/BottomNav/my.svg',
    iconActivePath: '/icons/BottomNav/my-af.svg',
  },
  {
    href: '/wish',
    label: '위시',
    iconPath: '/icons/BottomNav/wish.svg',
    iconActivePath: '/icons/BottomNav/wish-af.svg',
  },
  {
    href: '/feed',
    label: '피드',
    iconPath: '/icons/BottomNav/feed.svg',
    iconActivePath: '/icons/BottomNav/feed-af.svg',
  },
  {
    href: '/profile',
    label: '프로필',
    iconPath: '/icons/BottomNav/profile.svg',
    iconActivePath: '/icons/BottomNav/profile-af.svg',
  },
];

const ICON_PX = 24;
const BOTTOM_NAV_HIDDEN_PATHS = ['/login', '/verify', '/success'];
const PREPARING_PATHS = ['/my', '/feed'];

function isNavActive(pathname: string, href: string) {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function BottomNav({ className }: { className?: string }) {
  const pathname = usePathname() ?? '/';
  const [isPreparingModalOpen, setIsPreparingModalOpen] = useState(false);
  const shouldHideBottomNav = BOTTOM_NAV_HIDDEN_PATHS.some((path) => {
    return pathname === path || pathname.startsWith(`${path}/`);
  });

  if (shouldHideBottomNav) {
    return null;
  }

  return (
    <>
      <nav
        className={cn(
          'border-mono-bright-gray bg-mono-white border-t pb-(--safe-area-bottom)',
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
