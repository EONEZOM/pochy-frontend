import type { ReadDetailDto, ReadListDto } from '@/api/model';

/** OpenAPI에 없을 수 있는 이미지 필드(런타임 JSON) */
type WishImageExtras = {
  naverImageUrl?: string;
  naver_url?: string;
};

export type WishReadImageRow = ReadListDto | ReadDetailDto;

/**
 * 네이버 쇼핑 CDN 호스트 여부.
 * COEP 환경에서는 직접 로드가 막힐 수 있어 Next 이미지 최적화(동일 출처) 경로를 쓸 때 구분합니다.
 */
export const isNaverShoppingCdnUrl = (url: string): boolean => {
  try {
    const host = new URL(url.trim()).hostname.toLowerCase();
    return (
      host === 'shopping-phinf.pstatic.net' ||
      host === 'search.pstatic.net' ||
      host.endsWith('phinf.pstatic.net')
    );
  } catch {
    return false;
  }
};

/** 응답에만 있을 수 있는 네이버 쇼핑 이미지 URL */
export const pickWishNaverImageUrl = (row: WishReadImageRow): string => {
  const r = row as WishReadImageRow & WishImageExtras;
  const fromField = String(r.naverImageUrl ?? r.naver_url ?? '').trim();
  if (fromField && /^https?:\/\//i.test(fromField)) {
    return fromField;
  }
  const p = String(r.productImageUrl ?? '').trim();
  if (p && isNaverShoppingCdnUrl(p)) {
    return p;
  }
  return '';
};

/**
 * 위시 카드·상세의 "공식(네이버) 이미지" 슬롯.
 * 네이버 전용 필드 → productImageUrl이 네이버 CDN인 경우 → 그 외 productImageUrl 순.
 */
export const pickWishOfficialImageUrl = (row: WishReadImageRow): string => {
  const naver = pickWishNaverImageUrl(row);
  if (naver) {
    return naver;
  }
  return String(row.productImageUrl ?? '').trim();
};

export const pickWishCaptureImageUrl = (row: WishReadImageRow): string =>
  String(row.captureImageUrl ?? '').trim();

/** 홈 위시 타일 등 단일 썸네일 */
export const pickWishListThumbnailUrl = (row: ReadListDto): string => {
  const official = pickWishOfficialImageUrl(row);
  const cap = pickWishCaptureImageUrl(row);
  return official || cap || '';
};
