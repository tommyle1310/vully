import type { LucideIcon } from 'lucide-react';

// =============================================================================
// Core Domain Types
// =============================================================================

export interface RectArea {
  id: string;
  width: number;
  height: number;
  x: number;
  y: number;
  label?: string;
}

export interface SvgElement {
  id: string;
  type: ElementType;
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
  apartmentType?: string;
  apartmentName?: string;
  label?: string;
  utilityType?: string;
  subRects?: RectArea[];
  // Interior details (for apartment elements)
  bedroomCount?: number;
  bathroomCount?: number;
  livingRoomCount?: number;
  logiaCount?: number;
  multipurposeRooms?: number;
  kitchenType?: 'open' | 'closed';
  viewDescription?: string;
}

export type ElementType = 'rect' | 'circle' | 'polygon' | 'text' | 'template';
export type ToolMode = 'select' | 'rect' | 'text';

// =============================================================================
// Template Types
// =============================================================================

export interface BaseTemplate {
  id: string;
  name: string;
  width: number;
  height: number;
  icon: LucideIcon;
}

export interface RectTemplate extends BaseTemplate {
  type: 'rect';
}

export interface PolygonTemplate extends BaseTemplate {
  type: 'polygon';
  points: string;
}

export interface UtilityTemplate extends BaseTemplate {
  type: 'rect';
  fill: string;
  iconColor: string;
}

export type ApartmentTemplate = RectTemplate | PolygonTemplate;

// =============================================================================
// State Types
// =============================================================================

export interface ViewBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CanvasSize {
  width: number;
  height: number;
}

export interface Point {
  x: number;
  y: number;
}

export interface BoundingBox {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

// Marquee / rubber-band selection rectangle
export interface MarqueeRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

// =============================================================================
// Component Props
// =============================================================================

export interface SvgBuilderProps {
  initialSvg?: string;
  onSave?: (svgContent: string) => void;
  buildingId?: string;
}

export interface SvgCanvasProps {
  elements: SvgElement[];
  selectedElementId: string | null;
  selectedIds: string[];
  canvasSize: CanvasSize;
  viewBox: ViewBox;
  zoom: number;
  showGrid: boolean;
  panMode: boolean;
  activeTool: ToolMode;
  marquee: MarqueeRect | null;
  onSelectElement: (id: string | null) => void;
  onMouseDown: (e: React.MouseEvent<SVGSVGElement>) => void;
  onMouseMove: (e: React.MouseEvent<SVGSVGElement>) => void;
  onMouseUp: () => void;
  onElementMouseDown: (e: React.MouseEvent, elementId: string) => void;
  checkOverlaps: (elementId: string) => boolean;
  svgRef: React.RefObject<SVGSVGElement | null>;
  containerRef: React.RefObject<HTMLDivElement | null>;
  onDropTemplate: (e: React.DragEvent<HTMLDivElement>) => void;
}

export interface ToolbarProps {
  historyIndex: number;
  historyLength: number;
  zoom: number;
  showGrid: boolean;
  panMode: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onToggleGrid: () => void;
  onTogglePan: () => void;
  onDownload: () => void;
  onSave?: () => void;
}

export interface SidebarProps {
  selectedElement: SvgElement | undefined;
  activeTool: ToolMode;
  snapToGrid: boolean;
  floorHeight: number;
  onAddTemplate: (template: ApartmentTemplate) => void;
  onAddUtility: (template: UtilityTemplate) => void;
  onSetActiveTool: (tool: ToolMode) => void;
  onToggleSnapToGrid: () => void;
  onSetFloorHeight: (height: number) => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onUpdateElement: (id: string, updates: Partial<SvgElement>) => void;
  onSubRectChange: (elementId: string, rectId: string, changes: Partial<Pick<RectArea, 'width' | 'height'>>) => void;
  checkOverlaps: (elementId: string) => boolean;
}

export interface PropertiesPanelProps {
  selectedElement: SvgElement | undefined;
  floorHeight: number;
  onSetFloorHeight: (height: number) => void;
  onUpdateElement: (id: string, updates: Partial<SvgElement>) => void;
  onSubRectChange: (elementId: string, rectId: string, changes: Partial<Pick<RectArea, 'width' | 'height'>>) => void;
  checkOverlaps: (elementId: string) => boolean;
}

// =============================================================================
// Hook Return Types
// =============================================================================

export interface UseSvgHistoryReturn {
  history: SvgElement[][];
  historyIndex: number;
  pushHistory: (elements: SvgElement[]) => void;
  undo: () => SvgElement[] | null;
  redo: () => SvgElement[] | null;
  canUndo: boolean;
  canRedo: boolean;
}

export interface UseSvgDragReturn {
  isDragging: boolean;
  dragOffset: Point;
  startDrag: (element: SvgElement, mousePos: Point) => void;
  updateDrag: (mousePos: Point, elements: SvgElement[], selectedId: string, snapFn: (v: number) => number) => SvgElement[] | null;
  endDrag: () => void;
}
