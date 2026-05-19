import type { Detail, MyCosmeticsResponseDTO, ReadListDto } from '@/api/model';
import { resolveFeedPouchImageUrl } from '@/lib/feed-display-image';
import { pickMyCosmeticsHomeThumbnailUrl } from '@/lib/my-cosmetics-display-image';
import { buildMyCosmeticsByIdMap } from '@/lib/pouch-cosmetic-lookup';
import { pickWishListThumbnailUrl } from '@/lib/wish-display-image';

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
  row: Detail,
  wishById: Map<number, ReadListDto>,
): string => {
  const fromHome = String(row.imageUrl ?? '').trim();
  if (fromHome) {
    return fromHome;
  }

  const fromRowFields = pickWishListThumbnailUrl(row as ReadListDto);
  if (fromRowFields) {
    return fromRowFields;
  }

  const id = row.id;
  if (id == null || !Number.isFinite(id)) {
    return '';
  }

  const fromWishList = wishById.get(id);
  if (!fromWishList) {
    return '';
  }

  return pickWishListThumbnailUrl(fromWishList);
};

/** 홈 wishList는 imageUrl이 비어 있을 수 있어 위시 목록 API로 썸네일을 보강합니다. */
export const mapHomeWishItems = (
  rows: Detail[] | undefined,
  wishCosmetics: ReadListDto[] | undefined,
): Detail[] => {
  const wishById = buildWishListByIdMap(wishCosmetics);

  return (rows ?? []).flatMap((row) => {
    const id = row.id;
    if (id == null || !Number.isFinite(id)) {
      return [];
    }

    const imageUrl = resolveHomeWishThumbnailUrl(row, wishById);
    return [{ id, imageUrl } satisfies Detail];
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
