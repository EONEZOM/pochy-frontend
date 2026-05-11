'use client';

/**
 * 홈 섹션 가로 리스트
 * - 데이터 있음 (Default): Figma `홈` (1:2773) — 타일 96×96, gap 8px, 라운드 8px, 흰 테두리·그림자
 *   https://www.figma.com/design/ozRGHFE4rnqkqnikqCh7Pg/%ED%8F%AC%EC%B9%98-%EC%9E%84%EC%8B%9C?node-id=1-2773
 * - 데이터 없음 (Empty): Figma `홈 - 처음` (1:3590) — 그라데이션 카드 + `public/main` 일러스트
 *   https://www.figma.com/design/ozRGHFE4rnqkqnikqCh7Pg/%ED%8F%AC%EC%B9%98-%EC%9E%84%EC%8B%9C?node-id=1-3590
 */

import Image from 'next/image';
import { ImageIcon } from 'lucide-react';

import type { Detail } from '@/api/model';
import { cn } from '@/lib/utils';

type HomeSectionCarouselProps = {
  sectionTitle: string;
  showSkeleton: boolean;
  items: Detail[];
};

/** 섹션별 빈 상태 일러스트 (`public/main`) */
const EMPTY_ILLUSTRATION: Record<
  string,
  { src: string; width: number; height: number }
> = {
  위시: { src: '/main/home-empty-wish.svg', width: 88, height: 87 },
  마이: { src: '/main/home-empty-my.svg', width: 72, height: 104 },
  피드: { src: '/main/home-empty-feed.svg', width: 225, height: 102 },
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

export function HomeSectionCarousel({
  sectionTitle,
  showSkeleton,
  items,
}: HomeSectionCarouselProps) {
  if (showSkeleton) {
    return (
      <div className="flex gap-2 overflow-hidden">
        {Array.from({ length: 5 }).map((_, index) => (
          <div
            key={`${sectionTitle}-skeleton-${index}`}
            className="bg-mono-white text-mono-dark-gray/40 flex size-24 shrink-0 snap-start items-center justify-center rounded-lg border-2 border-white/70 shadow-[1px_1px_3px_0_rgba(0,0,0,0.25)]"
          >
            <ImageIcon className="size-4" />
          </div>
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    const illustration =
      EMPTY_ILLUSTRATION[sectionTitle] ?? EMPTY_ILLUSTRATION['위시'];

    return (
      <div
        className={cn(
          'flex min-h-[120px] w-full items-center justify-center rounded-lg border-2 border-white/70 px-5 py-8',
          'bg-[linear-gradient(180deg,#FFFFFF_31%,#FFC6EC_100%)]',
          'shadow-[1px_1px_3px_0_rgba(0,0,0,0.25)]',
        )}
      >
        <Image
          src={illustration.src}
          alt=""
          width={illustration.width}
          height={illustration.height}
          unoptimized
          className="h-auto max-h-[min(168px,48vw)] w-auto max-w-full object-contain"
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        'flex touch-pan-x snap-x snap-mandatory gap-2 overflow-x-auto overflow-y-hidden scroll-smooth pb-1',
        '[-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
      )}
    >
      {items.map((item, index) => (
        <div
          key={`${sectionTitle}-${item.id ?? item.imageUrl ?? index}`}
          className="relative size-24 shrink-0 snap-start overflow-hidden rounded-lg border-2 border-white/70 bg-white shadow-[1px_1px_3px_0_rgba(0,0,0,0.25)]"
        >
          {isValidImageUrl(item.imageUrl) ? (
            <Image
              src={item.imageUrl as string}
              alt={`${sectionTitle} item`}
              fill
              sizes="96px"
              className="object-cover shadow-[2px_2px_1px_0_rgba(0,0,0,0.25)]"
            />
          ) : (
            <div className="text-mono-dark-gray/50 flex size-full items-center justify-center bg-[#F3F3F3]">
              <ImageIcon className="size-5" />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
