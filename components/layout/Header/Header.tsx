'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

import { Star, Share2 } from 'lucide-react';

const HEADER_ICON = {
  back: '/icons/back.svg',
  search: '/icons/search.svg',
  filter: '/icons/filter.svg',
} as const;

import { Button } from '@/components/ui/button';
import Input from '@/components/common/Input/Input';
import { cn } from '@/lib/utils';
import { withViewTransition } from '@/lib/view-transition-navigate';

const ICON_CONFIG = {
  search: {
    label: '검색',
    element: (
      <Image
        src={HEADER_ICON.search}
        alt=""
        width={24}
        height={24}
        unoptimized
      />
    ),
  },
  filter: {
    label: '필터',
    element: (
      <Image
        src={HEADER_ICON.filter}
        alt=""
        width={24}
        height={24}
        unoptimized
      />
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
  text?: string;
  /** `register` 등 텍스트 버튼 왼쪽 아이콘 (`public` 기준 경로, 예: `/icons/PenNewSquare.svg`) */
  iconSrc?: string;
};

export type HeaderRightIcons = HeaderRightIconBase[];

export type HeaderProps = {
  className?: string;
  showBack?: boolean;
  onBack?: () => void;
  onSearch?: () => void;
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
  onSearch?: () => void;
  searchProps?: Omit<
    React.ComponentProps<typeof Input>,
    'className' | 'rightElement'
  > & {
    className?: string;
  };
};

export type HeaderVariantProps =
  | HeaderTitleVariantProps
  | HeaderSearchVariantProps;
export type HeaderComponentProps = HeaderProps & HeaderVariantProps;

export default function Header({
  className,
  showBack = true,
  onBack,
  backAriaLabel = '뒤로 가기',
  variant = 'title',
  title,
  searchProps,
  onSearch,
  right,
  rightIcons,
  sticky,
}: HeaderComponentProps) {
  const router = useRouter();

  const handleBack = React.useCallback(() => {
    withViewTransition(() => {
      if (onBack) {
        onBack();
        return;
      }
      router.back();
    });
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
            <Image
              src={HEADER_ICON.back}
              alt=""
              width={24}
              height={24}
              unoptimized
            />
          </Button>
        )}
      </div>

      {/* 중앙 영역 */}
      <div
        className={cn(
          'pointer-events-none absolute inset-0 flex items-center',
          variant === 'search' ? 'px-12' : 'justify-center px-14',
        )}
      >
        {variant === 'title' ? (
          <h3 className="pointer-events-auto max-w-full truncate text-center text-base font-bold tracking-tight text-zinc-900">
            {title}
          </h3>
        ) : (
          // 일단 공통컴포넌트 만들어둔거 적용하겠음
          // <Input
          //   {...searchProps}
          //   type={searchProps?.type ?? 'search'}
          //   enterKeyHint={searchProps?.enterKeyHint ?? 'search'}
          //   className={cn(
          //     'pointer-events-auto absolute left-15 h-10 w-[calc(90%-60px)] max-w-full rounded-lg border-zinc-900/80 bg-white text-sm font-medium text-zinc-900 placeholder:text-zinc-400 focus-visible:border-zinc-900 focus-visible:ring-zinc-900/20',
          //     searchProps?.className,
          //   )}
          // />
          <Input
            {...searchProps}
            type={searchProps?.type ?? 'search'}
            onKeyDown={(e) => {
              searchProps?.onKeyDown?.(e);
              if (e.key === 'Enter') {
                onSearch?.();
              }
            }}
            className="pointer-events-auto w-full"
            rightElement={
              <button
                type="button"
                className="cursor-pointer"
                onClick={onSearch}
              >
                <Image
                  src={HEADER_ICON.search}
                  alt="검색"
                  width={18}
                  height={18}
                  unoptimized
                />
              </button>
            }
          />
        )}
      </div>

      {/* 우측 영역 */}
      <div className="z-10 ml-auto flex min-h-10 shrink-0 items-center justify-end gap-1.5">
        {rightIcons?.map((item, index) => {
          const config = ICON_CONFIG[item.kind];
          const isRegister = item.kind === 'register';
          const content =
            isRegister && item.text ? (
              item.iconSrc ? (
                <span className="flex items-center gap-1.5">
                  <Image
                    src={item.iconSrc}
                    alt=""
                    width={18}
                    height={18}
                    unoptimized
                    className="shrink-0"
                  />
                  <span className="text-sm font-semibold">{item.text}</span>
                </span>
              ) : (
                <span className="text-sm font-semibold">{item.text}</span>
              )
            ) : (
              config.element
            );
          return (
            <Button
              key={`${item.kind}-${index}`}
              type="button"
              variant={isRegister ? 'default' : 'ghost'}
              size={isRegister ? 'sm' : 'icon'}
              className={cn(
                isRegister &&
                  'h-9 w-auto rounded-full bg-zinc-900 px-4 text-white hover:bg-zinc-900/90',
                item.kind === 'favorite' && 'rounded-full text-zinc-900',
                item.className,
              )}
              aria-label={item.ariaLabel ?? config.label}
              onClick={item.onClick}
            >
              {content}
            </Button>
          );
        })}
        {right}
      </div>
    </header>
  );
}
