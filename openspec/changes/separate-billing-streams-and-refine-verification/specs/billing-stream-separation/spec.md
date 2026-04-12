## ADDED Requirements

### Requirement: Invoice Stream Classification
The system SHALL classify every invoice into exactly one stream: `operational` (recurring service fees) or `property` (large contract-related payments such as milestones and installments).

#### Scenario: New invoice defaults to operational stream
- **WHEN** the billing processor creates a new invoice via bulk generation
- **THEN** the invoice `invoice_stream` field SHALL be set to `operational`

#### Scenario: Invoice with milestone line items is tagged as property
- **WHEN** an invoice contains line items with category `milestone` or `installment`
- **THEN** the invoice `invoice_stream` field SHALL be set to `property`

#### Scenario: Historical invoices are backfilled
- **WHEN** a data migration runs against existing invoices
- **THEN** any invoice containing at least one `milestone` or `installment` line item SHALL be updated to `invoice_stream = 'property'`
- **AND** all other invoices SHALL be updated to `invoice_stream = 'operational'`

### Requirement: Bulk Generate Excludes Property Payments
The bulk invoice generation pipeline SHALL only produce operational invoices. It SHALL NOT generate line items for categories `milestone` or `installment`.

#### Scenario: Bulk generate skips milestone categories
- **WHEN** an admin triggers bulk invoice generation for billing period 2026-05
- **AND** a purchase contract has a milestone due in 2026-05
- **THEN** the bulk generator SHALL NOT create a milestone line item on the invoice
- **AND** the milestone remains tracked exclusively in `contract_payment_schedules`

#### Scenario: Bulk generate dialog does not show property categories
- **WHEN** an admin opens the Bulk Generate Invoices dialog
- **THEN** the category checkboxes SHALL NOT include `milestone` or `installment`
- **AND** the available categories SHALL be limited to: rent, management_fee, parking, trash, and active utility types

### Requirement: Invoice List Stream Filter
The invoice list API and UI SHALL support filtering by `invoice_stream`.

#### Scenario: Admin filters invoices by operational stream
- **WHEN** an admin selects "Operational" filter on the Invoices page
- **THEN** only invoices with `invoice_stream = 'operational'` SHALL be displayed

#### Scenario: API accepts stream query parameter
- **WHEN** a GET request is made to `/invoices?stream=operational`
- **THEN** the response SHALL contain only invoices where `invoice_stream = 'operational'`

### Requirement: Invoice Category Filter Chips
The Invoices list page SHALL display filter chips for line-item categories so admins can quickly narrow by charge type.

#### Scenario: Admin filters by utility category
- **WHEN** an admin clicks the "Utilities" filter chip
- **THEN** only invoices containing at least one utility line item (electric, water, gas) SHALL be displayed

#### Scenario: Multiple category filters combine with OR logic
- **WHEN** an admin selects both "Management Fee" and "Parking" filter chips
- **THEN** invoices containing management_fee OR parking line items SHALL be displayed
