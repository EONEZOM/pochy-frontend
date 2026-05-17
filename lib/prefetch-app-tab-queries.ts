import type { QueryClient } from '@tanstack/react-query';
import { getGetHomeDataQueryKey, getGetHomeDataQueryOptions } from '@/api/generated/home/home';
import {
  getReadWishCosmeticsListQueryKey,
  getReadWishCosmeticsListQueryOptions,
} from '@/api/generated/wish-cosmetics/wish-cosmetics';
import {
  getSearchMyCosmeticsQueryKey,
  getSearchMyCosmeticsQueryOptions,
} from '@/api/generated/my-cosmetics-controller/my-cosmetics-controller';
import {
  getGetMyProfileQueryKey,
  getGetMyProfileQueryOptions,
} from '@/api/generated/member-controller/member-controller';
import type { ApiResponseDTOGetHomeData } from '@/api/model';
import type { ApiResponseDTOSliceMyCosmeticsResponseDTO } from '@/api/model';
import type { ApiResponseDTOSliceReadListDto } from '@/api/model';
import type { ApiResponseDTOProfileDto } from '@/api/model';
import type { Detail } from '@/api/model';
import type { ReadListDto } from '@/api/model';
import { resolveDisplayImageSrc } from '@/lib/next-image-src';
import { pickWishListThumbnailUrl } from '@/lib/wish-display-image';
import { resolveMediaUrl } from '@/lib/resolve-media-url';
import { preloadImageSrcs } from '@/lib/preload-image-srcs';

/** `/wish` 기본 URL(필터 없음)과 동일한 쿼리 키 — `JSON.stringify` 시 undefined 키는 생략되어 홈과 맞습니다. */
const WISH_LIST_DEFAULT_PARAMS = { sort: 'desc', size: 100 } as const;

/** `/my-cosmetics` 기본 목록과 동일 */
const MY_COSMETICS_DEFAULT_PARAMS = { sort: 'desc', size: 100 } as const;

const resolvePrefetchImageSrc = (value?: string): string => {
  return resolveDisplayImageSrc(resolveMediaUrl(value)).trim();
};

const pushDetailThumb = (out: string[], item?: Detail) => {
  const resolved = resolvePrefetchImageSrc(item?.imageUrl);
  if (resolved && out.length < 24) {
    out.push(resolved);
  }
};

const collectWarmUrlsFromCaches = (qc: QueryClient): string[] => {
  const out: string[] = [];

  const home = qc.getQueryData<ApiResponseDTOGetHomeData>(getGetHomeDataQueryKey());
  for (const row of home?.result?.myList ?? []) {
    pushDetailThumb(out, row);
  }
  for (const row of home?.result?.feed ?? []) {
    pushDetailThumb(out, row);
  }
  for (const row of home?.result?.wishList ?? []) {
    pushDetailThumb(out, row);
  }

  const wish = qc.getQueryData<ApiResponseDTOSliceReadListDto>(
    getReadWishCosmeticsListQueryKey(WISH_LIST_DEFAULT_PARAMS),
  );
  for (const row of wish?.result?.content ?? []) {
    const u = pickWishListThumbnailUrl(row as ReadListDto).trim();
    if (u && out.length < 24) {
      const resolved = resolvePrefetchImageSrc(u);
      if (resolved) {
        out.push(resolved);
      }
    }
  }

  const my = qc.getQueryData<ApiResponseDTOSliceMyCosmeticsResponseDTO>(
    getSearchMyCosmeticsQueryKey(MY_COSMETICS_DEFAULT_PARAMS),
  );
  for (const row of my?.result?.content ?? []) {
    const primary =
      String(row.imgUrl ?? '').trim() || String(row.captureUrl ?? '').trim();
    if (primary && out.length < 24) {
      const resolved = resolvePrefetchImageSrc(primary);
      if (resolved) {
        out.push(resolved);
      }
    }
  }

  const profile = qc.getQueryData<ApiResponseDTOProfileDto>(
    getGetMyProfileQueryKey(),
  );
  const avatar = resolvePrefetchImageSrc(profile?.result?.profileImageUrl);
  if (avatar && out.length < 24) {
    out.push(avatar);
  }

  return out;
};

export const warmCachedTabImages = (qc: QueryClient): void => {
  preloadImageSrcs(collectWarmUrlsFromCaches(qc));
};

/** 하단 탭 주요 화면 API를 한꺼번에 미리 채웁니다. */
export const prefetchMainAppTabQueries = async (
  qc: QueryClient,
): Promise<void> => {
  await Promise.all([
    qc.prefetchQuery(getGetHomeDataQueryOptions()),
    qc.prefetchQuery(getReadWishCosmeticsListQueryOptions(WISH_LIST_DEFAULT_PARAMS)),
    qc.prefetchQuery(getSearchMyCosmeticsQueryOptions(MY_COSMETICS_DEFAULT_PARAMS)),
    qc.prefetchQuery(getGetMyProfileQueryOptions()),
  ]);
  warmCachedTabImages(qc);
};

/** 탭 hover 등 — 해당 화면에 맞춰 최소 요청만 수행합니다. */
export const prefetchQueriesForNavHref = async (
  qc: QueryClient,
  href: string,
): Promise<void> => {
  if (href === '/') {
    await Promise.all([
      qc.prefetchQuery(getGetHomeDataQueryOptions()),
      qc.prefetchQuery(getReadWishCosmeticsListQueryOptions(WISH_LIST_DEFAULT_PARAMS)),
    ]);
    warmCachedTabImages(qc);
    return;
  }
  if (href === '/wish') {
    await qc.prefetchQuery(
      getReadWishCosmeticsListQueryOptions(WISH_LIST_DEFAULT_PARAMS),
    );
    warmCachedTabImages(qc);
    return;
  }
  if (href === '/my-cosmetics') {
    await qc.prefetchQuery(
      getSearchMyCosmeticsQueryOptions(MY_COSMETICS_DEFAULT_PARAMS),
    );
    warmCachedTabImages(qc);
    return;
  }
  if (href === '/profile') {
    await qc.prefetchQuery(getGetMyProfileQueryOptions());
    warmCachedTabImages(qc);
  }
};
