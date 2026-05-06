'use client';

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { FEED_MOCK_ITEMS } from '@/constants/feed-mock';

const STORAGE_KEY = 'feedBookmarkById';

const defaultBookmarks = (): Record<string, boolean> => {
  return Object.fromEntries(
    FEED_MOCK_ITEMS.map((item) => [item.id, Boolean(item.bookmarked)]),
  );
};

const loadMerged = (): Record<string, boolean> => {
  const base = defaultBookmarks();
  if (typeof window === 'undefined') {
    return base;
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return base;
    }
    const parsed = JSON.parse(raw) as unknown;
    if (typeof parsed !== 'object' || parsed === null) {
      return base;
    }
    return { ...base, ...(parsed as Record<string, boolean>) };
  } catch {
    return base;
  }
};

type FeedBookmarksContextValue = {
  bookmarkById: Record<string, boolean>;
  isBookmarked: (feedId: string) => boolean;
  toggleBookmark: (feedId: string) => void;
};

const FeedBookmarksContext = createContext<FeedBookmarksContextValue | null>(
  null,
);

export function FeedBookmarksProvider({ children }: { children: ReactNode }) {
  const [bookmarkById, setBookmarkById] = useState<Record<string, boolean>>(
    defaultBookmarks,
  );

  useEffect(() => {
    setBookmarkById(loadMerged());
  }, []);

  const toggleBookmark = useCallback((feedId: string) => {
    setBookmarkById((prev) => {
      const previous =
        feedId in prev ? prev[feedId] : defaultBookmarks()[feedId];
      const next = {
        ...prev,
        [feedId]: !Boolean(previous),
      };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore quota / private mode
      }
      return next;
    });
  }, []);

  const isBookmarked = useCallback(
    (feedId: string) => Boolean(bookmarkById[feedId]),
    [bookmarkById],
  );

  const value = useMemo(
    () => ({
      bookmarkById,
      isBookmarked,
      toggleBookmark,
    }),
    [bookmarkById, isBookmarked, toggleBookmark],
  );

  return (
    <FeedBookmarksContext.Provider value={value}>
      {children}
    </FeedBookmarksContext.Provider>
  );
}

export function useFeedBookmarksContext(): FeedBookmarksContextValue {
  const ctx = useContext(FeedBookmarksContext);
  if (!ctx) {
    throw new Error(
      'useFeedBookmarksContext는 FeedBookmarksProvider 안에서만 사용할 수 있어요.',
    );
  }
  return ctx;
}
