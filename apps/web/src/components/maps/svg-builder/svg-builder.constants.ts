import {
  Square,
  Pentagon,
  BoxSelect,
  Columns,
  ArrowUpDown,
  Zap,
  Trash,
  Droplet,
} from 'lucide-react';
import type { RectArea, RectTemplate, PolygonTemplate, UtilityTemplate } from './svg-builder.types';

// =============================================================================
// Scale Configuration
// =============================================================================

/**
 * Scale Factor: 10 builder units = 1 meter (1 unit = 0.1m = 10cm)
 *
 * This ensures:
 * - Easy manipulation in the UI (apartments appear as 60-100 units instead of 6-10 units)
 * - Realistic dimensions when exported (automatically converted to meters)
 * - Proper 3D rendering (Three.js uses the meter-based SVG directly)
 *
 * Examples:
 * - Studio apartments: 60×50 builder units = 6m×5m = 30m² in real life
 * - 3BR apartments: 100×100 builder units = 10m×10m = 100m² in real life
 * - Elevator: 25×25 builder units = 2.5m×2.5m in real life
 */
export const SCALE_FACTOR = 10;

/** Grid size in builder units (10 = 1 meter) */
export const GRID_SIZE = 10;

/** Default canvas size: 200m × 150m in real dimensions */
export const DEFAULT_CANVAS_SIZE = { width: 2000, height: 1500 };

/** Default floor height in meters */
export const DEFAULT_FLOOR_HEIGHT = 3.0;

/** Overlap tolerance in builder units (2 = 0.2m - allows edge touching) */
export const OVERLAP_TOLERANCE = 2;

// =============================================================================
// Apartment Templates
// =============================================================================

export const APARTMENT_TEMPLATES: RectTemplate[] = [
  {
    id: 'studio',
    name: 'Studio',
    type: 'rect',
    width: 60, // 6m × 5m = 30m²
    height: 50,
    icon: Square,
  },
  {
    id: '1br',
    name: '1 Bedroom',
    type: 'rect',
    width: 70, // 7m × 8m = 56m²
    height: 80,
    icon: Square,
  },
  {
    id: '2br',
    name: '2 Bedroom',
    type: 'rect',
    width: 90, // 9m × 9m = 81m²
    height: 90,
    icon: Square,
  },
  {
    id: '3br',
    name: '3 Bedroom',
    type: 'rect',
    width: 100, // 10m × 10m = 100m²
    height: 100,
    icon: Square,
  },
];

export const COMPLEX_APARTMENT_TEMPLATES: PolygonTemplate[] = [
  {
    id: 'l-shape',
    name: 'L-Shaped',
    type: 'polygon',
    points: '0,0 60,0 60,50 100,50 100,110 0,110', // ~70m² L-shape
    icon: BoxSelect,
    width: 100, // 10m
    height: 110, // 11m
  },
  {
    id: 'u-shape',
    name: 'U-Shaped',
    type: 'polygon',
    points: '0,0 30,0 30,80 70,80 70,0 100,0 100,100 0,100', // ~80m² U-shape
    icon: Columns,
    width: 100, // 10m
    height: 100, // 10m
  },
  {
    id: 't-shape',
    name: 'T-Shaped',
    type: 'polygon',
    points: '0,0 120,0 120,50 90,50 90,90 30,90 30,50 0,50', // ~75m² T-shape
    icon: BoxSelect,
    width: 120, // 12m
    height: 90, // 9m
  },
];

// =============================================================================
// Utility Templates
// =============================================================================

export const UTILITY_TEMPLATES: UtilityTemplate[] = [
  {
    id: 'elevator',
    name: 'Elevator',
    type: 'rect',
    width: 30, // 2.5m × 2.5m
    height: 30,
    fill: '#9ca3af',
    icon: ArrowUpDown,
    iconColor: '#1f2937',
  },
  {
    id: 'stairwell',
    name: 'Stairwell',
    type: 'rect',
    width: 30, // 3.5m × 5m
    height: 50,
    fill: '#bfdbfe',
    icon: Pentagon,
    iconColor: '#1e40af',
  },
  {
    id: 'electric',
    name: 'Electric Room',
    type: 'rect',
    width: 20, // 3m × 3m
    height: 20,
    fill: '#fef08a',
    icon: Zap,
    iconColor: '#ca8a04',
  },
  {
    id: 'trash',
    name: 'Trash Room',
    type: 'rect',
    width: 20, // 3m × 3m
    height: 20,
    fill: '#d1d5db',
    icon: Trash,
    iconColor: '#78716c',
  },
  {
    id: 'water',
    name: 'Water Room',
    type: 'rect',
    width: 20, // 3m × 2.5m
    height: 20,
    fill: '#a5f3fc',
    icon: Droplet,
    iconColor: '#0e7490',
  },
];

// =============================================================================
// Sub-rect Decompositions (for complex polygon editing)
// =============================================================================

export const TEMPLATE_SUB_RECTS: Record<string, RectArea[]> = {
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

// =============================================================================
// Type ID Mappings
// =============================================================================

const APARTMENT_TYPE_TO_TEMPLATE_ID: Record<string, string> = {
  'L-Shaped': 'l-shape',
  'U-Shaped': 'u-shape',
  'T-Shaped': 't-shape',
};

/**
 * Get template ID from apartment type name
 */
export function getTemplateTypeId(apartmentType: string): string | null {
  return APARTMENT_TYPE_TO_TEMPLATE_ID[apartmentType] ?? null;
}

// =============================================================================
// Default Element Properties
// =============================================================================

export const DEFAULT_ELEMENT_FILL = '#e0e0e0';
export const DEFAULT_ELEMENT_STROKE = '#333333';
export const DEFAULT_STROKE_WIDTH = 2;
export const DEFAULT_TEXT_FILL = '#333333';
export const DEFAULT_RECT_SIZE = { width: 150, height: 100 };
export const DEFAULT_CIRCLE_RADIUS = 50;
