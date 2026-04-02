import type { SvgElement, RectArea, Point, BoundingBox } from './svg-builder.types';
import { SCALE_FACTOR, OVERLAP_TOLERANCE } from './svg-builder.constants';

// =============================================================================
// Area Calculation
// =============================================================================

/**
 * Compute area in square meters for an element
 */
export function computeAreaSqm(element: SvgElement): number {
  if (element.type === 'rect' && element.width && element.height) {
    return (element.width / SCALE_FACTOR) * (element.height / SCALE_FACTOR);
  }

  if (element.type === 'polygon' && element.subRects) {
    return element.subRects.reduce(
      (sum, sr) => sum + (sr.width / SCALE_FACTOR) * (sr.height / SCALE_FACTOR),
      0
    );
  }

  // Polygon without sub-rects: use bounding box as approximation
  if (element.type === 'polygon' && element.width && element.height) {
    return (element.width / SCALE_FACTOR) * (element.height / SCALE_FACTOR);
  }

  return 0;
}

// =============================================================================
// Sub-rect Extraction for Overlap Detection
// =============================================================================

/**
 * Get all sub-rectangles for an element (for compound overlap detection)
 */
export function getAllSubRects(element: SvgElement): RectArea[] {
  if (element.type === 'rect') {
    return [
      {
        id: 'main',
        x: element.x,
        y: element.y,
        width: element.width ?? 0,
        height: element.height ?? 0,
      },
    ];
  }

  if (element.type === 'polygon' && element.subRects?.length) {
    // Compute actual min point from polygon points
    // element.x/y can get out of sync during drag operations
    let minX = element.x;
    let minY = element.y;

    if (element.points) {
      const pts = parsePolygonPoints(element.points);
      if (pts.length > 0) {
        minX = Math.min(...pts.map((p) => p.x));
        minY = Math.min(...pts.map((p) => p.y));
      }
    }

    return element.subRects.map((sr) => ({
      ...sr,
      x: sr.x + minX,
      y: sr.y + minY,
    }));
  }

  // Fallback: use bounding box
  return [
    {
      id: 'fallback',
      x: element.x,
      y: element.y,
      width: element.width ?? 0,
      height: element.height ?? 0,
    },
  ];
}

// =============================================================================
// Overlap Detection
// =============================================================================

/**
 * Check if two rectangles overlap (with tolerance for edge touching)
 */
export function rectsOverlap(r1: RectArea, r2: RectArea): boolean {
  const overlapX = Math.min(r1.x + r1.width, r2.x + r2.width) - Math.max(r1.x, r2.x);
  const overlapY = Math.min(r1.y + r1.height, r2.y + r2.height) - Math.max(r1.y, r2.y);

  // Overlap exists if positive overlap in BOTH dimensions exceeds tolerance
  return overlapX > OVERLAP_TOLERANCE && overlapY > OVERLAP_TOLERANCE;
}

/**
 * Check if an element overlaps with any other apartment element
 */
export function checkElementOverlaps(
  elementId: string,
  elements: SvgElement[]
): boolean {
  const element = elements.find((el) => el.id === elementId);
  if (!element || !element.apartmentId) return false;

  const rects1 = getAllSubRects(element);

  return elements.some((otherEl) => {
    if (otherEl.id === elementId || !otherEl.apartmentId) return false;

    const rects2 = getAllSubRects(otherEl);

    for (const r1 of rects1) {
      for (const r2 of rects2) {
        if (rectsOverlap(r1, r2)) {
          return true;
        }
      }
    }
    return false;
  });
}

// =============================================================================
// Polygon Point Utilities
// =============================================================================

/**
 * Parse polygon points string into array of Point objects
 */
export function parsePolygonPoints(points: string): Point[] {
  return points.split(' ').map((pair) => {
    const [x, y] = pair.split(',').map(Number);
    return { x, y };
  });
}

/**
 * Convert Point array back to SVG points string
 */
export function serializePolygonPoints(points: Point[]): string {
  return points.map((p) => `${p.x},${p.y}`).join(' ');
}

/**
 * Get polygon points for any element type
 */
export function getPolygonPoints(element: SvgElement): Point[] {
  if (element.type === 'rect') {
    const w = element.width ?? 0;
    const h = element.height ?? 0;
    return [
      { x: element.x, y: element.y },
      { x: element.x + w, y: element.y },
      { x: element.x + w, y: element.y + h },
      { x: element.x, y: element.y + h },
    ];
  }

  if (element.type === 'polygon' && element.points) {
    return parsePolygonPoints(element.points);
  }

  return [];
}

