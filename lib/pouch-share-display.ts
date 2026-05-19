import type {
  FindFeedCosmeticsDto,
  PouchDetailDto,
  PouchItemDetailDto,
} from '@/api/model';
import {
  cosmeticNameBrandKey,
  dedupePouchDetailRowsByProduct,
  type PouchDetailEnrichedRow,
} from '@/lib/pouch-cosmetic-lookup';

type PouchItemWithCosmeticId = SharePouchItemDetailDto & {
  cosmeticId?: number;
};
import { resolveStoredCosmeticCategories } from '@/lib/cosmetic-category-normalize';
import { resolveFeedPouchImageUrl } from '@/lib/feed-display-image';
import { pickMyCosmeticsStickerImageUrl } from '@/lib/my-cosmetics-display-image';
import { resolveDisplayImageSrc } from '@/lib/next-image-src';
import { resolveMediaUrl } from '@/lib/resolve-media-url';

/** share API 응답에 OpenAPI 미반영 이미지 필드가 올 수 있음 */
export type SharePouchItemDetailDto = PouchItemDetailDto & {
  imgUrl?: string | null;
  captureUrl?: string | null;
  productImageUrl?: string | null;
  imageUrl?: string | null;
};

export type SharePouchDetailDto = PouchDetailDto & {
  imageUrl?: string | null;
  pouchImageUrl?: string | null;
};

export type PouchPublicShareDisplayRow = PouchDetailEnrichedRow & {
  imageSrc: string;
};

type FeedCategoryEntry = {
  category?: string;
  subCategory?: string;
};

const resolveShareRowImageRaw = (item: SharePouchItemDetailDto): string => {
  const productImageUrl = resolveFeedPouchImageUrl(
    String(item.productImageUrl ?? '').trim(),
  );
  if (productImageUrl) {
    return productImageUrl;
  }
  const imageUrl = resolveFeedPouchImageUrl(String(item.imageUrl ?? '').trim());
  if (imageUrl) {
    return imageUrl;
  }
  return resolveFeedPouchImageUrl(
    pickMyCosmeticsStickerImageUrl({
      imgUrl: item.imgUrl,
      captureUrl: item.captureUrl,
    }),
  );
};

const isSharePouchRowId = (
  item: SharePouchItemDetailDto,
  candidateId: number,
): boolean => {
  const rowId = item.id;
  return rowId != null && rowId > 0 && rowId === candidateId;
};

export const buildFeedCosmeticsMaps = (
  feedItems: FindFeedCosmeticsDto[] | undefined,
) => {
  const byCosmeticId = new Map<number, FindFeedCosmeticsDto>();
  const byNameBrand = new Map<string, FindFeedCosmeticsDto>();

  for (const item of feedItems ?? []) {
    const cosmeticId = item.cosmeticId;
    if (cosmeticId != null && cosmeticId > 0 && !byCosmeticId.has(cosmeticId)) {
      byCosmeticId.set(cosmeticId, item);
    }
    const nameBrandKey = cosmeticNameBrandKey(item.brand, item.name);
    if (nameBrandKey != null && !byNameBrand.has(nameBrandKey)) {
      byNameBrand.set(nameBrandKey, item);
    }
  }

  return { byCosmeticId, byNameBrand };
};

/**
 * Feed cosmetics 조회용 내 화장품 ID.
 * 파우치 행 `id`를 화장품 ID로 오인하지 않도록 Feed 맵으로 검증합니다.
 */
export const getShareRowFeedCosmeticId = (
  item: SharePouchItemDetailDto,
  feedByCosmeticId: Map<number, FindFeedCosmeticsDto>,
): number | undefined => {
  const resolveCandidate = (candidateId: number | undefined): number | undefined => {
    if (candidateId == null || candidateId <= 0) {
      return undefined;
    }
    if (isSharePouchRowId(item, candidateId)) {
      return feedByCosmeticId.has(candidateId) ? candidateId : undefined;
    }
    return feedByCosmeticId.has(candidateId) ? candidateId : undefined;
  };

  const fromMyCosmeticId = resolveCandidate(item.myCosmeticId);
  if (fromMyCosmeticId != null) {
    return fromMyCosmeticId;
  }

  const fromCosmeticId = resolveCandidate(
    (item as PouchItemWithCosmeticId).cosmeticId,
  );
  if (fromCosmeticId != null) {
    return fromCosmeticId;
  }

  const rowId = item.id;
  if (rowId != null && rowId > 0 && feedByCosmeticId.has(rowId)) {
    return rowId;
  }

  return undefined;
};

const resolveShareFeedItem = (
  item: SharePouchItemDetailDto,
  feedMaps: ReturnType<typeof buildFeedCosmeticsMaps>,
  feedItems: FindFeedCosmeticsDto[] | undefined,
  cosmeticsCount: number,
  index: number,
): FindFeedCosmeticsDto | undefined => {
  const lookupId = getShareRowFeedCosmeticId(item, feedMaps.byCosmeticId);
  if (lookupId != null) {
    const fromId = feedMaps.byCosmeticId.get(lookupId);
    if (fromId) {
      return fromId;
    }
  }

  const nameBrandKey = cosmeticNameBrandKey(item.brand, item.name);
  if (nameBrandKey != null) {
    const fromNameBrand = feedMaps.byNameBrand.get(nameBrandKey);
    if (fromNameBrand) {
      return fromNameBrand;
    }
  }

  if (
    feedItems &&
    feedItems.length === cosmeticsCount &&
    feedItems[index] != null
  ) {
    return feedItems[index];
  }

  return undefined;
};

