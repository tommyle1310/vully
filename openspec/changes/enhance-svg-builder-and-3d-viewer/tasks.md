# Tasks: Enhance SVG Builder and Add 3D Viewer

## Phase 0: Bug Fix & Foundation

### 0.1 Fix providers.tsx React Key Warning
- [x] Add unique `key` prop to children wrapped in AnimatePresence
- [x] Test that no duplicate key warnings appear in console
- [x] Verify page transitions still work with Framer Motion

**Dependencies**: None - can be done immediately

---

## Phase 1: SVG Builder Template Enhancements

### 1.1 Add Complex Apartment Shape Templates
- [x] Define polygon point arrays for L-shape, U-shape, T-shape, Z-shape, Plus-shape templates
- [x] Update `APARTMENT_TEMPLATES` array with new entries (type: 'polygon')
- [x] Render polygon elements in SVG canvas
- [x] Add distinct icons for each shape in template picker (use lucide-react icons or custom SVG)
- [x] Test that complex shapes can be added, moved, and selected

### 1.2 Add Utility Room Templates
- [x] Create `UTILITY_TEMPLATES` constant with: Elevator, Stairwell, Electric Room, Trash Room, Water Room
- [x] Assign distinct colors/fills: Elevator (gray), Stairwell (light blue), Electric (yellow),Trash (brown), Water (cyan)
- [x] Add icon representations for each utility type
- [x] Create separate tab or section in template sidebar
- [x] Test adding utility rooms alongside apartments

**Dependencies**: None

---

## Phase 2: Camera Pan Mode

### 2.1 Implement Pan Mode State Management
- [x] Add `panMode` boolean state to SvgBuilder component
- [x] Add toolbar toggle button with Move/Hand icon (lucide-react)
- [x] Update button style to show active state when pan mode enabled

### 2.2 Implement Canvas Panning Logic
- [x] Add `viewBox` state to track current viewport position
- [x] When pan mode ON + mouse drag: translate viewBox instead of elements
- [x] Prevent element selection/drag when pan mode is active
- [x] Add visual cursor change (grab/grabbing) during pan
- [x] Test panning large canvases (1600x1200 viewBox)

**Dependencies**: 2.1 must complete before 2.2

---

## Phase 3: Enhanced Export with Metadata

### 3.1 Modify SVG Export Function
- [x] Update `exportSvg()` to include `data-apartment-type` attribute on rect elements
- [x] Update `exportSvg()` to include `data-apartment-name` attribute on rect elements
- [x] Add embedded `<metadata>` block in SVG root with structured data (JSON)
- [x] Update download function to use building name + timestamp in filename

### 3.2 Improve Label Rendering in Export
- [x] Ensure apartment type renders as sub-label in exported SVG
- [x] Ensure apartment name renders above/below unit number
- [x] Add styling to make labels readable (stroke outline for contrast)
- [x] Test that exported SVG opens in browsers and vector editors correctly

**Dependencies**: None

---

## Phase 4: Floor Height Property

### 4.1 Backend Schema Update
- [x] Add `floorHeights` JSONB field to Building entity in Prisma schema
- [x] Create migration: `20260401_add_floor_heights_to_buildings.sql`
- [x] Update BuildingDto to include `floorHeights?: Record<string, number>`
- [x] Update building update endpoint to accept floor height data
- [x] Test API accepts and returns floor height data

### 4.2 Frontend Floor Height UI
- [x] Add "Floor Height (m)" input field in SVG builder properties panel
- [x] Store floor height in component state and pass to export function
- [x] Include floor height in metadata block of exported SVG
- [x] Add default value of 3.0m if not specified
- [x] Test that height persists when saving and reloading floor plan

**Dependencies**: 4.1 must complete before 4.2

---

## Phase 5: 3D Viewer Foundation

### 5.1 Install Three.js Dependencies
- [x] Install: `three`, `@react-three/fiber`, `@react-three/drei`
- [x] Install types: `@types/three`
- [x] Verify bundle size impact (should be ~100KB gzipped)
- [x] Test that Three.js renders basic scene in Next.js App Router

### 5.2 Create Building3DViewer Component Skeleton
- [x] Create `apps/web/src/components/maps/building-3d-viewer.tsx`
- [x] Setup Canvas component from @react-three/fiber
- [x] Add OrbitControls from @react-three/drei
- [x] Add basic lighting (ambient + directional)
- [x] Render a simple test cube to verify 3D is working
- [x] Add WebGL support detection with fallback message

**Dependencies**: 5.1 must complete before 5.2

---

## Phase 6: SVG to 3D Conversion

### 6.1 Create SVG Parsing Hook
- [x] Create `apps/web/src/hooks/use-svg-to-3d.ts`
- [x] Use DOMParser to parse SVG string
- [x] Extract rect elements and convert to THREE.Shape
- [x] Extract polygon/path elements and convert to THREE.Shape
- [x] Handle SVG coordinate system flip (Y-axis inversion)
- [x] Return array of shapes with metadata (apartmentId, type, fill color)

### 6.2 Implement Extrude Geometry for Walls
- [x] Use ExtrudeGeometry to add depth to wall shapes
- [x] Apply extrude depth based on floor height parameter
- [x] Create THREE.Mesh for each wall with appropriate material
- [x] Group walls by floor level for organization

