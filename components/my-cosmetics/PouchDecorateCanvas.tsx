'use client';

import { forwardRef, useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { Rnd } from 'react-rnd';
import { RotateCw, X } from 'lucide-react';

import {
  COSMETIC_STICKER_IMAGE_FILTER,
  POUCH_CANVAS_EXPORT_ID,
  type CanvasLayer,
  type CanvasRect,
} from '@/lib/pouch-canvas';
import { resolveLayerImageSrc, toSameOriginImageProxyUrl } from '@/lib/next-image-src';
import { resolveMediaUrl } from '@/lib/resolve-media-url';
import { cn } from '@/lib/utils';

const POUCHY_SRC = '/figma/my/pouchy.svg';
const POUCH_LAYER_CONTROL_CLASS = 'pouch-layer-control';
/** ?�이????��·?�전 컨트�??�치 ?�역 (px) */
const POUCH_LAYER_CONTROL_TOUCH_PX = 30;
const RND_DRAG_CANCEL_SELECTOR = `.${POUCH_LAYER_CONTROL_CLASS}, .${POUCH_LAYER_CONTROL_CLASS} *`;
const POUCH_LAYER_CONTROL_TOUCH_CLASS = 'size-[30px]';

type PouchDecorateCanvasProps = {
  layers: CanvasLayer[];
  onLayersChange: (layers: CanvasLayer[]) => void;
  selectedLayerId: string | null;
  onSelectLayer: (id: string | null) => void;
  backgroundImageUrl?: string | null;
  readOnly?: boolean;
};

const getPointerAngleDeg = (
  clientX: number,
  clientY: number,
  centerX: number,
  centerY: number,
) => {
  return (Math.atan2(clientY - centerY, clientX - centerX) * 180) / Math.PI;
};

const getLayerScreenCenter = (
  layer: CanvasLayer,
  containerEl: HTMLElement,
) => {
  const containerRect = containerEl.getBoundingClientRect();
  return {
    x: containerRect.left + layer.x + layer.width / 2,
    y: containerRect.top + layer.y + layer.height / 2,
  };
};

type LayerRotationHandleProps = {
  layer: CanvasLayer;
  containerRef: React.RefObject<HTMLDivElement | null>;
  onRotate: (rotation: number) => void;
};

const LayerRotationHandle = ({
  layer,
  containerRef,
  onRotate,
}: LayerRotationHandleProps) => {
  const dragStateRef = useRef<{
    startAngle: number;
    startRotation: number;
  } | null>(null);

  const handlePointerDown = (event: React.PointerEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    event.preventDefault();

    const containerEl = containerRef.current;
    if (!containerEl) {
      return;
    }

    const center = getLayerScreenCenter(layer, containerEl);
    dragStateRef.current = {
      startAngle: getPointerAngleDeg(event.clientX, event.clientY, center.x, center.y),
      startRotation: layer.rotation ?? 0,
    };

    const handleEl = event.currentTarget;
    handleEl.setPointerCapture(event.pointerId);

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const dragState = dragStateRef.current;
      const container = containerRef.current;
      if (!dragState || !container) {
        return;
      }

      const moveCenter = getLayerScreenCenter(layer, container);
      const currentAngle = getPointerAngleDeg(
        moveEvent.clientX,
        moveEvent.clientY,
        moveCenter.x,
        moveCenter.y,
      );
      const delta = currentAngle - dragState.startAngle;
      onRotate(dragState.startRotation + delta);
    };

    const handlePointerUp = (upEvent: PointerEvent) => {
      dragStateRef.current = null;
      if (handleEl.hasPointerCapture(upEvent.pointerId)) {
        handleEl.releasePointerCapture(upEvent.pointerId);
      }
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);
  };

  return (
    <button
      type="button"
      className={cn(
        POUCH_LAYER_CONTROL_CLASS,
        POUCH_LAYER_CONTROL_TOUCH_CLASS,
        'absolute -top-10 left-1/2 z-20 flex -translate-x-1/2 touch-none items-center justify-center rounded-full bg-black/60 text-white touch-manipulation',
      )}
      style={{ touchAction: 'none' }}
      onPointerDown={handlePointerDown}
      onClick={(e) => {
        e.stopPropagation();
      }}
      aria-label={'?�전'}
    >
      <RotateCw size={12} />
    </button>
  );
};

type LayerImageProps = {
  layer: CanvasLayer;
};

