# Change: Enhance SVG Builder and Add 3D Viewer

## Why

The current SVG builder has several limitations that affect usability and feature completeness:
1. **Duplicate React key error** in `providers.tsx` caused by AnimatePresence without unique keys on children
2. **Limited apartment templates** - only basic rectangles, missing complex shapes (L-shaped, rectilinear layouts)
3. **No camera pan mode** - users cannot move the canvas view, limiting navigation on large floor plans
4. **Incomplete export** - downloaded SVG only includes unit number label, missing apartment name and type metadata
5. **Missing utility room templates** - no templates for elevators, stairwells, electric rooms, trash rooms, water rooms
6. **No floor height property** - cannot specify vertical dimensions for each floor
7. **No 3D visualization** - administrators cannot preview the full building in 3D based on floor plans

These gaps reduce the tool's effectiveness for creating realistic, complete building layouts and limit its value as a comprehensive property management solution.

## What Changes

### Bug Fix
- **MODIFIED** `providers.tsx`: Fix AnimatePresence duplicate key warning by adding unique key prop to children

### SVG Builder Enhancements
- **ADDED** Complex apartment templates: L-shape, U-shape, rectilinear polygons (via SVG path/polygon)
- **ADDED** Camera pan mode: Toggleable toolbar button that switches between element dragging and canvas panning
- **MODIFIED** Export function: Include apartment name, type, and metadata in data attributes and embedded metadata block
- **ADDED** Utility room templates: Elevator, Stairwell, Electric Room, Trash Room, Water Room (with distinct icons/colors)
- **ADDED** Floor height property: Input field in properties panel to set floor height in meters

### 3D Viewer (New Capability)
- **NEW** Building3DViewer component using @react-three/fiber and @react-three/drei
- **NEW** SVG-to-3D conversion: Parse SVG paths and extrude to 3D geometry using ExtrudeGeometry
- **NEW** Multi-floor rendering: Stack floors vertically based on height property
- **NEW** Material system: Different materials for walls, floors, utility rooms, apartments
- **NEW** Interactive controls: OrbitControls for rotation/zoom, floor visibility toggles

## Impact

### Affected Specs
- **svg-maps** (MODIFIED): Add camera pan mode, complex templates, utility rooms, floor height, 3D integration
- **dashboard** (MODIFIED): Integrate 3D viewer as optional visualization mode
- **apartments** (MODIFIED): Store floor height metadata in building entity

### Affected Code
- `apps/web/src/app/providers.tsx` - Fix React key issue
- `apps/web/src/components/maps/svg-builder.tsx` - Add pan mode, templates, export enhancements
- `apps/web/src/components/maps/svg-builder-dialog.tsx` - Pass new props, integrate 3D viewer
- `apps/web/src/components/maps/building-3d-viewer.tsx` - NEW: 3D rendering component
- `apps/web/src/hooks/use-svg-to-3d.ts` - NEW: SVG parsing and geometry conversion hook
- `apps/api/src/modules/apartments/entities/building.entity.ts` - Add floorHeights JSONB field

### Definition of Done
- [ ] No React warnings or errors in browser console
- [ ] Complex apartment templates render correctly in SVG and export properly
- [ ] Pan mode toggles between element drag and canvas drag smoothly
- [ ] Exported SVG includes all metadata (name, type, apartment data)
- [ ] All utility room templates available and visually distinct
- [ ] Floor height property persists and displays correctly
- [ ] 3D viewer renders multi-floor buildings accurately
- [ ] 3D viewer performs well on buildings with 10+ floors and 50+ apartments
- [ ] Unit tests for SVG parsing logic (>70% coverage)
- [ ] E2E test for full SVG builder workflow

## Non-Goals (Out of Scope)

- Real-time collaborative editing (WebSocket sync for multi-user editing)
- VR/AR visualization modes
- Photorealistic rendering (PBR materials, lighting simulation)
- IFC/BIM format import (industry standard building files)
- Automated floor plan generation from blueprint images (AI-powered)
- Export to other 3D formats (OBJ, FBX, GLTF) - SVG only for now

## Resolved Decisions

### Q1: SVG Polygon vs. Custom Path for Complex Shapes?
**Decision: Polygon with predefined templates**
- Easier for users (no manual path editing)
- Can provide 4-6 common shapes (L, U, T, Z, Plus)
- Can still add free-form path tool later if needed
- **Rationale**: Better UX for 80% of use cases

### Q2: Three.js Raw vs. @react-three/fiber?
**Decision: @react-three/fiber + @react-three/drei**
- React integration is cleaner for Next.js App Router
- Better TypeScript support and component composition
- Drei provides essentials (OrbitControls, Text3D) out of the box
- Bundle size difference negligible (~40KB gzipped)
- **Rationale**: Development speed and maintainability

### Q3: Real-time 3D vs. Pre-rendered Preview?
**Decision: Real-time 3D with OrbitControls**
- More interactive and useful for administrators
- Performance acceptable with InstancedMesh for repeated elements (windows, doors)
- Can add screenshot/export if needed later
- **Rationale**: Better user experience and exploration capability

### Q4: Store Floor Heights Where?
**Decision: JSONB field in Building entity**
- Schema: `floorHeights: { [floorNumber: string]: number }` e.g., `{"1": 3.5, "2": 3.2}`
- Flexible (different heights per floor)
- No migration needed for multiple floors
- Falls back to default 3.0m if not set
- **Rationale**: Flexibility without schema complexity

### Q5: Pan Mode Implementation?
**Decision: Toggle button + state flag**
- When pan mode ON: Mouse drag translates SVG viewBox
- When pan mode OFF: Mouse drag moves elements (current behavior)
- Use `viewBox` transformation instead of translate() for better performance
- **Rationale**: Standard pattern in vector editing tools (Figma, Illustrator)

## Risk Mitigations

### 3D Performance Degradation
- **Risk**: Large buildings (20+ floors, 100+ apartments) may lag
- **Mitigation**: Use InstancedMesh for repeated geometries (apartment units)
- **Mitigation**: Level of Detail (LOD) - reduce polygon count when zoomed out
- **Mitigation**: Virtual floors - only render visible floors based on camera position

### SVG Parser Edge Cases
- **Risk**: User-uploaded SVG may have malformed paths or unsupported features
- **Mitigation**: Use SVGLoader error handling with try/catch
- **Mitigation**: Validate SVG structure before 3D conversion
- **Mitigation**: Show warning if SVG contains unsupported elements (gradients, filters)

### Template Complexity Creep
- **Risk**: Users may request dozens of specific apartment shapes
- **Mitigation**: Start with 6 most common shapes (Rectangle, L, U, T, Z, Plus)
- **Mitigation**: Document how to manually edit SVG for custom needs
- **Mitigation**: Consider custom shape builder tool in future iteration (out of scope)

### Browser Compatibility
- **Risk**: WebGL not available on older browsers
- **Mitigation**: Check WebGL support and gracefully fallback to SVG-only view
- **Mitigation**: Show warning message: "3D view requires a modern browser"
- **Mitigation**: Test on Safari, Firefox, Chrome (latest 2 versions)
