'use client';

/**
 * 홈 섹션 가로 리스트
 * - 데이터 있음 (Default): Figma `포치 공유용` 메인 리스트 (938:9532) — 타일 96×96, gap 8px, 라운드 8px, White 70 테두리·2단 shadow
 *   https://www.figma.com/design/tPUqGheWyfmhpK5TU1RNhp/%ED%8F%AC%EC%B9%98-%EA%B3%B5%EC%9C%A0%EC%9A%A9?node-id=938-9532
 * - 데이터 없음 (Empty): 카드 없이 안내 문구만 표시
 * - 가로 스크롤 + 마우스 드래그로 이동 (`useDragScroll`)
 */

import { useState, type ReactNode } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ImageIcon } from 'lucide-react';

import type { Detail } from '@/api/model';
import { WishCardImage } from '@/components/wishlist/WishCardImage';
import type { HomeWishCarouselItem } from '@/lib/home-display';
import {
  resolveDisplayImageSrc,
  shouldBypassNextImageOptimizer,
} from '@/lib/next-image-src';
import { resolveMediaUrl } from '@/lib/resolve-media-url';
import { urlReferencesNaverShoppingCdn } from '@/lib/wish-display-image';
import { cn } from '@/lib/utils';
import { useDragScroll } from '@/hooks/useDragScroll';
import { usePrefetchDetailOnInteraction } from '@/hooks/usePrefetchDetailOnInteraction';

/** 메인 리스트 타일 (Figma 938:9532 기준) */
const TILE_PX = 96;

const TILE_SURFACE_CLASS = 'relative size-[96px] shrink-0';

const TILE_IMAGE_LAYER_CLASS = 'absolute inset-0 overflow-hidden rounded-lg';

const TILE_FRAME_CLASS =
  'pointer-events-none absolute inset-0 z-10 rounded-lg border-2 border-white/70 shadow-[1px_1px_3px_0_rgba(0,0,0,0.25)]';

const TILE_IMAGE_SHADOW_CLASS =
  'drop-shadow-[2px_2px_1px_rgba(0,0,0,0.25)]';

type HomeSectionCarouselItem = Detail | HomeWishCarouselItem;

const isHomeWishCarouselItem = (
  item: HomeSectionCarouselItem,
): item is HomeWishCarouselItem => {
  return 'officialImage' in item && 'captureImage' in item;
};

type HomeSectionCarouselProps = {
  /** 섹션 순서(0=위시) — 상단 섹션·앞쪽 타일 이미지 우선 로드에 사용 */
  sectionIndex?: number;
  sectionTitle: string;
  showSkeleton: boolean;
  items: HomeSectionCarouselItem[];
};

/** 홈 API `Detail.imageUrl`은 상대 경로일 수 있어 media-proxy 경유 표시 URL로 통일합니다. */
const resolveDetailImageSrc = (value?: string): string => {
  const resolved = resolveDisplayImageSrc(resolveMediaUrl(value));
  return resolved.trim() || '';
};

const TilePlaceholder = () => (
  <div className="text-mono-dark-gray/50 flex size-full items-center justify-center bg-transparent">
    <ImageIcon className="size-5" />
  </div>
);

const getTileImageClassName = (sectionIndex: number): string => {
  switch (sectionIndex) {
    case 1:
      return cn('object-contain p-2', TILE_IMAGE_SHADOW_CLASS);
    case 2:
      return cn('object-contain p-2', TILE_IMAGE_SHADOW_CLASS);
    default:
      return cn('object-cover', TILE_IMAGE_SHADOW_CLASS);
  }
};

type HomeSectionTileImageProps = {
  src: string;
  alt: string;
  priority?: boolean;
  fetchHigh?: boolean;
  imageClassName?: string;
  /** 파우치·누끼 PNG 투명 영역 — Next 최적화 시 검정 배경으로 깨지는 것 방지 */
  preferUnoptimized?: boolean;
  loading?: 'lazy' | 'eager';
};

