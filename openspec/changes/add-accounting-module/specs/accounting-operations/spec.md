## ADDED Requirements

### Requirement: Inventory Item Management
The system SHALL provide CRUD for inventory items (maintenance materials, spare parts) with fields: code, name, unit, category, currentQuantity, averageCost, buildingId, managementBoardId.

#### Scenario: Create inventory item
- **WHEN** a MaintenanceStaff or Accountant creates an inventory item
- **THEN** the item is persisted with initial quantity 0
- **AND** the item is scoped to the specified building and board

#### Scenario: List inventory with stock levels
- **WHEN** a user queries inventory for a building
- **THEN** the system returns items with current quantity, average cost, and total value

### Requirement: Inventory Movement (In/Out)
The system SHALL record inventory movements (receipt, issue, adjustment) with: inventoryItemId, movementType, quantity, unitCost, totalCost, referenceNumber, date, notes. Each movement auto-updates the item's currentQuantity and averageCost.

#### Scenario: Receive materials
- **WHEN** 50 units of item "Water Filter Cartridge" are received at 100,000 VND each
- **THEN** an InventoryMovement (type: in) is created
- **AND** currentQuantity increases by 50
- **AND** a draft JournalEntry is created: debit TK 152, credit TK 111/112/331

#### Scenario: Issue materials for maintenance
- **WHEN** 5 units of "Water Filter Cartridge" are issued for work order WO-001
- **THEN** an InventoryMovement (type: out) is created
- **AND** currentQuantity decreases by 5
- **AND** a draft JournalEntry is created: debit TK 627, credit TK 152

#### Scenario: Reject issue exceeding stock
- **WHEN** an issue of 100 units is attempted but only 50 are in stock
- **THEN** the system rejects the movement with "Insufficient stock" error

### Requirement: Payroll Record Management
The system SHALL provide monthly payroll generation with: base salary, allowances, BHXH employee/employer contributions (calculated per Vietnamese law), TNCN personal income tax, and net salary per employee.

#### Scenario: Generate monthly payroll
- **WHEN** an Accountant generates payroll for March 2026
- **THEN** a PayrollRecord is created with status "draft"
- **AND** SalarySlips are generated for each employee with calculated deductions:
  - BHXH employee: 10.5% of base salary
  - BHXH employer: 21.5% of base salary
  - TNCN: progressive tax per Vietnamese tax brackets
- **AND** totalGross, totalDeductions, totalNet are computed

#### Scenario: Post payroll
- **WHEN** an Accountant posts a draft PayrollRecord
- **THEN** status changes to "posted"
- **AND** a JournalEntry is auto-generated:
  - Debit TK 642 (Admin Expenses) for gross salary
  - Credit TK 334 (Payroll Payable) for net salary
  - Credit TK 338 (Social Insurance Payable) for BHXH/TNCN

### Requirement: Maintenance Work Order
The system SHALL provide CRUD for maintenance work orders with: title, description, contractorName, buildingId, managementBoardId, status (draft/approved/in_progress/completed/cancelled), scheduledDate, completedDate, estimatedCost, actualCost.

#### Scenario: Create work order
- **WHEN** a user creates a work order for "Elevator annual maintenance"
- **THEN** the work order is persisted in draft status with estimated cost

#### Scenario: Complete work order
- **WHEN** a work order is marked as completed
- **THEN** completedDate is set
- **AND** the user is prompted to record actual costs

### Requirement: Maintenance Cost Recording
The system SHALL allow recording costs against a work order with: description, amount, category (labor/materials/contractor/other), invoiceRef. Each cost auto-generates a journal entry.

#### Scenario: Record contractor invoice
- **WHEN** a contractor invoice of 15,000,000 VND is recorded against work order WO-001
- **THEN** a MaintenanceCost (category: contractor) is created
- **AND** a draft JournalEntry is auto-generated: debit TK 627, credit TK 331

#### Scenario: View work order total cost
- **WHEN** a user views work order WO-001 details
- **THEN** the system shows all associated MaintenanceCost items and the sum as actualCost
