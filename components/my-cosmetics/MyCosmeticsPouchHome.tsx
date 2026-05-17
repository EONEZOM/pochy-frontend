'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight, Plus, Share2, SquarePen } from 'lucide-react';

import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from '@/components/ui/carousel';
import type { PouchDto } from '@/api/model';
import {
  buildPouchDetailPath,
  buildPouchEditItemsPath,
  buildPouchSharePath,
} from '@/lib/pouch-setup';
import { resolveMediaUrl } from '@/lib/resolve-media-url';
import { resolveDisplayImageSrc } from '@/lib/next-image-src';
import { cn } from '@/lib/utils';

const POUCH_HOME_GRADIENT =
  'linear-gradient(180deg, rgba(255, 255, 255, 1) 31%, rgba(255, 198, 236, 1) 100%)';

const POUCH_TOUCH_OVERLAY_SRC = '/figma/my/touch.svg';

const actionIconClass = 'size-5 text-[#161618]';

const arrowButtonClass =
  'flex size-10 shrink-0 items-center justify-center rounded-full bg-white shadow-sm transition-opacity disabled:pointer-events-none disabled:opacity-35';

const actionButtonBaseClass =
  'flex size-14 items-center justify-center rounded-full shadow-md';

type MyCosmeticsPouchHomeProps = {
  pouches: PouchDto[];
};

export function MyCosmeticsPouchHome({ pouches }: MyCosmeticsPouchHomeProps) {
  const router = useRouter();
  const [api, setApi] = useState<CarouselApi>();
  const [currentIndex, setCurrentIndex] = useState(0);

  const total = pouches.length;
  const canScrollPrev = currentIndex > 0;
  const canScrollNext = currentIndex < total - 1;
  const currentPouch = pouches[currentIndex];
  const pouchId = currentPouch?.pouchId;
  const pouchName = currentPouch?.name?.trim() ?? '새 파우치';

  useEffect(() => {
    if (!api) {
      return;
    }
    const onSelect = () => {
      setCurrentIndex(api.selectedScrollSnap());
    };
    api.on('select', onSelect);
    api.on('reInit', onSelect);
    return () => {
      api.off('select', onSelect);
      api.off('reInit', onSelect);
    };
  }, [api]);

  if (pouchId == null) {
    return null;
  }

  return (
    <div
      className={cn(
        'pointer-events-auto fixed top-0 bottom-14 left-1/2 z-0 flex w-full max-w-120 min-w-90 -translate-x-1/2 flex-col',
        'pt-[var(--safe-area-top)]',
      )}
      style={{ background: POUCH_HOME_GRADIENT }}
    >
      <div className="relative z-10 flex min-h-full flex-1 flex-col items-center justify-center px-5">
        <div className="rounded-lg bg-white px-2 py-1.5">
          <span className="text-mono-jet text-base font-bold">{pouchName}</span>
        </div>

        <div className="relative flex w-full items-center justify-center gap-2">
          <button
            type="button"
            className={arrowButtonClass}
            aria-label={'이전 파우치'}
            disabled={!canScrollPrev}
            onClick={() => api?.scrollPrev()}
          >
            <ChevronLeft className="size-5 text-[#161618]" />
          </button>

          <Carousel setApi={setApi} className="min-w-0 flex-1">
            <CarouselContent className="ml-0">
              {pouches.map((pouch) => {
                const id = pouch.pouchId;
                if (id == null) {
                  return null;
                }
                const name = pouch.name?.trim() ?? '';
                const href = buildPouchDetailPath(id, name);
                return (
                  <CarouselItem
                    key={id}
                    className="flex items-center justify-center pl-0"
                  >
                    <Link
                      href={href}
                      className="flex w-full items-center justify-center"
                    >
                      <div className="relative mx-auto flex max-h-[min(42vh,360px)] w-full max-w-[280px] items-center justify-center">
                        {pouch.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={resolveDisplayImageSrc(
                              resolveMediaUrl(pouch.imageUrl),
                            )}
                            alt={name}
                            className="mx-auto block h-auto max-h-full w-auto max-w-full object-contain"
                          />
                        ) : (
                          <Image
                            src="/figma/my/pouchy.svg"
                            alt=""
                            width={220}
                            height={320}
                            unoptimized
                            className="mx-auto h-auto max-h-full w-auto max-w-full object-contain opacity-70"
                          />
                        )}
                        <Image
                          src={POUCH_TOUCH_OVERLAY_SRC}
                          alt=""
                          width={36}
                          height={46}
                          unoptimized
                          className="pointer-events-none absolute top-1/2 left-1/2 z-10 -translate-x-1/2 -translate-y-1/2"
                        />
                      </div>
                    </Link>
                  </CarouselItem>
                );
              })}
            </CarouselContent>
          </Carousel>

          <button
            type="button"
            className={arrowButtonClass}
            aria-label={'다음 파우치'}
            disabled={!canScrollNext}
            onClick={() => api?.scrollNext()}
          >
            <ChevronRight className="size-5 text-[#161618]" />
          </button>
        </div>

        <div
          className="mt-3 flex h-4 min-w-[68px] items-center justify-center rounded-full bg-[#161618] px-6 py-1"
          aria-live="polite"
        >
          <span className="text-[10px] font-bold text-white">
            {currentIndex + 1} | {total}
          </span>
        </div>

        <div className="mt-10 flex items-center justify-center gap-2">
          <button
            type="button"
            className={cn(actionButtonBaseClass, 'bg-white')}
            aria-label={'파우치 수정'}
            onClick={() => {
              router.push(buildPouchEditItemsPath(pouchId, pouchName));
            }}
          >
            <SquarePen className={actionIconClass} strokeWidth={2} />
          </button>
          <button
            type="button"
            className={cn(actionButtonBaseClass, 'bg-[#FF60CA]')}
            aria-label={'파우치 추가'}
            onClick={() => {
              router.push('/my-cosmetics/create');
            }}
          >
            <Plus className="size-6 text-white" strokeWidth={2.5} />
          </button>
          <button
            type="button"
            className={cn(actionButtonBaseClass, 'bg-white')}
            aria-label={'파우치 공유'}
            onClick={() => {
              router.push(buildPouchSharePath(pouchId, pouchName));
            }}
          >
            <Share2 className={actionIconClass} strokeWidth={2} />
          </button>
        </div>
      </div>
    </div>
  );
}
