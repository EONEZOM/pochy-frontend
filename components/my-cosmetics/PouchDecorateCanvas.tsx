'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { Rnd } from 'react-rnd';
import { X } from 'lucide-react';

import {
  POUCH_CANVAS_EXPORT_ID,
  type CanvasLayer,
  type CanvasRect,
} from '@/lib/pouch-canvas';
import { cn } from '@/lib/utils';

const POUCHY_SRC = '/figma/my/pouchy.svg';

type PouchDecorateCanvasProps = {
  layers: CanvasLayer[];
  onLayersChange: (layers: CanvasLayer[]) => void;
  selectedLayerId: string | null;
  onSelectLayer: (id: string | null) => void;
  backgroundImageUrl?: string | null;
  readOnly?: boolean;
};

export function PouchDecorateCanvas({
  layers,
  onLayersChange,
  selectedLayerId,
  onSelectLayer,
  backgroundImageUrl,
  readOnly = false,
}: PouchDecorateCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
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

  return (
    <div
      id={POUCH_CANVAS_EXPORT_ID}
      ref={containerRef}
      className="relative mx-auto aspect-[320/460] h-full max-h-full w-full max-w-[320px] bg-transparent"
      onClick={() => {
        if (!readOnly) {
          onSelectLayer(null);
        }
      }}
    >
      {backgroundImageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={backgroundImageUrl}
          alt=""
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
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={layer.src}
                alt=""
                className="h-full w-full object-contain drop-shadow-md"
              />
            </div>
          );
        }

        return (
          <Rnd
            key={layer.id}
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
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={layer.src}
              alt=""
              className="h-full w-full object-contain drop-shadow-md"
              draggable={false}
            />
            {isSelected ? (
              <button
                type="button"
                className="absolute -top-2 -right-2 flex size-5 items-center justify-center rounded-full bg-black/60 text-white"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemoveLayer(layer.id);
                }}
                aria-label={'\uC2A4\uD2F0\uCEE4 \uC81C\uAC70'}
              >
                <X size={12} />
              </button>
            ) : null}
          </Rnd>
        );
      })}
    </div>
  );
}
