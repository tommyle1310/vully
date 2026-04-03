import type { SvgElement, CanvasSize, RectArea } from './svg-builder.types';
import {
  DEFAULT_CANVAS_SIZE,
  SCALE_FACTOR,
  COMPLEX_APARTMENT_TEMPLATES,
  TEMPLATE_SUB_RECTS,
  getTemplateTypeId,
} from './svg-builder.constants';
import { computeAreaSqm } from './svg-builder.geometry';
import { scaleSubRects } from './sub-rect.utils';

// =============================================================================
// SVG Import (Parser)
// =============================================================================

export interface ParsedSvgResult {
  elements: SvgElement[];
  canvasSize: CanvasSize;
  wasScaled: boolean;
}

/**
 * Parse SVG content and extract elements
 */
export function parseSvgContent(svgContent: string): ParsedSvgResult {
  const parser = new DOMParser();
  const svgDoc = parser.parseFromString(svgContent, 'image/svg+xml');
  const svgElement = svgDoc.querySelector('svg');

  if (!svgElement) {
    throw new Error('Invalid SVG: No <svg> element found');
  }

  // Check for scale factor metadata
  const metadata = svgDoc.querySelector('metadata building-data scale-factor');
  const hasScaleFactor = Boolean(
    metadata || svgDoc.querySelector('metadata')?.textContent?.includes('scale-factor')
  );
  const scaleFactor = hasScaleFactor ? SCALE_FACTOR : 1;

  // Extract canvas size
  const canvasSize = extractCanvasSize(svgElement, scaleFactor);

  // Parse all elements
  const texts = Array.from(svgDoc.querySelectorAll('text'));
  const processedTextIndices = new Set<number>();

  const rectElements = parseRectElements(svgDoc, scaleFactor, texts, processedTextIndices);
  const polygonElements = parsePolygonElements(svgDoc, scaleFactor, texts, processedTextIndices);
  const textElements = parseTextElements(texts, scaleFactor, processedTextIndices);

  return {
    elements: [...rectElements, ...polygonElements, ...textElements],
    canvasSize,
    wasScaled: hasScaleFactor,
  };
}

/**
 * Extract canvas size from SVG viewBox or dimensions
 */
function extractCanvasSize(svgElement: Element, scaleFactor: number): CanvasSize {
  const viewBox = svgElement.getAttribute('viewBox');

  if (viewBox) {
    const [, , width, height] = viewBox.split(' ').map(Number);
    return { width: width * scaleFactor, height: height * scaleFactor };
  }

  const width = Number(svgElement.getAttribute('width')) || DEFAULT_CANVAS_SIZE.width;
  const height = Number(svgElement.getAttribute('height')) || DEFAULT_CANVAS_SIZE.height;

  return { width: width * scaleFactor, height: height * scaleFactor };
}

/**
 * Extract rotation from parent <g> transform
 */
