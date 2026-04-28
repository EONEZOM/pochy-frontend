'use client';

import * as React from 'react';
import { AxiosError } from 'axios';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { ImageIcon } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { BottomNav } from '@/components/layout/BottomNav';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useGetHomeData } from '@/api/generated/home/home';

// 회원탈퇴 기능 추가 시 사용
// import { useDeleteMember } from '@/api/generated/member-controller/member-controller';

import {
  autoNickname,
  useUpdateNickname,
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

export default function MyPage() {
  const router = useRouter();
  const { data, isLoading, refetch } = useGetHomeData();
  const homeData = data?.result;

  const [nicknameInput, setNicknameInput] = React.useState('');
  const [isNicknameTouched, setIsNicknameTouched] = React.useState(false);
  const nickname = isNicknameTouched
    ? nicknameInput
    : (homeData?.nickname ?? '');

  const { mutate: updateNickname, isPending: isSaving } = useUpdateNickname({
    mutation: {
      onSuccess: async () => {
        await refetch();
        alert('닉네임이 저장되었습니다.');
      },
      onError: (error) => {
        alert(getErrorMessage(error));
      },
    },
  });

  // const { mutate: deleteAccount, isPending: isDeleting } = useDeleteMember({
  //   mutation: {
  //     onSuccess: () => {
  //       alert('회원탈퇴가 완료되었습니다.');
  //     },
  //     onError: () => {
  //       alert('회원탈퇴에 실패했습니다.');
  //     },
  //   },
  // });

  const { mutate: logout, isPending: isLoggingOut } = useLogout({
    mutation: {
      onSuccess: () => {
        router.replace('/login?fromLogout=1');
      },
    },
  });

  const handleSave = () => {
    const trimmed = nickname.trim();
    if (!trimmed) {
      alert('닉네임을 입력해 주세요.');
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

  return (
    <>
      <Header title="마이페이지" onBack={() => router.back()} />
      <main className="bg-mono-white min-h-full px-5 pt-6 pb-24">
        <h1 className="text-mono-jet text-xl font-bold">내 정보</h1>

        <section className="mt-5 flex items-center gap-3">
          {homeData?.profileUrl ? (
            <Image
              src={homeData.profileUrl}
              alt="profile"
              width={56}
              height={56}
              unoptimized
              className="border-mono-dark-gray/70 size-14 rounded-full border object-cover"
            />
          ) : (
            <div className="border-mono-dark-gray/70 text-mono-dark-gray flex size-14 items-center justify-center rounded-full border">
              <ImageIcon className="size-6" />
            </div>
          )}
          <div>
            <p className="text-mono-jet text-sm font-bold">
              {isLoading
                ? '불러오는 중...'
                : `${homeData?.nickname ?? '포치'}님`}
            </p>
            <p className="text-mono-dark-gray text-xs">
              닉네임을 변경하고 저장할 수 있어요.
            </p>
          </div>
        </section>

        <section className="mt-6 space-y-2">
          <label htmlFor="nickname" className="text-mono-jet text-sm font-bold">
            닉네임
          </label>
          <Input
            id="nickname"
            value={nickname}
            onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
              setNicknameInput(event.target.value);
              if (!isNicknameTouched) setIsNicknameTouched(true);
            }}
            maxLength={20}
            placeholder="닉네임을 입력해 주세요."
            className="border-mono-dark-gray text-mono-jet placeholder:text-mono-dark-gray h-10 rounded-none text-sm font-medium"
            disabled={isSaving}
          />
        </section>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            onClick={handleAutoNickname}
            disabled={isSaving}
          >
            랜덤 닉네임
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? '저장 중...' : '저장'}
          </Button>
        </div>

        <Button
          variant="outline"
          className="mt-8 w-full"
          onClick={() => logout()}
          disabled={isLoggingOut}
        >
          {isLoggingOut ? '로그아웃 중...' : '로그아웃'}
        </Button>

        {/* 회원탈퇴 기능 추가 시 사용 */}
        {/* <Button
          variant="destructive"
          className="mt-8 w-full"
          onClick={() => deleteAccount()}
          disabled={isDeleting}
        >
          {isDeleting ? '삭제 중...' : '회원탈퇴'}
        </Button> */}
      </main>
      <BottomNav />
    </>
  );
}
