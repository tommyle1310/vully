'use client';

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
  AlertCircle,
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
  apartmentId?: string;
  apartmentType?: string; // Studio, 1BR, 2BR, 3BR
  apartmentName?: string; // Custom name given by user
  label?: string;
}

interface SvgBuilderProps {
  initialSvg?: string;
  onSave?: (svgContent: string) => void;
  buildingId?: string;
}

const APARTMENT_TEMPLATES = [
  {
    id: 'studio',
    name: 'Studio',
    width: 100,
    height: 80,
    icon: Square,
  },
  {
    id: '1br',
    name: '1 Bedroom',
    width: 140,
    height: 100,
    icon: Square,
  },
  {
    id: '2br',
    name: '2 Bedroom',
    width: 180,
    height: 120,
    icon: Square,
  },
  {
    id: '3br',
    name: '3 Bedroom',
    width: 200,
    height: 140,
    icon: Square,
  },
];

const GRID_SIZE = 10;
const DEFAULT_CANVAS_SIZE = { width: 800, height: 600 };

export function SvgBuilder({ initialSvg, onSave, buildingId }: SvgBuilderProps) {
  const [elements, setElements] = useState<SvgElement[]>([]);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [activeTool, setActiveTool] = useState<'select' | 'rect' | 'text'>('select');
  const [canvasSize, setCanvasSize] = useState(DEFAULT_CANVAS_SIZE);
  const [zoom, setZoom] = useState(1);
  const [showGrid, setShowGrid] = useState(true);
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [history, setHistory] = useState<SvgElement[][]>([[]]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 }); // Cursor offset within element
  const [clickedElement, setClickedElement] = useState(false); // Track if element was clicked
  const [isLoaded, setIsLoaded] = useState(false); // Track if initial SVG has been loaded
  
  const svgRef = useRef<SVGSVGElement>(null);
  const { toast } = useToast();

  const selectedElement = elements.find((el) => el.id === selectedElementId);

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

        // Extract canvas size from viewBox or width/height
        const viewBox = svgElement.getAttribute('viewBox');
        if (viewBox) {
          const [, , width, height] = viewBox.split(' ').map(Number);
          setCanvasSize({ width, height });
        } else {
          const width = Number(svgElement.getAttribute('width')) || DEFAULT_CANVAS_SIZE.width;
          const height = Number(svgElement.getAttribute('height')) || DEFAULT_CANVAS_SIZE.height;
          setCanvasSize({ width, height });
        }

        const loadedElements: SvgElement[] = [];
        const processedTextIndices = new Set<number>();

        // Parse rect elements
        const rects = Array.from(svgDoc.querySelectorAll('rect'));
        const texts = Array.from(svgDoc.querySelectorAll('text'));

        rects.forEach((rect, index) => {
          const apartmentId = rect.getAttribute('data-apartment-id');
          const x = Number(rect.getAttribute('x')) || 0;
          const y = Number(rect.getAttribute('y')) || 0;
          const width = Number(rect.getAttribute('width')) || 100;
          const height = Number(rect.getAttribute('height')) || 80;
          const fill = rect.getAttribute('fill') || '#e0e0e0';
          const stroke = rect.getAttribute('stroke') || '#333333';
          const strokeWidth = Number(rect.getAttribute('stroke-width')) || 2;

          // Find associated text label (positioned at center of rectangle)
          const centerX = x + width / 2;
          const centerY = y + height / 2;
          let label: string | undefined;

          texts.forEach((text, textIndex) => {
            const textX = Number(text.getAttribute('x')) || 0;
            const textY = Number(text.getAttribute('y')) || 0;
            const textAnchor = text.getAttribute('text-anchor');
            const fontSize = Number(text.getAttribute('font-size')) || 14;
            const fontWeight = text.getAttribute('font-weight');

            // Check if text is centered on this rectangle (likely a label)
            const isLabel = textAnchor === 'middle' && 
                           Math.abs(textX - centerX) < 5 && 
                           Math.abs(textY - centerY) < 5 &&
                           fontSize >= 14 &&
                           fontWeight === 'bold';

            if (isLabel && !processedTextIndices.has(textIndex)) {
              label = text.textContent || undefined;
              processedTextIndices.add(textIndex); // Mark as processed
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
            apartmentId: apartmentId || undefined,
            label,
          });
        });

        // Parse remaining text elements (those not associated with rectangles)
        texts.forEach((text, index) => {
          if (processedTextIndices.has(index)) return; // Skip labels

          const x = Number(text.getAttribute('x')) || 0;
          const y = Number(text.getAttribute('y')) || 0;
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
            description: `Loaded ${rects.length} apartment${rects.length !== 1 ? 's' : ''} from existing floor plan`,
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
    (template: typeof APARTMENT_TEMPLATES[0]) => {
      const centerX = (canvasSize.width - template.width) / 2;
      const centerY = (canvasSize.height - template.height) / 2;

      addElement('rect', centerX, centerY, {
        width: template.width,
        height: template.height,
        apartmentId: `apt-${elements.length + 1}`,
        apartmentType: template.name, // Store template type (Studio, 1BR, etc.)
        label: `${elements.length + 1}`,
      });
    },
    [canvasSize, addElement, elements.length]
  );

  // Handle canvas click
  const handleCanvasClick = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      // Don't deselect if we just clicked on an element
      if (clickedElement) {
        setClickedElement(false);
        return;
      }

      if (activeTool === 'select') {
        setSelectedElementId(null);
        return;
      }

      const svg = svgRef.current;
      if (!svg) return;

      const rect = svg.getBoundingClientRect();
      const x = (e.clientX - rect.left) / zoom;
      const y = (e.clientY - rect.top) / zoom;

      if (activeTool === 'rect') {
        addElement('rect', x, y);
        setActiveTool('select');
      } else if (activeTool === 'text') {
        addElement('text', x, y);
        setActiveTool('select');
      }
    },
    [activeTool, zoom, addElement, clickedElement]
  );

  // Handle element drag
  const handleElementMouseDown = useCallback(
    (e: React.MouseEvent, elementId: string) => {
      e.stopPropagation();
      e.preventDefault(); // Prevent text selection
      setSelectedElementId(elementId);
      setClickedElement(true); // Mark that we clicked an element
      setIsDragging(true);
      
      const svg = svgRef.current;
      const element = elements.find((el) => el.id === elementId);
      if (!svg || !element) return;

      const rect = svg.getBoundingClientRect();
      const mouseX = (e.clientX - rect.left) / zoom;
      const mouseY = (e.clientY - rect.top) / zoom;

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
    [zoom, elements]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (!isDragging || !selectedElementId) return;

      const svg = svgRef.current;
      if (!svg) return;

      const rect = svg.getBoundingClientRect();
      const currentX = (e.clientX - rect.left) / zoom;
      const currentY = (e.clientY - rect.top) / zoom;

      const element = elements.find((el) => el.id === selectedElementId);
      if (!element) return;

      // Calculate new position keeping cursor offset constant
      const newX = snapValue(currentX - dragOffset.x);
      const newY = snapValue(currentY - dragOffset.y);

      const newElements = elements.map((el) =>
        el.id === selectedElementId
          ? {
              ...el,
              x: newX,
              y: newY,
            }
          : el
      );

      setElements(newElements);
    },
    [isDragging, selectedElementId, elements, zoom, dragOffset, snapValue]
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

  // Export SVG
  const exportSvg = useCallback(() => {
    const svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${canvasSize.width}" height="${canvasSize.height}" viewBox="0 0 ${canvasSize.width} ${canvasSize.height}" xmlns="http://www.w3.org/2000/svg">
  <g id="apartments">
${elements
  .map((el) => {
    if (el.type === 'rect') {
      return `    <rect 
      ${el.apartmentId ? `data-apartment-id="${el.apartmentId}" ` : ''}
      x="${el.x}" 
      y="${el.y}" 
      width="${el.width}" 
      height="${el.height}" 
      fill="${el.fill}" 
      stroke="${el.stroke}" 
      stroke-width="${el.strokeWidth}"
      rx="4"
    />
    ${el.label ? `<text x="${el.x + (el.width || 0) / 2}" y="${el.y + (el.height || 0) / 2}" text-anchor="middle" font-size="16" font-weight="bold" fill="#333">${el.label}</text>` : ''}`;
    } else if (el.type === 'circle') {
      return `    <circle 
      ${el.apartmentId ? `data-apartment-id="${el.apartmentId}" ` : ''}
      cx="${el.x}" 
      cy="${el.y}" 
      r="${el.radius}" 
      fill="${el.fill}" 
      stroke="${el.stroke}" 
      stroke-width="${el.strokeWidth}"
    />`;
    } else if (el.type === 'text') {
      return `    <text x="${el.x}" y="${el.y}" font-size="14" fill="${el.fill}">${el.text}</text>`;
    }
    return '';
  })
  .join('\n')}
  </g>
</svg>`;

    return svgContent;
  }, [elements, canvasSize]);

  // Download SVG
  const downloadSvg = useCallback(() => {
    const svgContent = exportSvg();
    const blob = new Blob([svgContent], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `floor-plan-${Date.now()}.svg`;
    link.click();
    URL.revokeObjectURL(url);

    toast({
      title: 'Success',
      description: 'SVG floor plan downloaded',
    });
  }, [exportSvg, toast]);

  // Save SVG (callback to parent)
  const handleSave = useCallback(() => {
    const svgContent = exportSvg();
    onSave?.(svgContent);
  }, [exportSvg, onSave]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-4 h-full w-full">
      {/* Canvas */}
      <Card className="flex flex-col h-full min-h-0">
        <CardHeader className="pb-3 flex-shrink-0">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Floor Plan Builder</CardTitle>
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
              viewBox={`0 0 ${canvasSize.width} ${canvasSize.height}`}
              className="bg-white cursor-crosshair select-none"
              style={{ userSelect: 'none' }}
              onClick={handleCanvasClick}
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
                  return (
                    <g key={el.id}>
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
                          x={el.x + (el.width || 0) / 2}
                          y={el.y + 20}
                          textAnchor="middle"
                          fontSize="12"
                          fontWeight="normal"
                          fill="#666"
                          opacity="0.5"
                          pointerEvents="none"
                          style={{ userSelect: 'none' }}
                        >
                          {el.apartmentType}
                        </text>
                      )}
                      {/* Apartment Number/Label */}
                      {el.label && (
                        <text
                          x={el.x + (el.width || 0) / 2}
                          y={el.y + (el.height || 0) / 2 + (el.apartmentType ? 5 : 0)}
                          textAnchor="middle"
                          fontSize="16"
                          fontWeight="bold"
                          fill="#333"
                          pointerEvents="none"
                          style={{ userSelect: 'none' }}
                        >
                          {el.label}
                        </text>
                      )}
                      {/* Apartment Name (if set) */}
                      {el.apartmentName && (
                        <text
                          x={el.x + (el.width || 0) / 2}
                          y={el.y + (el.height || 0) - 10}
                          textAnchor="middle"
                          fontSize="10"
                          fontWeight="normal"
                          fill="#666"
                          opacity="0.7"
                          pointerEvents="none"
                          style={{ userSelect: 'none' }}
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
              <h3 className="text-sm font-medium mb-3">Apartment Templates</h3>
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
            {selectedElement ? (
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium mb-3">Element Properties</h3>
                  
                  <div className="space-y-3">
                    {/* Apartment ID */}
                    <div>
                      <Label className="text-xs">Apartment ID</Label>
                      <Input
                        value={selectedElement.apartmentId || ''}
                        onChange={(e) =>
                          updateElement(selectedElement.id, { apartmentId: e.target.value })
                        }
                        placeholder="apt-101"
                        className="mt-1"
                      />
                    </div>

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
                        <Label className="text-xs">X</Label>
                        <Input
                          type="number"
                          value={selectedElement.x}
                          onChange={(e) =>
                            updateElement(selectedElement.id, { x: Number(e.target.value) })
                          }
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Y</Label>
                        <Input
                          type="number"
                          value={selectedElement.y}
                          onChange={(e) =>
                            updateElement(selectedElement.id, { y: Number(e.target.value) })
                          }
                          className="mt-1"
                        />
                      </div>
                    </div>

                    {/* Size (for rectangles) */}
                    {selectedElement.type === 'rect' && (
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs">Width</Label>
                          <Input
                            type="number"
                            value={selectedElement.width}
                            onChange={(e) =>
                              updateElement(selectedElement.id, { width: Number(e.target.value) })
                            }
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Height</Label>
                          <Input
                            type="number"
                            value={selectedElement.height}
                            onChange={(e) =>
                              updateElement(selectedElement.id, { height: Number(e.target.value) })
                            }
                            className="mt-1"
                          />
                        </div>
                      </div>
                    )}

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
