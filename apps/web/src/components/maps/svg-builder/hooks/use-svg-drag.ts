import { useState, useCallback } from 'react';
import type { SvgElement, Point } from '../svg-builder.types';
import { translatePolygonPoints } from '../svg-builder.geometry';

interface DragState {
  isDragging: boolean;
  dragOffset: Point;
  startPosition: Point;
}

const INITIAL_STATE: DragState = {
  isDragging: false,
  dragOffset: { x: 0, y: 0 },
  startPosition: { x: 0, y: 0 },
};

/**
 * Hook for managing element drag operations
 */
export function useSvgDrag() {
  const [state, setState] = useState<DragState>(INITIAL_STATE);

  const startDrag = useCallback((element: SvgElement, mousePos: Point) => {
    setState({
      isDragging: true,
      dragOffset: {
        x: mousePos.x - element.x,
        y: mousePos.y - element.y,
      },
      startPosition: mousePos,
    });
  }, []);

  const updateDrag = useCallback(
    (
      mousePos: Point,
      elements: SvgElement[],
      selectedId: string,
      snapFn: (v: number) => number,
      selectedIds?: string[]
    ): SvgElement[] | null => {
      if (!state.isDragging) return null;

      const element = elements.find((el) => el.id === selectedId);
      if (!element) return null;

      const newX = snapFn(mousePos.x - state.dragOffset.x);
      const newY = snapFn(mousePos.y - state.dragOffset.y);

      const dx = newX - element.x;
      const dy = newY - element.y;

      if (dx === 0 && dy === 0) return null;

      // Multi-element drag: move all selected elements by the same delta
      const idsToMove =
        selectedIds && selectedIds.length > 1 ? new Set(selectedIds) : null;

      return elements.map((el) => {
        const shouldMove = idsToMove ? idsToMove.has(el.id) : el.id === selectedId;
        if (!shouldMove) return el;

        const elNewX = el.x + dx;
        const elNewY = el.y + dy;

        if (el.type === 'polygon' && el.points) {
          return {
            ...el,
            x: elNewX,
            y: elNewY,
            points: translatePolygonPoints(el.points, dx, dy),
          };
        }

        return { ...el, x: elNewX, y: elNewY };
      });
    },
    [state.isDragging, state.dragOffset]
  );

  const endDrag = useCallback(() => {
    setState(INITIAL_STATE);
  }, []);

  return {
    isDragging: state.isDragging,
    dragOffset: state.dragOffset,
    startDrag,
    updateDrag,
    endDrag,
  };
}
