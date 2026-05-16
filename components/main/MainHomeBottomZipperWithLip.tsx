'use client';

import Image from 'next/image';

import { cn } from '@/lib/utils';

type MainHomeBottomZipperWithLipProps = {
  className?: string;
  panelClassName?: string;
  imageClassName?: string;
};

/**
 * `MainHomeEmptyView` 하단과 동일 — 아래지퍼·꼬다리·립 (`public/figma/main/*`)
 */
export function MainHomeBottomZipperWithLip({
  className,
  panelClassName,
  imageClassName,
}: MainHomeBottomZipperWithLipProps) {
  return (
    <div
      className={cn(
        'relative z-10 mt-2 w-full shrink-0 overflow-hidden sm:mt-3',
        className,
      )}
    >
      <div
        className={cn(
          'relative w-full overflow-hidden',
          'h-[min(calc(var(--app-height)*0.28),168px)]',
          panelClassName,
        )}
      >
        <Image
          src="/figma/main/아래지퍼.svg"
          alt=""
          fill
          unoptimized
          className={cn('object-cover object-top', imageClassName)}
          sizes="(max-width: 480px) 100vw, 480px"
          priority
          fetchPriority="high"
        />
        <div className="pointer-events-none absolute right-2 bottom-0 z-10 w-[min(28vw,112px)] sm:right-3 sm:bottom-[-10px]">
          <Image
            src="/figma/main/립스틱.svg"
            alt=""
            width={112}
            height={112}
            unoptimized
            className="h-auto w-full object-contain object-bottom"
          />
        </div>
      </div>
    </div>
  );
}
