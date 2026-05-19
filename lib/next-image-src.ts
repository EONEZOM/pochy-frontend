const REMOTE_IMAGE_HOST_SUFFIXES = [
  'pstatic.net',
  'cloudfront.net',
  'amazonaws.com',
  'pochy.shop',
  'ytimg.com',
] as const;

const isRemoteAbsoluteUrl = (src: string): boolean => {
  return /^https?:\/\//i.test(src.trim());
};

const tryApiHostname = (): string | null => {
  const raw = process.env.NEXT_PUBLIC_API_URL ?? '';
  if (!raw) {
    return null;
  }
  try {
    const normalized = raw
      .replace(/\/$/, '')
      .replace(/\/v3\/api-docs$/, '')
      .replace(/\/api$/, '');
    return new URL(normalized).hostname.toLowerCase();
  } catch {
    return null;
  }
};

const isAllowedRemoteHost = (hostname: string): boolean => {
  const host = hostname.toLowerCase();
  const apiHost = tryApiHostname();
  if (apiHost && host === apiHost) {
    return true;
  }
  return REMOTE_IMAGE_HOST_SUFFIXES.some(
    (suffix) => host === suffix || host.endsWith(`.${suffix}`),
  );
};

export const isCoepImageIsolation = (): boolean => {
  if (typeof window !== 'undefined') {
    return window.crossOriginIsolated;
  }
  return process.env.NODE_ENV === 'production';
};

export const shouldUseNextImageOptimizer = (src: string): boolean => {
  const trimmed = src.trim();
  if (!isRemoteAbsoluteUrl(trimmed) || !isCoepImageIsolation()) {
    return false;
  }
  try {
    return isAllowedRemoteHost(new URL(trimmed).hostname);
  } catch {
    return false;
  }
};

export const isAllowedMediaProxySource = (src: string): boolean => {
  const trimmed = src.trim();
  if (!isRemoteAbsoluteUrl(trimmed)) {
    return false;
  }
  try {
    return isAllowedRemoteHost(new URL(trimmed).hostname);
  } catch {
    return false;
  }
};

export const toNextImageLoaderUrl = (src: string, width = 256): string => {
  const trimmed = src.trim();
  if (!isRemoteAbsoluteUrl(trimmed)) {
    return trimmed;
  }
  return `/_next/image?url=${encodeURIComponent(trimmed)}&w=${width}&q=75`;
};

/**
 * html-to-image·canvas용: CloudFront 등 외부 URL을 동일 오리진 `/api/media-proxy` 로 프록시합니다.
 * `/_next/image` 는 SVG·일부 원격 JPG에서 400이 나는 경우가 있어 BFF 프록시를 사용합니다.
 */
export const toSameOriginImageProxyUrl = (src: string): string => {
  const trimmed = src.trim();
  if (!trimmed || !isAllowedMediaProxySource(trimmed)) {
    return trimmed;
  }
  return `/api/media-proxy?url=${encodeURIComponent(trimmed)}`;
};

export const resolveCoepCompatibleImageSrc = (
  src: string,
  width = 256,
): string => {
  const trimmed = src.trim();
  if (!trimmed) {
    return '';
  }
  if (shouldUseNextImageOptimizer(trimmed)) {
    return toNextImageLoaderUrl(trimmed, width);
  }
  return trimmed;
};

/**
 * 화면 표시·canvas 로드용: 허용된 외부 CDN은 동일 오리진 media-proxy로,
 * COEP 환경의 원격 URL은 `/_next/image` 로 변환합니다.
 */
export const resolveDisplayImageSrc = (src: string, width = 256): string => {
  const trimmed = src.trim();
  if (!trimmed) {
    return '';
  }
  if (isAllowedMediaProxySource(trimmed)) {
    return toSameOriginImageProxyUrl(trimmed);
  }
  if (shouldUseNextImageOptimizer(trimmed)) {
    return toNextImageLoaderUrl(trimmed, width);
  }
  return trimmed;
};

export const isMediaProxyPath = (src: string): boolean => {
  const trimmed = src.trim();
  if (!trimmed) {
    return false;
  }
  if (trimmed.startsWith('/api/media-proxy?')) {
    return true;
  }
  if (trimmed.startsWith('/_next/image?')) {
    return true;
  }
  try {
    const url = new URL(trimmed);
    return (
      url.pathname === '/api/media-proxy' && url.searchParams.has('url')
    );
  } catch {
    return false;
  }
};

/** 캔버스 레이어 src — 이미 프록시된 URL은 중복 래핑하지 않음 */
export const resolveLayerImageSrc = (src: string): string => {
  const trimmed = src.trim();
  if (!trimmed) {
    return '';
  }
  if (isMediaProxyPath(trimmed) || trimmed.startsWith('/api/wappens/')) {
    return trimmed;
  }
  if (trimmed.startsWith('/')) {
    return trimmed;
  }
  if (isAllowedMediaProxySource(trimmed)) {
    return toSameOriginImageProxyUrl(trimmed);
  }
  return trimmed;
};

export const shouldBypassNextImageOptimizer = (src: string): boolean => {
  const trimmed = src.trim();
  if (isMediaProxyPath(trimmed)) {
    return true;
  }
  return !shouldUseNextImageOptimizer(trimmed);
};
