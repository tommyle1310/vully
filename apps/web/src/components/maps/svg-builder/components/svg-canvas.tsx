'use client';

import { memo } from 'react';
import type { SvgCanvasProps } from '../svg-builder.types';
import { GRID_SIZE, SCALE_FACTOR } from '../svg-builder.constants';
import { ElementRenderer } from './element-renderer';

export const SvgCanvas = memo(function SvgCanvas({
  elements,
  selectedElementId,
  selectedIds,
  canvasSize,
  viewBox,
  zoom,
  showGrid,
  panMode,
  marquee,
  containerRef,
  onMouseDown,
  onMouseMove,
  onMouseUp,
  onElementMouseDown,
  checkOverlaps,
  svgRef,
  onDropTemplate,
}: SvgCanvasProps) {
  return (
    <div
      ref={containerRef as React.RefObject<HTMLDivElement>}
      className="bg-muted/20 w-full h-full overflow-auto rounded-md border"
      onDragOver={(e) => e.preventDefault()}
      onDrop={onDropTemplate}
    >
      <svg
        ref={svgRef as React.RefObject<SVGSVGElement>}
        width={canvasSize.width * zoom}
        height={canvasSize.height * zoom}
        viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`}
        className={`bg-white select-none ${panMode ? 'cursor-grab active:cursor-grabbing' : 'cursor-crosshair'}`}
        style={{
          userSelect: 'none',
          minWidth: canvasSize.width * zoom,
          minHeight: canvasSize.height * zoom,
        }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
      >
        {/* Grid */}
        {showGrid && <GridPattern canvasSize={canvasSize} />}

        {/* Elements */}
        {elements.map((el) => (
          <ElementRenderer
            key={el.id}
            element={el}
            isSelected={el.id === selectedElementId}
            isInMultiSelection={selectedIds ? selectedIds.includes(el.id) : false}
            hasOverlap={checkOverlaps(el.id)}
            onMouseDown={onElementMouseDown}
          />
        ))}

        {/* Marquee selection rect */}
        {marquee && (
          <rect
            x={marquee.width >= 0 ? marquee.x : marquee.x + marquee.width}
            y={marquee.height >= 0 ? marquee.y : marquee.y + marquee.height}
            width={Math.abs(marquee.width)}
            height={Math.abs(marquee.height)}
            fill="rgba(99,102,241,0.08)"
            stroke="#6366f1"
            strokeWidth={1.5}
            strokeDasharray="6 3"
            pointerEvents="none"
          />
        )}

        {/* Dimension indicator */}
        <text
          x={viewBox.x + viewBox.width - 10}
          y={viewBox.y + viewBox.height - 10}
          textAnchor="end"
          fontSize="14"
          fontWeight="bold"
          fill="#3b82f6"
          opacity="0.8"
          pointerEvents="none"
          style={{ userSelect: 'none' }}
        >
          {`${(canvasSize.width / SCALE_FACTOR).toFixed(1)}m × ${(canvasSize.height / SCALE_FACTOR).toFixed(1)}m`}
        </text>
      </svg>
    </div>
  );
});

// =============================================================================
// Grid Pattern
// =============================================================================

const GridPattern = memo(function GridPattern({
  canvasSize,
}: {
  canvasSize: { width: number; height: number };
}) {
  const verticalLines = Math.ceil(canvasSize.width / GRID_SIZE);
  const horizontalLines = Math.ceil(canvasSize.height / GRID_SIZE);

  return (
    <g opacity="0.1">
      {Array.from({ length: verticalLines }).map((_, i) => (
        <line
          key={`v-${i}`}
          x1={i * GRID_SIZE}
          y1={0}
          x2={i * GRID_SIZE}
          y2={canvasSize.height}
          stroke="#666"
          strokeWidth={1}
        />
      ))}
      {Array.from({ length: horizontalLines }).map((_, i) => (
        <line
          key={`h-${i}`}
          x1={0}
          y1={i * GRID_SIZE}
          x2={canvasSize.width}
          y2={i * GRID_SIZE}
          stroke="#666"
          strokeWidth={1}
        />
      ))}
    </g>
  );
});
