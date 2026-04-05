'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useFloorPlanControls } from './use-floor-plan-controls';
import {
  STATUS_COLORS,
  useProcessedSvg,
  useSvgInteractions,
} from './floor-plan-svg-processor';

export interface FloorPlanProps {
  svgContent: string;
  buildingId: string;
  apartments: Array<{
    id: string;
    unit_number: string;
    floorIndex: number;
    status: 'vacant' | 'occupied' | 'maintenance' | 'reserved';
    grossArea?: number | null;
    bedroomCount: number;
    bathroomCount: number;
    svgElementId?: string | null;
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
    } | null;
  }>;
  onApartmentClick?: (apartmentId: string) => void;
}

export function FloorPlan({ svgContent, apartments, onApartmentClick }: FloorPlanProps) {
  const svgContainerRef = useRef<HTMLDivElement>(null);
  const svgWrapperRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; content: string } | null>(null);

  const processedSvg = useProcessedSvg(svgContent);

  const {
    zoom,
    pan,
    handleZoomIn,
    handleZoomOut,
    handleResetView,
    handleWheel,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleTouchStartPan,
    handleTouchMovePan,
    handleTouchEndPan,
  } = useFloorPlanControls();

  // Attach wheel event listener
  useEffect(() => {
    const wrapper = svgWrapperRef.current;
    if (!wrapper) return;

    wrapper.addEventListener('wheel', handleWheel, { passive: false });
    return () => wrapper.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  useSvgInteractions(svgContainerRef, apartments, onApartmentClick, setTooltip);

  if (!svgContent) {
    return (
      <Card className="p-4">
        <div className="flex flex-col items-center justify-center h-[80vh] text-muted-foreground">
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
            disabled={zoom >= 5}
            className="shadow-lg"
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="secondary"
            onClick={handleZoomOut}
            disabled={zoom <= 0.25}
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
          className="relative w-full h-[80vh] bg-muted/20 overflow-hidden cursor-grab active:cursor-grabbing"
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
            className="w-full h-full [&>svg]:w-full [&>svg]:h-full [&>svg]:block transition-transform duration-200 ease-out"
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: 'center center',
            }}
            dangerouslySetInnerHTML={{ __html: processedSvg }}
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
