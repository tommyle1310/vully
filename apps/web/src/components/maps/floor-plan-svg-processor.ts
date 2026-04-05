import { useEffect, useMemo } from 'react';
import { useMapStore } from '@/stores/mapStore';
import type { FloorPlanProps } from './floor-plan';

export const STATUS_COLORS: Record<string, string> = {
  vacant: 'hsl(142, 76%, 45%)',
  occupied: 'hsl(221, 83%, 53%)',
  maintenance: 'hsl(48, 96%, 53%)',
  reserved: 'hsl(263, 70%, 50%)',
};

export const STATUS_HOVER_COLORS: Record<string, string> = {
  vacant: 'hsl(142, 76%, 35%)',
  occupied: 'hsl(221, 83%, 43%)',
  maintenance: 'hsl(48, 96%, 43%)',
  reserved: 'hsl(263, 70%, 40%)',
};

export function useProcessedSvg(svgContent: string) {
  return useMemo(() => {
    if (!svgContent) return '';
    let svg = svgContent;
    svg = svg.replace(/<\?xml[^?]*\?>\s*/g, '');
    svg = svg.replace(/<svg\b([^>]*)>/i, (_match, attrs: string) => {
      let cleaned = attrs
        .replace(/\bwidth\s*=\s*("[^"]*"|'[^']*')/gi, '')
        .replace(/\bheight\s*=\s*("[^"]*"|'[^']*')/gi, '');
      if (!/preserveAspectRatio/i.test(cleaned)) {
        cleaned += ' preserveAspectRatio="xMidYMid meet"';
      }
      return `<svg${cleaned}>`;
    });
    return svg;
  }, [svgContent]);
}

export function useSvgInteractions(
  svgContainerRef: React.RefObject<HTMLDivElement | null>,
  apartments: FloorPlanProps['apartments'],
  onApartmentClick?: (apartmentId: string) => void,
  setTooltip?: (tooltip: { x: number; y: number; content: string } | null) => void,
) {
  const {
    hoveredApartmentId,
    selectedApartmentId,
    filters,
    setHoveredApartment,
    setSelectedApartment,
    setApartments,
    getApartmentBySvgId,
  } = useMapStore();

  // Load apartments into store
  useEffect(() => {
    setApartments(apartments);
  }, [apartments, setApartments]);

  // Ensure SVG has a viewBox for proper scaling
  useEffect(() => {
    const container = svgContainerRef.current;
    if (!container) return;

    const svgEl = container.querySelector('svg');
    if (!svgEl) return;

    if (!svgEl.getAttribute('viewBox')) {
      const bbox = svgEl.getBBox();
      const w = bbox.width || 800;
      const h = bbox.height || 600;
      svgEl.setAttribute('viewBox', `${bbox.x || 0} ${bbox.y || 0} ${w} ${h}`);
    }
  }, [apartments, svgContainerRef]);

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

        const matchesFilter =
          (filters.status.length === 0 || filters.status.includes(apt.status)) &&
          (filters.floor === null || filters.floor === apt.floorIndex);

        element.style.cursor = 'pointer';
        element.style.transition = 'all 0.2s ease';

        if (!matchesFilter) {
          element.style.fill = 'hsl(0, 0%, 70%)';
          element.style.opacity = '0.3';
          element.style.pointerEvents = 'none';
        } else {
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

      if (window.innerWidth >= 768 && setTooltip) {
        const rect = target.getBoundingClientRect();
        const containerRect = svgContainerRef.current!.getBoundingClientRect();

        setTooltip({
          x: rect.left + rect.width / 2 - containerRect.left,
          y: rect.top - containerRect.top - 10,
          content: `${apartment.unit_number} - ${apartment.status}`,
        });
      }
    };

    const handleMouseOut = () => {
      setHoveredApartment(null);
      setTooltip?.(null);
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

    const handleTouchStart = (e: Event) => {
      const target = e.target as SVGElement;
      const svgId = target.id || target.getAttribute('data-apartment-id');
      if (!svgId) return;

      const apartment = getApartmentBySvgId(svgId);
      if (!apartment) return;

      setHoveredApartment(apartment.id);
    };

    const handleTouchEnd = (e: Event) => {
      e.preventDefault();
      const target = e.target as SVGElement;
      const svgId = target.id || target.getAttribute('data-apartment-id');
      if (!svgId) return;

      const apartment = getApartmentBySvgId(svgId);
      if (!apartment) return;

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
      element.addEventListener('touchstart', handleTouchStart, { passive: true });
      element.addEventListener('touchend', handleTouchEnd);
    });

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
  }, [apartments, hoveredApartmentId, selectedApartmentId, filters, setHoveredApartment, setSelectedApartment, getApartmentBySvgId, onApartmentClick, svgContainerRef, setTooltip]);
}
