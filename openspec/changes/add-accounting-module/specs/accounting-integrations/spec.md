## ADDED Requirements

### Requirement: E-Invoice Integration
The system SHALL integrate with at least one Vietnamese e-invoice provider (VNPT / BKAV / Misa / Fast) to automatically create and send electronic invoices (hóa đơn điện tử) when bills are posted.

#### Scenario: Send e-invoice on bill posting
- **WHEN** a monthly bill is posted and confirmed
- **THEN** the system calls the e-invoice provider API to create an electronic invoice
- **AND** the invoice number and lookup URL are stored on the Invoice record
- **AND** the resident receives the e-invoice via email

#### Scenario: E-invoice API failure retry
- **WHEN** the e-invoice provider API returns an error
- **THEN** the request is retried via BullMQ with exponential backoff (3 attempts)
- **AND** failures are logged and queued in a dead-letter queue for manual review

### Requirement: CSV/Excel Import for Utility Readings
The system SHALL provide an API endpoint and UI for importing electricity/water meter readings from CSV or Excel files (e.g., EVN/Sapaco export format), mapped to MeterReading records.

#### Scenario: Import electricity readings CSV
- **WHEN** an Accountant uploads a CSV with columns [apartment_code, reading_date, current_value]
- **THEN** the system validates each row against existing apartments
- **AND** MeterReading records are created/updated for the billing period
- **AND** a summary is returned: total imported, skipped (invalid apartment codes), errors

#### Scenario: Download import template
- **WHEN** a user requests the CSV import template
- **THEN** the system returns a CSV/Excel template with required columns and sample data

#### Scenario: Reject malformed file
- **WHEN** an uploaded file has missing required columns or invalid data types
- **THEN** the system returns a validation error with row-level details

### Requirement: Bill Notification via BullMQ
The system SHALL queue bill notification jobs via BullMQ when monthly bills are posted, supporting Email, SMS, and Zalo OA channels based on resident preferences.

#### Scenario: Notify resident of new bill
- **WHEN** a monthly bill is posted for an apartment
- **THEN** a notification job is queued for the apartment's resident(s)
- **AND** the notification includes: bill amount, due date, and payment link/QR code

#### Scenario: Overdue reminder notification
- **WHEN** a bill is overdue by a configurable number of days
- **THEN** a reminder notification is queued with: overdue amount, days overdue, and payment link

### Requirement: Payment QR Code API
The system SHALL expose a REST API endpoint `GET /api/accounting/invoices/{id}/payment-qr` returning a VietQR-compatible payment QR code image for the invoice amount.

#### Scenario: Generate payment QR
- **WHEN** a resident or Accountant requests a payment QR for invoice INV-2026-04-001
- **THEN** the API returns a QR code image (PNG) encoding the virtual bank account and invoice amount
- **AND** the QR follows VietQR standard format

### Requirement: Payment Receipt API
The system SHALL expose a REST API endpoint `GET /api/accounting/invoices/{id}/receipt` returning a PDF receipt for paid invoices.

#### Scenario: Download receipt for paid invoice
- **WHEN** a resident requests a receipt for a paid invoice
- **THEN** the API returns a PDF receipt with: invoice number, payment date, amount, payer info, building info

#### Scenario: Reject receipt for unpaid invoice
- **WHEN** a receipt is requested for an invoice with status != "paid"
- **THEN** the system returns 400 Bad Request with "Invoice not yet paid"

### Requirement: Excel/CSV Export Templates
The system SHALL provide downloadable Excel/CSV template files for all import-capable forms (utility readings, inventory movements, payroll data).

#### Scenario: Download utility reading template
- **WHEN** an Accountant requests the meter reading import template for Building A
- **THEN** the template includes apartment codes pre-filled and columns for reading values
