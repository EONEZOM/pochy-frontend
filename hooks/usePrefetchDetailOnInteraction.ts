'use client';

import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { warmImagesForRoute } from '@/lib/prefetch-app-tab-queries';

type DetailInteractionHandlers = {
  onPointerEnter: () => void;
  onTouchStart: () => void;
};

/**
 * Link hover/touch 시 상세 route 이미지를 warm합니다.
 * map 내부에서는 반환된 팩토리로 href만 바인딩하세요.
 */
export const usePrefetchDetailOnInteraction = (): ((
  href: string,
) => DetailInteractionHandlers) => {
  const queryClient = useQueryClient();

  return useCallback(
    (href: string) => ({
      onPointerEnter: () => {
        warmImagesForRoute(queryClient, href);
      },
      onTouchStart: () => {
        warmImagesForRoute(queryClient, href);
      },
    }),
    [queryClient],
  );
};