/**
 * Get bounding box from polygon points
 */
export function getBoundingBox(points: Point[]): BoundingBox {
  if (points.length === 0) {
    return { left: 0, right: 0, top: 0, bottom: 0 };
  }

  return {
    left: Math.min(...points.map((p) => p.x)),
    right: Math.max(...points.map((p) => p.x)),
    top: Math.min(...points.map((p) => p.y)),
    bottom: Math.max(...points.map((p) => p.y)),
  };
}

/**
 * Check if two bounding boxes overlap
 */
export function boxesOverlap(b1: BoundingBox, b2: BoundingBox): boolean {
  return !(
    b1.right <= b2.left ||
    b1.left >= b2.right ||
    b1.bottom <= b2.top ||
    b1.top >= b2.bottom
  );
}

// =============================================================================
// Advanced Polygon Collision Detection
// =============================================================================

/**
 * Check if a point is inside a polygon (ray casting algorithm)
 */
export function pointInPolygon(point: Point, polygon: Point[]): boolean {
  let inside = false;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x;
    const yi = polygon[i].y;
    const xj = polygon[j].x;
    const yj = polygon[j].y;

    const intersect =
      yi > point.y !== yj > point.y &&
      point.x < ((xj - xi) * (point.y - yi)) / (yj - yi) + xi;

    if (intersect) inside = !inside;
  }

  return inside;
}

/**
 * Calculate cross product direction for line intersection
 */
function direction(pi: Point, pj: Point, pk: Point): number {
  return (pk.x - pi.x) * (pj.y - pi.y) - (pj.x - pi.x) * (pk.y - pi.y);
}

/**
 * Check if two line segments intersect
 */
function linesIntersect(p1: Point, p2: Point, p3: Point, p4: Point): boolean {
  const d1 = direction(p3, p4, p1);
  const d2 = direction(p3, p4, p2);
  const d3 = direction(p1, p2, p3);
  const d4 = direction(p1, p2, p4);

  return (d1 > 0 && d2 < 0 || d1 < 0 && d2 > 0) && (d3 > 0 && d4 < 0 || d3 < 0 && d4 > 0);
}

/**
 * Check if polygon edges intersect
 */
function edgesIntersect(poly1: Point[], poly2: Point[]): boolean {
  for (let i = 0; i < poly1.length; i++) {
    const a1 = poly1[i];
    const a2 = poly1[(i + 1) % poly1.length];

    for (let j = 0; j < poly2.length; j++) {
      const b1 = poly2[j];
      const b2 = poly2[(j + 1) % poly2.length];

      if (linesIntersect(a1, a2, b1, b2)) return true;
    }
  }
  return false;
}

/**
 * Full polygon overlap check (points inside + edge intersection)
 */
export function polygonsOverlap(poly1: Point[], poly2: Point[]): boolean {
  // Check if any point of poly1 is inside poly2
  for (const pt of poly1) {
    if (pointInPolygon(pt, poly2)) return true;
  }

  // Check if any point of poly2 is inside poly1
  for (const pt of poly2) {
    if (pointInPolygon(pt, poly1)) return true;
  }

  // Check edge intersections
  return edgesIntersect(poly1, poly2);
}

// =============================================================================
// Transform Utilities
// =============================================================================

/**
 * Move polygon points by delta
 */
export function translatePolygonPoints(points: string, dx: number, dy: number): string {
  return points
    .split(' ')
    .map((pair) => {
      const [x, y] = pair.split(',').map(Number);
      return `${x + dx},${y + dy}`;
    })
    .join(' ');
}

/**
 * Scale polygon points by factor
 */
export function scalePolygonPoints(points: string, scaleFactor: number): string {
  return points
    .split(' ')
    .map((pair) => {
      const [x, y] = pair.split(',').map(Number);
      return `${x * scaleFactor},${y * scaleFactor}`;
    })
    .join(' ');
}

/**
 * Calculate polygon centroid
 */
export function getPolygonCentroid(points: Point[]): Point {
  if (points.length === 0) return { x: 0, y: 0 };

  const sum = points.reduce(
    (acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }),
    { x: 0, y: 0 }
  );

  return {
    x: sum.x / points.length,
    y: sum.y / points.length,
  };
}
