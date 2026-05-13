'use client';

import * as React from 'react';
import { Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { HomeSectionCarousel } from '@/components/main/HomeSectionCarousel';
import { MainHomeListHeader } from '@/components/main/MainHomeListHeader';
import { MainHomeEmptyView } from '@/components/main/MainHomeEmptyView';
import { MainHomeBottomZipperWithLip } from '@/components/main/MainHomeBottomZipperWithLip';
import { MainHomeTopZipperWithLogo } from '@/components/main/MainHomeTopZipperWithLogo';
import { useGetHomeData } from '@/api/generated/home/home';
import { useReadWishCosmeticsList } from '@/api/generated/wish-cosmetics/wish-cosmetics';
import type { Detail } from '@/api/model';
import type { ReadListDto } from '@/api/model';
import { pickWishListThumbnailUrl } from '@/lib/wish-display-image';

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
      <MainHomeTopZipperWithLogo />

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-5 pt-4 pb-1">
        <div className="mx-auto w-full max-w-[360px] shrink-0">
          <MainHomeListHeader
            nickname={nickname}
            profileUrl={profileUrl}
            isLoading={showSkeleton}
          />
        </div>

        <div className="relative z-20 mx-auto mt-3 grid min-h-0 w-full max-w-[360px] flex-1 grid-rows-3 gap-2 overflow-hidden sm:gap-2.5">
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

  const { data: homeResponse, isLoading: isHomeLoading } = useGetHomeData();
  const { data: wishListResponse, isLoading: isWishListLoading } =
    useReadWishCosmeticsList({
      sort: 'desc',
      size: 100,
    });
  const homeData = homeResponse?.result;
  const hasServerNickname = Boolean(homeData?.nickname?.trim());

  React.useEffect(() => {
    if (isHomeLoading || hasServerNickname) {
      return;
    }
    router.replace('/nickname');
  }, [hasServerNickname, isHomeLoading, router]);

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

  const sections: Array<{ title: string; items: Detail[] }> = [
    { title: 'Wish List', items: wishItems },
    { title: 'My Pouch', items: homeData?.myList ?? [] },
    { title: 'Feed', items: homeData?.feed ?? [] },
  ];

  const showHomeSkeleton = isHomeLoading || isWishListLoading;

  const myListItems = homeData?.myList ?? [];
  const feedListItems = homeData?.feed ?? [];
  const isAllSectionsEmpty =
    !showHomeSkeleton &&
    wishItems.length === 0 &&
    myListItems.length === 0 &&
    feedListItems.length === 0;

  if (!isHomeLoading && !hasServerNickname) {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center overflow-hidden overscroll-none bg-white px-5">
        <p className="text-mono-dark-gray text-sm">확인 중...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-x-hidden overflow-y-hidden overscroll-none">
      {showHomeSkeleton ? (
        <MainHomeListView
          showSkeleton
          sections={sections}
          nickname={homeData?.nickname}
          profileUrl={homeData?.profileUrl}
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
          profileUrl={homeData?.profileUrl}
        />
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
