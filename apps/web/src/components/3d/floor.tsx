'use client';

import { useMemo } from 'react';
import * as THREE from 'three';
import { ExtrudeGeometry } from 'three';
import { ApartmentStatusInfo, STATUS_COLORS } from './building-3d';

interface FloorProps {
  shapes: THREE.Shape[];
  paths: Array<{
    shape: THREE.Shape;
    type: 'wall' | 'floor' | 'utility' | 'apartment';
    color: string;
    apartmentId?: string;
  }>;
  floorIndex: number;
  height: number;
  baseHeight?: number;
  totalFloors: number;
  apartmentStatuses?: ApartmentStatusInfo[];
}

export function Floor({ shapes, paths, floorIndex, height, baseHeight = 3.0, totalFloors, apartmentStatuses }: FloorProps) {
  // Y position is cumulative height (already calculated by parent)
  const yPosition = 0; // Parent group handles positioning

  // Calculate subtle color variation for floor differentiation
  const floorColorMultiplier = useMemo(() => {
    // Slight brightness variation per floor (0.9 to 1.1)
    return 0.95 + (floorIndex / totalFloors) * 0.1;
  }, [floorIndex, totalFloors]);

  // Helper to get color based on apartment status (matches by svgElementId AND floorIndex)
  const getApartmentColor = (apartmentId?: string, originalColor?: string): string => {
    if (!apartmentId || !apartmentStatuses) {
      return originalColor || '#9ca3af'; // Default gray
    }
    // floorIndex in Floor component is 0-indexed, but data is 1-indexed
    const floorNum = floorIndex + 1;
    const statusInfo = apartmentStatuses.find(
      s => s.svgElementId === apartmentId && s.floorIndex === floorNum
    );
    if (statusInfo) {
      return STATUS_COLORS[statusInfo.status] || originalColor || '#9ca3af';
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
      };
    });
  }, [paths, height, apartmentStatuses]);

  return (
    <group position={[0, yPosition, 0]}>
      {geometries.map((item, index) => {
        // Determine material properties based on type
        let baseColor = new THREE.Color(item.color);
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

        return (
          <group key={index}>
            {/* Main mesh with apartment/utility shape */}
            <mesh geometry={item.geometry} castShadow receiveShadow>
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
