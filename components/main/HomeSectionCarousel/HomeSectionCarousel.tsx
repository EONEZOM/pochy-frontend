'use client';

/**
 * 홈 섹션 가로 리스트
 * - 데이터 있음 (Default): Figma `홈` 메인 리스트 (1:3190) — 타일 100×100, gap 12px, 라운드 12px, 흰 테두리·소프트 섀도
 *   https://www.figma.com/design/ozRGHFE4rnqkqnikqCh7Pg/%ED%8F%AC%EC%B9%98-%EC%9E%84%EC%8B%9C?node-id=1-3190
 * - 데이터 없음 (Empty): 카드 없이 안내 문구만 표시
 * - 가로 스크롤 + 마우스 드래그로 이동 (`useDragScroll`)
 */

import Image from 'next/image';
import { ImageIcon } from 'lucide-react';

import type { Detail } from '@/api/model';
import { shouldBypassNextImageOptimizer } from '@/lib/next-image-src';
import { cn } from '@/lib/utils';
import { useDragScroll } from '@/hooks/useDragScroll';

/** 메인 리스트 타일 (Figma 1:3190 기준) */
const TILE_PX = 100;

type HomeSectionCarouselProps = {
  /** 섹션 순서(0=위시) — 상단 섹션·앞쪽 타일 이미지 우선 로드에 사용 */
  sectionIndex?: number;
  sectionTitle: string;
  showSkeleton: boolean;
  items: Detail[];
};

const isValidImageUrl = (value?: string): boolean => {
  if (!value) {
    return false;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return false;
  }

  if (trimmed.startsWith('/')) {
    return true;
  }

  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
};

const scrollTrackClass =
  'scrollbar-hide flex touch-pan-x gap-3 overflow-x-auto overflow-y-hidden [-webkit-overflow-scrolling:touch]';

export function HomeSectionCarousel({
  sectionIndex = 0,
  sectionTitle,
  showSkeleton,
  items,
}: HomeSectionCarouselProps) {
  const { registerRef, onDragStart, isDrag } = useDragScroll();

  const trackProps = {
    ref: registerRef,
    onMouseDown: onDragStart,
    className: cn(
      scrollTrackClass,
      'select-none',
      isDrag ? 'cursor-grabbing' : 'cursor-grab',
    ),
  };

  if (showSkeleton) {
    return (
      <div {...trackProps}>
        {Array.from({ length: 5 }).map((_, index) => (
          <div
            key={`${sectionTitle}-skeleton-${index}`}
            className="bg-mono-white text-mono-dark-gray/40 flex size-[100px] shrink-0 items-center justify-center rounded-xl border-2 border-white shadow-[0_2px_10px_rgba(0,0,0,0.08)]"
          >
            <ImageIcon className="size-4" />
          </div>
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <p className="flex h-[100px] items-center justify-center py-3 text-center text-lg leading-5 font-bold text-[#161618]">
        아직 등록된 화장품이 없어요
      </p>
    );
  }

  return (
    <div {...trackProps}>
      {items.map((item, index) => {
        const isFirstSection = sectionIndex === 0;
        const eager =
          (isFirstSection && index < 14) ||
          (sectionIndex === 1 && index < 8) ||
          index < 5;
        const priority = isFirstSection && index < 3;
        const fetchHigh = isFirstSection && index === 0;

        return (
          <div
            key={`${sectionTitle}-${item.id ?? item.imageUrl ?? index}`}
            className="relative size-[100px] shrink-0 overflow-hidden rounded-xl border-2 border-white bg-white shadow-[0_2px_10px_rgba(0,0,0,0.08)]"
          >
            {isValidImageUrl(item.imageUrl) ? (
              <Image
                src={item.imageUrl as string}
                alt={`${sectionTitle} item`}
                fill
                sizes={`${TILE_PX}px`}
                className="object-cover"
                unoptimized={shouldBypassNextImageOptimizer(
                  String(item.imageUrl),
                )}
                priority={priority}
                loading={eager ? 'eager' : 'lazy'}
                {...(fetchHigh ? { fetchPriority: 'high' as const } : {})}
                decoding="async"
                draggable={false}
              />
            ) : (
              <div className="text-mono-dark-gray/50 flex size-full items-center justify-center bg-[#F3F3F3]">
                <ImageIcon className="size-5" />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
