'use client';

import { Suspense, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  markPendingNicknameSetup,
  shouldMarkPendingNicknameSetup,
} from '@/lib/pending-nickname-setup';
import {
  ACCESS_TOKEN_STORAGE_KEY,
  formatOAuthCallbackError,
  persistOAuthSignupHints,
} from '@/utils/oauth-session';
import {
  hasUsableServerNickname,
  isWithdrawnMemberNickname,
} from '@/lib/is-withdrawn-member';

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
        const exchangeUrl = new URL('/api/oauth/naver/exchange', window.location.origin);
        exchangeUrl.searchParams.set('code', code);
        exchangeUrl.searchParams.set('state', state);

        const exchangeRes = await fetch(exchangeUrl.toString(), {
          method: 'GET',
          credentials: 'include',
        });

        if (!exchangeRes.ok) {
          throw new Error(`naver_exchange_${exchangeRes.status}`);
        }

        const exchangeBody = (await exchangeRes.json()) as {
          ok?: boolean;
          error?: string;
          newMember?: boolean;
          accessToken?: string | null;
          nickname?: string | null;
          email?: string | null;
        };

        if (exchangeBody.ok === false || exchangeBody.error === 'missing_refresh') {
          throw new Error('naver_exchange_missing_refresh');
        }

        if (isWithdrawnMemberNickname(exchangeBody.nickname)) {
          if (!isMounted) {
            return;
          }
          alert('탈퇴한 계정입니다. 새로 가입해 주세요.');
          window.localStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY);
          router.replace('/login');
          return;
        }

        persistOAuthSignupHints({ email: exchangeBody.email });

        const hasExistingNickname = hasUsableServerNickname(exchangeBody.nickname);
        if (
          shouldMarkPendingNicknameSetup(
            exchangeBody.newMember,
            hasExistingNickname,
          )
        ) {
          markPendingNicknameSetup(exchangeBody.newMember === true);
        }

        const accessToken = exchangeBody.accessToken?.trim();
        if (!accessToken) {
          throw new Error('naver_exchange_missing_access');
        }

        window.localStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, accessToken);
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
    <main className="flex min-h-(--app-height) items-center justify-center bg-white">
      <p className="text-sm text-zinc-600">네이버 로그인 처리 중...</p>
    </main>
  );
}

export default function NaverCallbackPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-(--app-height) items-center justify-center bg-white">
          <p className="text-sm text-zinc-600">네이버 로그인 처리 중...</p>
        </main>
      }
    >
      <NaverCallbackContent />
    </Suspense>
  );
}
