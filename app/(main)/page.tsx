'use client';

import * as React from 'react';
import { AxiosError } from 'axios';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { ImageIcon } from 'lucide-react';
import { BottomNav } from '@/components/layout/BottomNav';
import { HomeSectionCarousel } from '@/components/main/HomeSectionCarousel';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/common/Modal';
import { useGetHomeData } from '@/api/generated/home/home';
import {
  autoNickname,
  useUpdateNickname,
} from '@/api/generated/member-controller/member-controller';
import type { ApiResponseDTO } from '@/api/model';
import type { Detail } from '@/api/model';
import mainLogo from '@/public/logo/main-logo.png';

const NICKNAME_SETUP_DONE_KEY = 'nickname_setup_done_v1';

/** `.env.local`에 `NEXT_PUBLIC_HOME_MOCK=1` 넣으면 위시/마이/피드에 임시 10개씩 표시 */
const HOME_MOCK_ENABLED = process.env.NEXT_PUBLIC_HOME_MOCK === '1';

const makeMockDetails = (prefix: string): Detail[] =>
  Array.from({ length: 10 }, (_, i) => ({
    id: i + 1,
    imageUrl: `https://picsum.photos/seed/${prefix}-${i + 1}/240/240`,
  }));

function resolveNicknameFromResponse(data: ApiResponseDTO): string | null {
  return typeof data?.result === 'string' && data.result.trim().length > 0
    ? data.result.trim()
    : null;
}

function getNicknameErrorMessage(error: unknown): string {
  if (error instanceof AxiosError) {
    if (error.response?.status === 409) {
      return '이미 사용 중인 닉네임이에요. 다른 이름을 입력해 주세요.';
    }
    if (error.response?.status === 403) {
      return '로그인 정보가 유효하지 않아요. <br /> 다시 로그인해 주세요.';
    }
    return '닉네임 저장에 실패했어요. 잠시 후 다시 시도해 주세요.';
  }
  return '알 수 없는 오류가 발생했어요. 잠시 후 다시 시도해 주세요.';
}

