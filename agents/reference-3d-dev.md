# 🔧 3D Building Viewer Reference - Vully Platform

## Context Bootstrap (Run Before Starting)

Before building or modifying 3D/SVG features, read:

1. `.project-context.md` §3 (data flow) and §5 (coding standards — dynamic import rule for heavy components)
2. `apps/web/src/app/(dashboard)/README.context.md` — where 3D viewer surfaces in the dashboard
3. `apps/web/src/hooks/README.context.md` — `useSvgTo3d` hook boundaries

**Performance rule**: `<Building3D />` and `<SvgBuilder />` MUST be `dynamic()` imported with a skeleton loader. Never include Three.js in the initial bundle.

---

**Version:** 2.0 (2026-04)  
**Description:**  
Reference guide for Vully's Three.js building 3D viewer that extrudes SVG floor plans into 3D models using floor heights from the database.

## Current Implementation

**Location**: `apps/web/src/components/3d/`
- `building-3d.tsx`: Main 3D viewer component
- `floor.tsx`: Individual floor component with SVG extrusion

**Hook**: `apps/web/src/hooks/use-svg-to-3d.ts`
- Converts SVG path data to Three.js geometry
- Extrudes 2D floor plans into 3D floors using `Building.floorHeights`

## Architecture

### Data Flow
1. Building model has `svgMapData` (SVG floor plan) and `floorHeights` (array of heights per floor)
2. Each apartment has `svgElementId` linking to its SVG element
3. Three.js viewer:
   - Parses SVG path data into 2D shapes
   - Extrudes each floor using corresponding height from `floorHeights[]`
   - Stacks floors vertically
   - Adds lighting, camera controls (OrbitControls), and materials

### Key Features
- **Multi-floor stacking**: Cumulative height calculation
- **Apartment mapping**: Click detection via raycasting to SVG element IDs
- **Interactive**: Hover effects, click to select apartments
- **Performance**: Merged geometries, BufferGeometry, LOD (Level of Detail)
- **Materials**: MeshStandardMaterial with realistic textures
- **Lighting**: Ambient + Directional + optional shadows

## SVG to 3D Conversion Pattern

```typescript
// Parse SVG path to Three.js Shape
function svgPathToShape(pathData: string): THREE.Shape {
  const shape = new THREE.Shape();
  // Parse SVG path commands (M, L, Q, C, Z)
  // Convert to shape.moveTo(), shape.lineTo(), shape.quadraticCurveTo(), etc.
  return shape;
}

// Extrude floor
function createFloor(shape: THREE.Shape, height: number): THREE.Mesh {
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: height,
    bevelEnabled: false,
  });
  const material = new THREE.MeshStandardMaterial({
    color: '#e5d4b8',
    metalness: 0.1,
    roughness: 0.8,
  });
  return new THREE.Mesh(geometry, material);
}

// Stack floors
function buildMultiFloor(building: Building): THREE.Group {
  const group = new THREE.Group();
  let cumulativeHeight = 0;
  
  building.floorHeights.forEach((height, index) => {
    const floorShape = svgPathToShape(building.svgMapData);
    const floorMesh = createFloor(floorShape, height);
    floorMesh.position.y = cumulativeHeight;
    group.add(floorMesh);
    cumulativeHeight += height;
  });
  
  return group;
}
```

## Usage in Vully

### Building Detail Page
- Shows 3D preview of building with all floors
- Click on floors to navigate to floor plan view
- Rotate/zoom with OrbitControls

### Apartment Selection
- Raycasting to detect clicks on apartment polygons
- Highlight selected apartment
- Show apartment details in side panel

## Future Enhancements
- Roof geometry (pitched/flat)
- Window/door cutouts
- Interior furniture placement
- AR/VR integration
- Export to GLTF format
- Texture mapping from photos

## References
- Three.js Documentation: https://threejs.org/docs/
- ExtrudeGeometry: https://threejs.org/docs/#api/en/geometries/ExtrudeGeometry
- SVG Path Spec: https://developer.mozilla.org/en-US/docs/Web/SVG/Tutorial/Paths
- Vully Building Schema: `apps/api/prisma/schema.prisma` (see `buildings` model)


