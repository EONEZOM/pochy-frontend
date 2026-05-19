import type { QueryClient } from '@tanstack/react-query';

import { getGetHomeDataQueryKey } from '@/api/generated/home/home';
import {
  getReadWishCosmeticsListQueryKey,
} from '@/api/generated/wish-cosmetics/wish-cosmetics';
import {
  getSearchMyCosmeticsQueryKey,
} from '@/api/generated/my-cosmetics-controller/my-cosmetics-controller';
import { getGetMyProfileQueryKey } from '@/api/generated/member-controller/member-controller';
import type {
  ApiResponseDTOGetHomeData,
  ApiResponseDTOPouchListDto,
  ApiResponseDTOProfileDto,
  ApiResponseDTOSliceMyCosmeticsResponseDTO,
  ApiResponseDTOSliceReadListDto,
  Detail,
  MyCosmeticsResponseDTO,
  ReadListDto,
} from '@/api/model';
import { resolveFeedPouchImageUrl } from '@/lib/feed-display-image';
import {
  buildWishListByIdMap,
  resolveHomeWishThumbnailUrl,
} from '@/lib/home-display';
import {
  getMyCosmeticsWishCardImageProps,
  pickMyCosmeticsHomeThumbnailUrl,
  pickMyCosmeticsStickerImageUrl,
} from '@/lib/my-cosmetics-display-image';
import { resolveDisplayImageSrc } from '@/lib/next-image-src';
import { getPouchListQueryKey } from '@/lib/pouch-setup';
import { resolveMediaUrl } from '@/lib/resolve-media-url';
import {
  pickWishCaptureImageUrl,
  pickWishListThumbnailUrl,
  pickWishOfficialImageUrl,
} from '@/lib/wish-display-image';

/** `/wish` 기본 URL과 동일 */
export const WISH_LIST_DEFAULT_PARAMS = { sort: 'desc', size: 100 } as const;

/** `/my-cosmetics` 기본 목록과 동일 */
export const MY_COSMETICS_DEFAULT_PARAMS = { sort: 'desc', size: 100 } as const;

export const resolvePrefetchImageSrc = (value?: string | null): string => {
  return resolveDisplayImageSrc(resolveMediaUrl(value)).trim();
};

const pushUnique = (out: string[], seen: Set<string>, raw?: string | null) => {
  const resolved = resolvePrefetchImageSrc(raw);
  if (!resolved || seen.has(resolved)) {
    return;
  }
  seen.add(resolved);
  out.push(resolved);
};

const pushWishCardUrls = (
  out: string[],
  seen: Set<string>,
  row: ReadListDto | MyCosmeticsResponseDTO,
  mode: 'wish' | 'my',
) => {
  if (mode === 'wish') {
    pushUnique(out, seen, pickWishOfficialImageUrl(row as ReadListDto));
    pushUnique(out, seen, pickWishCaptureImageUrl(row as ReadListDto));
    return;
  }
  const props = getMyCosmeticsWishCardImageProps(row as MyCosmeticsResponseDTO);
  pushUnique(out, seen, props.officialImage);
  pushUnique(out, seen, props.captureImage);
};

