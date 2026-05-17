'use client';

import Image from 'next/image';
import { motion } from 'framer-motion';

/** Figma: 위시 - 스캔 진행중 (782-7681 초반 / 782-7695 완료 임박) — 로고 동일, 카피만 교체 */
const LOADING_COPY = [
  '조금만 기다려 주세요✨\n제품 정보를 정리하고 있어요.',
  '거의 다 됐어요✨\n마지막 확인 중이에요.',
] as const;

type WishScanAnalyzeLoadingProps = {
  phase: 0 | 1;
};

export function WishScanAnalyzeLoading({ phase }: WishScanAnalyzeLoadingProps) {
  return (
    <div
      className="pointer-events-auto fixed top-0 bottom-0 left-1/2 z-[60] flex w-full max-w-120 min-w-90 -translate-x-1/2 flex-col items-center justify-center px-6"
      style={{
        background:
          'linear-gradient(180deg, rgba(255, 255, 255, 1) 12%, rgba(255, 198, 236, 1) 100%)',
      }}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="flex max-w-[201px] flex-col items-center gap-10">
        <motion.div
          className="relative h-[82px] w-[118px]"
          animate={{ y: [0, -10, 0] }}
          transition={{
            duration: 0.85,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        >
          <Image
            src="/logo/main-logo.png"
            alt="POCHY"
            fill
            className="object-contain"
            priority
          />
        </motion.div>
        <p className="w-full text-center text-sm leading-[150%] font-normal whitespace-pre-line text-[#161618]">
          {LOADING_COPY[phase]}
        </p>
      </div>
    </div>
  );
}
