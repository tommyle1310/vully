# Project Context: Vully - Apartment Management Platform

Role: Senior Fullstack Engineer (NestJS & Next.js expert)

## Tech Stack

### Backend
- **Framework**: NestJS (Modular Architecture)
- **Database**: PostgreSQL 15+ with Prisma ORM
- **Cache/Queue**: Redis 7+ with BullMQ
- **Real-time**: Socket.IO WebSocket Gateway
- **AI**: LangChain.js with pgvector for RAG
- **Logging**: Pino (structured JSON logging)
- **File Validation**: ClamAV integration + MIME type checking
- **Health Checks**: @nestjs/terminus (DB, Redis, Queue health)
- **Validation**: Zod (shared schemas via packages/shared-types)
- **Docs**: Swagger/OpenAPI auto-generated

### Frontend
- **Framework**: Next.js 15 (App Router)
- **UI Components**: Shadcn/UI (strictly no native HTML for buttons/inputs/modals)
- **State**: TanStack Query (server state) + Zustand (global state) + Nuqs (URL state)
- **Forms**: React-Hook-Form + Zod
- **Tables**: TanStack Table (with virtualization for >100 rows)
- **Styling**: Tailwind CSS
- **Animations**: Framer Motion (page transitions, layout animations)
- **Onboarding**: Shepherd.js (interactive walkthroughs)
- **Charts**: Recharts
- **Maps**: Custom SVG with D3.js (optional)

## Architecture Guidelines

### Backend (NestJS)
- Always use **Modular Architecture** - each feature is a self-contained module
- Every module MUST have: `*.module.ts`, `*.controller.ts`, `*.service.ts`, `*.dto.ts`
- Use **Global Exception Filter** (`HttpExceptionFilter`) for standardized error responses
- Use **Logging Interceptor** for performance metrics and audit trails with correlation IDs
- Background jobs MUST use BullMQ queues (never block main thread, retry 3 times with exponential backoff)
- Database operations MUST use Prisma transactions where appropriate
- WebSocket events MUST use Socket.IO gateway with room-based broadcasting (building, apartment, user scopes)

**Implemented Modules (✅)**:
- Identity: Auth (JWT access+refresh, password reset), Users, Multi-role RBAC (UserRoleAssignment + Permissions + RolePermission)
- Apartments: 
  - Buildings (CRUD with SVG maps, floor heights, amenities)
  - Apartments (50+ fields: spatial, ownership, occupancy, utilities, policy overrides)
  - Contracts (CRUD + terminate, multi-type support: rental/purchase/lease-to-own)
  - Building Policies (versioned policies: occupancy rules, billing config, trash collection)
  - Parking Management (zones + slots with assignment + status tracking)
  - Access Cards (CRUD + lifecycle: issue/edit/deactivate/reactivate with facility access)
  - Access Card Requests (request workflow: pending → approved → rejected with admin approval)
  - Bank Accounts (VietQR integration ready: building + owner accounts)
  - Payment Schedules (generate rent/purchase schedules, record payments, financial summaries)
- Billing: Invoices (dual-stream: monthly utilities + management fees), Meter Readings (image proof), Utility Types/Tiers (tiered pricing with effective dates), BullMQ processor, Billing Jobs, Management Fee Configs
- Incidents: CRUD, Comments, WebSocket Gateway (real-time updates)
- Stats: Dashboard analytics (Redis-cached, 5-min TTL)
- AI Assistant: RAG chatbot (Gemini + pgvector + LangChain), Documents, Document Chunks

**Skeleton Modules (🚧)**: Management Board (empty controllers, need implementation)

**Planned Modules (📋)**:
- Multi-Tenant: Organization, OrganizationMember, PostgreSQL RLS
- Trust Accounting: FinancialAccount, EscrowLedger, EscrowTransaction
- Regional Compliance: ComplianceRule, ComplianceAlert
- Payment Gateway: PaymentIntent, PaymentWebhookLog (Stripe/VNPay/MoMo)
- Communication Hub: NotificationTemplate, NotificationDelivery, UserNotificationPreference

