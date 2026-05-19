import type { Detail, MyCosmeticsResponseDTO } from '@/api/model';
import { resolveFeedPouchImageUrl } from '@/lib/feed-display-image';
import { pickMyCosmeticsHomeThumbnailUrl } from '@/lib/my-cosmetics-display-image';
import { buildMyCosmeticsByIdMap } from '@/lib/pouch-cosmetic-lookup';

export const mapHomeDetailRows = (rows: Detail[] | undefined): Detail[] => {
  return (rows ?? []).flatMap((row) => {
    const id = row.id;
    if (id == null || !Number.isFinite(id)) {
      return [];
    }
    return [{ id, imageUrl: String(row.imageUrl ?? '').trim() } satisfies Detail];
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