function getGroupRotation(element: Element): number {
  const parent = element.parentElement;
  if (parent?.tagName === 'g') {
    const transform = parent.getAttribute('transform') || '';
    const rotateMatch = transform.match(/rotate\(\s*([\d.-]+)/);
    if (rotateMatch) {
      return parseFloat(rotateMatch[1]);
    }
  }
  return 0;
}

/**
 * Parse rectangle elements
 */
function parseRectElements(
  doc: Document,
  scaleFactor: number,
  texts: Element[],
  processedTextIndices: Set<number>
): SvgElement[] {
  const rects = Array.from(doc.querySelectorAll('rect'));
  const elements: SvgElement[] = [];

  rects.forEach((rect, index) => {
    const x = (Number(rect.getAttribute('x')) || 0) * scaleFactor;
    const y = (Number(rect.getAttribute('y')) || 0) * scaleFactor;
    const width = (Number(rect.getAttribute('width')) || 100) * scaleFactor;
    const height = (Number(rect.getAttribute('height')) || 80) * scaleFactor;
    const centerX = x + width / 2;
    const centerY = y + height / 2;

    // Find and mark associated text labels
    const label = findElementLabel(texts, centerX, centerY, scaleFactor, processedTextIndices);
    markAssociatedTexts(texts, x, y, width, height, centerX, scaleFactor, processedTextIndices);

    elements.push({
      id: `rect-${index}-${Date.now()}`,
      type: 'rect',
      x,
      y,
      width,
      height,
      fill: rect.getAttribute('fill') || '#e0e0e0',
      stroke: rect.getAttribute('stroke') || '#333333',
      strokeWidth: (Number(rect.getAttribute('stroke-width')) || 2) * scaleFactor,
      rotation: getGroupRotation(rect) || undefined,
      apartmentId: rect.getAttribute('data-apartment-id') || undefined,
      apartmentType: rect.getAttribute('data-apartment-type') || undefined,
      apartmentName: rect.getAttribute('data-apartment-name') || undefined,
      utilityType: rect.getAttribute('data-utility-type') || undefined,
      bedroomCount: rect.getAttribute('data-bedrooms') ? Number(rect.getAttribute('data-bedrooms')) : undefined,
      bathroomCount: rect.getAttribute('data-bathrooms') ? Number(rect.getAttribute('data-bathrooms')) : undefined,
      livingRoomCount: rect.getAttribute('data-living-rooms') ? Number(rect.getAttribute('data-living-rooms')) : undefined,
      logiaCount: rect.getAttribute('data-logia-count') ? Number(rect.getAttribute('data-logia-count')) : undefined,
      multipurposeRooms: rect.getAttribute('data-mprooms') ? Number(rect.getAttribute('data-mprooms')) : undefined,
      kitchenType: (rect.getAttribute('data-kitchen-type') as 'open' | 'closed') || undefined,
      viewDescription: rect.getAttribute('data-view-desc') || undefined,
      label,
    });
  });

  return elements;
}

/**
 * Parse polygon elements
 */
function parsePolygonElements(
  doc: Document,
  scaleFactor: number,
  texts: Element[],
  processedTextIndices: Set<number>
): SvgElement[] {
  const polygons = Array.from(doc.querySelectorAll('polygon'));
  const elements: SvgElement[] = [];

  polygons.forEach((polygon, index) => {
    const pointsStr = polygon.getAttribute('points') || '';
    const apartmentType = polygon.getAttribute('data-apartment-type');

    // Scale polygon points
    const scaledPoints = pointsStr
      .split(' ')
      .map((pair) => {
        const [x, y] = pair.split(',').map(Number);
        return `${x * scaleFactor},${y * scaleFactor}`;
      })
      .join(' ');

    // Calculate bounding box
    const points = scaledPoints.split(' ').map((pair) => {
      const [x, y] = pair.split(',').map(Number);
      return { x, y };
    });

    const xs = points.map((p) => p.x);
    const ys = points.map((p) => p.y);
    const minX = Math.min(...xs);
    const minY = Math.min(...ys);
    const maxX = Math.max(...xs);
    const maxY = Math.max(...ys);
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;

    // Find label and mark associated texts
    const label = findPolygonLabel(texts, cx, cy, scaleFactor, processedTextIndices);
    markPolygonAssociatedTexts(texts, minX, minY, maxX, maxY, cx, scaleFactor, processedTextIndices);

    // Restore sub-rects if this is a known complex shape
    const subRects = restoreSubRects(apartmentType, minX, maxX, minY, maxY);

    elements.push({
      id: `polygon-${index}-${Date.now()}`,
      type: 'polygon',
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
      points: scaledPoints,
      fill: polygon.getAttribute('fill') || '#e0e0e0',
      stroke: polygon.getAttribute('stroke') || '#333333',
      strokeWidth: (Number(polygon.getAttribute('stroke-width')) || 2) * scaleFactor,
      rotation: getGroupRotation(polygon) || undefined,
      apartmentId: polygon.getAttribute('data-apartment-id') || undefined,
      apartmentType: apartmentType || undefined,
      apartmentName: polygon.getAttribute('data-apartment-name') || undefined,
      bedroomCount: polygon.getAttribute('data-bedrooms') ? Number(polygon.getAttribute('data-bedrooms')) : undefined,
      bathroomCount: polygon.getAttribute('data-bathrooms') ? Number(polygon.getAttribute('data-bathrooms')) : undefined,
      livingRoomCount: polygon.getAttribute('data-living-rooms') ? Number(polygon.getAttribute('data-living-rooms')) : undefined,
      logiaCount: polygon.getAttribute('data-logia-count') ? Number(polygon.getAttribute('data-logia-count')) : undefined,
      multipurposeRooms: polygon.getAttribute('data-mprooms') ? Number(polygon.getAttribute('data-mprooms')) : undefined,
      kitchenType: (polygon.getAttribute('data-kitchen-type') as 'open' | 'closed') || undefined,
      viewDescription: polygon.getAttribute('data-view-desc') || undefined,
      label,
      subRects,
    });
  });

  return elements;
}

/**
 * Parse standalone text elements
 */
function parseTextElements(
  texts: Element[],
  scaleFactor: number,
  processedTextIndices: Set<number>
): SvgElement[] {
  const elements: SvgElement[] = [];

  texts.forEach((text, index) => {
    if (processedTextIndices.has(index)) return;

    const content = text.textContent?.trim();
    if (!content) return;

    elements.push({
      id: `text-${index}-${Date.now()}`,
      type: 'text',
      x: (Number(text.getAttribute('x')) || 0) * scaleFactor,
      y: (Number(text.getAttribute('y')) || 0) * scaleFactor,
      fill: text.getAttribute('fill') || '#333333',
      stroke: '#000000',
      strokeWidth: 1,
      text: content,
    });
  });

  return elements;
}

// =============================================================================
// Text Finding Helpers
// =============================================================================

function findElementLabel(
  texts: Element[],
  centerX: number,
  centerY: number,
  scaleFactor: number,
  processedTextIndices: Set<number>
): string | undefined {
  const hasScaleFactor = scaleFactor > 1;
  let label: string | undefined;

  texts.forEach((text, textIndex) => {
    const textX = (Number(text.getAttribute('x')) || 0) * scaleFactor;
    const textY = (Number(text.getAttribute('y')) || 0) * scaleFactor;
    const textAnchor = text.getAttribute('text-anchor');
    const fontSize = Number(text.getAttribute('font-size')) || 14;
    const fontWeight = text.getAttribute('font-weight');

    const isLabel =
      textAnchor === 'middle' &&
      Math.abs(textX - centerX) < 5 * scaleFactor &&
      Math.abs(textY - centerY) < 5 * scaleFactor &&
      fontSize >= (hasScaleFactor ? 1.4 : 14) &&
      fontWeight === 'bold';

    if (isLabel && !processedTextIndices.has(textIndex)) {
      label = text.textContent || undefined;
      processedTextIndices.add(textIndex);
    }
  });

  return label;
}

function markAssociatedTexts(
  texts: Element[],
  x: number,
  y: number,
  width: number,
  height: number,
  centerX: number,
  scaleFactor: number,
  processedTextIndices: Set<number>
): void {
  texts.forEach((text, textIndex) => {
    if (processedTextIndices.has(textIndex)) return;

    const textX = (Number(text.getAttribute('x')) || 0) * scaleFactor;
    const textY = (Number(text.getAttribute('y')) || 0) * scaleFactor;
    const textAnchor = text.getAttribute('text-anchor');

    if (Math.abs(textX - centerX) < 5 * scaleFactor) {
      if (textY >= y - 5 * scaleFactor && textY <= y + height + 5 * scaleFactor) {
        if (textAnchor === 'middle') {
          processedTextIndices.add(textIndex);
        }
      }
    }
  });
}

function findPolygonLabel(
  texts: Element[],
  cx: number,
  cy: number,
  scaleFactor: number,
  processedTextIndices: Set<number>
): string | undefined {
  let label: string | undefined;

  texts.forEach((text, textIndex) => {
    const textX = (Number(text.getAttribute('x')) || 0) * scaleFactor;
    const textY = (Number(text.getAttribute('y')) || 0) * scaleFactor;
    const fontWeight = text.getAttribute('font-weight');
    const textAnchor = text.getAttribute('text-anchor');

    if (
      textAnchor === 'middle' &&
      fontWeight === 'bold' &&
      Math.abs(textX - cx) < 5 * scaleFactor &&
      Math.abs(textY - cy) < 5 * scaleFactor
    ) {
      label = text.textContent || undefined;
    }
  });

  return label;
}

function markPolygonAssociatedTexts(
  texts: Element[],
  minX: number,
  minY: number,
  maxX: number,
  maxY: number,
  cx: number,
  scaleFactor: number,
  processedTextIndices: Set<number>
): void {
  texts.forEach((text, textIndex) => {
    if (processedTextIndices.has(textIndex)) return;

    const textX = (Number(text.getAttribute('x')) || 0) * scaleFactor;
    const textY = (Number(text.getAttribute('y')) || 0) * scaleFactor;
    const textAnchor = text.getAttribute('text-anchor');

    if (Math.abs(textX - cx) < 5 * scaleFactor) {
      if (textY >= minY - 5 * scaleFactor && textY <= maxY + 5 * scaleFactor) {
        if (textAnchor === 'middle') {
          processedTextIndices.add(textIndex);
        }
      }
    }
  });
}

function restoreSubRects(
  apartmentType: string | null,
  minX: number,
  maxX: number,
  minY: number,
  maxY: number
): RectArea[] | undefined {
  if (!apartmentType) return undefined;

  const templateTypeId = getTemplateTypeId(apartmentType);
  if (!templateTypeId || !TEMPLATE_SUB_RECTS[templateTypeId]) return undefined;

  const template = COMPLEX_APARTMENT_TEMPLATES.find((t) => t.id === templateTypeId);
  if (!template) return undefined;

  return scaleSubRects(
    TEMPLATE_SUB_RECTS[templateTypeId],
    template.width,
    template.height,
    maxX - minX,
    maxY - minY
  );
}

// =============================================================================
// SVG Export (Generator)
// =============================================================================

export interface ExportSvgOptions {
  elements: SvgElement[];
  canvasSize: CanvasSize;
  floorHeight: number;
  buildingId?: string;
}

/**
 * Generate SVG content from elements
 */
export function generateSvgContent(options: ExportSvgOptions): string {
  const { elements, canvasSize, floorHeight, buildingId } = options;

  const scaledWidth = canvasSize.width / SCALE_FACTOR;
  const scaledHeight = canvasSize.height / SCALE_FACTOR;

  const elementsSvg = elements.map((el) => generateElementSvg(el)).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${scaledWidth}" height="${scaledHeight}" viewBox="0 0 ${scaledWidth} ${scaledHeight}" xmlns="http://www.w3.org/2000/svg">
  <!-- Metadata Block -->
  <metadata>
    <building-data>
      <floor-height>${floorHeight}</floor-height>
      <scale-factor>${SCALE_FACTOR}</scale-factor>
      <units>meters</units>
      <created-at>${new Date().toISOString()}</created-at>
      <building-id>${buildingId || 'unknown'}</building-id>
      <apartments>
        ${elements
          .filter((el) => el.apartmentId)
          .map(
            (el) => `
        <apartment 
          id="${el.apartmentId}" 
          type="${el.apartmentType || 'unknown'}" 
          name="${el.apartmentName || ''}" 
          label="${el.label || ''}"
          area-sqm="${computeAreaSqm(el).toFixed(1)}"
        />`
          )
          .join('')}
      </apartments>
      <utilities>
        ${elements
          .filter((el) => el.utilityType)
          .map(
            (el) => `
        <utility 
          type="${el.utilityType}" 
          name="${el.label || ''}"
        />`
          )
          .join('')}
      </utilities>
    </building-data>
  </metadata>
  <g id="floor-plan">
${elementsSvg}
  </g>
</svg>`;
}

/**
 * Generate SVG markup for a single element
 */
function generateElementSvg(el: SvgElement): string {
  const scaledX = el.x / SCALE_FACTOR;
  const scaledY = el.y / SCALE_FACTOR;
  const scaledWidth = (el.width || 0) / SCALE_FACTOR;
  const scaledHeight = (el.height || 0) / SCALE_FACTOR;
  const scaledStrokeWidth = el.strokeWidth / SCALE_FACTOR;
  const areaSqm = computeAreaSqm(el);

  if (el.type === 'rect') {
    return generateRectSvg(el, scaledX, scaledY, scaledWidth, scaledHeight, scaledStrokeWidth, areaSqm);
  }

  if (el.type === 'polygon') {
    return generatePolygonSvg(el, scaledX, scaledY, scaledWidth, scaledHeight, scaledStrokeWidth, areaSqm);
  }

  if (el.type === 'circle') {
    const scaledRadius = (el.radius || 0) / SCALE_FACTOR;
    return `    <circle 
      ${el.apartmentId ? `data-apartment-id="${el.apartmentId}" ` : ''}cx="${scaledX}" 
      cy="${scaledY}" 
      r="${scaledRadius}" 
      fill="${el.fill}" 
      stroke="${el.stroke}" 
      stroke-width="${scaledStrokeWidth}"
    />`;
  }

  if (el.type === 'text') {
    return `    <text x="${scaledX}" y="${scaledY}" font-size="1.4" fill="${el.fill}">${el.text}</text>`;
  }

  return '';
}

function generateRectSvg(
  el: SvgElement,
  scaledX: number,
  scaledY: number,
  scaledWidth: number,
  scaledHeight: number,
  scaledStrokeWidth: number,
  areaSqm: number
): string {
  const dataAttrs = [
    el.apartmentId ? `data-apartment-id="${el.apartmentId}"` : '',
    el.apartmentType ? `data-apartment-type="${el.apartmentType}"` : '',
    el.apartmentName ? `data-apartment-name="${el.apartmentName}"` : '',
    el.utilityType ? `data-utility-type="${el.utilityType}"` : '',
    el.utilityType && el.label ? `data-utility-name="${el.label}"` : '',
    areaSqm > 0 ? `data-area-sqm="${areaSqm.toFixed(1)}"` : '',
    el.bedroomCount != null ? `data-bedrooms="${el.bedroomCount}"` : '',
    el.bathroomCount != null ? `data-bathrooms="${el.bathroomCount}"` : '',
    el.livingRoomCount != null ? `data-living-rooms="${el.livingRoomCount}"` : '',
    el.logiaCount != null ? `data-logia-count="${el.logiaCount}"` : '',
    el.multipurposeRooms != null ? `data-mprooms="${el.multipurposeRooms}"` : '',
    el.kitchenType ? `data-kitchen-type="${el.kitchenType}"` : '',
    el.viewDescription ? `data-view-desc="${el.viewDescription}"` : '',
  ]
    .filter(Boolean)
    .join(' ');

  const rectShape = `    <rect 
      ${dataAttrs}
      x="${scaledX}" 
      y="${scaledY}" 
      width="${scaledWidth}" 
      height="${scaledHeight}" 
      fill="${el.fill}" 
      stroke="${el.stroke}" 
      stroke-width="${scaledStrokeWidth}"
      rx="${0.4}"
    />`;

  const rotation = el.rotation || 0;
  const textCx = scaledX + scaledWidth / 2;
  const textCy = scaledY + scaledHeight / 2;
  const counterRotate = rotation ? ` transform="rotate(${-rotation} ${textCx} ${textCy})"` : '';

  const textElements = [
    el.apartmentType
      ? `<text x="${textCx}" y="${scaledY + 2}" text-anchor="middle" font-size="1.2" fill="#666" opacity="0.5"${counterRotate}>${el.apartmentType}</text>`
      : '',
    el.label
      ? `<text x="${textCx}" y="${textCy + (el.apartmentType ? 0.5 : 0)}" text-anchor="middle" font-size="1.6" font-weight="bold" fill="#333"${counterRotate}>${el.label}</text>`
      : '',
    el.apartmentName
      ? `<text x="${textCx}" y="${scaledY + scaledHeight - 1}" text-anchor="middle" font-size="1" fill="#666" opacity="0.7"${counterRotate}>${el.apartmentName}</text>`
      : '',
  ].filter(Boolean);

  const allContent = [rectShape, ...textElements.map((t) => `    ${t}`)].join('\n');

  if (el.rotation) {
    const cx = scaledX + scaledWidth / 2;
    const cy = scaledY + scaledHeight / 2;
    return `    <g transform="rotate(${el.rotation} ${cx} ${cy})">\n${allContent}\n    </g>`;
  }

  return allContent;
}

function generatePolygonSvg(
  el: SvgElement,
  scaledX: number,
  scaledY: number,
  scaledWidth: number,
  scaledHeight: number,
  scaledStrokeWidth: number,
  areaSqm: number
): string {
  const scaledPoints =
    el.points
      ?.split(' ')
      .map((pair) => {
        const [x, y] = pair.split(',').map(Number);
        return `${x / SCALE_FACTOR},${y / SCALE_FACTOR}`;
      })
      .join(' ') || '';

  const dataAttrs = [
    el.apartmentId ? `data-apartment-id="${el.apartmentId}"` : '',
    el.apartmentType ? `data-apartment-type="${el.apartmentType}"` : '',
    el.apartmentName ? `data-apartment-name="${el.apartmentName}"` : '',
    areaSqm > 0 ? `data-area-sqm="${areaSqm.toFixed(1)}"` : '',
    el.bedroomCount != null ? `data-bedrooms="${el.bedroomCount}"` : '',
    el.bathroomCount != null ? `data-bathrooms="${el.bathroomCount}"` : '',
    el.livingRoomCount != null ? `data-living-rooms="${el.livingRoomCount}"` : '',
    el.logiaCount != null ? `data-logia-count="${el.logiaCount}"` : '',
    el.multipurposeRooms != null ? `data-mprooms="${el.multipurposeRooms}"` : '',
    el.kitchenType ? `data-kitchen-type="${el.kitchenType}"` : '',
    el.viewDescription ? `data-view-desc="${el.viewDescription}"` : '',
  ]
    .filter(Boolean)
    .join(' ');

  const polygonShape = `    <polygon 
      ${dataAttrs}
      points="${scaledPoints}" 
      fill="${el.fill}" 
      stroke="${el.stroke}" 
      stroke-width="${scaledStrokeWidth}"
    />`;

  const rotation = el.rotation || 0;
  const textCx = scaledX + scaledWidth / 2;
  const textCy = scaledY + scaledHeight / 2;
  const counterRotate = rotation ? ` transform="rotate(${-rotation} ${textCx} ${textCy})"` : '';

  const textElements = [
    el.apartmentType
      ? `<text x="${textCx}" y="${scaledY + 2}" text-anchor="middle" font-size="1.2" fill="#666" opacity="0.5"${counterRotate}>${el.apartmentType}</text>`
      : '',
    el.label
      ? `<text x="${textCx}" y="${textCy}" text-anchor="middle" font-size="1.6" font-weight="bold" fill="#333"${counterRotate}>${el.label}</text>`
      : '',
    el.apartmentName
      ? `<text x="${textCx}" y="${scaledY + scaledHeight - 1}" text-anchor="middle" font-size="1" fill="#666" opacity="0.7"${counterRotate}>${el.apartmentName}</text>`
      : '',
  ].filter(Boolean);

  const allContent = [polygonShape, ...textElements.map((t) => `    ${t}`)].join('\n');

  if (el.rotation) {
    const cx = scaledX + scaledWidth / 2;
    const cy = scaledY + scaledHeight / 2;
    return `    <g transform="rotate(${el.rotation} ${cx} ${cy})">\n${allContent}\n    </g>`;
  }

  return allContent;
}
