'use client';

import { Suspense, useMemo, useRef, useEffect, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Grid, Environment } from '@react-three/drei';
import * as THREE from 'three';
import { Floor } from './floor';
import { useSVGto3D } from '@/hooks/use-svg-to-3d';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Maximize2, Minimize2 } from 'lucide-react';

// Apartment status types
export type ApartmentStatus = 'vacant' | 'occupied' | 'maintenance' | 'reserved';

export interface ApartmentStatusInfo {
  svgElementId: string; // SVG data-apartment-id attribute
  floorIndex: number;   // Floor number (1-indexed)
  status: ApartmentStatus;
}

// Status color mapping
export const STATUS_COLORS: Record<ApartmentStatus, string> = {
  vacant: '#eee',      // green-500
  occupied: '#3b82f6',    // blue-500
  maintenance: '#f59e0b', // amber-500
  reserved: '#8b5cf6',    // violet-500
};

interface Building3DProps {
  svgContent: string;
  totalFloors: number;
  buildingName?: string;
  floorHeights?: Record<string, number>; // Per-floor heights
  apartmentStatuses?: ApartmentStatusInfo[]; // NEW: Apartment status colors
  className?: string;
}

function Building3DScene({ 
  svgContent, 
  totalFloors, 
  floorHeights,
  apartmentStatuses,
}: { 
  svgContent: string; 
  totalFloors: number; 
  floorHeights?: Record<string, number>;
  apartmentStatuses?: ApartmentStatusInfo[];
}) {
  const floorData = useSVGto3D(svgContent);
  const cameraRef = useRef<THREE.PerspectiveCamera>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const controlsRef = useRef<any>(null);

  // Calculate cumulative heights for each floor
  const floorPositions = useMemo(() => {
    if (!floorHeights) {
      // Default: uniform 3m per floor
      return Array.from({ length: totalFloors }, (_, i) => i * 3.0);
    }

    let cumulative = 0;
    return Array.from({ length: totalFloors }, (_, i) => {
      const floorNum = i + 1;
      const position = cumulative;
      cumulative += floorHeights[String(floorNum)] || 3.0;
      return position;
    });
  }, [totalFloors, floorHeights]);

  // Calculate building bounds for camera positioning
  const buildingBounds = useMemo(() => {
    if (!floorData) return { width: 100, depth: 100, height: 30 };
    
    // Calculate bounding box from SVG paths
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    
    floorData.shapes.forEach(shape => {
      const points = shape.getPoints();
      points.forEach(point => {
        minX = Math.min(minX, point.x);
        maxX = Math.max(maxX, point.x);
        minY = Math.min(minY, point.y);
        maxY = Math.max(maxY, point.y);
      });
    });
    
    const width = maxX - minX || 100;
    const depth = maxY - minY || 100;
    const height = floorPositions[floorPositions.length - 1] + (floorHeights?.[String(totalFloors)] || 3.0);
    
    return { width, depth, height };
  }, [floorData, floorPositions, floorHeights, totalFloors]);

  // Position camera to view the entire building from outside
  const cameraPosition = useMemo(() => {
    const maxDim = Math.max(buildingBounds.width, buildingBounds.depth, buildingBounds.height);
    const distance = maxDim * 1.5;
    
    return [
      distance * 0.7,  // X: to the side
      distance * 0.8,  // Y: elevated (never inside building)
      distance * 0.7   // Z: in front
    ] as [number, number, number];
  }, [buildingBounds]);

  if (!floorData) {
    return (
      <mesh>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="red" />
      </mesh>
    );
  }

  const { shapes, paths, metadata } = floorData;
  const baseHeight = metadata.floorHeight || 3.0;

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.4} />
      <directionalLight 
        position={[50, 100, 50]} 
        intensity={0.8} 
        castShadow 
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={500}
        shadow-camera-left={-100}
        shadow-camera-right={100}
        shadow-camera-top={100}
        shadow-camera-bottom={-100}
      />
      <hemisphereLight args={['#87CEEB', '#545454', 0.5]} />
      
      {/* Camera - positioned outside and above */}
      <PerspectiveCamera
        ref={cameraRef}
        makeDefault
        position={cameraPosition}
        fov={50}
        near={0.1}
        far={Math.max(buildingBounds.width, buildingBounds.depth, buildingBounds.height) * 10}
      />

      {/* Controls - prevent camera from going below ground or inside building */}
      <OrbitControls
        ref={controlsRef}
        enableDamping
        dampingFactor={0.05}
        minDistance={buildingBounds.height}
        maxDistance={Math.max(buildingBounds.width, buildingBounds.depth, buildingBounds.height) * 3}
        maxPolarAngle={Math.PI / 2.1} // Prevent going below ground
        target={[0, buildingBounds.height / 2, 0]} // Look at center of building
      />

      {/* Environment */}
      <Environment preset="city" />

      {/* Grid - at ground level */}
      <Grid
        position={[0, 0, 0]}
        args={[buildingBounds.width * 3, buildingBounds.depth * 3]}
        cellSize={5}
        cellThickness={0.5}
        cellColor="#6e6e6e"
        sectionSize={10}
        sectionThickness={1}
        sectionColor="#9d4b4b"
        fadeDistance={buildingBounds.width * 2}
        fadeStrength={1}
      />

      {/* Render floors */}
      <group>
        {Array.from({ length: totalFloors }).map((_, index) => {
          const yPosition = floorPositions[index];
          const floorHeight = floorHeights?.[String(index + 1)] || baseHeight;

          return (
            <group key={index} position={[0, yPosition, 0]}>
              <Floor
                shapes={shapes}
                paths={paths}
                floorIndex={index}
                height={floorHeight}
                baseHeight={baseHeight}
                totalFloors={totalFloors}
                apartmentStatuses={apartmentStatuses}
              />
              
              {/* Floor label */}
              {/* TODO: Add 3D text labels for floor numbers */}
            </group>
          );
        })}
      </group>
    </>
  );
}

