/**
 * 백엔드가 `wish_capture_img/uuid.jpg` 처럼 오리진 없는 상대 경로를 줄 때,
 * Next.js `<Image>`가 요구하는 절대 URL(`https://…`) 또는 `/` 로 시작하는 경로로 바꿉니다.
 *
 * `NEXT_PUBLIC_API_URL` 정규화 규칙은 `next.config.mjs` 의 `normalizeApiBase` 와 동일하게 유지합니다.
 */
export function resolveMediaUrl(src: string | null | undefined): string {
  const s = String(src ?? '').trim();
  if (!s) {
    return '';
  }
  if (/^(https?:\/\/|blob:|data:)/i.test(s)) {
    return s;
  }
  if (s.startsWith('/')) {
    return s;
  }

  const origin = normalizeApiOrigin();
  const path = s.replace(/^\.?\//, '');
  if (origin) {
    return `${origin}/${path}`;
  }
  return `/${path}`;
}

function normalizeApiOrigin(): string {
  const raw = process.env.NEXT_PUBLIC_API_URL ?? '';
  if (!raw) {
    return '';
  }
  return raw
    .replace(/\/$/, '')
    .replace(/\/v3\/api-docs$/, '')
    .replace(/\/api$/, '');
}
