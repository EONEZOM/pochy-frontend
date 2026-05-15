'use client';

import { useEffect } from 'react';

const syncViewportHeight = () => {
  const viewport = window.visualViewport;
  const height = viewport?.height ?? window.innerHeight;
  document.documentElement.style.setProperty('--app-height', `${height}px`);
};

export default function ViewportHeightSync() {
  useEffect(() => {
    syncViewportHeight();

    const viewport = window.visualViewport;
    window.addEventListener('resize', syncViewportHeight, { passive: true });
    window.addEventListener('orientationchange', syncViewportHeight, {
      passive: true,
    });
    viewport?.addEventListener('resize', syncViewportHeight, { passive: true });
    viewport?.addEventListener('scroll', syncViewportHeight, { passive: true });

    return () => {
      window.removeEventListener('resize', syncViewportHeight);
      window.removeEventListener('orientationchange', syncViewportHeight);
      viewport?.removeEventListener('resize', syncViewportHeight);
      viewport?.removeEventListener('scroll', syncViewportHeight);
    };
  }, []);

  return null;
}
