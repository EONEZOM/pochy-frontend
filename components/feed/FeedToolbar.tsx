'use client';

import { LayoutGrid, Rows3 } from 'lucide-react';

import type { FeedSortTab } from '@/constants/feed-mock';
import { cn } from '@/lib/utils';

export type FeedViewMode = 'list' | 'grid';

const SORT_TABS: { id: FeedSortTab; label: string }[] = [
  { id: 'recommended', label: '추천순' },
  { id: 'latest', label: '최신순' },
  { id: 'favorites', label: '즐겨찾기' },
];

type FeedToolbarProps = {
  sortTab: FeedSortTab;
  onSortChange: (tab: FeedSortTab) => void;
  viewMode: FeedViewMode;
  onViewModeChange: (mode: FeedViewMode) => void;
};

export function FeedToolbar({
  sortTab,
  onSortChange,
  viewMode,
  onViewModeChange,
}: FeedToolbarProps) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 pb-3 pt-1">
      <div
        className="flex min-w-0 flex-1 gap-2 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        role="tablist"
        aria-label="피드 정렬"
      >
        {SORT_TABS.map((tab) => {
          const selected = sortTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={selected}
              className={cn(
                'shrink-0 rounded-full px-4 py-2 text-sm font-bold transition-colors',
                selected
                  ? 'bg-[var(--mono-jet)] text-white'
                  : 'bg-[var(--mono-bright-gray)] text-[var(--mono-dark-gray)]',
              )}
              onClick={() => {
                onSortChange(tab.id);
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <div
        className="flex shrink-0 gap-1"
        role="group"
        aria-label="보기 방식"
      >
        <button
          type="button"
          aria-label="목록 보기"
          aria-pressed={viewMode === 'list'}
          className={cn(
            'rounded-lg p-2 transition-colors',
            viewMode === 'list'
              ? 'bg-[var(--brand-classic)] text-[var(--mono-jet)]'
              : 'text-[var(--mono-dark-gray)] hover:bg-zinc-100',
          )}
          onClick={() => {
            onViewModeChange('list');
          }}
        >
          <Rows3 className="size-5" />
        </button>
        <button
          type="button"
          aria-label="그리드 보기"
          aria-pressed={viewMode === 'grid'}
          className={cn(
            'rounded-lg p-2 transition-colors',
            viewMode === 'grid'
              ? 'bg-[var(--brand-classic)] text-[var(--mono-jet)]'
              : 'text-[var(--mono-dark-gray)] hover:bg-zinc-100',
          )}
          onClick={() => {
            onViewModeChange('grid');
          }}
        >
          <LayoutGrid className="size-5" />
        </button>
      </div>
    </div>
  );
}
