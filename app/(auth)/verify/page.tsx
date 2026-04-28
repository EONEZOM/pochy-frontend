'use client';

import { useEffect, useMemo, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import mainLogo from '@/public/logo/main-logo.png';
import { useVerifyMagicLink } from '@/api/generated/login-controller/login-controller';

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

/**
 * 실제 인증 로직을 수행하는 컴포넌트
 */
function VerifyContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // URL 쿼리 스트링에서 토큰 추출
  const token = useMemo(() => searchParams.get('token'), [searchParams]);

  // 1. Orval로 생성된 useQuery 기반 훅 호출
  // 이 훅은 내부적으로 axiosInstance를 사용하여 백엔드 IP로 직접 통신합니다.
  const { data, isLoading, isError, error } = useVerifyMagicLink(
    { token: token ?? '' },
    {
      query: {
        enabled: !!token, // 토큰이 있을 때만 실행
        retry: false, // 실패 시 재시도 방지 (매직링크는 1회용)
      },
    },
  );

  // 2. 인증 성공 시 사이드 이펙트 처리 (토큰 저장 및 이동)
  useEffect(() => {
    if (data?.result) {
      const { accessToken, refreshToken } = data.result;

      if (accessToken) {
        // LocalStorage에 인증 정보 저장
        localStorage.setItem('ACCESS_TOKEN', accessToken);
        if (refreshToken) {
          localStorage.setItem('REFRESH_TOKEN', refreshToken);
        }

        // 로그인 성공 알림 후 메인 페이지로 이동
        // alert 사용 시 사용자가 확인을 눌러야 페이지가 이동되므로 로직 흐름 조절 가능
        router.push('/');
      }
    }
  }, [data, router]);

  // 3. 에러 상태 처리
  if (isError) {
    const status = (error as any)?.response?.status;
    let errorMessage =
      '인증 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.';

    if (status === 403 || status === 401) {
      errorMessage = '만료된 링크이거나 이미 인증이 완료된 요청입니다.';
    }

    return (
      <VerifyStatusView
        title="로그인 인증 실패"
        description={errorMessage}
        isError
      />
    );
  }

  // 4. 토큰 자체가 없는 비정상 접근 처리
  if (!token) {
    return (
      <VerifyStatusView
        title="잘못된 접근"
        description="인증에 필요한 토큰 정보가 없습니다."
        isError
      />
    );
  }

  // 5. 로딩 중 UI
  return (
    <VerifyStatusView
      title="로그인 인증 중"
      description="인증 정보를 확인하고 있습니다. 잠시만 기다려주세요."
    />
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