### 6.3 Create Floor Geometry
- [x] Generate floor plane geometry (thin ExtrudeGeometry or PlaneGeometry)
- [x] Position floor at base of each level
- [x] Apply distinct material (lighter color than walls)
- [x] Test floor rendering with multiple levels

**Dependencies**: 6.1 must complete before 6.2 and 6.3

---

## Phase 7: Multi-Floor Rendering

### 7.1 Implement Floor Stacking Logic
- [x] Create `<Floor>` sub-component that takes floor data + height + index
- [x] Position each floor vertically: `y = index * height`
- [x] Use `useMemo` to prevent re-computation of geometry on re-renders
- [x] Test with 10+ floors to verify performance

### 7.2 Material System
- [x] Define material presets: wall (gray MeshStandardMaterial), floor (beige), apartment (semi-transparent)
- [x] Apply different materials based on apartment vs utility room type
- [x] Add slight emissive glow to highlight selected apartment in 3D
- [x] Test that materials look good under scene lighting

### 7.3 Optimize with InstancedMesh
- [ ] Identify repeated geometries (same-size apartments)
- [ ] Use InstancedMesh for apartments with identical dimensions
- [ ] Measure FPS improvement (target: 60 FPS for 20 floors, 100 apartments)
- [ ] Add performance monitoring in dev mode

**Dependencies**: 7.1 must complete before 7.2 and 7.3

---

## Phase 8: 3D Viewer UI Integration

### 8.1 Add 3D Viewer to SVG Builder Dialog
- [x] Add "3D Preview" tab or button in SvgBuilderDialog
- [x] Toggle between 2D SVG editor and 3D viewer
- [x] Pass current SVG content and floor height to 3D viewer
- [x] Use Framer Motion for smooth tab transitions

### 8.2 Interactive Floor Controls
- [ ] Add floor visibility toggles (checkboxes for each floor)
- [ ] Implement floor isolation mode (view single floor)
- [x] Add "Reset Camera" button to return to default view
- [ ] Show floor labels in 3D space using Text3D or HTML annotations

### 8.3 Apartment Selection Sync
- [ ] Click on apartment in 3D to select (raycasting)
- [ ] Highlight selected apartment with outline or color change
- [ ] Sync selection between 2D and 3D views (if both visible)
- [ ] Show apartment details in sidebar when selected in 3D

**Dependencies**: 8.1 must complete before 8.2 and 8.3

---

## Phase 9: Testing & Polish

### 9.1 Unit Tests
- [ ] Write tests for SVG parsing logic (use-svg-to-3d hook)
- [ ] Test complex shape template generation
- [ ] Test pan mode viewport calculations
- [ ] Test metadata export function
- [ ] Achieve >70% coverage for new code

### 9.2 E2E Tests
- [ ] Test full workflow: Add apartment → Add utility room → Export SVG
- [ ] Test 3D viewer: Load SVG → Render 3D → Rotate camera → Select apartment
- [ ] Test pan mode: Toggle pan → Drag canvas → Toggle off → Drag element
- [ ] Test floor height: Set height → Save → Reload → Verify persisted

### 9.3 Performance Optimization
- [ ] Profile 3D viewer with large buildings (20 floors, 100 apartments)
- [ ] Implement LOD (Level of Detail) if FPS drops below 30
- [ ] Add loading skeleton for 3D viewer
- [ ] Test on Safari, Firefox, Chrome (latest 2 versions each)

### 9.4 Documentation
- [ ] Update SVG_BUILDER_GUIDE.md with new templates and pan mode
- [ ] Create 3D_VIEWER_GUIDE.md with usage instructions
- [ ] Add JSDoc comments to all new hooks and components
- [ ] Update copilot-instructions.md with 3D viewer patterns

**Dependencies**: All previous phases should be complete

---

## Phase 10: Final Review & Deployment

### 10.1 Code Review
- [ ] Review all code changes for TypeScript strict mode compliance
- [ ] Verify no `any` types introduced
- [ ] Check that all Shadcn/UI components used (no native HTML)
- [ ] Ensure all async operations use TanStack Query where appropriate

### 10.2 Accessibility Checks
- [ ] Ensure 3D viewer has keyboard controls (arrow keys for orbit)
- [ ] Add ARIA labels to all new buttons and controls
- [ ] Test screen reader compatibility
- [ ] Verify color contrast ratios meet WCAG 2.1 AA

### 10.3 Deployment Checklist
- [ ] Run `pnpm build` for both apps (no errors)
- [ ] Run Lighthouse audit (Performance > 90, Accessibility > 95)
- [ ] Test on production build locally
- [ ] Create deployment PR with full changelist
- [ ] Get approval from code reviewer

**Dependencies**: All previous phases complete

---

## Parallelizable Work

- **Phase 1 (Templates)** and **Phase 2 (Pan Mode)** can run concurrently
- **Phase 3 (Export)** and **Phase 4 (Floor Height)** can run concurrently
- **Phase 5-7 (3D Viewer)** are sequential but independent of Phase 1-4
- **Phase 9 (Testing)** can start in parallel with Phase 8 for completed features
