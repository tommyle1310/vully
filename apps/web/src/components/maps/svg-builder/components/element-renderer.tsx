import { memo } from 'react';
import type { SvgElement } from '../svg-builder.types';

interface ElementRendererProps {
  element: SvgElement;
  isSelected: boolean;
  hasOverlap: boolean;
  onMouseDown: (e: React.MouseEvent, elementId: string) => void;
}

// =============================================================================
// Rectangle Element
// =============================================================================

export const RectElement = memo(function RectElement({
  element,
  isSelected,
  hasOverlap,
  onMouseDown,
}: ElementRendererProps) {
  const cx = element.x + (element.width || 0) / 2;
  const cy = element.y + (element.height || 0) / 2;
  const rotation = element.rotation || 0;
  const textCounterRotate = rotation ? `rotate(${-rotation} ${cx} ${cy})` : undefined;

  return (
    <g transform={rotation ? `rotate(${rotation} ${cx} ${cy})` : undefined}>
      <rect
        x={element.x}
        y={element.y}
        width={element.width}
        height={element.height}
        fill={element.fill}
        stroke={hasOverlap ? '#ef4444' : isSelected ? '#3b82f6' : element.stroke}
        strokeWidth={hasOverlap ? 3 : isSelected ? element.strokeWidth + 1 : element.strokeWidth}
        rx={4}
        className="cursor-move"
        style={{ userSelect: 'none' }}
        onMouseDown={(e) => onMouseDown(e, element.id)}
      />

      {/* Apartment Type (low opacity) */}
      {element.apartmentType && (
        <text
          x={cx}
          y={element.y + 20}
          textAnchor="middle"
          fontSize="12"
          fontWeight="normal"
          fill="#666"
          opacity="0.5"
          pointerEvents="none"
          style={{ userSelect: 'none' }}
          transform={textCounterRotate}
        >
          {element.apartmentType}
        </text>
      )}

      {/* Apartment Number/Label */}
      {element.label && (
        <text
          x={cx}
          y={cy + (element.apartmentType ? 5 : 0)}
          textAnchor="middle"
          fontSize="16"
          fontWeight="bold"
          fill="#333"
          pointerEvents="none"
          style={{ userSelect: 'none' }}
          transform={textCounterRotate}
        >
          {element.label}
        </text>
      )}

      {/* Apartment Name */}
      {element.apartmentName && (
        <text
          x={cx}
          y={element.y + (element.height || 0) - 10}
          textAnchor="middle"
          fontSize="10"
          fontWeight="normal"
          fill="#666"
          opacity="0.7"
          pointerEvents="none"
          style={{ userSelect: 'none' }}
          transform={textCounterRotate}
        >
          {element.apartmentName}
        </text>
      )}

      {/* Overlap Warning Icon */}
      {hasOverlap && <OverlapWarning x={element.x + (element.width || 0) - 15} y={element.y + 15} />}
    </g>
  );
});

// =============================================================================
// Polygon Element
// =============================================================================

