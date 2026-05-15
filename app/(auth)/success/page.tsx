'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo } from 'react';

import { useGetHomeData } from '@/api/generated/home/home';

/** 완료 문구를 보여 준 뒤 다음 화면으로 넘기기까지 (ms) */
const SUCCESS_DISPLAY_MS = 1400;

/**
 * 매직링크·소셜 로그인 직후 완료 화면 (`/success`)
 * Figma: `포치 임시` — 체크 완료 (1:2668), `public/icons/check.svg`만 사용
 *
 * 서버에 닉네임이 있으면 기존 회원으로 보고 「로그인 완료」 후 홈으로,
 * 없으면 신규 가입으로 보고 「회원가입 완료」 후 닉네임 설정으로 이동합니다.
 */
export default function AuthSuccessPage() {
  const router = useRouter();
  const { data, isLoading, isError } = useGetHomeData();
  const homeData = data?.result;
  const hasServerNickname = Boolean(homeData?.nickname?.trim());

  const nextPath = useMemo(() => {
    if (isLoading) {
      return null;
    }
    if (isError) {
      return '/login';
    }
    return hasServerNickname ? '/' : '/nickname';
  }, [isLoading, isError, hasServerNickname]);

  useEffect(() => {
    if (nextPath === null) {
      return;
    }
    const id = window.setTimeout(() => {
      router.replace(nextPath);
    }, SUCCESS_DISPLAY_MS);
    return () => window.clearTimeout(id);
  }, [nextPath, router]);

  const headline = isLoading
    ? '처리 중...'
    : isError
      ? '안내'
      : hasServerNickname
        ? '로그인 완료'
        : '회원가입 완료';

  const subline = isLoading
    ? '잠시만 기다려 주세요.'
    : isError
      ? '로그인 화면으로 이동합니다.'
      : hasServerNickname
        ? '잠시 후 홈으로 이동합니다.'
        : '잠시 후 닉네임을 설정할게요.';

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
          {headline}
        </h1>
        <p className="text-mono-dark-gray mt-2 text-sm leading-relaxed font-normal">
          {subline}
        </p>
      </div>
    </main>
  );
}
