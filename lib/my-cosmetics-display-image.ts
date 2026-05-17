import type { MyCosmeticsResponseDTO } from '@/api/model';

/** 홈 My Pouch 타일 등 단일 썸네일 — 누끼(capture) 우선 */
export const pickMyCosmeticsHomeThumbnailUrl = (
  row: MyCosmeticsResponseDTO,
  homeFallback?: string,
): string => {
  const capture = String(row.captureUrl ?? '').trim();
  if (capture) {
    return capture;
  }
  const official = String(row.imgUrl ?? '').trim();
  if (official) {
    return official;
  }
  return String(homeFallback ?? '').trim();
};
