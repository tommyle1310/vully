import { useCallback, RefObject } from 'react';
import type { ViewBox, Point } from '../svg-builder.types';

/**
 * Hook for converting screen coordinates to SVG coordinates
 */
export function useSvgCoordinates(
  svgRef: RefObject<SVGSVGElement | null>,
  viewBox: ViewBox
) {
  const getSVGCoordinates = useCallback(
    (e: React.MouseEvent | MouseEvent): Point => {
      const svg = svgRef.current;
      if (!svg) return { x: 0, y: 0 };

      const rect = svg.getBoundingClientRect();
      return {
        x: viewBox.x + ((e.clientX - rect.left) / rect.width) * viewBox.width,
        y: viewBox.y + ((e.clientY - rect.top) / rect.height) * viewBox.height,
      };
    },
    [svgRef, viewBox]
  );

  return { getSVGCoordinates };
}
