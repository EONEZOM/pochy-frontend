'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';

import { prefetchMainAppTabQueries } from '@/lib/prefetch-app-tab-queries';
import { preloadMainHomeAssets } from '@/lib/preload-main-home-assets';

const AUTH_PATH_PREFIXES = [
  '/opening',
  '/login',
  '/verify',
  '/success',
  '/nickname',
  '/auth',
  '/share/pouch',
] as const;
const PRE_HOME_PATH_PREFIXES = ['/success', '/nickname'] as const;

const isAuthLikePath = (pathname: string): boolean => {
  return AUTH_PATH_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
};

const isPreHomePath = (pathname: string): boolean => {
  return PRE_HOME_PATH_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
};

const scheduleEarlyPrefetch = (fn: () => void): void => {
  if (typeof requestAnimationFrame === 'function') {
    requestAnimationFrame(() => {
      setTimeout(fn, 100);
    });
    return;
  }
  setTimeout(fn, 100);
};

/**
 * 메인 앱 하단 탭에 해당하는 API를 앱 진입 직후 미리 채웁니다.
 * 이미지 warm은 각 페이지의 useWarmRouteImages 훅이 담당합니다.
 */
export function NavRouteDataPrefetch() {
  const pathname = usePathname() ?? '/';
  const queryClient = useQueryClient();

  useEffect(() => {
    const shouldPrefetchTabs = !isAuthLikePath(pathname);
    const shouldPreloadMainHome =
      shouldPrefetchTabs || isPreHomePath(pathname);
    if (!shouldPreloadMainHome && !shouldPrefetchTabs) {
      return;
    }
    let cancelled = false;
    scheduleEarlyPrefetch(() => {
      if (cancelled) {
        return;
      }
      if (shouldPreloadMainHome) {
        preloadMainHomeAssets();
      }
      if (shouldPrefetchTabs) {
        void prefetchMainAppTabQueries(queryClient, pathname);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [pathname, queryClient]);

  return null;
}
