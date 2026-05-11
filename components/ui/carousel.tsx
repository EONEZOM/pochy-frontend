'use client';

import * as React from 'react';
import useEmblaCarousel, {
  type UseEmblaCarouselType,
} from 'embla-carousel-react';

import Image from 'next/image';

import { cn } from '@/lib/utils';

const carouselControlBaseClass =
  'z-10 inline-flex items-center justify-center rounded-full border-0 bg-transparent p-0 text-zinc-900 shadow-none outline-none ring-0 transition-colors hover:bg-zinc-100/80 active:bg-zinc-100 disabled:pointer-events-none disabled:opacity-35 touch-manipulation focus-visible:ring-2 focus-visible:ring-zinc-400/40 focus-visible:ring-offset-2 [&_img]:pointer-events-none [&_img]:size-6 [&_img]:shrink-0 [&_img]:object-contain';

/** `variant` / `size`는 이전 Button API 호환용으로만 받고 DOM에는 전달하지 않습니다. */
type CarouselControlProps = Omit<React.ComponentProps<'button'>, 'type'> & {
  type?: 'button' | 'submit' | 'reset';
  variant?: string;
  size?: string;
};

type CarouselApi = UseEmblaCarouselType[1];
type UseCarouselParameters = Parameters<typeof useEmblaCarousel>;
type CarouselOptions = UseCarouselParameters[0];
type CarouselPlugin = UseCarouselParameters[1];

type CarouselProps = {
  opts?: CarouselOptions;
  plugins?: CarouselPlugin;
  orientation?: 'horizontal' | 'vertical';
  setApi?: (api: CarouselApi) => void;
};

type CarouselContextProps = {
  carouselRef: ReturnType<typeof useEmblaCarousel>[0];
  api: ReturnType<typeof useEmblaCarousel>[1];
  scrollPrev: () => void;
  scrollNext: () => void;
  canScrollPrev: boolean;
  canScrollNext: boolean;
} & CarouselProps;

const CarouselContext = React.createContext<CarouselContextProps | null>(null);

function useCarousel() {
  const context = React.useContext(CarouselContext);

  if (!context) {
    throw new Error('useCarousel must be used within a <Carousel />');
  }

  return context;
}

function Carousel({
  orientation = 'horizontal',
  opts,
  setApi,
  plugins,
  className,
  children,
  ...props
}: React.ComponentProps<'div'> & CarouselProps) {
  const [carouselRef, api] = useEmblaCarousel(
    {
      ...opts,
      axis: orientation === 'horizontal' ? 'x' : 'y',
    },
    plugins,
  );
  const [canScrollPrev, setCanScrollPrev] = React.useState(false);
  const [canScrollNext, setCanScrollNext] = React.useState(false);

  const onSelect = React.useCallback((api: CarouselApi) => {
    if (!api) return;
    setCanScrollPrev(api.canScrollPrev());
    setCanScrollNext(api.canScrollNext());
  }, []);

  const scrollPrev = React.useCallback(() => {
    api?.scrollPrev();
  }, [api]);

  const scrollNext = React.useCallback(() => {
    api?.scrollNext();
  }, [api]);

  const handleKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        scrollPrev();
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        scrollNext();
      }
    },
    [scrollPrev, scrollNext],
  );

  React.useEffect(() => {
    if (!api || !setApi) return;
    setApi(api);
  }, [api, setApi]);

  React.useEffect(() => {
    if (!api) return;
    const sync = () => {
      onSelect(api);
    };
    queueMicrotask(sync);
    api.on('reInit', onSelect);
    api.on('select', onSelect);

    return () => {
      api.off('reInit', onSelect);
      api.off('select', onSelect);
    };
  }, [api, onSelect]);

  return (
    <CarouselContext.Provider
      value={{
        carouselRef,
        api: api,
        opts,
        orientation:
          orientation || (opts?.axis === 'y' ? 'vertical' : 'horizontal'),
        scrollPrev,
        scrollNext,
        canScrollPrev,
        canScrollNext,
      }}
    >
      <div
        onKeyDownCapture={handleKeyDown}
        className={cn('relative', className)}
        role="region"
        aria-roledescription="carousel"
        data-slot="carousel"
        {...props}
      >
        {children}
      </div>
    </CarouselContext.Provider>
  );
}

