'use client';

import * as React from 'react';
import { Suspense } from 'react';
import { AxiosError } from 'axios';
import { useRouter } from 'next/navigation';
import { HomeSectionCarousel } from '@/components/main/HomeSectionCarousel';
import { MainHomeListHeader } from '@/components/main/MainHomeListHeader';
import { MainHomeEmptyView } from '@/components/main/MainHomeEmptyView';
import { MainHomeBottomZipperWithLip } from '@/components/main/MainHomeBottomZipperWithLip';
import { MainHomeTopZipperWithLogo } from '@/components/main/MainHomeTopZipperWithLogo';
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
import type { ReadListDto } from '@/api/model';

/** 메인(리스트·로딩)과 빈 홈 공통 배경 그라데이션 */
const MAIN_HOME_GRADIENT_BG =
  'linear-gradient(180deg, #FFFFFF 0%, #FFF5FC 42%, #FFC6EC 100%)';

const MAIN_HOME_LIST_LAYOUT =
  'flex min-h-0 flex-1 flex-col overflow-hidden';

const parseWishCosmeticsId = (item: ReadListDto): number | null => {
  const raw = item.wishCosmeticsId;
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    return raw;
  }
  if (typeof raw === 'string') {
    const n = Number.parseInt(raw, 10);
    return Number.isFinite(n) ? n : null;
  }
  return null;
};

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

type MainHomeListViewProps = {
  showSkeleton: boolean;
  sections: Array<{ title: string; items: Detail[] }>;
  nickname?: string | null;
  profileUrl?: string | null;
};

/**
 * 위시·마이·피드가 하나라도 있을 때
 * - 상단 인사·프로필: Figma 1:3210
 * - 섹션 리스트: Figma 1:3190
 */
function MainHomeListView({
  showSkeleton,
  sections,
  nickname,
  profileUrl,
}: MainHomeListViewProps) {
  return (
    <main
      className={MAIN_HOME_LIST_LAYOUT}
      style={{ background: MAIN_HOME_GRADIENT_BG }}
    >
      <MainHomeTopZipperWithLogo />

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-5 pt-6">
        <div className="mx-auto w-full max-w-[360px] shrink-0">
          <MainHomeListHeader
            nickname={nickname}
            profileUrl={profileUrl}
            isLoading={showSkeleton}
          />
        </div>

        <div className="relative z-20 mx-auto mt-6 w-full max-w-[360px] shrink-0 space-y-8 pb-4">
          {sections.map((section) => (
            <section key={section.title}>
              <h2 className="text-[18px] leading-6 font-bold text-[#161618]">
                {section.title}
              </h2>
              <div className="mt-3">
                <HomeSectionCarousel
                  sectionTitle={section.title}
                  showSkeleton={showSkeleton}
                  items={section.items}
                />
              </div>
            </section>
          ))}
        </div>
      </div>

      <MainHomeBottomZipperWithLip />
    </main>
  );
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

  const wishItems: Detail[] = (wishListResponse?.result?.content ?? []).flatMap(
    (item) => {
      const id = parseWishCosmeticsId(item);
      if (id == null) {
        return [];
      }
      return [{ id, imageUrl: item.productImageUrl } satisfies Detail];
    },
  );

  const sections: Array<{ title: string; items: Detail[] }> = [
    { title: '위시', items: wishItems },
    { title: '마이', items: homeData?.myList ?? [] },
    { title: '피드', items: homeData?.feed ?? [] },
  ];

  const showHomeSkeleton = isHomeLoading || isWishListLoading;

  const myListItems = homeData?.myList ?? [];
  const feedListItems = homeData?.feed ?? [];
  const isAllSectionsEmpty =
    !showHomeSkeleton &&
    wishItems.length === 0 &&
    myListItems.length === 0 &&
    feedListItems.length === 0;

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
      <div className="flex min-h-0 flex-1 flex-col overflow-x-hidden overflow-y-hidden">
        {showHomeSkeleton ? (
          <MainHomeListView
            showSkeleton
            sections={sections}
            nickname={homeData?.nickname}
            profileUrl={homeData?.profileUrl}
          />
        ) : isAllSectionsEmpty ? (
          <main className="flex min-h-0 flex-1 flex-col overflow-hidden bg-white p-0">
            <MainHomeEmptyView />
          </main>
        ) : (
          <MainHomeListView
            showSkeleton={false}
            sections={sections}
            nickname={homeData?.nickname}
            profileUrl={homeData?.profileUrl}
          />
        )}
      </div>

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
        <main
          className="flex min-h-0 flex-1 flex-col overflow-hidden px-5 pt-8 pb-8"
          style={{ background: MAIN_HOME_GRADIENT_BG }}
        >
          <p className="text-mono-dark-gray text-sm">불러오는 중...</p>
        </main>
      }
    >
      <MainPageContent />
    </Suspense>
  );
}
