'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';

import { prefetchMainAppTabQueries } from '@/lib/prefetch-app-tab-queries';
import { preloadMainHomeAssets } from '@/lib/preload-main-home-assets';

const AUTH_PATH_PREFIXES = ['/login', '/verify', '/success', '/nickname', '/auth'] as const;
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

const scheduleIdle = (fn: () => void): void => {
  if (typeof requestIdleCallback === 'function') {
    requestIdleCallback(() => fn(), { timeout: 2800 });
  } else {
    setTimeout(fn, 320);
  }
};

/**
 * 메인 앱 하단 탭에 해당하는 API·썸네일을 유휴 시점에 미리 채워,
 * 탭 전환 직후 리스트·이미지가 바로 보이도록 합니다.
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
    scheduleIdle(() => {
      if (cancelled) {
        return;
      }
      if (shouldPreloadMainHome) {
        preloadMainHomeAssets();
      }
      if (shouldPrefetchTabs) {
        void prefetchMainAppTabQueries(queryClient);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [pathname, queryClient]);

  return null;
}
