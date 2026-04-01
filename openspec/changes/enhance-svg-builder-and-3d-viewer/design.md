# Design: Enhance SVG Builder and Add 3D Viewer

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      SVG Builder Enhanced Architecture                       │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                          SvgBuilderDialog Component                          │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │  Tab: 2D Editor          │         Tab: 3D Preview                   │  │
│  ├──────────────────────────┼───────────────────────────────────────────┤  │
│  │  SvgBuilder (Enhanced)   │   Building3DViewer (NEW)                  │  │
│  └──────────────────────────┴───────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
                   │                                    │
                   │ Exports SVG + Metadata             │ Consumes SVG + Heights
                   ▼                                    ▼
         ┌──────────────────────┐           ┌──────────────────────┐
         │   exportSvg()        │           │  useSVGto3D() Hook   │
         │   - Enhanced with    │           │  - Parse SVG         │
         │     metadata attrs   │           │  - Convert to        │
         │   - apt-name, type   │           │    THREE.Shape       │
         │   - <metadata> block │           │  - Create meshes     │
         └──────────────────────┘           └──────────────────────┘
                                                      │
                                                      ▼
                                           ┌──────────────────────┐
                                           │  @react-three/fiber  │
                                           │  - Canvas            │
                                           │  - ExtrudeGeometry   │
                                           │  - InstancedMesh     │
                                           │  - OrbitControls     │
                                           └──────────────────────┘
```

## Component Breakdown

### 1. Enhanced SvgBuilder Component

**New State Variables:**
```typescript
const [panMode, setPanMode] = useState(false);
const [viewBox, setViewBox] = useState({ x: 0, y: 0, width: 800, height: 600 });
const [floorHeight, setFloorHeight] = useState(3.0); // meters
const [activeTemplate, setActiveTemplate] = useState<'apartments' | 'utilities'>('apartments');
```

**New Template Structures:**
```typescript
// Complex apartment shapes
interface ComplexTemplate {
  id: string;
  name: string;
  type: 'polygon';
  points: string; // SVG points string "x1,y1 x2,y2 x3,y3..."
  icon: LucideIcon;
}

const COMPLEX_APARTMENT_TEMPLATES: ComplexTemplate[] = [
  {
    id: 'l-shape',
    name: 'L-Shaped',
    type: 'polygon',
    points: '0,0 60,0 60,60 100,60 100,140 0,140', // L
    icon: BoxSelect,
  },
  {
    id: 'u-shape',
    name: 'U-Shaped',
    type: 'polygon',
    points: '0,0 30,0 30,100 70,100 70,0 100,0 100,140 0,140', // U
    icon: Columns,
  },
  // ... T, Z, Plus shapes
];

// Utility room templates
interface UtilityTemplate {
  id: string;
  name: string;
  width: number;
  height: number;
  fill: string;
  icon: LucideIcon;
  iconColor: string;
}

const UTILITY_TEMPLATES: UtilityTemplate[] = [
  { id: 'elevator', name: 'Elevator', width: 40, height: 40, fill: '#9ca3af', icon: ArrowUpDown, iconColor: '#1f2937' },
  { id: 'stairwell', name: 'Stairwell', width: 60, height: 80, fill: '#bfdbfe', icon: Stairs, iconColor: '#1e40af' },
  { id: 'electric', name: 'Electric Room', width: 50, height: 50, fill: '#fef08a', icon: Zap, iconColor: '#ca8a04' },
  { id: 'trash', name: 'Trash Room', width: 50, height: 50, fill: '#d1d5db', icon: Trash2, iconColor: '#78716c' },
  { id: 'water', name: 'Water Room', width: 50, height: 50, fill: '#a5f3fc', icon: Droplet, iconColor: '#0e7490' },
];
```

**Pan Mode Implementation:**
```typescript
const handleCanvasDrag = useCallback((e: React.MouseEvent) => {
  if (!panMode || !isDragging) return;
  
  const dx = (e.clientX - dragStart.x) / zoom;
  const dy = (e.clientY - dragStart.y) / zoom;
  
  setViewBox(prev => ({
    ...prev,
    x: prev.x - dx,
    y: prev.y - dy,
  }));
  
  setDragStart({ x: e.clientX, y: e.clientY });
}, [panMode, isDragging, zoom, dragStart]);

// Apply viewBox to SVG
<svg viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`} ... >
```

