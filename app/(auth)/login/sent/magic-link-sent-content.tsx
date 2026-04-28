'use client';

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import { Button } from '@/components/common/Button';
import { useRequestMagicLink } from '@/api/generated/login-controller/login-controller';
import { Header } from '@/components/layout/Header';

function getWebmailUrl(email: string): string | null {
  const domain = email.split('@')[1]?.toLowerCase().trim();
  if (!domain) return null;
  const map: Record<string, string> = {
    'gmail.com': 'https://mail.google.com/',
    'googlemail.com': 'https://mail.google.com/',
    'naver.com': 'https://mail.naver.com/',
    'hanmail.net': 'https://mail.daum.net/',
    'daum.net': 'https://mail.daum.net/',
    'nate.com': 'https://mail.nate.com/',
    'yahoo.com': 'https://mail.yahoo.com/',
    'yahoo.co.kr': 'https://mail.yahoo.com/',
    'outlook.com': 'https://outlook.live.com/mail/',
    'hotmail.com': 'https://outlook.live.com/mail/',
    'live.com': 'https://outlook.live.com/mail/',
    'icloud.com': 'https://www.icloud.com/mail/',
  };
  return map[domain] ?? null;
}

export function MagicLinkSentContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get('email')?.trim() ?? '';
  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  React.useEffect(() => {
    if (!email) {
      router.replace('/login');
    }
  }, [email, router]);

  const { mutate: requestMagicLink, isPending: isResending } =
    useRequestMagicLink({
      mutation: {
        onSuccess: () => {
          // 재발송 완료 — 별도 알럿 없이 동일 화면 유지
        },
        onError: (error) => {
          const message =
            error instanceof Error && error.message.includes('timeout')
              ? '메일 재발송이 지연되고 있어요. 잠시 후 다시 시도해 주세요.'
              : '재발송에 실패했어요. 잠시 후 다시 시도해 주세요.';
          alert(message);
        },
      },
    });

  const handleOpenInbox = () => {
    const url = getWebmailUrl(email);
    if (url) {
      window.location.assign(url);
    } else {
      alert(
        '웹메일 주소를 자동으로 열 수 없어요.\n설치된 메일 앱이나 브라우저에서 메일함을 확인해 주세요.',
      );
    }
  };

  const handleResend = () => {
    if (!isValidEmail) {
      alert('올바른 이메일 형식이 아니에요. 다시 로그인해 주세요.');
      return;
    }
    requestMagicLink({ params: { email } });
  };

  if (!email) {
    return null;
  }

  return (
    <div className="flex min-h-screen flex-col bg-white pb-[calc(1.25rem+var(--safe-area-bottom))]">
      <Header
        className="border-none bg-white pt-[var(--safe-area-top)]"
        onBack={() => router.push('/login')}
      />

      <main className="flex flex-1 flex-col px-5 pt-2">
        <h1 className="text-mono-jet text-2xl leading-snug font-bold tracking-tight">
          메일을 보냈어요! 💌
        </h1>

        <ol className="text-mono-jet mt-6 list-decimal space-y-4 pl-5 text-base leading-relaxed font-bold">
          <li>
            <span className="font-bold">[내 메일함 가기]</span>를 눌러, 입력하신
            이메일함으로 이동해 주세요.
          </li>
          <li>
            포치가 보낸 <span className="font-bold">[로그인하기]</span> 버튼을
            눌러주세요.
          </li>
          <li>
            다시 이메일에서 앱으로 돌아오면{' '}
            <span className="font-bold">가입 완료!</span>
          </li>
        </ol>

        <p className="text-mono-jet mt-8 text-base leading-relaxed font-bold">
          메일이 오지 않았다면 스팸 메일함을 확인하거나{' '}
          <span className="font-bold">[다시 보내기]</span>를 눌러주세요.
        </p>
      </main>

      <div className="mt-auto flex w-full flex-col gap-3 px-5 pt-8">
        <Button
          type="button"
          variant="solid"
          size="lg"
          className="h-14 w-full max-w-full rounded-full text-base"
          onClick={handleOpenInbox}
        >
          내 메일함 가기
        </Button>
        <Button
          type="button"
          variant="solid"
          size="lg"
          className="h-14 w-full max-w-full rounded-full text-base"
          onClick={handleResend}
          disabled={isResending || !isValidEmail}
        >
          {isResending ? (
            <span className="flex items-center justify-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              발송 중...
            </span>
          ) : (
            '다시 보내기'
          )}
        </Button>
      </div>
    </div>
  );
}
