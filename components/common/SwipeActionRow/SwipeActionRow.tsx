'use client';

import {
  useCallback,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react';

import { cn } from '@/lib/utils';

const ACTION_WIDTH_PX = 96;
const SWIPE_OPEN_THRESHOLD_PX = 40;
const SWIPE_AXIS_LOCK_PX = 8;
const SUPPRESS_CLICK_MS = 400;

export type SwipeAction = {
  key: string;
  label: string;
  onClick: () => void;
  tone?: 'default' | 'danger';
};

type SwipeActionRowProps = {
  rowId: string | number;
  children: ReactNode;
  actions: SwipeAction[];
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  className?: string;
};

export const SwipeActionRow = ({
  rowId,
  children,
  actions,
  isOpen,
  onOpenChange,
  className,
}: SwipeActionRowProps) => {
  const actionsWidth = actions.length * ACTION_WIDTH_PX;
  const maxOffset = actionsWidth;

  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const pointerStartRef = useRef<{ x: number; y: number } | null>(null);
  const offsetStartRef = useRef(0);
  const axisLockedRef = useRef<'none' | 'horizontal' | 'vertical'>('none');
  const dragOffsetRef = useRef(0);
  const didHorizontalDragRef = useRef(false);
  const suppressClickRef = useRef(false);
  const suppressClickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  const snapOffset = isOpen ? maxOffset : 0;
  const displayOffset = isDragging ? dragOffset : snapOffset;

  const closeRow = useCallback(() => {
    onOpenChange(false);
    setDragOffset(0);
    dragOffsetRef.current = 0;
  }, [onOpenChange]);

  const openRow = useCallback(() => {
    onOpenChange(true);
    setDragOffset(maxOffset);
    dragOffsetRef.current = maxOffset;
  }, [maxOffset, onOpenChange]);

  const scheduleSuppressClick = useCallback(() => {
    suppressClickRef.current = true;
    if (suppressClickTimerRef.current != null) {
      clearTimeout(suppressClickTimerRef.current);
    }
    suppressClickTimerRef.current = setTimeout(() => {
      suppressClickRef.current = false;
      suppressClickTimerRef.current = null;
    }, SUPPRESS_CLICK_MS);
  }, []);

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) {
      return;
    }
    pointerStartRef.current = { x: event.clientX, y: event.clientY };
    offsetStartRef.current = isOpen ? maxOffset : dragOffsetRef.current;
    axisLockedRef.current = 'none';
    didHorizontalDragRef.current = false;
    setIsDragging(false);
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const start = pointerStartRef.current;
    if (!start) {
      return;
    }

    const deltaX = event.clientX - start.x;
    const deltaY = event.clientY - start.y;

    if (axisLockedRef.current === 'none') {
      if (
        Math.abs(deltaX) < SWIPE_AXIS_LOCK_PX &&
        Math.abs(deltaY) < SWIPE_AXIS_LOCK_PX
      ) {
        return;
      }
      axisLockedRef.current =
        Math.abs(deltaX) > Math.abs(deltaY) ? 'horizontal' : 'vertical';
    }

    if (axisLockedRef.current === 'vertical') {
      return;
    }

    didHorizontalDragRef.current = true;

    if (!event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.setPointerCapture(event.pointerId);
    }

    if (event.cancelable) {
      event.preventDefault();
    }

    setIsDragging(true);
    const next = Math.min(
      maxOffset,
      Math.max(0, offsetStartRef.current - deltaX),
    );
    dragOffsetRef.current = next;
    setDragOffset(next);
  };

  const finishPointer = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    const wasHorizontal = axisLockedRef.current === 'horizontal';
    const finalOffset = dragOffsetRef.current;
    pointerStartRef.current = null;
    axisLockedRef.current = 'none';
    setIsDragging(false);

    if (!wasHorizontal || !didHorizontalDragRef.current) {
      return;
    }

    scheduleSuppressClick();

    const shouldOpen = finalOffset >= SWIPE_OPEN_THRESHOLD_PX;
    if (shouldOpen) {
      openRow();
    } else {
      closeRow();
    }
  };

  const handleForegroundClick = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    if (isOpen) {
      closeRow();
    }
  };

  return (
    <div
      data-swipe-row-id={rowId}
      className={cn(
        'relative overflow-hidden touch-manipulation [touch-action:pan-y]',
        className,
      )}
    >
      <div
        className="absolute inset-y-0 right-0 flex h-full min-h-full"
        style={{ width: actionsWidth }}
        aria-hidden={displayOffset === 0}
      >
        {actions.map((action) => (
          <button
            key={action.key}
            type="button"
            className={cn(
              'flex h-full min-h-[96px] w-full min-w-0 flex-1 items-center justify-center px-2 text-sm font-bold text-white touch-manipulation active:opacity-90',
              action.tone === 'danger' ? 'bg-[#FF4D4F]' : 'bg-[#9E9E9E]',
            )}
            style={{ width: ACTION_WIDTH_PX, flexBasis: ACTION_WIDTH_PX }}
            onClick={(event) => {
              event.stopPropagation();
              closeRow();
              action.onClick();
            }}
          >
            {action.label}
          </button>
        ))}
      </div>

      <div
        className={cn(
          'relative z-10 min-h-[96px] touch-manipulation bg-white select-none',
          !isDragging && 'transition-transform duration-200 ease-out',
        )}
        style={{ transform: `translateX(-${displayOffset}px)` }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={finishPointer}
        onPointerCancel={finishPointer}
        onClick={handleForegroundClick}
      >
        {children}
      </div>
    </div>
  );
};
