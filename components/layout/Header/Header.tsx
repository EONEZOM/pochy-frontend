'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

import backIcon from '@/public/icons/back.svg';
import searchIcon from '@/public/icons/serch.png';
import filterIcon from '@/public/icons/filter.svg';
import { Star, Share2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

const ICON_CONFIG = {
  search: {
    label: '검색',
    element: (
      <Image src={searchIcon} alt="search-icon" width={24} height={24} />
    ),
  },
  filter: {
    label: '필터',
    element: (
      <Image src={filterIcon} alt="filter-icon" width={24} height={24} />
    ),
  },
  register: {
    label: '등록',
    element: <span className="text-sm font-semibold">등록</span>,
  },
  share: {
    label: '공유',
    element: <Share2 className="size-5 text-zinc-900" />,
  },
  favorite: {
    label: '즐겨찾기',
    element: <Star className="size-5 text-zinc-900" />,
  },
} as const;

type HeaderRightIconKind = keyof typeof ICON_CONFIG;

type HeaderRightIconBase = {
  kind: HeaderRightIconKind;
  ariaLabel?: string;
  onClick?: () => void;
  className?: string;
};

export type HeaderRightIcons = HeaderRightIconBase[];

export type HeaderProps = {
  className?: string;
  showBack?: boolean;
  onBack?: () => void;
  backAriaLabel?: string;
  right?: React.ReactNode;
  rightIcons?: HeaderRightIcons;
  sticky?: boolean;
};

type HeaderTitleVariantProps = {
  variant?: 'title';
  title?: string;
  searchProps?: never;
};

type HeaderSearchVariantProps = {
  variant: 'search';
  title?: never;
  searchProps?: Omit<React.ComponentProps<'input'>, 'className'> & {
    className?: string;
  };
};

export type HeaderVariantProps =
  | HeaderTitleVariantProps
  | HeaderSearchVariantProps;
export type HeaderComponentProps = HeaderProps & HeaderVariantProps;

export function Header({
  className,
  showBack = true,
  onBack,
  backAriaLabel = '뒤로 가기',
  variant = 'title',
  title,
  searchProps,
  right,
  rightIcons,
  sticky,
}: HeaderComponentProps) {
  const router = useRouter();

  // 뒤로 가기 핸들러
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
      {/* 좌측 영역 */}
      <div className="z-10 flex w-10 shrink-0 items-center justify-start">
        {showBack && (
          <Button
            type="button"
            variant="ghost"
            size="icon-lg"
            className="text-zinc-900 [&_svg]:size-6"
            aria-label={backAriaLabel}
            onClick={handleBack}
          >
            <Image src={backIcon} alt="back-icon" width={24} height={24} />
          </Button>
        )}
      </div>

      {/* 중앙 영역 */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-14">
        {variant === 'title' ? (
          <h3 className="pointer-events-auto max-w-full truncate text-center text-base font-bold tracking-tight text-zinc-900">
            {title}
          </h3>
        ) : (
          <Input
            {...searchProps}
            type={searchProps?.type ?? 'search'}
            enterKeyHint={searchProps?.enterKeyHint ?? 'search'}
            className={cn(
              'pointer-events-auto absolute left-15 h-10 w-[calc(90%-60px)] max-w-full rounded-lg border-zinc-900/80 bg-white text-sm font-medium text-zinc-900 placeholder:text-zinc-400 focus-visible:border-zinc-900 focus-visible:ring-zinc-900/20',
              searchProps?.className,
            )}
          />
        )}
      </div>

      {/* 우측 영역 */}
      <div className="z-10 ml-auto flex min-h-10 shrink-0 items-center justify-end gap-1.5">
        {rightIcons?.map((item, index) => {
          const config = ICON_CONFIG[item.kind];
          return (
            <Button
              key={`${item.kind}-${index}`}
              type="button"
              variant="ghost"
              size="icon"
              className={cn(
                item.kind === 'register' && 'h-9 w-auto rounded-full px-4',
                item.kind === 'favorite' && 'rounded-full text-zinc-900',
                item.className,
              )}
              aria-label={item.ariaLabel ?? config.label}
              onClick={item.onClick}
            >
              {config.element}
            </Button>
          );
        })}
        {right}
      </div>
    </header>
  );
}
