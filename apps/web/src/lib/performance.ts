/**
 * Performance Monitoring Utilities
 */

/**
 * Measure component render time in development
 * @example
 * function MyComponent() {
 *   measureRender('MyComponent');
 *   // ... component code
 * }
 */
export function measureRender(componentName: string) {
  if (process.env.NODE_ENV !== 'development') return;

  const startTime = performance.now();

  // Use useEffect to measure after render
  if (typeof window !== 'undefined') {
    requestAnimationFrame(() => {
      const endTime = performance.now();
      const renderTime = endTime - startTime;

      if (renderTime > 16) {
        // Warn if render takes longer than 1 frame (16ms at 60fps)
        console.warn(
          `⚠️ Slow render: ${componentName} took ${renderTime.toFixed(2)}ms`
        );
      }
    });
  }
}

/**
 * Mark and measure performance metrics
 * @example
 * const measure = startMeasure('data-fetch');
 * await fetchData();
 * measure.end(); // Logs: "data-fetch took 234ms"
 */
export function startMeasure(label: string) {
  const markName = `${label}-start`;
  const measureName = label;

  performance.mark(markName);

  return {
    end: () => {
      const endMarkName = `${label}-end`;
      performance.mark(endMarkName);
      performance.measure(measureName, markName, endMarkName);

      const measures = performance.getEntriesByName(measureName);
      const lastMeasure = measures[measures.length - 1];

      if (lastMeasure) {
        console.log(`⏱️ ${label} took ${lastMeasure.duration.toFixed(2)}ms`);
      }

      // Clean up marks
      performance.clearMarks(markName);
      performance.clearMarks(endMarkName);
      performance.clearMeasures(measureName);
    },
  };
}

/**
 * Track time to interactive for a component
 * @example
 * function Dashboard() {
 *   trackTimeToInteractive('Dashboard');
 *   // ... component code
 * }
 */
export function trackTimeToInteractive(componentName: string) {
  if (typeof window === 'undefined') return;

  const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (entry.entryType === 'measure' && entry.name === 'first-input') {
        console.log(
          `🖱️ ${componentName} First Input: ${entry.duration.toFixed(2)}ms`
        );
      }
    }
  });

  observer.observe({ entryTypes: ['measure'] });
}

/**
 * Log component re-render count
 * Useful for detecting unnecessary re-renders
 * @example
 * function MyComponent() {
 *   const renderCount = useRenderCount('MyComponent');
 *   // ...
 * }
 */
export function useRenderCount(componentName: string) {
  if (typeof window === 'undefined') return 0;

  const key = `render-count-${componentName}`;
  const count = (window as any)[key] || 0;
  (window as any)[key] = count + 1;

  if (process.env.NODE_ENV === 'development' && count % 10 === 0 && count > 0) {
    console.warn(`🔄 ${componentName} has rendered ${count} times`);
  }

  return count + 1;
}

/**
 * Detect long tasks (> 50ms) that block the main thread
 */
export function detectLongTasks() {
  if (typeof window === 'undefined') return;

  if ('PerformanceObserver' in window) {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.duration > 50) {
          console.warn(
            `⏳ Long task detected: ${entry.duration.toFixed(2)}ms`,
            entry
          );
        }
      }
    });

    try {
      observer.observe({ entryTypes: ['longtask'] });
    } catch (e) {
      // Long task API not supported in all browsers
      console.log('Long task monitoring not available in this browser');
    }
  }
}

/**
 * Calculate and log bundle size impact
 * @param packageName Name of the package/component
 * @param sizeKb Size in kilobytes
 */
export function logBundleImpact(packageName: string, sizeKb: number) {
  const impactSeconds = (sizeKb / 100).toFixed(2); // Rough estimate: 100KB/s on 3G
  console.log(
    `📦 ${packageName}: ${sizeKb}KB (adds ~${impactSeconds}s on slow 3G)`
  );

  if (sizeKb > 100) {
    console.warn(
      `⚠️ ${packageName} is large (${sizeKb}KB). Consider code splitting or alternatives.`
    );
  }
}

/**
 * Measure hydration time for server components
 */
export function measureHydration() {
  if (typeof window === 'undefined') return;

  window.addEventListener('load', () => {
    const navigationTiming = performance.getEntriesByType(
      'navigation'
    )[0] as PerformanceNavigationTiming;

    if (navigationTiming) {
      const hydrationTime =
        navigationTiming.domContentLoadedEventEnd -
        navigationTiming.responseEnd;
      console.log(`💧 Hydration took ${hydrationTime.toFixed(2)}ms`);

      if (hydrationTime > 1000) {
        console.warn(
          `⚠️ Slow hydration (${hydrationTime.toFixed(2)}ms). Consider reducing initial JS.`
        );
      }
    }
  });
}

/**
 * Simple FPS meter for detecting jank
 */
export function startFPSMonitor() {
  if (typeof window === 'undefined') return () => {};

  let lastTime = performance.now();
  let frames = 0;
  let isRunning = true;

  function measureFPS() {
    if (!isRunning) return;

    frames++;
    const currentTime = performance.now();

    if (currentTime >= lastTime + 1000) {
      const fps = Math.round((frames * 1000) / (currentTime - lastTime));

      if (fps < 30) {
        console.warn(`⚠️ Low FPS detected: ${fps} FPS`);
      } else if (process.env.NODE_ENV === 'development') {
        console.log(`📊 FPS: ${fps}`);
      }

      frames = 0;
      lastTime = currentTime;
    }

    requestAnimationFrame(measureFPS);
  }

  requestAnimationFrame(measureFPS);

  return () => {
    isRunning = false;
  };
}
