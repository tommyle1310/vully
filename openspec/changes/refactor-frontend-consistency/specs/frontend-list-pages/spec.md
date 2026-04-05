## ADDED Requirements

### Requirement: List Page Structure Convention
The system SHALL enforce a canonical structure for all dashboard list pages consisting of: module-level constants and column definitions, a dedicated `TableSkeleton` component, and a default-exported page component that uses nuqs for URL filter state, TanStack Table for data display, and Framer Motion for page transitions.

#### Scenario: New list page follows canonical structure
- **WHEN** a developer creates a new dashboard list page
- **THEN** the page MUST follow the import ordering: React → Framer Motion → TanStack → Lucide → UI → Hooks → Components → Lib
- **AND** column definitions MUST be declared at module-level using `createColumnHelper`
- **AND** status variants and label constants MUST be declared at module-level outside the component
- **AND** the page MUST wrap its return in `<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">`
- **AND** the page header MUST use the pattern: flex container with `h1` title + `p` description + conditional admin action button

#### Scenario: List page loading state
- **WHEN** data is loading
- **THEN** the page MUST render a dedicated `TableSkeleton` component that mirrors the table structure to prevent Cumulative Layout Shift (CLS)

#### Scenario: List page error state
- **WHEN** the data fetch fails
- **THEN** the page MUST render a centered error block with an icon, title, description, and retry button

### Requirement: URL Filter State with Nuqs
The system SHALL use nuqs (`useQueryStates`) for all filter and pagination state on list pages so that filter selections persist across page refreshes and are shareable via URL.

#### Scenario: Filters persist on refresh
- **WHEN** a user applies filters on a list page and refreshes the browser
- **THEN** all filter values (search, status, category, page, limit) MUST be restored from URL query parameters

#### Scenario: Default filter values
- **WHEN** no query parameters are present in the URL
- **THEN** filter inputs MUST use sensible defaults (page=1, limit=20, no status filter)

### Requirement: Framer Motion Page Transitions
The system SHALL apply consistent Framer Motion page transitions on all dashboard list pages using `initial={{ opacity: 0 }}` and `animate={{ opacity: 1 }}`.

#### Scenario: Page renders with fade-in
- **WHEN** a user navigates to any dashboard list page
- **THEN** the page content MUST fade in with an opacity transition from 0 to 1