export const collectHomeRouteImageUrls = (qc: QueryClient): string[] => {
  const out: string[] = [];
  const seen = new Set<string>();

  const home = qc.getQueryData<ApiResponseDTOGetHomeData>(getGetHomeDataQueryKey());
  const myCosmeticsById = new Map<number, MyCosmeticsResponseDTO>();
  for (const item of qc.getQueryData<ApiResponseDTOSliceMyCosmeticsResponseDTO>(
    getSearchMyCosmeticsQueryKey(MY_COSMETICS_DEFAULT_PARAMS),
  )?.result?.content ?? []) {
    if (item.id != null) {
      myCosmeticsById.set(item.id, item as MyCosmeticsResponseDTO);
    }
  }

  const wishById = buildWishListByIdMap(
    qc.getQueryData<ApiResponseDTOSliceReadListDto>(
      getReadWishCosmeticsListQueryKey(WISH_LIST_DEFAULT_PARAMS),
    )?.result?.content,
  );
  for (const row of home?.result?.wishList ?? []) {
    pushUnique(out, seen, resolveHomeWishThumbnailUrl(row, wishById));
  }

  for (const row of home?.result?.myList ?? []) {
    const id = row.id;
    const cosmetic = id != null ? myCosmeticsById.get(id) : undefined;
    const rawImageUrl = cosmetic
      ? pickMyCosmeticsHomeThumbnailUrl(cosmetic, row.imageUrl)
      : String(row.imageUrl ?? '').trim();
    pushUnique(out, seen, resolveFeedPouchImageUrl(rawImageUrl));
  }

  for (const row of home?.result?.feed ?? []) {
    pushUnique(out, seen, resolveFeedPouchImageUrl(row.imageUrl));
  }

  return out;
};

export const collectWishListImageUrls = (qc: QueryClient): string[] => {
  const out: string[] = [];
  const seen = new Set<string>();
  const wish = qc.getQueryData<ApiResponseDTOSliceReadListDto>(
    getReadWishCosmeticsListQueryKey(WISH_LIST_DEFAULT_PARAMS),
  );
  for (const row of wish?.result?.content ?? []) {
    pushUnique(out, seen, pickWishListThumbnailUrl(row as ReadListDto));
  }
  return out;
};

export const collectMyCosmeticsListImageUrls = (qc: QueryClient): string[] => {
  const out: string[] = [];
  const seen = new Set<string>();
  const my = qc.getQueryData<ApiResponseDTOSliceMyCosmeticsResponseDTO>(
    getSearchMyCosmeticsQueryKey(MY_COSMETICS_DEFAULT_PARAMS),
  );
  for (const row of my?.result?.content ?? []) {
    pushUnique(out, seen, pickMyCosmeticsStickerImageUrl(row));
    pushWishCardUrls(out, seen, row as MyCosmeticsResponseDTO, 'my');
  }
  return out;
};

export const collectPouchListImageUrls = (qc: QueryClient): string[] => {
  const out: string[] = [];
  const seen = new Set<string>();
  const pouch = qc.getQueryData<ApiResponseDTOPouchListDto>(getPouchListQueryKey());
  for (const row of pouch?.result?.pouchList ?? []) {
    pushUnique(out, seen, row.imageUrl);
  }
  return out;
};

export const collectProfileImageUrls = (qc: QueryClient): string[] => {
  const out: string[] = [];
  const seen = new Set<string>();
  const profile = qc.getQueryData<ApiResponseDTOProfileDto>(
    getGetMyProfileQueryKey(),
  );
  pushUnique(out, seen, profile?.result?.profileImageUrl);
  return out;
};

export const collectWishDetailCarouselUrls = (
  qc: QueryClient,
  wishId?: number,
): string[] => {
  const out: string[] = [];
  const seen = new Set<string>();
  const wish = qc.getQueryData<ApiResponseDTOSliceReadListDto>(
    getReadWishCosmeticsListQueryKey(WISH_LIST_DEFAULT_PARAMS),
  );
  for (const row of wish?.result?.content ?? []) {
    if (wishId != null) {
      const rawId = row.wishCosmeticsId;
      const id =
        typeof rawId === 'number'
          ? rawId
          : typeof rawId === 'string'
            ? Number.parseInt(rawId, 10)
            : NaN;
      if (Number.isFinite(id) && id !== wishId) {
        continue;
      }
    }
    pushWishCardUrls(out, seen, row as ReadListDto, 'wish');
  }
  return out;
};

