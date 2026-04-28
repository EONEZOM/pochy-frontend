import { Suspense } from 'react';

import { MagicLinkSentContent } from './magic-link-sent-content';

function SentFallback() {
  return (
    <div className="min-h-screen bg-white pt-[var(--safe-area-top)]" />
  );
}

export default function MagicLinkSentPage() {
  return (
    <Suspense fallback={<SentFallback />}>
      <MagicLinkSentContent />
    </Suspense>
  );
}
