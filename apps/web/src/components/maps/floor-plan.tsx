'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import { useMapStore } from '@/stores/mapStore';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

interface FloorPlanProps {
  svgContent: string;
  buildingId: string;
  apartments: Array<{
    id: string;
    unitNumber: string;
    floor: number;
    status: 'vacant' | 'occupied' | 'maintenance' | 'reserved';
    areaSqm?: number;
    bedroomCount: number;
    bathroomCount: number;
    svgElementId?: string;
    building?: {
      id: string;
      name: string;
    };
    activeContract?: {
      id: string;
      tenant: {
        firstName: string;
        lastName: string;
      };
    };
  }>;
  onApartmentClick?: (apartmentId: string) => void;
}

const STATUS_COLORS = {
  vacant: 'hsl(142, 76%, 45%)',      // green
  occupied: 'hsl(221, 83%, 53%)',    // blue
  maintenance: 'hsl(48, 96%, 53%)',  // yellow
  reserved: 'hsl(263, 70%, 50%)',    // purple
};

const STATUS_HOVER_COLORS = {
  vacant: 'hsl(142, 76%, 35%)',
  occupied: 'hsl(221, 83%, 43%)',
  maintenance: 'hsl(48, 96%, 43%)',
  reserved: 'hsl(263, 70%, 40%)',
};

