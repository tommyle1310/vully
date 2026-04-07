# Payment UI & VietQR — Spec Delta

## MODIFIED Requirements

### Requirement: REQ-UI-001 — RecordPaymentDialog Height Constraint

The `RecordPaymentDialog` MUST not exceed 85dvh height and MUST use overflow scrolling for content.

#### Scenario: Dialog on small viewport
- **Given** a viewport height of 768px
- **When** the RecordPaymentDialog is opened
- **Then** the dialog height does not exceed ~652px (85% of 768)
- **And** the content scrolls if it overflows

---

### Requirement: REQ-UI-002 — RecordPaymentDialog Uses Shadcn DatePicker

The payment date field MUST use the Shadcn/UI `DatePicker` component (calendar popup) instead of native `<input type="date">`.

#### Scenario: Date selection via calendar
- **Given** an open RecordPaymentDialog
- **When** the user clicks the payment date field
- **Then** a Shadcn calendar popup appears for date selection
- **And** the selected date is formatted as `YYYY-MM-DD`

---

### Requirement: REQ-UI-003 — Role-Based Payment Methods

Payment method options MUST differ based on user role:
- **Resident**: Only `bank_transfer` and `cash`
- **Admin/Technician**: All methods (`bank_transfer`, `cash`, `check`, `card`, `other`)

#### Scenario: Resident sees limited payment methods
- **Given** a resident user recording a payment
- **When** the payment method dropdown is opened
- **Then** only "Bank Transfer" and "Cash" options are shown

#### Scenario: Admin sees all payment methods
- **Given** an admin user recording a payment
- **When** the payment method dropdown is opened
- **Then** all 5 payment methods are shown

---

### Requirement: REQ-UI-004 — VietQR Display for Bank Transfer

When a resident selects "Bank Transfer" as payment method, a VietQR QR code image MUST be displayed with the invoice amount and payment reference pre-filled.

#### Scenario: Resident selects bank transfer and sees QR
- **Given** a resident recording a payment of 19,800,000 VND for apartment A101 rent
- **When** "Bank Transfer" is selected as payment method
- **Then** a VietQR QR code image is displayed below the payment method
- **And** the QR encodes the correct bank, amount, and reference code

#### Scenario: Mock QR in development mode
- **Given** environment variable `PAYMENT_GATEWAY=mock`
- **When** QR is requested
- **Then** a placeholder/mock QR image is shown with a "(Mock)" label

---

### Requirement: REQ-UI-005 — Invoice Detail Sheet Shows Full Breakdown

The invoice detail sheet MUST display line items grouped by category with appropriate details per contract type.

#### Scenario: Rent invoice detail shows VAT breakdown
- **Given** a rent invoice with rent line item (base 18M, VAT 1.8M) and electricity line item (973,200 VND)
- **When** the invoice detail sheet is opened
- **Then** line items are grouped: "Rent" section shows base + VAT, "Utilities" section shows meter details and tier breakdown
- **And** totals show subtotal, total VAT, and grand total separately

#### Scenario: Purchase invoice shows milestone details
- **Given** a purchase invoice with a milestone line item
- **When** the invoice detail sheet is opened
- **Then** the "Milestone" section shows milestone name, % of contract, contract value, and amount due

#### Scenario: Lease-to-own invoice shows installment breakdown
- **Given** a lease-to-own invoice with an installment line item
- **When** the invoice detail sheet is opened
- **Then** the "Installment" section shows installment number, principal, interest, remaining principal

---

## ADDED Requirements

### Requirement: REQ-UI-006 — VietQR Backend Endpoint

A new endpoint `GET /invoices/:id/payment-qr` MUST return VietQR data (QR image URL, bank details, amount, reference) for an invoice.

#### Scenario: Generate QR for pending invoice
- **Given** a pending invoice with `total_amount = 19,800,000` for apartment A101
- **When** `GET /invoices/:id/payment-qr` is called
- **Then** the response includes:
  - `qrImageUrl`: VietQR image URL with encoded amount and reference
  - `bankId`, `accountNo`, `accountName`: Bank details
  - `amount`: Invoice total
  - `addInfo`: Payment reference code

#### Scenario: QR not available for paid invoice
- **Given** a paid invoice
- **When** `GET /invoices/:id/payment-qr` is called
- **Then** the response is 400 "Invoice is already paid"

---

### Requirement: REQ-UI-007 — Payment Schedule Table Edit Dialog

An "Edit Schedule Entry" dialog MUST allow admins to modify `periodLabel`, `dueDate`, `expectedAmount`, `status`, and `notes`.

#### Scenario: Admin opens edit dialog from dropdown
- **Given** an admin viewing the payment schedule table
- **When** "Edit Schedule" is clicked in the row dropdown
- **Then** a dialog opens pre-filled with the schedule's current values
- **And** saving updates the schedule via PATCH API

---

### Requirement: REQ-UI-008 — Bulk Generate Supports All Contract Types

The bulk generate dialog's progress display MUST differentiate between rental, purchase, and lease-to-own contracts processed.

#### Scenario: Bulk generation shows invoice counts by type
- **Given** 3 rental, 2 purchase, 1 lease-to-own active contracts
- **When** bulk generation completes
- **Then** the summary shows "Created: 3 rent, 1 purchase milestone, 1 lease-to-own installment, Skipped: 1 (no milestone due)"
