import { useCallback, useRef, useState } from 'react';

/**
 * 가로 스크롤 컨테이너를 마우스로 드래그해 이동합니다.
 * `mousemove` / `mouseup`은 `document`에 붙여 컨테이너 밖으로 포인터가 나가도 동작합니다.
 */
export const useDragScroll = () => {
  const elementRef = useRef<HTMLDivElement | null>(null);

  const setRef = useCallback((node: HTMLDivElement | null) => {
    elementRef.current = node;
  }, []);

  const movedRef = useRef(0);
  const cleanupRef = useRef<(() => void) | null>(null);
  const [isDrag, setIsDrag] = useState(false);

  const onDragStart = useCallback((e: React.MouseEvent) => {
    const el = elementRef.current;
    if (!el || e.button !== 0) {
      return;
    }

    cleanupRef.current?.();
    const startX = e.clientX;
    const startScroll = el.scrollLeft;
    movedRef.current = 0;
    setIsDrag(true);

    const onMove = (moveEvent: MouseEvent) => {
      const dx = moveEvent.clientX - startX;
      movedRef.current = Math.max(movedRef.current, Math.abs(dx));
      el.scrollLeft = startScroll - dx;
    };

    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      cleanupRef.current = null;
      setIsDrag(false);
    };

    cleanupRef.current = onUp;
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, []);

  const checkIsClickForbidden = useCallback(() => {
    return movedRef.current > 5;
  }, []);

  return {
    registerRef: setRef,
    onDragStart,
    isDrag,
    checkIsClickForbidden,
  };
};
