# Capability: Dashboard

## MODIFIED Requirements

### Requirement: Building Visualization Integration
The system SHALL integrate 3D building visualization into dashboard views.

#### Scenario: Access 3D viewer from building page
- **GIVEN** building detail page
- **WHEN** administrator views building with SVG floor plan
- **THEN** "View 3D" button is available in header
- **AND** button is disabled if no SVG map exists

#### Scenario: Launch 3D viewer dialog
- **GIVEN** building with uploaded floor plan
- **WHEN** administrator clicks "View 3D" button
- **THEN** full-screen dialog opens with 3D viewer
- **AND** dialog contains tabs: "2D Editor" and "3D Preview"
- **AND** smooth transition animation occurs (Framer Motion)

#### Scenario: 3D viewer in SVG builder dialog
- **GIVEN** SVG builder dialog open
- **WHEN** user has completed floor plan design
- **THEN** "3D Preview" tab is available alongside "2D Editor" tab
- **AND** switching tabs maintains current floor plan state
- **AND** 3D preview reflects current 2D design in real-time

---

### Requirement: 3D Viewer Performance Monitoring (Dev Mode)
The system SHALL provide performance metrics for 3D viewer in development mode.

#### Scenario: FPS counter in dev mode
- **GIVEN** 3D viewer open in development environment
- **WHEN** viewing 3D building
- **THEN** FPS counter overlay is shown in top-left corner
- **AND** counter updates every second
- **AND** warning appears if FPS drops below 30

#### Scenario: Geometry count display
- **GIVEN** 3D viewer in dev mode
- **WHEN** viewing building
- **THEN** stats panel shows: mesh count, triangle count, draw calls
- **AND** stats update when floor visibility changes

---

## ADDED Requirements

None. This is an integration enhancement to existing dashboard.

---

## REMOVED Requirements

None. All existing dashboard requirements remain valid.

---

## Integration Points

### With SVG Maps Capability
- Dashboard launches 3D viewer component from building detail page
- Dashboard passes building ID, floor plan SVG, and floor heights to viewer
- Dashboard receives apartment selection events from 3D viewer

### With Apartments Capability
- Dashboard fetches building data including floor heights
- Dashboard displays apartment details when selected in 3D view
