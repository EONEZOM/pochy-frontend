'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { bootstrapClientSession } from '@/lib/bootstrap-client-session';
import { markOpeningSeen } from '@/lib/opening-seen';
import {
  resolvePostAuthPath,
  type PostAuthPath,
} from '@/lib/resolve-post-auth-path';

/** 완료 문구를 보여 준 뒤 다음 화면으로 넘기기까지 (ms) */
const SUCCESS_DISPLAY_MS = 1400;

type SuccessPhase = 'loading' | 'ready' | 'error';

/**
 * 매직링크·소셜 로그인 직후 완료 화면 (`/success`)
 * Figma: `포치 임시` — 체크 완료 (1:2668), `public/icons/check.svg`만 사용
 *
 * 서버에 닉네임이 있으면 기존 회원으로 보고 「로그인 완료」 후 홈으로,
 * 없으면 신규 가입으로 보고 「회원가입 완료」 후 닉네임 설정으로 이동합니다.
 */
export default function AuthSuccessPage() {
  const router = useRouter();
  const [phase, setPhase] = useState<SuccessPhase>('loading');
  const [nextPath, setNextPath] = useState<PostAuthPath | null>(null);
  const [hasServerNickname, setHasServerNickname] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const prepareSession = async () => {
      try {
        await bootstrapClientSession();
        if (!isMounted) {
          return;
        }

        markOpeningSeen();
        const path = await resolvePostAuthPath();
        if (!isMounted) {
          return;
        }

        setHasServerNickname(path === '/');
        setNextPath(path);
        setPhase('ready');
      } catch {
        if (!isMounted) {
          return;
        }
        setNextPath('/login');
        setPhase('error');
      }
    };

    void prepareSession();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (phase === 'loading' || nextPath === null) {
      return;
    }

    const id = window.setTimeout(() => {
      router.replace(nextPath);
    }, SUCCESS_DISPLAY_MS);

    return () => window.clearTimeout(id);
  }, [phase, nextPath, router]);

  const headline =
    phase === 'loading'
      ? '처리 중...'
      : phase === 'error'
        ? '안내'
        : hasServerNickname
          ? '로그인 완료'
          : '회원가입 완료';

  const subline =
    phase === 'loading'
      ? '잠시만 기다려 주세요.'
      : phase === 'error'
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
