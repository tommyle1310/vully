# Capability: Dashboard

## ADDED Requirements

### Requirement: Dashboard Widgets
The system SHALL provide modular, dynamically-loaded dashboard widgets.

#### Scenario: Widget lazy loading
- **GIVEN** a dashboard page with multiple widgets
- **WHEN** widget enters viewport
- **THEN** widget JavaScript is loaded dynamically
- **AND** skeleton loader is shown during load

#### Scenario: Widget types
- **GIVEN** dashboard configuration
- **WHEN** rendering dashboard
- **THEN** available widgets include: occupancy-chart, revenue-chart, incidents-summary, recent-activity, building-map

---

### Requirement: Occupancy Statistics
The system SHALL display real-time occupancy metrics.

#### Scenario: Occupancy rate calculation
- **GIVEN** a building with 100 apartments
- **WHEN** 85 have active contracts
- **THEN** occupancy rate shows 85%

#### Scenario: Occupancy trend
- **GIVEN** occupancy data over time
- **WHEN** viewing occupancy widget
- **THEN** chart shows trend for last 12 months

---

### Requirement: Revenue Analytics
The system SHALL provide revenue insights for administrators.

#### Scenario: Monthly revenue summary
- **GIVEN** invoices for current month
- **WHEN** viewing revenue widget
- **THEN** shows total billed, collected, outstanding amounts

#### Scenario: Revenue breakdown
- **GIVEN** revenue data
- **WHEN** viewing revenue chart
- **THEN** shows breakdown by category (rent, utilities, fees)

---

### Requirement: Incident Analytics
The system SHALL provide incident metrics.

#### Scenario: Open incidents count
- **GIVEN** incidents in system
- **WHEN** viewing incidents widget
- **THEN** shows count by status (open, in-progress, resolved)

#### Scenario: Response time metrics
- **GIVEN** resolved incidents
- **WHEN** viewing incident analytics
- **THEN** shows average time to resolution by category

---

### Requirement: Dashboard Caching
The system SHALL cache dashboard statistics for performance.

#### Scenario: Cache hit
- **GIVEN** cached statistics in Redis
- **WHEN** dashboard is loaded
- **THEN** data is served from cache
- **AND** response time is <100ms

#### Scenario: Cache invalidation
- **GIVEN** cached statistics with 5-minute TTL
- **WHEN** TTL expires or manual refresh requested
- **THEN** statistics are recalculated
- **AND** cache is updated

---

### Requirement: Performance Targets
The system SHALL meet frontend performance benchmarks.

#### Scenario: Lighthouse score
- **GIVEN** dashboard page
- **WHEN** running Lighthouse audit
- **THEN** Performance score is >90

#### Scenario: No layout shift
- **GIVEN** dashboard loading
- **WHEN** widgets load asynchronously
- **THEN** Cumulative Layout Shift (CLS) equals 0
- **AND** skeleton loaders maintain layout
