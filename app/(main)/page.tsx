'use client';

import * as React from 'react';
import { Suspense } from 'react';
import { AxiosError } from 'axios';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { ImageIcon } from 'lucide-react';
import { HomeSectionCarousel } from '@/components/main/HomeSectionCarousel';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/common/Modal';
import { useGetHomeData } from '@/api/generated/home/home';
import { useReadWishCosmeticsList } from '@/api/generated/wish-cosmetics/wish-cosmetics';
import {
  autoNickname,
  useUpdateNickname,
} from '@/api/generated/member-controller/member-controller';
import type { ApiResponseDTO } from '@/api/model';
import type { Detail } from '@/api/model';
import mainLogo from '@/public/figma/login/hero-1.svg';

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

function isNicknameLengthValid(nickname: string): boolean {
  return nickname.length >= 2 && nickname.length <= 10;
}

function MainPageContent() {
  const router = useRouter();

  const [isNicknameModalDismissed, setIsNicknameModalDismissed] =
    React.useState(false);
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
  const { data: wishListResponse, isLoading: isWishListLoading } =
    useReadWishCosmeticsList({
      sort: 'desc',
      size: 100,
    });
  const homeData = homeResponse?.result;
  const hasServerNickname = Boolean(homeData?.nickname?.trim());
  const isNicknameModalOpen =
    !isHomeLoading && !hasServerNickname && !isNicknameModalDismissed;

  const wishItems: Detail[] = (wishListResponse?.result?.content ?? [])
    .filter(
      (item): item is { wishCosmeticsId: number; productImageUrl?: string } =>
        typeof item.wishCosmeticsId === 'number',
    )
    .map((item) => ({
      id: item.wishCosmeticsId,
      imageUrl: item.productImageUrl,
    }));

  const sections: Array<{ title: string; items: Detail[] }> = [
    { title: '위시', items: wishItems },
    { title: '마이', items: homeData?.myList ?? [] },
    { title: '피드', items: homeData?.feed ?? [] },
  ];

  const showHomeSkeleton = isHomeLoading || isWishListLoading;

  const { mutate: updateNickname, isPending: isSavingNickname } =
    useUpdateNickname({
      mutation: {
        onSuccess: () => {
          setIsNicknameModalDismissed(true);
          void refetchHomeData();
          setIsEmptyNickname(false);
          setIsDuplicateNickname(false);
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
    if (isPending) return;
    const trimmed = nickname.trim();
    if (!trimmed) {
      setIsEmptyNickname(true);
      nicknameInputRef.current?.focus();
      return;
    }
    if (!isNicknameLengthValid(trimmed)) {
      alert('닉네임은 2자 이상 10자 이하로 입력해 주세요.');
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
      <main className="min-h-full bg-[linear-gradient(180deg,#FFFFFF_31%,#FFC6EC_100%)] px-5 pt-[38px] pb-8">
        <div className="mx-auto flex w-full max-w-[360px] justify-center">
          <Image
            src={mainLogo}
            alt="main-logo"
            width={144}
            height={106}
            className="h-[80px] w-[120px] object-contain"
            priority
          />
        </div>

        <div className="mx-auto mt-10 w-full max-w-[360px] space-y-4">
          {sections.map((section) => (
            <section key={section.title}>
              <h2 className="text-base leading-5 font-bold text-[#161618]">
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
        onOpenChange={(open) => {
          if (!open) setIsNicknameModalDismissed(true);
        }}
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
            maxLength={10}
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
              이후 이름을 변경하시려면 <br /> 마이페이지에서 변경하실 수 있어요.
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
    </>
  );
}

export default function MainPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[linear-gradient(180deg,#FFFFFF_31%,#FFC6EC_100%)] px-5 pt-[38px] pb-8">
          <p className="text-mono-dark-gray text-sm">불러오는 중...</p>
        </main>
      }
    >
      <MainPageContent />
    </Suspense>
  );
}
