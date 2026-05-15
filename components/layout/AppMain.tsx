'use client';

import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';
import { useBottomNavVisibility } from '@/providers/bottom-nav-visibility';

type AppMainProps = {
  children: ReactNode;
};

export const AppMain = ({ children }: AppMainProps) => {
  const { isHomeEmptyViewActive } = useBottomNavVisibility();

  return (
    <main
      className={cn(
        'flex min-h-0 flex-1 flex-col bg-white',
        !isHomeEmptyViewActive && 'pb-14',
      )}
    >
      {children}
    </main>
  );
};
