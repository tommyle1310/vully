import { useMemo } from 'react';
import * as THREE from 'three';
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader.js';

export interface FloorData {
  shapes: THREE.Shape[];
  paths: SVGPathData[];
  metadata: {
    apartments: Array<{
      id: string;
      type: string;
      name: string;
      label: string;
    }>;
    floorHeight: number;
    buildingId: string;
  };
}

interface SVGPathData {
  shape: THREE.Shape;
  type: 'wall' | 'floor' | 'utility' | 'apartment';
  color: string;
  apartmentId?: string;
  apartmentType?: string;
  apartmentName?: string;
  utilityType?: string;
}

export function useSVGto3D(svgContent: string | undefined) {
  return useMemo<FloorData | null>(() => {
    if (!svgContent) return null;

    try {
      const loader = new SVGLoader();
      const svgData = loader.parse(svgContent);
      
      const shapes: THREE.Shape[] = [];
      const paths: SVGPathData[] = [];
      
      // Parse metadata from SVG
      const parser = new DOMParser();
      const svgDoc = parser.parseFromString(svgContent, 'image/svg+xml');
      const metadataEl = svgDoc.querySelector('metadata building-data');
      
      const metadata = {
        apartments: [] as Array<{
          id: string;
          type: string;
          name: string;
          label: string;
        }>,
        floorHeight: 3.0,
        buildingId: 'unknown',
      };

      if (metadataEl) {
        const floorHeightEl = svgDoc.querySelector('floor-height');
        const buildingIdEl = svgDoc.querySelector('building-id');
        const apartmentsEl = svgDoc.querySelectorAll('apartment');

        if (floorHeightEl) {
          metadata.floorHeight = parseFloat(floorHeightEl.textContent || '3.0');
        }
        if (buildingIdEl) {
          metadata.buildingId = buildingIdEl.textContent || 'unknown';
        }
        
        apartmentsEl.forEach((apt) => {
          metadata.apartments.push({
            id: apt.getAttribute('id') || '',
            type: apt.getAttribute('type') || 'unknown',
            name: apt.getAttribute('name') || '',
            label: apt.getAttribute('label') || '',
          });
        });
      }

      // Convert SVG paths to Three.js shapes
      svgData.paths.forEach((path) => {
        const fillColor = path.userData?.style?.fill || '#e0e0e0';
        const apartmentId = path.userData?.node?.getAttribute?.('data-apartment-id');
        const apartmentType = path.userData?.node?.getAttribute?.('data-apartment-type');
        const apartmentName = path.userData?.node?.getAttribute?.('data-apartment-name');
        const utilityType = path.userData?.node?.getAttribute?.('data-utility-type');

        path.toShapes(true).forEach((shape) => {
          shapes.push(shape);
          
          // Determine path type
          let pathType: SVGPathData['type'] = 'apartment';
          if (utilityType) {
            pathType = 'utility';
          } else if (apartmentId) {
            pathType = 'apartment';
          }

          paths.push({
            shape,
            type: pathType,
            color: fillColor,
            apartmentId,
            apartmentType,
            apartmentName,
            utilityType,
          });
        });
      });

      return { shapes, paths, metadata };
    } catch (error) {
      console.error('Failed to parse SVG:', error);
      return null;
    }
  }, [svgContent]);
}
