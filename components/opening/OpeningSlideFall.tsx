'use client';

import Image from 'next/image';

import { cn } from '@/lib/utils';

const OPENING_SLIDE_SRC = '/figma/opening/opening-슬라이드.svg';

/** 슬라이드 창 하단 — 지퍼 입구 (뷰포트 하단 기준, 366×186 SVG) */
const SLIDE_WINDOW_BOTTOM = 'min(40vw, 148px)';

/** 슬라이드 스트립 가로 폭 — 앱 레이아웃(max 360px) 안 지퍼 입구에 맞춤 */
const SLIDE_TRACK_WIDTH_CLASS = 'mx-auto w-[min(58vw,220px)] max-w-full';

const SLIDE_IMAGE_CLASS =
  'block h-auto w-full max-w-full border-0 outline-none shadow-none [backface-visibility:hidden]';

/**
 * 오프닝 슬라이드 — 화면 상단~지퍼 구간 무한 낙하 (CSS % 루프, 동일 SVG 2장)
 */
export const OpeningSlideFall = () => {
  return (
    <div
      className="pointer-events-none fixed top-0 left-1/2 z-[2] w-full max-w-[500px] -translate-x-1/2 overflow-hidden"
      style={{ bottom: SLIDE_WINDOW_BOTTOM }}
      aria-hidden
    >
      <div className="flex h-full w-full justify-center overflow-hidden">
        <div
          className={cn(
            'opening-slide-fall min-w-0 overflow-hidden',
            SLIDE_TRACK_WIDTH_CLASS,
          )}
        >
          <div className="opening-slide-fall__frame shrink-0 overflow-hidden">
            <Image
              src={OPENING_SLIDE_SRC}
              alt=""
              width={456}
              height={2398}
              unoptimized
              className={cn(SLIDE_IMAGE_CLASS, 'shrink-0')}
              priority
            />
          </div>
          <div
            className="opening-slide-fall__frame shrink-0 overflow-hidden"
            aria-hidden
          >
            <Image
              src={OPENING_SLIDE_SRC}
              alt=""
              width={456}
              height={2398}
              unoptimized
              className={cn(SLIDE_IMAGE_CLASS, 'shrink-0')}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
