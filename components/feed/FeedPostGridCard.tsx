'use client';

import Link from 'next/link';

import type { FeedMockItem } from '@/constants/feed-mock';

type FeedPostGridCardProps = {
  item: FeedMockItem;
};

export function FeedPostGridCard({ item }: FeedPostGridCardProps) {
  return (
    <Link
      href={`/feed/${item.id}`}
      className="block overflow-hidden rounded-xl border border-zinc-200 bg-white"
    >
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
  );
}
