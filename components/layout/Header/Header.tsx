'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export type HeaderProps = {
  className?: string;
  /** 기본 true */
  showBack?: boolean;
  /** 미지정 시 `router.back()` */
  onBack?: () => void;
  backAriaLabel?: string;
  /** `search`일 때는 중앙에 검색 입력 */
  variant?: 'title' | 'search';
  /** `variant === 'title'` */
  title?: string;
  /** `variant === 'search'` — `Input`에 그대로 전달 */
  searchProps?: Omit<React.ComponentProps<'input'>, 'className'> & {
    className?: string;
  };
  /** 오른쪽 액션(아이콘, 버튼 등) */
  right?: React.ReactNode;
  /** 상단 고정 */
  sticky?: boolean;
};

export function Header({
  className,
  showBack = true,
  onBack,
  backAriaLabel = '뒤로 가기',
  variant = 'title',
  title,
  searchProps,
  right,
  sticky,
}: HeaderProps) {
  const router = useRouter();

  const handleBack = React.useCallback(() => {
    if (onBack) {
      onBack();
      return;
    }
    router.back();
  }, [onBack, router]);

  return (
    <header
      className={cn(
        'relative flex h-14 w-full shrink-0 items-center border-b border-zinc-100 bg-white px-3',
        sticky && 'sticky top-0 z-40',
        className,
      )}
    >
      <div className="z-10 flex w-11 shrink-0 items-center justify-start">
        {showBack ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="text-zinc-900 [&_svg]:size-6"
            aria-label={backAriaLabel}
            onClick={handleBack}
          >
            <ChevronLeft strokeWidth={2} />
          </Button>
        ) : null}
      </div>

      <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-14">
        {variant === 'title' ? (
          <h1 className="pointer-events-auto max-w-full truncate text-center text-base font-bold tracking-tight text-zinc-900">
            {title}
          </h1>
        ) : (
          <Input
            {...searchProps}
            type={searchProps?.type ?? 'search'}
            enterKeyHint={searchProps?.enterKeyHint ?? 'search'}
            className={cn(
              'pointer-events-auto h-10 max-w-full rounded-lg border-zinc-900/80 bg-white text-sm font-medium text-zinc-900 placeholder:text-zinc-400 focus-visible:border-zinc-900 focus-visible:ring-zinc-900/20',
              searchProps?.className,
            )}
          />
        )}
      </div>

      <div className="z-10 ml-auto flex min-h-10 shrink-0 items-center justify-end gap-1.5">
        {right}
      </div>
    </header>
  );
}
