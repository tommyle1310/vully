## ADDED Requirements

### Requirement: Monthly Bill Generation
The system SHALL auto-generate monthly bills per apartment aggregating: management fees (pricePerSqm × netArea from ManagementFeeConfig), utility charges (from MeterReading + UtilityTier), parking fees, and miscellaneous charges. Bills are created as Invoices with line items via a BullMQ background job.

#### Scenario: Generate monthly bill
- **WHEN** the billing job runs for period "2026-04"
- **THEN** for each active Contract, an Invoice is created with line items for:
  - Management fee (calculated from ManagementFeeConfig × apartment netArea)
  - Electricity (from MeterReading × UtilityTier rates)
  - Water (from MeterReading × UtilityTier rates)
  - Parking (car slot + moto slot fees)
- **AND** a corresponding JournalEntry is drafted (debit TK 131, credit TK 511)

#### Scenario: Skip apartment without meter reading
- **WHEN** an apartment has no meter reading for the billing period
- **THEN** the utility line item is omitted from the bill
- **AND** a warning is logged for the billing job

#### Scenario: Apply VAT rate
- **WHEN** an apartment has a non-null vatRate
- **THEN** VAT is calculated on applicable line items
- **AND** the invoice taxAmount reflects the total VAT

### Requirement: Bill Preview Before Posting
The system SHALL allow Accountants to preview generated bills before posting them, enabling corrections to meter readings or fee overrides.

#### Scenario: Preview monthly bills
- **WHEN** an Accountant triggers bill preview for "2026-04"
- **THEN** the system returns draft invoices with calculated amounts without persisting
- **AND** the Accountant can adjust meter readings before confirming

#### Scenario: Confirm and post bills
- **WHEN** an Accountant confirms the previewed bills
- **THEN** invoices are persisted with status "pending"
- **AND** journal entries are auto-posted
- **AND** notifications are queued for residents

### Requirement: Receivables Tracking Per Apartment (TK 131)
The system SHALL track outstanding receivables per apartment/contract, showing total owed, payments received, and aging (current, 30-day, 60-day, 90-day+).

#### Scenario: View apartment receivables
- **WHEN** an Accountant views receivables for apartment A-1201
- **THEN** the system shows all unpaid invoices, amounts, due dates, and days overdue
- **AND** the total outstanding matches TK 131 sub-ledger for that apartment

### Requirement: Late Fee Calculation
The system SHALL calculate late fees for overdue invoices unless the apartment has `lateFeeWaived = true`.

#### Scenario: Apply late fee
- **WHEN** an invoice is overdue by 30 days and the apartment does not waive late fees
- **THEN** a late fee line item is added to the next billing cycle
- **AND** a journal entry records the late fee (debit TK 131, credit TK 511)

#### Scenario: Waive late fee
- **WHEN** an invoice is overdue but the apartment has `lateFeeWaived = true`
- **THEN** no late fee is applied
