## ADDED Requirements

### Requirement: Strict Prisma Payload Typing
All backend service methods SHALL use Prisma-generated payload types (`Prisma.apartmentsGetPayload<>`, `Prisma.$apartmentsPayload`, etc.) for entity parameters and return values. Explicit `any` casts and `Record<string, unknown>` for Prisma entities are FORBIDDEN.

#### Scenario: Service uses typed Prisma payloads
- **WHEN** a service method receives or returns a Prisma entity
- **THEN** the parameter/return type MUST be a Prisma payload type alias or a DTO, never `any`

#### Scenario: Response DTO mapper receives typed input
- **WHEN** a `toResponseDto()` method is called
- **THEN** its parameter MUST be typed with the corresponding Prisma payload type including the correct `include` clause

### Requirement: Shared Interface Definitions
Cross-cutting interfaces (`AuthUser`, `DashboardStats`, `AdminStats`, `ChatResponse`, `InvoiceCalculation`) SHALL be defined in a central location (`common/interfaces/` or `common/types/`) and imported by all consumers. Inline interface definitions within service files are FORBIDDEN for types used by more than one file.

#### Scenario: AuthUser interface is centralized
- **WHEN** any controller or service references the `AuthUser` type
- **THEN** it MUST import from `common/interfaces/auth-user.interface.ts`

#### Scenario: No duplicate interface definitions
- **WHEN** a developer searches for `interface AuthUser` or `interface DashboardStats`
- **THEN** exactly one definition MUST exist in the codebase

### Requirement: Typed Prisma Delegates in PaymentScheduleService
The `PaymentScheduleService` SHALL access `payment_schedules` and `payments` Prisma delegates through properly typed getters, not `any`-typed accessors.

#### Scenario: Typed delegate access
- **WHEN** `PaymentScheduleService` calls `this.schedules` or `this.payments`
- **THEN** the return type MUST be the corresponding Prisma delegate type, not `any`
