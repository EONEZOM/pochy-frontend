/**
 * Feed 파우치 썸네일 표시 URL.
 *
 * 백엔드 `thumbnail/pouch/*.webp` 는 알파 없는 VP8 WebP라 투명 PNG 원본의
 * 빈 영역이 검정으로 flatten 됩니다. 동일 UUID의 `original/pouch/*.png` 는 RGBA.
 *
 * 근본 해결: 백엔드 썸네일 생성 시 WebP 알파(VP8X) 유지 또는 PNG 썸네일 사용.
 */

const POUCH_THUMB_WEBP_PATH_REGEX =
  /\/thumbnail\/pouch\/([0-9a-f-]{36})\.webp(\?.*)?$/i;

/** `thumbnail/pouch/{uuid}.webp` → `original/pouch/{uuid}.png` (매칭 없으면 입력 그대로) */
const transformPouchThumbWebpToOriginalPng = (url: string): string => {
  const match = url.match(POUCH_THUMB_WEBP_PATH_REGEX);
  if (!match) {
    return url;
  }

  const query = match[2] ?? '';
  return url.replace(
    POUCH_THUMB_WEBP_PATH_REGEX,
    `/original/pouch/${match[1]}.png${query}`,
  );
};

const transformMediaProxyPouchThumb = (src: string): string => {
  const trimmed = src.trim();
  if (!trimmed.includes('/api/media-proxy')) {
    return trimmed;
  }

  try {
    const parsed = new URL(
      trimmed,
      typeof window !== 'undefined' ? window.location.origin : 'https://localhost',
    );
    if (parsed.pathname !== '/api/media-proxy') {
      return trimmed;
    }

    const inner = parsed.searchParams.get('url')?.trim();
    if (!inner) {
      return trimmed;
    }

    const transformedInner = transformPouchThumbWebpToOriginalPng(inner);
    if (transformedInner === inner) {
      return trimmed;
    }

    parsed.searchParams.set('url', transformedInner);
    return `${parsed.pathname}?${parsed.searchParams.toString()}`;
  } catch {
    return trimmed;
  }
};

const transformNextImageLoaderPouchThumb = (src: string): string => {
  const trimmed = src.trim();
  if (!trimmed.startsWith('/_next/image?')) {
    return trimmed;
  }

  try {
    const parsed = new URL(
      trimmed,
      typeof window !== 'undefined' ? window.location.origin : 'https://localhost',
    );
    const inner = parsed.searchParams.get('url')?.trim();
    if (!inner) {
      return trimmed;
    }

    const transformedInner = transformPouchThumbWebpToOriginalPng(inner);
    if (transformedInner === inner) {
      return trimmed;
    }

    parsed.searchParams.set('url', transformedInner);
    return `${parsed.pathname}?${parsed.searchParams.toString()}`;
  } catch {
    return trimmed;
  }
};

/**
 * pouch WebP 썸네일을 RGBA PNG 원본 경로로 치환합니다.
 * `/api/media-proxy?url=...` · `/_next/image?url=...` 래핑 URL도 내부 원본을 변환합니다.
 */
export const resolveFeedPouchImageUrl = (
  imageUrl?: string | null,
): string => {
  const trimmed = String(imageUrl ?? '').trim();
  if (!trimmed) {
    return '';
  }

  const fromProxy = transformMediaProxyPouchThumb(trimmed);
  if (fromProxy !== trimmed) {
    return fromProxy;
  }

  const fromNextImage = transformNextImageLoaderPouchThumb(trimmed);
  if (fromNextImage !== trimmed) {
    return fromNextImage;
  }

  return transformPouchThumbWebpToOriginalPng(trimmed);
};
