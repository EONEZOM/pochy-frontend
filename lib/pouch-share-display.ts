import type {
  FindFeedCosmeticsDto,
  PouchDetailDto,
  PouchItemDetailDto,
} from '@/api/model';
import {
  cosmeticNameBrandKey,
  dedupePouchDetailRowsByProduct,
  getPouchRowMyCosmeticId,
  type PouchDetailEnrichedRow,
} from '@/lib/pouch-cosmetic-lookup';
import { resolveStoredCosmeticCategories } from '@/lib/cosmetic-category-normalize';
import { getCosmeticImageSrc } from '@/lib/pouch-canvas';
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
  const productImageUrl = String(item.productImageUrl ?? '').trim();
  if (productImageUrl) {
    return productImageUrl;
  }
  const imageUrl = String(item.imageUrl ?? '').trim();
  if (imageUrl) {
    return imageUrl;
  }
  return pickMyCosmeticsStickerImageUrl({
    imgUrl: item.imgUrl,
    captureUrl: item.captureUrl,
  });
};

export const buildFeedCosmeticsImageMaps = (
  feedItems: FindFeedCosmeticsDto[] | undefined,
) => {
  const byCosmeticId = new Map<number, string>();
  const byNameBrand = new Map<string, string>();

  for (const item of feedItems ?? []) {
    const imageUrl = String(item.productImageUrl ?? '').trim();
    if (!imageUrl) {
      continue;
    }
    const cosmeticId = item.cosmeticId;
    if (cosmeticId != null && cosmeticId > 0 && !byCosmeticId.has(cosmeticId)) {
      byCosmeticId.set(cosmeticId, imageUrl);
    }
    const nameBrandKey = cosmeticNameBrandKey(item.brand, item.name);
    if (nameBrandKey != null && !byNameBrand.has(nameBrandKey)) {
      byNameBrand.set(nameBrandKey, imageUrl);
    }
  }

  return { byCosmeticId, byNameBrand };
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
): { category?: string; subCategory?: string } => {
  const fromShareCategory = item.category?.trim();
  const fromShareSubCategory = item.subCategory?.trim();
  if (fromShareCategory || fromShareSubCategory) {
    return {
      category: fromShareCategory || undefined,
      subCategory: fromShareSubCategory || undefined,
    };
  }

  const myCosmeticId = getPouchRowMyCosmeticId(item);
  if (myCosmeticId != null) {
    const fromFeed = feedCategories.byCosmeticId.get(myCosmeticId);
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

const resolveShareRowImageSrc = (
  item: SharePouchItemDetailDto,
  feedImages: ReturnType<typeof buildFeedCosmeticsImageMaps>,
): string => {
  const fromShare = resolveShareRowImageRaw(item);
  if (fromShare) {
    return getCosmeticImageSrc({ imgUrl: fromShare, captureUrl: fromShare });
  }

  const myCosmeticId = getPouchRowMyCosmeticId(item);
  if (myCosmeticId != null) {
    const fromFeed = feedImages.byCosmeticId.get(myCosmeticId);
    if (fromFeed) {
      return getCosmeticImageSrc({ imgUrl: fromFeed, captureUrl: fromFeed });
    }
  }

  const nameBrandKey = cosmeticNameBrandKey(item.brand, item.name);
  if (nameBrandKey != null) {
    const fromFeed = feedImages.byNameBrand.get(nameBrandKey);
    if (fromFeed) {
      return getCosmeticImageSrc({ imgUrl: fromFeed, captureUrl: fromFeed });
    }
  }

  return '';
};

export const buildPouchPublicShareDisplayRows = (
  cosmetics: SharePouchItemDetailDto[] | undefined,
  feedItems: FindFeedCosmeticsDto[] | undefined,
): PouchPublicShareDisplayRow[] => {
  const feedImages = buildFeedCosmeticsImageMaps(feedItems);
  const feedCategories = buildFeedCosmeticsCategoryMaps(feedItems);
  const enriched: PouchDetailEnrichedRow[] = (cosmetics ?? []).map((item) => {
    const mergedCategories = resolveShareRowCategories(item, feedCategories);
    const { main, sub } = resolveStoredCosmeticCategories(
      mergedCategories.category,
      mergedCategories.subCategory,
    );

    return {
      ...item,
      imgUrl: item.imgUrl ?? undefined,
      captureUrl: item.captureUrl ?? undefined,
      category: main,
      subCategory: sub,
    };
  });

  return dedupePouchDetailRowsByProduct(enriched).map((item) => ({
    ...item,
    imageSrc: resolveShareRowImageSrc(item, feedImages),
  }));
};

export const resolvePouchPublicCompositeImageUrl = (
  shareDetail: SharePouchDetailDto | undefined,
): string | null => {
  const candidates = [shareDetail?.imageUrl, shareDetail?.pouchImageUrl];

  for (const raw of candidates) {
    const trimmed = String(raw ?? '').trim();
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
