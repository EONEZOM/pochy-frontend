import { useCallback, useRef, useState } from 'react';

/**
 * 마우스 드래그를 통한 가로 스크롤 기능을 제공하는 훅
 * ESLint의 'react-hooks/refs' 에러를 방지하기 위해 Callback Ref 패턴 사용
 * 불필요한 리렌더링을 방지하기 위해 계산용 변수는 useRef로 관리
 */
export function useDragScroll() {
  // DOM 노드를 참조하기 위한 내부 Ref
  const elementRef = useRef<HTMLDivElement | null>(null);

  // 렌더링과 무관한 계산용 변수 (Ref를 사용하여 스크롤 시 리렌더링 방지)
  const startXRef = useRef(0);
  const scrollLeftRef = useRef(0);
  // 드래그 거리 측정용
  const movedRef = useRef(0);

  // UI 업데이트가 필요한 상태만 useState 사용 (커서 모양 변경 등)
  const [isDrag, setIsDrag] = useState(false);

  /**
   * Callback Ref: 렌더링 중에 .current에 직접 접근하는 것을 피하기 위해 함수 형태로 전달합니다.
   * 이는 ESLint의 'Cannot access refs during render' 경고를 해결하는 정석적인 방법입니다.
   */
  const setRef = useCallback((node: HTMLDivElement | null) => {
    elementRef.current = node;
  }, []);

  // 드래그 시작 핸들러
  const onDragStart = useCallback((e: React.MouseEvent) => {
    const el = elementRef.current;
    if (!el) return;

    setIsDrag(true);
    // 현재 마우스 위치와 스크롤 위치 기록
    startXRef.current = e.pageX - el.offsetLeft;
    scrollLeftRef.current = el.scrollLeft;
    movedRef.current = 0;
  }, []);

  // 드래그 중 핸들러 (마우스 이동 시마다 실행됨)
  const onDragMove = useCallback(
    (e: React.MouseEvent) => {
      const el = elementRef.current;
      if (!isDrag || !el) return;

      e.preventDefault();
      // 이동 거리 계산 (1.5배 가속 적용)
      const x = e.pageX - el.offsetLeft;
      const walk = (x - startXRef.current) * 1.5;

      // 실제 DOM 스크롤 조작 (상태 업데이트가 아니므로 리렌더링 발생 안 함)
      el.scrollLeft = scrollLeftRef.current - walk;
      movedRef.current = Math.abs(walk);
    },
    [isDrag],
  );

  // 드래그 종료 핸들러
  const onDragEnd = useCallback(() => {
    setIsDrag(false);
  }, []);

  /**
   * 드래그 중인지 여부를 실시간으로 확인하는 함수
   * 버튼의 onClick 이벤트에서 호출하여 '단순 클릭'과 '드래그 후 뗌'을 구분합니다.
   */
  const checkIsClickForbidden = useCallback(() => {
    // 5px 이상 움직였다면 드래그로 간주
    return movedRef.current > 5;
  }, []);

  return {
    // 컴포넌트의 ref={} 속성에 전달
    registerRef: setRef,
    onDragStart,
    onDragEnd,
    onDragMove,
    isDrag,
    checkIsClickForbidden,
  };
}