function CarouselContent({ className, ...props }: React.ComponentProps<'div'>) {
  const { carouselRef, orientation } = useCarousel();

  return (
    <div
      ref={carouselRef}
      className="overflow-hidden"
      data-slot="carousel-content"
    >
      <div
        className={cn(
          'flex',
          orientation === 'horizontal' ? '-ml-4' : '-mt-4 flex-col',
          className,
        )}
        {...props}
      />
    </div>
  );
}

function CarouselItem({ className, ...props }: React.ComponentProps<'div'>) {
  const { orientation } = useCarousel();

  return (
    <div
      role="group"
      aria-roledescription="slide"
      data-slot="carousel-item"
      className={cn(
        'min-w-0 shrink-0 grow-0 basis-full',
        orientation === 'horizontal' ? 'pl-4' : 'pt-4',
        className,
      )}
      {...props}
    />
  );
}

function CarouselPrevious({
  className,
  variant,
  size,
  onMouseDown,
  onPointerDown,
  disabled,
  onClick,
  ...props
}: CarouselControlProps) {
  void variant;
  void size;
  const { orientation, scrollPrev, canScrollPrev } = useCarousel();

  return (
    <button
      type="button"
      data-slot="carousel-previous"
      {...props}
      disabled={Boolean(disabled) || !canScrollPrev}
      className={cn(
        'absolute',
        carouselControlBaseClass,
        orientation === 'horizontal'
          ? 'top-1/2 -left-12 -translate-y-1/2'
          : '-top-12 left-1/2 -translate-x-1/2 rotate-90',
        className,
      )}
      onClick={(e) => {
        onClick?.(e);
        scrollPrev();
      }}
      onMouseDown={(e) => {
        onMouseDown?.(e);
        e.preventDefault();
      }}
      onPointerDown={(e) => {
        onPointerDown?.(e);
        e.preventDefault();
      }}
    >
      <Image
        src="/icons/Alt%20Arrow%20Left.svg"
        alt=""
        width={24}
        height={24}
        unoptimized
        className="pointer-events-none size-6 shrink-0 object-contain"
        aria-hidden
      />
      <span className="sr-only">Previous slide</span>
    </button>
  );
}

function CarouselNext({
  className,
  variant,
  size,
  onMouseDown,
  onPointerDown,
  disabled,
  onClick,
  ...props
}: CarouselControlProps) {
  void variant;
  void size;
  const { orientation, scrollNext, canScrollNext } = useCarousel();

  return (
    <button
      type="button"
      data-slot="carousel-next"
      {...props}
      disabled={Boolean(disabled) || !canScrollNext}
      className={cn(
        'absolute',
        carouselControlBaseClass,
        orientation === 'horizontal'
          ? 'top-1/2 -right-12 -translate-y-1/2'
          : '-bottom-12 left-1/2 -translate-x-1/2 rotate-90',
        className,
      )}
      onClick={(e) => {
        onClick?.(e);
        scrollNext();
      }}
      onMouseDown={(e) => {
        onMouseDown?.(e);
        e.preventDefault();
      }}
      onPointerDown={(e) => {
        onPointerDown?.(e);
        e.preventDefault();
      }}
    >
      <Image
        src="/icons/Alt%20Arrow%20Right.svg"
        alt=""
        width={24}
        height={24}
        unoptimized
        className="pointer-events-none size-6 shrink-0 object-contain"
        aria-hidden
      />
      <span className="sr-only">Next slide</span>
    </button>
  );
}

export {
  type CarouselApi,
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
  useCarousel,
};
