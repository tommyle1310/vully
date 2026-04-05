## ADDED Requirements

### Requirement: Detail Sheet Props Convention
The system SHALL enforce a standard props interface for all detail sheet components using `{ [resource]: ResourceType | null; open: boolean; onOpenChange: (open: boolean) => void; onEdit?: (resource: ResourceType) => void }`.

#### Scenario: InvoiceDetailSheet uses standard props
- **WHEN** the InvoiceDetailSheet component is rendered
- **THEN** it MUST accept `open` and `onOpenChange` props (not `onClose`)
- **AND** it MUST use `<Sheet open={open} onOpenChange={onOpenChange}>` consistent with all other detail sheets

#### Scenario: All detail sheets include SheetDescription
- **WHEN** any detail sheet is rendered
- **THEN** it MUST include a `<SheetDescription>` element for accessibility compliance

### Requirement: Detail Sheet Helper Placement
The system SHALL declare all helper functions (formatCurrency, formatDate, status configs, label maps) at module-level outside the component function in detail sheet files.

#### Scenario: Helper functions at module-level
- **WHEN** a detail sheet file defines helper functions or constant maps
- **THEN** they MUST be declared outside the component function at module scope
- **AND** shared helpers (formatCurrency, formatDate) MUST be imported from `@/lib/format`
