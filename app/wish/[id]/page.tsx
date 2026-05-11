'use client';

import { useParams, useRouter } from 'next/navigation';
import {
  useEffect,
  useMemo,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import Image from 'next/image';
import { WishCardImage } from '@/components/wishlist/WishCardImage';
import { resolveMediaUrl } from '@/lib/resolve-media-url';
import { Share2, Download, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useYoutubeReview } from '@/hooks/queries/useYoutubeReview';
import { Header } from '@/components/layout/Header';
import {
  deleteWishCosmetics,
  useReadWishCosmeticsDetail,
  useReadWishCosmeticsList,
  getReadWishCosmeticsDetailQueryKey,
  getReadWishCosmeticsListQueryKey,
} from '@/api/generated/wish-cosmetics/wish-cosmetics';
import {
  useMutation,
  useQueryClient,
  keepPreviousData,
} from '@tanstack/react-query';
import { patchWishCosmeticsMultipart } from '@/lib/wish-cosmetics';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from '@/components/ui/carousel';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { COSMETIC_CATEGORIES } from '@/constants/category';
import { cn } from '@/lib/utils';
import Input from '@/components/common/Input/Input';
import { Modal } from '@/components/common/Modal/Modal';
import type { ReadDetailDto, UpdateDto } from '@/api/model';

const MEMO_MAX_LEN = 60;

type DraftForm = {
  brand: string;
  productName: string;
  price: string;
  feature: string;
  memo: string;
  category: string;
  subCategory: string;
};

const emptyDraft: DraftForm = {
  brand: '',
  productName: '',
  price: '',
  feature: '',
  memo: '',
  category: COSMETIC_CATEGORIES[0]?.value ?? 'Base',
  subCategory: COSMETIC_CATEGORIES[0]?.subCategories[0]?.value ?? 'Highlighter',
};

const formatPriceKo = (value?: number): string => {
  if (value === undefined || value === null || Number.isNaN(Number(value))) {
    return '-';
  }
  return `${Number(value).toLocaleString('ko-KR')}원`;
};

const draftFromDetail = (detail: ReadDetailDto): DraftForm => {
  let category = detail.category ?? emptyDraft.category;
  let subCategory = detail.subCategory ?? emptyDraft.subCategory;
  const main = COSMETIC_CATEGORIES.find((c) => c.value === category);
  if (!main) {
    category = emptyDraft.category;
    subCategory = emptyDraft.subCategory;
  } else if (
    subCategory &&
    !main.subCategories.some((s) => s.value === subCategory)
  ) {
    subCategory = main.subCategories[0]?.value ?? subCategory;
  }

  return {
    brand: detail.brand ?? '',
    productName: detail.productName ?? '',
    price:
      detail.price !== undefined && detail.price !== null
        ? String(detail.price)
        : '',
    feature: detail.feature ?? '',
    memo: detail.memo ?? '',
    category,
    subCategory,
  };
};

/**
 * 위시 상세 본문: `WishlistDetailPage`(route id로 key 제어 리마운트)에서 렌더링합니다.
 *
 * 캐러셀 + URL 동기화 패턴:
 *   목록 전체(100개)를 한 번에 로드하고, 현재 id를 startIndex 삼아 캐러셀을 초기화합니다.
 *   슬라이드를 넘길 때 router.replace 대신 window.history.replaceState를 씁니다.
 *   이유: Next.js App Router에서 동적 세그먼트([id]) 전환은 router.replace 호출 시
 *   컴포넌트 remount가 일어나 전체 화면이 깜빡입니다. History API는 리렌더 없이
 *   주소만 바꿔주므로 부드러운 슬라이드 UX를 구현할 수 있습니다.
 *
 *   슬라이드 전환 시 이전 데이터를 유지하기 위해 keepPreviousData를 사용합니다.
 *   이를 통해 새 항목 데이터 로딩 중에도 이전 내용이 희미하게 표시됩니다.
 */
function WishlistDetailContent({ routeWishId }: { routeWishId: number }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [showCapture, setShowCapture] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [api, setApi] = useState<CarouselApi>();
  const [selectedWishId, setSelectedWishId] = useState(routeWishId);
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState<DraftForm>(emptyDraft);

  const { data: listData, isLoading: isListLoading } = useReadWishCosmeticsList(
    {
      size: 100,
      sort: 'desc',
    },
  );
  const wishItems = useMemo(() => listData?.result?.content ?? [], [listData]);

  const initialIndex = wishItems.findIndex(
    (v) => String(v.wishCosmeticsId) === String(routeWishId),
  );
  const safeInitialIndex = initialIndex >= 0 ? initialIndex : 0;

  const { data: detailData, isFetching: isDetailFetching } =
    useReadWishCosmeticsDetail(selectedWishId, {
      query: {
        enabled: !!selectedWishId,
        placeholderData: keepPreviousData,
      },
    });
  const currentItem = detailData?.result;

  const searchQuery = currentItem
    ? `${currentItem.brand} ${currentItem.productName}`
    : '';

  const { data: youtubeData, isLoading: isYoutubeLoading } =
    useYoutubeReview(searchQuery);

  const currentCaptureImageSrcRaw =
    currentItem?.captureImageUrl ?? currentItem?.productImageUrl ?? '';

  const currentCaptureImageSrc = currentCaptureImageSrcRaw
    ? resolveMediaUrl(currentCaptureImageSrcRaw)
    : '/icons/imgplus.svg';

  const { mutateAsync: patchWishCosmetics, isPending: isSavePending } =
    useMutation({
      mutationFn: async (input: {
        wishCosmeticsId: number;
        request: UpdateDto;
      }) => patchWishCosmeticsMultipart(input),
      onSuccess: async (_, variables) => {
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: getReadWishCosmeticsDetailQueryKey(
              variables.wishCosmeticsId,
            ),
          }),
          queryClient.invalidateQueries({
            queryKey: getReadWishCosmeticsListQueryKey({
              size: 100,
              sort: 'desc',
            }),
          }),
        ]);
      },
    });

  const { mutateAsync: removeWishItems, isPending: isDeletePending } =
    useMutation({
      mutationFn: (wishCosmeticsIds: number[]) =>
        deleteWishCosmetics({ wishCosmeticsIds }),
      onSuccess: async (_, deletedIds) => {
        await queryClient.invalidateQueries({
          queryKey: ['/api/wish-cosmetics'],
        });
        for (const wid of deletedIds) {
          queryClient.removeQueries({
            queryKey: getReadWishCosmeticsDetailQueryKey(wid),
          });
        }
      },
    });

  const handleCaptureShare = async () => {
    if (!currentCaptureImageSrc) {
      return;
    }

    try {
      if (navigator.share) {
        await navigator.share({
          title: `${currentItem?.productName ?? '위시템'} 캡처`,
          url: currentCaptureImageSrc,
        });
        return;
      }

      await navigator.clipboard.writeText(currentCaptureImageSrc);
      alert('이미지 링크가 복사되었습니다.');
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        alert('공유에 실패했습니다.');
      }
    }
  };

  const handleGoToMy = useCallback(() => {
    router.push('/my-cosmetics');
  }, [router]);

  const handleConfirmDeleteWish = async () => {
    const id = currentItem?.wishCosmeticsId;
    if (!id || isDeletePending) {
      return;
    }

    try {
      await removeWishItems([id]);
      setDeleteConfirmOpen(false);
      router.push('/wish');
    } catch {
      alert('삭제하지 못했습니다. 다시 시도해 주세요.');
    }
  };

  const handleCaptureDownload = async () => {
    if (!currentCaptureImageSrc) {
      return;
    }

    try {
      const response = await fetch(currentCaptureImageSrc);
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = `wish-capture-${currentItem?.wishCosmeticsId ?? 'image'}.jpg`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(objectUrl);
    } catch {
      window.open(currentCaptureImageSrc, '_blank', 'noopener,noreferrer');
    }
  };

  const handleStartEdit = useCallback(() => {
    if (!currentItem) {
      return;
    }
    setDraft(draftFromDetail(currentItem));
    setIsEditing(true);
  }, [currentItem]);

  const handleConfirm = useCallback(async () => {
    if (!currentItem?.wishCosmeticsId) {
      return;
    }

    if (!isEditing) {
      router.back();
      return;
    }

    const priceNum =
      draft.price.trim() === '' ? undefined : Number(draft.price);
    if (draft.price.trim() !== '' && Number.isNaN(Number(priceNum))) {
      alert('가격은 숫자로 입력해 주세요.');
      return;
    }

    try {
      await patchWishCosmetics({
        wishCosmeticsId: currentItem.wishCosmeticsId,
        request: {
          brand: draft.brand || undefined,
          name: draft.productName || undefined,
          category: draft.category || undefined,
          subCategory: draft.subCategory || undefined,
          price: priceNum,
          feature: draft.feature || undefined,
          memo: draft.memo || undefined,
        },
      });
      setIsEditing(false);
    } catch {
      alert('저장하지 못했습니다. 다시 시도해 주세요.');
    }
  }, [currentItem, isEditing, draft, patchWishCosmetics, router]);

  useEffect(() => {
    if (!api) {
      return;
    }

    const handleSelect = () => {
      const index = api.selectedScrollSnap();
      setIsEditing(false);
      const selectedId = wishItems[index]?.wishCosmeticsId;
      if (!selectedId) {
        return;
      }
      setSelectedWishId(selectedId);
      window.history.replaceState(null, '', `/wish/${selectedId}`);
    };

    api.on('select', handleSelect);

    return () => {
      api.off('select', handleSelect);
    };
  }, [api, wishItems]);

  if (isListLoading || !currentItem) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-sm text-zinc-400">
        위시 상세를 불러오는 중...
      </div>
    );
  }

  const subOptions =
    COSMETIC_CATEGORIES.find((c) => c.value === draft.category)
      ?.subCategories ?? [];

  const viewSubOptions =
    COSMETIC_CATEGORIES.find((c) => c.value === (currentItem.category ?? ''))
      ?.subCategories ?? [];
  const viewMainCategoryLabel =
    COSMETIC_CATEGORIES.find((c) => c.value === (currentItem.category ?? ''))
      ?.label ?? '대분류';
  const viewSubCategoryLabel =
    viewSubOptions.find((s) => s.value === (currentItem.subCategory ?? ''))
      ?.label ?? '소분류';

  const readonlyFieldClass =
    'pointer-events-none cursor-default border-[var(--mono-gray)] bg-white text-[var(--mono-jet)] focus-visible:ring-0';

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <div className="sticky top-0 z-40 shrink-0 bg-white pt-[var(--safe-area-top)]">
        <Header
          sticky={false}
          className="border-b border-zinc-100"
          title="제품 상세보기"
          showBack
        />
      </div>

      <div
        className={cn(
          'overflow-anchor-none flex-1 overflow-y-auto px-[20px] pb-36 transition-opacity duration-200',
          isDetailFetching && 'opacity-40',
        )}
      >
        <div className="relative mt-2">
          <Carousel
            key={`carousel-${routeWishId}-${wishItems.length}-${initialIndex}`}
            setApi={setApi}
            opts={{
              startIndex: safeInitialIndex,
              align: 'center',
              loop: wishItems.length > 2,
            }}
            className="w-full"
          >
            <CarouselContent className="-ml-0">
              {wishItems.map((item) => (
                <CarouselItem
                  key={item.wishCosmeticsId}
                  className="basis-full pl-0"
                >
                  <div className="relative mx-auto aspect-square w-full max-w-[280px] overflow-hidden rounded-2xl bg-zinc-100">
                    <WishCardImage
                      officialImage={item.productImageUrl ?? ''}
                      captureImage={item.captureImageUrl ?? ''}
                      productName={item.productName ?? ''}
                      fill
                      className="object-contain"
                    />
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious
              type="button"
              disabled={wishItems.length <= 1}
              className="top-1/2 -left-0 left-1 h-16 w-16 -translate-y-1/2 [&_img]:size-12"
            />
            <CarouselNext
              type="button"
              disabled={wishItems.length <= 1}
              className="top-1/2 -right-0 right-1 h-16 w-16 -translate-y-1/2 [&_img]:size-12"
            />
          </Carousel>
        </div>

        {!isEditing ? (
          <div className="mt-3 flex flex-col items-end gap-1">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleGoToMy}
                className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-transparent px-3 py-1.5 text-sm font-semibold text-zinc-900 shadow-none"
              >
                MY로 이동하기
              </button>
              <button
                type="button"
                onClick={() => setDeleteConfirmOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-transparent px-3 py-1.5 text-sm font-semibold text-zinc-900 shadow-none"
              >
                삭제하기
              </button>
            </div>

            <button
              type="button"
              onClick={handleStartEdit}
              className="inline-flex items-center gap-1.5 border-0 bg-transparent px-0 py-1.5 text-sm font-semibold text-zinc-900 shadow-none"
            >
              <Image
                src="/icons/PenNewSquare.svg"
                alt=""
                width={18}
                height={18}
                unoptimized
                className="shrink-0"
              />
              수정하기
            </button>
          </div>
        ) : null}

        <div className="mt-8 space-y-6">
          <WishFieldRow label="브랜드명" isEditing={isEditing}>
            <Input
              readOnly={!isEditing}
              value={
                isEditing
                  ? draft.brand
                  : currentItem.brand !== undefined && currentItem.brand !== ''
                    ? currentItem.brand
                    : '-'
              }
              onChange={
                isEditing
                  ? (e) => {
                      setDraft((d) => ({ ...d, brand: e.target.value }));
                    }
                  : undefined
              }
              aria-label="브랜드명"
              className={cn(!isEditing && readonlyFieldClass)}
            />
          </WishFieldRow>

          <WishFieldRow label="제품명" isEditing={isEditing}>
            <Input
              readOnly={!isEditing}
              value={
                isEditing
                  ? draft.productName
                  : currentItem.productName?.trim()
                    ? currentItem.productName
                    : '-'
              }
              onChange={
                isEditing
                  ? (e) => {
                      setDraft((d) => ({
                        ...d,
                        productName: e.target.value,
                      }));
                    }
                  : undefined
              }
              aria-label="제품명"
              className={cn(!isEditing && readonlyFieldClass)}
            />
          </WishFieldRow>

          <WishFieldRow label="가격" isEditing={isEditing}>
            {!isEditing ? (
              <div className="flex w-full items-center gap-3">
                <div className="flex h-10 min-w-0 flex-1 items-center rounded-lg border border-[var(--mono-gray)] bg-white px-3">
                  <span className="mr-2 text-sm leading-none font-bold text-[var(--brand-pink)]">
                    최저가
                  </span>
                  <span className="text-sm font-medium text-[var(--mono-jet)]">
                    {formatPriceKo(currentItem.price)}
                  </span>
                  <Popover>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        className="ml-auto flex size-5 shrink-0 cursor-pointer items-center justify-center rounded-full bg-[#6f6161] text-white outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:ring-offset-2"
                        aria-label="네이버 최저가 안내"
                      >
                        <span className="text-sm leading-none font-bold">
                          !
                        </span>
                      </button>
                    </PopoverTrigger>
                    <PopoverContent
                      side="top"
                      align="end"
                      sideOffset={8}
                      className="w-auto border-0 bg-transparent p-0 shadow-none ring-0"
                    >
                      <Image
                        src="/icons/네이버최저가.svg"
                        alt="네이버 쇼핑 최저가 기준 안내"
                        width={165}
                        height={75}
                        unoptimized
                        className="block h-auto w-[165px] max-w-[min(165px,calc(100vw-32px))]"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            ) : (
              <Input
                type="text"
                inputMode="numeric"
                autoComplete="off"
                placeholder="예: 28000"
                value={draft.price}
                onChange={(e) => {
                  const digitsOnly = e.target.value.replace(/\D/g, '');
                  setDraft((d) => ({
                    ...d,
                    price: digitsOnly,
                  }));
                }}
                className="text-[var(--brand-pink)] placeholder:text-zinc-300"
                aria-label="가격"
              />
            )}
          </WishFieldRow>

          <div>
            <WishFieldLabel>분류</WishFieldLabel>
            {isEditing ? (
              <div className="grid grid-cols-2 gap-2">
                <Select
                  value={draft.category}
                  onValueChange={(value) => {
                    const main = COSMETIC_CATEGORIES.find(
                      (c) => c.value === value,
                    );
                    const firstSub = main?.subCategories[0]?.value ?? '';
                    setDraft((d) => ({
                      ...d,
                      category: value,
                      subCategory: firstSub || d.subCategory,
                    }));
                  }}
                >
                  <SelectTrigger
                    size="sm"
                    className="h-7 w-full min-w-0 rounded-lg border-zinc-200 bg-white py-1 text-xs"
                    aria-label="대분류"
                  >
                    <SelectValue placeholder="대분류" />
                  </SelectTrigger>
                  <SelectContent
                    position="popper"
                    side="bottom"
                    align="start"
                    sideOffset={4}
                    className="max-h-60"
                  >
                    {COSMETIC_CATEGORIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={draft.subCategory}
                  onValueChange={(value) => {
                    setDraft((d) => ({
                      ...d,
                      subCategory: value,
                    }));
                  }}
                >
                  <SelectTrigger
                    size="sm"
                    className="h-7 w-full min-w-0 rounded-lg border-zinc-200 bg-white py-1 text-xs"
                    aria-label="소분류"
                  >
                    <SelectValue placeholder="소분류" />
                  </SelectTrigger>
                  <SelectContent
                    position="popper"
                    side="bottom"
                    align="start"
                    sideOffset={4}
                    className="max-h-60"
                  >
                    {subOptions.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <span className="flex h-8 min-w-0 items-center justify-center rounded-full border border-[var(--brand-pink)] bg-white px-6 text-sm font-bold text-[var(--brand-pink)]">
                  {viewMainCategoryLabel}
                </span>
                <span className="flex h-8 min-w-0 items-center justify-center rounded-full bg-[var(--brand-classic)] px-6 text-sm font-bold text-white">
                  {viewSubCategoryLabel}
                </span>
              </div>
            )}
          </div>

          <WishFieldRow label="특징" isEditing={isEditing}>
            <Input
              readOnly={!isEditing}
              value={
                isEditing
                  ? draft.feature
                  : currentItem.feature?.trim()
                    ? currentItem.feature
                    : '-'
              }
              onChange={
                isEditing
                  ? (e) => {
                      setDraft((d) => ({
                        ...d,
                        feature: e.target.value,
                      }));
                    }
                  : undefined
              }
              aria-label="특징"
              className={cn(!isEditing && readonlyFieldClass)}
            />
          </WishFieldRow>

          <div>
            <WishFieldLabel>메모</WishFieldLabel>
            {isEditing ? (
              <>
                <div className="flex w-full items-start gap-2 rounded-lg border border-[var(--mono-gray)] bg-white px-3 py-1">
                  <textarea
                    readOnly={false}
                    value={draft.memo}
                    maxLength={MEMO_MAX_LEN}
                    onChange={(e) => {
                      setDraft((d) => ({ ...d, memo: e.target.value }));
                    }}
                    placeholder="메모는 최대 60자까지 입력할 수 있습니다."
                    rows={4}
                    className="focus-visible:border-brand-pink min-h-[96px] flex-1 resize-none border-0 bg-transparent px-0 py-0 text-sm leading-snug outline-none placeholder:text-zinc-400 focus-visible:ring-0"
                    aria-label="메모"
                  />
                  <Image
                    src="/icons/PenNewSquare.svg"
                    alt=""
                    width={20}
                    height={20}
                    unoptimized
                    className="mt-0.5 shrink-0"
                    aria-hidden
                  />
                </div>
                <p className="mt-1 text-xs text-zinc-400">
                  {draft.memo.length}/{MEMO_MAX_LEN}
                </p>
              </>
            ) : (
              <>
                <textarea
                  readOnly
                  value={
                    currentItem.memo?.trim()
                      ? currentItem.memo
                      : '메모는 최대 60자까지 입력할 수 있습니다.'
                  }
                  maxLength={MEMO_MAX_LEN}
                  rows={4}
                  className={cn(
                    'border-mono-gray focus-visible:border-brand-pink w-full resize-none rounded-sm border px-4 py-3 text-sm outline-none focus-visible:ring-0',
                    !currentItem.memo?.trim()
                      ? 'text-[var(--mono-dark-gray)]'
                      : '',
                    readonlyFieldClass,
                  )}
                  aria-label="메모"
                />
              </>
            )}
          </div>

          <div>
            <WishFieldLabel>원본 사진</WishFieldLabel>
            <button
              type="button"
              onClick={() => setShowCapture(true)}
              className="relative aspect-square w-28 overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50"
            >
              <Image
                src={currentCaptureImageSrc}
                alt=""
                fill
                className="object-cover"
                unoptimized={
                  currentCaptureImageSrc.startsWith('data:') ||
                  currentCaptureImageSrc.endsWith('.svg')
                }
              />
            </button>
          </div>
        </div>

        <section className="mt-10 border-t border-zinc-100 pt-6">
          <WishFieldLabel>연관 리뷰 영상</WishFieldLabel>

          {isYoutubeLoading ? (
            <Carousel
              opts={{
                align: 'start',
                containScroll: 'trimSnaps',
              }}
              className="w-full"
            >
              <CarouselContent className="-ml-4">
                {[1, 2, 3].map((n) => (
                  <CarouselItem key={n} className="basis-[38%] pl-4">
                    <div className="h-40 w-full animate-pulse rounded-xl bg-zinc-100" />
                    <div className="mt-2 h-4 w-3/4 animate-pulse rounded bg-zinc-100" />
                  </CarouselItem>
                ))}
              </CarouselContent>
            </Carousel>
          ) : youtubeData?.items && youtubeData.items.length > 0 ? (
            <Carousel
              opts={{
                align: 'start',
                containScroll: 'trimSnaps',
              }}
              className="w-full"
            >
              <CarouselContent className="-ml-4">
                {youtubeData.items.map((video) => (
                  <CarouselItem
                    key={video.id.videoId}
                    className="basis-[38%] pl-4"
                  >
                    <a
                      href={`https://www.youtube.com/watch?v=${video.id.videoId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group block"
                    >
                      <div className="relative aspect-video w-full overflow-hidden rounded-xl">
                        <Image
                          src={video.snippet.thumbnails.high.url}
                          alt={video.snippet.title}
                          fill
                          className="object-cover"
                        />
                      </div>
                      <p className="mt-2 line-clamp-2 text-sm font-semibold text-zinc-900">
                        {video.snippet.title}
                      </p>
                      <p className="text-xs text-zinc-400">
                        {video.snippet.channelTitle}
                      </p>
                    </a>
                  </CarouselItem>
                ))}
              </CarouselContent>
            </Carousel>
          ) : (
            <p className="text-sm text-[var(--mono-dark-gray)]">
              연관 리뷰 영상을 찾을 수 없어요.
            </p>
          )}
        </section>
      </div>

      {isEditing ? (
        <div className="pointer-events-none fixed right-[20px] bottom-20 left-[20px] z-40 flex justify-center">
          <div className="pointer-events-auto w-full max-w-120">
            <button
              type="button"
              onClick={() => void handleConfirm()}
              disabled={isSavePending}
              className="h-12 w-full rounded-2xl bg-[var(--brand-pink)] text-base font-bold text-white shadow-[0_8px_24px_rgba(255,96,202,0.35)] transition-opacity disabled:opacity-60"
            >
              {isSavePending ? '저장 중...' : '저장하기'}
            </button>
          </div>
        </div>
      ) : null}

      <Modal
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        variant="warning"
        title="위시를 삭제할까요?"
        description="삭제한 항목은 복구할 수 없어요."
        showCancel
        confirmText={isDeletePending ? '삭제 중...' : '삭제하기'}
        cancelText="취소"
        closeOnConfirm={false}
        onConfirm={() => void handleConfirmDeleteWish()}
      />

      <AnimatePresence>
        {showCapture && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-5"
          >
            <button
              type="button"
              onClick={() => setShowCapture(false)}
              className="absolute top-6 right-6 z-10 text-white"
            >
              <X size={32} />
            </button>

            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="relative aspect-1/2 w-full max-w-[480px]"
            >
              <Image
                src={currentCaptureImageSrc}
                alt="원본 캡처 화면"
                fill
                className="object-contain"
                unoptimized={
                  currentCaptureImageSrc.startsWith('data:') ||
                  currentCaptureImageSrc.endsWith('.svg')
                }
              />
            </motion.div>

            <div className="absolute bottom-10 flex gap-6">
              <button
                type="button"
                onClick={() => void handleCaptureShare()}
                className="flex flex-col items-center gap-2 text-white"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-black">
                  <Share2 size={20} />
                </div>
                <span className="text-xs">공유하기</span>
              </button>
              <button
                type="button"
                onClick={() => void handleCaptureDownload()}
                className="flex flex-col items-center gap-2 text-white"
              >
                <div className="ml flex h-12 w-12 items-center justify-center rounded-full bg-black">
                  <Download size={20} />
                </div>
                <span className="text-xs">저장하기</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function WishlistDetailPage() {
  const params = useParams();
  const rawId = params?.id;
  const routeWishId = Number(rawId);
  const isRouteWishIdValid =
    rawId !== undefined &&
    rawId !== null &&
    String(rawId) !== '' &&
    Number.isFinite(routeWishId) &&
    routeWishId > 0;

  if (!isRouteWishIdValid) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-5 text-sm text-zinc-500">
        잘못된 위시 ID입니다.
      </div>
    );
  }

  return <WishlistDetailContent key={routeWishId} routeWishId={routeWishId} />;
}

function WishFieldLabel({ children }: { children: ReactNode }) {
  return (
    <div className="text-mono-dark-gray mb-2 text-sm font-semibold">
      {children}
    </div>
  );
}

const editFieldShellClass =
  'flex min-h-10 w-full items-center gap-2 rounded-lg border border-[var(--mono-gray)] bg-white px-3 py-1';
const editFieldInnerClass =
  'min-w-0 flex-1 [&>div]:min-w-0 [&>div]:flex-1 [&_input]:h-9 [&_input]:min-h-9 [&_input]:border-0 [&_input]:bg-transparent [&_input]:shadow-none [&_input]:focus-visible:ring-0';

function WishFieldRow({
  label,
  isEditing,
  children,
}: {
  label: string;
  isEditing: boolean;
  children: ReactNode;
}) {
  return (
    <div>
      <WishFieldLabel>{label}</WishFieldLabel>
      {isEditing ? (
        <div className={editFieldShellClass}>
          <div className={editFieldInnerClass}>{children}</div>
          <Image
            src="/icons/PenNewSquare.svg"
            alt=""
            width={20}
            height={20}
            unoptimized
            className="shrink-0"
            aria-hidden
          />
        </div>
      ) : (
        children
      )}
    </div>
  );
}
