'use client';

import { Suspense, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { kakaoLogin } from '@/api/generated/oauth/oauth';

const ACCESS_TOKEN_STORAGE_KEY = 'ACCESS_TOKEN';

const resolveAccessToken = (value: unknown): string | null => {
  if (typeof value === 'string' && value.trim().length > 0) {
    return value.trim();
  }

  if (typeof value !== 'object' || value === null) {
    return null;
  }

  const record = value as Record<string, unknown>;
  const candidateKeys = ['accessToken', 'access_token', 'token'];
  for (const key of candidateKeys) {
    const candidate = record[key];
    if (typeof candidate === 'string' && candidate.trim().length > 0) {
      return candidate.trim();
    }
  }

  for (const nestedValue of Object.values(record)) {
    const nestedToken = resolveAccessToken(nestedValue);
    if (nestedToken) {
      return nestedToken;
    }
  }

  return null;
};

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
        const accessToken = resolveAccessToken(response?.result);
        if (accessToken) {
          window.localStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, accessToken);
        }
        if (!isMounted) {
          return;
        }
        router.replace('/success');
      } catch {
        if (!isMounted) {
          return;
        }
        alert('카카오 로그인 처리에 실패했어요. 다시 시도해 주세요.');
        router.replace('/login');
      }
    };

    void exchangeToken();

    return () => {
      isMounted = false;
    };
  }, [code, router]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-white">
      <p className="text-sm text-zinc-600">카카오 로그인 처리 중...</p>
    </main>
  );
}

export default function KakaoCallbackPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-white">
          <p className="text-sm text-zinc-600">카카오 로그인 처리 중...</p>
        </main>
      }
    >
      <KakaoCallbackContent />
    </Suspense>
  );
}