export const collectMyCosmeticDetailUrls = (
  qc: QueryClient,
  cosmeticId?: number,
): string[] => {
  const out: string[] = [];
  const seen = new Set<string>();
  const my = qc.getQueryData<ApiResponseDTOSliceMyCosmeticsResponseDTO>(
    getSearchMyCosmeticsQueryKey(MY_COSMETICS_DEFAULT_PARAMS),
  );
  for (const row of my?.result?.content ?? []) {
    if (cosmeticId != null && row.id !== cosmeticId) {
      continue;
    }
    pushWishCardUrls(out, seen, row as MyCosmeticsResponseDTO, 'my');
  }
  return out;
};

export const collectAllTabImageUrls = (qc: QueryClient): string[] => {
  const seen = new Set<string>();
  const merged: string[] = [];
  const batches = [
    collectHomeRouteImageUrls(qc),
    collectWishListImageUrls(qc),
    collectMyCosmeticsListImageUrls(qc),
    collectPouchListImageUrls(qc),
    collectProfileImageUrls(qc),
  ];
  for (const batch of batches) {
    for (const url of batch) {
      if (!seen.has(url)) {
        seen.add(url);
        merged.push(url);
      }
    }
  }
  return merged;
};

export type RouteImageHref =
  | '/'
  | '/wish'
  | '/my-cosmetics'
  | '/profile'
  | string;

export const collectImageUrlsForRoute = (
  qc: QueryClient,
  href: RouteImageHref,
): string[] => {
  switch (href) {
    case '/':
      return collectHomeRouteImageUrls(qc);
    case '/wish':
      return collectWishListImageUrls(qc);
    case '/my-cosmetics':
      return [
        ...collectMyCosmeticsListImageUrls(qc),
        ...collectPouchListImageUrls(qc),
      ];
    case '/profile':
      return collectProfileImageUrls(qc);
    default:
      if (href.startsWith('/wish/')) {
        const id = Number.parseInt(href.replace('/wish/', ''), 10);
        if (Number.isFinite(id)) {
          return collectWishDetailCarouselUrls(qc, id);
        }
      }
      if (href.startsWith('/my-cosmetics/')) {
        const id = Number.parseInt(href.replace('/my-cosmetics/', ''), 10);
        if (Number.isFinite(id)) {
          return collectMyCosmeticDetailUrls(qc, id);
        }
      }
      return [];
  }
};

export const collectMyCosmeticsItemUrls = (
  items: MyCosmeticsResponseDTO[],
): string[] => {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const row of items) {
    pushWishCardUrls(out, seen, row, 'my');
  }
  return out;
};

/** 홈 3섹션 carousel — item.imageUrl은 호출부에서 이미 display URL로 resolve됨 */
export const collectHomeSectionImageUrls = (
  sections: ReadonlyArray<{ items: Detail[] }>,
): string[] => {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const section of sections) {
    for (const item of section.items) {
      pushUnique(out, seen, item.imageUrl);
    }
  }
  return out;
};

/** Wish 리스트 그리드 — primary(official) 썸네일만 */
export const collectWishListDisplayUrls = (
  items: ReadonlyArray<{
    official_image?: string | null;
    capture_image?: string | null;
  }>,
): string[] => {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const item of items) {
    pushUnique(out, seen, item.official_image);
  }
  return out;
};

/** Wish 상세 carousel */
export const collectWishCarouselUrls = (rows: ReadListDto[]): string[] => {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    pushWishCardUrls(out, seen, row, 'wish');
  }
  return out;
};

/** 파우치 홈 carousel */
export const collectPouchListDisplayUrls = (
  pouches: ReadonlyArray<{ imageUrl?: string | null }>,
): string[] => {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const pouch of pouches) {
    pushUnique(out, seen, pouch.imageUrl);
  }
  return out;
};

/** 파우치 공개 공유 뷰 */
export const collectPouchShareDisplayUrls = (
  displayImageUrl: string | null | undefined,
  displayRows: ReadonlyArray<{ imageSrc?: string | null }>,
): string[] => {
  const out: string[] = [];
  const seen = new Set<string>();
  pushUnique(out, seen, displayImageUrl);
  for (const row of displayRows) {
    pushUnique(out, seen, row.imageSrc);
  }
  return out;
};
