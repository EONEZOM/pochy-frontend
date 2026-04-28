'use client';

import { Suspense, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import mainLogo from '@/public/logo/main-logo.png';

/**
 * 인증 상태를 시각적으로 보여주는 공통 UI 컴포넌트
 */
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
      {isError && (
        <button
          onClick={() => (window.location.href = '/login')}
          className="mt-6 inline-flex h-11 items-center justify-center rounded-xl bg-zinc-900 px-5 text-sm font-semibold text-white"
        >
          로그인으로 돌아가기
        </button>
      )}
    </main>
  );
}

function VerifyContent() {
  const searchParams = useSearchParams();
  const token = useMemo(() => searchParams.get('token'), [searchParams]);
  const error = useMemo(() => searchParams.get('error'), [searchParams]);

  if (error) {
    const errorMessage =
      error === 'invalid'
        ? '만료된 링크이거나 이미 인증이 완료된 요청입니다.'
        : '인증 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.';
    return (
      <VerifyStatusView
        title="로그인 인증 실패"
        description={errorMessage}
        isError
      />
    );
  }

  if (!token) {
    return (
      <VerifyStatusView
        title="잘못된 접근"
        description="인증에 필요한 토큰 정보가 없습니다."
        isError
      />
    );
  }

  const verifyHref = `/api/auth/verify-magic-link?token=${encodeURIComponent(token)}&confirm=1`;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-white px-6 text-center">
      <h1 className="text-2xl font-bold text-zinc-900">로그인 인증 준비 완료</h1>
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
      <Link
        href={verifyHref}
        className="mt-6 inline-flex h-11 items-center justify-center rounded-xl bg-zinc-900 px-5 text-sm font-semibold text-white"
      >
        인증 계속하기
      </Link>
    </main>
  );
}

/**
 * 최종 페이지 컴포넌트 (Suspense 적용)
 */
export default function VerifyMagicLinkPage() {
  return (
    <div className="min-h-screen bg-white">
      <Suspense
        fallback={
          <VerifyStatusView
            title="페이지 준비 중"
            description="잠시만 기다려주세요..."
          />
        }
      >
        <VerifyContent />
      </Suspense>
    </div>
  );
}
