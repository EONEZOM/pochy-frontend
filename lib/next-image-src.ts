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

export const toNextImageLoaderUrl = (src: string, width = 256): string => {
  const trimmed = src.trim();
  if (!isRemoteAbsoluteUrl(trimmed)) {
    return trimmed;
  }
  return `/_next/image?url=${encodeURIComponent(trimmed)}&w=${width}&q=75`;
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

export const shouldBypassNextImageOptimizer = (src: string): boolean => {
  return !shouldUseNextImageOptimizer(src);
};
