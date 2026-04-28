'use client';

import { WishlistHeader } from '@/components/wishlist/WishlistHeader';

export default function WishlistLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <WishlistHeader />
      {children}
    </>
  );
}