### Frontend (Next.js)
- Use **App Router** with Server Components by default
- Client Components only when needed (interactivity, hooks, state)
- **Always prefer Shadcn/UI components over native HTML** (buttons, inputs, selects, modals, etc.)
- **Use Framer Motion** for any element entering or leaving the DOM (page transitions, list animations)
- Use Framer Motion `LayoutGroup` for smooth list add/remove transitions with `layout` prop
- **Skeleton Loaders** required for all async data (CLS = 0, no layout shift)
- Use `dynamic()` import for heavy widgets (charts, maps, 3D viewer) with skeleton loading state
- **TanStack Table** with windowing/virtualization for lists > 100 items
- **TanStack Query** over useState/useEffect for ALL API calls (never use raw fetch)
- **Nuqs** for URL state management (filters, pagination, tabs) — keeps URL in sync with UI state
- **Zustand** for global client state (authStore, mapStore)

### API Design
- Follow OpenSpec definitions in `openspec/specs/`
- RESTful endpoints with proper HTTP methods
- Consistent response format: `{ data, meta, errors }`
- Pagination: cursor-based for large datasets

## Coding Standards

### TypeScript
- **Strict Mode** enabled (`strict: true` in tsconfig)
- No `any` type - use `unknown` with type guards
- Prefer `interface` for objects, `type` for unions/primitives
- Use `readonly` for immutable data

### Backend Specifics
- DTOs MUST use `class-validator` decorators (@IsString, @IsEmail, @IsOptional, @IsEnum, etc.)
- All Controllers MUST have `@nestjs/swagger` decorators (@ApiTags, @ApiOperation, @ApiResponse, @ApiBearerAuth)
- Services should be stateless and injectable (use Prisma, Redis, BullMQ via injection)
- Use custom decorators for common patterns (`@CurrentUser`, `@Roles`) — already implemented
- **Use Pino logger** for structured logging (JSON format, correlation IDs via CorrelationIdMiddleware)
- **File uploads** MUST validate MIME type and size before processing (ClamAV integration available)
- **Health endpoints** required: `/health` (liveness), `/health/ready` (readiness — checks DB, Redis, Queue)
- **Multi-role RBAC**: Use `UserRoleAssignment` + `Permission` + `RolePermission` tables, check with `@Roles('admin', 'technician')`
- **Audit logging**: Log sensitive operations (user creation, role changes, invoice payments) to `audit_logs` table with old/new values

### Frontend Specifics
- Components: PascalCase (`InvoiceCard.tsx`)
- Hooks: camelCase with `use` prefix (`useInvoices.ts`)
- Zustand stores: camelCase with `Store` suffix (`mapStore.ts`)
- API calls only through TanStack Query hooks (never raw fetch/useEffect)
- Forms: Always use React-Hook-Form with Zod schema from `@vully/shared-types`
- Tour guides: Use `useTourGuide` hook with `hasSeenTour` flag check (stored in user profile — not implemented yet)
- **SVG Maps**: Use `<FloorPlan />` component for viewing, `<SvgBuilder />` for creating/editing
- **3D Viewer**: Use `<Building3D />` component with `useSvgTo3d` hook for floor extrusion

### Testing
- Unit tests with Jest (coverage > 70% for billing logic)
- E2E tests for critical flows (auth, billing, incidents)
- Use factories for test data (`createMockUser()`)
- Mock external services (Redis, AI) in unit tests

## Definition of Done

### Backend
- [ ] Swagger documentation complete
- [ ] Unit test coverage > 70% for business logic
- [ ] Audit logging for sensitive operations
- [ ] Input validation with DTOs

### Frontend
- [ ] Lighthouse Performance > 90
- [ ] No layout shift (CLS = 0)
- [ ] Responsive: Mobile + Desktop
- [ ] Accessibility: WCAG 2.1 AA

## Project Structure Reference

