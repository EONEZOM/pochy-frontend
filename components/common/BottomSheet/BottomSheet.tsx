'use client';

import * as React from 'react';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer';
import { cn } from '@/lib/utils';

type BottomSheetProps = React.ComponentPropsWithoutRef<typeof Drawer> & {
  trigger?: React.ReactNode;
  children: React.ReactNode;
  title?: string;
  description?: string;
  className?: string;
  showHandle?: boolean;
};

export function BottomSheet({
  trigger,
  children,
  title,
  description,
  className,
  showHandle = true,
  ...props
}: BottomSheetProps) {
  return (
    <Drawer {...props}>
      {trigger && <DrawerTrigger asChild>{trigger}</DrawerTrigger>}
      <DrawerContent
        className={cn(
          'mx-auto max-w-[480px] border-none bg-white shadow-2xl',
          className,
        )}
      >
        {showHandle && (
          <div className="mx-auto h-1.5 w-12 shrink-0 rounded-full bg-zinc-300" />
        )}

        <div className="flex flex-col overflow-hidden">
          {(title || description) && (
            <DrawerHeader className="px-6 pt-6 pb-2 text-left">
              {title && (
                <DrawerTitle className="text-xl font-bold tracking-tight text-zinc-900">
                  {title}
                </DrawerTitle>
              )}
              {description && (
                <DrawerDescription className="text-sm text-zinc-500">
                  {description}
                </DrawerDescription>
              )}
            </DrawerHeader>
          )}

          <div className="relative flex-1 overflow-y-auto px-6 pb-8">
            {children}
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
