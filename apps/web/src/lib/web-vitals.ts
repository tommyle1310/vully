import { NextWebVitalsMetric } from 'next/app';

/**
 * Web Vitals Reporter for Performance Monitoring
 * 
 * Metrics:
 * - CLS (Cumulative Layout Shift): Target < 0.1
 * - FID (First Input Delay): Target < 100ms
 * - FCP (First Contentful Paint): Target < 1.8s
 * - LCP (Largest Contentful Paint): Target < 2.5s
 * - TTFB (Time to First Byte): Target < 600ms
 * - INP (Interaction to Next Paint): Target < 200ms
 */
export function reportWebVitals(metric: NextWebVitalsMetric) {
  const { name, value, id } = metric;

  // Calculate rating based on thresholds
  const thresholds = {
    CLS: { good: 0.1, poor: 0.25 },
    FID: { good: 100, poor: 300 },
    FCP: { good: 1800, poor: 3000 },
    LCP: { good: 2500, poor: 4000 },
    TTFB: { good: 600, poor: 1500 },
    INP: { good: 200, poor: 500 },
  };

  const threshold = thresholds[name as keyof typeof thresholds];
  let rating: 'good' | 'needs-improvement' | 'poor' = 'good';
  
  if (threshold) {
    if (value > threshold.poor) {
      rating = 'poor';
    } else if (value > threshold.good) {
      rating = 'needs-improvement';
    }
  }

  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Web Vitals] ${name}:`, {
      value: Math.round(value),
      rating,
      id,
    });
  }

  // In production, send to analytics service
  if (process.env.NODE_ENV === 'production') {
    // Example: Send to Google Analytics
    if (window.gtag) {
      window.gtag('event', name, {
        value: Math.round(name === 'CLS' ? value * 1000 : value),
        event_category: 'Web Vitals',
        event_label: id,
        non_interaction: true,
      });
    }

    // Example: Send to custom analytics endpoint
    if (process.env.NEXT_PUBLIC_ANALYTICS_ENDPOINT) {
      fetch(process.env.NEXT_PUBLIC_ANALYTICS_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          value,
          rating,
          id,
          timestamp: Date.now(),
          url: window.location.pathname,
        }),
        keepalive: true,
      }).catch(console.error);
    }
  }

  // Check against thresholds and warn
  if (threshold && value > threshold.good) {
    console.warn(
      `⚠️ Performance Warning: ${name} is ${Math.round(value)}ms (threshold: ${threshold.good}ms)`
    );
  }
}

// Type augmentation for gtag
declare global {
  interface Window {
    gtag?: (
      command: string,
      eventName: string,
      params: Record<string, unknown>
    ) => void;
  }
}
