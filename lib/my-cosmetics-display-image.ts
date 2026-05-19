import type { MyCosmeticsResponseDTO } from '@/api/model';
import { urlReferencesNaverShoppingCdn } from '@/lib/wish-display-image';

type MyCosmeticsImageFields = {
  captureUrl?: string | null;
  imgUrl?: string | null;
};

/**
 * 파우치 스티커·썸네일.
 * 백엔드가 네이버 공식(또는 media-proxy로 감싼 네이버 URL)을 imgUrl에 두고
 * 누끼(direct)를 captureUrl에 둘 수 있어, imgUrl이 공식이면 captureUrl 우선.
 */
export const pickMyCosmeticsStickerImageUrl = (
  row: MyCosmeticsImageFields,
): string => {
  const img = String(row.imgUrl ?? '').trim();
  const capture = String(row.captureUrl ?? '').trim();

  if (img && capture && urlReferencesNaverShoppingCdn(img)) {
    return capture;
  }
  if (img) {
    return img;
  }
  return capture;
};

/** WishCardImage props — sticker URL을 official 슬롯에, 나머지를 capture 폴백에 */
export const getMyCosmeticsWishCardImageProps = (
  row: MyCosmeticsImageFields,
): { officialImage: string; captureImage: string } => {
  const capture = String(row.captureUrl ?? '').trim();
  const img = String(row.imgUrl ?? '').trim();
  const sticker = pickMyCosmeticsStickerImageUrl(row);
  const fallback = sticker === img ? capture : img;
  return { officialImage: sticker, captureImage: fallback };
};

/** 홈 My Pouch 타일 등 단일 썸네일 */
export const pickMyCosmeticsHomeThumbnailUrl = (
  row: MyCosmeticsResponseDTO,
  homeFallback?: string,
): string => {
  const sticker = pickMyCosmeticsStickerImageUrl(row);
  if (sticker) {
    return sticker;
  }
  return String(homeFallback ?? '').trim();
};