**Enhanced Export:**
```typescript
const exportSvg = useCallback(() => {
  const svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${canvasSize.width}" height="${canvasSize.height}" 
     viewBox="0 0 ${canvasSize.width} ${canvasSize.height}" 
     xmlns="http://www.w3.org/2000/svg">
  
  <!-- Metadata Block -->
  <metadata>
    <building-data>
      <floor-height>${floorHeight}</floor-height>
      <created-at>${new Date().toISOString()}</created-at>
      <apartments>
        ${elements.filter(el => el.apartmentId).map(el => `
        <apartment 
          id="${el.apartmentId}" 
          type="${el.apartmentType || 'unknown'}" 
          name="${el.apartmentName || ''}" 
          label="${el.label || ''}"
        />`).join('\n')}
      </apartments>
    </building-data>
  </metadata>

  <g id="apartments">
    ${elements.map(el => {
      if (el.type === 'rect') {
        return `
    <rect 
      data-apartment-id="${el.apartmentId || ''}"
      data-apartment-type="${el.apartmentType || ''}"
      data-apartment-name="${el.apartmentName || ''}"
      data-utility-type="${el.utilityType || ''}"
      x="${el.x}" y="${el.y}" 
      width="${el.width}" height="${el.height}" 
      fill="${el.fill}" stroke="${el.stroke}" stroke-width="${el.strokeWidth}"
      rx="4"
    />
    ${el.label ? `<text ...>${el.label}</text>` : ''}
    ${el.apartmentName ? `<text ...>${el.apartmentName}</text>` : ''}
        `;
      } else if (el.type === 'polygon') {
        return `
    <polygon 
      data-apartment-id="${el.apartmentId || ''}"
      data-apartment-type="${el.apartmentType || ''}"
      data-apartment-name="${el.apartmentName || ''}"
      points="${el.points}" 
      fill="${el.fill}" stroke="${el.stroke}" stroke-width="${el.strokeWidth}"
    />
        `;
      }
      // ... other types
    }).join('\n')}
  </g>
</svg>`;
  return svgContent;
}, [elements, canvasSize, floorHeight]);
```

---

## 2. Building3DViewer Component Design

### Component Structure

```typescript
interface Building3DViewerProps {
  svgContent: string;
  floorHeight?: number;
  floorCount?: number;
  onApartmentSelect?: (apartmentId: string) => void;
  selectedApartmentId?: string;
}

export function Building3DViewer({
  svgContent,
  floorHeight = 3.0,
  floorCount = 1,
  onApartmentSelect,
  selectedApartmentId,
}: Building3DViewerProps) {
  const shapes = useSVGto3D(svgContent);
  const [visibleFloors, setVisibleFloors] = useState<Set<number>>(
    new Set(Array.from({ length: floorCount }, (_, i) => i))
  );

  return (
    <div className="relative w-full h-full">
      {/* Controls Overlay */}
      <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
        <Card className="p-3">
          <Label className="text-xs mb-2">Visible Floors</Label>
          {Array.from({ length: floorCount }).map((_, i) => (
            <div key={i} className="flex items-center gap-2">
              <Checkbox
                checked={visibleFloors.has(i)}
                onCheckedChange={(checked) => {
                  const newSet = new Set(visibleFloors);
                  if (checked) newSet.add(i);
                  else newSet.delete(i);
                  setVisibleFloors(newSet);
                }}
              />
              <span className="text-sm">Floor {i + 1}</span>
            </div>
          ))}
        </Card>
        <Button variant="outline" size="sm" onClick={resetCamera}>
          <RotateCcw className="h-4 w-4 mr-1" />
          Reset Camera
        </Button>
      </div>

      {/* Three.js Canvas */}
      <Canvas camera={{ position: [15, 10, 15], fov: 50 }}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 20, 10]} intensity={1} castShadow />
        <OrbitControls />

        {/* Render Floors */}
        {Array.from({ length: floorCount }).map((_, floorIndex) => (
          visibleFloors.has(floorIndex) && (
            <Floor
              key={floorIndex}
              shapes={shapes}
              floorIndex={floorIndex}
              height={floorHeight}
              selectedApartmentId={selectedApartmentId}
              onApartmentClick={onApartmentSelect}
            />
          )
        ))}

        {/* Ground Plane */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]} receiveShadow>
          <planeGeometry args={[50, 50]} />
          <meshStandardMaterial color="#e5e7eb" />
        </mesh>
      </Canvas>
    </div>
  );
}
```

### useSVGto3D Hook Implementation

```typescript
import { useMemo } from 'react';
import * as THREE from 'three';
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader';

interface ShapeData {
  shape: THREE.Shape;
  apartmentId?: string;
  apartmentType?: string;
  apartmentName?: string;
  utilityType?: string;
  fill: string;
  metadata: {
    x: number;
    y: number;
    width?: number;
    height?: number;
  };
}

