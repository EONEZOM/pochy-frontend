'use client';

import { useMemo, useState } from 'react';

import { Header } from '@/components/layout/Header';
import { useFeedBookmarksContext } from '@/components/feed/FeedBookmarksProvider';
import { FeedPostCard } from '@/components/feed/FeedPostCard';
import { FeedPostGridCard } from '@/components/feed/FeedPostGridCard';
import {
  FeedToolbar,
  type FeedViewMode,
} from '@/components/feed/FeedToolbar';
import { FEED_MOCK_ITEMS, type FeedSortTab } from '@/constants/feed-mock';

export default function FeedPage() {
  const { bookmarkById, toggleBookmark } = useFeedBookmarksContext();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortTab, setSortTab] = useState<FeedSortTab>('recommended');
  const [viewMode, setViewMode] = useState<FeedViewMode>('list');

  const feedItems = useMemo(() => {
    return FEED_MOCK_ITEMS.map((item) => ({
      ...item,
      bookmarked:
        bookmarkById[item.id] !== undefined
          ? bookmarkById[item.id]
          : Boolean(item.bookmarked),
    }));
  }, [bookmarkById]);

  const filteredItems = useMemo(() => {
    let list = [...feedItems];

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
  }, [feedItems, searchQuery, sortTab]);

  return (
    <div className="bg-mono-white flex min-h-full flex-col pb-2">
      <Header
        sticky
        showBack={false}
        variant="title"
        title="피드"
        searchExpanded={searchOpen}
        searchProps={{
          placeholder: '검색어를 입력하세요',
          value: searchQuery,
          onChange: (e) => {
            setSearchQuery(e.target.value);
          },
        }}
        rightIcons={[
          {
            kind: 'search',
            ariaLabel: searchOpen ? '검색 닫기' : '검색',
            onClick: () => {
              setSearchOpen((prev) => {
                if (prev) {
                  setSearchQuery('');
                }
                return !prev;
              });
            },
          },
        ]}
      />

      <FeedToolbar
        sortTab={sortTab}
        onSortChange={setSortTab}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />

      {viewMode === 'list' ? (
        <div className="flex flex-col">
          {filteredItems.length === 0 ? (
            <p className="text-mono-dark-gray px-4 py-16 text-center text-sm">
              표시할 피드가 없어요.
            </p>
          ) : (
            filteredItems.map((item) => (
              <FeedPostCard
                key={item.id}
                item={item}
                onBookmarkToggle={toggleBookmark}
              />
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
              <FeedPostGridCard
                key={item.id}
                item={item}
                onBookmarkToggle={toggleBookmark}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}
