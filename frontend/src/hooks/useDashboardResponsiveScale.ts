'use client';

import { useEffect } from 'react';

type UseDashboardResponsiveScaleOptions = {
  baseWidth?: number;
  baseHeight?: number;
  minFontSize?: number;
  maxFontSize?: number;
};

/**
 * Adjusts the root font-size so every rem based component scales down smoothly
 * on smaller viewports. This keeps the dashboard layout proportional while
 * avoiding horizontal/vertical scroll on notebooks.
 */
export function useDashboardResponsiveScale({
  baseWidth = 1440,
  baseHeight = 900,
  minFontSize = 13,
  maxFontSize = 16
}: UseDashboardResponsiveScaleOptions = {}) {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const root = document.documentElement;
    let raf = 0;

    const updateScale = () => {
      raf = 0;
      const widthRatio = window.innerWidth / baseWidth;
      const heightRatio = window.innerHeight / baseHeight;
      const ratio = Math.min(widthRatio, heightRatio, 1);
      const computedSize = Math.max(minFontSize, Math.min(maxFontSize, maxFontSize * ratio));
      root.style.setProperty('--dashboard-font-size', `${computedSize}px`);
    };

    const handleResize = () => {
      if (raf) return;
      raf = window.requestAnimationFrame(updateScale);
    };

    updateScale();
    window.addEventListener('resize', handleResize);

    return () => {
      if (raf) window.cancelAnimationFrame(raf);
      window.removeEventListener('resize', handleResize);
      root.style.removeProperty('--dashboard-font-size');
    };
  }, [baseWidth, baseHeight, minFontSize, maxFontSize]);
}