export const PolygonElement = memo(function PolygonElement({
  element,
  isSelected,
  hasOverlap,
  onMouseDown,
}: ElementRendererProps) {
  const pcx = element.x + (element.width || 0) / 2;
  const pcy = element.y + (element.height || 0) / 2;
  const rotation = element.rotation || 0;
  const textCounterRotate = rotation ? `rotate(${-rotation} ${pcx} ${pcy})` : undefined;

  return (
    <g transform={rotation ? `rotate(${rotation} ${pcx} ${pcy})` : undefined}>
      {/* Fill */}
      <polygon points={element.points} fill={element.fill} stroke="none" />

      {/* Stroke - Outer */}
      <polygon
        points={element.points}
        fill="none"
        stroke={hasOverlap ? '#ef4444' : isSelected ? '#3b82f6' : element.stroke}
        strokeWidth={isSelected ? 6 : 4}
        strokeLinejoin="miter"
        strokeLinecap="butt"
        className="cursor-move"
        style={{ userSelect: 'none' }}
        onMouseDown={(e) => onMouseDown(e, element.id)}
      />

      {/* Invisible hit area */}
      <polygon
        points={element.points}
        fill="transparent"
        stroke="transparent"
        strokeWidth={12}
        className="cursor-move"
        onMouseDown={(e) => onMouseDown(e, element.id)}
      />

      {/* Selection dashed outline */}
      {isSelected && (
        <polygon
          points={element.points}
          fill="none"
          stroke="#3b82f6"
          strokeWidth={3}
          strokeDasharray="8 4"
          strokeLinejoin="miter"
        />
      )}

      {/* Apartment Type */}
      {element.apartmentType && (
        <text
          x={pcx}
          y={element.y + 20}
          textAnchor="middle"
          fontSize="12"
          fontWeight="normal"
          fill="#666"
          opacity="0.5"
          pointerEvents="none"
          style={{ userSelect: 'none' }}
          transform={textCounterRotate}
        >
          {element.apartmentType}
        </text>
      )}

      {/* Label */}
      {element.label && (
        <text
          x={pcx}
          y={pcy}
          textAnchor="middle"
          fontSize="16"
          fontWeight="bold"
          fill="#333"
          pointerEvents="none"
          style={{ userSelect: 'none' }}
          transform={textCounterRotate}
        >
          {element.label}
        </text>
      )}

      {/* Apartment Name */}
      {element.apartmentName && (
        <text
          x={pcx}
          y={element.y + (element.height || 0) - 10}
          textAnchor="middle"
          fontSize="10"
          fontWeight="normal"
          fill="#666"
          opacity="0.7"
          pointerEvents="none"
          style={{ userSelect: 'none' }}
          transform={textCounterRotate}
        >
          {element.apartmentName}
        </text>
      )}

      {/* Overlap Warning */}
      {hasOverlap && <OverlapWarning x={element.x + (element.width || 0) - 15} y={element.y + 15} />}
    </g>
  );
});

// =============================================================================
// Circle Element
// =============================================================================

export const CircleElement = memo(function CircleElement({
  element,
  isSelected,
  onMouseDown,
}: ElementRendererProps) {
  return (
    <circle
      cx={element.x}
      cy={element.y}
      r={element.radius}
      fill={element.fill}
      stroke={isSelected ? '#3b82f6' : element.stroke}
      strokeWidth={isSelected ? element.strokeWidth + 1 : element.strokeWidth}
      className="cursor-move"
      style={{ userSelect: 'none' }}
      onMouseDown={(e) => onMouseDown(e, element.id)}
    />
  );
});

// =============================================================================
// Text Element
// =============================================================================

export const TextElement = memo(function TextElement({
  element,
  onMouseDown,
}: ElementRendererProps) {
  return (
    <text
      x={element.x}
      y={element.y}
      fontSize="14"
      fill={element.fill}
      className="cursor-move"
      style={{ userSelect: 'none' }}
      onMouseDown={(e) => onMouseDown(e, element.id)}
    >
      {element.text}
    </text>
  );
});

// =============================================================================
// Overlap Warning Icon
// =============================================================================

const OverlapWarning = memo(function OverlapWarning({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <circle cx={x} cy={y} r="10" fill="#ef4444" pointerEvents="none" />
      <text
        x={x}
        y={y + 4}
        textAnchor="middle"
        fontSize="12"
        fontWeight="bold"
        fill="white"
        pointerEvents="none"
        style={{ userSelect: 'none' }}
      >
        !
      </text>
    </g>
  );
});

// =============================================================================
// Main Element Renderer
// =============================================================================

export function ElementRenderer(props: ElementRendererProps) {
  const { element } = props;

  switch (element.type) {
    case 'rect':
      return <RectElement {...props} />;
    case 'polygon':
      return <PolygonElement {...props} />;
    case 'circle':
      return <CircleElement {...props} />;
    case 'text':
      return <TextElement {...props} />;
    default:
      return null;
  }
}
