import { preloadImageSrcs } from '@/lib/preload-image-srcs';

/** 오프닝 — 파우치·슬라이드·로고 */
const OPENING_ASSET_URLS = [
  '/figma/opening/위파우치.svg',
  '/figma/opening/아래파우치.svg',
  '/figma/opening/opening-슬라이드.svg',
  '/logo/main-logo.png',
] as const;

export const preloadOpeningAssets = (): void => {
  preloadImageSrcs(OPENING_ASSET_URLS);
};
