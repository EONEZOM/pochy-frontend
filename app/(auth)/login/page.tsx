'use client';

/**
 * Figma: `포치 공유용` > `로그인` (node-id: 862-9042)
 * - 화면 크기: 360x812
 * - 버튼: 높이 56px, radius 100px, 간격 16px, 너비 319px
 * - 색상: Naver #03A94D, Kakao #FEE500, 테두리 Light Gray #E8E8E8
 * - 배경 일러스트: `public/figma/login/*`
 */

import React, { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { BottomSheet } from '@/components/common/BottomSheet';
import { Input } from '@/components/ui/input';
import {
  reissue,
  useRequestMagicLink,
} from '@/api/generated/login-controller/login-controller';
import Image from 'next/image';
import mainLogo from '@/public/figma/login/hero-1.svg';

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isFromLogout = searchParams.get('fromLogout') === '1';
  const [email, setEmail] = useState('');
  const [isCheckingSession, setIsCheckingSession] = useState(!isFromLogout);
  const [isCheckingAutoLogin, setIsCheckingAutoLogin] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState('');
  const [isNaverLoginPending, setIsNaverLoginPending] = useState(false);
  const [isKakaoLoginPending, setIsKakaoLoginPending] = useState(false);

  useEffect(() => {
    if (isFromLogout) return;

    let isMounted = true;

    const checkSession = async () => {
      try {
        await reissue();
        if (!isMounted) return;
        router.replace('/?setupNickname=1');
      } catch {
        if (!isMounted) return;
        setIsCheckingSession(false);
      }
    };

    checkSession();

    return () => {
      isMounted = false;
    };
  }, [isFromLogout, router]);

  const { mutate: requestMagicLink, isPending } = useRequestMagicLink({
    mutation: {
      onSuccess: () => {
        router.push(`/login/sent?email=${encodeURIComponent(submittedEmail)}`);
      },
      onError: (error) => {
        const message =
          error instanceof Error && error.message.includes('timeout')
            ? '메일 발송이 지연되고 있어요. 잠시 후 다시 시도해 주세요.'
            : '발송에 실패했어요. 잠시 후 다시 시도해 주세요.';
        alert(message);
      },
    },
  });

  const handleLogin = async () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) return;

    setIsCheckingAutoLogin(true);
    try {
      await reissue();
      router.replace('/?setupNickname=1');
      return;
    } catch {
      // refresh token이 없거나 만료된 경우 기존 매직링크 로그인으로 fallback
    } finally {
      setIsCheckingAutoLogin(false);
    }

    setSubmittedEmail(trimmedEmail);
    requestMagicLink({
      params: { email: trimmedEmail },
    });
  };

  const handleNaverLogin = async () => {
    if (isNaverLoginPending || isCheckingSession) {
      return;
    }

    setIsNaverLoginPending(true);
    try {
      const res = await fetch('/api/oauth/naver/authorize-url');
      const data = (await res.json()) as { url?: string; message?: string };
      const loginUrl = data.url?.trim() ?? '';
      if (!res.ok || !loginUrl) {
        alert(
          data.message ??
            '네이버 로그인 URL을 가져오지 못했어요. 서버 환경 변수(NAVER_OAUTH_CLIENT_ID, NAVER_OAUTH_REDIRECT_URI)를 확인해 주세요.',
        );
        return;
      }

      window.location.assign(loginUrl);
    } catch {
      alert('네이버 로그인 연결에 실패했어요. 잠시 후 다시 시도해 주세요.');
    } finally {
      setIsNaverLoginPending(false);
    }
  };

  const handleKakaoLogin = () => {
    if (isKakaoLoginPending || isCheckingSession) {
      return;
    }

    const kakaoClientId =
      process.env.NEXT_PUBLIC_KAKAO_REST_API_KEY ??
      process.env.NEXT_PUBLIC_KAKAO_CLIENT_ID;
    const kakaoRedirectUri =
      process.env.NEXT_PUBLIC_KAKAO_REDIRECT_URI ??
      `${window.location.origin}/auth/kakao/callback`;

    if (!kakaoClientId) {
      alert('카카오 클라이언트 설정이 없어요. 환경 변수를 확인해 주세요.');
      return;
    }

    const authUrl = new URL('https://kauth.kakao.com/oauth/authorize');
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('client_id', kakaoClientId);
    authUrl.searchParams.set('redirect_uri', kakaoRedirectUri);

    setIsKakaoLoginPending(true);
    window.location.assign(authUrl.toString());
  };

  return (
    <div className="relative h-[calc(100dvh-56px-var(--safe-area-bottom))] w-full overflow-hidden bg-white">
      {/* 배경 일러스트 (Figma absolute) */}
      <div className="pointer-events-none absolute inset-0 md:origin-top lg:scale-[1.1]">
        {/* 뒤 배경 지퍼 */}
        <Image
          src="/figma/login/bg-zip.svg"
          alt=""
          width={525}
          height={69}
          className="absolute top-[-80px] left-0 h-auto w-full object-cover md:top-[-80px] md:left-[19px] md:h-[150px] md:w-[74px] lg:top-[500px] lg:left-[24px] lg:h-[136px] lg:w-[67px]"
          unoptimized
          priority
        />
        {/* 블러셔 */}
        <Image
          src="/figma/login/hero-4.png"
          alt=""
          width={269}
          height={189}
          className="absolute top-[260px] left-[-85px] h-[170px] w-[269px] rotate-[-20deg] object-cover md:top-[280px] md:left-[-70px] md:h-[180px] md:w-[285px] lg:top-[300px] lg:left-[-56px] lg:h-[190px] lg:w-[300px]"
          unoptimized
          priority
        />
        {/* 지퍼 */}
        <Image
          src="/figma/login/sticker.svg"
          alt=""
          width={74}
          height={122}
          className="absolute top-[475px] left-[19px] h-[150px] w-[74px] object-cover md:top-[500px] md:left-[24px] md:h-[136px] md:w-[67px] lg:top-[520px] lg:left-[30px] lg:h-[128px] lg:w-[64px]"
          unoptimized
          priority
        />
        {/* 팩트 */}
        <Image
          src="/figma/login/hero-3.png"
          alt=""
          width={400}
          height={250}
          className="absolute top-[0px] right-[-150px] h-[220px] w-[400px] object-cover md:top-[16px] md:right-[-130px] md:h-[230px] md:w-[420px] lg:top-[24px] lg:right-[-116px] lg:h-[240px] lg:w-[440px]"
          unoptimized
          priority
        />
        {/* 립스틱 */}
        <Image
          src="/figma/login/hero-2.png"
          alt=""
          width={431}
          height={350}
          className="absolute top-[350px] right-[-120px] h-[170px] w-[431px] rotate-[30deg] object-cover md:top-[372px] md:right-[-104px] md:h-[176px] md:w-[446px] lg:top-[392px] lg:right-[-90px] lg:h-[184px] lg:w-[460px]"
          unoptimized
          priority
        />
      </div>

      <main className="relative mx-auto flex h-full w-full max-w-[360px] flex-col overflow-hidden px-5 pt-[var(--safe-area-top)] pb-8 md:origin-top md:scale-[1.06] lg:scale-[1.1]">
        <div className="0 mx-auto mt-40 w-fit">
          <Image
            src={mainLogo}
            alt="main-logo"
            width={120}
            height={80}
            className="h-[190px] w-[230px]"
            priority
          />
        </div>

        <div className="mt-auto w-full shrink-0">
          <div className="mx-auto flex w-full max-w-[319px] flex-col gap-4">
            <BottomSheet
              trigger={
                <Button
                  type="button"
                  variant="outline"
                  className="h-14 w-full rounded-full border-[#E8E8E8] bg-white text-base font-bold text-[#161618] hover:bg-white"
                >
                  이메일로 시작하기
                </Button>
              }
              title="이메일로 로그인"
              description="입력하신 메일로 로그인 링크를 보내드려요."
            >
              <div className="flex flex-col space-y-4 pt-2">
                <div className="space-y-2">
                  <Input
                    type="email"
                    placeholder="pouchy@example.com"
                    value={email}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                      setEmail(e.target.value);
                    }}
                    className="h-14 rounded-xl border-zinc-200 bg-zinc-50 text-base font-medium focus:ring-zinc-900"
                    autoFocus
                  />
                </div>
                <Button
                  className="h-14 w-full rounded-xl bg-zinc-900 text-base font-bold text-white shadow-lg transition-transform active:scale-[0.98]"
                  onClick={handleLogin}
                  disabled={
                    isPending || isCheckingSession || isCheckingAutoLogin
                  }
                >
                  {isPending || isCheckingSession || isCheckingAutoLogin ? (
                    <span className="flex items-center gap-2">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      {isCheckingSession || isCheckingAutoLogin
                        ? '확인 중...'
                        : '발송 중...'}
                    </span>
                  ) : (
                    '로그인 하기'
                  )}
                </Button>
              </div>
            </BottomSheet>

            <Button
              type="button"
              className="h-14 w-full rounded-full bg-[#03A94D] text-base font-bold text-white hover:bg-[#039846]"
              onClick={handleNaverLogin}
              disabled={isNaverLoginPending || isCheckingSession}
            >
              <span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-md bg-white/15 text-sm font-extrabold">
                N
              </span>
              {isNaverLoginPending ? '네이버 연결 중...' : '네이버로 시작하기'}
            </Button>

            <Button
              type="button"
              className="h-14 w-full rounded-full bg-[#FEE500] text-base font-bold text-black hover:bg-[#f3dc00]"
              onClick={handleKakaoLogin}
              disabled={isKakaoLoginPending || isCheckingSession}
            >
              <Image
                src="/figma/login/kakao-icon.png"
                alt=""
                width={24}
                height={24}
                className="mr-2 h-[22px] w-[24px]"
                unoptimized
              />
              {isKakaoLoginPending ? '카카오 연결 중...' : '카카오로 시작하기'}
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense
      fallback={
        <div className="flex h-[calc(100dvh-56px-var(--safe-area-bottom))] flex-col items-center justify-center overflow-hidden bg-white">
          <p className="text-sm text-zinc-500">확인 중...</p>
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
