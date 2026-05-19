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
export const resolveFeedPouchImageUrl = (
  imageUrl?: string | null,
): string => {
  const trimmed = String(imageUrl ?? '').trim();
  if (!trimmed) {
    return '';
  }

  const match = trimmed.match(POUCH_THUMB_WEBP_PATH_REGEX);
  if (!match) {
    return trimmed;
  }

  const uuid = match[1];
  const query = match[2] ?? '';
  return trimmed.replace(
    POUCH_THUMB_WEBP_PATH_REGEX,
    `/original/pouch/${uuid}.png${query}`,
  );
};
