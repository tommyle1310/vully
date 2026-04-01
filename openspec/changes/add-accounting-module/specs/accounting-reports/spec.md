## ADDED Requirements

### Requirement: Balance Sheet (Bảng cân đối kế toán)
The system SHALL generate a Balance Sheet per VAS format showing: total assets (current + non-current), total liabilities, and equity for a given period and building/board.

#### Scenario: Generate balance sheet
- **WHEN** an Accountant generates the Balance Sheet for March 2026, Building A
- **THEN** the report shows assets (TK 111+112+131+152+...), liabilities (TK 331+334+338+...), and equity
- **AND** total assets = total liabilities + equity

### Requirement: Income Statement (Báo cáo kết quả kinh doanh)
The system SHALL generate an Income Statement per VAS format showing: revenue (TK 511), cost of services (TK 632), admin expenses (TK 642), and net profit/loss for a period.

#### Scenario: Generate income statement
- **WHEN** an Accountant generates the Income Statement for Q1 2026
- **THEN** revenue, expenses, and net income are calculated from posted journal entries
- **AND** the report follows Vietnamese BCTC format

### Requirement: Cash Flow Statement (Báo cáo lưu chuyển tiền tệ)
The system SHALL generate a Cash Flow Statement showing: operating activities, investing activities, and financing activities cash flows for a period.

#### Scenario: Generate cash flow statement
- **WHEN** an Accountant generates the Cash Flow Statement for Q1 2026
- **THEN** the report categorizes cash movements from TK 111/112 journal entries
- **AND** the net cash change matches the change in TK 111+112 balances

### Requirement: Operating Fund Report (Báo cáo thu-chi Quỹ vận hành)
The system SHALL generate a detailed operating fund report showing: management fee collections, operating expenses by category, and fund balance.

#### Scenario: Generate operating fund report
- **WHEN** an Accountant generates the Operating Fund report for March 2026
- **THEN** the report shows itemized income (management fees, parking, other) and expenses (salary, utilities, maintenance, admin)
- **AND** the opening and closing fund balances are shown

### Requirement: Maintenance Fund Report (Báo cáo thu-chi Quỹ bảo trì)
The system SHALL generate a maintenance fund report compliant with Bộ Xây dựng circulars, showing: 2% contributions collected per apartment, expenditures, and fund balance with compliance indicator.

#### Scenario: Generate maintenance fund report
- **WHEN** an Accountant generates the Maintenance Fund report
- **THEN** the report shows per-apartment 2% contributions (based on apartment value)
- **AND** expenditures are itemized by work order
- **AND** the fund balance and compliance status are displayed

### Requirement: Aging Report (Báo cáo công nợ chi tiết)
The system SHALL generate an aging report for receivables grouped by apartment showing: current, 1-30 days, 31-60 days, 61-90 days, and 90+ days outstanding amounts.

#### Scenario: Generate aging report
- **WHEN** an Accountant generates the aging report for Building A
- **THEN** each apartment with outstanding invoices is listed with amounts bucketed by age
- **AND** totals per aging bucket are shown

### Requirement: Monthly Bill Payment Rate Report
The system SHALL generate a report showing bill issuance count, payment count, payment rate percentage, and total amounts per billing period.

#### Scenario: View payment rate by period
- **WHEN** an Accountant views the bill payment rate for Q1 2026
- **THEN** each month shows: bills issued, bills paid, payment rate (%), total billed, total collected

### Requirement: Maintenance Cost Report by Category
The system SHALL generate a report of maintenance costs grouped by category (labor, materials, contractor, other) and by work order for a given period.

#### Scenario: View maintenance costs by category
- **WHEN** an Accountant views maintenance costs for Q1 2026
- **THEN** costs are grouped by category with subtotals
- **AND** each category can be drilled down to individual work orders

### Requirement: Payroll and HR Report
The system SHALL generate a payroll summary report showing: total headcount, gross salary, deductions, net salary, and BHXH/TNCN totals per period.

#### Scenario: View payroll summary
- **WHEN** an Accountant views the payroll report for March 2026
- **THEN** headcount, total gross, total BHXH (employee+employer), total TNCN, and total net are shown

### Requirement: Utility Consumption Report
The system SHALL generate a utility consumption report per building showing: electricity and water usage per apartment, comparison with previous period, and anomaly detection (>30% increase flagged).

#### Scenario: View utility consumption
- **WHEN** an Accountant views the utility report for March 2026
- **THEN** each apartment's electricity/water consumption is shown with month-over-month comparison
- **AND** apartments with >30% increase are flagged

### Requirement: Budget vs. Actual Comparison Report
The system SHALL generate a budget vs. actual report comparing planned budget amounts against actual revenue and expenses by category for a period.

#### Scenario: View budget vs actual
- **WHEN** an Accountant views the budget comparison for Q1 2026
- **THEN** each budget line item shows: budgeted amount, actual amount, variance (amount and %)

### Requirement: Overdue Debt and Reminder Report
The system SHALL generate an overdue debt report listing apartments with overdue invoices, days overdue, amounts, and reminder history.

#### Scenario: View overdue debts
- **WHEN** an Accountant views the overdue debt report
- **THEN** apartments with overdue invoices are listed sorted by days overdue (descending)
- **AND** each entry shows last reminder date and total overdue amount

### Requirement: Report Dashboard
The system SHALL provide an accounting dashboard with summary widgets: total revenue, total expenses, net income, collection rate, overdue amount, and fund balances. Charts powered by Recharts.

#### Scenario: View accounting dashboard
- **WHEN** an Accountant opens the accounting dashboard
- **THEN** KPI cards show current month totals
- **AND** charts show revenue vs. expenses trend (last 12 months) and collection rate trend

### Requirement: Report Performance (<2s)
The system SHALL pre-compute report data via ReportCache (refreshed by BullMQ scheduled job nightly + on-demand after journal posting) to ensure all reports render within 2 seconds.

#### Scenario: Cached report response time
- **WHEN** a report is requested and cache exists
- **THEN** the response is returned within 2 seconds

#### Scenario: Stale cache refresh
- **WHEN** new journal entries are posted
- **THEN** affected report caches are invalidated
- **AND** the next request triggers a fresh computation and cache update

### Requirement: Report Export to PDF and Excel
The system SHALL export all reports to PDF and Excel with Vietnamese legal formatting, building name, period, and generation timestamp.

#### Scenario: Export balance sheet to PDF
- **WHEN** an Accountant exports the Balance Sheet for Q1 2026
- **THEN** a PDF file is generated with Vietnamese Bộ Tài chính Balance Sheet format
