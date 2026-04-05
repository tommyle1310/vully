'use client';

import { useEffect } from 'react';
import { useReportWebVitals } from 'next/web-vitals';
import { reportWebVitals } from '@/lib/web-vitals';

/**
 * Web Vitals Tracker Component
 * Tracks and reports Core Web Vitals metrics
 */
export function WebVitalsTracker() {
  useReportWebVitals((metric) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    reportWebVitals(metric as any);
  });

  useEffect(() => {
    // Log that tracking is active in development
    if (process.env.NODE_ENV === 'development') {
      console.log('📊 Web Vitals tracking active');
    }
  }, []);

  return null;
}
