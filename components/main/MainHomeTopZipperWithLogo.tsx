'use client';

import Image from 'next/image';

/**
 * `MainHomeEmptyView` 상단과 동일 — `public/figma/main/윗지퍼*.svg` + 로고
 */
export function MainHomeTopZipperWithLogo() {
  return (
    <div className="relative h-[min(26dvh,132px)] w-full shrink-0 overflow-hidden">
      <Image
        src="/figma/main/윗지퍼.svg"
        alt=""
        fill
        unoptimized
        className="object-cover object-bottom"
        sizes="(max-width: 480px) 100vw, 480px"
        priority
      />
      <Image
        src="/figma/main/윗지퍼찍찍.svg"
        alt=""
        fill
        unoptimized
        className="object-cover object-bottom"
        sizes="(max-width: 480px) 100vw, 480px"
      />
      <div className="absolute inset-0 flex items-center justify-center px-4 pt-1 pb-5">
        <Image
          src="/figma/login/hero-1.svg"
          alt="POCHY"
          width={144}
          height={96}
          unoptimized
          className="h-auto w-[min(128px,34vw)] object-contain drop-shadow-[0_2px_8px_rgba(0,0,0,0.15)]"
          priority
        />
      </div>
    </div>
  );
}
