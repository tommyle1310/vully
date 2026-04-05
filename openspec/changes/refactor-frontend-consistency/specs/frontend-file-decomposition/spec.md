## ADDED Requirements

### Requirement: File Size Limit
The system SHALL keep all frontend source files (`.ts`, `.tsx`) under approximately 300 lines. Files exceeding this limit MUST be decomposed into smaller, focused modules.

#### Scenario: Large form dialog decomposition
- **WHEN** a form dialog component exceeds 300 lines
- **THEN** it MUST be split by extracting: Zod schema and constants to `[name]-schema.ts`, helper functions to `[name]-helpers.ts`, and distinct form sections (e.g., tabs, fieldsets) to separate sub-component files
- **AND** the main dialog file MUST import and compose these extracted modules
- **AND** the main file MUST remain under ~300 lines

#### Scenario: Large detail sheet decomposition
- **WHEN** a detail sheet component exceeds 300 lines
- **THEN** it MUST be split by extracting: helper functions and type parsers to `[name]-helpers.ts`, and distinct display sections to separate sub-component files
- **AND** the main sheet file MUST import and compose these extracted modules

#### Scenario: Large list page decomposition
- **WHEN** a list page exceeds 300 lines
- **THEN** column definitions MUST be extracted to `[resource]-columns.tsx`, the `TableSkeleton` component to `[resource]-table-skeleton.tsx`, and complex filter UI to `[resource]-filters.tsx` (if applicable)
- **AND** the main page file MUST import these extracted modules

#### Scenario: Large hook file decomposition
- **WHEN** a hook file exceeds 300 lines
- **THEN** it MUST be split by extracting: type definitions to `[resource].types.ts`, query hooks to `use-[resource]-queries.ts`, and mutation hooks to `use-[resource]-mutations.ts`
- **AND** the original file MUST re-export all extracted symbols as a barrel export to preserve existing import paths

#### Scenario: Large tab component decomposition
- **WHEN** a tab component (e.g., building-parking-tab, building-policies-tab) exceeds 300 lines
- **THEN** it MUST be split by extracting: constants to a constants file, CRUD logic to a custom hook, and distinct UI sections to sub-component files

### Requirement: Barrel Re-export for Decomposed Files
The system SHALL use barrel re-exports when decomposing files to preserve existing import paths and avoid breaking changes.

#### Scenario: Hook barrel re-export
- **WHEN** a hook file is split into multiple files
- **THEN** the original file path MUST continue to export all public symbols via `export * from './[sub-file]'` statements
- **AND** no existing import statement in the codebase SHALL need to change

#### Scenario: Component barrel re-export
- **WHEN** a component is decomposed and consumers import it by name
- **THEN** a barrel `index.ts` or the original filename MUST re-export the main component
- **AND** no existing import statement in the codebase SHALL need to change
