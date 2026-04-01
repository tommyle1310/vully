## ADDED Requirements

### Requirement: General Journal Book (Sổ Nhật ký chung)
The system SHALL provide a General Journal view listing all posted journal entries in chronological order with: entry number, date, description, debit/credit lines with account codes and amounts. Filterable by period, building, and account code. Exportable to PDF/Excel matching Bộ Tài chính templates.

#### Scenario: View general journal for a period
- **WHEN** an Accountant views the General Journal for Q1 2026, Building A
- **THEN** all posted journal entries from Jan–Mar 2026 for Building A are listed chronologically
- **AND** each entry shows its debit/credit line details

#### Scenario: Export general journal to PDF
- **WHEN** an Accountant exports the General Journal for "2026-03"
- **THEN** a PDF is generated following the Vietnamese Bộ Tài chính journal template format

### Requirement: General Ledger Book (Sổ Cái)
The system SHALL provide a General Ledger view per account code showing: opening balance, all journal entry lines affecting the account, running balance, and closing balance. Filterable by period and building.

#### Scenario: View general ledger for TK 111
- **WHEN** an Accountant views the Sổ Cái for account 111 (Cash) in March 2026
- **THEN** the system shows opening balance, all cash transactions, and closing balance
- **AND** each line references the journal entry number and description

### Requirement: Cash Book (Sổ quỹ tiền mặt - TK 111)
The system SHALL provide a Cash Book showing all cash receipts and disbursements with: date, voucher number, description, receipt amount, disbursement amount, running balance.

#### Scenario: View cash book
- **WHEN** an Accountant views the Cash Book for March 2026
- **THEN** all cash vouchers (phiếu thu/chi) are listed with running balance
- **AND** the closing balance matches the General Ledger TK 111 closing balance

### Requirement: Bank Book (Sổ tiền gửi ngân hàng - TK 112)
The system SHALL provide a Bank Book showing all bank deposits and withdrawals with: date, reference, description, deposit amount, withdrawal amount, running balance.

#### Scenario: View bank book
- **WHEN** an Accountant views the Bank Book for March 2026
- **THEN** all bank transactions are listed with running balance
- **AND** the closing balance matches the General Ledger TK 112 closing balance

### Requirement: Receivables Sub-Ledger (Sổ chi tiết phải thu - TK 131)
The system SHALL provide a receivables sub-ledger grouped by apartment/contract showing: invoice number, issue date, amount, payments, outstanding balance per apartment.

#### Scenario: View receivables by apartment
- **WHEN** an Accountant views TK 131 sub-ledger for Building A
- **THEN** each apartment is listed with its total outstanding balance
- **AND** drill-down shows individual invoices and payments

### Requirement: Payables Sub-Ledger (Sổ chi tiết phải trả - TK 331)
The system SHALL provide a payables sub-ledger grouped by contractor/vendor showing: invoice ref, date, amount owed, payments made, outstanding balance.

#### Scenario: View payables by vendor
- **WHEN** an Accountant views TK 331 sub-ledger
- **THEN** each vendor/contractor is listed with outstanding payable balance

### Requirement: Inventory Sub-Ledger (Sổ chi tiết vật tư - TK 152)
The system SHALL provide an inventory sub-ledger showing: item code, name, opening quantity/value, receipts, issues, closing quantity/value for each period.

#### Scenario: View inventory ledger
- **WHEN** an Accountant views TK 152 sub-ledger for March 2026
- **THEN** each inventory item shows opening stock, movements, and closing stock with values

### Requirement: Payroll Ledger (Sổ lương - TK 334)
The system SHALL provide a payroll ledger showing: employee name, gross salary, deductions (BHXH, TNCN), net salary, payment status per period.

#### Scenario: View payroll ledger
- **WHEN** an Accountant views TK 334 sub-ledger for March 2026
- **THEN** each employee's salary breakdown is shown
- **AND** totals match the PayrollRecord for that month

### Requirement: Separate Fund Books (Quỹ vận hành & Quỹ bảo trì)
The system SHALL maintain separate books for the Operating Fund and Maintenance Fund (2% of apartment value per Vietnamese construction law), with independent income/expense tracking.

#### Scenario: View operating fund book
- **WHEN** an Accountant views the Operating Fund for Q1 2026
- **THEN** the system shows all management fee collections and operating expenses
- **AND** the fund balance is calculated

#### Scenario: View maintenance fund book
- **WHEN** an Accountant views the Maintenance Fund
- **THEN** the system shows the 2% contributions collected and maintenance expenditures
- **AND** compliance with Bộ Xây dựng circular is indicated

### Requirement: Book Export to PDF and Excel
The system SHALL export all accounting books to PDF (matching Bộ Tài chính templates) and Excel formats, with filters applied.

#### Scenario: Export receivables sub-ledger to Excel
- **WHEN** an Accountant exports TK 131 sub-ledger for Q1 2026 as Excel
- **THEN** an .xlsx file is generated with columns matching the Vietnamese legal format
- **AND** the file includes building name, period, and generation timestamp in the header
