'use client';

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
import mainLogo from '@/public/logo/main-logo.png';

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isFromLogout = searchParams.get('fromLogout') === '1';
  const [email, setEmail] = useState('');
  const [isCheckingSession, setIsCheckingSession] = useState(!isFromLogout);
  const [submittedEmail, setSubmittedEmail] = useState('');

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

  const handleLogin = () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) return;
    setSubmittedEmail(trimmedEmail);
    requestMagicLink({
      params: { email: trimmedEmail },
    });
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-between bg-white p-5 pb-20">
      <div className="flex flex-1 flex-col items-center justify-center space-y-4">
        <Image src={mainLogo} alt="main-logo" width={250} height={250} />
      </div>

      <div className="mt-10 mb-10 grid w-full max-w-sm grid-rows-2 gap-2 space-y-3">
        <BottomSheet
          trigger={
            <Button
              size="lg"
              className="text-md h-15 w-full rounded-2xl bg-zinc-900 font-bold text-white transition-all hover:bg-zinc-800"
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
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setEmail(e.target.value)
                }
                className="h-14 rounded-xl border-zinc-200 bg-zinc-50 text-base font-medium focus:ring-zinc-900"
                autoFocus
              />
            </div>
            <Button
              className="text-md h-14 w-full rounded-xl bg-zinc-900 font-bold text-white shadow-lg transition-transform active:scale-[0.98]"
              onClick={handleLogin}
              disabled={isPending || isCheckingSession}
            >
              {isPending || isCheckingSession ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  {isCheckingSession ? '세션 확인 중...' : '발송 중...'}
                </span>
              ) : (
                '로그인 하기'
              )}
            </Button>
          </div>
        </BottomSheet>

        {/* 소셜 로그인 버튼 */}
        <Button
          variant="outline"
          className="h-14 cursor-pointer rounded-2xl border-zinc-200 font-bold hover:bg-zinc-50"
          onClick={() => {
            console.log('네이버로 로그인');
          }}
        >
          네이버로 로그인하기
        </Button>

        <Button
          variant="outline"
          className="h-14 cursor-pointer rounded-2xl border-zinc-200 font-bold hover:bg-zinc-50"
          onClick={() => {
            console.log('카카오로 로그인');
          }}
        >
          카카오로 로그인하기
        </Button>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen flex-col items-center justify-center bg-white">
          <p className="text-sm text-zinc-500">세션 확인 중...</p>
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