export function FloorPlan({ svgContent, buildingId, apartments, onApartmentClick }: FloorPlanProps) {
  const svgContainerRef = useRef<HTMLDivElement>(null);
  const svgWrapperRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; content: string } | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [startPan, setStartPan] = useState({ x: 0, y: 0 });
  
  const {
    hoveredApartmentId,
    selectedApartmentId,
    filters,
    zoom,
    pan,
    setHoveredApartment,
    setSelectedApartment,
    setApartments,
    setZoom,
    setPan,
    resetView,
    getApartmentBySvgId,
  } = useMapStore();

  // Zoom handlers
  const handleZoomIn = useCallback(() => {
    setZoom(Math.min(zoom + 0.25, 3));
  }, [zoom, setZoom]);

  const handleZoomOut = useCallback(() => {
    setZoom(Math.max(zoom - 0.25, 0.5));
  }, [zoom, setZoom]);

  const handleResetView = useCallback(() => {
    resetView();
  }, [resetView]);

  // Mouse wheel zoom
  const handleWheel = useCallback(
    (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      setZoom(Math.max(0.5, Math.min(3, zoom + delta)));
    },
    [zoom, setZoom]
  );

  // Pan handlers
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if ((e.target as HTMLElement).closest('[data-apartment-id], [id]')?.hasAttribute('data-apartment-id')) {
        return; // Don't pan when clicking on apartment
      }
      setIsPanning(true);
      setStartPan({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    },
    [pan]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isPanning) return;
      setPan({
        x: e.clientX - startPan.x,
        y: e.clientY - startPan.y,
      });
    },
    [isPanning, startPan, setPan]
  );

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
  }, []);

  // Touch pan support
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);

  const handleTouchStartPan = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length === 2) {
        // Two-finger touch for panning
        setTouchStart({
          x: e.touches[0].clientX - pan.x,
          y: e.touches[0].clientY - pan.y,
        });
      }
    },
    [pan]
  );

  const handleTouchMovePan = useCallback(
    (e: React.TouchEvent) => {
      if (touchStart && e.touches.length === 2) {
        setPan({
          x: e.touches[0].clientX - touchStart.x,
          y: e.touches[0].clientY - touchStart.y,
        });
      }
    },
    [touchStart, setPan]
  );

  const handleTouchEndPan = useCallback(() => {
    setTouchStart(null);
  }, []);

  // Attach wheel event listener
  useEffect(() => {
    const wrapper = svgWrapperRef.current;
    if (!wrapper) return;

    wrapper.addEventListener('wheel', handleWheel, { passive: false });
    return () => wrapper.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  // Load apartments into store
  useEffect(() => {
    setApartments(apartments);
  }, [apartments, setApartments]);

  // Auto-fit SVG to container on mount / content change
  useEffect(() => {
    const container = svgContainerRef.current;
    const wrapper = svgWrapperRef.current;
    if (!container || !wrapper) return;

    const svgEl = container.querySelector('svg');
    if (!svgEl) return;

    // Make the SVG fill the container width
    svgEl.style.width = '100%';
    svgEl.style.height = '100%';
    svgEl.style.display = 'block';

    // Ensure the SVG has a viewBox for proper scaling
    if (!svgEl.getAttribute('viewBox')) {
      const w = parseFloat(svgEl.getAttribute('width') || '800');
      const h = parseFloat(svgEl.getAttribute('height') || '600');
      svgEl.setAttribute('viewBox', `0 0 ${w} ${h}`);
    }

    svgEl.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  }, [svgContent]);

  // Setup SVG interactions
  useEffect(() => {
    if (!svgContainerRef.current) return;

    const svgElement = svgContainerRef.current.querySelector('svg');
    if (!svgElement) return;

    // Apply styles to all apartment elements
    const updateApartmentStyles = () => {
      apartments.forEach((apt) => {
        if (!apt.svgElementId) return;

        const element = svgElement.querySelector(`[id="${apt.svgElementId}"], [data-apartment-id="${apt.svgElementId}"]`) as SVGElement;
        if (!element) return;

        // Check if apartment matches filters
        const matchesFilter = 
          (filters.status.length === 0 || filters.status.includes(apt.status)) &&
          (filters.floor === null || filters.floor === apt.floor);

        // Base styles
        element.style.cursor = 'pointer';
        element.style.transition = 'all 0.2s ease';

        if (!matchesFilter) {
          // Dimmed for filtered out apartments
          element.style.fill = 'hsl(0, 0%, 70%)';
          element.style.opacity = '0.3';
          element.style.pointerEvents = 'none';
        } else {
          // Apply status color
          const isHovered = hoveredApartmentId === apt.id;
          const isSelected = selectedApartmentId === apt.id;

          if (isSelected) {
            element.style.fill = STATUS_COLORS[apt.status];
            element.style.opacity = '1';
            element.style.strokeWidth = '3';
            element.style.stroke = 'hsl(var(--primary))';
          } else if (isHovered) {
            element.style.fill = STATUS_HOVER_COLORS[apt.status];
            element.style.opacity = '0.9';
            element.style.strokeWidth = '2';
            element.style.stroke = 'hsl(var(--foreground))';
          } else {
            element.style.fill = STATUS_COLORS[apt.status];
            element.style.opacity = '0.7';
            element.style.strokeWidth = '1';
            element.style.stroke = 'hsl(var(--border))';
          }
          element.style.pointerEvents = 'auto';
        }
      });
    };

    updateApartmentStyles();

    // Event handlers
    const handleMouseOver = (e: Event) => {
      const target = e.target as SVGElement;
      const svgId = target.id || target.getAttribute('data-apartment-id');
      if (!svgId) return;

      const apartment = getApartmentBySvgId(svgId);
      if (!apartment) return;

      setHoveredApartment(apartment.id);

      // Show tooltip (desktop only)
      if (window.innerWidth >= 768) {
        const rect = target.getBoundingClientRect();
        const containerRect = svgContainerRef.current!.getBoundingClientRect();
        
        setTooltip({
          x: rect.left + rect.width / 2 - containerRect.left,
          y: rect.top - containerRect.top - 10,
          content: `${apartment.unitNumber} - ${apartment.status}`,
        });
      }
    };

    const handleMouseOut = () => {
      setHoveredApartment(null);
      setTooltip(null);
    };

    const handleClick = (e: Event) => {
      e.stopPropagation();
      const target = e.target as SVGElement;
      const svgId = target.id || target.getAttribute('data-apartment-id');
      if (!svgId) return;

      const apartment = getApartmentBySvgId(svgId);
      if (!apartment) return;

      setSelectedApartment(apartment.id);
      onApartmentClick?.(apartment.id);
    };

    // Touch support for mobile
    const handleTouchStart = (e: Event) => {
      const target = e.target as SVGElement;
      const svgId = target.id || target.getAttribute('data-apartment-id');
      if (!svgId) return;

      const apartment = getApartmentBySvgId(svgId);
      if (!apartment) return;

      // On mobile, tap shows highlight
      setHoveredApartment(apartment.id);
    };

    const handleTouchEnd = (e: Event) => {
      e.preventDefault(); // Prevent mouse events
      const target = e.target as SVGElement;
      const svgId = target.id || target.getAttribute('data-apartment-id');
      if (!svgId) return;

      const apartment = getApartmentBySvgId(svgId);
      if (!apartment) return;

      // Clear hover and trigger selection
      setHoveredApartment(null);
      setSelectedApartment(apartment.id);
      onApartmentClick?.(apartment.id);
    };

    // Attach event listeners to apartment elements
    apartments.forEach((apt) => {
      if (!apt.svgElementId) return;

      const element = svgElement.querySelector(`[id="${apt.svgElementId}"], [data-apartment-id="${apt.svgElementId}"]`);
      if (!element) return;

      element.addEventListener('mouseover', handleMouseOver);
      element.addEventListener('mouseout', handleMouseOut);
      element.addEventListener('click', handleClick);
      // Touch events for mobile
      element.addEventListener('touchstart', handleTouchStart, { passive: true });
      element.addEventListener('touchend', handleTouchEnd);
    });

    // Cleanup
    return () => {
      apartments.forEach((apt) => {
        if (!apt.svgElementId) return;

        const element = svgElement.querySelector(`[id="${apt.svgElementId}"], [data-apartment-id="${apt.svgElementId}"]`);
        if (!element) return;

        element.removeEventListener('mouseover', handleMouseOver);
        element.removeEventListener('mouseout', handleMouseOut);
        element.removeEventListener('click', handleClick);
        element.removeEventListener('touchstart', handleTouchStart);
        element.removeEventListener('touchend', handleTouchEnd);
      });
    };
  }, [apartments, hoveredApartmentId, selectedApartmentId, filters, setHoveredApartment, setSelectedApartment, getApartmentBySvgId, onApartmentClick]);

  if (!svgContent) {
    return (
      <Card className="p-4">
        <div className="flex flex-col items-center justify-center h-[500px] text-muted-foreground">
          <p>No floor plan available for this building</p>
          <p className="text-sm mt-2">Upload an SVG map to visualize apartments</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="relative">
      <Card className="overflow-hidden">
        {/* Zoom Controls */}
        <div className="absolute top-4 right-4 z-20 flex flex-col gap-2">
          <Button
            size="icon"
            variant="secondary"
            onClick={handleZoomIn}
            disabled={zoom >= 3}
            className="shadow-lg"
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="secondary"
            onClick={handleZoomOut}
            disabled={zoom <= 0.5}
            className="shadow-lg"
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="secondary"
            onClick={handleResetView}
            className="shadow-lg"
          >
            <Maximize2 className="h-4 w-4" />
          </Button>
        </div>

        <div
          ref={svgWrapperRef}
          className="relative w-full h-[600px] bg-muted/20 overflow-hidden cursor-grab active:cursor-grabbing"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleTouchStartPan}
          onTouchMove={handleTouchMovePan}
          onTouchEnd={handleTouchEndPan}
        >
          <div
            ref={svgContainerRef}
            className="w-full h-full transition-transform duration-200 ease-out"
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: 'center center',
            }}
            dangerouslySetInnerHTML={{ __html: svgContent }}
          />
        </div>

        {/* Tooltip */}
        <AnimatePresence>
          {tooltip && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="absolute z-10 pointer-events-none"
              style={{
                left: tooltip.x,
                top: tooltip.y,
                transform: 'translateX(-50%)',
              }}
            >
              <div className="bg-popover text-popover-foreground text-sm px-3 py-1.5 rounded-md shadow-lg border">
                {tooltip.content}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Zoom Level Indicator */}
        <div className="absolute bottom-4 right-4 z-20">
          <div className="bg-secondary text-secondary-foreground text-xs px-2 py-1 rounded shadow-lg">
            {Math.round(zoom * 100)}%
          </div>
        </div>
      </Card>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap gap-3 text-sm">
        {Object.entries(STATUS_COLORS).map(([status, color]) => (
          <div key={status} className="flex items-center gap-2">
            <div
              className="w-4 h-4 rounded border"
              style={{ backgroundColor: color }}
            />
            <span className="capitalize">{status}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
