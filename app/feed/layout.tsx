import type { ReactNode } from 'react';

import { FeedBookmarksProvider } from '@/components/feed/FeedBookmarksProvider';

export default function FeedLayout({ children }: { children: ReactNode }) {
  return <FeedBookmarksProvider>{children}</FeedBookmarksProvider>;
}
