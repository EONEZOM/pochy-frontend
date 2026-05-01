'use client';

import type { FeedSortTab } from '@/constants/feed-mock';
import { cn } from '@/lib/utils';

const TABS: { id: FeedSortTab; label: string }[] = [
  { id: 'recommended', label: '추천순' },
  { id: 'latest', label: '최신순' },
  { id: 'favorites', label: '즐겨찾기' },
];

type FeedSortTabsProps = {
  value: FeedSortTab;
  onChange: (tab: FeedSortTab) => void;
};

export function FeedSortTabs({ value, onChange }: FeedSortTabsProps) {
  return (
    <div
      className="flex gap-2 px-4 pb-3 pt-1"
      role="tablist"
      aria-label="피드 정렬"
    >
      {TABS.map((tab) => {
        const selected = value === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={selected}
            className={cn(
              'rounded-full px-4 py-2 text-sm font-bold transition-colors',
              selected
                ? 'bg-[var(--mono-jet)] text-white'
                : 'bg-[var(--mono-bright-gray)] text-[var(--mono-dark-gray)]',
            )}
            onClick={() => {
              onChange(tab.id);
            }}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
