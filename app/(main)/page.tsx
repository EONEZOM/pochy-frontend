'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { BottomSheet } from '@/components/common/BottomSheet';
import { Input } from '@/components/ui/input';
import { useRequestMagicLink } from '@/api/generated/login-controller/login-controller';
import Image from 'next/image';
import mainLogo from '@/public/icons/main-logo.png';

export default function Home() {
  const [email, setEmail] = useState('');

  const { mutate: requestMagicLink, isPending } = useRequestMagicLink({
    mutation: {
      onSuccess: () => {
        alert(
          '메일을 보냈어요!\n\n' +
            '1. 입력하신 이메일함으로 이동해 주세요.\n' +
            '2. 포치가 보낸 [로그인하기] 버튼을 눌러주세요.\n' +
            '3. 다시 이메일에서 앱으로 돌아오면 가입 완료!\n\n' +
            '메일이 오지 않았다면 스팸 메일함을 확인하거나\n[다시 보내기]를 눌러주세요',
        );
      },
      onError: (error) => {
        alert('발송 실패: ' + error);
      },
    },
  });

  const handleLogin = () => {
    if (!email) return;
    requestMagicLink({ params: { email } });
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
              disabled={isPending}
            >
              {isPending ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  발송 중...
                </span>
              ) : (
                '매직링크 받기'
              )}
            </Button>
          </div>
        </BottomSheet>

        {/* 소셜 로그인 버튼 */}
        <Button
          variant="outline"
          className="hover:bg-zinc-5x h-14 cursor-pointer rounded-2xl border-zinc-200 font-bold"
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
