'use client';

import Image from 'next/image';

/**
 * `MainHomeEmptyView` 하단과 동일 — 아래지퍼·꼬다리·립 (`public/figma/main/*`)
 */
export function MainHomeBottomZipperWithLip() {
  return (
    <div className="relative z-10 mt-2 w-full shrink-0 overflow-hidden sm:mt-3">
      <div className="relative h-[min(28dvh,168px)] w-full overflow-hidden">
        <Image
          src="/figma/main/아래지퍼.svg"
          alt=""
          fill
          unoptimized
          className="absolute top-0 left-0 z-0 h-full w-full object-cover object-top sm:top-1"
          sizes="(max-width: 480px) 100vw, 480px"
        />
        <Image
          src="/figma/main/지퍼꼬다리.svg"
          alt=""
          width={72}
          height={72}
          unoptimized
          className="absolute bottom-9 left-3 z-10 h-auto w-[min(18vw,68px)] object-contain drop-shadow-[0_1px_4px_rgba(0,0,0,0.12)]"
        />
        <Image
          src="/figma/main/hero-2.png"
          alt=""
          width={420}
          height={420}
          unoptimized
          className="absolute -right-24 bottom-[-30px] z-10 max-h-[min(32dvh,180px)] w-auto origin-bottom-right rotate-[8deg] object-contain object-bottom drop-shadow-[0_4px_14px_rgba(0,0,0,0.18)] sm:-right-20"
        />
      </div>
    </div>
  );
}
