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
import { useGetHomeData } from '@/api/generated/home/home';
import { useGetMyProfile } from '@/api/generated/member-controller/member-controller';
import { extractProfileImageUrl } from '@/lib/member-profile';
import { useSearchMyCosmetics } from '@/api/generated/my-cosmetics-controller/my-cosmetics-controller';
import { useReadWishCosmeticsList } from '@/api/generated/wish-cosmetics/wish-cosmetics';
import type { Detail } from '@/api/model';
import type { MyCosmeticsResponseDTO } from '@/api/model';
import type { ReadListDto } from '@/api/model';
import { isPendingNicknameSetup } from '@/lib/pending-nickname-setup';
import { pickMyCosmeticsHomeThumbnailUrl } from '@/lib/my-cosmetics-display-image';
import { pickWishListThumbnailUrl } from '@/lib/wish-display-image';
import { useBottomNavVisibility } from '@/providers/bottom-nav-visibility';
import { cn } from '@/lib/utils';

const getMainQueryErrorMessage = (error: unknown): string => {
  if (error instanceof AxiosError) {
    if (error.code === 'ECONNABORTED') {
      return '요청 시간이 초과되었습니다. 백엔드 연결과 .env의 API 주소를 확인해 주세요.';
    }
    if (!error.response) {
      return '네트워크에 연결할 수 없습니다. 서버가 실행 중인지 확인해 주세요.';
    }
  }
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }
  return '데이터를 불러오지 못했습니다.';
};

/** 메인(리스트·로딩)과 빈 홈 공통 배경 그라데이션 */
const MAIN_HOME_GRADIENT_BG =
  'linear-gradient(180deg, #FFFFFF 0%, #FFF5FC 42%, #FFC6EC 100%)';

