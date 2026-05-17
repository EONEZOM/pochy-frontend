/**
 * 브라우저 이미지 캐시를 미리 채워 전환 직후 Next/Image 디코딩을 줄입니다.
 * (동일 URL은 한 번만 요청되는 경우가 많음)
 */
import { resolveDisplayImageSrc } from '@/lib/next-image-src';

const MAX_PRELOAD = 22;

const isPreloadableSrc = (raw: string): boolean => {
  const u = raw.trim();
  if (!u) {
    return false;
  }
  return u.startsWith('/') || /^https?:\/\//i.test(u);
};

const toAbsoluteSrc = (src: string): string => {
  const u = src.trim();
  if (u.startsWith('/') && typeof window !== 'undefined') {
    return `${window.location.origin}${u}`;
  }
  return u;
};

export const preloadImageSrcs = (urls: readonly string[]): void => {
  if (typeof window === 'undefined') {
    return;
  }
  const seen = new Set<string>();
  for (const raw of urls) {
    if (!isPreloadableSrc(raw)) {
      continue;
    }
    const resolved = resolveDisplayImageSrc(raw);
    const abs = toAbsoluteSrc(resolved);
    if (seen.has(abs)) {
      continue;
    }
    seen.add(abs);
    const img = new window.Image();
    img.decoding = 'async';
    img.src = abs;
    if (seen.size >= MAX_PRELOAD) {
      break;
    }
  }
};
