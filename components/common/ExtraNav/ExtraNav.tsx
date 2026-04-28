'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Plus, X } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import Image from 'next/image';

export interface ExtraNavItem {
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
}

export function ExtraNav({
  items,
  title,
  trigger,
  align = 'end',
  side = 'top',
  className,
}: ExtraNavProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        {trigger ?? (
          // 기본 트리거: + / x 버튼
          <button
            type="button"
            className="bg-mono-jet pointer-events-auto flex size-16 items-center justify-center rounded-full text-white shadow-lg transition-all duration-200 active:scale-95"
            aria-label={isOpen ? '닫기' : '등록하기'}
          >
            {isOpen ? <X size={36} /> : <Plus size={36} />}
          </button>
        )}
      </PopoverTrigger>

      <PopoverContent
        side={side}
        align={align}
        sideOffset={16}
        className={cn(
          // 피그마 스펙: radius 100px, padding 8px, gap 8px, 배경 연한 회색
          'bg-mono-bright-gray w-62 rounded-3xl border-0 p-6 shadow-xl ring-0',
          className,
        )}
      >
        {title && (
          <p className="text-mono-jet py-2 text-center text-sm font-bold">
            {title}
          </p>
        )}
        {/* 아이템 목록 */}
        <div className="flex flex-col gap-2.5">
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

            const itemClass =
              'group flex h-12 w-full items-center justify-center gap-2 rounded-full bg-white px-2 text-sm font-medium text-mono-jet shadow-[0_9px_15.4px_0_rgba(0,0,0,0.15)] transition-colors hover:bg-black hover:text-white active:scale-95';

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
