'use client';

import * as React from 'react';
import { AxiosError } from 'axios';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { Header } from '@/components/layout/Header';
import { WithdrawConfirmModal } from '@/components/common/WithdrawConfirmModal';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/ui/input';
import { getGetHomeDataQueryKey } from '@/api/generated/home/home';
import {
  autoNickname,
  getGetMyProfileQueryKey,
  useWithdraw,
  useUpdateNickname,
  useGetMyProfile,
} from '@/api/generated/member-controller/member-controller';
import { useLogout } from '@/api/generated/login-controller/login-controller';
import {
  ensureDefaultProfileImage,
  extractProfileImageUrl,
} from '@/lib/member-profile';
import { resolveMediaUrl } from '@/lib/resolve-media-url';

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
  const savedNickname = (profile?.nickname ?? '').trim();
  const trimmedNickname = nickname.trim();
  const hasNicknameChange = !isLoading && trimmedNickname !== savedNickname;

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
        router.replace('/opening');
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
        router.replace('/opening');
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
  const profileImageUrl = extractProfileImageUrl(profile);
  const resolvedProfileImageUrl = profileImageUrl
    ? resolveMediaUrl(profileImageUrl)
    : '';

  const didEnsureProfileImage = React.useRef(false);
  const imageErrorRetryCountRef = React.useRef(0);
  const [isEnsuringProfileImage, setIsEnsuringProfileImage] =
    React.useState(false);

  const invalidateProfileQueries = React.useCallback(async () => {
    await Promise.all([
      refetch(),
      queryClient.invalidateQueries({ queryKey: getGetHomeDataQueryKey() }),
      queryClient.invalidateQueries({ queryKey: getGetMyProfileQueryKey() }),
    ]);
  }, [queryClient, refetch]);

  const runEnsureDefaultProfile = React.useCallback(
    async (options?: { isImageErrorRetry?: boolean }) => {
      if (options?.isImageErrorRetry) {
        if (imageErrorRetryCountRef.current >= 1) {
          return;
        }
        imageErrorRetryCountRef.current += 1;
        didEnsureProfileImage.current = false;
      } else if (didEnsureProfileImage.current) {
        return;
      }

      didEnsureProfileImage.current = true;
      setIsEnsuringProfileImage(true);

      try {
        await ensureDefaultProfileImage();
        await invalidateProfileQueries();
      } catch (error) {
        console.error('[profile] default profile save failed', error);
        didEnsureProfileImage.current = false;
      } finally {
        setIsEnsuringProfileImage(false);
      }
    },
    [invalidateProfileQueries],
  );

  React.useEffect(() => {
    if (isLoading || profileImageUrl) {
      return;
    }
    void runEnsureDefaultProfile();
  }, [isLoading, profileImageUrl, runEnsureDefaultProfile]);

  const handleProfileImageError = () => {
    void runEnsureDefaultProfile({ isImageErrorRetry: true });
  };

  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = React.useState(false);

  return (
    <div className="bg-mono-white flex min-h-0 flex-1 flex-col overflow-hidden">
      <Header
        title="프로필 수정"
        onBack={() => router.back()}
        className="border-mono-bright-gray shrink-0 border-b"
      />
      <div
        className="flex min-h-0 flex-1 flex-col overflow-hidden px-5 pt-3 pb-1"
        role="main"
      >
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex shrink-0 flex-col items-center">
            <div className="border-mono-white relative size-20 shrink-0 overflow-hidden rounded-full border-[3px] shadow-[0_3px_3px_rgba(0,0,0,0.2)]">
              {resolvedProfileImageUrl && !isEnsuringProfileImage ? (
                <span className="absolute inset-0 scale-[1.7]">
                  <Image
                    src={resolvedProfileImageUrl}
                    alt=""
                    fill
                    sizes="80px"
                    className="object-cover object-center"
                    onError={handleProfileImageError}
                  />
                </span>
              ) : (
                <div className="bg-mono-gray size-full" aria-hidden />
              )}
            </div>
            <p className="text-mono-jet mt-2 line-clamp-1 text-center text-sm leading-5 font-bold sm:text-base">
              {isLoading || isEnsuringProfileImage
                ? '불러오는 중...'
                : (profile?.nickname ?? '포치')}
            </p>
          </div>

          <div className="mt-4 flex w-full shrink-0 flex-col gap-4">
            <div className="flex w-full flex-col gap-1">
              <label
                htmlFor="nickname"
                className="text-mono-jet text-sm leading-5 font-normal sm:text-base"
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
                className="border-mono-jet text-mono-jet placeholder:text-mono-dark-gray h-11 w-full rounded border px-3 py-2 text-sm leading-[150%] font-normal sm:h-12 sm:px-4 sm:py-3"
              />
              <button
                type="button"
                onClick={handleAutoNickname}
                disabled={isSaving}
                className="text-mono-dark-gray self-start text-xs underline-offset-2 hover:underline disabled:opacity-50 sm:text-sm"
              >
                랜덤 닉네임 적용
              </button>
            </div>

            <div className="flex w-full flex-col gap-1">
              <span className="text-mono-jet text-sm leading-5 font-normal sm:text-base">
                이메일
              </span>
              <div
                className="border-mono-jet text-mono-jet flex h-11 w-full items-center rounded border bg-white px-3 py-2 text-sm leading-[150%] font-normal sm:h-12 sm:px-4 sm:py-3"
                aria-readonly
              >
                {isLoading
                  ? '불러오는 중...'
                  : displayEmail || '등록된 이메일이 없습니다.'}
              </div>
            </div>
          </div>

          <div className="mt-2 flex w-full shrink-0 justify-end">
            <button
              type="button"
              className="text-mono-dark-gray text-sm leading-5 font-normal underline-offset-2 hover:underline disabled:opacity-50 sm:text-base"
              disabled={isDeleting}
              onClick={() => {
                setIsWithdrawModalOpen(true);
              }}
            >
              {isDeleting ? '삭제 중...' : '회원탈퇴'}
            </button>
          </div>

          <div className="mt-auto flex w-full max-w-[400px] shrink-0 flex-col gap-3 self-center pt-3">
            <button
              type="button"
              className="text-center text-sm leading-5 font-normal text-[#FF0000] underline-offset-2 hover:underline disabled:opacity-50 sm:text-base"
              disabled={isLoggingOut}
              onClick={() => {
                logout();
              }}
            >
              {isLoggingOut ? '로그아웃 중...' : '로그아웃'}
            </button>

            <Button
              type="button"
              variant="solid"
              size="lg"
              onClick={handleComplete}
              disabled={isSaving || !hasNicknameChange}
              className="border-mono-bright-gray enabled:bg-brand-lavender enabled:text-mono-jet enabled:hover:bg-brand-lavender/90 disabled:border-mono-bright-gray disabled:text-mono-dark-gray mb-[10px] h-12 w-full shadow-none enabled:border-transparent disabled:bg-transparent sm:h-14"
            >
              {isSaving ? '저장 중...' : '완료'}
            </Button>
          </div>
        </div>
      </div>

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
    </div>
  );
}
