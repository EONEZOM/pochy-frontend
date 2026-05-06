'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Plus, X } from 'lucide-react';
import { createPortal } from 'react-dom';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import Image from 'next/image';

export interface ExtraNavItem {
  key?: string;
  label: string;
  href?: string;
  onClick?: () => void;
  icon?: string;
}

interface ExtraNavProps {
  items: ExtraNavItem[];
  title?: string;
  trigger?: React.ReactNode;
  align?: 'start' | 'center' | 'end';
  side?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
  selectedKey?: string;
  dimBackdrop?: boolean;
}

export function ExtraNav({
  items,
  title,
  trigger,
  align = 'end',
  side = 'top',
  className,
  selectedKey,
  dimBackdrop = false,
}: ExtraNavProps) {
  const [isOpen, setIsOpen] = useState(false);
  const shouldRenderBackdrop = dimBackdrop && isOpen;
  const backdrop =
    shouldRenderBackdrop && typeof window !== 'undefined'
      ? createPortal(
          <button
            type="button"
            aria-label="메뉴 닫기"
            className="fixed inset-0 z-40 bg-black/45 backdrop-blur-[1px]"
            onClick={() => setIsOpen(false)}
          />,
          document.body,
        )
      : null;

  if (!trigger) {
    return (
      <div className="pointer-events-auto relative">
        {backdrop}

        <div className="absolute right-0 bottom-0 z-50 flex flex-col items-end gap-2">
          <div
            className={cn(
              'flex flex-col gap-2 transition-all duration-200',
              isOpen
                ? 'translate-y-0 opacity-100'
                : 'pointer-events-none translate-y-1 opacity-0',
            )}
          >
            {items.map((item, index) => {
              const content = (
                <>
                  {item.icon && (
                    <Image
                      src={item.icon}
                      alt=""
                      width={20}
                      height={20}
                      unoptimized
                    />
                  )}
                  <span className="text-sm font-semibold text-zinc-900">
                    {item.label}
                  </span>
                </>
              );

              const itemClass =
                'flex h-11 min-w-40 items-center justify-center gap-2 rounded-full bg-[#ffe9ef] px-4 shadow-sm transition-all hover:bg-[#ffdfe9] active:scale-[0.98]';

              return item.href ? (
                <Link
                  key={`${item.label}-${index}`}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className={itemClass}
                >
                  {content}
                </Link>
              ) : (
                <button
                  key={`${item.label}-${index}`}
                  type="button"
                  onClick={() => {
                    item.onClick?.();
                    setIsOpen(false);
                  }}
                  className={itemClass}
                >
                  {content}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            className={cn(
              'bg-mono-jet flex size-12 items-center justify-center rounded-full text-white shadow-lg transition-all duration-200 active:scale-95',
              isOpen && 'bg-zinc-400',
            )}
            aria-label={isOpen ? '닫기' : '등록하기'}
            onClick={() => setIsOpen((prev) => !prev)}
          >
            {isOpen ? <X size={22} /> : <Plus size={22} />}
          </button>
        </div>
      </div>
    );
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      {backdrop}
      <PopoverTrigger asChild>
        {trigger ?? (
          // 기본 트리거: + / x 버튼
          <button
            type="button"
            className="bg-mono-jet pointer-events-auto flex size-12 items-center justify-center rounded-full text-white shadow-lg transition-all duration-200 active:scale-95"
            aria-label={isOpen ? '닫기' : '등록하기'}
          >
            {isOpen ? <X size={24} /> : <Plus size={24} />}
          </button>
        )}
      </PopoverTrigger>

      <PopoverContent
        side={side}
        align={align}
        sideOffset={16}
        className={cn(
          'w-40 rounded-2xl border-0 bg-white p-5 shadow-[0_12px_30px_rgba(0,0,0,0.12)] ring-0',
          className,
        )}
      >
        {title && (
          <p className="text-mono-jet py-2 text-center text-sm font-bold">
            {title}
          </p>
        )}
        {/* 아이템 목록 */}
        <div className="flex flex-col gap-2">
          {items.map((item, index) => {
            const content = (
              <>
                {item.icon && (
                  <Image
                    src={item.icon}
                    alt=""
                    width={20}
                    height={20}
                    unoptimized
                    className="transition-all group-hover:brightness-0 group-hover:invert"
                  />
                )}
                <span>{item.label}</span>
              </>
            );

            const isSelected =
              (item.key && selectedKey && item.key === selectedKey) ||
              (!item.key && selectedKey && item.label === selectedKey);
            const itemClass = cn(
              'group flex h-11 w-full items-center justify-center gap-2 rounded-full px-2 text-sm font-semibold transition-colors active:scale-[0.98]',
              isSelected
                ? 'bg-[#ff9dc8] text-white'
                : 'bg-transparent text-zinc-900 hover:bg-white/70',
            );

            return item.href ? (
              <Link
                key={index}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className={itemClass}
              >
                {content}
              </Link>
            ) : (
              <button
                key={index}
                type="button"
                onClick={() => {
                  item.onClick?.();
                  setIsOpen(false);
                }}
                className={itemClass}
              >
                {content}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