const LayerImage = ({ layer }: LayerImageProps) => {
  const rotation = layer.rotation ?? 0;
  const imageSrc = resolveLayerImageSrc(resolveMediaUrl(layer.src));
  const isCosmeticSticker = layer.kind === 'cosmetic';

  return (
    <div
      className="h-full w-full"
      style={{
        transform: `rotate(${rotation}deg)`,
        transformOrigin: 'center center',
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={imageSrc}
        alt=""
        crossOrigin="anonymous"
        className={cn(
          'h-full w-full object-contain',
          !isCosmeticSticker && 'drop-shadow-md',
        )}
        style={
          isCosmeticSticker
            ? { filter: COSMETIC_STICKER_IMAGE_FILTER }
            : undefined
        }
        draggable={false}
      />
    </div>
  );
};

export const PouchDecorateCanvas = forwardRef<
  HTMLDivElement,
  PouchDecorateCanvasProps
>(function PouchDecorateCanvas(
  {
    layers,
    onLayersChange,
    selectedLayerId,
    onSelectLayer,
    backgroundImageUrl,
    readOnly = false,
  },
  exportRootRef,
) {
  const containerRef = useRef<HTMLDivElement>(null);

  const handleContainerRef = useCallback(
    (el: HTMLDivElement | null) => {
      containerRef.current = el;
      if (exportRootRef && typeof exportRootRef === 'object') {
        exportRootRef.current = el;
      }
    },
    [exportRootRef],
  );

  const [, setCanvasRect] = useState<CanvasRect>({
    width: 320,
    height: 460,
  });

  const measureCanvas = useCallback(() => {
    const el = containerRef.current;
    if (!el) {
      return;
    }
    const { width, height } = el.getBoundingClientRect();
    if (width > 0 && height > 0) {
      setCanvasRect({ width, height });
    }
  }, []);

  useEffect(() => {
    measureCanvas();
    const el = containerRef.current;
    if (!el || typeof ResizeObserver === 'undefined') {
      return;
    }
    const observer = new ResizeObserver(() => {
      measureCanvas();
    });
    observer.observe(el);
    return () => {
      observer.disconnect();
    };
  }, [measureCanvas]);

  const handleUpdateLayer = (id: string, patch: Partial<CanvasLayer>) => {
    onLayersChange(
      layers.map((layer) => (layer.id === id ? { ...layer, ...patch } : layer)),
    );
  };

  const handleRemoveLayer = (id: string) => {
    onLayersChange(layers.filter((layer) => layer.id !== id));
    if (selectedLayerId === id) {
      onSelectLayer(null);
    }
  };

  const sortedLayers = [...layers].sort((a, b) => a.zIndex - b.zIndex);
  const resolvedBackgroundUrl = backgroundImageUrl
    ? toSameOriginImageProxyUrl(resolveMediaUrl(backgroundImageUrl))
    : null;

  return (
    <div
      id={POUCH_CANVAS_EXPORT_ID}
      ref={handleContainerRef}
      className="relative mx-auto aspect-[320/460] h-full max-h-full w-full max-w-[320px] bg-transparent"
      onClick={() => {
        if (!readOnly) {
          onSelectLayer(null);
        }
      }}
    >
      {resolvedBackgroundUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={resolvedBackgroundUrl}
          alt=""
          crossOrigin="anonymous"
          className="pointer-events-none absolute inset-0 h-full w-full object-contain"
        />
      ) : (
        <Image
          src={POUCHY_SRC}
          alt=""
          fill
          unoptimized
          className="pointer-events-none object-contain"
          priority
        />
      )}

      {sortedLayers.map((layer) => {
        const isSelected = selectedLayerId === layer.id;

        if (readOnly) {
          return (
            <div
              key={layer.id}
              className="pointer-events-none absolute"
              style={{
                left: layer.x,
                top: layer.y,
                width: layer.width,
                height: layer.height,
                zIndex: layer.zIndex,
              }}
            >
              <LayerImage layer={layer} />
            </div>
          );
        }

        return (
          <Rnd
            key={layer.id}
            cancel={RND_DRAG_CANCEL_SELECTOR}
            size={{ width: layer.width, height: layer.height }}
            position={{ x: layer.x, y: layer.y }}
            bounds="parent"
            onDragStop={(_e, data) => {
              handleUpdateLayer(layer.id, { x: data.x, y: data.y });
            }}
            onResizeStop={(_e, _dir, ref, _delta, position) => {
              handleUpdateLayer(layer.id, {
                width: ref.offsetWidth,
                height: ref.offsetHeight,
                x: position.x,
                y: position.y,
              });
            }}
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation();
              onSelectLayer(layer.id);
            }}
            style={{ zIndex: layer.zIndex }}
            className={cn(
              'group',
              isSelected && 'ring-2 ring-[#FF60CA] ring-offset-1',
            )}
          >
            <LayerImage layer={layer} />
            {isSelected ? (
              <>
                <button
                  type="button"
                  className={cn(
                    POUCH_LAYER_CONTROL_CLASS,
                    POUCH_LAYER_CONTROL_TOUCH_CLASS,
                    'absolute -top-4 -right-4 z-20 flex items-center justify-center rounded-full bg-black/60 text-white touch-manipulation',
                  )}
                  onPointerDown={(e) => {
                    e.stopPropagation();
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveLayer(layer.id);
                  }}
                  aria-label={'?�티�??�거'}
                >
                  <X size={14} />
                </button>
                <LayerRotationHandle
                  layer={layer}
                  containerRef={containerRef}
                  onRotate={(rotation) => {
                    handleUpdateLayer(layer.id, { rotation });
                  }}
                />
              </>
            ) : null}
          </Rnd>
        );
      })}
    </div>
  );
});

PouchDecorateCanvas.displayName = 'PouchDecorateCanvas';
