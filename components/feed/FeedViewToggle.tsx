'use client';

import { LayoutGrid, Rows3 } from 'lucide-react';

import { cn } from '@/lib/utils';

export type FeedViewMode = 'list' | 'grid';

type FeedViewToggleProps = {
  mode: FeedViewMode;
  onChange: (mode: FeedViewMode) => void;
};

export function FeedViewToggle({ mode, onChange }: FeedViewToggleProps) {
  return (
    <div className="flex justify-end gap-1 px-4 pb-2">
      <button
        type="button"
        aria-label="목록 보기"
        className={cn(
          'rounded-lg p-2 transition-colors',
          mode === 'list'
            ? 'bg-[var(--brand-classic)] text-[var(--mono-jet)]'
            : 'text-[var(--mono-dark-gray)] hover:bg-zinc-100',
        )}
        onClick={() => {
          onChange('list');
        }}
      >
        <Rows3 className="size-5" />
      </button>
      <button
        type="button"
        aria-label="그리드 보기"
        className={cn(
          'rounded-lg p-2 transition-colors',
          mode === 'grid'
            ? 'bg-[var(--brand-classic)] text-[var(--mono-jet)]'
            : 'text-[var(--mono-dark-gray)] hover:bg-zinc-100',
        )}
        onClick={() => {
          onChange('grid');
        }}
      >
        <LayoutGrid className="size-5" />
      </button>
    </div>
  );
}
