'use client';

import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';

import { isBottomNavHiddenPathname } from '@/components/layout/BottomNav/BottomNav';
import { cn } from '@/lib/utils';
import { useBottomNavVisibility } from '@/providers/bottom-nav-visibility';

type AppMainProps = {
  children: ReactNode;
};

export const AppMain = ({ children }: AppMainProps) => {
  const pathname = usePathname() ?? '/';
  const { isHomeEmptyViewActive } = useBottomNavVisibility();
  const shouldPadForBottomNav =
    !isHomeEmptyViewActive && !isBottomNavHiddenPathname(pathname);

  return (
    <main
      className={cn(
        'flex min-h-0 flex-1 flex-col bg-white',
        shouldPadForBottomNav && 'pb-14',
      )}
    >
      {children}
    </main>
  );
};
