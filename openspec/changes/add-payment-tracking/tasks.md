# Payment Tracking System - Implementation Tasks

## Overview
This document tracks implementation progress for the payment tracking system proposal.

---

## Backend Tasks

### Phase 1: Schema & Types
- [x] Create Prisma migration for new tables (`contract_payment_schedules`, `contract_payments`)
- [x] Add new enums to schema (`PaymentType`, `PaymentStatus`, `PaymentMethod`, `ContractType`)
- [x] Add new columns to `contracts` table (contract_type, purchase_price, etc.)
- [x] Create Zod schemas in `@vully/shared-types` for payment entities
- [x] Export new enums from `@vully/shared-types`

### Phase 2: Services & API
- [x] Create `PaymentScheduleService` with CRUD operations
- [x] Create `PaymentService` for recording payments (integrated into PaymentScheduleService)
- [x] Add auto-generation logic for rent schedules (12 months)
- [ ] Add purchase milestone schedule generation
- [x] Implement contract financial summary calculation
- [x] Add payment endpoints to `ContractsModule`
  - [x] `GET /contracts/:id/payment-schedules`
  - [x] `POST /contracts/:id/payment-schedules`
  - [x] `PATCH /payment-schedules/:id`
  - [x] `DELETE /payment-schedules/:id`
  - [x] `POST /payment-schedules/:id/payments`
  - [x] `GET /contracts/:id/payments`
  - [x] `POST /contracts/:id/generate-rent-schedule`

### Phase 3: Data Migration
- [ ] Create migration script to parse existing `terms_notes` to new fields
- [ ] Auto-generate payment schedules for active rental contracts

---

## Frontend Tasks

### Components
- [x] Create `PaymentScheduleTable` component (`apps/web/src/components/payments/PaymentScheduleTable.tsx`)
- [x] Create `RecordPaymentDialog` component (`apps/web/src/components/payments/RecordPaymentDialog.tsx`)
- [x] Create `ContractFinancialSummary` component (`apps/web/src/components/payments/ContractFinancialSummary.tsx`)
- [x] Create `Progress` UI component (`apps/web/src/components/ui/progress.tsx`)

### Hooks & API
- [x] Create `usePaymentSchedules` TanStack Query hook
- [x] Create `useRecordPayment` mutation hook
- [x] Create `useContractFinancialSummary` hook
- [x] Create `useGenerateRentSchedule` mutation hook
- [x] All hooks in `apps/web/src/hooks/use-payments.ts`

### Pages
- [x] Update contract detail sheet with payment summary section
- [x] Create contract detail page with full payment schedule (`/contracts/[id]`)
- [ ] Add payment reports page (optional, phase 2)

---

## Testing Tasks

- [ ] Unit tests for payment calculations (status, summary)
- [ ] Unit tests for schedule auto-generation
- [ ] Integration tests for payment recording flow

---

## Acceptance Criteria

1. Admin can view payment schedule for any contract
2. Admin can record payments against scheduled entries
3. System shows payment progress (paid %, outstanding, remaining)
4. Rental contracts auto-generate 12-month rent schedules
5. Payment history is auditable (who recorded, when)
6. Status auto-updates based on payments and due dates

---

## Notes

### Prisma Client Regeneration Required
After pulling this change, run `npx prisma generate` in the `apps/api` directory to update the Prisma client with the new models.

### Database Migration
Run `npx prisma db push` or `npx prisma migrate dev` to apply the schema changes.

### Files Changed

**Backend:**
- `apps/api/prisma/schema.prisma` - Added new models and enums
- `packages/shared-types/src/enums/index.ts` - Added payment tracking enums
- `packages/shared-types/src/entities/index.ts` - Added payment schemas
- `apps/api/src/modules/apartments/payment-schedule.service.ts` - New service
- `apps/api/src/modules/apartments/payment-schedule.controller.ts` - New controller
- `apps/api/src/modules/apartments/dto/payment.dto.ts` - New DTOs
- `apps/api/src/modules/apartments/dto/contract.dto.ts` - Updated with payment fields
- `apps/api/src/modules/apartments/contracts.service.ts` - Updated for new fields
- `apps/api/src/modules/apartments/apartments.module.ts` - Registered new service/controller

**Frontend:**
- `apps/web/src/hooks/use-payments.ts` - TanStack Query hooks for payments API
- `apps/web/src/components/payments/index.ts` - Component exports
- `apps/web/src/components/payments/PaymentScheduleTable.tsx` - TanStack Table for schedules
- `apps/web/src/components/payments/RecordPaymentDialog.tsx` - Dialog to record payments
- `apps/web/src/components/payments/ContractFinancialSummary.tsx` - Summary card
- `apps/web/src/components/ui/progress.tsx` - Progress bar component
- `apps/web/src/app/(dashboard)/contracts/contract-detail-sheet.tsx` - Added payment summary
- `apps/web/src/app/(dashboard)/contracts/[id]/page.tsx` - New contract detail page

---

*Last Updated: April 3, 2026*
