import { preloadImageSrcs } from '@/lib/preload-image-srcs';

/** 메인·빈 홈 지퍼·로고·립 — 우선순위 순 */
const MAIN_HOME_ASSET_URLS = [
  '/figma/main/윗지퍼.svg',
  '/figma/main/befo-윗지퍼.svg',
  '/figma/login/hero-1.svg',
  '/figma/main/아래지퍼.svg',
  '/figma/main/befo-아래지퍼.svg',
  '/figma/main/립스틱.svg',
] as const;

export const preloadMainHomeAssets = (): void => {
  preloadImageSrcs(MAIN_HOME_ASSET_URLS);
};
