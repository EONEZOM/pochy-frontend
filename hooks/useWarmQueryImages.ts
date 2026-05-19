'use client';

import { useEffect, useRef } from 'react';

import { preloadImageSrcs } from '@/lib/preload-image-srcs';

/**
 * URL 배열이 바뀔 때 브라우저 이미지 캐시를 warm합니다.
 * 동일 배열(순서·값)은 한 번만 preload합니다.
 */
export const useWarmQueryImages = (urls: readonly string[]): void => {
  const lastKeyRef = useRef('');

  useEffect(() => {
    const key = urls.join('\0');
    if (!key || key === lastKeyRef.current) {
      return;
    }
    lastKeyRef.current = key;
    preloadImageSrcs(urls);
  }, [urls]);
};
