'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Plus,
} from 'lucide-react';

import { Modal } from '@/components/common/Modal';
import { useFeedBookmarksContext } from '@/components/feed/FeedBookmarksProvider';
import { Header } from '@/components/layout/Header';
import {
  FEED_DEFAULT_STICKERS,
  FEED_DETAIL_CHIP_BAR,
  FEED_DETAIL_PRODUCTS,
  FEED_MOCK_ITEMS,
  type FeedStickerHotspot,
} from '@/constants/feed-mock';
import { cn } from '@/lib/utils';

const SCROLL_REACTION_START_PX = 12;
const SCROLL_REACTION_FULL_HIDE_PX = 110;
const SCROLL_REVEAL_PX = 88;

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

export default function FeedDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = typeof params.id === 'string' ? params.id : '';
  const scrollRef = useRef<HTMLDivElement>(null);
  const { isBookmarked, toggleBookmark } = useFeedBookmarksContext();

  const post = useMemo(
    () => FEED_MOCK_ITEMS.find((item) => item.id === id),
    [id],
  );

  const favorite = isBookmarked(id);
  const [activeCategory, setActiveCategory] = useState('all');
  const [scrollY, setScrollY] = useState(0);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [stickerModalOpen, setStickerModalOpen] = useState(false);
  const [activeSticker, setActiveSticker] = useState<FeedStickerHotspot | null>(
    null,
  );

  const carouselTitles = useMemo(() => {
    if (!post) {
      return [];
    }
    const extra = post.detailCarouselTitles?.length
      ? post.detailCarouselTitles
      : [post.title];
    const unique = [...new Set(extra)];
    return unique;
  }, [post]);

  useEffect(() => {
    if (!post) {
      return;
    }
    setCarouselIndex(0);
    setScrollY(0);
    scrollRef.current?.scrollTo({ top: 0 });
  }, [post]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) {
      return;
    }

    const onScroll = () => {
      setScrollY(el.scrollTop);
    };

    onScroll();
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      el.removeEventListener('scroll', onScroll);
    };
  }, [post]);

  const reactionFade = clamp01(
    (scrollY - SCROLL_REACTION_START_PX) /
      (SCROLL_REACTION_FULL_HIDE_PX - SCROLL_REACTION_START_PX),
  );

  const revealed = scrollY >= SCROLL_REVEAL_PX;

  const filteredProducts = useMemo(() => {
    if (activeCategory === 'all') {
      return FEED_DETAIL_PRODUCTS;
    }
    return FEED_DETAIL_PRODUCTS.filter(
      (p) => p.categoryId === activeCategory,
    );
  }, [activeCategory]);

  const visibleReactionCount = post
    ? Math.max(
        0,
        Math.ceil(post.reactions.length * (1 - reactionFade)),
      )
    : 0;

  const handleCarouselPrev = useCallback(() => {
    if (carouselTitles.length <= 1) {
      return;
    }
    setCarouselIndex((i) =>
      i === 0 ? carouselTitles.length - 1 : i - 1,
    );
  }, [carouselTitles.length]);

  const handleCarouselNext = useCallback(() => {
    if (carouselTitles.length <= 1) {
      return;
    }
    setCarouselIndex((i) =>
      i === carouselTitles.length - 1 ? 0 : i + 1,
    );
  }, [carouselTitles.length]);

  const openSticker = useCallback((sticker: FeedStickerHotspot) => {
    setActiveSticker(sticker);
    setStickerModalOpen(true);
  }, []);

  if (!post) {
    return (
      <div className="bg-mono-white flex min-h-full flex-col">
        <Header title="피드" showBack onBack={() => router.push('/feed')} />
        <main className="flex flex-1 flex-col items-center justify-center px-6">
          <p className="text-mono-dark-gray text-center text-sm">
            피드를 찾을 수 없어요.
          </p>
        </main>
      </div>
    );
  }

  const displayTitle =
    carouselTitles[carouselIndex] ?? post.title;

  return (
    <div className="bg-mono-white flex max-h-[100dvh] min-h-0 flex-col">
      <div className="shrink-0">
        <Header
          title="피드"
          showBack
          onBack={() => router.push('/feed')}
          rightIcons={[
            {
              kind: 'favorite',
              ariaLabel: favorite ? '즐겨찾기 해제' : '즐겨찾기',
              className: favorite
                ? '[&_svg]:fill-amber-400 [&_svg]:text-amber-400'
                : '',
              onClick: () => {
                toggleBookmark(id);
              },
            },
            {
              kind: 'share',
              ariaLabel: '공유',
              onClick: () => {
                if (typeof navigator !== 'undefined' && navigator.share) {
                  void navigator.share({
                    title: post.title,
                    url: window.location.href,
                  });
                }
              },
            },
          ]}
        />
      </div>

      <div
        ref={scrollRef}
        className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain pb-20"
      >
        <div className="border-mono-bright-gray sticky top-0 z-20 flex items-center gap-2 border-b bg-white px-3 py-3">
          <button
            type="button"
            className="flex size-9 shrink-0 items-center justify-center rounded-full text-zinc-700 hover:bg-zinc-100 disabled:opacity-30"
            aria-label="이전 제목"
            disabled={carouselTitles.length <= 1}
            onClick={handleCarouselPrev}
          >
            <ChevronLeft className="size-5" />
          </button>
          <h1 className="text-mono-jet min-w-0 flex-1 text-center text-base font-bold">
            {displayTitle}
          </h1>
          <button
            type="button"
            className="flex size-9 shrink-0 items-center justify-center rounded-full text-zinc-700 hover:bg-zinc-100 disabled:opacity-30"
            aria-label="다음 제목"
            disabled={carouselTitles.length <= 1}
            onClick={handleCarouselNext}
          >
            <ChevronRight className="size-5" />
          </button>
        </div>

        <div
          className="overflow-hidden transition-[max-height,opacity] duration-200 ease-out"
          style={{
            maxHeight: `${Math.max(0, (1 - reactionFade) * 72)}px`,
            opacity: 1 - reactionFade,
          }}
        >
          <div className="flex flex-wrap justify-center gap-2 px-4 pt-4 pb-2">
            {post.reactions.slice(0, visibleReactionCount).map((emoji) => (
              <button
                key={emoji}
                type="button"
                className="rounded-full bg-zinc-100 px-3 py-1.5 text-lg leading-none transition-colors hover:bg-zinc-200"
                aria-label={`반응 ${emoji}`}
              >
                {emoji}
              </button>
            ))}
            <button
              type="button"
              className="flex size-10 items-center justify-center rounded-full border border-dashed border-zinc-300 text-zinc-500"
              aria-label="반응 추가"
            >
              <Plus className="size-5" />
            </button>
          </div>
        </div>

        <div className="relative px-4 pt-2">
          <div
            className={cn(
              'relative aspect-[4/3] w-full overflow-hidden rounded-2xl border border-zinc-200 bg-rose-50 transition-[filter] duration-300',
              revealed && 'brightness-[0.92]',
            )}
            style={{
              backgroundImage: `
                linear-gradient(to right, rgba(244, 114, 182, 0.15) 1px, transparent 1px),
                linear-gradient(to bottom, rgba(244, 114, 182, 0.15) 1px, transparent 1px)
              `,
              backgroundSize: '24px 24px',
            }}
          >
            {revealed ? (
              <div
                className="pointer-events-none absolute inset-0 z-10 bg-zinc-900/25"
                aria-hidden
              />
            ) : null}

            <span
              className="pointer-events-none absolute left-[12%] top-[18%] text-lg opacity-60"
              aria-hidden
            >
              ♥
            </span>
            <span
              className="pointer-events-none absolute right-[15%] top-[22%] text-sm opacity-50"
              aria-hidden
            >
              ✦
            </span>
            <span
              className="pointer-events-none absolute bottom-[20%] right-[18%] text-base opacity-55"
              aria-hidden
            >
              ♥
            </span>

            {FEED_DEFAULT_STICKERS.map((sticker) => (
              <button
                key={sticker.id}
                type="button"
                className={cn(
                  'absolute z-20 flex size-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white/90 bg-white/80 text-xs font-bold shadow-md backdrop-blur-sm transition-transform active:scale-95',
                )}
                style={{
                  top: `${sticker.topPct}%`,
                  left: `${sticker.leftPct}%`,
                }}
                aria-label={`${sticker.title} 스티커 정보`}
                onClick={() => {
                  openSticker(sticker);
                }}
              >
                📎
              </button>
            ))}

            {revealed ? (
              <div className="absolute left-1/2 top-[28%] z-30 max-w-[88%] -translate-x-1/2 rounded-2xl bg-white px-4 py-3 shadow-lg">
                <p className="text-mono-jet text-center text-xs font-bold leading-relaxed">
                  이거는 이렇게 사용하면 좋아요
                </p>
              </div>
            ) : null}
          </div>
        </div>

        {!revealed ? (
          <div className="mt-6 flex flex-col items-center gap-1 px-4 text-zinc-400">
            <span className="text-xs font-medium">아래로 당겨보세요</span>
            <ChevronDown className="size-5 animate-bounce" aria-hidden />
          </div>
        ) : (
          <p className="text-mono-dark-gray mt-5 px-4 text-center text-sm font-medium">
            스티커를 클릭해 추가 정보를 얻으세요?
          </p>
        )}

        <section
          className={cn(
            'mt-6 rounded-t-3xl bg-zinc-100 px-4 pb-10 pt-6 transition-opacity duration-300',
            revealed ? 'opacity-100' : 'opacity-85',
          )}
        >
          <p className="text-mono-jet mb-3 text-sm font-bold">관련 제품</p>
          <div className="-mx-1 flex gap-2 overflow-x-auto pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {FEED_DETAIL_CHIP_BAR.map((chip) => {
              const selected = activeCategory === chip.id;
              return (
                <button
                  key={chip.id}
                  type="button"
                  className={cn(
                    'shrink-0 rounded-full px-4 py-2 text-sm font-bold transition-colors',
                    selected
                      ? 'bg-zinc-900 text-white'
                      : 'bg-white text-zinc-600 shadow-sm',
                  )}
                  onClick={() => {
                    setActiveCategory(chip.id);
                  }}
                >
                  {chip.label}
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-2 gap-3 pb-4">
            {filteredProducts.map((product) => (
              <button
                key={product.id}
                type="button"
                className="flex flex-col overflow-hidden rounded-xl border border-zinc-200/80 bg-white text-left shadow-sm"
              >
                <div
                  className="aspect-square w-full bg-zinc-50"
                  style={{
                    backgroundImage: `
                      linear-gradient(to right, rgba(0,0,0,0.04) 1px, transparent 1px),
                      linear-gradient(to bottom, rgba(0,0,0,0.04) 1px, transparent 1px)
                    `,
                    backgroundSize: '12px 12px',
                  }}
                />
                <span className="text-mono-jet p-2.5 text-xs font-bold">
                  {product.brandLabel}
                </span>
              </button>
            ))}
          </div>
        </section>
      </div>

      <Modal
        open={stickerModalOpen}
        onOpenChange={setStickerModalOpen}
        title={activeSticker?.title ?? ''}
        description={activeSticker?.tip ?? ''}
        confirmText="확인"
        showCancel={false}
        variant="success"
        hideIcon
        closeOnOverlayClick
      />
    </div>
  );
}
