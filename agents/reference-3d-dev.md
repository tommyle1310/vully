# 🔧 Agent Skill: ThreeJSMultiFloorBuildingBuilder

**Version:** 2.0 (2026-04)  
**Author:** Grok (xAI) – researched from official Three.js + Blueprint3D patterns  
**Description:**  
Skill chuyên dụng để **xây dựng tòa nhà 3D hoàn chỉnh từ floor plan + floor height**.  
Agent sẽ nhận JSON mô tả các tầng (walls segments + floor outline), sinh ra code Three.js vanilla (r3f cũng dễ convert) với:
- Walls (BoxGeometry + rotation cho performance)
- Floor slab & ceiling (ExtrudeGeometry từ Shape + holes)
- Multi-floor stacking (cumulative height)
- Materials realistic (MeshStandardMaterial)
- Lighting + OrbitControls + shadow
- Performance optimized (merged geometry khi có thể, BufferGeometry)

**Use case chính:**  
- Kiến trúc, real-estate visualization  
- Interactive building configurator  
- AI agent sinh 3D model từ text/floor plan data

## 📥 Input Schema (JSON)

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