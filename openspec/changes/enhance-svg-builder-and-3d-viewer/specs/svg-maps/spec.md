# Capability: SVG Maps

## MODIFIED Requirements

### Requirement: Complex Apartment Templates
The system SHALL provide complex apartment shape templates beyond basic rectangles.

#### Scenario: L-shaped apartment template
- **GIVEN** SVG builder template panel
- **WHEN** user selects "L-Shaped" template
- **THEN** a polygon-based L-shaped apartment is added to canvas
- **AND** template has correct dimensions and styling

#### Scenario: Multiple complex shapes
- **GIVEN** template selection panel
- **WHEN** viewing apartment templates
- **THEN** options include: Rectangle, L-Shape, U-Shape, T-Shape, Z-Shape, Plus-Shape
- **AND** each template has a distinct icon

#### Scenario: Complex shape editing
- **GIVEN** complex polygon apartment on canvas
- **WHEN** user selects the apartment
- **THEN** properties panel shows apartment metadata fields
- **AND** user can add apartment ID, name, and type
- **AND** shape can be moved but not resized (predefined dimensions)

---

### Requirement: Utility Room Templates
The system SHALL provide templates for non-apartment spaces.

#### Scenario: Elevator template
- **GIVEN** utility templates panel
- **WHEN** user adds "Elevator" template
- **THEN** a 40x40px rectangle with gray fill is added
- **AND** template has elevator icon overlay

#### Scenario: Utility room types
- **GIVEN** template selection
- **WHEN** viewing utility templates
- **THEN** available types include: Elevator, Stairwell, Electric Room, Trash Room, Water Room
- **AND** each has distinct color coding (gray, light blue, yellow, gray-brown, cyan)

#### Scenario: Utility room identification
- **GIVEN** exported SVG
- **WHEN** SVG contains utility rooms
- **THEN** elements have `data-utility-type` attribute
- **AND** no apartment ID is assigned to utility rooms

---

### Requirement: Camera Pan Mode
The system SHALL allow users to pan the canvas view without moving elements.

#### Scenario: Enable pan mode
- **GIVEN** SVG builder toolbar
- **WHEN** user clicks "Pan Mode" toggle button
- **THEN** button shows active state
- **AND** cursor changes to grab/hand icon
- **AND** mouse drag on canvas pans viewport instead of selecting elements

#### Scenario: Disable pan mode
- **GIVEN** pan mode is active
- **WHEN** user clicks "Pan Mode" button again
- **THEN** button returns to inactive state
- **AND** cursor changes back to crosshair/select cursor
- **AND** mouse drag on elements moves them normally

#### Scenario: ViewBox transformation
- **GIVEN** pan mode enabled
- **WHEN** user drags canvas
- **THEN** SVG viewBox x/y coordinates are updated
- **AND** canvas content moves smoothly without lag
- **AND** all elements maintain their positions relative to each other

---

### Requirement: Enhanced SVG Export with Metadata
The system SHALL export SVG files with complete apartment metadata.

#### Scenario: Export apartment name
- **GIVEN** apartment with custom name "Sunset View"
- **WHEN** SVG is exported
- **THEN** SVG element has `data-apartment-name="Sunset View"` attribute
- **AND** metadata block includes apartment name

#### Scenario: Export apartment type
- **GIVEN** apartment created from "2 Bedroom" template
- **WHEN** SVG is exported
- **THEN** SVG element has `data-apartment-type="2 Bedroom"` attribute
- **AND** metadata block includes apartment type

#### Scenario: Metadata block structure
- **GIVEN** floor plan with multiple apartments
- **WHEN** SVG is exported
- **THEN** SVG contains `<metadata>` element
- **AND** metadata includes: floor height, created timestamp, apartment list with IDs/types/names

#### Scenario: Download filename
- **GIVEN** building named "Tower A"
- **WHEN** user downloads SVG
- **THEN** filename is `tower-a-floor-plan-{timestamp}.svg`
- **AND** timestamp is in Unix epoch format

---

### Requirement: Floor Height Property
The system SHALL allow specification of floor height for 3D rendering.

#### Scenario: Set floor height
- **GIVEN** SVG builder properties panel
- **WHEN** user inputs floor height of 3.5 meters
- **THEN** floor height is stored in component state
- **AND** floor height is included in exported SVG metadata

#### Scenario: Default floor height
- **GIVEN** new floor plan
- **WHEN** floor height is not specified
- **THEN** default value of 3.0 meters is used
- **AND** default is shown in input field as placeholder

#### Scenario: Floor height validation
- **GIVEN** floor height input field
- **WHEN** user enters invalid value (negative, zero, or >10m)
- **THEN** validation error is shown
- **AND** export is blocked until valid value entered

---

## ADDED Requirements

### Requirement: 3D Building Visualization
The system SHALL render 3D building models from SVG floor plans.

#### Scenario: Generate 3D from SVG
- **GIVEN** SVG floor plan with apartments and floor height
- **WHEN** user opens 3D preview tab
- **THEN** floor plan is parsed and converted to 3D geometry
- **AND** apartments are extruded vertically based on floor height
- **AND** 3D model is rendered in canvas

