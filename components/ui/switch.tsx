'use client';

import * as React from 'react';
import { Switch as SwitchPrimitive } from 'radix-ui';

import { cn } from '@/lib/utils';

function Switch({
  className,
  size = 'default',
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root> & {
  size?: 'sm' | 'default';
}) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      data-size={size}
      className={cn(
        'peer group/switch relative inline-flex shrink-0 items-center rounded-full border border-transparent transition-all outline-none',
        'after:absolute after:-inset-x-3 after:-inset-y-2',
        'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-3',
        'aria-invalid:border-destructive aria-invalid:ring-destructive/20 aria-invalid:ring-3',
        'data-[size=default]:h-[18.4px] data-[size=default]:w-8',
        'data-[size=sm]:h-3.5 data-[size=sm]:w-6',
        'data-[state=checked]:bg-primary data-[state=unchecked]:bg-input',
        'data-disabled:cursor-not-allowed data-disabled:opacity-50',
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          'pointer-events-none block rounded-full bg-white ring-0 transition-transform',
          'group-data-[size=default]/switch:size-4',
          'group-data-[size=sm]/switch:size-3',
          'group-data-[size=default]/switch:data-[state=checked]:translate-x-[calc(100%-2px)]',
          'group-data-[size=sm]/switch:data-[state=checked]:translate-x-[calc(100%-2px)]',
          'group-data-[size=default]/switch:data-[state=unchecked]:translate-x-0',
          'group-data-[size=sm]/switch:data-[state=unchecked]:translate-x-0',
        )}
      />
    </SwitchPrimitive.Root>
  );
}

export { Switch };
