import type { Detail, MyCosmeticsResponseDTO, ReadListDto } from '@/api/model';
import { resolveFeedPouchImageUrl } from '@/lib/feed-display-image';
import { pickMyCosmeticsHomeThumbnailUrl } from '@/lib/my-cosmetics-display-image';
import { resolveDisplayImageSrc } from '@/lib/next-image-src';
import { buildMyCosmeticsByIdMap } from '@/lib/pouch-cosmetic-lookup';
import { resolveMediaUrl } from '@/lib/resolve-media-url';
import {
  pickWishCaptureImageUrl,
  pickWishListThumbnailUrl,
  pickWishOfficialImageUrl,
} from '@/lib/wish-display-image';

/** 홈 wishList — OpenAPI `Detail` 외 런타임 필드 */
export type HomeWishListRow = Detail & {
  wishCosmeticsId?: number | string;
  productImageUrl?: string | null;
  captureImageUrl?: string | null;
};

/** 홈 위시 캐러셀 — 위시 목록 페이지와 동일한 official/capture fallback */
export type HomeWishCarouselItem = Detail & {
  officialImage: string;
  captureImage: string;
};

const resolveHomeWishDisplayUrl = (raw?: string | null): string => {
  return resolveDisplayImageSrc(resolveMediaUrl(raw)).trim();
};

export const parseHomeWishRowId = (row: HomeWishListRow): number | null => {
  const fromId = row.id;
  if (typeof fromId === 'number' && Number.isFinite(fromId) && fromId > 0) {
    return fromId;
  }
  if (typeof fromId === 'string') {
    const parsed = Number.parseInt(fromId, 10);
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
  }
  return parseWishCosmeticsId(row as ReadListDto);
};

export const parseWishCosmeticsId = (row: ReadListDto): number | null => {
  const raw = row.wishCosmeticsId;
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    return raw;
  }
  if (typeof raw === 'string') {
    const parsed = Number.parseInt(raw, 10);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

export const buildWishListByIdMap = (
  items: ReadListDto[] | undefined,
): Map<number, ReadListDto> => {
  const map = new Map<number, ReadListDto>();
  for (const row of items ?? []) {
    const id = parseWishCosmeticsId(row);
    if (id != null) {
      map.set(id, row);
    }
  }
  return map;
};

/** 홈 wishList 행 → 표시용 썸네일 (imageUrl · productImageUrl · 위시 목록 API 순) */
export const resolveHomeWishThumbnailUrl = (
  row: HomeWishListRow,
  wishById: Map<number, ReadListDto>,
  index?: number,
  wishList?: ReadListDto[],
): string => {
  const fromHome = String(row.imageUrl ?? '').trim();
  if (fromHome) {
    return fromHome;
  }

  const fromRowFields = pickWishListThumbnailUrl(row as ReadListDto);
  if (fromRowFields) {
    return fromRowFields;
  }

  const id = parseHomeWishRowId(row);
  if (id != null) {
    const fromWishList = wishById.get(id);
    if (fromWishList) {
      const fromLookup = pickWishListThumbnailUrl(fromWishList);
      if (fromLookup) {
        return fromLookup;
      }
    }
  }

  if (
    index != null &&
    index >= 0 &&
    wishList &&
    index < wishList.length
  ) {
    return pickWishListThumbnailUrl(wishList[index]);
  }

  return '';
};

/** 홈 wishList는 imageUrl이 비어 있을 수 있어 위시 목록 API로 썸네일을 보강합니다. */
export const mapHomeWishItems = (
  rows: Detail[] | undefined,
  wishCosmetics: ReadListDto[] | undefined,
): HomeWishCarouselItem[] => {
  const wishById = buildWishListByIdMap(wishCosmetics);
  const wishList = wishCosmetics ?? [];

  return (rows ?? []).flatMap((row, index) => {
    const homeRow = row as HomeWishListRow;
    const id = parseHomeWishRowId(homeRow);
    if (id == null) {
      return [];
    }

    const lookup =
      wishById.get(id) ??
      (index >= 0 && index < wishList.length ? wishList[index] : undefined);
    const officialImage = lookup ? pickWishOfficialImageUrl(lookup) : '';
    const captureImage = lookup ? pickWishCaptureImageUrl(lookup) : '';
    const thumbnail = resolveHomeWishThumbnailUrl(
      homeRow,
      wishById,
      index,
      wishList,
    );
    const imageUrl = resolveHomeWishDisplayUrl(
      thumbnail || officialImage || captureImage,
    );

    return [
      {
        id,
        imageUrl,
        officialImage,
        captureImage,
      } satisfies HomeWishCarouselItem,
    ];
  });
};

/** 홈 myList는 imageUrl이 비어 있을 수 있어 내 화장품 목록으로 썸네일을 보강합니다. */
export const mapHomeMyPouchItems = (
  rows: Detail[] | undefined,
  myCosmetics: MyCosmeticsResponseDTO[] | undefined,
): Detail[] => {
  const cosmeticsById = buildMyCosmeticsByIdMap(myCosmetics ?? []);

  return (rows ?? []).flatMap((row) => {
    const id = row.id;
    if (id == null || !Number.isFinite(id)) {
      return [];
    }

    const cosmetic = cosmeticsById.get(id);
    const rawImageUrl = cosmetic
      ? pickMyCosmeticsHomeThumbnailUrl(cosmetic, row.imageUrl)
      : String(row.imageUrl ?? '').trim();
    const imageUrl = resolveFeedPouchImageUrl(rawImageUrl);

    return [{ id, imageUrl } satisfies Detail];
  });
};
