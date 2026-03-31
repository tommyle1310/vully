# Capability: SVG Maps

## ADDED Requirements

### Requirement: Interactive Floor Plan Rendering
The system SHALL render SVG-based floor plans with interactive apartment units.

#### Scenario: Floor plan display
- **GIVEN** a building with uploaded SVG map
- **WHEN** viewing building page
- **THEN** floor plan SVG is rendered
- **AND** each apartment unit is an interactive element

#### Scenario: Apartment identification
- **GIVEN** SVG floor plan
- **WHEN** SVG contains elements with `data-apartment-id` attribute
- **THEN** system binds interactivity to matching apartments

---

### Requirement: Hover Interactions
The system SHALL provide visual feedback on hover.

#### Scenario: Apartment hover
- **GIVEN** floor plan displayed
- **WHEN** user hovers over apartment unit
- **THEN** unit is highlighted
- **AND** tooltip shows apartment number and status

#### Scenario: Hover state management
- **GIVEN** Zustand store for map state
- **WHEN** hover occurs
- **THEN** `hoveredApartment` is updated
- **AND** SVG re-renders with highlight style

---

### Requirement: Selection Interactions
The system SHALL support apartment selection.

#### Scenario: Click to select
- **GIVEN** floor plan displayed
- **WHEN** user clicks apartment unit
- **THEN** unit is selected
- **AND** detail panel slides in with apartment info

#### Scenario: Selection state
- **GIVEN** Zustand store
- **WHEN** apartment is selected
- **THEN** `selectedApartment` is set
- **AND** other apartments dim slightly

---

### Requirement: Status Filtering
The system SHALL filter floor plan display by apartment status.

#### Scenario: Filter by status
- **GIVEN** floor plan with filter controls
- **WHEN** user selects "vacant" filter
- **THEN** only vacant apartments are highlighted
- **AND** other apartments are dimmed or greyed out

#### Scenario: Filter options
- **GIVEN** filter dropdown
- **WHEN** viewing options
- **THEN** choices include: all, occupied, vacant, maintenance

---

### Requirement: Zoom and Pan
The system SHALL support zoom and pan for large floor plans when enabled.

#### Scenario: Zoom in
- **GIVEN** floor plan displayed
- **WHEN** user scrolls or pinches to zoom
- **THEN** floor plan zooms centered on cursor/touch point

#### Scenario: Pan
- **GIVEN** zoomed floor plan
- **WHEN** user drags
- **THEN** floor plan pans in drag direction

---

### Requirement: Mobile Responsiveness
The system SHALL provide touch-friendly interactions on mobile devices.

#### Scenario: Touch interactions
- **GIVEN** floor plan on mobile device
- **WHEN** user taps apartment
- **THEN** apartment is selected
- **AND** detail panel shows as bottom sheet

#### Scenario: Responsive sizing
- **GIVEN** floor plan component
- **WHEN** viewport width changes
- **THEN** SVG scales to fit container
- **AND** maintains aspect ratio