```
apps/
├── api/                    # NestJS Backend
│   └── src/
│       ├── modules/        # Feature modules (DDD-organized with subdirectories)
        │   ├── identity/       # Auth, Users, RBAC (JWT + multi-role)
        │   │
        │   ├── apartments/     # 🏢 Apartment Management Domain (10 subdirectories)
        │   │   ├── buildings/          # BuildingsController, BuildingsService, BuildingsSvgService
        │   │   ├── apartments-entity/  # ApartmentsController, ApartmentsService, ApartmentsConfigService, mapper
        │   │   ├── contracts/          # ContractsController, ContractsService, ContractsTenantService, mapper
        │   │   ├── building-policies/  # BuildingPoliciesController, BuildingPoliciesService
        │   │   ├── parking/            # ParkingController, ParkingService, ParkingZonesService, mapper
        │   │   ├── access-cards/       # AccessCardsController, AccessCardsService, AccessCardsLifecycleService, AccessCardsHelpersService, mapper
        │   │   ├── access-card-requests/ # AccessCardRequestsController, AccessCardRequestsService
        │   │   ├── bank-accounts/      # BankAccountsController, BankAccountsService
        │   │   ├── payment-schedules/  # PaymentScheduleController, PaymentScheduleService (facade), SchedulesCoreService, PaymentRecordingService, PaymentVerificationService, mapper
        │   │   ├── payment-generator/  # PaymentGeneratorService
        │   │   ├── dto/                # Shared DTOs (apartment.dto, building.dto, contract.dto, parking.dto, payment.dto, access-card.dto)
        │   │   ├── apartments.module.ts
        │   │   └── index.ts            # Barrel exports
        │   │
        │   ├── billing/        # 💰 Billing & Invoicing Domain (5 subdirectories)
        │   │   ├── invoices/           # InvoicesController, InvoicesService (facade), InvoicesCoreService, InvoicesPaymentService, InvoicesScheduleSyncHelper, mapper
        │   │   ├── meter-readings/     # MeterReadingsController, MeterReadingsService, mapper
        │   │   ├── utility-types/      # UtilityTypesController, UtilityTypesService
        │   │   ├── vacant-billing/     # VacantBillingService (auto-bill vacant apartments)
        │   │   ├── vietqr/             # VietQRService (QR code generation)
        │   │   ├── dto/                # Shared DTOs (invoice.dto, meter-reading.dto, utility-type.dto)
        │   │   ├── billing.module.ts
        │   │   ├── billing.processor.ts # BullMQ job processor
        │   │   ├── billing-queue.service.ts
        │   │   ├── billing-jobs.controller.ts
        │   │   ├── invoice-calculator.service.ts # Tiered pricing calculator
        │   │   └── index.ts            # Barrel exports
        │   │
        │   ├── incidents/      # Incidents, Comments, WebSocket Gateway
        │   ├── stats/          # Dashboard analytics (Redis-cached)
        │   ├── management-board/ # 🚧 Vendor, Investor, Board (skeleton controllers only)
        │   └── ai-assistant/   # RAG chatbot (Gemini + pgvector + LangChain)
│       ├── common/         # Shared utilities
│       ├── providers/      # External services
│       ├── database/       # Prisma schema & migrations
│       └── config/         # Environment configs
└── web/                    # Next.js Frontend
    └── src/
        ├── app/            # App Router pages
        │   ├── (auth)/         # Login, Register, Forgot/Reset Password
        │   └── (dashboard)/    # 16 pages: dashboard, apartments, apartments/[id],
        │                       # buildings, buildings/[id], contracts, contracts/[id],
        │                       # incidents, incidents/my-assignments, invoices, 
        │                       # meter-readings, users, utility-types, settings,
        │                       # access-card-requests, payments/pending
        ├── components/
        │   ├── ui/             # Shadcn/UI (33 components: button, dialog, form, table, etc.)
        │   ├── payments/       # PaymentScheduleTable, RecordPaymentDialog, VoidPaymentDialog
        │   ├── access-cards/   # AccessCardsTab, AccessCardFormDialog, IssueAccessCardDialog,
        │   │                   # AccessCardDetailSheet, AccessCardRequestWorkflow
        │   ├── buildings/      # ParkingManagementTab (zones+slots), BuildingPoliciesTab,
        │   │                   # BankAccountManagement, FloorPlanTab, Building3DViewer
        │   ├── apartments/     # InheritedFieldWrapper, ParkingAssignment, ApartmentFormDialog,
        │   │                   # ApartmentDetailSheet, ApartmentFilters
        │   ├── dashboard/      # Charts (occupancy, revenue, incidents), ActivityFeed,
        │   │                   # ResidentDashboard, StatCards
        │   ├── maps/           # SVG floor plan viewer + builder (SvgBuilder, FloorPlan)
        │   ├── 3d/             # Three.js building 3D viewer (Building3D, useSvgTo3d hook)
        │   ├── billing/        # Invoice components, meter reading forms
        │   ├── users/          # User dialogs, role management, UserRoleAssignment
        │   └── date-picker/    # DatePicker, DateRangePicker components
        ├── hooks/          # 30 custom hooks (auth, CRUD, websocket, svg-to-3d,
        │                   # access-cards, bank-accounts, building-policies, parking,
        │                   # payments, pending-payment-count, tour-guide)
        ├── stores/         # Zustand stores (authStore, mapStore)
        └── lib/            # Utilities (api-client, format, performance, web-vitals)

packages/
├── shared-types/           # Shared TypeScript types
└── ui/                     # Shared UI components (optional)
```

