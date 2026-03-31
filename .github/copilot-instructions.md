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
- Use **Logging Interceptor** for performance metrics and audit trails
- Background jobs MUST use BullMQ queues (never block main thread)
- Database operations MUST use Prisma transactions where appropriate

### Frontend (Next.js)
- Use **App Router** with Server Components by default
- Client Components only when needed (interactivity, hooks)
- **Always prefer Shadcn/UI components over native HTML** (buttons, inputs, selects, modals, etc.)
- **Use Framer Motion** for any element entering or leaving the DOM
- Use Framer Motion `LayoutGroup` for smooth list add/remove transitions
- **Skeleton Loaders** required for all async data (CLS = 0)
- Use `dynamic()` import for heavy widgets (charts, maps)
- **TanStack Table** with windowing/virtualization for lists > 100 items
- **TanStack Query** over useState/useEffect for all API calls
- **Nuqs** for URL state management (filters, pagination, tabs)

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
- DTOs MUST use `class-validator` decorators
- All Controllers MUST have `@nestjs/swagger` decorators
- Services should be stateless and injectable
- Use custom decorators for common patterns (`@CurrentUser`, `@Roles`)
- **Use Pino logger** for structured logging (JSON format, correlation IDs)
- **File uploads** MUST validate MIME type and size before processing
- **Health endpoints** required: `/health` (liveness), `/health/ready` (readiness)

### Frontend Specifics
- Components: PascalCase (`InvoiceCard.tsx`)
- Hooks: camelCase with `use` prefix (`useInvoices.ts`)
- Zustand stores: camelCase with `Store` suffix (`mapStore.ts`)
- API calls only through TanStack Query hooks (never raw fetch/useEffect)
- Forms: Always use React-Hook-Form with Zod schema from `@vully/shared-types`
- Tour guides: Use `useTourGuide` hook with `hasSeenTour` flag check (stored in user profile)

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
│       ├── modules/        # Feature modules
│       ├── common/         # Shared utilities
│       ├── providers/      # External services
│       ├── database/       # Prisma schema & migrations
│       └── config/         # Environment configs
└── web/                    # Next.js Frontend
    └── src/
        ├── app/            # App Router pages
        ├── components/     # UI components
        ├── hooks/          # Custom hooks
        ├── stores/         # Zustand stores
        └── lib/            # Utilities

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
  .to(`apartment:${apartmentId}`)
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

## RBAC Reference

| Role       | Apartments | Invoices | Incidents | Users |
|------------|------------|----------|-----------|-------|
| Admin      | CRUD       | CRUD     | CRUD      | CRUD  |
| Technician | Read       | Read     | Update*   | -     |
| Resident   | Read*      | Read*    | Create*   | -     |

*Scoped to own resources only
## Specialized Agents

Use these agents for domain-specific tasks (located in `agents/`):

| Agent | Use For |
|-------|----------|
| `backend-architect` | API design, service boundaries, database schema, scalability planning |
| `database-architect` | Data modeling, ERD design, indexing strategy, migration planning |
| `frontend-developer` | React/Next.js components, state management, UI implementation |
| `code-reviewer` | PR reviews, security checks, performance analysis, best practices |

### Invoking Agents
```
@workspace @agents/backend-architect Design the billing module API with BullMQ integration
@workspace @agents/database-architect Create ERD for the incidents system
```