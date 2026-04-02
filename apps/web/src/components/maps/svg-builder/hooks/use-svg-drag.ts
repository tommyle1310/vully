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
      snapFn: (v: number) => number
    ): SvgElement[] | null => {
      if (!state.isDragging) return null;

      const element = elements.find((el) => el.id === selectedId);
      if (!element) return null;

      const newX = snapFn(mousePos.x - state.dragOffset.x);
      const newY = snapFn(mousePos.y - state.dragOffset.y);

      const dx = newX - element.x;
      const dy = newY - element.y;

      if (dx === 0 && dy === 0) return null;

      return elements.map((el) => {
        if (el.id !== selectedId) return el;

        // For polygons, transform all points
        if (el.type === 'polygon' && el.points) {
          return {
            ...el,
            x: newX,
            y: newY,
            points: translatePolygonPoints(el.points, dx, dy),
          };
        }

        return {
          ...el,
          x: newX,
          y: newY,
        };
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
