import { useState, useCallback } from 'react';
import type { SvgElement } from '../svg-builder.types';

/**
 * Hook for managing undo/redo history
 */
export function useSvgHistory(initialElements: SvgElement[] = []) {
  const [history, setHistory] = useState<SvgElement[][]>([initialElements]);
  const [historyIndex, setHistoryIndex] = useState(0);

  const pushHistory = useCallback((elements: SvgElement[]) => {
    setHistory((prev) => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push(elements);
      return newHistory;
    });
    setHistoryIndex((prev) => prev + 1);
  }, [historyIndex]);

  const undo = useCallback((): SvgElement[] | null => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      return history[newIndex];
    }
    return null;
  }, [historyIndex, history]);

  const redo = useCallback((): SvgElement[] | null => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      return history[newIndex];
    }
    return null;
  }, [historyIndex, history]);

  const resetHistory = useCallback((elements: SvgElement[]) => {
    setHistory([elements]);
    setHistoryIndex(0);
  }, []);

  return {
    history,
    historyIndex,
    pushHistory,
    undo,
    redo,
    resetHistory,
    canUndo: historyIndex > 0,
    canRedo: historyIndex < history.length - 1,
  };
}
