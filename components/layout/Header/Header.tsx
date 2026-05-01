'use client';

/**
 * 공통 상단 헤더
 *
 * 레이아웃(중요):
 * - 좌측: 고정 폭(w-10) — 뒤로가기
 * - 중앙: absolute inset-0 — 제목 또는 검색 입력이 화면 중앙 정렬
 * - 우측: ml-auto — rightIcons / right 슬롯
 *
 * 중앙을 absolute로 깔아두기 때문에, 좌·우 버튼이 클릭되려면 z-10이 필요합니다.
 * 중앙 래퍼는 pointer-events-none이고, 실제 타이틀/인풋만 pointer-events-auto입니다.
 *
 * variant:
 * - title: 가운데 문자열 제목
 * - search: 가운데 검색 Input (우측 작은 돋보기는 rightElement)
 */

import * as React from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

import { Star, Share2 } from 'lucide-react';

/** 헤더 전용 정적 아이콘 경로 (public/icons) */
const HEADER_ICON = {
  back: '/icons/back.svg',
  search: '/icons/search.svg',
  filter: '/icons/filter.svg',
} as const;

import { Button } from '@/components/ui/button';
import Input from '@/components/common/Input/Input';
import { cn } from '@/lib/utils';

/**
 * rightIcons에 넘기는 kind → 버튼 라벨·썸네일 매핑
 * 새 아이콘 추가 시: HEADER_ICON에 경로 추가 후 여기에 항목 추가
 */
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
};

export type HeaderRightIcons = HeaderRightIconBase[];

export type HeaderProps = {
  className?: string;
  /** false면 좌측 영역은 빈 칸(w-10)만 유지 — 중앙 제목 위치는 그대로 */
  showBack?: boolean;
  onBack?: () => void;
  /** variant === 'search'일 때 Enter 또는 인풋 우측 돋보기 클릭 시 호출 */
  onSearch?: () => void;
  backAriaLabel?: string;
  /** rightIcons 뒤에 커스텀 노드 붙일 때 */
  right?: React.ReactNode;
  /** 우측 아이콘 버튼들 — 순서대로 렌더 */
  rightIcons?: HeaderRightIcons;
  sticky?: boolean;
};

/** 기본 모드: 중앙에 title 문자열 */
type HeaderTitleVariantProps = {
  variant?: 'title';
  title?: string;
  searchProps?: never;
};

/** 검색 전용 모드: 중앙 전체가 검색창 — 피드 등에서 검색 모드로 헤더 교체할 때 사용 */
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

  /** onBack 없으면 브라우저 history.back() */
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
      {/* 좌측: 항상 w-10 확보 → 중앙 absolute 제목이 시각적 중심과 맞도록 */}
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

      {/* 중앙: 전체 헤더 위에 덮는 레이어 — 좌우 버튼과 겹치지 않게 좌우 px 조정 */}
      <div
        className={cn(
          'pointer-events-none absolute inset-0 flex items-center',
          variant === 'search'
            ? 'px-12'
            : 'justify-center px-14',
        )}
      >
        {variant === 'title' ? (
          <h3 className="pointer-events-auto max-w-full truncate text-center text-base font-bold tracking-tight text-zinc-900">
            {title}
          </h3>
        ) : (
          // 검색 인풋 우측 돋보기는 Input의 rightElement (헤더 우측 rightIcons와 별개)
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

      {/* 우측: 스택 순서상 중앙 레이어보다 위(z-10) — 탭 영역은 여기 */}
      <div className="z-10 ml-auto flex min-h-10 shrink-0 items-center justify-end gap-1.5">
        {rightIcons?.map((item, index) => {
          const config = ICON_CONFIG[item.kind];
          const isRegister = item.kind === 'register';
          const content =
            isRegister && item.text ? (
              <span className="text-sm font-semibold">{item.text}</span>
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
