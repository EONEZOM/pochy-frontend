'use client';

import { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight, Pencil, Plus, Share2 } from 'lucide-react';

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
import { cn } from '@/lib/utils';

type MyCosmeticsPouchHomeProps = {
  pouches: PouchDto[];
};

export function MyCosmeticsPouchHome({ pouches }: MyCosmeticsPouchHomeProps) {
  const router = useRouter();
  const [api, setApi] = useState<CarouselApi>();
  const [currentIndex, setCurrentIndex] = useState(0);

  const total = pouches.length;
  const currentPouch = pouches[currentIndex];
  const pouchId = currentPouch?.pouchId;
  const pouchName = currentPouch?.name?.trim() ?? '\uC0C8 \uD30C\uC6B0\uCE58';
  const onSelect = useCallback(() => {
    if (!api) {
      return;
    }
    setCurrentIndex(api.selectedScrollSnap());
  }, [api]);

  useEffect(() => {
    if (!api) {
      return;
    }
    api.on('select', onSelect);
    api.on('reInit', onSelect);
    return () => {
      api.off('select', onSelect);
      api.off('reInit', onSelect);
    };
  }, [api, onSelect]);

  if (pouchId == null) {
    return null;
  }

  return (
    <div
      className="relative flex min-h-[calc(100vh-8rem)] flex-col"
      style={{
        background:
          'linear-gradient(180deg, rgba(255,255,255,1) 31%, rgba(255,198,236,1) 100%)',
      }}
    >
      <div className="flex flex-1 flex-col items-center px-5 pt-4 pb-32">
        <div className="mb-4 rounded-lg bg-white px-2 py-1.5 shadow-sm">
          <span className="text-mono-jet text-base font-bold">{pouchName}</span>
        </div>

        <div className="relative flex w-full max-w-[360px] items-center justify-center gap-2">
          <button
            type="button"
            className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white/80 shadow-sm"
            aria-label="\uC774\uC804 \uD30C\uC6B0\uCE58"
            onClick={() => api?.scrollPrev()}
          >
            <ChevronLeft className="size-5" />
          </button>

          <Carousel setApi={setApi} className="w-full max-w-[280px]">
            <CarouselContent>
              {pouches.map((pouch) => {
                const id = pouch.pouchId;
                if (id == null) {
                  return null;
                }
                const name = pouch.name?.trim() ?? '';
                const href = buildPouchDetailPath(id, name);
                return (
                  <CarouselItem key={id}>
                    <Link
                      href={href}
                      className="flex min-h-[320px] items-center justify-center"
                    >
                      {pouch.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={pouch.imageUrl}
                          alt={name}
                          className="max-h-[min(48vh,380px)] w-auto max-w-full object-contain"
                        />
                      ) : (
                        <Image
                          src="/figma/my/pouchy.svg"
                          alt=""
                          width={220}
                          height={320}
                          unoptimized
                          className="h-auto max-h-[380px] w-auto object-contain opacity-70"
                        />
                      )}
                    </Link>
                  </CarouselItem>
                );
              })}
            </CarouselContent>
          </Carousel>

          <button
            type="button"
            className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white/80 shadow-sm"
            aria-label="\uB2E4\uC74C \uD30C\uC6B0\uCE58"
            onClick={() => api?.scrollNext()}
          >
            <ChevronRight className="size-5" />
          </button>
        </div>

        <p className="text-mono-jet mt-3 text-[9px] font-bold">
          {currentIndex + 1}|{total}
        </p>
      </div>

      <div className="fixed bottom-20 left-1/2 z-30 flex w-full max-w-[280px] -translate-x-1/2 items-center justify-center gap-2 px-4">
        <button
          type="button"
          className="flex size-14 items-center justify-center rounded-full bg-[#DCDCDC] shadow-md"
          aria-label="\uC218\uC815"
          onClick={() => {
            router.push(buildPouchEditItemsPath(pouchId, pouchName));
          }}
        >
          <Pencil className="size-4 text-[#161618]" />
        </button>
        <button
          type="button"
          className="flex size-14 items-center justify-center rounded-full bg-[#FF93DB] shadow-md"
          aria-label="\uD30C\uC6B0\uCE58 \uC0DD\uC131"
          onClick={() => {
            router.push('/my-cosmetics/create');
          }}
        >
          <Plus className="size-5 text-[#161618]" />
        </button>
        <button
          type="button"
          className={cn(
            'flex size-14 items-center justify-center rounded-full bg-[#DCDCDC] shadow-md',
          )}
          aria-label="\uACF5\uC720"
          onClick={() => {
            router.push(buildPouchSharePath(pouchId, pouchName));
          }}
        >
          <Share2 className="size-4 text-[#161618]" />
        </button>
      </div>
    </div>
  );
}
