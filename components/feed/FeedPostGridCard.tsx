'use client';

import Link from 'next/link';
import { Star } from 'lucide-react';

import type { FeedMockItem } from '@/constants/feed-mock';
import { cn } from '@/lib/utils';

type FeedPostGridCardProps = {
  item: FeedMockItem;
  onBookmarkToggle?: (feedId: string) => void;
};

export function FeedPostGridCard({
  item,
  onBookmarkToggle,
}: FeedPostGridCardProps) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-zinc-200 bg-white">
      <Link href={`/feed/${item.id}`} className="block">
        <div
          className="aspect-square w-full bg-rose-50"
          style={{
            backgroundImage: `
              linear-gradient(to right, rgba(244, 114, 182, 0.12) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(244, 114, 182, 0.12) 1px, transparent 1px)
            `,
            backgroundSize: '16px 16px',
          }}
        />
        <div className="p-2">
          <p className="text-mono-jet line-clamp-2 text-xs font-bold leading-snug">
            {item.title}
          </p>
          <p className="text-mono-dark-gray mt-0.5 text-[11px]">
            {item.gridSubtitle ?? item.authorName}
          </p>
        </div>
      </Link>
      <button
        type="button"
        className="absolute right-2 top-2 z-10 rounded-full bg-white/95 p-1.5 shadow-sm backdrop-blur-sm transition-colors hover:bg-white"
        aria-label={item.bookmarked ? '즐겨찾기 해제' : '즐겨찾기'}
        aria-pressed={item.bookmarked}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onBookmarkToggle?.(item.id);
        }}
      >
        <Star
          className={cn(
            'size-5',
            item.bookmarked
              ? 'fill-amber-400 text-amber-400'
              : 'text-zinc-400',
          )}
        />
      </button>
    </div>
  );
}
