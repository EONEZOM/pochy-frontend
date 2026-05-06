import type { ReactNode } from 'react';

import { FeedBookmarksProvider } from '@/components/feed/FeedBookmarksProvider';

export default function FeedLayout({ children }: { children: ReactNode }) {
  return (
    <FeedBookmarksProvider>
      <div className="flex min-h-0 flex-1 flex-col">{children}</div>
    </FeedBookmarksProvider>
  );
}