export const buildFeedCosmeticsCategoryMaps = (
  feedItems: FindFeedCosmeticsDto[] | undefined,
) => {
  const byCosmeticId = new Map<number, FeedCategoryEntry>();
  const byNameBrand = new Map<string, FeedCategoryEntry>();

  for (const item of feedItems ?? []) {
    const category = item.category?.trim();
    const subCategory = item.subCategory?.trim();
    if (!category && !subCategory) {
      continue;
    }

    const entry: FeedCategoryEntry = {
      category: category || undefined,
      subCategory: subCategory || undefined,
    };

    const cosmeticId = item.cosmeticId;
    if (cosmeticId != null && cosmeticId > 0 && !byCosmeticId.has(cosmeticId)) {
      byCosmeticId.set(cosmeticId, entry);
    }

    const nameBrandKey = cosmeticNameBrandKey(item.brand, item.name);
    if (nameBrandKey != null && !byNameBrand.has(nameBrandKey)) {
      byNameBrand.set(nameBrandKey, entry);
    }
  }

  return { byCosmeticId, byNameBrand };
};

const resolveShareRowCategories = (
  item: SharePouchItemDetailDto,
  feedCategories: ReturnType<typeof buildFeedCosmeticsCategoryMaps>,
  feedByCosmeticId: Map<number, FindFeedCosmeticsDto>,
): { category?: string; subCategory?: string } => {
  const fromShareCategory = item.category?.trim();
  const fromShareSubCategory = item.subCategory?.trim();
  if (fromShareCategory || fromShareSubCategory) {
    return {
      category: fromShareCategory || undefined,
      subCategory: fromShareSubCategory || undefined,
    };
  }

  const feedCosmeticId = getShareRowFeedCosmeticId(item, feedByCosmeticId);
  if (feedCosmeticId != null) {
    const fromFeed = feedCategories.byCosmeticId.get(feedCosmeticId);
    if (fromFeed) {
      return fromFeed;
    }
  }

  const nameBrandKey = cosmeticNameBrandKey(item.brand, item.name);
  if (nameBrandKey != null) {
    const fromFeed = feedCategories.byNameBrand.get(nameBrandKey);
    if (fromFeed) {
      return fromFeed;
    }
  }

  return {};
};

const resolveShareRowImageSrc = (item: SharePouchItemDetailDto): string => {
  const fromShare = resolveShareRowImageRaw(item);
  if (!fromShare) {
    return '';
  }
  return resolveDisplayImageSrc(resolveMediaUrl(fromShare));
};

export const buildPouchPublicShareDisplayRows = (
  cosmetics: SharePouchItemDetailDto[] | undefined,
  feedItems: FindFeedCosmeticsDto[] | undefined,
): PouchPublicShareDisplayRow[] => {
  const feedMaps = buildFeedCosmeticsMaps(feedItems);
  const feedCategories = buildFeedCosmeticsCategoryMaps(feedItems);
  const cosmeticsList = cosmetics ?? [];
  const enriched: PouchDetailEnrichedRow[] = cosmeticsList.map((item, index) => {
    const feedItem = resolveShareFeedItem(
      item,
      feedMaps,
      feedItems,
      cosmeticsList.length,
      index,
    );
    const mergedCategories = resolveShareRowCategories(
      item,
      feedCategories,
      feedMaps.byCosmeticId,
    );
    const { main, sub } = resolveStoredCosmeticCategories(
      mergedCategories.category,
      mergedCategories.subCategory,
    );

    const feedImageUrl = resolveFeedPouchImageUrl(
      String(feedItem?.productImageUrl ?? '').trim(),
    );

    return {
      ...item,
      brand: (item.brand ?? '').trim() || feedItem?.brand,
      name: (item.name ?? '').trim() || feedItem?.name,
      productImageUrl:
        resolveFeedPouchImageUrl(String(item.productImageUrl ?? '').trim()) ||
        feedImageUrl ||
        undefined,
      imgUrl:
        resolveFeedPouchImageUrl(String(item.imgUrl ?? '').trim()) ||
        feedImageUrl ||
        undefined,
      captureUrl:
        resolveFeedPouchImageUrl(String(item.captureUrl ?? '').trim()) ||
        undefined,
      category: main,
      subCategory: sub,
    };
  });

  return dedupePouchDetailRowsByProduct(enriched).map((item) => ({
    ...item,
    imageSrc: resolveShareRowImageSrc(item),
  }));
};

export const resolvePouchPublicCompositeImageUrl = (
  shareDetail: SharePouchDetailDto | undefined,
): string | null => {
  const candidates = [shareDetail?.imageUrl, shareDetail?.pouchImageUrl];

  for (const raw of candidates) {
    const trimmed = resolveFeedPouchImageUrl(String(raw ?? '').trim());
    if (!trimmed) {
      continue;
    }
    const resolved = resolveDisplayImageSrc(resolveMediaUrl(trimmed));
    if (resolved.trim()) {
      return resolved;
    }
  }

  return null;
};