export function useSVGto3D(svgContent: string): ShapeData[] {
  return useMemo(() => {
    if (!svgContent) return [];

    try {
      const parser = new DOMParser();
      const svgDoc = parser.parseFromString(svgContent, 'image/svg+xml');
      const svgElement = svgDoc.querySelector('svg');
      
      if (!svgElement) return [];

      const shapes: ShapeData[] = [];

      // Parse rectangles
      const rects = svgDoc.querySelectorAll('rect');
      rects.forEach(rect => {
        const x = Number(rect.getAttribute('x')) || 0;
        const y = Number(rect.getAttribute('y')) || 0;
        const width = Number(rect.getAttribute('width')) || 100;
        const height = Number(rect.getAttribute('height')) || 80;

        // Create THREE.Shape for rectangle
        const shape = new THREE.Shape();
        shape.moveTo(x, -y); // Flip Y-axis (SVG vs Three.js coordinate system)
        shape.lineTo(x + width, -y);
        shape.lineTo(x + width, -(y + height));
        shape.lineTo(x, -(y + height));
        shape.lineTo(x, -y);

        shapes.push({
          shape,
          apartmentId: rect.getAttribute('data-apartment-id') || undefined,
          apartmentType: rect.getAttribute('data-apartment-type') || undefined,
          apartmentName: rect.getAttribute('data-apartment-name') || undefined,
          utilityType: rect.getAttribute('data-utility-type') || undefined,
          fill: rect.getAttribute('fill') || '#e0e0e0',
          metadata: { x, y, width, height },
        });
      });

      // Parse polygons
      const polygons = svgDoc.querySelectorAll('polygon');
      polygons.forEach(polygon => {
        const pointsAttr = polygon.getAttribute('points');
        if (!pointsAttr) return;

        const points = pointsAttr
          .trim()
          .split(/\s+/)
          .map(p => p.split(',').map(Number));

        if (points.length < 3) return;

        const shape = new THREE.Shape();
        shape.moveTo(points[0][0], -points[0][1]); // Flip Y
        for (let i = 1; i < points.length; i++) {
          shape.lineTo(points[i][0], -points[i][1]);
        }
        shape.lineTo(points[0][0], -points[0][1]); // Close path

        shapes.push({
          shape,
          apartmentId: polygon.getAttribute('data-apartment-id') || undefined,
          apartmentType: polygon.getAttribute('data-apartment-type') || undefined,
          apartmentName: polygon.getAttribute('data-apartment-name') || undefined,
          fill: polygon.getAttribute('fill') || '#e0e0e0',
          metadata: { x: points[0][0], y: points[0][1] },
        });
      });

      return shapes;
    } catch (error) {
      console.error('Failed to parse SVG:', error);
      return [];
    }
  }, [svgContent]);
}
```

### Floor Component (Sub-component)

```typescript
interface FloorProps {
  shapes: ShapeData[];
  floorIndex: number;
  height: number;
  selectedApartmentId?: string;
  onApartmentClick?: (apartmentId: string) => void;
}

