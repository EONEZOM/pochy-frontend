'use client';

import * as React from 'react';
import { Suspense } from 'react';
import { AxiosError } from 'axios';
import { useRouter } from 'next/navigation';

import { Button as SolidButton } from '@/components/common/Button';
import { Header } from '@/components/layout/Header';
import { Input } from '@/components/ui/input';
import { useGetHomeData } from '@/api/generated/home/home';
import {
  autoNickname,
  useUpdateNickname,
} from '@/api/generated/member-controller/member-controller';
import {
  getNicknameErrorMessage,
  isNicknameLengthValid,
  resolveNicknameFromResponse,
} from '@/lib/nickname';

const NICKNAME_CTA_CLASSNAME =
  'h-14 w-full max-w-[320px] rounded-full text-base shadow-none transition-transform active:scale-[0.98] enabled:border-0 enabled:bg-[#FF93DB] enabled:text-mono-jet enabled:hover:bg-[#FF85D5]';

function NicknameSetupContent() {
  const router = useRouter();
  const [nickname, setNickname] = React.useState('');
  const [isSkipping, setIsSkipping] = React.useState(false);
  const [isDuplicateNickname, setIsDuplicateNickname] = React.useState(false);
  const [isEmptyNickname, setIsEmptyNickname] = React.useState(false);
  const [authExpiredMessage, setAuthExpiredMessage] = React.useState<
    string | null
  >(null);
  const nicknameInputRef = React.useRef<HTMLInputElement>(null);

  const { data: homeResponse, isLoading: isHomeLoading } = useGetHomeData();
  const homeData = homeResponse?.result;
  const hasServerNickname = Boolean(homeData?.nickname?.trim());

  React.useEffect(() => {
    if (isHomeLoading || !hasServerNickname) {
      return;
    }
    router.replace('/');
  }, [hasServerNickname, isHomeLoading, router]);

  const { mutate: updateNickname, isPending: isSavingNickname } =
    useUpdateNickname({
      mutation: {
        onSuccess: () => {
          router.replace('/');
        },
        onError: (error) => {
          if (error instanceof AxiosError && error.response?.status === 403) {
            setAuthExpiredMessage(getNicknameErrorMessage(error));
            return;
          }
          if (error instanceof AxiosError && error.response?.status === 409) {
            setIsDuplicateNickname(true);
            nicknameInputRef.current?.focus();
            return;
          }
          alert(getNicknameErrorMessage(error));
        },
      },
    });

  const trimmedNickname = nickname.trim();
  const canSubmitNickname = isNicknameLengthValid(trimmedNickname);
  const isPending = isSavingNickname || isSkipping;

  const handleConfirmNickname = () => {
    if (isPending) {
      return;
    }
    if (!trimmedNickname) {
      setIsEmptyNickname(true);
      nicknameInputRef.current?.focus();
      return;
    }
    if (!isNicknameLengthValid(trimmedNickname)) {
      alert('닉네임은 2자 이상 10자 이하로 입력해 주세요.');
      nicknameInputRef.current?.focus();
      return;
    }
    setIsEmptyNickname(false);
    setIsDuplicateNickname(false);
    updateNickname({ data: { nickname: trimmedNickname } });
  };

  const handleSkip = async () => {
    if (isPending) {
      return;
    }
    setIsSkipping(true);
    try {
      const auto = await autoNickname();
      const randomNickname = resolveNicknameFromResponse(auto);
      if (!randomNickname) {
        alert('랜덤 닉네임을 생성하지 못했어요. 잠시 후 다시 시도해 주세요.');
        return;
      }
      updateNickname({ data: { nickname: randomNickname } });
    } catch (error) {
      if (error instanceof AxiosError && error.response?.status === 403) {
        setAuthExpiredMessage(getNicknameErrorMessage(error));
        return;
      }
      alert(getNicknameErrorMessage(error));
    } finally {
      setIsSkipping(false);
    }
  };

  if (isHomeLoading || hasServerNickname) {
    return (
      <div className="flex min-h-screen flex-col bg-white px-5 pb-[max(1.25rem,var(--safe-area-bottom))]">
        <Header
          className="border-none bg-white pt-[var(--safe-area-top)]"
          onBack={() => router.push('/login')}
        />
        <main className="flex flex-1 items-center justify-center">
          <p className="text-mono-dark-gray text-sm">확인 중...</p>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-white pb-[max(1.25rem,var(--safe-area-bottom))]">
      <Header
        className="border-none bg-white pt-[var(--safe-area-top)]"
        onBack={() => router.push('/login')}
      />

      <main className="flex flex-1 flex-col px-5 pt-2">
        <h1 className="text-mono-jet text-base leading-5 font-bold">
          포치에서 당신을 뭐라고 부를까요?
        </h1>

        <div className="mt-[34px] w-full max-w-[320px] space-y-2">
          <Input
            ref={nicknameInputRef}
            value={nickname}
            onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
              setNickname(event.target.value);
              if (isEmptyNickname) {
                setIsEmptyNickname(false);
              }
              if (isDuplicateNickname) {
                setIsDuplicateNickname(false);
              }
            }}
            maxLength={10}
            placeholder="닉네임을 입력해 주세요."
            aria-invalid={isEmptyNickname || isDuplicateNickname}
            aria-describedby={
              isEmptyNickname || isDuplicateNickname
                ? 'nickname-setup-error'
                : 'nickname-setup-helper'
            }
            className="border-mono-jet text-mono-jet placeholder:text-mono-dark-gray h-12 rounded-[4px] border px-4 text-sm font-normal"
            disabled={isPending}
          />
          {isEmptyNickname ? (
            <p
              id="nickname-setup-error"
              role="alert"
              className="text-left text-xs font-normal text-red-500"
            >
              닉네임을 입력해 주세요.
            </p>
          ) : isDuplicateNickname ? (
            <p
              id="nickname-setup-error"
              role="alert"
              className="text-left text-xs font-normal text-red-500"
            >
              이미 사용 중인 닉네임입니다.
            </p>
          ) : (
            <p
              id="nickname-setup-helper"
              className="text-mono-dark-gray text-left text-xs font-normal"
            >
              이후 이름을 변경하시려면 <br /> 마이페이지에서 변경하실 수 있어요.
            </p>
          )}
        </div>

        <div className="mt-auto flex w-full flex-col items-center gap-3 pt-8">
          <SolidButton
            type="button"
            variant="solid"
            size="lg"
            className={NICKNAME_CTA_CLASSNAME}
            onClick={handleConfirmNickname}
            disabled={isPending || !canSubmitNickname}
          >
            {isSavingNickname ? (
              <span className="flex items-center justify-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-mono-dark-gray border-t-transparent" />
                저장 중...
              </span>
            ) : (
              '이 이름으로 결정!'
            )}
          </SolidButton>
          <button
            type="button"
            className="text-mono-dark-gray text-sm leading-[21px] font-normal disabled:opacity-50"
            onClick={handleSkip}
            disabled={isPending}
          >
            {isSkipping ? '건너뛰는 중...' : '건너뛰기'}
          </button>
        </div>
      </main>

      {authExpiredMessage ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[rgba(22,22,24,0.45)] p-5">
          <div className="w-full max-w-[320px] rounded-[24px] bg-white px-6 py-5 shadow-xl">
            <h2 className="text-mono-jet text-base font-bold">오류</h2>
            <p className="text-mono-jet mt-3 text-sm leading-5">
              {authExpiredMessage}
            </p>
            <SolidButton
              type="button"
              variant="solid"
              size="lg"
              className={`${NICKNAME_CTA_CLASSNAME} mt-6`}
              onClick={() => {
                setAuthExpiredMessage(null);
                router.push('/login');
              }}
            >
              확인
            </SolidButton>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function NicknameSetupPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-white px-5">
          <p className="text-mono-dark-gray text-sm">확인 중...</p>
        </div>
      }
    >
      <NicknameSetupContent />
    </Suspense>
  );
}
