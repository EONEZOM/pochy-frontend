'use client';

import { verifyMagicLink } from '@/api/generated/login-controller/login-controller';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useMemo, useState } from 'react';

function VerifyContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const token = useMemo(() => searchParams.get('token'), [searchParams]);
  const fromServer = useMemo(() => searchParams.get('error'), [searchParams]);

  const serverErrorText = useMemo(() => {
    switch (fromServer) {
      case 'missing':
        return '토큰이 없어 인증을 진행할 수 없습니다.';
      case 'invalid':
        return '인증에 실패했습니다. 링크가 만료되었거나 유효하지 않습니다.';
      case 'config':
        return '서버 설정 오류로 인증을 완료할 수 없습니다.';
      default:
        return null;
    }
  }, [fromServer]);

  useEffect(() => {
    if (serverErrorText) {
      return;
    }

    if (!token) {
      setErrorMessage('토큰이 없어 인증을 진행할 수 없습니다.');
      return;
    }

    let isMounted = true;

    verifyMagicLink({ token })
      .then(() => {
        if (!isMounted) return;
        router.replace('/success');
      })
      .catch(() => {
        if (!isMounted) return;
        setErrorMessage('인증에 실패했습니다. 링크가 만료되었거나 유효하지 않습니다.');
      });

    return () => {
      isMounted = false;
    };
  }, [router, serverErrorText, token]);

  const failedMessage = serverErrorText ?? errorMessage;

  if (failedMessage) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-white px-6">
        <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 text-center shadow-sm">
          <h1 className="text-xl font-bold text-zinc-900">로그인 인증 실패</h1>
          <p className="mt-3 text-sm text-zinc-600">{failedMessage}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-white px-6">
      <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 text-center shadow-sm">
        <h1 className="text-xl font-bold text-zinc-900">로그인 인증 중</h1>
        <p className="mt-3 text-sm text-zinc-600">잠시만 기다려주세요...</p>
      </div>
    </main>
  );
}

export default function VerifyMagicLinkPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-white px-6">
          <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 text-center shadow-sm">
            <h1 className="text-xl font-bold text-zinc-900">로그인 인증 중</h1>
            <p className="mt-3 text-sm text-zinc-600">잠시만 기다려주세요...</p>
          </div>
        </main>
      }
    >
      <VerifyContent />
    </Suspense>
  );
}
