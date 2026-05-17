'use client';

import { cn } from '@/lib/utils';

type PouchNextButtonProps = {
  label?: string;
  isDisabled?: boolean;
  isLoading?: boolean;
  onClick?: () => void;
};

export function PouchNextButton({
  label = '\uB2E4\uC74C',
  isDisabled = false,
  isLoading = false,
  onClick,
}: PouchNextButtonProps) {
  return (
    <button
      type="button"
      disabled={isDisabled || isLoading}
      onClick={onClick}
      className={cn(
        'border-mono-bright-gray text-mono-jet h-9 min-w-[75px] shrink-0 rounded-full border bg-white px-6 text-base font-bold',
        'disabled:text-mono-dark-gray disabled:cursor-not-allowed',
        !isDisabled &&
          !isLoading &&
          'border-[#FF93DB] bg-[#FF93DB] text-mono-jet',
      )}
    >
      {isLoading ? '...' : label}
    </button>
  );
}