export function Building3D({ 
  svgContent, 
  totalFloors, 
  buildingName,
  floorHeights,
  apartmentStatuses,
  className 
}: Building3DProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  return (
    <Card ref={containerRef} className={className}>
      <div className="relative w-full h-full">
        {/* Header */}
        <div className="absolute top-4 left-4 z-10 bg-background/80 backdrop-blur-sm rounded-md px-3 py-2">
          <h3 className="font-semibold text-sm">{buildingName || '3D Building View'}</h3>
          <p className="text-xs text-muted-foreground">{totalFloors} floors</p>
        </div>

        {/* Controls */}
        <div className="absolute top-4 right-4 z-10 flex gap-2">
          <Button
            variant="secondary"
            size="icon"
            onClick={toggleFullscreen}
            className="bg-background/80 backdrop-blur-sm"
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
        </div>

        {/* Instructions */}
        <div className="absolute bottom-4 left-4 z-10 bg-background/80 backdrop-blur-sm rounded-md px-3 py-2">
          <p className="text-xs text-muted-foreground">
            🖱️ Drag to rotate • Scroll to zoom • Right-click to pan
          </p>
        </div>

        {/* Canvas */}
        <div className="w-full h-full">
          <Canvas
            shadows
            dpr={[1, 2]}
            gl={{ 
              antialias: true,
              alpha: true,
              preserveDrawingBuffer: true,
            }}
          >
            <Suspense fallback={null}>
              <Building3DScene
                svgContent={svgContent}
                totalFloors={totalFloors}
                floorHeights={floorHeights}
                apartmentStatuses={apartmentStatuses}
              />
            </Suspense>
          </Canvas>
        </div>
      </div>
    </Card>
  );
}

// Skeleton loader export
export function Building3DSkeleton() {
  return (
    <Card className="w-full h-full">
      <Skeleton className="w-full h-full" />
    </Card>
  );
}
