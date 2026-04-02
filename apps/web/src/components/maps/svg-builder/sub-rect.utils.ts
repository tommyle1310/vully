import type { RectArea } from './svg-builder.types';

// =============================================================================
// Polygon Computation from Sub-rects
// =============================================================================

/**
 * Compute polygon points string from sub-rects for a specific template type
 */
export function computePolygonFromSubRects(
  templateType: string,
  subRects: RectArea[],
  offsetX: number,
  offsetY: number
): string {
  const pts: Array<[number, number]> = [];

  if (templateType === 'l-shape') {
    const a = subRects.find((r) => r.id === 'a');
    const b = subRects.find((r) => r.id === 'b');
    if (!a || !b) return '';

    pts.push(
      [a.x, a.y],
      [a.x + a.width, a.y],
      [a.x + a.width, b.y],
      [b.x + b.width, b.y],
      [b.x + b.width, a.y + a.height],
      [a.x, a.y + a.height]
    );
  } else if (templateType === 'u-shape') {
    const a = subRects.find((r) => r.id === 'a');
    const b = subRects.find((r) => r.id === 'b');
    const c = subRects.find((r) => r.id === 'c');
    if (!a || !b || !c) return '';

    pts.push(
      [a.x, a.y],
      [a.x + a.width, a.y],
      [a.x + a.width, c.y],
      [b.x, c.y],
      [b.x, b.y],
      [b.x + b.width, b.y],
      [b.x + b.width, a.y + a.height],
      [a.x, a.y + a.height]
    );
  } else if (templateType === 't-shape') {
    const a = subRects.find((r) => r.id === 'a');
    const b = subRects.find((r) => r.id === 'b');
    if (!a || !b) return '';

    pts.push(
      [a.x, a.y],
      [a.x + a.width, a.y],
      [a.x + a.width, a.y + a.height],
      [b.x + b.width, a.y + a.height],
      [b.x + b.width, b.y + b.height],
      [b.x, b.y + b.height],
      [b.x, a.y + a.height],
      [a.x, a.y + a.height]
    );
  }

  return pts.map(([x, y]) => `${x + offsetX},${y + offsetY}`).join(' ');
}

// =============================================================================
// Sub-rect Constraint Updates
// =============================================================================

/**
 * Update sub-rect dimensions while maintaining shape constraints
 */
export function updateSubRectWithConstraints(
  templateType: string,
  subRects: RectArea[],
  rectId: string,
  changes: Partial<Pick<RectArea, 'width' | 'height'>>
): RectArea[] {
  // Clone with changes applied
  const updated = subRects.map((r) =>
    r.id === rectId ? { ...r, ...changes } : { ...r }
  );

  if (templateType === 'l-shape') {
    applyLShapeConstraints(updated);
  } else if (templateType === 'u-shape') {
    applyUShapeConstraints(updated, rectId);
  } else if (templateType === 't-shape') {
    applyTShapeConstraints(updated);
  }

  return updated;
}

/**
 * L-shape constraints: B connects to A's right edge, bottoms align
 */
function applyLShapeConstraints(subRects: RectArea[]): void {
  const a = subRects.find((r) => r.id === 'a');
  const b = subRects.find((r) => r.id === 'b');
  if (!a || !b) return;

  b.x = a.width;
  b.y = a.height - b.height;

  if (b.y < 0) {
    b.height = a.height;
    b.y = 0;
  }
}

/**
 * U-shape constraints: Pillar heights sync, connector fills gap
 */
function applyUShapeConstraints(subRects: RectArea[], changedRectId: string): void {
  const a = subRects.find((r) => r.id === 'a');
  const b = subRects.find((r) => r.id === 'b');
  const c = subRects.find((r) => r.id === 'c');
  if (!a || !b || !c) return;

  // Pillar heights sync
  if (changedRectId === 'a') {
    b.height = a.height;
  } else if (changedRectId === 'b') {
    a.height = b.height;
  }

  // Ensure minimum gap between pillars
  const minGap = 10;
  if (b.x <= a.width + minGap) {
    b.x = a.width + minGap;
  }

  // Connector fills gap at bottom
  c.x = a.width;
  c.width = Math.max(10, b.x - a.width);
  c.y = a.height - c.height;
}

/**
 * T-shape constraints: Stem below bar, centered
 */
function applyTShapeConstraints(subRects: RectArea[]): void {
  const a = subRects.find((r) => r.id === 'a');
  const b = subRects.find((r) => r.id === 'b');
  if (!a || !b) return;

  b.y = a.height;
  b.x = Math.max(0, (a.width - b.width) / 2);

  if (b.x + b.width > a.width) {
    b.width = a.width;
  }
}

// =============================================================================
// Sub-rect Utilities
// =============================================================================

/**
 * Calculate total area of sub-rects in square meters
 */
export function calculateSubRectsArea(subRects: RectArea[], scaleFactor: number): number {
  return subRects.reduce(
    (sum, sr) => sum + (sr.width / scaleFactor) * (sr.height / scaleFactor),
    0
  );
}

/**
 * Scale sub-rects proportionally to new bounding box
 */
export function scaleSubRects(
  templateSubRects: RectArea[],
  originalWidth: number,
  originalHeight: number,
  newWidth: number,
  newHeight: number
): RectArea[] {
  const scaleX = newWidth / originalWidth;
  const scaleY = newHeight / originalHeight;

  return templateSubRects.map((sr) => ({
    ...sr,
    x: Math.round(sr.x * scaleX),
    y: Math.round(sr.y * scaleY),
    width: Math.round(sr.width * scaleX),
    height: Math.round(sr.height * scaleY),
  }));
}
