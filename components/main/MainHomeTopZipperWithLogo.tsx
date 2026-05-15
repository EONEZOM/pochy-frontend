'use client';

import Image from 'next/image';

import { cn } from '@/lib/utils';

type MainHomeTopZipperWithLogoProps = {
  className?: string;
  panelClassName?: string;
  imageClassName?: string;
};

/**
 * `MainHomeEmptyView` 상단과 동일 — `public/figma/main/윗지퍼*.svg` + 로고
 */
export function MainHomeTopZipperWithLogo({
  className,
  panelClassName,
  imageClassName,
}: MainHomeTopZipperWithLogoProps) {
  return (
    <div
      className={cn(
        'relative w-full shrink-0 overflow-hidden',
        'h-[min(calc(var(--app-height)*0.38),180px)]',
        panelClassName,
        className,
      )}
    >
      <Image
        src="/figma/main/윗지퍼.svg"
        alt=""
        fill
        unoptimized
        className={cn(
          'top-[-10px] h-[calc(100%+50px)] origin-bottom object-cover object-bottom',
          imageClassName,
        )}
        sizes="(max-width: 480px) 100vw, 480px"
        priority
      />
      <div className="absolute inset-0 flex items-center justify-center px-4 pt-1 pb-5">
        <Image
          src="/figma/login/hero-1.svg"
          alt="POCHY"
          width={144}
          height={96}
          unoptimized
          className="h-auto w-[min(200px,34vw)] object-contain drop-shadow-[0_2px_8px_rgba(0,0,0,0.15)]"
          priority
        />
      </div>
    </div>
  );
}
