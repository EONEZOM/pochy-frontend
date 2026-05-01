'use client';

import Link from 'next/link';
import { Heart, Plus, Star } from 'lucide-react';

import type { FeedMockItem } from '@/constants/feed-mock';
import { cn } from '@/lib/utils';

type FeedPostCardProps = {
  item: FeedMockItem;
};

export function FeedPostCard({ item }: FeedPostCardProps) {
  return (
    <article className="border-b border-zinc-100 px-4 py-4">
      <Link href={`/feed/${item.id}`} className="block">
        <div className="flex items-start gap-3">
          <div
            className="flex size-10 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-lg"
            aria-hidden
          >
            {item.avatarEmoji}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-mono-jet text-sm font-bold leading-snug">
              {item.caption}{' '}
              <span className="text-mono-dark-gray font-normal">
                {item.timeLabel}
              </span>
            </p>
          </div>
        </div>

        <div
          className="relative mt-3 aspect-[4/3] w-full overflow-hidden rounded-xl border border-zinc-200 bg-rose-50"
          style={{
            backgroundImage: `
              linear-gradient(to right, rgba(244, 114, 182, 0.12) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(244, 114, 182, 0.12) 1px, transparent 1px)
            `,
            backgroundSize: '20px 20px',
          }}
        >
          <span className="sr-only">{item.title} 미리보기</span>
        </div>
      </Link>

      <div className="mt-3 flex items-center justify-between">
        <div className="flex flex-wrap items-center gap-1">
          <Heart className="size-5 text-zinc-700" aria-hidden />
          {item.reactions.map((emoji) => (
            <span key={emoji} className="text-lg leading-none" aria-hidden>
              {emoji}
            </span>
          ))}
          <button
            type="button"
            className="ml-1 flex size-8 items-center justify-center rounded-full border border-dashed border-zinc-300 text-zinc-500"
            aria-label="반응 추가"
          >
            <Plus className="size-4" />
          </button>
        </div>
        <button
          type="button"
          className="rounded-full p-1"
          aria-label={item.bookmarked ? '즐겨찾기 해제' : '즐겨찾기'}
        >
          <Star
            className={cn(
              'size-6 shrink-0',
              item.bookmarked
                ? 'fill-amber-400 text-amber-400'
                : 'text-zinc-400',
            )}
          />
        </button>
      </div>
    </article>
  );
}
