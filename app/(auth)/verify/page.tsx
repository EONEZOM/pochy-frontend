'use client';

import { Suspense, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import mainLogo from '@/public/logo/main-logo.png';

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
          href="/login"
          className="mt-6 inline-flex h-11 items-center justify-center rounded-xl bg-zinc-900 px-5 text-sm font-semibold text-white"
        >
          로그인으로 돌아가기
        </Link>
      ) : null}
    </main>
  );
}

function VerifyContent() {
  const searchParams = useSearchParams();
  const token = useMemo(() => searchParams.get('token'), [searchParams]);
  const fromServer = useMemo(() => searchParams.get('error'), [searchParams]);

  // 서버에서 넘어온 에러 메시지 처리
  const serverErrorText = useMemo(() => {
    switch (fromServer) {
      case 'missing':
        return '토큰이 없어 인증을 진행할 수 없습니다.';
      case 'invalid':
        return '인증에 실패했습니다. 링크가 만료되었거나 유효하지 않습니다.';
      case 'config':
        return '서버 설정 오류로 인증을 완료할 수 없습니다.';
      case 'timeout':
        return '인증 서버 응답이 지연되고 있어요. 잠시 후 다시 시도해 주세요.';
      case 'cookie_missing':
        return '인증은 되었지만 세션 쿠키를 받지 못했어요. 서버 쿠키 설정을 확인해 주세요.';
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
        title="로그인을 완료할 수 없어요."
        description={failedMessage}
        isError
      />
    );
  }

  // 토큰이 있을 때 버튼을 보여주는 화면
  const verifyHref = `/api/auth/verify-magic-link?token=${encodeURIComponent(token ?? '')}&confirm=1`;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-white px-6 text-center">
      <h1 className="text-2xl font-bold text-zinc-900">
        로그인 인증 준비 완료
      </h1>
      <p className="mt-3 text-sm text-zinc-600">
        아래 버튼을 눌러 인증을 완료해 주세요.
      </p>
      <Image
        src={mainLogo}
        alt="main-logo"
        width={200}
        height={200}
        className="mx-auto mt-10 mb-10"
      />
      <a
        href={verifyHref}
        className="mt-6 inline-flex h-11 items-center justify-center rounded-xl bg-zinc-900 px-5 text-sm font-semibold text-white"
      >
        인증 계속하기
      </a>
    </main>
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
