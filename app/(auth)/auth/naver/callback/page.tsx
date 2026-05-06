'use client';

import { Suspense, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { naverLogin } from '@/api/generated/oauth/oauth';
import {
  ACCESS_TOKEN_STORAGE_KEY,
  formatOAuthCallbackError,
  persistRefreshTokenCookie,
  resolveAccessToken,
  resolveRefreshToken,
} from '@/utils/oauth-session';

function NaverCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const code = useMemo(() => searchParams.get('code')?.trim() ?? '', [searchParams]);
  const state = useMemo(
    () => searchParams.get('state')?.trim() ?? '',
    [searchParams],
  );

  useEffect(() => {
    if (!code || !state) {
      router.replace('/login');
      return;
    }

    let isMounted = true;

    const exchangeToken = async () => {
      try {
        const response = await naverLogin({ code, state });
        const accessToken = resolveAccessToken(response?.result);
        const refreshToken = resolveRefreshToken(response?.result);

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
        console.error('[oauth][naver-callback] login failed', error);
        alert(formatOAuthCallbackError('네이버', error));
        router.replace('/login');
      }
    };

    void exchangeToken();

    return () => {
      isMounted = false;
    };
  }, [code, router, state]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-white">
      <p className="text-sm text-zinc-600">네이버 로그인 처리 중...</p>
    </main>
  );
}

export default function NaverCallbackPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-white">
          <p className="text-sm text-zinc-600">네이버 로그인 처리 중...</p>
        </main>
      }
    >
      <NaverCallbackContent />
    </Suspense>
  );
}
