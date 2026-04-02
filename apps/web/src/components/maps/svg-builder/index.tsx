'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';

import type {
  SvgBuilderProps,
  SvgElement,
  CanvasSize,
  ViewBox,
  ToolMode,
  ApartmentTemplate,
  UtilityTemplate,
  RectArea,
  MarqueeRect,
} from './svg-builder.types';

import {
  DEFAULT_CANVAS_SIZE,
  DEFAULT_FLOOR_HEIGHT,
  GRID_SIZE,
  SCALE_FACTOR,
  TEMPLATE_SUB_RECTS,
  getTemplateTypeId,
  DEFAULT_ELEMENT_FILL,
  DEFAULT_ELEMENT_STROKE,
  DEFAULT_STROKE_WIDTH,
  DEFAULT_TEXT_FILL,
  DEFAULT_RECT_SIZE,
} from './svg-builder.constants';

import { checkElementOverlaps, getBoundingBox, parsePolygonPoints } from './svg-builder.geometry';
import { parseSvgContent, generateSvgContent } from './svg-parser';
import { computePolygonFromSubRects, updateSubRectWithConstraints } from './sub-rect.utils';

import {
  useSvgHistory,
  useSvgDrag,
  useSvgCoordinates,
  useKeyboardShortcuts,
} from './hooks';

import {
  SvgCanvas,
  SvgToolbar,
  TemplatesPanel,
  ToolsPanel,
  PropertiesPanel,
} from './components';

// =============================================================================
// Main Component
// =============================================================================

