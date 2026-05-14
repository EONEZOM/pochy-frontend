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
import { Button as SolidButton } from '@/components/common/Button';
import { Button } from '@/components/ui/button';
import { BottomSheet } from '@/components/common/BottomSheet';
import { Input } from '@/components/ui/input';
import {
  ConsentCheckboxControl,
  LoginPrivacyConsentModal,
} from '@/components/login/LoginPrivacyConsentModal';
import type { RequestMagicLinkParams } from '@/api/model';
import {
  reissue,
  useRequestMagicLink,
} from '@/api/generated/login-controller/login-controller';
import { getState } from '@/api/generated/oauth/oauth';
import { isAxiosError } from 'axios';
import Image from 'next/image';
import mainLogo from '@/public/figma/login/hero-1.svg';

const emailFormatRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const isValidEmailFormat = (value: string) => {
  const trimmedValue = value.trim();
  if (!trimmedValue) {
    return false;
  }
  return emailFormatRegex.test(trimmedValue);
};

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
  const [isPrivacyConsentModalOpen, setIsPrivacyConsentModalOpen] =
    useState(false);
  const [hasPrivacyConsent, setHasPrivacyConsent] = useState(false);

  useEffect(() => {
    if (isFromLogout) return;

    let isMounted = true;

    const checkSession = async () => {
      try {
        await reissue();
        if (!isMounted) return;
        router.replace('/nickname');
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
    if (
      !trimmedEmail ||
      !hasPrivacyConsent ||
      !isValidEmailFormat(trimmedEmail)
    ) {
      return;
    }

    setIsCheckingAutoLogin(true);
    try {
      await reissue();
      router.replace('/nickname');
      return;
    } catch {
      // refresh token이 없거나 만료된 경우 기존 매직링크 로그인으로 fallback
    } finally {
      setIsCheckingAutoLogin(false);
    }

    setSubmittedEmail(trimmedEmail);
    requestMagicLink({
      params: { email: trimmedEmail } as RequestMagicLinkParams,
    });
  };

  const handleNaverLogin = async () => {
    if (isNaverLoginPending || isCheckingSession) {
      return;
    }

    setIsNaverLoginPending(true);
    try {
      const data = await getState();
      const loginUrl = data.result?.url?.trim() ?? '';
      if (!loginUrl) {
        alert(
          data.message ??
            '네이버 로그인 URL을 가져오지 못했어요. 잠시 후 다시 시도해 주세요.',
        );
        return;
      }

      window.location.assign(loginUrl);
    } catch (error) {
      const apiMessage = isAxiosError(error)
        ? (error.response?.data as { message?: string } | undefined)?.message
        : undefined;
      const trimmed = typeof apiMessage === 'string' ? apiMessage.trim() : '';
      alert(
        trimmed.length > 0
          ? trimmed
          : '네이버 로그인 연결에 실패했어요. 잠시 후 다시 시도해 주세요.',
      );
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

  const trimmedEmail = email.trim();
  const shouldShowEmailError =
    trimmedEmail.length > 0 && !isValidEmailFormat(trimmedEmail);
  const canSubmitLogin = hasPrivacyConsent && isValidEmailFormat(trimmedEmail);

  return (
    <div className="relative flex h-full min-h-0 w-full flex-1 flex-col overflow-x-hidden bg-white">
      {/* 배경 일러스트 — 스케일 없이 영역 안에서만 잘림 */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <Image
          src="/figma/login/bg-zip.svg"
          alt=""
          width={525}
          height={69}
          className="absolute top-[-20px] left-0 h-auto w-full object-cover"
          unoptimized
          priority
        />
        <Image
          src="/figma/login/hero-4.png"
          alt=""
          width={269}
          height={189}
          className="absolute top-[min(32dvh,260px)] left-[-85px] h-[min(42vw,170px)] w-[min(72vw,269px)] max-w-none rotate-[-20deg] object-cover sm:left-[-70px]"
          unoptimized
          priority
        />
        <Image
          src="/figma/login/sticker.svg"
          alt=""
          width={74}
          height={122}
          className="absolute top-[min(100dvh,530px)] left-[19px] h-[min(38vw,150px)] w-[min(22vw,74px)] object-cover sm:left-5"
          unoptimized
          priority
        />
        <Image
          src="/figma/login/hero-3.png"
          alt=""
          width={400}
          height={250}
          className="absolute top-0 right-[-min(42vw,150px)] h-[min(58vw,220px)] w-[min(110vw,400px)] object-cover sm:right-[-130px]"
          unoptimized
          priority
        />
        <Image
          src="/figma/login/hero-2.png"
          alt=""
          width={431}
          height={350}
          className="absolute top-[min(42dvh,350px)] right-[-min(42vw,140px)] h-[min(48vw,170px)] w-[min(120vw,431px)] rotate-[30deg] object-cover sm:right-[-140px] md:right-[-140px]"
          unoptimized
          priority
        />
      </div>

      <main className="relative z-10 mx-auto flex h-full min-h-0 w-full max-w-[360px] flex-1 flex-col justify-between px-5 pt-[max(1rem,var(--safe-area-top))] pb-[max(1.25rem,var(--safe-area-bottom))]">
        <div className="mx-auto flex w-full shrink-0 flex-col items-center pt-40 sm:pt-40">
          <Image
            src={mainLogo}
            alt="POCHY"
            width={144}
            height={96}
            className="h-auto w-[min(200px,52vw)] object-contain drop-shadow-[0_2px_8px_rgba(0,0,0,0.12)]"
            priority
          />
        </div>

        <div className="w-full shrink-0 pt-6">
          <div className="mx-auto flex w-full max-w-[319px] flex-col gap-4">
            <BottomSheet
              dismissible={!isPrivacyConsentModalOpen}
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
                    aria-invalid={shouldShowEmailError}
                    aria-describedby={
                      shouldShowEmailError ? 'login-email-error' : undefined
                    }
                    className="h-14 rounded-xl border-zinc-200 bg-zinc-50 text-base font-medium focus:ring-zinc-900"
                    autoFocus
                  />
                  {shouldShowEmailError ? (
                    <p
                      id="login-email-error"
                      role="alert"
                      className="text-sm leading-5 text-red-500"
                    >
                      올바른 이메일 형식이 아니에요.
                    </p>
                  ) : null}
                </div>
                <button
                  type="button"
                  className="flex w-full items-start gap-2 px-0.5 py-1 text-left"
                  onClick={() => setIsPrivacyConsentModalOpen(true)}
                >
                  <ConsentCheckboxControl
                    checked={hasPrivacyConsent}
                    className="mt-0.5"
                  />
                  <span className="text-mono-jet text-sm leading-5 font-bold">
                    서비스 이용을 위해 개인정보 처리방침에 동의해주세요.
                  </span>
                </button>
                <SolidButton
                  type="button"
                  variant="solid"
                  size="lg"
                  className="enabled:text-mono-jet h-14 w-full rounded-full text-base shadow-none transition-transform active:scale-[0.98] enabled:border-0 enabled:bg-[#FF93DB] enabled:hover:bg-[#FF85D5]"
                  onClick={handleLogin}
                  disabled={
                    isPending ||
                    isCheckingSession ||
                    isCheckingAutoLogin ||
                    !canSubmitLogin
                  }
                >
                  {isPending || isCheckingSession || isCheckingAutoLogin ? (
                    <span className="flex items-center gap-2">
                      <span className="border-mono-dark-gray h-4 w-4 animate-spin rounded-full border-2 border-t-transparent" />
                      {isCheckingSession || isCheckingAutoLogin
                        ? '확인 중...'
                        : '발송 중...'}
                    </span>
                  ) : (
                    '다음'
                  )}
                </SolidButton>
                <LoginPrivacyConsentModal
                  open={isPrivacyConsentModalOpen}
                  onOpenChange={setIsPrivacyConsentModalOpen}
                  onAgree={() => {
                    setHasPrivacyConsent(true);
                  }}
                  onCancelIncomplete={() => {
                    setHasPrivacyConsent(false);
                  }}
                />
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
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center bg-white px-5 py-16">
          <p className="text-sm text-zinc-500">확인 중...</p>
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
