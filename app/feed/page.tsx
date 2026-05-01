'use client';

import { useMemo, useState } from 'react';

import { Header } from '@/components/layout/Header';
import { FeedPostCard } from '@/components/feed/FeedPostCard';
import { FeedPostGridCard } from '@/components/feed/FeedPostGridCard';
import { FeedSortTabs } from '@/components/feed/FeedSortTabs';
import {
  FeedViewToggle,
  type FeedViewMode,
} from '@/components/feed/FeedViewToggle';
import { FEED_MOCK_ITEMS, type FeedSortTab } from '@/constants/feed-mock';

export default function FeedPage() {
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortTab, setSortTab] = useState<FeedSortTab>('recommended');
  const [viewMode, setViewMode] = useState<FeedViewMode>('list');

  const filteredItems = useMemo(() => {
    let list = [...FEED_MOCK_ITEMS];

    if (sortTab === 'favorites') {
      list = list.filter((item) => item.bookmarked);
    }
    if (sortTab === 'latest') {
      list = [...list].reverse();
    }

    const q = searchQuery.trim().toLowerCase();
    if (q.length > 0) {
      list = list.filter(
        (item) =>
          item.title.toLowerCase().includes(q) ||
          item.caption.toLowerCase().includes(q) ||
          item.authorName.toLowerCase().includes(q),
      );
    }

    return list;
  }, [searchQuery, sortTab]);

  return (
    <div className="bg-mono-white flex min-h-full flex-col pb-2">
      {searchOpen ? (
        <Header
          sticky
          showBack
          onBack={() => {
            setSearchOpen(false);
            setSearchQuery('');
          }}
          variant="search"
          searchProps={{
            placeholder: '검색어를 입력하세요',
            value: searchQuery,
            onChange: (e) => {
              setSearchQuery(e.target.value);
            },
          }}
        />
      ) : (
        <Header
          sticky
          showBack={false}
          variant="title"
          title="피드"
          rightIcons={[
            {
              kind: 'search',
              ariaLabel: '검색',
              onClick: () => {
                setSearchOpen(true);
              },
            },
          ]}
        />
      )}

      {!searchOpen && (
        <>
          <FeedSortTabs value={sortTab} onChange={setSortTab} />
          <FeedViewToggle mode={viewMode} onChange={setViewMode} />
        </>
      )}

      {viewMode === 'list' ? (
        <div className="flex flex-col">
          {filteredItems.length === 0 ? (
            <p className="text-mono-dark-gray px-4 py-16 text-center text-sm">
              표시할 피드가 없어요.
            </p>
          ) : (
            filteredItems.map((item) => (
              <FeedPostCard key={item.id} item={item} />
            ))
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 px-4 pb-6">
          {filteredItems.length === 0 ? (
            <p className="text-mono-dark-gray col-span-2 py-16 text-center text-sm">
              표시할 피드가 없어요.
            </p>
          ) : (
            filteredItems.map((item) => (
              <FeedPostGridCard key={item.id} item={item} />
            ))
          )}
        </div>
      )}
    </div>
  );
}
