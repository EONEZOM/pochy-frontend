'use client';

import React, { useId } from 'react';
import { Input as BaseInput } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface InputProps extends React.ComponentPropsWithoutRef<typeof BaseInput> {
  rightElement?: React.ReactNode;
}

export default function Input({
  rightElement,
  className,
  id,
  ...props
}: InputProps) {
  const generatedId = useId();
  const inputId = id || generatedId;

  return (
    <div className="relative flex items-center">
      <BaseInput
        id={inputId}
        className={cn(
          'border-mono-gray h-12 rounded-sm border px-4 py-4 text-sm',
          'placeholder:text-mono-dark-gray',
          'focus-visible:border-brand-pink focus-visible:ring-0',
          rightElement && 'pr-12',
          className,
        )}
        {...props}
      />
      {rightElement && (
        <div className="absolute right-4 flex items-center">{rightElement}</div>
      )}
    </div>
  );
}
