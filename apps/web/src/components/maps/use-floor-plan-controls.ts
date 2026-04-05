import { useCallback, useState } from 'react';
import { useMapStore } from '@/stores/mapStore';

export function useFloorPlanControls() {
  const { zoom, pan, setZoom, setPan, resetView } = useMapStore();

  const [isPanning, setIsPanning] = useState(false);
  const [startPan, setStartPan] = useState({ x: 0, y: 0 });
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);

  // Zoom handlers
  const handleZoomIn = useCallback(() => {
    setZoom(Math.min(zoom + 0.25, 5));
  }, [zoom, setZoom]);

  const handleZoomOut = useCallback(() => {
    setZoom(Math.max(zoom - 0.25, 0.25));
  }, [zoom, setZoom]);

  const handleResetView = useCallback(() => {
    resetView();
  }, [resetView]);

  // Mouse wheel zoom
  const handleWheel = useCallback(
    (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      setZoom(Math.max(0.25, Math.min(5, zoom + delta)));
    },
    [zoom, setZoom]
  );

  // Pan handlers
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if ((e.target as HTMLElement).closest('[data-apartment-id], [id]')?.hasAttribute('data-apartment-id')) {
        return;
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
  const handleTouchStartPan = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length === 2) {
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

  return {
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
  };
}
