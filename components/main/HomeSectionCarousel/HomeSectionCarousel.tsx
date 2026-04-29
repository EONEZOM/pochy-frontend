'use client';

import * as React from 'react';
import Image from 'next/image';
import { ImageIcon } from 'lucide-react';

import type { Detail } from '@/api/model';
import { cn } from '@/lib/utils';

type HomeSectionCarouselProps = {
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

export function HomeSectionCarousel({
  sectionTitle,
  showSkeleton,
  items,
}: HomeSectionCarouselProps) {
  if (showSkeleton) {
    return (
      <div className="flex gap-2.5 overflow-hidden">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={`${sectionTitle}-skeleton-${index}`}
            className="border-mono-dark-gray/40 bg-mono-white text-mono-dark-gray/40 flex aspect-square min-w-[calc((100%-1.25rem)/3)] shrink-0 snap-start items-center justify-center rounded-md border"
          >
            <ImageIcon className="size-4" />
          </div>
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="border-mono-dark-gray/70 bg-mono-white flex h-24 items-center justify-center rounded-md border">
        <p className="text-mono-dark-gray text-xs font-medium">
          아직 항목이 없어요.
        </p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'flex snap-x snap-mandatory gap-2.5 overflow-x-auto overflow-y-hidden scroll-smooth pb-1 touch-pan-x',
        '[scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden',
      )}
    >
      {items.map((item, index) =>
        isValidImageUrl(item.imageUrl) ? (
          <Image
            key={`${sectionTitle}-${item.id ?? item.imageUrl}-${index}`}
            src={item.imageUrl as string}
            alt={`${sectionTitle} item`}
            width={120}
            height={120}
            className="border-mono-dark-gray/70 bg-mono-white aspect-square min-w-[calc((100%-1.25rem)/3)] shrink-0 snap-start rounded-md border object-cover"
          />
        ) : (
          <div
            key={`${sectionTitle}-${item.id ?? index}`}
            className="border-mono-dark-gray/70 bg-mono-white text-mono-dark-gray/70 flex aspect-square min-w-[calc((100%-1.25rem)/3)] shrink-0 snap-start items-center justify-center rounded-md border"
          >
            <ImageIcon className="size-4" />
          </div>
        ),
      )}
    </div>
  );
}