## Key Patterns

### BullMQ Job Pattern
```typescript
// Define job in module
@Processor('billing')
export class BillingProcessor {
  @Process('generate-invoice')
  async handleGenerateInvoice(job: Job<GenerateInvoiceDto>) {
    // Process with retries, progress updates
  }
}
```

### WebSocket Event Pattern
```typescript
// Emit after state change
this.socketGateway.server
  .to(`apartments:${apartmentId}`)
  .emit('incident:updated', { incidentId, status });
```

### TanStack Query Pattern
```typescript
// Custom hook encapsulates API + caching
export function useInvoices(filters: InvoiceFilters) {
  return useQuery({
    queryKey: ['invoices', filters],
    queryFn: () => invoiceApi.list(filters),
    staleTime: 5 * 60 * 1000, // 5 min cache
  });
}
```

### Payment Tracking Pattern (NEW)
```typescript
// Payment schedule + recording pattern
export function usePaymentSchedules(contractId: string) {
  return useQuery({
    queryKey: ['contracts', contractId, 'payment-schedules'],
    queryFn: () => contractApi.getPaymentSchedules(contractId),
  });
}

export function useRecordPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: RecordPaymentDto) => contractApi.recordPayment(data),
    onSuccess: (_, variables) => {
      // Invalidate both schedules and financial summary
      queryClient.invalidateQueries({ queryKey: ['contracts', variables.contractId] });
    },
  });
}

export function useContractFinancialSummary(contractId: string) {
  return useQuery({
    queryKey: ['contracts', contractId, 'financial-summary'],
    queryFn: () => contractApi.getFinancialSummary(contractId),
  });
}
```

## RBAC Reference

| Role       | Apartments | Contracts | Payments | Invoices | Incidents | Users | AI Chatbot |
|------------|------------|-----------|----------|----------|-----------|-------|------------|
| Admin      | CRUD       | CRUD      | CRUD     | CRUD     | CRUD      | CRUD  | Unlimited  |
| Technician | Read       | —         | —        | Read     | Update*   | —     | 20/day     |
| Resident   | Read*      | Read*     | Read*    | Read*    | Create*   | —     | 20/day     |

*Scoped to own resources only (tenant's apartment, own incidents, own invoices, own payments)

**Multi-Role Support**: Users can hold multiple roles via `UserRoleAssignment` table (e.g., a user can be both `resident` and `technician`). Permissions are union of all assigned roles.
## Specialized Agents

Use these agents for domain-specific tasks (located in `agents/`):

| Agent | Use For |NestJS module design, BullMQ job patterns, WebSocket event design, API endpoints, database schema evolution, caching strategies |
| `database-architect` | Prisma schema design, migrations, indexing strategy, query optimization, multi-tenant patterns, ERD diagrams |
| `frontend-developer` | Next.js pages/components, Shadcn/UI implementation, TanStack Query/Table patterns, Framer Motion animations, SVG/3D features |
| `code-reviewer` | PR reviews, security audits, performance analysis, NestJS/Next.js best practices enforcement, architecture compliance |
| `reference-3d-dev` | Three.js building 3D viewer reference (SVG to 3D floor extrusion patterns) |

### Invoking Agents
```
@workspace @agents/backend-architect Design the maintenance scheduling module with BullMQ integration
@workspace @agents/database-architect Create ERD and migration for the parking management system
@workspace @agents/frontend-developer Build the tenant profile page with edit form and avatar upload
@workspace @agents/code-reviewer Review this PR for security vulnerabilities and performance issues
@workspace @agents/backend-architect Design the billing module API with BullMQ integration
@workspace @agents/database-architect Create ERD for the incidents system
```