```json
{
  "building": {
    "name": "string",
    "scale": 1,                  // 1 unit = 1 meter
    "floors": [
      {
        "level": 0,
        "height": 3.5,           // floor-to-floor height (meters)
        "floorPlan": {
          "walls": [             // Wall segments (tốt nhất cho performance)
            {
              "start": { "x": 0, "y": 0 },
              "end": { "x": 10, "y": 0 },
              "thickness": 0.25,
              "heightOverride": null   // null = dùng floor height
            }
            // ... thêm walls
          ],
          "floorOutline": {      // Dùng để tạo floor slab (Shape + holes)
            "points": [          // closed polygon, counterclockwise
              { "x": 0, "y": 0 }, { "x": 20, "y": 0 }, { "x": 20, "y": 15 }, { "x": 0, "y": 15 }
            ],
            "holes": [           // optional (phòng, thang máy...)
              [
                { "x": 2, "y": 2 }, { "x": 8, "y": 2 }, { "x": 8, "y": 8 }, { "x": 2, "y": 8 }
              ]
            ]
          }
        }
      }
      // ... các tầng khác (level 1, 2...)
    ]
  },
  "options": {
    "addCeiling": true,
    "addRoof": true,
    "shadows": true,
    "wireframe": false,
    "materials": {
      "wall": { "color": "#e5d4b8", "metalness": 0.1, "roughness": 0.8 },
      "floor": { "color": "#aaaaaa", "metalness": 0.0, "roughness": 0.9 }
    }
  }
}
📤 Output

Code Three.js hoàn chỉnh (HTML + script) hoặc module ESM.
Scene sẵn dùng ngay với <canvas> hoặc React Three Fiber.

🧠 Step-by-Step Reasoning Guide (Agent phải tuân thủ)

Validate & Parse Input
Kiểm tra mọi wall có start/end hợp lệ.
Tính cumulativeHeight cho từng tầng.

Tạo Building Group
new THREE.Group() tên buildingGroup.

Xử lý từng tầng (loop floors)
Tính currentY = sum previous heights.
Floor slab:
Tạo THREE.Shape() từ points.
Thêm holes (Shape.holes.push(new THREE.Path(holePoints))).
new THREE.ExtrudeGeometry(shape, { depth: 0.2, bevelEnabled: false }).
Mesh với Material floor, position.y = currentY.

Walls:
Với mỗi wall segment:
Tính midpoint, length, angle = Math.atan2(dy, dx).
BoxGeometry(thickness, wallHeight, length).
Mesh → rotateY(angle), position.set(midX, currentY + wallHeight/2, midY).


Ceiling (nếu bật): extrude outline depth 0.2, y = currentY + floor.height.
Roof (tầng cuối): extrude outline depth 0.3, y = top.

Materials & Lights
MeshStandardMaterial cho wall/floor.
AmbientLight + DirectionalLight (shadow nếu bật).
HemisphereLight cho sky.

Optimization
Merge tất cả walls cùng material thành 1 BufferGeometry (dùng BufferGeometryUtils.mergeGeometries).
Dispose geometry/material khi không dùng.

Camera + Controls
PerspectiveCamera + OrbitControls.
Auto-fit camera để xem toàn building.

Export
Trả về code đầy đủ + comment rõ ràng.


📋 Code Template (Agent copy-paste & fill)
HTML<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="utf-8">
  <title>{{building.name}}</title>
  <style>body { margin:0; overflow:hidden; }</style>
</head>
<body>
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r134/three.min.js"></script>
<script src="https://unpkg.com/three@0.134.0/examples/js/controls/OrbitControls.js"></script>
<script>
// === PASTE CODE TỪ AGENT Ở ĐÂY ===
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, window.innerWidth/window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({antialias:true});
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

const controls = new THREE.OrbitControls(camera, renderer.domElement);

// === BUILDING CODE ===
// Agent sẽ sinh phần này từ input JSON

animate();
function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}
</script>
</body>
</html>
🚀 Best Practices & Performance (cực kỳ quan trọng)

Luôn dùng BufferGeometry + mergeGeometries cho walls.
Wall dùng BoxGeometry + rotation nhanh hơn ExtrudeGeometry cho từng segment.
Floor/ceiling dùng ExtrudeGeometry 1 lần (với holes).
Không tạo > 200 mesh riêng lẻ (merge khi có thể).
Scale mặc định = 1 unit = 1 mét.
Thêm mesh.castShadow = mesh.receiveShadow = true cho realism.
Hỗ trợ SVGLoader nếu input là SVG string (nâng cao).

📌 Limitations & Extensions

Hiện tại: walls thẳng (không curve). Muốn curve → nâng cấp sang ExtrudeGeometry + custom path.
Muốn windows/doors: thêm “openings” array trong wall → dùng CSG (three-bvh-csg) hoặc manual subtract.
Multi-material wall (base + trim) → dùng groups.