export default function MainPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const shouldOpenSetupNickname = searchParams.get('setupNickname') === '1';

  const [isNicknameModalOpen, setIsNicknameModalOpen] = React.useState(() => {
    if (!shouldOpenSetupNickname) return false;
    if (typeof window === 'undefined') return true;
    return localStorage.getItem(NICKNAME_SETUP_DONE_KEY) !== '1';
  });
  const [nickname, setNickname] = React.useState('');
  const [isSkipping, setIsSkipping] = React.useState(false);
  const [isDuplicateNickname, setIsDuplicateNickname] = React.useState(false);
  const [isEmptyNickname, setIsEmptyNickname] = React.useState(false);
  const [authExpiredMessage, setAuthExpiredMessage] = React.useState<
    string | null
  >(null);
  const nicknameInputRef = React.useRef<HTMLInputElement>(null);
  const {
    data: homeResponse,
    isLoading: isHomeLoading,
    refetch: refetchHomeData,
  } = useGetHomeData();
  const homeData = homeResponse?.result;

  const sections: Array<{ title: string; items: Detail[] }> = HOME_MOCK_ENABLED
    ? [
        { title: '위시', items: makeMockDetails('wish') },
        { title: '마이', items: makeMockDetails('my') },
        { title: '피드', items: makeMockDetails('feed') },
      ]
    : [
        { title: '위시', items: homeData?.wishList ?? [] },
        { title: '마이', items: homeData?.myList ?? [] },
        { title: '피드', items: homeData?.feed ?? [] },
      ];

  const showHomeSkeleton = isHomeLoading && !HOME_MOCK_ENABLED;

  React.useEffect(() => {
    if (!shouldOpenSetupNickname) return;
    router.replace('/');
  }, [router, shouldOpenSetupNickname]);

  const { mutate: updateNickname, isPending: isSavingNickname } =
    useUpdateNickname({
      mutation: {
        onSuccess: () => {
          if (typeof window !== 'undefined') {
            localStorage.setItem(NICKNAME_SETUP_DONE_KEY, '1');
          }
          void refetchHomeData();
          setIsEmptyNickname(false);
          setIsDuplicateNickname(false);
          setIsNicknameModalOpen(false);
        },
        onError: (error) => {
          if (error instanceof AxiosError && error.response?.status === 403) {
            setAuthExpiredMessage(
              '로그인 정보가 유효하지 않아요. 다시 로그인해 주세요.',
            );
            return;
          }
          setIsDuplicateNickname(
            error instanceof AxiosError && error.response?.status === 409,
          );
          alert(getNicknameErrorMessage(error));
        },
      },
    });

  const handleConfirmNickname = () => {
    const trimmed = nickname.trim();
    if (!trimmed) {
      setIsEmptyNickname(true);
      nicknameInputRef.current?.focus();
      return;
    }
    setIsEmptyNickname(false);
    setIsDuplicateNickname(false);
    updateNickname({ data: { nickname: trimmed } });
  };

  const handleSkip = async () => {
    if (isSavingNickname || isSkipping) return;
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
        setAuthExpiredMessage(
          '로그인 정보가 유효하지 않아요. 다시 로그인해 주세요.',
        );
        return;
      }
      alert(getNicknameErrorMessage(error));
    } finally {
      setIsSkipping(false);
    }
  };

  const isPending = isSavingNickname || isSkipping;

  return (
    <>
      <main className="bg-mono-white min-h-full px-4 pt-4 pb-6">
        <div className="mx-auto w-fit">
          <Image
            src={mainLogo}
            alt="main-logo"
            width={94}
            height={56}
            className="h-[80px] w-[120px]"
            priority
          />
        </div>

        <section className="mt-4 flex items-center justify-center gap-2">
          {homeData?.profileUrl ? (
            <Image
              src={homeData.profileUrl}
              alt="profile"
              width={36}
              height={36}
              unoptimized
              className="border-mono-dark-gray/70 size-9 rounded-full border object-cover"
            />
          ) : (
            <div className="border-mono-dark-gray/70 text-mono-dark-gray flex size-12 items-center justify-center rounded-full border">
              <ImageIcon className="size-5" />
            </div>
          )}
          <h3 className="text-mono-jet flex flex-col text-lg leading-tight font-bold">
            반가워요 {homeData?.nickname ?? '포치'}님,
            <br />
            흩어져 있는 위시템을 포치에 모아봐요!
          </h3>
        </section>

        <div className="mt-5 space-y-5 px-5">
          {sections.map((section) => (
            <section key={section.title}>
              <h2 className="text-mono-jet text-sm font-bold">
                {section.title}
              </h2>
              <div className="mt-2">
                <HomeSectionCarousel
                  sectionTitle={section.title}
                  showSkeleton={showHomeSkeleton}
                  items={section.items}
                />
              </div>
            </section>
          ))}
        </div>
      </main>

      <Modal
        open={isNicknameModalOpen}
        onOpenChange={setIsNicknameModalOpen}
        title="포치에서 당신을 뭐라고 부를까요?"
        confirmText={isPending ? '저장 중...' : '이 이름으로 결정!'}
        cancelText="건너뛰기"
        onConfirm={handleConfirmNickname}
        onCancel={handleSkip}
        showCancel
        closeOnOverlayClick={false}
        closeOnConfirm={false}
        closeOnCancel={false}
        hideIcon
      >
        <div className="space-y-2">
          <Input
            ref={nicknameInputRef}
            value={nickname}
            onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
              setNickname(event.target.value);
              if (isEmptyNickname) setIsEmptyNickname(false);
              if (isDuplicateNickname) setIsDuplicateNickname(false);
            }}
            maxLength={20}
            placeholder="닉네임을 입력해 주세요."
            className="border-mono-dark-gray text-mono-jet placeholder:text-mono-dark-gray h-10 rounded-none text-sm font-medium"
            disabled={isPending}
          />
          {isEmptyNickname ? (
            <p className="text-left text-xs font-normal text-red-500">
              닉네임을 입력해 주세요.
            </p>
          ) : isDuplicateNickname ? (
            <p className="text-left text-xs font-normal text-red-500">
              이미 사용 중인 닉네임입니다.
            </p>
          ) : (
            <p className="text-mono-dark-gray text-left text-xs font-normal">
              이후 이름을 변경하실려면 <br /> 마이페이지에서 변경하실 수 있어요.
            </p>
          )}
        </div>
      </Modal>
      <Modal
        open={Boolean(authExpiredMessage)}
        onOpenChange={(open) => {
          if (!open) setAuthExpiredMessage(null);
        }}
        title="오류"
        description={authExpiredMessage ?? ''}
        confirmText="확인"
        onConfirm={() => {
          setAuthExpiredMessage(null);
          router.push('/login');
        }}
        closeOnOverlayClick={false}
        showCancel={false}
      />

      <BottomNav />
    </>
  );
}
