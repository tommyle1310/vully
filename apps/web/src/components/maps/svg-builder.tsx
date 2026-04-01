'use client';

/**
 * SVG Floor Plan Builder - Metric Scale System
 * 
 * Scale Factor: 10 builder units = 1 meter (1 unit = 0.1m = 10cm)
 * 
 * This ensures:
 * - Easy manipulation in the UI (apartments appear as 60-100 units instead of 6-10 units)
 * - Realistic dimensions when exported (automatically converted to meters)
 * - Proper 3D rendering (Three.js uses the meter-based SVG directly)
 * 
 * Examples:
 * - Studio apartment: 60×50 builder units = 6m×5m = 30m² in real life
 * - 3BR apartment: 100×100 builder units = 10m×10m = 100m² in real life
 * - Elevator: 25×25 builder units = 2.5m×2.5m in real life
 * 
 * When saving/exporting:
 * - All coordinates are divided by SCALE_FACTOR (10)
 * - SVG dimensions are in meters (e.g., width="200" means 200 meters)
 * - Metadata includes scale-factor tag for proper loading
 * 
 * When loading existing SVG:
 * - Checks for scale-factor metadata
 * - Multiplies all coordinates by SCALE_FACTOR to restore builder scale
 * - Maintains proper proportions for editing
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Square,
  Circle,
  Pentagon,
  Type,
  Download,
  Upload,
  Trash2,
  Copy,
  Grid3x3,
  Move,
  ZoomIn,
  ZoomOut,
  Undo,
  Redo,
  RotateCw,
  AlertCircle,
  BoxSelect,
  Columns,
  Zap,
  Droplet,
  ArrowUpDown,
  Trash,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

interface RectArea {
  id: string;
  width: number;
  height: number;
  x: number;
  y: number;
  label?: string;
}

interface SvgElement {
  id: string;
  type: 'rect' | 'circle' | 'polygon' | 'text' | 'template';
  x: number;
  y: number;
  width?: number;
  height?: number;
  radius?: number;
  points?: string;
  text?: string;
  fill: string;
  stroke: string;
  strokeWidth: number;
  rotation?: number;
  apartmentId?: string;
  apartmentType?: string; // Studio, 1BR, 2BR, 3BR, L-Shaped, etc.
  apartmentName?: string; // Custom name given by user
  label?: string;
  utilityType?: string; // elevator, stairwell, electric, trash, water
  subRects?: RectArea[];
}

interface SvgBuilderProps {
  initialSvg?: string;
  onSave?: (svgContent: string) => void;
  buildingId?: string;
}

// Scale factor: 10 builder units = 1 meter (1 unit = 0.1m = 10cm)
// This allows realistic dimensions while maintaining easy manipulation in the UI
const SCALE_FACTOR = 10;

const APARTMENT_TEMPLATES = [
  {
    id: 'studio',
    name: 'Studio',
    type: 'rect' as const,
    width: 60,  // 6m × 5m = 30m²
    height: 50,
    icon: Square,
  },
  {
    id: '1br',
    name: '1 Bedroom',
    type: 'rect' as const,
    width: 70,  // 7m × 8m = 56m²
    height: 80,
    icon: Square,
  },
  {
    id: '2br',
    name: '2 Bedroom',
    type: 'rect' as const,
    width: 90,  // 9m × 9m = 81m²
    height: 90,
    icon: Square,
  },
  {
    id: '3br',
    name: '3 Bedroom',
    type: 'rect' as const,
    width: 100,  // 10m × 10m = 100m²
    height: 100,
    icon: Square,
  },
];

const COMPLEX_APARTMENT_TEMPLATES = [
  {
    id: 'l-shape',
    name: 'L-Shaped',
    type: 'polygon' as const,
    points: '0,0 60,0 60,50 100,50 100,110 0,110',  // ~70m² L-shape
    icon: BoxSelect,
    width: 100,  // 10m
    height: 110, // 11m
  },
  {
    id: 'u-shape',
    name: 'U-Shaped',
    type: 'polygon' as const,
    points: '0,0 30,0 30,80 70,80 70,0 100,0 100,100 0,100',  // ~80m² U-shape
    icon: Columns,
    width: 100,  // 10m
    height: 100, // 10m
  },
  {
    id: 't-shape',
    name: 'T-Shaped',
    type: 'polygon' as const,
    points: '0,0 120,0 120,50 90,50 90,90 30,90 30,50 0,50',  // ~75m² T-shape
    icon: BoxSelect,
    width: 120,  // 12m
    height: 90,  // 9m
  },
];

const UTILITY_TEMPLATES = [
  {
    id: 'elevator',
    name: 'Elevator',
    type: 'rect' as const,
    width: 25,   // 2.5m × 2.5m
    height: 25,
    fill: '#9ca3af',
    icon: ArrowUpDown,
    iconColor: '#1f2937',
  },
  {
    id: 'stairwell',
    name: 'Stairwell',
    type: 'rect' as const,
    width: 35,   // 3.5m × 5m
    height: 50,
    fill: '#bfdbfe',
    icon: Pentagon, // Using Pentagon as substitute for stairs
    iconColor: '#1e40af',
  },
  {
    id: 'electric',
    name: 'Electric Room',
    type: 'rect' as const,
    width: 30,   // 3m × 2.5m
    height: 25,
    fill: '#fef08a',
    icon: Zap,
    iconColor: '#ca8a04',
  },
  {
    id: 'trash',
    name: 'Trash Room',
    type: 'rect' as const,
    width: 30,   // 3m × 3m
    height: 30,
    fill: '#d1d5db',
    icon: Trash,
    iconColor: '#78716c',
  },
  {
    id: 'water',
    name: 'Water Room',
    type: 'rect' as const,
    width: 30,   // 3m × 2.5m
    height: 25,
    fill: '#a5f3fc',
    icon: Droplet,
    iconColor: '#0e7490',
  },
];

// Sub-rect decompositions for complex shapes (relative coordinates)
const TEMPLATE_SUB_RECTS: Record<string, RectArea[]> = {
  'l-shape': [
    { id: 'a', x: 0, y: 0, width: 60, height: 110, label: 'Left' },
    { id: 'b', x: 60, y: 50, width: 40, height: 60, label: 'Right' },
  ],
  'u-shape': [
    { id: 'a', x: 0, y: 0, width: 30, height: 100, label: 'Left Pillar' },
    { id: 'b', x: 70, y: 0, width: 30, height: 100, label: 'Right Pillar' },
    { id: 'c', x: 30, y: 80, width: 40, height: 20, label: 'Bottom' },
  ],
  't-shape': [
    { id: 'a', x: 0, y: 0, width: 120, height: 50, label: 'Top Bar' },
    { id: 'b', x: 30, y: 50, width: 60, height: 40, label: 'Stem' },
  ],
};

function getTemplateTypeId(apartmentType: string): string | null {
  const mapping: Record<string, string> = {
    'L-Shaped': 'l-shape',
    'U-Shaped': 'u-shape',
    'T-Shaped': 't-shape',
  };
  return mapping[apartmentType] || null;
}

function computePolygonFromSubRects(templateType: string, subRects: RectArea[], offsetX: number, offsetY: number): string {
  const pts: Array<[number, number]> = [];

  if (templateType === 'l-shape') {
    const a = subRects.find(r => r.id === 'a')!;
    const b = subRects.find(r => r.id === 'b')!;
    pts.push(
      [a.x, a.y],
      [a.x + a.width, a.y],
      [a.x + a.width, b.y],
      [b.x + b.width, b.y],
      [b.x + b.width, a.y + a.height],
      [a.x, a.y + a.height],
    );
  } else if (templateType === 'u-shape') {
    const a = subRects.find(r => r.id === 'a')!;
    const b = subRects.find(r => r.id === 'b')!;
    const c = subRects.find(r => r.id === 'c')!;
    pts.push(
      [a.x, a.y],
      [a.x + a.width, a.y],
      [a.x + a.width, c.y],
      [b.x, c.y],
      [b.x, b.y],
      [b.x + b.width, b.y],
      [b.x + b.width, a.y + a.height],
      [a.x, a.y + a.height],
    );
  } else if (templateType === 't-shape') {
    const a = subRects.find(r => r.id === 'a')!;
    const b = subRects.find(r => r.id === 'b')!;
    pts.push(
      [a.x, a.y],
      [a.x + a.width, a.y],
      [a.x + a.width, a.y + a.height],
      [b.x + b.width, a.y + a.height],
      [b.x + b.width, b.y + b.height],
      [b.x, b.y + b.height],
      [b.x, a.y + a.height],
      [a.x, a.y + a.height],
    );
  }

  return pts.map(([x, y]) => `${x + offsetX},${y + offsetY}`).join(' ');
}

function updateSubRectWithConstraints(
  templateType: string,
  subRects: RectArea[],
  rectId: string,
  changes: Partial<Pick<RectArea, 'width' | 'height'>>
): RectArea[] {
  const updated = subRects.map(r => r.id === rectId ? { ...r, ...changes } : { ...r });

  if (templateType === 'l-shape') {
    const a = updated.find(r => r.id === 'a')!;
    const b = updated.find(r => r.id === 'b')!;
    // B connects to A's right edge, bottoms align
    b.x = a.width;
    b.y = a.height - b.height;
    if (b.y < 0) { b.height = a.height; b.y = 0; }
  } else if (templateType === 'u-shape') {
    const a = updated.find(r => r.id === 'a')!;
    const b = updated.find(r => r.id === 'b')!;
    const c = updated.find(r => r.id === 'c')!;
    // Pillar heights sync
    if (rectId === 'a') b.height = a.height;
    else if (rectId === 'b') a.height = b.height;
    // Ensure minimum gap between pillars
    if (b.x <= a.width + 10) b.x = a.width + 10;
    // Connector fills gap at bottom
    c.x = a.width;
    c.width = Math.max(10, b.x - a.width);
    c.y = a.height - c.height;
  } else if (templateType === 't-shape') {
    const a = updated.find(r => r.id === 'a')!;
    const b = updated.find(r => r.id === 'b')!;
    // Stem below bar, centered
    b.y = a.height;
    b.x = Math.max(0, (a.width - b.width) / 2);
    if (b.x + b.width > a.width) b.width = a.width;
  }

  return updated;
}

const GRID_SIZE = 10;  // 10 builder units = 1 meter
const DEFAULT_CANVAS_SIZE = { width: 2000, height: 1500 };  // 200m × 150m in real dimensions

/** Compute area in square meters for an element */
function computeAreaSqm(el: SvgElement): number {
  if (el.type === 'rect' && el.width && el.height) {
    return (el.width / SCALE_FACTOR) * (el.height / SCALE_FACTOR);
  }
  if (el.type === 'polygon' && el.subRects) {
    return el.subRects.reduce((sum, sr) => sum + (sr.width / SCALE_FACTOR) * (sr.height / SCALE_FACTOR), 0);
  }
  // Polygon without sub-rects: use bounding box as approximation
  if (el.type === 'polygon' && el.width && el.height) {
    return (el.width / SCALE_FACTOR) * (el.height / SCALE_FACTOR);
  }
  return 0;
}

