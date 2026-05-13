/**
 * View Transitions API로 라우트 전환을 한 프레임에 묶어 브라우저 기본 전환(크로스페이드·슬라이드)을 씁니다.
 * 지원하지 않거나 `prefers-reduced-motion: reduce`면 그냥 `callback`만 실행합니다.
 */
export const withViewTransition = (callback: () => void): void => {
  if (typeof window === 'undefined') {
    callback();
    return;
  }

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    callback();
    return;
  }

  const doc = document as Document & {
    startViewTransition?: (cb: () => void | Promise<void>) => unknown;
  };

  if (typeof doc.startViewTransition === 'function') {
    doc.startViewTransition(() => {
      callback();
    });
    return;
  }

  callback();
};
