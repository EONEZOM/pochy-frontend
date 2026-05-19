'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { Download, Share2, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  keepPreviousData,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';

import {
  getGetCosmeticDetailQueryKey,
  getSearchMyCosmeticsQueryKey,
  useGetCosmeticDetail,
  useSearchMyCosmetics,
} from '@/api/generated/my-cosmetics-controller/my-cosmetics-controller';
import type { MyCosmeticsResponseDTO } from '@/api/model';
import { Button } from '@/components/common/Button';
import Input from '@/components/common/Input/Input';
import { Header } from '@/components/layout/Header';
import { WishCardImage } from '@/components/wishlist/WishCardImage';
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
import { COSMETIC_CATEGORIES } from '@/constants/category';
import { useYoutubeReview } from '@/hooks/queries/useYoutubeReview';
import { updateMyCosmeticItem } from '@/lib/my-cosmetics-mutations';
import {
  getMyCosmeticsWishCardImageProps,
  pickMyCosmeticsStickerImageUrl,
} from '@/lib/my-cosmetics-display-image';
import { useWarmMyCosmeticsItems } from '@/hooks/useWarmRouteImages';
import { resolveMediaUrl } from '@/lib/resolve-media-url';
import { cn } from '@/lib/utils';

const MEMO_MAX_LEN = 60;

const readonlyFieldClass =
  'pointer-events-none cursor-default border-[var(--mono-gray)] bg-white text-[var(--mono-jet)] focus-visible:ring-0';

type DraftForm = {
  brand: string;
  name: string;
  feature: string;
  memo: string;
  category: string;
  subCategory: string;
};

const emptyDraft: DraftForm = {
  brand: '',
  name: '',
  feature: '',
  memo: '',
  category: COSMETIC_CATEGORIES[0]?.value ?? 'Base',
  subCategory: COSMETIC_CATEGORIES[0]?.subCategories[0]?.value ?? 'Highlighter',
};

const draftFromItem = (item: MyCosmeticsResponseDTO): DraftForm => {
  let category = item.category ?? emptyDraft.category;
  let subCategory = item.subCategory ?? emptyDraft.subCategory;
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
    brand: item.brand ?? '',
    name: item.name ?? '',
    feature: item.feature ?? '',
    memo: item.memo ?? '',
    category,
    subCategory,
  };
};

type MyCosmeticsDetailViewProps = {
  routeCosmeticId: number;
};

