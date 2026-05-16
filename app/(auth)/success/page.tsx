'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { bootstrapClientSession } from '@/lib/bootstrap-client-session';
import { clearFullAuthSession } from '@/lib/clear-client-session';
import { markOpeningSeen } from '@/lib/opening-seen';
import { getGetHomeDataQueryKey } from '@/api/generated/home/home';
import { getGetMyProfileQueryKey } from '@/api/generated/member-controller/member-controller';
import { ensureDefaultProfileImage } from '@/lib/member-profile';
import {
  resolvePostAuthPath,
  type PostAuthPath,
} from '@/lib/resolve-post-auth-path';
import { clearOAuthSignupHints } from '@/utils/oauth-session';
import { useQueryClient } from '@tanstack/react-query';

/** 완료 문구를 보여 준 뒤 다음 화면으로 넘기기까지 (ms) */
const SUCCESS_DISPLAY_MS = 1400;

type SuccessPhase = 'loading' | 'ready' | 'error';
type SuccessErrorKind = 'failed' | 'withdrawn' | 'session' | 'profile';

/**
 * 매직링크·소셜 로그인 직후 완료 화면 (`/success`)
 */
export default function AuthSuccessPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [phase, setPhase] = useState<SuccessPhase>('loading');
  const [errorKind, setErrorKind] = useState<SuccessErrorKind>('failed');
  const [nextPath, setNextPath] = useState<PostAuthPath | null>(null);
  const [hasServerNickname, setHasServerNickname] = useState(false);
  const didNavigateAfterSuccess = useRef(false);

  useEffect(() => {
    let isMounted = true;

    const prepareSession = async () => {
      try {
        await bootstrapClientSession({
          forceReissue: true,
          allowExistingAccessOnReissueFailure: true,
        });
        if (!isMounted) {
          return;
        }

        markOpeningSeen();
        const resolved = await resolvePostAuthPath();
        if (!isMounted) {
          return;
        }

        if (resolved.status === 'withdrawn') {
          await clearFullAuthSession();
          setErrorKind('withdrawn');
          setNextPath(null);
          setPhase('error');
          return;
        }

        if (resolved.status !== 'ok') {
          setErrorKind('profile');
          setNextPath(null);
          setPhase('error');
          return;
        }

        try {
          await ensureDefaultProfileImage();
          await Promise.all([
            queryClient.invalidateQueries({
              queryKey: getGetHomeDataQueryKey(),
            }),
            queryClient.invalidateQueries({
              queryKey: getGetMyProfileQueryKey(),
            }),
          ]);
        } catch (error) {
          console.error('[success] default profile save failed', error);
        } finally {
          clearOAuthSignupHints();
        }

        setHasServerNickname(resolved.path === '/');
        setNextPath(resolved.path);
        setPhase('ready');
      } catch (error) {
        if (!isMounted) {
          return;
        }
        console.error('[success] session bootstrap failed', error);
        await clearFullAuthSession();
        setErrorKind('session');
        setNextPath(null);
        setPhase('error');
      }
    };

    void prepareSession();

    return () => {
      isMounted = false;
    };
  }, [queryClient]);

  useEffect(() => {
    if (phase === 'loading') {
      return;
    }

    if (phase === 'error') {
      if (didNavigateAfterSuccess.current) {
        return;
      }
      didNavigateAfterSuccess.current = true;
      const id = window.setTimeout(() => {
        router.replace('/login');
      }, SUCCESS_DISPLAY_MS);
      return () => window.clearTimeout(id);
    }

    if (nextPath === null) {
      return;
    }

    const id = window.setTimeout(() => {
      if (didNavigateAfterSuccess.current) {
        return;
      }
      didNavigateAfterSuccess.current = true;
      router.replace(nextPath);
    }, SUCCESS_DISPLAY_MS);

    return () => window.clearTimeout(id);
  }, [phase, nextPath, router]);

  const headline =
    phase === 'loading'
      ? '처리 중...'
      : phase === 'error'
        ? errorKind === 'withdrawn'
          ? '탈퇴한 계정이에요'
          : errorKind === 'session'
            ? '세션 연결 실패'
            : errorKind === 'profile'
              ? '계정 정보 확인 실패'
              : '로그인 실패'
        : hasServerNickname
          ? '로그인 완료'
          : '회원가입 완료';

  const subline =
    phase === 'loading'
      ? '잠시만 기다려 주세요.'
      : phase === 'error'
        ? errorKind === 'withdrawn'
          ? '새로 가입하려면 로그인 화면으로 이동합니다.'
          : errorKind === 'session'
            ? '다시 로그인해 주세요.'
            : errorKind === 'profile'
              ? '로그인 화면으로 이동합니다.'
              : '로그인 화면으로 이동합니다.'
        : hasServerNickname
          ? '잠시 후 홈으로 이동합니다.'
          : '잠시 후 닉네임을 설정할게요.';

  return (
    <main className="relative flex min-h-0 flex-1 flex-col overflow-x-hidden px-6 pt-[max(2.5rem,var(--safe-area-top))] pb-[max(2rem,var(--safe-area-bottom))]">
      <SuccessStatusContent headline={headline} subline={subline} />
    </main>
  );
}

function SuccessStatusContent({
  headline,
  subline,
}: {
  headline: string;
  subline: string;
}) {
  return (
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
  );
}
