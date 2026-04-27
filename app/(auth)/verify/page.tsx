'use client';

import Image from 'next/image';
import Link from 'next/link';
import mainLogo from '@/public/logo/main-logo.png';
import { useSearchParams } from 'next/navigation';
import { Suspense, useMemo } from 'react';

function VerifyStatusView({
  title,
  description,
  isError = false,
}: {
  title: string;
  description: string;
  isError?: boolean;
}) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-white px-6 text-center">
      <h1 className="text-2xl font-bold text-zinc-900">{title}</h1>
      <p className="mt-3 text-sm text-zinc-600">{description}</p>
      <Image
        src={mainLogo}
        alt="main-logo"
        width={200}
        height={200}
        className="mx-auto mt-10 mb-10"
      />
      {isError ? (
        <Link
          href="/"
          className="mt-6 inline-flex h-11 items-center justify-center rounded-xl bg-zinc-900 px-5 text-sm font-semibold text-white"
        >
          메인으로 이동
        </Link>
      ) : null}
    </main>
  );
}

function VerifyContent() {
  const searchParams = useSearchParams();
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

  const missingTokenErrorText = !token
    ? '토큰이 없어 인증을 진행할 수 없습니다.'
    : null;
  const failedMessage = serverErrorText ?? missingTokenErrorText;

  if (failedMessage) {
    return (
      <VerifyStatusView
        title="로그인 인증 실패"
        description={failedMessage}
        isError
      />
    );
  }

  return (
    <VerifyStatusView
      title="로그인 인증 중"
      description="잠시만 기다려주세요..."
    />
  );
}

export default function VerifyMagicLinkPage() {
  return (
    <Suspense
      fallback={
        <VerifyStatusView
          title="로그인 인증 중"
          description="잠시만 기다려주세요..."
        />
      }
    >
      <VerifyContent />
    </Suspense>
  );
}
