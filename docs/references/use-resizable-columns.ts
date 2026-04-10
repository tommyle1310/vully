'use client';

import { useState, useRef, useCallback } from 'react';

interface DragState {
  idx: number;
  startX: number;
  startW: number;
}

const MIN_COLUMN_WIDTH = 40;

/**
 * Hook for managing resizable table columns
 * 
 * FIXED: Memory leak caused by widths in startResize dependency array.
 * Now uses functional state updates to avoid stale closures.
 */
export function useResizableColumns(defaults: readonly number[]) {
  const [widths, setWidths] = useState<number[]>(() => [...defaults]);
  const dragging = useRef<DragState | null>(null);
  const widthsRef = useRef(widths);
  
  // Keep ref in sync with state
  widthsRef.current = widths;

  const startResize = useCallback(
    (idx: number) => (e: React.MouseEvent) => {
      e.preventDefault();
      
      // Use ref to get current width without dependency
      const currentWidth = widthsRef.current[idx] ?? defaults[idx] ?? 80;
      
      dragging.current = {
        idx,
        startX: e.clientX,
        startW: currentWidth,
      };

      const onMove = (ev: MouseEvent) => {
        if (!dragging.current) return;
        const { idx: i, startX, startW } = dragging.current;
        const delta = ev.clientX - startX;
        setWidths((prev) => {
          const next = [...prev];
          next[i] = Math.max(MIN_COLUMN_WIDTH, startW + delta);
          return next;
        });
      };

      const onUp = () => {
        dragging.current = null;
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
      };

      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    },
    [defaults], // widths removed from deps — use ref instead
  );

  return { widths, startResize };
}
