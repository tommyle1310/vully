## ADDED Requirements

### Requirement: Inline Quick-Action Buttons for Payment Verification
The pending payments table SHALL display inline Confirm (✓) and Reject (✗) icon buttons on each row, enabling admins to process obvious payments without opening the full review dialog.

#### Scenario: Admin confirms payment inline
- **WHEN** an admin clicks the ✓ button on a pending payment row
- **THEN** the system SHALL confirm the payment with the reported amount
- **AND** display an undo toast for 10 seconds allowing the admin to revert
- **AND** refresh the pending payments list

#### Scenario: Admin rejects payment inline
- **WHEN** an admin clicks the ✗ button on a pending payment row
- **THEN** a compact popover SHALL appear with a rejection reason dropdown and optional notes field
- **AND** upon submission the payment SHALL be rejected with the selected reason

#### Scenario: Full review dialog remains accessible
- **WHEN** an admin clicks the "Review" button on a pending payment row
- **THEN** the full VerifyPaymentDialog SHALL open with all details (amount override, notes, receipt view)

### Requirement: Structured Rejection Reasons
The payment rejection flow SHALL require a structured reason from a predefined list, optionally supplemented with free-text notes.

#### Scenario: Admin selects a predefined rejection reason
- **WHEN** an admin rejects a payment (inline or via dialog)
- **THEN** the system SHALL present a dropdown with reasons: `insufficient_amount`, `wrong_reference`, `blurry_receipt`, `duplicate_payment`, `expired_receipt`, `other`
- **AND** the selected reason SHALL be stored in the payment record

#### Scenario: Reason "other" requires mandatory free-text note
- **WHEN** an admin selects rejection reason `other`
- **THEN** the free-text notes field SHALL become mandatory
- **AND** the admin SHALL NOT be able to submit the rejection without providing a note

#### Scenario: Admin adds free-text note to rejection
- **WHEN** an admin selects a rejection reason and enters additional notes
- **THEN** both the structured reason and free-text notes SHALL be stored

#### Scenario: Resident receives rejection notification
- **WHEN** a payment is rejected
- **THEN** the system SHALL emit a WebSocket event `payment:rejected` to the resident's room
- **AND** the event payload SHALL include the rejection reason and notes

### Requirement: Proof-of-Payment Image in Invoice Verification Dialog
The VerifyInvoicePaymentDialog SHALL display the proof-of-payment image (receipt) when available, matching the existing behavior of the contract payment VerifyPaymentDialog.

#### Scenario: Admin views receipt image during invoice payment review
- **WHEN** an admin opens the VerifyInvoicePaymentDialog for a reported invoice payment
- **AND** the reported payment includes a `receiptUrl`
- **THEN** the dialog SHALL display a clickable link or thumbnail to view the receipt image

#### Scenario: No receipt attached
- **WHEN** the reported invoice payment does not include a `receiptUrl`
- **THEN** the dialog SHALL show "No receipt attached" with a warning indicator

### Requirement: Auto-Matched Reference Badge
The pending payments table SHALL display a green "Auto-matched" badge when a payment's reference number matches the expected VietQR reference pattern for the corresponding contract or invoice.

#### Scenario: Reference matches VietQR pattern
- **WHEN** a pending payment has `referenceNumber` that, after normalizing (stripping prefixes like `p`/`#`, converting separators `-`/`.` to `_`, uppercasing), matches the pattern `{unit}_{type}_{period}` (e.g., `501_RENT_202604`)
- **AND** the unit, type, and period match the associated contract/invoice
- **THEN** a green "Auto-matched" badge SHALL be displayed next to the reference number

#### Scenario: Reference does not match
- **WHEN** a pending payment has a `referenceNumber` that does not match the expected pattern
- **THEN** no auto-match badge SHALL be displayed
- **AND** the reference number SHALL be shown as plain monospace text (current behavior)

### Requirement: Explicit Partial Payment Confirmation Flow
The payment verification flow SHALL explicitly handle partial payments by showing the remaining balance and confirming the schedule stays in `partially_paid` status.

#### Scenario: Admin confirms a partial payment
- **WHEN** an admin confirms a payment where `actualAmount` is less than `schedule.expectedAmount`
- **THEN** the system SHALL display a confirmation step: "This is a partial payment (₫X of ₫Y). The remaining ₫Z will stay outstanding."
- **AND** upon confirmation, the schedule status SHALL be set to `partially_paid`

#### Scenario: Admin confirms full payment
- **WHEN** an admin confirms a payment where `actualAmount` equals or exceeds `schedule.expectedAmount`
- **THEN** the schedule status SHALL be set to `paid`
- **AND** no partial payment warning SHALL be shown