#### Scenario: Multi-floor stacking
- **GIVEN** building with 5 floors
- **WHEN** 3D view is rendered
- **THEN** each floor is positioned vertically at `floorIndex * floorHeight`
- **AND** floors do not overlap
- **AND** vertical gaps between floors are minimal (floor slab thickness)

#### Scenario: WebGL support detection
- **GIVEN** browser without WebGL support
- **WHEN** user attempts to open 3D view
- **THEN** fallback message is shown
- **AND** message suggests using 2D editor
- **AND** no errors are thrown

---

### Requirement: 3D Camera Controls
The system SHALL provide interactive camera controls for 3D view.

#### Scenario: Orbit controls
- **GIVEN** 3D building view
- **WHEN** user drags mouse
- **THEN** camera rotates around building center
- **AND** vertical rotation is constrained (-90° to +90°)

#### Scenario: Zoom controls
- **GIVEN** 3D building view
- **WHEN** user scrolls mouse wheel
- **THEN** camera zooms in/out smoothly
- **AND** zoom is constrained between 5m and 50m distance

#### Scenario: Reset camera
- **GIVEN** 3D view with custom camera position
- **WHEN** user clicks "Reset Camera" button
- **THEN** camera returns to default position (15, 10, 15)
- **AND** transition is smooth (animated over 500ms)

---

### Requirement: 3D Floor Visibility Controls
The system SHALL allow selective floor visibility in 3D view.

#### Scenario: Toggle floor visibility
- **GIVEN** 3D view with 10 floors
- **WHEN** user unchecks "Floor 5" checkbox
- **THEN** floor 5 is hidden from 3D view
- **AND** other floors remain visible
- **AND** change is animated (fade out over 200ms)

#### Scenario: Isolate single floor
- **GIVEN** 3D view with all floors visible
- **WHEN** user clicks "View Only Floor 3" button
- **THEN** all floors except floor 3 are hidden
- **AND** camera adjusts to focus on floor 3

#### Scenario: Show all floors
- **GIVEN** 3D view with some floors hidden
- **WHEN** user clicks "Show All Floors" button
- **THEN** all floors become visible
- **AND** visibility state is saved to session storage

---

### Requirement: 3D Apartment Selection
The system SHALL support apartment selection in 3D view.

#### Scenario: Click to select apartment
- **GIVEN** 3D building view
- **WHEN** user clicks on apartment mesh
- **THEN** apartment is highlighted with emissive glow
- **AND** apartment details panel opens
- **AND** selection callback is triggered with apartment ID

#### Scenario: Selection sync between 2D and 3D
- **GIVEN** both 2D editor and 3D preview tabs open
- **WHEN** user selects apartment in 3D view
- **THEN** same apartment is selected in 2D editor when switching tabs
- **AND** selection state is maintained across tab switches

#### Scenario: Deselect apartment
- **GIVEN** apartment selected in 3D view
- **WHEN** user clicks on empty space
- **THEN** apartment highlight is removed
- **AND** details panel closes

---

### Requirement: 3D Material and Lighting
The system SHALL apply appropriate materials and lighting to 3D elements.

#### Scenario: Wall materials
- **GIVEN** apartment walls in 3D view
- **WHEN** viewing materials
- **THEN** walls use MeshStandardMaterial with apartment fill color
- **AND** materials have 80% opacity for semi-transparency

#### Scenario: Floor slab materials
- **GIVEN** floor slabs between levels
- **WHEN** viewing materials
- **THEN** slabs use light gray color (#f5f5f5)
- **AND** slabs are 20cm thick

#### Scenario: Lighting setup
- **GIVEN** 3D scene
- **WHEN** rendered
- **THEN** scene has ambient light at 50% intensity
- **AND** directional light at (10, 20, 10) position with shadows enabled
- **AND** shadows are rendered on ground plane

---

### Requirement: 3D Performance Optimization
The system SHALL maintain acceptable performance for large buildings.

#### Scenario: Performance target
- **GIVEN** building with 20 floors and 100 apartments
- **WHEN** 3D view is rendered
- **THEN** frame rate is maintained above 30 FPS
- **AND** initial load time is under 3 seconds

#### Scenario: Geometry memoization
- **GIVEN** 3D floor component
- **WHEN** component re-renders
- **THEN** geometries are memoized and not re-created
- **AND** only materials update on selection change

#### Scenario: Instanced rendering (optional optimization)
- **GIVEN** building with many identically-sized apartments
- **WHEN** 3D view uses InstancedMesh
- **THEN** memory usage is reduced by >50%
- **AND** render performance improves measurably

---

## REMOVED Requirements

None. All existing SVG map requirements remain valid.

---

## Integration Points

### With Dashboard Capability
- 3D viewer can be launched from building detail page
- Integration via dialog or full-screen modal

### With Apartments Capability
- Floor height data stored in Building entity (`floorHeights` JSONB field)
- Building API returns floor height metadata for 3D rendering