export function SvgBuilder({ initialSvg, onSave, buildingId }: SvgBuilderProps) {
  const [elements, setElements] = useState<SvgElement[]>([]);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [activeTool, setActiveTool] = useState<'select' | 'rect' | 'text'>('select');
  const [canvasSize, setCanvasSize] = useState(DEFAULT_CANVAS_SIZE);
  const [zoom, setZoom] = useState(1);
  const [showGrid, setShowGrid] = useState(true);
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [panMode, setPanMode] = useState(false);
  const [viewBox, setViewBox] = useState({ x: 0, y: 0, width: DEFAULT_CANVAS_SIZE.width, height: DEFAULT_CANVAS_SIZE.height });
  const [floorHeight, setFloorHeight] = useState(3.0); // meters
  const [history, setHistory] = useState<SvgElement[][]>([[]]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 }); // Cursor offset within element
  const [clickedElement, setClickedElement] = useState(false); // Track if element was clicked
  const [isLoaded, setIsLoaded] = useState(false); // Track if initial SVG has been loaded
  
  const svgRef = useRef<SVGSVGElement>(null);
  const panClientStart = useRef({ x: 0, y: 0 });
  const { toast } = useToast();

  const selectedElement = elements.find((el) => el.id === selectedElementId);

  // Proper SVG coordinate mapping (accounts for viewBox, zoom, and actual rendered size)
  const getSVGCoordinates = useCallback((e: React.MouseEvent): { x: number; y: number } => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const rect = svg.getBoundingClientRect();
    return {
      x: viewBox.x + ((e.clientX - rect.left) / rect.width) * viewBox.width,
      y: viewBox.y + ((e.clientY - rect.top) / rect.height) * viewBox.height,
    };
  }, [viewBox]);

  // Load existing SVG on mount
  useEffect(() => {
    if (initialSvg && !isLoaded) {
      try {
        const parser = new DOMParser();
        const svgDoc = parser.parseFromString(initialSvg, 'image/svg+xml');
        const svgElement = svgDoc.querySelector('svg');
        
        if (!svgElement) {
          throw new Error('Invalid SVG');
        }

        // Check if SVG has scale factor metadata (means it's in meters, needs scaling up)
        const metadata = svgDoc.querySelector('metadata building-data scale-factor');
        const hasScaleFactor = metadata || svgDoc.querySelector('metadata')?.textContent?.includes('scale-factor');
        const scaleFactor = hasScaleFactor ? SCALE_FACTOR : 1; // Scale up if saved in meters

        // Extract canvas size from viewBox or width/height and scale UP for builder
        const viewBox = svgElement.getAttribute('viewBox');
        if (viewBox) {
          const [, , width, height] = viewBox.split(' ').map(Number);
          setCanvasSize({ width: width * scaleFactor, height: height * scaleFactor });
        } else {
          const width = Number(svgElement.getAttribute('width')) || DEFAULT_CANVAS_SIZE.width;
          const height = Number(svgElement.getAttribute('height')) || DEFAULT_CANVAS_SIZE.height;
          setCanvasSize({ width: width * scaleFactor, height: height * scaleFactor });
        }

        const loadedElements: SvgElement[] = [];
        const processedTextIndices = new Set<number>();

        // Parse groups that may wrap rotated elements
        const groups = Array.from(svgDoc.querySelectorAll('g[transform]'));
        const processedGroupChildren = new Set<Element>();
        
        // Parse rect elements (both standalone and inside <g> transform groups)
        const allRects = Array.from(svgDoc.querySelectorAll('rect'));
        const texts = Array.from(svgDoc.querySelectorAll('text'));

        // Helper to extract rotation from a parent <g> transform
        function getGroupRotation(element: Element): number {
          const parent = element.parentElement;
          if (parent && parent.tagName === 'g') {
            const transform = parent.getAttribute('transform') || '';
            const rotateMatch = transform.match(/rotate\(\s*([\d.-]+)/);
            if (rotateMatch) {
              return parseFloat(rotateMatch[1]);
            }
          }
          return 0;
        }

        allRects.forEach((rect, index) => {
          const apartmentId = rect.getAttribute('data-apartment-id');
          const apartmentType = rect.getAttribute('data-apartment-type');
          const apartmentName = rect.getAttribute('data-apartment-name');
          const utilityType = rect.getAttribute('data-utility-type');
          const rotation = getGroupRotation(rect);
          const x = (Number(rect.getAttribute('x')) || 0) * scaleFactor;
          const y = (Number(rect.getAttribute('y')) || 0) * scaleFactor;
          const width = (Number(rect.getAttribute('width')) || 100) * scaleFactor;
          const height = (Number(rect.getAttribute('height')) || 80) * scaleFactor;
          const fill = rect.getAttribute('fill') || '#e0e0e0';
          const stroke = rect.getAttribute('stroke') || '#333333';
          const strokeWidth = (Number(rect.getAttribute('stroke-width')) || 2) * scaleFactor;

          // Find associated text label (positioned at center of rectangle)
          const centerX = x + width / 2;
          const centerY = y + height / 2;
          let label: string | undefined;

          texts.forEach((text, textIndex) => {
            const textX = (Number(text.getAttribute('x')) || 0) * scaleFactor;
            const textY = (Number(text.getAttribute('y')) || 0) * scaleFactor;
            const textAnchor = text.getAttribute('text-anchor');
            const fontSize = Number(text.getAttribute('font-size')) || 14;
            const fontWeight = text.getAttribute('font-weight');

            // Check if text is centered on this rectangle (likely a label)
            const isLabel = textAnchor === 'middle' && 
                           Math.abs(textX - centerX) < 5 * scaleFactor && 
                           Math.abs(textY - centerY) < 5 * scaleFactor &&
                           fontSize >= (hasScaleFactor ? 1.4 : 14) &&
                           fontWeight === 'bold';

            if (isLabel && !processedTextIndices.has(textIndex)) {
              label = text.textContent || undefined;
              processedTextIndices.add(textIndex); // Mark as processed
            }
          });

          // Also mark associated type/name text elements as processed
          texts.forEach((text, textIndex) => {
            if (processedTextIndices.has(textIndex)) return;
            const textX = (Number(text.getAttribute('x')) || 0) * scaleFactor;
            // Check if text is inside this rectangle's bounding area
            if (Math.abs(textX - centerX) < 5 * scaleFactor) {
              const textY = (Number(text.getAttribute('y')) || 0) * scaleFactor;
              if (textY >= y - 5 * scaleFactor && textY <= y + height + 5 * scaleFactor) {
                const textAnchor = text.getAttribute('text-anchor');
                if (textAnchor === 'middle') {
                  processedTextIndices.add(textIndex);
                }
              }
            }
          });

          loadedElements.push({
            id: `rect-${index}-${Date.now()}`,
            type: 'rect',
            x,
            y,
            width,
            height,
            fill,
            stroke,
            strokeWidth,
            rotation: rotation || undefined,
            apartmentId: apartmentId || undefined,
            apartmentType: apartmentType || undefined,
            apartmentName: apartmentName || undefined,
            utilityType: utilityType || undefined,
            label,
          });
        });

        // Parse polygons (complex shapes)
        const polygons = Array.from(svgDoc.querySelectorAll('polygon'));
        polygons.forEach((polygon, index) => {
          const apartmentId = polygon.getAttribute('data-apartment-id');
          const apartmentType = polygon.getAttribute('data-apartment-type');
          const apartmentName = polygon.getAttribute('data-apartment-name');
          const rotation = getGroupRotation(polygon);
          const pointsStr = polygon.getAttribute('points') || '';
          const fill = polygon.getAttribute('fill') || '#e0e0e0';
          const stroke = polygon.getAttribute('stroke') || '#333333';
          const strokeWidth = (Number(polygon.getAttribute('stroke-width')) || 2) * scaleFactor;

          // Scale polygon points
          const scaledPoints = pointsStr.split(' ').map(pair => {
            const [x, y] = pair.split(',').map(Number);
            return `${x * scaleFactor},${y * scaleFactor}`;
          }).join(' ');

          // Calculate bounding box for positioning
          const points = scaledPoints.split(' ').map(pair => {
            const [x, y] = pair.split(',').map(Number);
            return { x, y };
          });
          const xs = points.map(p => p.x);
          const ys = points.map(p => p.y);
          const minX = Math.min(...xs);
          const minY = Math.min(...ys);
          const maxX = Math.max(...xs);
          const maxY = Math.max(...ys);

          // Mark associated text elements as processed
          const cx = (minX + maxX) / 2;
          const cy = (minY + maxY) / 2;
          texts.forEach((text, textIndex) => {
            if (processedTextIndices.has(textIndex)) return;
            const textX = (Number(text.getAttribute('x')) || 0) * scaleFactor;
            if (Math.abs(textX - cx) < 5 * scaleFactor) {
              const textY = (Number(text.getAttribute('y')) || 0) * scaleFactor;
              if (textY >= minY - 5 * scaleFactor && textY <= maxY + 5 * scaleFactor) {
                const textAnchor = text.getAttribute('text-anchor');
                if (textAnchor === 'middle') {
                  // Try to extract label
                  const fontWeight = text.getAttribute('font-weight');
                  if (fontWeight === 'bold' && !processedTextIndices.has(textIndex)) {
                    // This is the label
                  }
                  processedTextIndices.add(textIndex);
                }
              }
            }
          });

          // Try to find label text
          let label: string | undefined;
          texts.forEach((text, textIndex) => {
            const textX = (Number(text.getAttribute('x')) || 0) * scaleFactor;
            const textY = (Number(text.getAttribute('y')) || 0) * scaleFactor;
            const fontWeight = text.getAttribute('font-weight');
            const textAnchor = text.getAttribute('text-anchor');
            if (textAnchor === 'middle' && fontWeight === 'bold' &&
                Math.abs(textX - cx) < 5 * scaleFactor &&
                Math.abs(textY - cy) < 5 * scaleFactor) {
              label = text.textContent || undefined;
            }
          });

          // Restore sub-rects from template if this is a known shape type
          let subRects: RectArea[] | undefined;
          if (apartmentType) {
            const templateTypeId = getTemplateTypeId(apartmentType);
            if (templateTypeId && TEMPLATE_SUB_RECTS[templateTypeId]) {
              // Scale the template sub-rects proportionally
              const templateSubRects = TEMPLATE_SUB_RECTS[templateTypeId];
              const template = COMPLEX_APARTMENT_TEMPLATES.find(t => t.id === templateTypeId);
              if (template) {
                const scaleX = (maxX - minX) / template.width;
                const scaleY = (maxY - minY) / template.height;
                subRects = templateSubRects.map(sr => ({
                  ...sr,
                  x: Math.round(sr.x * scaleX),
                  y: Math.round(sr.y * scaleY),
                  width: Math.round(sr.width * scaleX),
                  height: Math.round(sr.height * scaleY),
                }));
              }
            }
          }

          loadedElements.push({
            id: `polygon-${index}-${Date.now()}`,
            type: 'polygon',
            x: minX,
            y: minY,
            width: maxX - minX,
            height: maxY - minY,
            points: scaledPoints,
            fill,
            stroke,
            strokeWidth,
            rotation: rotation || undefined,
            apartmentId: apartmentId || undefined,
            apartmentType: apartmentType || undefined,
            apartmentName: apartmentName || undefined,
            label,
            subRects,
          });
        });

        // Parse remaining text elements (those not associated with rectangles)
        texts.forEach((text, index) => {
          if (processedTextIndices.has(index)) return; // Skip labels

          const x = (Number(text.getAttribute('x')) || 0) * scaleFactor;
          const y = (Number(text.getAttribute('y')) || 0) * scaleFactor;
          const fill = text.getAttribute('fill') || '#333333';
          const content = text.textContent || '';

          // Only add non-empty text elements
          if (content.trim()) {
            loadedElements.push({
              id: `text-${index}-${Date.now()}`,
              type: 'text',
              x,
              y,
              fill,
              stroke: '#000000',
              strokeWidth: 1,
              text: content,
            });
          }
        });

        if (loadedElements.length > 0) {
          setElements(loadedElements);
          setHistory([loadedElements]);
          setHistoryIndex(0);
          toast({
            title: 'Floor plan loaded',
            description: `Loaded ${rects.length + polygons.length} element${(rects.length + polygons.length) !== 1 ? 's' : ''} from existing floor plan${hasScaleFactor ? ' (scaled from meters)' : ''}`,
          });
        }
        
        setIsLoaded(true);
      } catch (err) {
        console.error('Failed to parse initial SVG:', err);
        toast({
          title: 'Warning',
          description: 'Failed to load existing floor plan. Starting with empty canvas.',
          variant: 'destructive',
        });
        setIsLoaded(true);
      }
    }
  }, [initialSvg, isLoaded, toast]);

  // Sync viewBox with canvasSize changes (e.g., after loading an SVG with different dimensions)
  useEffect(() => {
    setViewBox({ x: 0, y: 0, width: canvasSize.width, height: canvasSize.height });
  }, [canvasSize]);

  // Check for overlapping rectangles
  const checkOverlaps = useCallback((elementId: string): boolean => {
    const element = elements.find((el) => el.id === elementId);
    if (!element || element.type !== 'rect' || !element.apartmentId) return false;

    return elements.some((otherEl) => {
      if (
        otherEl.id === elementId ||
        otherEl.type !== 'rect' ||
        !otherEl.apartmentId
      ) {
        return false;
      }

      // Check rectangle overlap
      const el1 = {
        left: element.x,
        right: element.x + (element.width || 0),
        top: element.y,
        bottom: element.y + (element.height || 0),
      };
      const el2 = {
        left: otherEl.x,
        right: otherEl.x + (otherEl.width || 0),
        top: otherEl.y,
        bottom: otherEl.y + (otherEl.height || 0),
      };

      return !(
        el1.right <= el2.left ||
        el1.left >= el2.right ||
        el1.bottom <= el2.top ||
        el1.top >= el2.bottom
      );
    });
  }, [elements]);

  // Snap to grid helper
  const snapValue = useCallback(
    (value: number) => {
      if (!snapToGrid) return value;
      return Math.round(value / GRID_SIZE) * GRID_SIZE;
    },
    [snapToGrid]
  );

  // Add element to canvas
  const addElement = useCallback(
    (type: SvgElement['type'], x: number, y: number, options?: Partial<SvgElement>) => {
      const newElement: SvgElement = {
        id: `el-${Date.now()}`,
        type,
        x: snapValue(x),
        y: snapValue(y),
        fill: '#e0e0e0',
        stroke: '#333333',
        strokeWidth: 2,
        ...options,
      };

      if (type === 'rect') {
        newElement.width = options?.width || 150;
        newElement.height = options?.height || 100;
      } else if (type === 'circle') {
        newElement.radius = options?.radius || 50;
      } else if (type === 'text') {
        newElement.text = options?.text || 'Label';
        newElement.fill = '#333333';
      }

      const newElements = [...elements, newElement];
      setElements(newElements);
      setSelectedElementId(newElement.id);
      
      // Add to history
      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push(newElements);
      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
    },
    [elements, snapValue, history, historyIndex]
  );

  // Add apartment template
  const addApartmentTemplate = useCallback(
    (template: typeof APARTMENT_TEMPLATES[0] | typeof COMPLEX_APARTMENT_TEMPLATES[0]) => {
      const centerX = (canvasSize.width - template.width) / 2;
      const centerY = (canvasSize.height - template.height) / 2;

      if (template.type === 'rect') {
        addElement('rect', centerX, centerY, {
          width: template.width,
          height: template.height,
          apartmentId: `apt-${elements.length + 1}`,
          apartmentType: template.name,
          label: `${elements.length + 1}`,
        });
      } else if (template.type === 'polygon') {
        // Transform points relative to center position
        const transformedPoints = template.points
          .split(' ')
          .map(point => {
            const [x, y] = point.split(',').map(Number);
            return `${x + centerX},${y + centerY}`;
          })
          .join(' ');

        // Initialize sub-rects for editable shapes
        const templateSubRects = TEMPLATE_SUB_RECTS[template.id];

        addElement('polygon', centerX, centerY, {
          points: transformedPoints,
          width: template.width,
          height: template.height,
          apartmentId: `apt-${elements.length + 1}`,
          apartmentType: template.name,
          label: `${elements.length + 1}`,
          subRects: templateSubRects ? templateSubRects.map(r => ({ ...r })) : undefined,
        });
      }
    },
    [canvasSize, addElement, elements.length]
  );

  // Add utility room template
  const addUtilityTemplate = useCallback(
    (template: typeof UTILITY_TEMPLATES[0]) => {
      const centerX = (canvasSize.width - template.width) / 2;
      const centerY = (canvasSize.height - template.height) / 2;

      addElement('rect', centerX, centerY, {
        width: template.width,
        height: template.height,
        fill: template.fill,
        utilityType: template.id,
        label: template.name.charAt(0), // First letter as label (E, S, T, W)
      });
    },
    [canvasSize, addElement]
  );

  // Handle canvas click/drag start
  const handleCanvasMouseDown = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      const svg = svgRef.current;
      if (!svg) return;

      // Pan mode: start panning using screen coordinates
      if (panMode) {
        setIsDragging(true);
        panClientStart.current = { x: e.clientX, y: e.clientY };
        return;
      }

      // Don't deselect if we just clicked on an element
      if (clickedElement) {
        setClickedElement(false);
        return;
      }

      if (activeTool === 'select') {
        setSelectedElementId(null);
        return;
      }

      const { x, y } = getSVGCoordinates(e);

      if (activeTool === 'rect') {
        addElement('rect', x, y);
        setActiveTool('select');
      } else if (activeTool === 'text') {
        addElement('text', x, y);
        setActiveTool('select');
      }
    },
    [activeTool, addElement, clickedElement, panMode, getSVGCoordinates]
  );

  // Handle element drag
  const handleElementMouseDown = useCallback(
    (e: React.MouseEvent, elementId: string) => {
      e.stopPropagation();
      e.preventDefault(); // Prevent text selection

      // Don't allow element dragging in pan mode
      if (panMode) return;

      setSelectedElementId(elementId);
      setClickedElement(true); // Mark that we clicked an element
      setIsDragging(true);
      
      const element = elements.find((el) => el.id === elementId);
      if (!element) return;

      const { x: mouseX, y: mouseY } = getSVGCoordinates(e);

      // Store offset from element's top-left corner
      setDragOffset({
        x: mouseX - element.x,
        y: mouseY - element.y,
      });

      setDragStart({
        x: mouseX,
        y: mouseY,
      });
    },
    [elements, panMode, getSVGCoordinates]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (!isDragging) return;

      const svg = svgRef.current;
      if (!svg) return;

      // Pan mode: use screen-space deltas for correct viewBox updates
      if (panMode) {
        const rect = svg.getBoundingClientRect();
        const dxFrac = (e.clientX - panClientStart.current.x) / rect.width;
        const dyFrac = (e.clientY - panClientStart.current.y) / rect.height;

        setViewBox(prev => ({
          ...prev,
          x: prev.x - dxFrac * prev.width,
          y: prev.y - dyFrac * prev.height,
        }));

        panClientStart.current = { x: e.clientX, y: e.clientY };
        return;
      }

      // Normal mode: move selected element
      if (!selectedElementId) return;

      const element = elements.find((el) => el.id === selectedElementId);
      if (!element) return;

      const { x: currentX, y: currentY } = getSVGCoordinates(e);

      // Calculate new position keeping cursor offset constant
      const newX = snapValue(currentX - dragOffset.x);
      const newY = snapValue(currentY - dragOffset.y);

      const dx = newX - element.x;
      const dy = newY - element.y;

      const newElements = elements.map((el) => {
        if (el.id !== selectedElementId) return el;

        // For polygons, transform all points
        if (el.type === 'polygon' && el.points) {
          const transformedPoints = el.points
            .split(' ')
            .map(point => {
              const [x, y] = point.split(',').map(Number);
              return `${x + dx},${y + dy}`;
            })
            .join(' ');

          return {
            ...el,
            x: newX,
            y: newY,
            points: transformedPoints,
          };
        }

        // For other elements, just update x and y
        return {
          ...el,
          x: newX,
          y: newY,
        };
      });

      setElements(newElements);
    },
    [isDragging, selectedElementId, elements, dragOffset, snapValue, panMode, getSVGCoordinates]
  );

  const handleMouseUp = useCallback(() => {
    if (isDragging) {
      // Add to history when drag ends
      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push([...elements]);
      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
    }
    setIsDragging(false);
  }, [isDragging, elements, history, historyIndex]);

  // Update element property
  const updateElement = useCallback(
    (id: string, updates: Partial<SvgElement>) => {
      const newElements = elements.map((el) =>
        el.id === id ? { ...el, ...updates } : el
      );
      setElements(newElements);

      // Add to history
      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push(newElements);
      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
    },
    [elements, history, historyIndex]
  );

  // Delete element
  const deleteElement = useCallback(() => {
    if (!selectedElementId) return;

    const newElements = elements.filter((el) => el.id !== selectedElementId);
    setElements(newElements);
    setSelectedElementId(null);

    // Add to history
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newElements);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  }, [selectedElementId, elements, history, historyIndex]);

  // Duplicate element
  const duplicateElement = useCallback(() => {
    if (!selectedElementId) return;

    const element = elements.find((el) => el.id === selectedElementId);
    if (!element) return;

    const newElement = {
      ...element,
      id: `el-${Date.now()}`,
      x: element.x + 20,
      y: element.y + 20,
    };

    const newElements = [...elements, newElement];
    setElements(newElements);
    setSelectedElementId(newElement.id);

    // Add to history
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newElements);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  }, [selectedElementId, elements, history, historyIndex]);

  // Handle sub-rect change for rectilinear shapes
  const handleSubRectChange = useCallback((elementId: string, rectId: string, changes: Partial<Pick<RectArea, 'width' | 'height'>>) => {
    const element = elements.find(el => el.id === elementId);
    if (!element || !element.subRects || !element.apartmentType) return;

    const templateType = getTemplateTypeId(element.apartmentType);
    if (!templateType) return;

    const updatedSubRects = updateSubRectWithConstraints(templateType, element.subRects, rectId, changes);
    const newPoints = computePolygonFromSubRects(templateType, updatedSubRects, element.x, element.y);

    // Calculate new bounding box
    const allPts = newPoints.split(' ').map(p => {
      const [x, y] = p.split(',').map(Number);
      return { x, y };
    });
    const xs = allPts.map(p => p.x);
    const ys = allPts.map(p => p.y);
    const newWidth = Math.max(...xs) - Math.min(...xs);
    const newHeight = Math.max(...ys) - Math.min(...ys);

    updateElement(elementId, {
      subRects: updatedSubRects,
      points: newPoints,
      width: newWidth,
      height: newHeight,
    });
  }, [elements, updateElement]);

  // Undo/Redo
  const undo = useCallback(() => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setElements(history[historyIndex - 1]);
    }
  }, [historyIndex, history]);

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setElements(history[historyIndex + 1]);
    }
  }, [historyIndex, history]);

  // Keyboard shortcuts (Ctrl+Z, Ctrl+Y, Ctrl+Shift+Z, Delete)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        redo();
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        deleteElement();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, deleteElement]); // Dependencies for undo/redo/delete

  // Export SVG - scale down to real-world meters
  const exportSvg = useCallback(() => {
    // Scale all coordinates from builder units to meters
    const scaledWidth = canvasSize.width / SCALE_FACTOR;
    const scaledHeight = canvasSize.height / SCALE_FACTOR;

    const elementsSvg = elements.map((el) => {
      // Scale coordinates to meters
      const scaledX = el.x / SCALE_FACTOR;
      const scaledY = el.y / SCALE_FACTOR;
      const elScaledWidth = (el.width || 0) / SCALE_FACTOR;
      const elScaledHeight = (el.height || 0) / SCALE_FACTOR;
      const scaledStrokeWidth = el.strokeWidth / SCALE_FACTOR;
      const areaSqm = computeAreaSqm(el);

      if (el.type === 'rect') {
        // Build data attributes
        const dataAttrs = [
          el.apartmentId ? `data-apartment-id="${el.apartmentId}"` : '',
          el.apartmentType ? `data-apartment-type="${el.apartmentType}"` : '',
          el.apartmentName ? `data-apartment-name="${el.apartmentName}"` : '',
          el.utilityType ? `data-utility-type="${el.utilityType}"` : '',
          el.utilityType && el.label ? `data-utility-name="${el.label}"` : '',
          areaSqm > 0 ? `data-area-sqm="${areaSqm.toFixed(1)}"` : '',
        ].filter(Boolean).join(' ');

        const rectShape = `    <rect 
      ${dataAttrs}
      x="${scaledX}" 
      y="${scaledY}" 
      width="${elScaledWidth}" 
      height="${elScaledHeight}" 
      fill="${el.fill}" 
      stroke="${el.stroke}" 
      stroke-width="${scaledStrokeWidth}"
      rx="${0.4}"
    />`;

        // Text labels - counter-rotate if the shape is rotated
        const rotation = el.rotation || 0;
        const textCx = scaledX + elScaledWidth / 2;
        const textCy = scaledY + elScaledHeight / 2;
        const counterRotate = rotation ? ` transform="rotate(${-rotation} ${textCx} ${textCy})"` : '';
        
        const textElements = [
          el.apartmentType ? `<text x="${textCx}" y="${scaledY + 2}" text-anchor="middle" font-size="1.2" fill="#666" opacity="0.5"${counterRotate}>${el.apartmentType}</text>` : '',
          el.label ? `<text x="${textCx}" y="${textCy + (el.apartmentType ? 0.5 : 0)}" text-anchor="middle" font-size="1.6" font-weight="bold" fill="#333"${counterRotate}>${el.label}</text>` : '',
          el.apartmentName ? `<text x="${textCx}" y="${scaledY + elScaledHeight - 1}" text-anchor="middle" font-size="1" fill="#666" opacity="0.7"${counterRotate}>${el.apartmentName}</text>` : '',
        ].filter(Boolean);

        const allContent = [rectShape, ...textElements.map(t => `    ${t}`)].join('\n');

        if (el.rotation) {
          const cx = scaledX + elScaledWidth / 2;
          const cy = scaledY + elScaledHeight / 2;
          return `    <g transform="rotate(${el.rotation} ${cx} ${cy})">\n${allContent}\n    </g>`;
        }
        return allContent;
      } else if (el.type === 'polygon') {
        // Scale polygon points
        const scaledPoints = el.points?.split(' ').map(pair => {
          const [x, y] = pair.split(',').map(Number);
          return `${x / SCALE_FACTOR},${y / SCALE_FACTOR}`;
        }).join(' ') || '';

        // Build data attributes
        const dataAttrs = [
          el.apartmentId ? `data-apartment-id="${el.apartmentId}"` : '',
          el.apartmentType ? `data-apartment-type="${el.apartmentType}"` : '',
          el.apartmentName ? `data-apartment-name="${el.apartmentName}"` : '',
          areaSqm > 0 ? `data-area-sqm="${areaSqm.toFixed(1)}"` : '',
        ].filter(Boolean).join(' ');

        const polygonShape = `    <polygon 
      ${dataAttrs}
      points="${scaledPoints}" 
      fill="${el.fill}" 
      stroke="${el.stroke}" 
      stroke-width="${scaledStrokeWidth}"
    />`;

        // Text labels - counter-rotate if the shape is rotated
        const rotation = el.rotation || 0;
        const textCx = scaledX + elScaledWidth / 2;
        const textCy = scaledY + elScaledHeight / 2;
        const counterRotate = rotation ? ` transform="rotate(${-rotation} ${textCx} ${textCy})"` : '';

        const textElements = [
          el.apartmentType ? `<text x="${textCx}" y="${scaledY + 2}" text-anchor="middle" font-size="1.2" fill="#666" opacity="0.5"${counterRotate}>${el.apartmentType}</text>` : '',
          el.label ? `<text x="${textCx}" y="${textCy}" text-anchor="middle" font-size="1.6" font-weight="bold" fill="#333"${counterRotate}>${el.label}</text>` : '',
          el.apartmentName ? `<text x="${textCx}" y="${scaledY + elScaledHeight - 1}" text-anchor="middle" font-size="1" fill="#666" opacity="0.7"${counterRotate}>${el.apartmentName}</text>` : '',
        ].filter(Boolean);

        const allContent = [polygonShape, ...textElements.map(t => `    ${t}`)].join('\n');

        if (el.rotation) {
          const cx = scaledX + elScaledWidth / 2;
          const cy = scaledY + elScaledHeight / 2;
          return `    <g transform="rotate(${el.rotation} ${cx} ${cy})">\n${allContent}\n    </g>`;
        }
        return allContent;
      } else if (el.type === 'circle') {
        const scaledRadius = (el.radius || 0) / SCALE_FACTOR;
        return `    <circle 
      ${el.apartmentId ? `data-apartment-id="${el.apartmentId}" ` : ''}cx="${scaledX}" 
      cy="${scaledY}" 
      r="${scaledRadius}" 
      fill="${el.fill}" 
      stroke="${el.stroke}" 
      stroke-width="${scaledStrokeWidth}"
    />`;
      } else if (el.type === 'text') {
        return `    <text x="${scaledX}" y="${scaledY}" font-size="1.4" fill="${el.fill}">${el.text}</text>`;
      }
      return '';
    }).join('\n');
    
    const svgContent = `<?xml version="1.0" encoding="UTF-8"?>
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
        ${elements.filter(el => el.apartmentId).map(el => `
        <apartment 
          id="${el.apartmentId}" 
          type="${el.apartmentType || 'unknown'}" 
          name="${el.apartmentName || ''}" 
          label="${el.label || ''}"
          area-sqm="${computeAreaSqm(el).toFixed(1)}"
        />`).join('')}
      </apartments>
      <utilities>
        ${elements.filter(el => el.utilityType).map(el => `
        <utility 
          type="${el.utilityType}" 
          name="${el.label || ''}"
        />`).join('')}
      </utilities>
    </building-data>
  </metadata>
  <g id="floor-plan">
${elementsSvg}
  </g>
</svg>`;

    return svgContent;
  }, [elements, canvasSize, floorHeight, buildingId]);

  // Download SVG
  const downloadSvg = useCallback(() => {
    const svgContent = exportSvg();
    const blob = new Blob([svgContent], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const filename = buildingId 
      ? `floor-plan-${buildingId}-${Date.now()}.svg`
      : `floor-plan-${Date.now()}.svg`;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);

    const scaledWidth = (canvasSize.width / SCALE_FACTOR).toFixed(1);
    const scaledHeight = (canvasSize.height / SCALE_FACTOR).toFixed(1);
    
    toast({
      title: 'Success',
      description: `SVG floor plan downloaded (${scaledWidth}m × ${scaledHeight}m)`,
    });
  }, [exportSvg, toast, buildingId, canvasSize]);

  // Save SVG (callback to parent)
  const handleSave = useCallback(() => {
    const svgContent = exportSvg();
    onSave?.(svgContent);
  }, [exportSvg, onSave]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4 h-full w-full">
      {/* Canvas */}
      <Card className="flex flex-col h-full min-h-0">
        <CardHeader className="pb-3 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CardTitle className="text-lg">Floor Plan Builder</CardTitle>
              <div className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2.5 py-1 rounded-md text-xs font-medium">
                Scale: 10 units = 1 meter
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Undo/Redo */}
              <Button
                variant="ghost"
                size="sm"
                onClick={undo}
                disabled={historyIndex === 0}
              >
                <Undo className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={redo}
                disabled={historyIndex === history.length - 1}
              >
                <Redo className="h-4 w-4" />
              </Button>

              <Separator orientation="vertical" className="h-6" />

              {/* Zoom */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setZoom(Math.max(0.5, zoom - 0.1))}
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              <span className="text-sm min-w-[50px] text-center">
                {Math.round(zoom * 100)}%
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setZoom(Math.min(2, zoom + 0.1))}
              >
                <ZoomIn className="h-4 w-4" />
              </Button>

              <Separator orientation="vertical" className="h-6" />

              {/* Grid */}
              <Button
                variant={showGrid ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setShowGrid(!showGrid)}
              >
                <Grid3x3 className="h-4 w-4" />
              </Button>

              {/* Pan Mode */}
              <Button
                variant={panMode ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setPanMode(!panMode)}
                title="Pan Mode (move camera instead of elements)"
              >
                <Move className="h-4 w-4" />
              </Button>

              <Separator orientation="vertical" className="h-6" />

              {/* Download */}
              <Button variant="outline" size="sm" onClick={downloadSvg}>
                <Download className="h-4 w-4 mr-1" />
                Download
              </Button>
              {onSave && (
                <Button size="sm" onClick={handleSave}>
                  <Upload className="h-4 w-4 mr-1" />
                  Save
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4 flex-1 min-h-0 overflow-hidden">
          <div className="bg-muted/20 w-full h-full flex items-center justify-center overflow-auto rounded-md border">
            <svg
              ref={svgRef}
              width={canvasSize.width * zoom}
              height={canvasSize.height * zoom}
              viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`}
              className={`bg-white select-none ${panMode ? 'cursor-grab active:cursor-grabbing' : 'cursor-crosshair'}`}
              style={{ userSelect: 'none' }}
              onMouseDown={handleCanvasMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            >
              {/* Grid */}
              {showGrid && (
                <g opacity="0.1">
                  {Array.from({ length: canvasSize.width / GRID_SIZE }).map((_, i) => (
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
                  {Array.from({ length: canvasSize.height / GRID_SIZE }).map((_, i) => (
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
              )}

              {/* Elements */}
              {elements.map((el) => {
                const isSelected = el.id === selectedElementId;
                const hasOverlap = checkOverlaps(el.id);
                
                if (el.type === 'rect') {
                  const cx = el.x + (el.width || 0) / 2;
                  const cy = el.y + (el.height || 0) / 2;
                  const rotation = el.rotation || 0;
                  // Counter-rotate transform for text to keep it upright
                  const textCounterRotate = rotation ? `rotate(${-rotation} ${cx} ${cy})` : undefined;
                  return (
                    <g key={el.id} transform={rotation ? `rotate(${rotation} ${cx} ${cy})` : undefined}>
                      <rect
                        x={el.x}
                        y={el.y}
                        width={el.width}
                        height={el.height}
                        fill={el.fill}
                        stroke={hasOverlap ? '#ef4444' : (isSelected ? '#3b82f6' : el.stroke)}
                        strokeWidth={hasOverlap ? 3 : (isSelected ? el.strokeWidth + 1 : el.strokeWidth)}
                        rx={4}
                        className="cursor-move"
                        style={{ userSelect: 'none' }}
                        onMouseDown={(e) => handleElementMouseDown(e as any, el.id)}
                      />
                      {/* Apartment Type (low opacity) */}
                      {el.apartmentType && (
                        <text
                          x={cx}
                          y={el.y + 20}
                          textAnchor="middle"
                          fontSize="12"
                          fontWeight="normal"
                          fill="#666"
                          opacity="0.5"
                          pointerEvents="none"
                          style={{ userSelect: 'none' }}
                          transform={textCounterRotate}
                        >
                          {el.apartmentType}
                        </text>
                      )}
                      {/* Apartment Number/Label */}
                      {el.label && (
                        <text
                          x={cx}
                          y={cy + (el.apartmentType ? 5 : 0)}
                          textAnchor="middle"
                          fontSize="16"
                          fontWeight="bold"
                          fill="#333"
                          pointerEvents="none"
                          style={{ userSelect: 'none' }}
                          transform={textCounterRotate}
                        >
                          {el.label}
                        </text>
                      )}
                      {/* Apartment Name (if set) */}
                      {el.apartmentName && (
                        <text
                          x={cx}
                          y={el.y + (el.height || 0) - 10}
                          textAnchor="middle"
                          fontSize="10"
                          fontWeight="normal"
                          fill="#666"
                          opacity="0.7"
                          pointerEvents="none"
                          style={{ userSelect: 'none' }}
                          transform={textCounterRotate}
                        >
                          {el.apartmentName}
                        </text>
                      )}
                      {/* Overlap Warning Icon */}
                      {hasOverlap && (
                        <g>
                          <circle
                            cx={el.x + (el.width || 0) - 15}
                            cy={el.y + 15}
                            r="10"
                            fill="#ef4444"
                            pointerEvents="none"
                          />
                          <text
                            x={el.x + (el.width || 0) - 15}
                            y={el.y + 19}
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
                      )}
                    </g>
                  );
                } else if (el.type === 'circle') {
                  return (
                    <circle
                      key={el.id}
                      cx={el.x}
                      cy={el.y}
                      r={el.radius}
                      fill={el.fill}
                      stroke={isSelected ? '#3b82f6' : el.stroke}
                      strokeWidth={isSelected ? el.strokeWidth + 1 : el.strokeWidth}
                      className="cursor-move"
                      style={{ userSelect: 'none' }}
                      onMouseDown={(e) => handleElementMouseDown(e as any, el.id)}
                    />
                  );
                } else if (el.type === 'polygon') {
                  const pcx = el.x + (el.width || 0) / 2;
                  const pcy = el.y + (el.height || 0) / 2;
                  const rotation = el.rotation || 0;
                  const textCounterRotate = rotation ? `rotate(${-rotation} ${pcx} ${pcy})` : undefined;
                  return (
                    <g key={el.id} transform={rotation ? `rotate(${rotation} ${pcx} ${pcy})` : undefined}>
                      <polygon
                        points={el.points}
                        fill={el.fill}
                        stroke={hasOverlap ? '#ef4444' : (isSelected ? '#3b82f6' : el.stroke)}
                        strokeWidth={hasOverlap ? 3 : (isSelected ? el.strokeWidth + 1 : el.strokeWidth)}
                        className="cursor-move"
                        style={{ userSelect: 'none' }}
                        onMouseDown={(e) => handleElementMouseDown(e as any, el.id)}
                      />
                      {/* Apartment Type */}
                      {el.apartmentType && (
                        <text
                          x={pcx}
                          y={el.y + 20}
                          textAnchor="middle"
                          fontSize="12"
                          fontWeight="normal"
                          fill="#666"
                          opacity="0.5"
                          pointerEvents="none"
                          style={{ userSelect: 'none' }}
                          transform={textCounterRotate}
                        >
                          {el.apartmentType}
                        </text>
                      )}
                      {/* Label */}
                      {el.label && (
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
                          {el.label}
                        </text>
                      )}
                      {/* Apartment Name */}
                      {el.apartmentName && (
                        <text
                          x={pcx}
                          y={el.y + (el.height || 0) - 10}
                          textAnchor="middle"
                          fontSize="10"
                          fontWeight="normal"
                          fill="#666"
                          opacity="0.7"
                          pointerEvents="none"
                          style={{ userSelect: 'none' }}
                          transform={textCounterRotate}
                        >
                          {el.apartmentName}
                        </text>
                      )}
                      {/* Sub-rect boundaries (visible when selected) */}
                      {isSelected && el.subRects && el.subRects.map((sr) => (
                        <rect
                          key={sr.id}
                          x={el.x + sr.x}
                          y={el.y + sr.y}
                          width={sr.width}
                          height={sr.height}
                          fill="none"
                          stroke="#3b82f6"
                          strokeWidth={1}
                          strokeDasharray="4 2"
                          opacity={0.5}
                          pointerEvents="none"
                        />
                      ))}
                      {/* Overlap Warning */}
                      {hasOverlap && (
                        <g>
                          <circle
                            cx={el.x + (el.width || 0) - 15}
                            cy={el.y + 15}
                            r="10"
                            fill="#ef4444"
                            pointerEvents="none"
                          />
                          <text
                            x={el.x + (el.width || 0) - 15}
                            y={el.y + 19}
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
                      )}
                    </g>
                  );
                } else if (el.type === 'text') {
                  return (
                    <text
                      key={el.id}
                      x={el.x}
                      y={el.y}
                      fontSize="14"
                      fill={el.fill}
                      className="cursor-move"
                      style={{ userSelect: 'none' }}
                      onMouseDown={(e) => handleElementMouseDown(e as any, el.id)}
                    >
                      {el.text}
                    </text>
                  );
                }
                return null;
              })}
              
              {/* Dimension indicator (bottom-right) */}
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
        </CardContent>
      </Card>

      {/* Sidebar */}
      <Card className="flex flex-col h-full min-h-0 overflow-hidden">
        <Tabs defaultValue="templates" className="flex-1 flex flex-col min-h-0">
          <TabsList className="w-full flex-shrink-0 m-4 mb-0">
            <TabsTrigger value="templates" className="flex-1">Templates</TabsTrigger>
            <TabsTrigger value="tools" className="flex-1">Tools</TabsTrigger>
            <TabsTrigger value="properties" className="flex-1">Properties</TabsTrigger>
          </TabsList>

          {/* Templates Tab */}
          <TabsContent value="templates" className="space-y-4 p-4 overflow-y-auto flex-1 m-0 min-h-0">
            <div>
              <h3 className="text-sm font-medium mb-3">Basic Apartments</h3>
              <div className="grid grid-cols-2 gap-2">
                {APARTMENT_TEMPLATES.map((template) => (
                  <Button
                    key={template.id}
                    variant="outline"
                    className="h-20 flex-col"
                    onClick={() => addApartmentTemplate(template)}
                  >
                    <template.icon className="h-6 w-6 mb-1" />
                    <span className="text-xs">{template.name}</span>
                  </Button>
                ))}
              </div>
            </div>

            <Separator />

            <div>
              <h3 className="text-sm font-medium mb-3">Complex Shapes</h3>
              <div className="grid grid-cols-2 gap-2">
                {COMPLEX_APARTMENT_TEMPLATES.map((template) => (
                  <Button
                    key={template.id}
                    variant="outline"
                    className="h-20 flex-col p-2"
                    onClick={() => addApartmentTemplate(template)}
                  >
                    <svg 
                      viewBox={`0 0 ${template.width} ${template.height}`} 
                      className="w-8 h-8 mb-1"
                    >
                      <polygon 
                        points={template.points} 
                        fill="currentColor" 
                        opacity="0.3"
                        stroke="currentColor"
                        strokeWidth="2"
                      />
                    </svg>
                    <span className="text-xs">{template.name}</span>
                  </Button>
                ))}
              </div>
            </div>

            <Separator />

            <div>
              <h3 className="text-sm font-medium mb-3">Utility Rooms</h3>
              <div className="grid grid-cols-2 gap-2">
                {UTILITY_TEMPLATES.map((template) => (
                  <Button
                    key={template.id}
                    variant="outline"
                    className="h-20 flex-col gap-1"
                    onClick={() => addUtilityTemplate(template)}
                  >
                    <template.icon className="h-5 w-5" style={{ color: template.iconColor }} />
                    <span className="text-xs">{template.name}</span>
                  </Button>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* Tools Tab */}
          <TabsContent value="tools" className="space-y-4 p-4 overflow-y-auto flex-1 m-0 min-h-0">
            <div>
              <h3 className="text-sm font-medium mb-3">Drawing Tools</h3>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant={activeTool === 'select' ? 'secondary' : 'outline'}
                  onClick={() => setActiveTool('select')}
                >
                  <Move className="h-4 w-4 mr-1" />
                  Select
                </Button>
                <Button
                  variant={activeTool === 'rect' ? 'secondary' : 'outline'}
                  onClick={() => setActiveTool('rect')}
                >
                  <Square className="h-4 w-4 mr-1" />
                  Rectangle
                </Button>
                <Button
                  variant={activeTool === 'text' ? 'secondary' : 'outline'}
                  onClick={() => setActiveTool('text')}
                >
                  <Type className="h-4 w-4 mr-1" />
                  Text
                </Button>
              </div>
            </div>

            <Separator />

            <div>
              <h3 className="text-sm font-medium mb-3">Actions</h3>
              <div className="space-y-2">
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={duplicateElement}
                  disabled={!selectedElementId}
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Duplicate
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start text-destructive"
                  onClick={deleteElement}
                  disabled={!selectedElementId}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </div>
            </div>

            <Separator />

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Snap to Grid</Label>
                <Button
                  variant={snapToGrid ? 'secondary' : 'outline'}
                  size="sm"
                  onClick={() => setSnapToGrid(!snapToGrid)}
                >
                  {snapToGrid ? 'On' : 'Off'}
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* Properties Tab */}
          <TabsContent value="properties" className="space-y-4 p-4 overflow-y-auto flex-1 m-0 min-h-0">
            {/* Global Floor Properties */}
            <div>
              <h3 className="text-sm font-medium mb-3">Floor Properties</h3>
              <div className="space-y-3">
                <div>
                  <Label className="text-xs">Floor Height (meters)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    min="2"
                    max="10"
                    value={floorHeight}
                    onChange={(e) => setFloorHeight(Number(e.target.value))}
                    className="mt-1"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Default: 3.0m. Used for 3D rendering.
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            {selectedElement ? (
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium mb-3">Element Properties</h3>
                  
                  <div className="space-y-3">
                    {/* Apartment ID - auto-generated, shown as read-only info */}
                    {selectedElement.apartmentId && (
                      <div>
                        <Label className="text-xs text-muted-foreground">Apartment ID (auto)</Label>
                        <div className="mt-1 px-3 py-2 border rounded-md bg-muted text-sm text-muted-foreground font-mono">
                          {selectedElement.apartmentId}
                        </div>
                      </div>
                    )}

                    {/* Utility Type - shown as read-only info */}
                    {selectedElement.utilityType && (
                      <div>
                        <Label className="text-xs text-muted-foreground">Utility Type</Label>
                        <div className="mt-1 px-3 py-2 border rounded-md bg-muted text-sm capitalize">
                          {selectedElement.utilityType}
                        </div>
                      </div>
                    )}

                    {/* Apartment Type (Read-only display if set) */}
                    {selectedElement.apartmentType && (
                      <div>
                        <Label className="text-xs">Type</Label>
                        <div className="mt-1 px-3 py-2 border rounded-md bg-muted text-sm">
                          {selectedElement.apartmentType}
                        </div>
                      </div>
                    )}

                    {/* Apartment Name (User Custom Name) */}
                    <div>
                      <Label className="text-xs">Apartment Name</Label>
                      <Input
                        value={selectedElement.apartmentName || ''}
                        onChange={(e) =>
                          updateElement(selectedElement.id, { apartmentName: e.target.value })
                        }
                        placeholder="Sunset View"
                        className="mt-1"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Optional custom name for this apartment
                      </p>
                    </div>

                    {/* Label */}
                    <div>
                      <Label className="text-xs">Label (Unit Number)</Label>
                      <Input
                        value={selectedElement.label || ''}
                        onChange={(e) =>
                          updateElement(selectedElement.id, { label: e.target.value })
                        }
                        placeholder="101"
                        className="mt-1"
                      />
                    </div>

                    {/* Position */}
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs">X (m)</Label>
                        <Input
                          type="number"
                          step="0.5"
                          value={Number((selectedElement.x / SCALE_FACTOR).toFixed(2))}
                          onChange={(e) =>
                            updateElement(selectedElement.id, { x: Number(e.target.value) * SCALE_FACTOR })
                          }
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Y (m)</Label>
                        <Input
                          type="number"
                          step="0.5"
                          value={Number((selectedElement.y / SCALE_FACTOR).toFixed(2))}
                          onChange={(e) =>
                            updateElement(selectedElement.id, { y: Number(e.target.value) * SCALE_FACTOR })
                          }
                          className="mt-1"
                        />
                      </div>
                    </div>

                    {/* Size (for rectangles) */}
                    {selectedElement.type === 'rect' && (
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs">Width (m)</Label>
                          <Input
                            type="number"
                            step="0.5"
                            min="0.5"
                            value={Number(((selectedElement.width || 0) / SCALE_FACTOR).toFixed(2))}
                            onChange={(e) =>
                              updateElement(selectedElement.id, { width: Number(e.target.value) * SCALE_FACTOR })
                            }
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Height (m)</Label>
                          <Input
                            type="number"
                            step="0.5"
                            min="0.5"
                            value={Number(((selectedElement.height || 0) / SCALE_FACTOR).toFixed(2))}
                            onChange={(e) =>
                              updateElement(selectedElement.id, { height: Number(e.target.value) * SCALE_FACTOR })
                            }
                            className="mt-1"
                          />
                        </div>
                      </div>
                    )}
                    {/* Area display */}
                    {selectedElement.type === 'rect' && selectedElement.width && selectedElement.height && (
                      <p className="text-xs text-muted-foreground">
                        Area: {((selectedElement.width / SCALE_FACTOR) * (selectedElement.height / SCALE_FACTOR)).toFixed(1)}m²
                      </p>
                    )}

                    {/* Sub-rect editing for rectilinear shapes */}
                    {selectedElement.type === 'polygon' && selectedElement.subRects && (
                      <div>
                        <Label className="text-xs font-medium">Shape Sections</Label>
                        <p className="text-xs text-muted-foreground mb-1">
                          Total Area: {(selectedElement.subRects.reduce((sum, sr) => sum + (sr.width / SCALE_FACTOR) * (sr.height / SCALE_FACTOR), 0)).toFixed(1)}m²
                        </p>
                        <div className="space-y-2 mt-2">
                          {selectedElement.subRects.map((sr, idx) => (
                            <div key={sr.id} className="border rounded-md p-2 space-y-1.5">
                              <span className="text-xs font-medium text-muted-foreground">{sr.label || `Section ${idx + 1}`}</span>
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <Label className="text-[10px]">Width (m)</Label>
                                  <Input
                                    type="number"
                                    step="0.5"
                                    min={1}
                                    value={Number((sr.width / SCALE_FACTOR).toFixed(2))}
                                    onChange={(e) => handleSubRectChange(selectedElement.id, sr.id, { width: Number(e.target.value) * SCALE_FACTOR })}
                                    className="mt-0.5 h-8 text-xs"
                                  />
                                </div>
                                <div>
                                  <Label className="text-[10px]">Height (m)</Label>
                                  <Input
                                    type="number"
                                    step="0.5"
                                    min={1}
                                    value={Number((sr.height / SCALE_FACTOR).toFixed(2))}
                                    onChange={(e) => handleSubRectChange(selectedElement.id, sr.id, { height: Number(e.target.value) * SCALE_FACTOR })}
                                    className="mt-0.5 h-8 text-xs"
                                  />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-1.5">
                          Values in meters. Connected edges adjust automatically.
                        </p>
                      </div>
                    )}

                    {/* Rotation */}
                    <div>
                      <Label className="text-xs">Rotation</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateElement(selectedElement.id, {
                            rotation: ((selectedElement.rotation || 0) + 45) % 360
                          })}
                        >
                          <RotateCw className="h-4 w-4 mr-1" />
                          +45°
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateElement(selectedElement.id, {
                            rotation: ((selectedElement.rotation || 0) - 45 + 360) % 360
                          })}
                        >
                          <RotateCw className="h-4 w-4 mr-1 -scale-x-100" />
                          -45°
                        </Button>
                        <span className="text-xs text-muted-foreground ml-1">
                          {selectedElement.rotation || 0}°
                        </span>
                      </div>
                    </div>

                    {/* Colors */}
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs">Fill</Label>
                        <Input
                          type="color"
                          value={selectedElement.fill}
                          onChange={(e) =>
                            updateElement(selectedElement.id, { fill: e.target.value })
                          }
                          className="mt-1 h-10"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Stroke</Label>
                        <Input
                          type="color"
                          value={selectedElement.stroke}
                          onChange={(e) =>
                            updateElement(selectedElement.id, { stroke: e.target.value })
                          }
                          className="mt-1 h-10"
                        />
                      </div>
                    </div>

                    {/* Text */}
                    {selectedElement.type === 'text' && (
                      <div>
                        <Label className="text-xs">Text Content</Label>
                        <Input
                          value={selectedElement.text}
                          onChange={(e) =>
                            updateElement(selectedElement.id, { text: e.target.value })
                          }
                          className="mt-1"
                        />
                      </div>
                    )}

                    {/* Overlap Warning */}
                    {checkOverlaps(selectedElement.id) && (
                      <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-md">
                        <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                        <div className="text-xs text-red-800">
                          <p className="font-semibold mb-1">Overlap Detected!</p>
                          <p>This apartment overlaps with another apartment. Please adjust the position or size.</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-40 text-muted-foreground text-sm">
                <Move className="h-8 w-8 mb-2 opacity-50" />
                <p>Select an element to edit properties</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
}
