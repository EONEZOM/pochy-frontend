'use client';

import { Suspense, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { kakaoLogin } from '@/api/generated/oauth/oauth';
import {
  markPendingNicknameSetup,
  shouldMarkPendingNicknameSetup,
} from '@/lib/pending-nickname-setup';
import {
  ACCESS_TOKEN_STORAGE_KEY,
  formatOAuthCallbackError,
  persistOAuthSignupHints,
  persistRefreshTokenCookie,
  resolveAccessToken,
  resolveOAuthEmail,
  resolveRefreshToken,
} from '@/utils/oauth-session';
import { isWithdrawnMemberNickname } from '@/lib/is-withdrawn-member';

function KakaoCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const code = useMemo(() => searchParams.get('code')?.trim() ?? '', [searchParams]);

  useEffect(() => {
    if (!code) {
      router.replace('/login');
      return;
    }

    let isMounted = true;

    const exchangeToken = async () => {
      try {
        const response = await kakaoLogin({ code });
        const authResult = response?.result;

        if (isWithdrawnMemberNickname(authResult?.nickname)) {
          if (!isMounted) {
            return;
          }
          alert('탈퇴한 계정입니다. 새로 가입해 주세요.');
          window.localStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY);
          router.replace('/login');
          return;
        }

        persistOAuthSignupHints({
          email: resolveOAuthEmail(authResult) ?? authResult?.email,
        });

        if (shouldMarkPendingNicknameSetup(authResult?.newMember)) {
          markPendingNicknameSetup();
        }

        const accessToken = resolveAccessToken(authResult);
        const refreshToken = resolveRefreshToken(authResult);

        if (refreshToken) {
          const cookieOk = await persistRefreshTokenCookie(refreshToken);
          if (!cookieOk) {
            if (!isMounted) {
              return;
            }
            alert('로그인 세션을 저장하지 못했어요. 다시 시도해 주세요.');
            router.replace('/login');
            return;
          }
        }

        if (accessToken) {
          window.localStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, accessToken);
        }
        if (!isMounted) {
          return;
        }
        router.replace('/success');
      } catch (error) {
        if (!isMounted) {
          return;
        }
        console.error('[oauth][kakao-callback] login failed', error);
        alert(formatOAuthCallbackError('카카오', error));
        router.replace('/login');
      }
    };

    void exchangeToken();

    return () => {
      isMounted = false;
    };
  }, [code, router]);

  return (
    <main className="flex min-h-(--app-height) items-center justify-center bg-white">
      <p className="text-sm text-zinc-600">카카오 로그인 처리 중...</p>
    </main>
  );
}

export default function KakaoCallbackPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-(--app-height) items-center justify-center bg-white">
          <p className="text-sm text-zinc-600">카카오 로그인 처리 중...</p>
        </main>
      }
    >
      <KakaoCallbackContent />
    </Suspense>
  );
}