const HomeSectionTileImage = ({
  src,
  alt,
  priority = false,
  fetchHigh = false,
  imageClassName = 'object-cover',
  preferUnoptimized = false,
  loading = 'lazy',
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
      unoptimized={
        preferUnoptimized || shouldBypassNextImageOptimizer(src)
      }
      priority={priority}
      loading={loading}
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
  'scrollbar-hide flex w-full min-w-0 touch-pan-x gap-2 overflow-x-auto overflow-y-visible py-3 [-webkit-overflow-scrolling:touch]';

type HomeSectionTileProps = {
  children: ReactNode;
  className?: string;
};

/** Figma 938:9532 — 이미지 레이어 + White 70 프레임 오버레이 */
const HomeSectionTile = ({ children, className }: HomeSectionTileProps) => {
  return (
    <div className={cn(TILE_SURFACE_CLASS, className)}>
      <div className={TILE_IMAGE_LAYER_CLASS}>
        <div className="relative size-full">{children}</div>
      </div>
      <div aria-hidden className={TILE_FRAME_CLASS} />
    </div>
  );
};

/** 위시(네이버 CDN)·파우치·피드 — Next 최적화 시 깨지는 경우 unoptimized */
const shouldPreferUnoptimizedTile = (
  sectionIndex: number,
  imageSrc: string,
) => {
  if (shouldBypassNextImageOptimizer(imageSrc)) {
    return true;
  }
  if (sectionIndex === 0 && urlReferencesNaverShoppingCdn(imageSrc)) {
    return true;
  }
  return sectionIndex !== 0;
};

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
      return null;
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
  const getDetailInteractionHandlers = usePrefetchDetailOnInteraction();
  const { registerRef, onDragStart, isDrag, checkIsClickForbidden } =
    useDragScroll();

  const trackProps = {
    ref: registerRef,
    onMouseDownCapture: onDragStart,
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
          <HomeSectionTile key={`${sectionTitle}-skeleton-${index}`}>
            <div className="text-mono-dark-gray/40 flex size-full items-center justify-center bg-zinc-100">
              <ImageIcon className="size-4" />
            </div>
          </HomeSectionTile>
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <p className="flex h-[96px] w-full items-center justify-center py-3 text-center text-lg leading-5 font-bold text-[#161618]">
        아직 등록된 화장품이 없어요
      </p>
    );
  }

  return (
    <div {...trackProps}>
      {items.map((item, index) => {
        const priority = index < 3;
        const fetchHigh = sectionIndex === 0 && index === 0;
        const detailHref = getItemDetailHref(sectionIndex, item.id);
        const itemKey = `${sectionTitle}-${item.id ?? item.imageUrl ?? index}`;
        const imageSrc = resolveDetailImageSrc(item.imageUrl);
        const tileImageClassName = getTileImageClassName(sectionIndex);
        const preferUnoptimized = shouldPreferUnoptimizedTile(
          sectionIndex,
          imageSrc,
        );

        const tileContent =
          sectionIndex === 0 && isHomeWishCarouselItem(item) ? (
            <WishCardImage
              officialImage={item.officialImage}
              captureImage={item.captureImage}
              productName={sectionTitle}
              fill
              className={tileImageClassName}
              priority={priority}
              loading={priority ? 'eager' : 'lazy'}
            />
          ) : imageSrc ? (
            <HomeSectionTileImage
              src={imageSrc}
              alt={`${sectionTitle} item`}
              priority={priority}
              fetchHigh={fetchHigh}
              imageClassName={tileImageClassName}
              preferUnoptimized={preferUnoptimized}
              loading={priority ? 'eager' : 'lazy'}
            />
          ) : (
            <TilePlaceholder />
          );

        if (!detailHref) {
          return <HomeSectionTile key={itemKey}>{tileContent}</HomeSectionTile>;
        }

        return (
          <Link
            key={itemKey}
            href={detailHref}
            {...getDetailInteractionHandlers(detailHref)}
            onClick={(event) => {
              if (checkIsClickForbidden()) {
                event.preventDefault();
              }
            }}
            className={cn(TILE_SURFACE_CLASS, 'block')}
          >
            <div className={TILE_IMAGE_LAYER_CLASS}>
              <div className="relative size-full">{tileContent}</div>
            </div>
            <div aria-hidden className={TILE_FRAME_CLASS} />
          </Link>
        );
      })}
    </div>
  );
}
