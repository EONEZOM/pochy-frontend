'use client';

import * as React from 'react';
import { AxiosError } from 'axios';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { Header } from '@/components/layout/Header';
import { BottomNav } from '@/components/layout/BottomNav';
import { WithdrawConfirmModal } from '@/components/common/WithdrawConfirmModal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getGetHomeDataQueryKey } from '@/api/generated/home/home';
import {
  autoNickname,
  useWithdraw,
  useUpdateNickname,
  useGetMyProfile,
} from '@/api/generated/member-controller/member-controller';
import { useLogout } from '@/api/generated/login-controller/login-controller';

function getErrorMessage(error: unknown): string {
  if (error instanceof AxiosError) {
    if (error.response?.status === 409) {
      return '이미 사용 중인 닉네임입니다.';
    }
    if (error.response?.status === 403) {
      return '로그인 정보가 유효하지 않습니다. 다시 로그인해 주세요.';
    }
  }
  return '요청 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.';
}

function isNicknameLengthValid(nickname: string): boolean {
  return nickname.length >= 2 && nickname.length <= 10;
}

export default function MyPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data, isLoading, refetch } = useGetMyProfile();
  const profile = data?.result;

  const [nicknameInput, setNicknameInput] = React.useState('');
  const [isNicknameTouched, setIsNicknameTouched] = React.useState(false);
  const nickname = isNicknameTouched
    ? nicknameInput
    : (profile?.nickname ?? '');

  const { mutate: updateNickname, isPending: isSaving } = useUpdateNickname({
    mutation: {
      onSuccess: async () => {
        await Promise.all([
          refetch(),
          queryClient.invalidateQueries({ queryKey: getGetHomeDataQueryKey() }),
        ]);
        alert('닉네임이 저장되었습니다.');
      },
      onError: (error) => {
        alert(getErrorMessage(error));
      },
    },
  });

  const { mutate: logout, isPending: isLoggingOut } = useLogout({
    mutation: {
      onSuccess: () => {
        router.replace('/login?fromLogout=1');
      },
      onError: () => {
        alert('로그아웃 처리에 실패했어요. 다시 시도해 주세요.');
      },
    },
  });

  const { mutate: withdraw, isPending: isDeleting } = useWithdraw({
    mutation: {
      onSuccess: () => {
        window.localStorage.removeItem('ACCESS_TOKEN');
        alert('회원탈퇴가 완료되었습니다.');
        router.replace('/login?fromLogout=1');
      },
      onError: () => {
        alert('회원탈퇴에 실패했습니다. 잠시 후 다시 시도해 주세요.');
      },
    },
  });

  const handleComplete = () => {
    const trimmed = nickname.trim();
    if (!trimmed) {
      alert('닉네임을 입력해 주세요.');
      return;
    }
    if (!isNicknameLengthValid(trimmed)) {
      alert('닉네임은 2자 이상 10자 이하로 입력해 주세요.');
      return;
    }
    updateNickname({ data: { nickname: trimmed } });
  };

  const handleAutoNickname = async () => {
    try {
      const response = await autoNickname();
      const nextNickname =
        typeof response.result === 'string' ? response.result.trim() : '';
      if (!nextNickname) {
        alert('랜덤 닉네임 생성에 실패했습니다.');
        return;
      }
      setNicknameInput(nextNickname);
      setIsNicknameTouched(true);
    } catch (error) {
      alert(getErrorMessage(error));
    }
  };

  const displayEmail = profile?.email?.trim() ?? '';
  const profileImageUrl = profile?.profileImageUrl;

  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = React.useState(false);

  return (
    <>
      <Header
        title="프로필 수정"
        onBack={() => router.back()}
        className="border-mono-bright-gray border-b"
      />
      <main className="bg-mono-white flex min-h-full flex-col px-5 pt-4 pb-28">
        <div className="flex flex-col items-center">
          <div className="border-mono-white relative size-[100px] shrink-0 rounded-full border-4 shadow-[0_4px_4px_rgba(0,0,0,0.25)]">
            {profileImageUrl ? (
              <Image
                src={profileImageUrl}
                alt=""
                width={100}
                height={100}
                unoptimized
                className="bg-mono-gray size-[92px] rounded-full object-cover"
              />
            ) : (
              <div className="bg-mono-gray size-[92px] rounded-full" />
            )}
          </div>
          <p className="text-mono-jet mt-[20px] text-base leading-5 font-bold">
            {isLoading ? '불러오는 중...' : (profile?.nickname ?? '포치')}
          </p>
        </div>

        <div className="mt-10 flex w-full flex-col gap-9">
          <div className="flex w-full flex-col gap-1.5">
            <label
              htmlFor="nickname"
              className="text-mono-jet text-base leading-5 font-normal"
            >
              닉네임
            </label>
            <Input
              id="nickname"
              value={nickname}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                setNicknameInput(event.target.value);
                if (!isNicknameTouched) {
                  setIsNicknameTouched(true);
                }
              }}
              maxLength={10}
              placeholder="닉네임을 입력해 주세요."
              disabled={isSaving}
              className="border-mono-jet text-mono-jet placeholder:text-mono-dark-gray h-12 w-full rounded border px-4 py-3 text-sm leading-[150%] font-normal"
            />
            <button
              type="button"
              onClick={handleAutoNickname}
              disabled={isSaving}
              className="text-mono-dark-gray self-start text-sm underline-offset-2 hover:underline disabled:opacity-50"
            >
              랜덤 닉네임 적용
            </button>
          </div>

          <div className="flex w-full flex-col gap-1.5">
            <span className="text-mono-jet text-base leading-5 font-normal">
              이메일
            </span>
            <div
              className="border-mono-jet text-mono-jet flex h-12 w-full items-center rounded border bg-white px-4 py-3 text-sm leading-[150%] font-normal"
              aria-readonly
            >
              {isLoading
                ? '불러오는 중...'
                : displayEmail || '등록된 이메일이 없습니다.'}
            </div>
          </div>
        </div>

        <div className="mt-6 flex w-full justify-end self-center">
          <button
            type="button"
            className="text-mono-dark-gray text-base leading-5 font-normal underline-offset-2 hover:underline disabled:opacity-50"
            disabled={isDeleting}
            onClick={() => {
              setIsWithdrawModalOpen(true);
            }}
          >
            {isDeleting ? '삭제 중...' : '회원탈퇴'}
          </button>
        </div>

        <div className="mt-60 flex w-full max-w-[400px] flex-col gap-6 self-center">
          <button
            type="button"
            className="text-center text-base leading-5 font-normal text-[#FF0000] underline-offset-2 hover:underline disabled:opacity-50"
            disabled={isLoggingOut}
            onClick={() => {
              logout();
            }}
          >
            {isLoggingOut ? '로그아웃 중...' : '로그아웃'}
          </button>

          <Button
            type="button"
            onClick={handleComplete}
            disabled={isSaving}
            className="border-mono-bright-gray text-mono-jet hover:bg-brand-lavender/90 bg-brand-lavender h-14 w-full rounded-full border text-base leading-5 font-bold shadow-none"
          >
            {isSaving ? '저장 중...' : '완료'}
          </Button>
        </div>
      </main>

      <WithdrawConfirmModal
        open={isWithdrawModalOpen}
        onOpenChange={(open) => {
          if (!isDeleting) {
            setIsWithdrawModalOpen(open);
          }
        }}
        isPending={isDeleting}
        onConfirm={() => {
          withdraw();
        }}
      />

      <BottomNav />
    </>
  );
}
