'use client';

/**
 * 홈 섹션 가로 리스트
 * - 데이터 있음 (Default): Figma `홈` 메인 리스트 (1:3190) — 타일 100×100, gap 12px, 라운드 12px, 흰 테두리·소프트 섀도
 *   https://www.figma.com/design/ozRGHFE4rnqkqnikqCh7Pg/%ED%8F%AC%EC%B9%98-%EC%9E%84%EC%8B%9C?node-id=1-3190
 * - 데이터 없음 (Empty): 카드 없이 안내 문구만 표시
 * - 가로 스크롤 + 마우스 드래그로 이동 (`useDragScroll`)
 */

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ImageIcon } from 'lucide-react';

import type { Detail } from '@/api/model';
import {
  resolveDisplayImageSrc,
  shouldBypassNextImageOptimizer,
} from '@/lib/next-image-src';
import { buildPouchDetailPath } from '@/lib/pouch-setup';
import { resolveMediaUrl } from '@/lib/resolve-media-url';
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

/** 홈 API `Detail.imageUrl`은 상대 경로일 수 있어 media-proxy 경유 표시 URL로 통일합니다. */
const resolveDetailImageSrc = (value?: string): string => {
  const resolved = resolveDisplayImageSrc(resolveMediaUrl(value));
  return resolved.trim() || '';
};

const TilePlaceholder = () => (
  <div className="text-mono-dark-gray/50 flex size-full items-center justify-center bg-[#F3F3F3]">
    <ImageIcon className="size-5" />
  </div>
);

const getTileImageClassName = (sectionIndex: number): string => {
  switch (sectionIndex) {
    case 1:
      return 'object-contain p-2';
    case 2:
      return 'object-contain p-2';
    default:
      return 'object-cover';
  }
};

type HomeSectionTileImageProps = {
  src: string;
  alt: string;
  priority?: boolean;
  fetchHigh?: boolean;
  imageClassName?: string;
};

const HomeSectionTileImage = ({
  src,
  alt,
  priority = false,
  fetchHigh = false,
  imageClassName = 'object-cover',
}: HomeSectionTileImageProps) => {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return <TilePlaceholder />;
  }

  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={`${TILE_PX}px`}
      className={imageClassName}
      unoptimized={shouldBypassNextImageOptimizer(src)}
      priority={priority}
      {...(fetchHigh ? { fetchPriority: 'high' as const } : {})}
      decoding="async"
      draggable={false}
      onError={() => {
        setFailed(true);
      }}
    />
  );
};

const scrollTrackClass =
  'scrollbar-hide flex touch-pan-x gap-3 overflow-x-auto overflow-y-hidden [-webkit-overflow-scrolling:touch]';

const tileClassName =
  'relative size-[100px] shrink-0 overflow-hidden rounded-xl border-2 border-white bg-white shadow-[0_2px_10px_rgba(0,0,0,0.08)]';

const getItemDetailHref = (
  sectionIndex: number,
  id?: number,
): string | null => {
  if (id == null || !Number.isFinite(id)) {
    return null;
  }

  switch (sectionIndex) {
    case 0:
      return `/wish/${id}`;
    case 1:
      return `/my-cosmetics/${id}`;
    case 2:
      return buildPouchDetailPath(id, '');
    default:
      return null;
  }
};

export function HomeSectionCarousel({
  sectionIndex = 0,
  sectionTitle,
  showSkeleton,
  items,
}: HomeSectionCarouselProps) {
  const { registerRef, onDragStart, isDrag, checkIsClickForbidden } =
    useDragScroll();

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
      <p className="flex h-[100px] w-full items-center justify-center py-3 text-center text-lg leading-5 font-bold text-[#161618]">
        아직 등록된 화장품이 없어요
      </p>
    );
  }

  return (
    <div {...trackProps}>
      {items.map((item, index) => {
        const isFirstSection = sectionIndex === 0;
        const priority = isFirstSection && index < 3;
        const fetchHigh = isFirstSection && index === 0;
        const detailHref = getItemDetailHref(sectionIndex, item.id);
        const itemKey = `${sectionTitle}-${item.id ?? item.imageUrl ?? index}`;
        const imageSrc = resolveDetailImageSrc(item.imageUrl);
        const tileImageClassName = getTileImageClassName(sectionIndex);

        const tileContent = imageSrc ? (
          <HomeSectionTileImage
            src={imageSrc}
            alt={`${sectionTitle} item`}
            priority={priority}
            fetchHigh={fetchHigh}
            imageClassName={tileImageClassName}
          />
        ) : (
          <TilePlaceholder />
        );

        if (!detailHref) {
          return (
            <div key={itemKey} className={tileClassName}>
              {tileContent}
            </div>
          );
        }

        return (
          <Link
            key={itemKey}
            href={detailHref}
            onClick={(event) => {
              if (checkIsClickForbidden()) {
                event.preventDefault();
              }
            }}
            className={cn(tileClassName, 'block transition-shadow hover:shadow-md')}
          >
            {tileContent}
          </Link>
        );
      })}
    </div>
  );
}
