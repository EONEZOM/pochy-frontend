'use client';

import React, { useId } from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface ToggleProps extends React.ComponentPropsWithoutRef<typeof Switch> {
  label?: string;
  labelPosition?: 'left' | 'right';
}

export default function Toggle({
  label,
  labelPosition = 'right',
  className,
  id,
  ...props
}: ToggleProps) {
  const generatedId = useId();
  const switchId = id || generatedId;

  return (
    <div className={cn('flex items-center gap-3', className)}>
      {/* 라벨이 왼쪽 */}
      {label && labelPosition === 'left' && (
        <Label
          htmlFor={switchId}
          className="text-mono-jet cursor-pointer text-sm font-bold"
        >
          {label}
        </Label>
      )}

      {/* 스위치 본체 */}
      <Switch
        id={switchId}
        className="data-[state=checked]:bg-brand-pink data-[state=unchecked]:bg-mono-gray"
        {...props}
      />

      {/* 라벨이 오른쪽 */}
      {label && labelPosition === 'right' && (
        <Label
          htmlFor={switchId}
          className="text-mono-jet cursor-pointer text-sm font-bold"
        >
          {label}
        </Label>
      )}
    </div>
  );
}