export function MyCosmeticsDetailView({
  routeCosmeticId,
}: MyCosmeticsDetailViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const returnTo = searchParams.get('returnTo')?.trim() ?? '';
  const wantsEditOnMount = searchParams.get('edit') === '1';

  const [showCapture, setShowCapture] = useState(false);
  const [api, setApi] = useState<CarouselApi>();
  const [selectedId, setSelectedId] = useState(routeCosmeticId);
  const [isEditing, setIsEditing] = useState(wantsEditOnMount);
  const [draft, setDraft] = useState<DraftForm>(emptyDraft);
  const [editDraftSyncedItemId, setEditDraftSyncedItemId] = useState<
    number | null
  >(null);

  const { data: listData, isLoading: isListLoading } = useSearchMyCosmetics({
    size: 100,
    sort: 'desc',
  });
  const listItems: MyCosmeticsResponseDTO[] = useMemo(
    () => (listData?.result?.content ?? []) as MyCosmeticsResponseDTO[],
    [listData],
  );

  useWarmMyCosmeticsItems(listItems);

  const initialIndex = listItems.findIndex((v) => v.id === routeCosmeticId);
  const safeInitialIndex = initialIndex >= 0 ? initialIndex : 0;

  const {
    data: detailData,
    isFetching: isDetailFetching,
    isError: isDetailError,
    isFetched: isDetailFetched,
  } = useGetCosmeticDetail(selectedId, {
    query: {
      enabled: Number.isFinite(selectedId) && selectedId > 0,
      placeholderData: keepPreviousData,
      retry: (failureCount, error) => {
        const status = (error as { response?: { status?: number } })?.response
          ?.status;
        if (status === 404 || status === 401 || status === 403) {
          return false;
        }
        return failureCount < 2;
      },
    },
  });

  const listItemById = useMemo(
    () => listItems.find((v) => v.id === selectedId),
    [listItems, selectedId],
  );
  const detailItem = detailData?.result as MyCosmeticsResponseDTO | undefined;
  const currentItem = detailItem ?? listItemById;

  if (
    wantsEditOnMount &&
    currentItem?.id != null &&
    editDraftSyncedItemId !== currentItem.id
  ) {
    setEditDraftSyncedItemId(currentItem.id);
    setDraft(draftFromItem(currentItem));
  }

  const searchQuery = currentItem
    ? `${currentItem.brand ?? ''} ${currentItem.name ?? ''}`.trim()
    : '';

  const { data: youtubeData, isLoading: isYoutubeLoading } = useYoutubeReview(
    searchQuery,
    { enabled: searchQuery.length > 0 },
  );

  const captureImageSrcRaw = currentItem
    ? pickMyCosmeticsStickerImageUrl(currentItem)
    : '';
  const captureImageSrc = captureImageSrcRaw
    ? resolveMediaUrl(captureImageSrcRaw)
    : '/icons/imgplus.svg';

  const viewSubOptions =
    COSMETIC_CATEGORIES.find((c) => c.value === (currentItem?.category ?? ''))
      ?.subCategories ?? [];
  const viewMainCategoryLabel =
    COSMETIC_CATEGORIES.find((c) => c.value === (currentItem?.category ?? ''))
      ?.label ?? '대분류';
  const viewSubCategoryLabel =
    viewSubOptions.find((s) => s.value === (currentItem?.subCategory ?? ''))
      ?.label ?? '소분류';

  const editSubOptions =
    COSMETIC_CATEGORIES.find((c) => c.value === draft.category)
      ?.subCategories ?? [];

  const { mutateAsync: saveMyCosmetic, isPending: isSavePending } = useMutation(
    {
      mutationFn: async (input: { cosmeticId: number; request: DraftForm }) => {
        return updateMyCosmeticItem(input.cosmeticId, {
          request: {
            brand: input.request.brand || undefined,
            name: input.request.name || undefined,
            category: input.request.category || undefined,
            subCategory: input.request.subCategory || undefined,
            feature: input.request.feature || undefined,
            memo: input.request.memo || undefined,
          },
        });
      },
      onSuccess: async (_, variables) => {
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: getGetCosmeticDetailQueryKey(variables.cosmeticId),
          }),
          queryClient.invalidateQueries({
            queryKey: getSearchMyCosmeticsQueryKey({ size: 100, sort: 'desc' }),
          }),
        ]);
      },
    },
  );

  const handleCancelEdit = useCallback(() => {
    if (returnTo) {
      router.replace(returnTo);
      return;
    }
    if (currentItem) {
      setDraft(draftFromItem(currentItem));
    }
    setIsEditing(false);
  }, [currentItem, returnTo, router]);

  const handleSaveEdit = useCallback(async () => {
    if (!currentItem?.id || isSavePending) {
      return;
    }

    try {
      await saveMyCosmetic({
        cosmeticId: currentItem.id,
        request: draft,
      });
      setIsEditing(false);
      if (returnTo) {
        router.replace(returnTo);
      }
    } catch {
      alert('저장하지 못했습니다. 다시 시도해 주세요.');
    }
  }, [currentItem, draft, isSavePending, returnTo, router, saveMyCosmetic]);

  useEffect(() => {
    if (!api) {
      return;
    }

    const handleSelect = () => {
      const index = api.selectedScrollSnap();
      const item = listItems[index];
      if (item?.id == null) {
        return;
      }
      setIsEditing(false);
      setSelectedId(item.id);
      const query = searchParams.toString();
      const nextPath = query
        ? `/my-cosmetics/${item.id}?${query}`
        : `/my-cosmetics/${item.id}`;
      window.history.replaceState(null, '', nextPath);
    };

    api.on('select', handleSelect);
    return () => {
      api.off('select', handleSelect);
    };
  }, [api, listItems, searchParams]);

  const handleCaptureShare = async () => {
    if (!captureImageSrc || captureImageSrc === '/icons/imgplus.svg') {
      return;
    }

    try {
      if (navigator.share) {
        await navigator.share({
          title: `${currentItem?.name ?? '내 화장품'} 캡처`,
          url: captureImageSrc,
        });
        return;
      }

      await navigator.clipboard.writeText(captureImageSrc);
      alert('이미지 링크가 복사되었습니다.');
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        alert('공유에 실패했습니다.');
      }
    }
  };

  const handleCaptureDownload = async () => {
    if (!captureImageSrc || captureImageSrc === '/icons/imgplus.svg') {
      return;
    }

    try {
      const response = await fetch(captureImageSrc);
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = `my-cosmetic-capture-${currentItem?.id ?? 'image'}.jpg`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(objectUrl);
    } catch {
      window.open(captureImageSrc, '_blank', 'noopener,noreferrer');
    }
  };

  const isPageLoading =
    isListLoading || (!currentItem && (!isDetailFetched || isDetailFetching));

  if (isPageLoading) {
    return (
      <motion.div className="flex min-h-[60vh] items-center justify-center text-sm text-zinc-400">
        화장품 정보를 불러오는 중...
      </motion.div>
    );
  }

  if (!currentItem) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-2 px-5 text-center text-sm text-zinc-400">
        <p>{'화장품 정보를 찾을 수 없어요.'}</p>
        {isDetailError ? (
          <p className="text-xs text-zinc-300">
            {'삭제되었거나 목록에 없는 제품일 수 있어요.'}
          </p>
        ) : null}
      </div>
    );
  }

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
          'overflow-anchor-none flex-1 overflow-y-auto px-[20px] transition-opacity duration-200',
          isEditing ? 'pb-32' : 'pb-36',
          isDetailFetching && 'opacity-40',
        )}
      >
        <div className="relative mt-2">
          <Carousel
            key={`carousel-${routeCosmeticId}-${listItems.length}-${initialIndex}`}
            setApi={setApi}
            opts={{
              startIndex: safeInitialIndex,
              align: 'center',
              loop: listItems.length > 2,
            }}
            className="w-full"
          >
            <CarouselContent className="-ml-0">
              {listItems.map((item, index) => (
                <CarouselItem key={item.id} className="basis-full pl-0">
                  <div className="relative mx-auto aspect-square w-full max-w-[280px] overflow-hidden rounded-2xl bg-zinc-100">
                    <WishCardImage
                      {...getMyCosmeticsWishCardImageProps(item)}
                      productName={item.name ?? ''}
                      fill
                      className="object-contain"
                      priority={index === safeInitialIndex}
                      loading={
                        Math.abs(index - safeInitialIndex) <= 1
                          ? 'eager'
                          : 'lazy'
                      }
                    />
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious
              type="button"
              disabled={listItems.length <= 1}
              className="top-1/2 -left-0 left-1 h-16 w-16 -translate-y-1/2 [&_img]:size-12"
            />
            <CarouselNext
              type="button"
              disabled={listItems.length <= 1}
              className="top-1/2 -right-0 right-1 h-16 w-16 -translate-y-1/2 [&_img]:size-12"
            />
          </Carousel>
        </div>

        <div className="mt-8 space-y-6">
          <DetailFieldRow label="브랜드명">
            <Input
              readOnly={!isEditing}
              value={
                isEditing
                  ? draft.brand
                  : currentItem.brand?.trim()
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
          </DetailFieldRow>

          <DetailFieldRow label="제품명">
            <Input
              readOnly={!isEditing}
              value={
                isEditing
                  ? draft.name
                  : currentItem.name?.trim()
                    ? currentItem.name
                    : '-'
              }
              onChange={
                isEditing
                  ? (e) => {
                      setDraft((d) => ({ ...d, name: e.target.value }));
                    }
                  : undefined
              }
              aria-label="제품명"
              className={cn(!isEditing && readonlyFieldClass)}
            />
          </DetailFieldRow>

          <div>
            <DetailFieldLabel>분류</DetailFieldLabel>
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
                    {editSubOptions.map((s) => (
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

          <DetailFieldRow label="특징">
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
                      setDraft((d) => ({ ...d, feature: e.target.value }));
                    }
                  : undefined
              }
              aria-label="특징"
              className={cn(!isEditing && readonlyFieldClass)}
            />
          </DetailFieldRow>

          <div>
            <DetailFieldLabel>메모</DetailFieldLabel>
            <textarea
              readOnly={!isEditing}
              value={
                isEditing
                  ? draft.memo
                  : currentItem.memo?.trim()
                    ? currentItem.memo
                    : '메모는 최대 60자까지 입력할 수 있습니다.'
              }
              onChange={
                isEditing
                  ? (e) => {
                      setDraft((d) => ({ ...d, memo: e.target.value }));
                    }
                  : undefined
              }
              maxLength={MEMO_MAX_LEN}
              rows={4}
              className={cn(
                'border-mono-gray focus-visible:border-brand-pink w-full resize-none rounded-sm border px-4 py-3 text-sm outline-none focus-visible:ring-0',
                !isEditing && !currentItem.memo?.trim()
                  ? 'text-[var(--mono-dark-gray)]'
                  : '',
                !isEditing && readonlyFieldClass,
              )}
              aria-label="메모"
            />
          </div>

          <div>
            <DetailFieldLabel>원본 사진</DetailFieldLabel>
            <button
              type="button"
              onClick={() => {
                setShowCapture(true);
              }}
              className="relative aspect-square w-28 overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50"
            >
              <Image
                src={captureImageSrc}
                alt=""
                fill
                className="object-cover"
                unoptimized
              />
            </button>
          </div>
        </div>

        <section className="mt-10 border-t border-zinc-100 pt-6">
          <DetailFieldLabel>연관 리뷰 영상</DetailFieldLabel>

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
                          unoptimized
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
        <div className="border-mono-bright-gray fixed bottom-14 left-1/2 z-50 box-border w-full max-w-120 min-w-0 -translate-x-1/2 rounded-t-3xl border-t bg-white px-5 pt-4 pb-4 shadow-[0_-4px_4px_rgba(0,0,0,0.1)]">
          <div className="flex w-full min-w-0 gap-2">
            <Button
              type="button"
              variant="default"
              size="lg"
              className="min-w-0 flex-1"
              onClick={handleCancelEdit}
              disabled={isSavePending}
            >
              취소
            </Button>
            <Button
              type="button"
              variant="solid"
              size="lg"
              className="min-w-0 flex-1"
              onClick={() => {
                void handleSaveEdit();
              }}
              disabled={isSavePending}
            >
              {isSavePending ? '저장 중...' : '저장'}
            </Button>
          </div>
        </div>
      ) : null}

      <AnimatePresence>
        {showCapture ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-5"
          >
            <button
              type="button"
              onClick={() => {
                setShowCapture(false);
              }}
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
                src={captureImageSrc}
                alt="원본 캡처 화면"
                fill
                className="object-contain"
                unoptimized
              />
            </motion.div>

            <div className="absolute bottom-10 flex gap-6">
              <button
                type="button"
                onClick={() => {
                  void handleCaptureShare();
                }}
                className="flex flex-col items-center gap-2 text-white"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-black">
                  <Share2 size={20} />
                </div>
                <span className="text-xs">공유하기</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  void handleCaptureDownload();
                }}
                className="flex flex-col items-center gap-2 text-white"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-black">
                  <Download size={20} />
                </div>
                <span className="text-xs">저장하기</span>
              </button>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function DetailFieldLabel({ children }: { children: ReactNode }) {
  return (
    <div className="text-mono-dark-gray mb-2 text-sm font-semibold">
      {children}
    </div>
  );
}

function DetailFieldRow({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div>
      <DetailFieldLabel>{label}</DetailFieldLabel>
      {children}
    </div>
  );
}
