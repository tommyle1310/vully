'use client';

import { useMemo, useCallback } from 'react';
import * as THREE from 'three';
import { ExtrudeGeometry, ThreeEvent } from 'three';
import { ApartmentStatusInfo, STATUS_COLORS, ApartmentStatus } from './building-3d';

// Hover info type for tooltip display
export interface HoverInfo {
  type: 'apartment' | 'utility';
  label?: string;
  apartmentType?: string;
  apartmentName?: string;
  utilityType?: string;
  status?: ApartmentStatus;
  grossArea?: number;
  floorIndex: number;
}

interface FloorProps {
  shapes: THREE.Shape[];
  paths: Array<{
    shape: THREE.Shape;
    type: 'wall' | 'floor' | 'utility' | 'apartment';
    color: string;
    apartmentId?: string;
    apartmentType?: string;
    apartmentName?: string;
    utilityType?: string;
    label?: string;
    grossArea?: number;
  }>;
  floorIndex: number;
  height: number;
  baseHeight?: number;
  totalFloors: number;
  apartmentStatuses?: ApartmentStatusInfo[];
  onHover?: (info: HoverInfo | null, event: ThreeEvent<PointerEvent>) => void;
}

export function Floor({ paths, floorIndex, height, totalFloors, apartmentStatuses, onHover }: FloorProps) {
  // Y position is cumulative height (already calculated by parent)
  const yPosition = 0; // Parent group handles positioning

  // Calculate subtle color variation for floor differentiation
  const floorColorMultiplier = useMemo(() => {
    // Slight brightness variation per floor (0.9 to 1.1)
    return 0.95 + (floorIndex / totalFloors) * 0.1;
  }, [floorIndex, totalFloors]);

  // Helper to get status for an apartment
  const getApartmentStatus = (apartmentId?: string): ApartmentStatus | undefined => {
    if (!apartmentId || !apartmentStatuses) return undefined;
    const floorNum = floorIndex + 1;
    const statusInfo = apartmentStatuses.find(
      s => s.svgElementId === apartmentId && s.floorIndex === floorNum
    );
    return statusInfo?.status;
  };

  // Helper to get color based on apartment status (matches by svgElementId AND floorIndex)
  const getApartmentColor = (apartmentId?: string, originalColor?: string): string => {
    const status = getApartmentStatus(apartmentId);
    if (status) {
      return STATUS_COLORS[status] || originalColor || '#9ca3af';
    }
    return originalColor || '#9ca3af';
  };

  // Memoize geometries to avoid recalculation on every render
  const geometries = useMemo(() => {
    return paths.map((pathData) => {
      // Create extrude settings
      // Extrude in the Y direction (upward)
      const extrudeSettings = {
        depth: height,
        bevelEnabled: false,
      };

      // Create geometry from the shape
      const geometry = new ExtrudeGeometry(pathData.shape, extrudeSettings);
      
      // SVG coordinates: X-right, Y-down
      // Three.js floor plan: X-right, Z-forward (into screen), Y-up
      // Transform: SVG(x,y) → Three.js(x, 0, -y)
      // 1. Rotate -90° around X axis to make extrusion go up (Y+) instead of Z+
      // 2. The shapes are already in XY plane, rotating makes them XZ plane with Y as height
      geometry.rotateX(-Math.PI / 2);
      
      // Create edges geometry for borders
      const edges = new THREE.EdgesGeometry(geometry, 15); // 15 degree threshold
      
      // Determine color: use status-based color for apartments
      const color = pathData.type === 'apartment' 
        ? getApartmentColor(pathData.apartmentId, pathData.color)
        : pathData.color;
      
      return {
        geometry,
        edges,
        color,
        type: pathData.type,
        apartmentId: pathData.apartmentId,
        apartmentType: pathData.apartmentType,
        apartmentName: pathData.apartmentName,
        utilityType: pathData.utilityType,
        label: pathData.label,
        grossArea: pathData.grossArea,
      };
    });
  }, [paths, height, apartmentStatuses]);

  // Create hover handler
  const handlePointerEnter = useCallback((
    item: typeof geometries[number],
    event: ThreeEvent<PointerEvent>
  ) => {
    if (!onHover) return;
    if (item.type !== 'apartment' && item.type !== 'utility') return;

    const status = item.type === 'apartment' ? getApartmentStatus(item.apartmentId) : undefined;
    
    onHover({
      type: item.type,
      label: item.label,
      apartmentType: item.apartmentType,
      apartmentName: item.apartmentName,
      utilityType: item.utilityType,
      status,
      grossArea: item.grossArea,
      floorIndex: floorIndex + 1, // 1-indexed for display
    }, event);
  }, [onHover, floorIndex, getApartmentStatus]);

  const handlePointerLeave = useCallback(() => {
    if (onHover) {
      onHover(null, null as unknown as ThreeEvent<PointerEvent>);
    }
  }, [onHover]);

  return (
    <group position={[0, yPosition, 0]}>
      {geometries.map((item, index) => {
        // Determine material properties based on type
        const baseColor = new THREE.Color(item.color);
        // Apply floor-based brightness variation
        baseColor.multiplyScalar(floorColorMultiplier);
        let opacity = 1.0;
        let edgeColor = '#000000';
        
        if (item.type === 'utility') {
          opacity = 0.8;
          edgeColor = '#444444';
        } else if (item.type === 'apartment') {
          edgeColor = '#1a1a1a';
        }

        const isInteractive = item.type === 'apartment' || item.type === 'utility';

        return (
          <group key={index}>
            {/* Main mesh with apartment/utility shape */}
            <mesh 
              geometry={item.geometry} 
              castShadow 
              receiveShadow
              onPointerEnter={isInteractive ? (e) => {
                e.stopPropagation();
                handlePointerEnter(item, e);
              } : undefined}
              onPointerLeave={isInteractive ? handlePointerLeave : undefined}
            >
              <meshStandardMaterial 
                color={baseColor} 
                transparent={opacity < 1}
                opacity={opacity}
                side={THREE.DoubleSide}
                metalness={0.1}
                roughness={0.8}
              />
            </mesh>
            
            {/* Edges/borders for visual separation */}
            <lineSegments geometry={item.edges}>
              <lineBasicMaterial color={edgeColor} linewidth={1} />
            </lineSegments>
          </group>
        );
      })}
    </group>
  );
}