function Floor({
  shapes,
  floorIndex,
  height,
  selectedApartmentId,
  onApartmentClick,
}: FloorProps) {
  const yPosition = floorIndex * height;

  // Memoize geometries to avoid re-creation
  const geometries = useMemo(() => {
    return shapes.map(shapeData => {
      const extrudeSettings = {
        depth: height * 0.9, // 90% of floor height (leave gap for floor slab)
        bevelEnabled: false,
      };
      return new THREE.ExtrudeGeometry(shapeData.shape, extrudeSettings);
    });
  }, [shapes, height]);

  return (
    <group position={[0, yPosition, 0]}>
      {/* Floor Slab */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[30, 0.2, 30]} />
        <meshStandardMaterial color="#f5f5f5" />
      </mesh>

      {/* Apartment/Room Meshes */}
      {shapes.map((shapeData, index) => {
        const isSelected = shapeData.apartmentId === selectedApartmentId;
        const materialColor = shapeData.fill;

        return (
          <mesh
            key={`${floorIndex}-${index}`}
            geometry={geometries[index]}
            onClick={() => shapeData.apartmentId && onApartmentClick?.(shapeData.apartmentId)}
            castShadow
          >
            <meshStandardMaterial
              color={materialColor}
              emissive={isSelected ? '#3b82f6' : '#000000'}
              emissiveIntensity={isSelected ? 0.5 : 0}
              transparent
              opacity={0.8}
            />
          </mesh>
        );
      })}
    </group>
  );
}
```

---

## 3. Performance Optimizations

### Strategy 1: InstancedMesh for Repeated Geometry

For buildings with many identical apartments:

```typescript
function FloorOptimized({ shapes, floorIndex, height }: FloorProps) {
  const instancedRefs = useRef<Map<string, THREE.InstancedMesh>>(new Map());

  // Group shapes by dimensions (width x height)
  const shapeGroups = useMemo(() => {
    const groups = new Map<string, ShapeData[]>();
    shapes.forEach(shape => {
      const key = `${shape.metadata.width}-${shape.metadata.height}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(shape);
    });
    return groups;
  }, [shapes]);

  return (
    <group position={[0, floorIndex * height, 0]}>
      {Array.from(shapeGroups.entries()).map(([key, groupShapes]) => {
        if (groupShapes.length === 1) {
          // Single instance - use regular mesh
          return <RegularMesh key={key} shapeData={groupShapes[0]} />;
        } else {
          // Multiple instances - use InstancedMesh
          return (
            <InstancedApartments
              key={key}
              shapes={groupShapes}
              height={height}
            />
          );
        }
      })}
    </group>
  );
}
```

### Strategy 2: Level of Detail (LOD)

Reduce polygon count when camera is far away:

```typescript
import { useLOD } from '@react-three/drei';

function ApartmentWithLOD({ shape, height }: { shape: ShapeData; height: number }) {
  const lodRef = useRef();
  
  // High detail geometry
  const highGeo = useMemo(() => {
    return new THREE.ExtrudeGeometry(shape.shape, { depth: height, bevelEnabled: true });
  }, [shape, height]);
  
  // Low detail geometry (simplified)
  const lowGeo = useMemo(() => {
    return new THREE.BoxGeometry(
      shape.metadata.width || 100,
      height,
      shape.metadata.height || 80
    );
  }, [shape, height]);

  return (
    <LOD ref={lodRef} distances={[0, 20, 50]}>
      <mesh geometry={highGeo}><meshStandardMaterial color={shape.fill} /></mesh>
      <mesh geometry={lowGeo}><meshStandardMaterial color={shape.fill} /></mesh>
    </LOD>
  );
}
```

### Strategy 3: Virtual Floor Rendering

Only render floors within camera frustum:

```typescript
function Building3DViewer({ ... }) {
  const { camera } = useThree();
  const [visibleFloorIndices, setVisibleFloorIndices] = useState<number[]>([]);

  useFrame(() => {
    const cameraY = camera.position.y;
    const visibleRange = 5; // Render ±5 floors from camera height
    
    const centerFloor = Math.floor(cameraY / floorHeight);
    const visible = Array.from(
      { length: visibleRange * 2 + 1 },
      (_, i) => centerFloor - visibleRange + i
    ).filter(i => i >= 0 && i < floorCount);
    
    setVisibleFloorIndices(visible);
  });

  return (
    <>
      {visibleFloorIndices.map(i => (
        <Floor key={i} floorIndex={i} ... />
      ))}
    </>
  );
}
```

---

## 4. Backend Schema Changes

### Prisma Schema Update

```prisma
model Building {
  // ... existing fields
  
  floorHeights Json? @default("{}")  // { "1": 3.5, "2": 3.2, "3": 3.0 }
}
```

### Migration

```sql
-- 20260401_add_floor_heights_to_buildings.sql
ALTER TABLE "buildings" 
ADD COLUMN "floor_heights" JSONB DEFAULT '{}';

-- Optional: Create index for JSONB queries
CREATE INDEX idx_buildings_floor_heights ON "buildings" USING GIN ("floor_heights");
```

---

## 5. File Structure

```
apps/web/src/
├── components/
│   └── maps/
│       ├── svg-builder.tsx              # MODIFIED: Add pan mode, templates
│       ├── svg-builder-dialog.tsx       # MODIFIED: Add 3D tab
│       ├── building-3d-viewer.tsx       # NEW: Main 3D component
│       ├── floor-3d.tsx                 # NEW: Single floor renderer
│       └── apartment-templates.ts       # NEW: Template definitions
├── hooks/
│   ├── use-svg-to-3d.ts                 # NEW: SVG parsing hook
│   └── use-3d-performance.ts            # NEW: Performance monitoring
└── app/
    └── providers.tsx                     # MODIFIED: Fix React key warning

apps/api/src/
└── modules/
    └── apartments/
        ├── entities/
        │   └── building.entity.ts        # MODIFIED: Add floorHeights field
        └── dto/
            └── update-building.dto.ts    # MODIFIED: Add floorHeights property
```

---

## 6. Browser Compatibility

Minimum requirements:
- Chrome 90+
- Firefox 88+
- Safari 14.1+
- Edge 90+

WebGL detection fallback:
```typescript
function checkWebGLSupport(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return !!(
      window.WebGLRenderingContext &&
      (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
    );
  } catch (e) {
    return false;
  }
}

export function Building3DViewer({ ... }: Building3DViewerProps) {
  const [webGLSupported] = useState(checkWebGLSupport);

  if (!webGLSupported) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <AlertCircle className="h-12 w-12 text-yellow-600 mb-4" />
        <h3 className="text-lg font-semibold">3D View Not Available</h3>
        <p className="text-muted-foreground">
          Your browser doesn't support WebGL. Please use the 2D editor.
        </p>
      </div>
    );
  }

  return <Canvas>...</Canvas>;
}
```