const MAIN_HOME_LIST_LAYOUT =
  'flex min-h-0 flex-1 flex-col overflow-x-hidden overflow-y-hidden overscroll-none';

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
      <MainHomeTopZipperWithLogo imageClassName="-translate-y-[70px]" />

      <div className="-mt-5 flex min-h-0 flex-1 flex-col overflow-hidden px-5 pt-4 pb-1">
        <div className="mx-auto w-full shrink-0">
          <MainHomeListHeader
            nickname={nickname}
            profileUrl={profileUrl}
            isLoading={showSkeleton}
          />
        </div>

        <div className="relative z-20 mx-auto mt-3 grid min-h-0 w-full flex-1 grid-rows-3 gap-2 overflow-hidden sm:gap-2.5">
          {sections.map((section, sectionIndex) => (
            <section
              key={section.title}
              className="flex min-h-0 min-w-0 flex-col gap-0.5 overflow-hidden"
            >
              <h2 className="shrink-0 text-[15px] leading-5 font-bold text-[#161618] sm:text-[17px]">
                {section.title}
              </h2>
              <div className="flex min-h-0 flex-1 items-center overflow-hidden">
                <HomeSectionCarousel
                  sectionIndex={sectionIndex}
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
  const { setHomeEmptyViewActive } = useBottomNavVisibility();

  const {
    data: homeResponse,
    isLoading: isHomeLoading,
    isError: isHomeError,
    error: homeError,
    refetch: refetchHome,
  } = useGetHomeData();
  const {
    data: wishListResponse,
    isLoading: isWishListLoading,
    isError: isWishListError,
    refetch: refetchWish,
  } = useReadWishCosmeticsList({
    sort: 'desc',
    size: 100,
  });
  const { data: myCosmeticsResponse, isLoading: isMyCosmeticsLoading } =
    useSearchMyCosmetics({
      sort: 'desc',
      size: 100,
    });
  const { data: profileResponse } = useGetMyProfile();
  const homeData = homeResponse?.result;
  const hasServerNickname = Boolean(homeData?.nickname?.trim());

  const headerProfileUrl = React.useMemo(() => {
    const fromMember = extractProfileImageUrl(profileResponse?.result);
    if (fromMember) {
      return fromMember;
    }
    const fromHome = homeData?.profileUrl?.trim();
    return fromHome || null;
  }, [homeData?.profileUrl, profileResponse?.result]);

  const isMainQueriesPending =
    isHomeLoading || isWishListLoading || isMyCosmeticsLoading;
  const [hasSlowMainLoadingTimedOut, setHasSlowMainLoadingTimedOut] =
    React.useState(false);

  React.useEffect(() => {
    if (!isMainQueriesPending) {
      return;
    }

    const resetTimerId = window.setTimeout(() => {
      setHasSlowMainLoadingTimedOut(false);
    }, 0);
    const slowTimerId = window.setTimeout(() => {
      setHasSlowMainLoadingTimedOut(true);
    }, 8000);

    return () => {
      window.clearTimeout(resetTimerId);
      window.clearTimeout(slowTimerId);
    };
  }, [isMainQueriesPending]);

  const isSlowMainLoading = isMainQueriesPending && hasSlowMainLoadingTimedOut;

  const handleRetryMainQueries = React.useCallback(() => {
    void refetchHome();
    void refetchWish();
  }, [refetchHome, refetchWish]);

  React.useEffect(() => {
    if (isPendingNicknameSetup()) {
      router.replace('/nickname');
      return;
    }
    if (
      isHomeLoading ||
      isWishListLoading ||
      isMyCosmeticsLoading ||
      isHomeError ||
      hasServerNickname
    ) {
      return;
    }
    router.replace('/nickname');
  }, [
    hasServerNickname,
    isHomeError,
    isHomeLoading,
    isMyCosmeticsLoading,
    isWishListLoading,
    router,
  ]);

  const myCosmeticsById = React.useMemo(() => {
    const map = new Map<number, MyCosmeticsResponseDTO>();
    for (const item of myCosmeticsResponse?.result?.content ?? []) {
      if (item.id != null) {
        map.set(item.id, item as MyCosmeticsResponseDTO);
      }
    }
    return map;
  }, [myCosmeticsResponse?.result?.content]);

  const wishItems: Detail[] = (wishListResponse?.result?.content ?? []).flatMap(
    (item) => {
      const id = parseWishCosmeticsId(item);
      if (id == null) {
        return [];
      }
      return [
        { id, imageUrl: pickWishListThumbnailUrl(item) } satisfies Detail,
      ];
    },
  );

  const myPouchItems: Detail[] = React.useMemo(() => {
    return (homeData?.myList ?? []).flatMap((row) => {
      const id = row.id;
      if (id == null || !Number.isFinite(id)) {
        return [];
      }
      const cosmetic = myCosmeticsById.get(id);
      const imageUrl = cosmetic
        ? pickMyCosmeticsHomeThumbnailUrl(cosmetic, row.imageUrl)
        : String(row.imageUrl ?? '').trim();
      return [{ id, imageUrl } satisfies Detail];
    });
  }, [homeData?.myList, myCosmeticsById]);

  const sections: Array<{ title: string; items: Detail[] }> = [
    { title: 'Wish List', items: wishItems },
    { title: 'My Cosmetics', items: myPouchItems },
    { title: 'My Pouch', items: homeData?.feed ?? [] },
  ];

  const showHomeSkeleton =
    isHomeLoading || isWishListLoading || isMyCosmeticsLoading;

  const myListItems = myPouchItems;
  const feedListItems = homeData?.feed ?? [];
  const isAllSectionsEmpty =
    !showHomeSkeleton &&
    wishItems.length === 0 &&
    myListItems.length === 0 &&
    feedListItems.length === 0;

  React.useEffect(() => {
    setHomeEmptyViewActive(isAllSectionsEmpty);

    return () => {
      setHomeEmptyViewActive(false);
    };
  }, [isAllSectionsEmpty, setHomeEmptyViewActive]);

  if (isHomeError) {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 overflow-hidden overscroll-none bg-white px-6">
        <p className="text-mono-dark-gray text-center text-sm leading-relaxed">
          홈 정보를 불러오지 못했습니다.
          <span className="mt-2 block text-xs font-normal opacity-80">
            {getMainQueryErrorMessage(homeError)}
          </span>
        </p>
        <button
          type="button"
          onClick={handleRetryMainQueries}
          className={cn(
            'rounded-full bg-[#FF93DB] px-6 py-3 text-sm font-bold text-[#161618]',
            'transition-transform active:scale-[0.98]',
          )}
        >
          다시 시도
        </button>
      </div>
    );
  }

  if (
    !isHomeLoading &&
    !isWishListLoading &&
    !isMyCosmeticsLoading &&
    !hasServerNickname &&
    !isHomeError
  ) {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center overflow-hidden overscroll-none bg-white px-5">
        <p className="text-mono-dark-gray text-sm">확인 중...</p>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-x-hidden overflow-y-hidden overscroll-none">
      {showHomeSkeleton ? (
        <MainHomeListView
          showSkeleton
          sections={sections}
          nickname={homeData?.nickname}
          profileUrl={headerProfileUrl}
        />
      ) : isAllSectionsEmpty ? (
        <main className="flex min-h-0 flex-1 flex-col overflow-hidden overscroll-none bg-white p-0">
          <MainHomeEmptyView />
        </main>
      ) : (
        <MainHomeListView
          showSkeleton={false}
          sections={sections}
          nickname={homeData?.nickname}
          profileUrl={headerProfileUrl}
        />
      )}
      {isWishListError && (
        <p className="text-mono-dark-gray absolute right-0 bottom-16 left-0 z-30 px-4 text-center text-xs">
          위시 목록만 불러오지 못했습니다.{' '}
          <button
            type="button"
            className="text-[#FF60CA] underline underline-offset-2"
            onClick={() => void refetchWish()}
          >
            다시 시도
          </button>
        </p>
      )}
      {showHomeSkeleton && isSlowMainLoading && (
        <p className="absolute right-0 bottom-8 left-0 z-30 px-4 text-center text-[11px] leading-snug text-zinc-500">
          응답이 지연되고 있습니다. 백엔드가 켜져 있고{' '}
          <code className="rounded bg-zinc-100 px-1">NEXT_PUBLIC_API_URL</code>
          이 맞는지 확인해 주세요.
        </p>
      )}
    </div>
  );
}

export default function MainPage() {
  return (
    <Suspense
      fallback={
        <main
          className="flex min-h-0 flex-1 flex-col overflow-hidden overscroll-none px-5 pt-8 pb-8"
          style={{ background: MAIN_HOME_GRADIENT_BG }}
        >
          <p className="text-mono-dark-gray text-sm">불러오는 중...</p>
        </main>
      }
    >
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden overscroll-none">
        <MainPageContent />
      </div>
    </Suspense>
  );
}
