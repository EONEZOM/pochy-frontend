'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';

/** 완료 화면을 보여 준 뒤 홈(닉네임 설정)으로 넘기기까지 (ms) */
const SUCCESS_DISPLAY_MS = 1400;

/**
 * 첫 로그인 직후 완료 화면 (매직링크·소셜 로그인 후 `/success`)
 * Figma: `포치 임시` — 체크 완료 (1:2668), `public/icons/check.svg`만 사용
 * https://www.figma.com/design/ozRGHFE4rnqkqnikqCh7Pg/%ED%8F%AC%EC%B9%98-%EC%9E%84%EC%8B%9C?node-id=1-2668
 *
 * 잠시 노출 후 닉네임 설정을 위해 `/?setupNickname=1`로 자동 이동합니다.
 */
export default function AuthSuccessPage() {
  const router = useRouter();
  const didScheduleRef = useRef(false);

  useEffect(() => {
    if (didScheduleRef.current) {
      return;
    }
    didScheduleRef.current = true;
    const id = window.setTimeout(() => {
      router.replace('/?setupNickname=1');
    }, SUCCESS_DISPLAY_MS);
    return () => window.clearTimeout(id);
  }, [router]);

  return (
    <main className="relative flex min-h-0 flex-1 flex-col overflow-x-hidden px-6 pt-[max(2.5rem,var(--safe-area-top))] pb-[max(2rem,var(--safe-area-bottom))]">
      <div className="mx-auto flex w-full max-w-[320px] flex-1 flex-col items-center justify-center text-center">
        <Image
          src="/icons/check.svg"
          alt="완료"
          width={63}
          height={63}
          className="size-[100px] shrink-0 object-contain"
          unoptimized
          priority
        />
        <h1 className="text-mono-jet mt-8 text-xl leading-7 font-bold">
          회원가입 완료
        </h1>
        <p className="text-mono-dark-gray mt-2 text-sm leading-relaxed font-normal">
          잠시 후 닉네임을 설정할게요.
        </p>
      </div>
    </main>
  );
}