export function SvgBuilder({ initialSvg, onSave, buildingId }: SvgBuilderProps) {
  // Core state
  const [elements, setElements] = useState<SvgElement[]>([]);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [marquee, setMarquee] = useState<MarqueeRect | null>(null);
  const [activeTool, setActiveTool] = useState<ToolMode>('select');
  const [canvasSize, setCanvasSize] = useState<CanvasSize>(DEFAULT_CANVAS_SIZE);
  const [viewBox, setViewBox] = useState<ViewBox>({
    x: 0,
    y: 0,
    ...DEFAULT_CANVAS_SIZE,
  });

  // UI state
  const [zoom, setZoom] = useState(1);
  const [showGrid, setShowGrid] = useState(true);
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [panMode, setPanMode] = useState(false);
  const [floorHeight, setFloorHeight] = useState(DEFAULT_FLOOR_HEIGHT);
  const [isLoaded, setIsLoaded] = useState(false);
  const [clickedElement, setClickedElement] = useState(false);

  // Refs
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const panClientStart = useRef({ x: 0, y: 0 });
  const marqueeStartRef = useRef<{ x: number; y: number } | null>(null);

  // Hooks
  const { toast } = useToast();
  const { history, historyIndex, pushHistory, undo, redo, resetHistory, canUndo, canRedo } =
    useSvgHistory([]);
  const { isDragging, startDrag, updateDrag, endDrag } = useSvgDrag();
  const { getSVGCoordinates } = useSvgCoordinates(svgRef, viewBox);

  const selectedElement = elements.find((el) => el.id === selectedElementId);

  /** Set both selectedElementId (primary) and selectedIds (multi) together */
  const setSelection = useCallback((ids: string[]) => {
    setSelectedIds(ids);
    setSelectedElementId(ids[0] ?? null);
  }, []);

  // ==========================================================================
  // Snap to grid helper
  // ==========================================================================
  const snapValue = useCallback(
    (value: number) => (snapToGrid ? Math.round(value / GRID_SIZE) * GRID_SIZE : value),
    [snapToGrid]
  );

  // ==========================================================================
  // Check overlaps wrapper
  // ==========================================================================
  const checkOverlaps = useCallback(
    (elementId: string) => checkElementOverlaps(elementId, elements),
    [elements]
  );

  // ==========================================================================
  // Load initial SVG
  // ==========================================================================
  useEffect(() => {
    if (!initialSvg || isLoaded) return;

    try {
      const result = parseSvgContent(initialSvg);

      if (result.elements.length > 0) {
        setElements(result.elements);
        setCanvasSize(result.canvasSize);
        resetHistory(result.elements);

        const elementCount = result.elements.length;
        toast({
          title: 'Floor plan loaded',
          description: `Loaded ${elementCount} element${elementCount !== 1 ? 's' : ''} from existing floor plan${result.wasScaled ? ' (scaled from meters)' : ''}`,
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
  }, [initialSvg, isLoaded, toast, resetHistory]);

  // Sync viewBox with canvasSize changes
  useEffect(() => {
    setViewBox({ x: 0, y: 0, width: canvasSize.width, height: canvasSize.height });
  }, [canvasSize]);

  // ==========================================================================
  // Element Operations
  // ==========================================================================
  const addElement = useCallback(
    (type: SvgElement['type'], x: number, y: number, options?: Partial<SvgElement>) => {
      const newElement: SvgElement = {
        id: `el-${Date.now()}`,
        type,
        x: snapValue(x),
        y: snapValue(y),
        fill: DEFAULT_ELEMENT_FILL,
        stroke: DEFAULT_ELEMENT_STROKE,
        strokeWidth: DEFAULT_STROKE_WIDTH,
        ...options,
      };

      if (type === 'rect') {
        newElement.width = options?.width ?? DEFAULT_RECT_SIZE.width;
        newElement.height = options?.height ?? DEFAULT_RECT_SIZE.height;
      } else if (type === 'text') {
        newElement.text = options?.text ?? 'Label';
        newElement.fill = DEFAULT_TEXT_FILL;
      }

      const wasEmpty = elements.length === 0;
      const newElements = [...elements, newElement];
      setElements(newElements);
      setSelectedElementId(newElement.id);
      setSelectedIds([newElement.id]);
      pushHistory(newElements);

      // Auto-center the canvas when adding the first element
      if (wasEmpty && containerRef.current) {
        requestAnimationFrame(() => {
          const c = containerRef.current;
          if (!c) return;
          c.scrollLeft = newElement.x * zoom - c.clientWidth / 2 + (newElement.width ?? 50) * zoom / 2;
          c.scrollTop = newElement.y * zoom - c.clientHeight / 2 + (newElement.height ?? 50) * zoom / 2;
        });
      }
    },
    [elements, snapValue, pushHistory, zoom]
  );

  const updateElement = useCallback(
    (id: string, updates: Partial<SvgElement>) => {
      const newElements = elements.map((el) => (el.id === id ? { ...el, ...updates } : el));
      setElements(newElements);
      pushHistory(newElements);
    },
    [elements, pushHistory]
  );

  const deleteElement = useCallback(() => {
    const toDelete = selectedIds.length > 1 ? new Set(selectedIds) : selectedElementId ? new Set([selectedElementId]) : null;
    if (!toDelete || toDelete.size === 0) return;

    const newElements = elements.filter((el) => !toDelete.has(el.id));
    setElements(newElements);
    setSelection([]);
    pushHistory(newElements);
  }, [selectedIds, selectedElementId, elements, pushHistory, setSelection]);

  const duplicateElement = useCallback(() => {
    const toDup = selectedIds.length > 1 ? selectedIds : selectedElementId ? [selectedElementId] : [];
    if (toDup.length === 0) return;

    const newElements = [...elements];
    const newIds: string[] = [];
    toDup.forEach((id) => {
      const element = elements.find((el) => el.id === id);
      if (!element) return;
      const newEl = { ...element, id: `el-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, x: element.x + 20, y: element.y + 20 };
      newElements.push(newEl);
      newIds.push(newEl.id);
    });

    setElements(newElements);
    setSelection(newIds);
    pushHistory(newElements);
  }, [selectedIds, selectedElementId, elements, pushHistory, setSelection]);

  // ==========================================================================
  // Template Operations
  // ==========================================================================
  const addApartmentTemplate = useCallback(
    (template: ApartmentTemplate, dropX?: number, dropY?: number) => {
      const centerX = dropX ?? (canvasSize.width - template.width) / 2;
      const centerY = dropY ?? (canvasSize.height - template.height) / 2;

      if (template.type === 'rect') {
        addElement('rect', centerX, centerY, {
          width: template.width,
          height: template.height,
          apartmentId: `apt-${elements.length + 1}`,
          apartmentType: template.name,
          label: `${elements.length + 1}`,
        });
      } else if (template.type === 'polygon') {
        const transformedPoints = template.points
          .split(' ')
          .map((point) => {
            let [x, y] = point.split(',').map(Number);
            x = snapValue(x + centerX);
            y = snapValue(y + centerY);
            return `${x},${y}`;
          })
          .join(' ');

        const templateSubRects = TEMPLATE_SUB_RECTS[template.id];

        addElement('polygon', centerX, centerY, {
          points: transformedPoints,
          width: template.width,
          height: template.height,
          apartmentId: `apt-${elements.length + 1}`,
          apartmentType: template.name,
          label: `${elements.length + 1}`,
          subRects: templateSubRects?.map((r) => ({ ...r })),
        });
      }
    },
    [canvasSize, addElement, elements.length, snapValue]
  );

  const addUtilityTemplate = useCallback(
    (template: UtilityTemplate, dropX?: number, dropY?: number) => {
      const centerX = dropX ?? (canvasSize.width - template.width) / 2;
      const centerY = dropY ?? (canvasSize.height - template.height) / 2;

      addElement('rect', centerX, centerY, {
        width: template.width,
        height: template.height,
        fill: template.fill,
        utilityType: template.id,
        label: template.name.charAt(0),
      });
    },
    [canvasSize, addElement]
  );

  // ==========================================================================
  // Sub-rect Operations (for complex shapes)
  // ==========================================================================
  const handleSubRectChange = useCallback(
    (elementId: string, rectId: string, changes: Partial<Pick<RectArea, 'width' | 'height'>>) => {
      const element = elements.find((el) => el.id === elementId);
      if (!element || !element.subRects || !element.apartmentType) return;

      const templateType = getTemplateTypeId(element.apartmentType);
      if (!templateType) return;

      const updatedSubRects = updateSubRectWithConstraints(templateType, element.subRects, rectId, changes);
      const newPoints = computePolygonFromSubRects(templateType, updatedSubRects, element.x, element.y);

      const allPts = parsePolygonPoints(newPoints);
      const bbox = getBoundingBox(allPts);

      updateElement(elementId, {
        subRects: updatedSubRects,
        points: newPoints,
        width: bbox.right - bbox.left,
        height: bbox.bottom - bbox.top,
      });
    },
    [elements, updateElement]
  );

  // ==========================================================================
  // Undo/Redo handlers
  // ==========================================================================
  const handleUndo = useCallback(() => {
    const prevElements = undo();
    if (prevElements) setElements(prevElements);
  }, [undo]);

  const handleRedo = useCallback(() => {
    const nextElements = redo();
    if (nextElements) setElements(nextElements);
  }, [redo]);

  // Keyboard shortcuts
  useKeyboardShortcuts({
    onUndo: handleUndo,
    onRedo: handleRedo,
    onDelete: deleteElement,
  });

  // ==========================================================================
  // Canvas Mouse Handlers
  // ==========================================================================
  const handleCanvasMouseDown = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      // Pan mode
      if (panMode) {
        startDrag({ id: '', type: 'rect', x: 0, y: 0, fill: '', stroke: '', strokeWidth: 0 }, { x: 0, y: 0 });
        panClientStart.current = { x: e.clientX, y: e.clientY };
        return;
      }

      // Don't deselect if we just clicked on an element
      if (clickedElement) {
        setClickedElement(false);
        return;
      }

      if (activeTool === 'select') {
        const { x, y } = getSVGCoordinates(e);
        // Start marquee drag
        marqueeStartRef.current = { x, y };
        setMarquee({ x, y, width: 0, height: 0 });
        if (!e.shiftKey) {
          setSelection([]);
        }
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
    [activeTool, addElement, clickedElement, panMode, getSVGCoordinates, startDrag, setSelection]
  );

  const handleElementMouseDown = useCallback(
    (e: React.MouseEvent, elementId: string) => {
      e.stopPropagation();
      e.preventDefault();

      if (panMode) return;

      // Clear marquee if started
      marqueeStartRef.current = null;
      setMarquee(null);

      if (e.shiftKey) {
        // Shift+click: toggle element in multi-selection
        const newIds = selectedIds.includes(elementId)
          ? selectedIds.filter((id) => id !== elementId)
          : [...selectedIds, elementId];
        setSelection(newIds);
      } else {
        // Normal click: select only this element (keep multi-select if already in it for drag)
        if (!selectedIds.includes(elementId)) {
          setSelection([elementId]);
        } else {
          setSelectedElementId(elementId);
        }
      }

      setClickedElement(true);

      const element = elements.find((el) => el.id === elementId);
      if (!element) return;

      const mousePos = getSVGCoordinates(e);
      startDrag(element, mousePos);
    },
    [elements, panMode, getSVGCoordinates, startDrag, selectedIds, setSelection]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      const svg = svgRef.current;
      if (!svg) return;

      // Update marquee rect while dragging
      if (marqueeStartRef.current) {
        const { x, y } = getSVGCoordinates(e);
        setMarquee({
          x: marqueeStartRef.current.x,
          y: marqueeStartRef.current.y,
          width: x - marqueeStartRef.current.x,
          height: y - marqueeStartRef.current.y,
        });
        return;
      }

      if (!isDragging) return;

      // Pan mode
      if (panMode) {
        const rect = svg.getBoundingClientRect();
        const dxFrac = (e.clientX - panClientStart.current.x) / rect.width;
        const dyFrac = (e.clientY - panClientStart.current.y) / rect.height;

        setViewBox((prev) => ({
          ...prev,
          x: prev.x - dxFrac * prev.width,
          y: prev.y - dyFrac * prev.height,
        }));

        panClientStart.current = { x: e.clientX, y: e.clientY };
        return;
      }

      // Normal mode: move selected element(s)
      if (!selectedElementId) return;

      const mousePos = getSVGCoordinates(e);
      const newElements = updateDrag(mousePos, elements, selectedElementId, snapValue, selectedIds);
      if (newElements) {
        setElements(newElements);
      }
    },
    [isDragging, selectedElementId, selectedIds, elements, panMode, getSVGCoordinates, updateDrag, snapValue]
  );

  /** Returns elements whose bounding boxes intersect the given marquee rect */
  const getElementsInMarquee = useCallback((m: MarqueeRect): string[] => {
    const left = Math.min(m.x, m.x + m.width);
    const right = Math.max(m.x, m.x + m.width);
    const top = Math.min(m.y, m.y + m.height);
    const bottom = Math.max(m.y, m.y + m.height);

    return elements
      .filter((el) => {
        const elLeft = el.x;
        const elTop = el.y;
        const elRight = el.x + (el.width ?? 0);
        const elBottom = el.y + (el.height ?? 0);
        // Overlap check (axis-aligned)
        return elRight > left && elLeft < right && elBottom > top && elTop < bottom;
      })
      .map((el) => el.id);
  }, [elements]);

  const handleMouseUp = useCallback(() => {
    // Finalize marquee selection
    if (marqueeStartRef.current && marquee) {
      const minSize = 5; // Ignore tiny accidental marquees
      if (Math.abs(marquee.width) > minSize || Math.abs(marquee.height) > minSize) {
        const inMarquee = getElementsInMarquee(marquee);
        setSelection(inMarquee);
      }
      marqueeStartRef.current = null;
      setMarquee(null);
    }

    if (isDragging) {
      pushHistory([...elements]);
    }
    endDrag();
  }, [isDragging, marquee, elements, pushHistory, endDrag, getElementsInMarquee, setSelection]);

  // ==========================================================================
  // Drag-and-drop from sidebar templates
  // ==========================================================================
  const handleDropTemplate = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      const raw = e.dataTransfer.getData('application/svg-template');
      if (!raw) return;

      try {
        const { kind, template } = JSON.parse(raw) as {
          kind: 'apartment' | 'utility';
          template: ApartmentTemplate | UtilityTemplate;
        };

        // Convert screen coords to SVG coordinates
        const svgEl = svgRef.current;
        if (!svgEl) return;
        const svgRect = svgEl.getBoundingClientRect();
        const scaleX = viewBox.width / (canvasSize.width * zoom);
        const scaleY = viewBox.height / (canvasSize.height * zoom);
        const svgX = viewBox.x + (e.clientX - svgRect.left) * scaleX;
        const svgY = viewBox.y + (e.clientY - svgRect.top) * scaleY;

        const w = (template as ApartmentTemplate | UtilityTemplate).width;
        const h = (template as ApartmentTemplate | UtilityTemplate).height;
        const dropX = snapValue(svgX - w / 2);
        const dropY = snapValue(svgY - h / 2);

        if (kind === 'apartment') {
          addApartmentTemplate(template as ApartmentTemplate, dropX, dropY);
        } else if (kind === 'utility') {
          addUtilityTemplate(template as UtilityTemplate, dropX, dropY);
        }
      } catch {
        // Ignore malformed drag data
      }
    },
    [svgRef, viewBox, canvasSize, zoom, snapValue, addApartmentTemplate, addUtilityTemplate]
  );

  // ==========================================================================
  // Export Operations
  // ==========================================================================
  const exportSvg = useCallback(() => {
    return generateSvgContent({
      elements,
      canvasSize,
      floorHeight,
      buildingId,
    });
  }, [elements, canvasSize, floorHeight, buildingId]);

  const downloadSvg = useCallback(() => {
    const svgContent = exportSvg();
    const blob = new Blob([svgContent], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = buildingId
      ? `floor-plan-${buildingId}-${Date.now()}.svg`
      : `floor-plan-${Date.now()}.svg`;
    link.click();
    URL.revokeObjectURL(url);

    toast({
      title: 'Success',
      description: `SVG floor plan downloaded (${(canvasSize.width / SCALE_FACTOR).toFixed(1)}m × ${(canvasSize.height / SCALE_FACTOR).toFixed(1)}m)`,
    });
  }, [exportSvg, buildingId, canvasSize, toast]);

  const handleSave = useCallback(() => {
    const svgContent = exportSvg();
    onSave?.(svgContent);
  }, [exportSvg, onSave]);

  // ==========================================================================
  // Render
  // ==========================================================================
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_300px] grid-rows-[minmax(0,1fr)] gap-4 h-full w-full overflow-hidden">
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
            <SvgToolbar
              historyIndex={historyIndex}
              historyLength={history.length}
              zoom={zoom}
              showGrid={showGrid}
              panMode={panMode}
              onUndo={handleUndo}
              onRedo={handleRedo}
              onZoomIn={() => setZoom(Math.min(2, zoom + 0.1))}
              onZoomOut={() => setZoom(Math.max(0.5, zoom - 0.1))}
              onToggleGrid={() => setShowGrid(!showGrid)}
              onTogglePan={() => setPanMode(!panMode)}
              onDownload={downloadSvg}
              onSave={onSave ? handleSave : undefined}
            />
          </div>
        </CardHeader>
        <CardContent className="p-4 flex-1 min-h-0 overflow-hidden">
          <SvgCanvas
            elements={elements}
            selectedElementId={selectedElementId}
            selectedIds={selectedIds}
            canvasSize={canvasSize}
            viewBox={viewBox}
            zoom={zoom}
            showGrid={showGrid}
            panMode={panMode}
            marquee={marquee}
            containerRef={containerRef}
            activeTool={activeTool}
            onSelectElement={setSelectedElementId}
            onMouseDown={handleCanvasMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onElementMouseDown={handleElementMouseDown}
            checkOverlaps={checkOverlaps}
            svgRef={svgRef}
            onDropTemplate={handleDropTemplate}
          />
        </CardContent>
      </Card>

      {/* Sidebar */}
      <Card className="flex flex-col h-full min-h-0 overflow-hidden">
        <Tabs defaultValue="templates" className="flex-1 flex flex-col min-h-0">
          <TabsList className="flex-shrink-0 mx-4 mt-4">
            <TabsTrigger value="templates" className="flex-1">
              Templates
            </TabsTrigger>
            <TabsTrigger value="tools" className="flex-1">
              Tools
            </TabsTrigger>
            <TabsTrigger value="properties" className="flex-1">
              Properties
            </TabsTrigger>
          </TabsList>

          <TabsContent
            value="templates"
            className="space-y-4 p-4 overflow-y-auto flex-1 m-0 min-h-0"
          >
            <TemplatesPanel
              onAddTemplate={addApartmentTemplate}
              onAddUtility={addUtilityTemplate}
            />
          </TabsContent>

          <TabsContent
            value="tools"
            className="space-y-4 p-4 overflow-y-auto flex-1 m-0 min-h-0"
          >
            <ToolsPanel
              activeTool={activeTool}
              snapToGrid={snapToGrid}
              hasSelection={!!(selectedElementId || selectedIds.length > 1)}
              onSetActiveTool={setActiveTool}
              onToggleSnapToGrid={() => setSnapToGrid(!snapToGrid)}
              onDuplicate={duplicateElement}
              onDelete={deleteElement}
            />
          </TabsContent>

          <TabsContent
            value="properties"
            className="space-y-4 p-4 overflow-y-auto flex-1 m-0 min-h-0"
          >
            <PropertiesPanel
              selectedElement={selectedElement}
              floorHeight={floorHeight}
              onSetFloorHeight={setFloorHeight}
              onUpdateElement={updateElement}
              onSubRectChange={handleSubRectChange}
              checkOverlaps={checkOverlaps}
            />
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
}

export default SvgBuilder;
