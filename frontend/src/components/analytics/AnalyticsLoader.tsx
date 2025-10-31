'use client';

import { useEffect } from 'react';
import { fetchPublicAnalyticsConfig } from '@/services/publicIntegrations';

const EXTERNAL_SCRIPT_ID = 'whatskovi-ga-script';
const FALLBACK_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

const initializeAnalytics = (measurementId: string) => {
  if (typeof window === 'undefined' || !measurementId) {
    return;
  }

  const analyticsWindow = window as typeof window & {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  };
  const rootElement = document.documentElement;
  const alreadyConfiguredId = rootElement.dataset.gaMeasurementId;

  if (alreadyConfiguredId === measurementId && typeof analyticsWindow.gtag === 'function') {
    analyticsWindow.gtag('config', measurementId, {
      anonymize_ip: true,
      transport_type: 'beacon'
    });
    return;
  }

  rootElement.dataset.gaMeasurementId = measurementId;

  analyticsWindow.dataLayer = analyticsWindow.dataLayer || [];
  analyticsWindow.gtag =
    analyticsWindow.gtag ||
    function gtag(...args: unknown[]) {
      analyticsWindow.dataLayer!.push(args);
    };

  analyticsWindow.gtag('js', new Date());
  analyticsWindow.gtag('config', measurementId, {
    anonymize_ip: true,
    transport_type: 'beacon'
  });

  if (!document.getElementById(EXTERNAL_SCRIPT_ID)) {
    const script = document.createElement('script');
    script.id = EXTERNAL_SCRIPT_ID;
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
    document.head.appendChild(script);
  }
};

export const AnalyticsLoader = () => {
  useEffect(() => {
    let mounted = true;

    const setupAnalytics = async () => {
      try {
        const response = await fetchPublicAnalyticsConfig();
        const resolvedMeasurementId = response.measurementId || FALLBACK_MEASUREMENT_ID || null;

        if (!mounted || !resolvedMeasurementId) {
          return;
        }

        initializeAnalytics(resolvedMeasurementId);
      } catch (error) {
        if (!FALLBACK_MEASUREMENT_ID) {
          console.warn('[Analytics] Falha ao inicializar Google Analytics', error);
        } else {
          initializeAnalytics(FALLBACK_MEASUREMENT_ID);
        }
      }
    };

    setupAnalytics();

    return () => {
      mounted = false;
    };
  }, []);

  return null;
};

export default AnalyticsLoader;
