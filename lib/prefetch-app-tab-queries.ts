import type { QueryClient } from '@tanstack/react-query';
import { getGetHomeDataQueryOptions } from '@/api/generated/home/home';
import {
  getReadWishCosmeticsListQueryOptions,
} from '@/api/generated/wish-cosmetics/wish-cosmetics';
import {
  getSearchMyCosmeticsQueryOptions,
} from '@/api/generated/my-cosmetics-controller/my-cosmetics-controller';
import {
  getGetMyProfileQueryOptions,
} from '@/api/generated/member-controller/member-controller';
import {
  collectImageUrlsForRoute,
  MY_COSMETICS_DEFAULT_PARAMS,
  WISH_LIST_DEFAULT_PARAMS,
  type RouteImageHref,
} from '@/lib/collect-route-image-urls';
import { preloadImageSrcs } from '@/lib/preload-image-srcs';
import { fetchPouchList, getPouchListQueryKey } from '@/lib/pouch-setup';

type TabHref = '/' | '/wish' | '/my-cosmetics' | '/profile';

const resolveTabHref = (pathname: string): TabHref => {
  if (pathname === '/') {
    return '/';
  }
  if (pathname === '/wish' || pathname.startsWith('/wish/')) {
    return '/wish';
  }
  if (pathname === '/my-cosmetics' || pathname.startsWith('/my-cosmetics/')) {
    return '/my-cosmetics';
  }
  if (pathname === '/profile' || pathname.startsWith('/profile/')) {
    return '/profile';
  }
  return '/';
};

const ADJACENT_TABS: Record<TabHref, TabHref[]> = {
  '/': ['/', '/wish'],
  '/wish': ['/wish', '/'],
  '/my-cosmetics': ['/my-cosmetics', '/wish'],
  '/profile': ['/profile', '/my-cosmetics'],
};

export const warmImagesForRoute = (
  qc: QueryClient,
  href: RouteImageHref,
): void => {
  preloadImageSrcs(collectImageUrlsForRoute(qc, href));
};

const prefetchTabQueries = async (
  qc: QueryClient,
  tab: TabHref,
): Promise<void> => {
  if (tab === '/') {
    await Promise.all([
      qc.prefetchQuery(getGetHomeDataQueryOptions()),
      qc.prefetchQuery(getReadWishCosmeticsListQueryOptions(WISH_LIST_DEFAULT_PARAMS)),
      qc.prefetchQuery(getSearchMyCosmeticsQueryOptions(MY_COSMETICS_DEFAULT_PARAMS)),
    ]);
    return;
  }
  if (tab === '/wish') {
    await qc.prefetchQuery(
      getReadWishCosmeticsListQueryOptions(WISH_LIST_DEFAULT_PARAMS),
    );
    return;
  }
  if (tab === '/my-cosmetics') {
    await Promise.all([
      qc.prefetchQuery(getSearchMyCosmeticsQueryOptions(MY_COSMETICS_DEFAULT_PARAMS)),
      qc.prefetchQuery({
        queryKey: getPouchListQueryKey(),
        queryFn: fetchPouchList,
      }),
    ]);
    return;
  }
  if (tab === '/profile') {
    await qc.prefetchQuery(getGetMyProfileQueryOptions());
  }
};

/** 현재 탭 + 인접 탭 API만 미리 채웁니다 (이미지 warm은 페이지 훅 담당). */
export const prefetchMainAppTabQueries = async (
  qc: QueryClient,
  pathname = '/',
): Promise<void> => {
  const currentTab = resolveTabHref(pathname);
  const tabs = new Set<TabHref>([
    currentTab,
    ...(ADJACENT_TABS[currentTab] ?? []),
  ]);
  await Promise.all([...tabs].map((tab) => prefetchTabQueries(qc, tab)));
};

/** 탭 hover/touch — 해당 화면 API prefetch만 */
export const prefetchQueriesForNavHref = async (
  qc: QueryClient,
  href: string,
): Promise<void> => {
  await prefetchTabQueries(qc, resolveTabHref(href));
};
