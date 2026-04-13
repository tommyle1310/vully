 # Vully — Apartment Management Platform

> Scalable apartment management with real-time updates, AI assistance, automated billing, and interactive 3D floor plans.

---

## Overview

Vully is a production-ready apartment management platform built for Vietnamese high-rise complexes. It handles building/unit management, tenant contracts, utility billing with tiered pricing, incident tracking, and an AI chatbot powered by Google Gemini with RAG for building regulations.

**Current Status**: ✅ **Fully functional core platform** with 7 implemented modules, 16 dashboard pages, 30+ UI components.

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Backend** | NestJS (modular), PostgreSQL 15+ (Prisma ORM), Redis 7+ (BullMQ), Socket.IO, Pino logging, @nestjs/terminus health checks |
| **Frontend** | Next.js 15 (App Router), Shadcn/UI, TanStack Query + Zustand + Nuqs, React-Hook-Form + Zod, Framer Motion, Recharts, Three.js (3D viewer) |
| **AI** | Google Gemini + LangChain.js + pgvector (RAG) |
| **Monorepo** | pnpm workspaces + Turborepo |
| **Infra** | Docker Compose (PostgreSQL, Redis, ClamAV, MinIO) |

---

## Quick Start

### Prerequisites

- Node.js 20+, pnpm 9+, Docker & Docker Compose

### Setup

```bash
git clone https://github.com/yourusername/vully.git && cd vully
pnpm install
docker-compose up -d                    # PostgreSQL + Redis
cp .env.example .env                    # then fill in secrets
pnpm db:generate && pnpm db:migrate    # setup database
pnpm dev                                # start all apps
```

### URLs

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| API | http://localhost:3000 |
| Swagger Docs | http://localhost:3000/api/docs |
| Prisma Studio | `pnpm db:studio` → http://localhost:5555 |

### Default Login

```
admin@vully.com / Admin@123
```

---

## Project Structure

```
vully/
├── apps/
│   ├── api/                        # NestJS backend (port 3000)
│   │   ├── prisma/
│   │   │   └── schema.prisma      # Database schema + migrations (32 models, 25 enums)
│   │   └── src/
│   │       ├── main.ts
│   │       ├── app.module.ts
│   │       ├── config/             # appConfig, dbConfig, redisConfig, jwtConfig, s3Config
│   │       ├── common/
│   │       │   ├── decorators/     # @CurrentUser, @Roles
│   │       │   ├── filters/        # HttpExceptionFilter (global)
│   │       │   ├── guards/         # JwtAuthGuard, RolesGuard
│   │       │   ├── interceptors/   # LoggingInterceptor
│   │       │   ├── middleware/     # CorrelationIdMiddleware
│   │       │   ├── prisma/         # PrismaService (global)
│   │       │   └── health/         # /health, /health/ready
│   │       └── modules/
│   │           ├── identity/       # Auth (JWT access+refresh), users CRUD, RBAC
│   │           ├── apartments/     # Buildings, apartments, contracts, policies, parking,
│   │           │                   # access cards, bank accounts, payment schedules
│   │           ├── billing/        # Invoices, meter readings, BullMQ processor, tiered pricing
│   │           ├── incidents/      # Incident CRUD, comments, WebSocket gateway
│   │           ├── stats/          # Dashboard analytics (Redis-cached)
│   │           ├── ai-assistant/   # RAG chatbot (Gemini + pgvector + LangChain)
│   │           └── management-board/ # Investors, vendors (skeleton)
│   │
│   └── web/                        # Next.js 15 frontend (port 3000)
│       └── src/
│           ├── app/
│           │   ├── (auth)/         # /login, /register, /forgot-password, /reset-password
│           │   └── (dashboard)/    # 16 protected pages: dashboard, buildings, buildings/[id],
│           │                       # apartments, apartments/[id], contracts, contracts/[id],
│           │                       # incidents, incidents/my-assignments, invoices,
│           │                       # meter-readings, users, utility-types, settings,
│           │                       # access-card-requests, payments/pending
│           ├── components/
│           │   ├── ui/             # Shadcn/UI (33 components: button, dialog, table, form, etc.)
│           │   ├── maps/           # SVG floor plan viewer + builder
│           │   ├── 3d/             # Three.js building 3D viewer
│           │   ├── dashboard/      # Chart widgets (occupancy, revenue, incidents, activity)
│           │   ├── access-cards/   # Access card management UI components
│           │   ├── buildings/      # Building policies, parking, floor plans, 3D viewer
│           │   ├── payments/       # Payment schedules, record payment, void payment
│           │   └── users/          # User management dialogs
│           ├── hooks/              # 30 custom hooks (auth, CRUD, contracts, websocket,
│           │                       # svg-to-3d, tour, access-cards, parking, payments)
│           ├── stores/             # authStore, mapStore (Zustand)
│           └── lib/                # api-client, utils, performance, web-vitals
│
├── packages/
│   └── shared-types/               # Shared Zod schemas, entity types, enums, event types
│
├── agents/                         # AI agent definitions for Copilot
│   ├── backend-architect.md
│   ├── database-architect.md
│   ├── frontend-developer.md
│   ├── code-reviewer.md
│   └── reference-3d-dev.md
│
├── openspec/                       # Spec-driven development workflow
│   ├── AGENTS.md                   # AI instructions for using OpenSpec
│   ├── project.md                  # Domain context
│   ├── specs/                      # Living specifications
│   └── changes/                    # Change proposals (proposal → implement → archive)
│
├── .github/
│   ├── copilot-instructions.md     # Auto-loaded AI coding context
│   ├── SYSTEM_PROMPT.md            # Session starter prompts
│   └── prompts/                    # openspec-proposal, openspec-apply, openspec-archive
│
├── scripts/                        # DB init, migration, analysis scripts
├── docker-compose.yml              # PostgreSQL 15, Redis 7, ClamAV, MinIO
├── turbo.json
└── pnpm-workspace.yaml
```

---

## Database Schema

### Models (32 total, 25 enums)

#### Identity & RBAC (7 models)
| Model | Purpose |
|-------|---------|
| **users** | All users (admin, technician, resident). Multi-role support via junction table |
| **user_role_assignments** | Multi-role junction table (user ↔ role with expiry) |
| **permissions** | Permission definitions (e.g., 'invoices:create', 'users:delete') |
| **role_permissions** | Role ↔ permission mapping |
| **refresh_tokens** | JWT refresh token rotation with IP/User-Agent tracking |
| **password_reset_tokens** | Time-limited password reset flows |
| **audit_logs** | Immutable audit trail (actor, action, resource, old/new values, IP, user agent) |

#### Apartments (10 models)
| Model | Purpose |
|-------|---------||
| **buildings** | Buildings with SVG floor plans (`svgMapData`), floor heights (`floorHeights`), amenities |
| **apartments** | Units with 50+ fields: spatial, ownership, occupancy, utility meters, parking, billing config, policy overrides, IoT sync |
| **contracts** | Lease agreements: tenant, apartment, dates, rent, deposit, terms, contract type (rental/purchase/lease-to-own) |
| **management_fee_configs** | Per-building pricing rules by unit type with effective date ranges |
| **building_policies** | Versioned building policies: occupancy rules, billing config, trash collection (effective_from/to) |
| **parking_zones** | Parking zones: building, name, code, slot type (car/motorcycle/bicycle), fee |
| **parking_slots** | Individual parking slots: zone, slot number, assignment, status, access card link |
| **access_cards** | Access cards: card number, apartment, holder, type (building/parking), status, zones, floor access |
| **access_card_requests** | Access card request workflow: requester, apartment, card type, status (pending/approved/rejected) |
| **bank_accounts** | Bank accounts for VietQR: building/owner accounts, bank code, account number |

#### Payment Tracking (2 models)
| Model | Purpose |
|-------|---------||
| **contract_payment_schedules** | Payment milestones/periods: rent installments, purchase milestones, due dates, status (pending/paid/partial/overdue) |
| **contract_payments** | Payment transactions: amount, method, reference, receipt URL, void tracking (is_voided, voided_at, void_reason) |

#### Billing (6 models)
| Model | Purpose |
|-------|---------|
| **invoices** / **invoice_line_items** | Generated invoices with tier-calculated line items |
| **meter_readings** | Monthly meter readings with image proof URL |
| **utility_types** | Utility definitions (electricity, water, gas) with unit codes |
| **utility_tiers** | Tiered pricing per utility per building with effective date ranges |
| **billing_jobs** | BullMQ job tracking for batch invoice generation |

#### Incidents (3 models)
| Model | Purpose |
|-------|---------|
| **incidents** | Maintenance requests: category, priority, status lifecycle, apartment, reporter, assignee |
| **incident_comments** | Comments on incidents with commenter tracking |
| **notifications** | In-app notifications: type, user, resource link, read status, metadata |

#### AI Assistant (3 models)
| Model | Purpose |
|-------|---------|
| **documents** | Knowledge base documents: title, content, metadata, source URL |
| **document_chunks** | Chunked documents with pgvector embeddings (768-dim for Gemini embedding-004) |
| **chat_queries** | AI chat history: query, response, token usage, response time tracking |

### Enums (25)

| Enum | Values |
|------|--------|
| `UserRole` | admin, technician, resident |
| `ApartmentStatus` | vacant, occupied, maintenance, reserved |
| `ContractStatus` | draft, active, expired, terminated |
| `ContractType` | rental, purchase, lease_to_own |
| `ContractPaymentStatus` | pending, paid, partial, overdue |
| `PaymentType` | rent, deposit, purchase_installment, option_fee, maintenance_fee, penalty, other |
| `PaymentStatus` | pending, paid, partial, overdue, cancelled, voided |
| `PaymentMethod` | cash, bank_transfer, credit_card, momo, vnpay, check, other |
| `PaymentRejectionReason` | insufficient_funds, invalid_account, duplicate_payment, disputed, other |
| `InvoiceStream` | utilities, management_fee |
| `InvoiceStatus` | draft, pending, paid, overdue, cancelled |
| `IncidentCategory` | plumbing, electrical, hvac, structural, appliance, pest, noise, security, other |
| `IncidentStatus` | open, assigned, in_progress, pending_review, resolved, closed |
| `IncidentPriority` | low, medium, high, urgent |
| `BillingJobStatus` | pending, processing, completed, failed |
| `BillingCycle` | monthly, quarterly, yearly |
| `UnitType` | studio, one_bedroom, two_bedroom, three_bedroom, duplex, penthouse, shophouse |
| `OwnershipType` | permanent, fifty_year, leasehold |
| `Orientation` | north, south, east, west, northeast, northwest, southeast, southwest |
| `SyncStatus` | synced, pending, error, disconnected |
| `ParkingType` | car, motorcycle, bicycle |
| `ParkingSlotStatus` | available, occupied, reserved, maintenance |
| `AccessCardType` | building, parking |
| `AccessCardStatus` | active, suspended, deactivated, expired |
| `AccessCardRequestStatus` | pending, approved, rejected, cancelled |

---

## Environment Variables

```bash
# Database
DATABASE_URL=postgresql://vully:vully_dev_password@localhost:5432/vully_dev

# Redis
REDIS_URL=redis://localhost:6379

# JWT (generate with: openssl rand -base64 32)
JWT_ACCESS_SECRET=<random-32-chars>
JWT_REFRESH_SECRET=<random-32-chars-different>
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# AI
GEMINI_API_KEY=<from-google-ai-studio>

# Optional
S3_ENDPOINT=http://localhost:9000
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin
S3_BUCKET=vully-uploads
```

---

## Scripts

```bash
# Development
pnpm dev              # Start all apps (turbo)
pnpm build            # Build all apps
pnpm lint             # Lint all apps
pnpm test             # Run all tests
pnpm test:cov         # Tests with coverage

# Database
pnpm db:generate      # Generate Prisma client
pnpm db:migrate       # Run pending migrations
pnpm db:push          # Push schema changes (dev only)
pnpm db:studio        # Open Prisma Studio GUI
```

---

## Architecture

### Backend Request Flow

```
Client → CorrelationIdMiddleware → JwtAuthGuard → RolesGuard
       → LoggingInterceptor → ValidationPipe → Controller → Service
       → Prisma/Redis/BullMQ → HttpExceptionFilter → Response
```

### Key Patterns

- **Background jobs**: BullMQ processors (billing invoice generation with retry + dead-letter)
- **Real-time**: Socket.IO rooms per building/apartment/user → incident lifecycle events
- **Caching**: Redis 5-min TTL for dashboard stats
- **AI RAG**: Document → chunk → embed (pgvector) → similarity search → Gemini prompt

### Frontend Patterns

- **Server Components** by default, Client Components only for interactivity
- **TanStack Query** for all API calls (never raw fetch/useEffect)
- **Nuqs** for URL state (filters, pagination, tabs)
- **Zustand** for global client state (auth, map selection)
- **Framer Motion** for page transitions and element enter/exit animations
- **Skeleton loaders** on all async data (CLS = 0)
- **Dynamic imports** for heavy widgets (charts, 3D viewer)

### SVG / 3D Floor Plans

- Buildings store SVG floor plan data in `Building.svgMapData`
- Each apartment links to its SVG element via `Apartment.svgElementId`
- Built-in SVG Builder: drag-and-drop apartment templates, grid snapping, download/save
- Three.js 3D viewer: extrudes SVG floor plans into 3D building model using `Building.floorHeights`

---

## RBAC

| Role | Apartments | Contracts | Invoices | Incidents | Users | AI |
|------|-----------|-----------|----------|-----------|-------|----|
| **Admin** | CRUD | CRUD | CRUD | CRUD | CRUD | Unlimited |
| **Technician** | Read | — | Read | Update* | — | 20/day |
| **Resident** | Read* | Read* | Read* | Create* | — | 20/day |

\* Scoped to own resources only

Multi-role supported via `UserRoleAssignment` junction table + `Permission` / `RolePermission` tables.

---

## API Documentation

All endpoints are auto-documented via Swagger at `/api/docs`.

### Implemented Endpoints

#### Authentication (`/api/auth`)
- `POST /auth/register` — Public registration (creates resident)
- `POST /auth/login` — JWT access + refresh tokens
- `POST /auth/refresh` — Rotate tokens
- `POST /auth/logout` — Revoke refresh token
- `POST /auth/logout-all` — Revoke all user sessions
- `GET /auth/me` — Current user profile
- `POST /auth/password-reset-request` — Request password reset email
- `POST /auth/password-reset` — Reset password with token

#### Users (`/api/users`)
- `GET /users` — List users (admin only, paginated)
- `GET /users/:id` — Get user by ID
- `POST /users` — Create user (admin only)
- `PATCH /users/:id` — Update user
- `DELETE /users/:id` — Delete user (admin only)

#### Buildings (`/api/buildings`)
- `GET /buildings` — List buildings (paginated)
- `GET /buildings/:id` — Get building with apartments
- `POST /buildings` — Create building (admin only)
- `PATCH /buildings/:id` — Update building
- `DELETE /buildings/:id` — Delete building (admin only)

#### Apartments (`/api/apartments`)
- `GET /apartments` — List apartments (filterable by building, status)
- `GET /apartments/:id` — Get apartment details
- `POST /apartments` — Create apartment (admin only)
- `PATCH /apartments/:id` — Update apartment
- `DELETE /apartments/:id` — Delete apartment (admin only)

#### Contracts (`/api/contracts`)
- `GET /contracts` — List contracts (filterable by status, tenant)
- `GET /contracts/:id` — Get contract details
- `POST /contracts` — Create contract (admin only)
- `PATCH /contracts/:id` — Update contract
- `POST /contracts/:id/terminate` — Terminate contract (admin only)

#### Building Policies (`/api/buildings/:buildingId/policies`)
- `GET /buildings/:buildingId/policies` — List policies (includes current + historical)
- `GET /buildings/:buildingId/policies/current` — Get current active policy
- `POST /buildings/:buildingId/policies` — Create new policy version (admin only)
- `PATCH /policies/:id` — Update policy (admin only, updates effective_to for versioning)

#### Parking Management (`/api/buildings/:buildingId/parking`)
- `GET /buildings/:buildingId/parking/zones` — List parking zones
- `POST /buildings/:buildingId/parking/zones` — Create zone (admin only)
- `GET /buildings/:buildingId/parking/zones/:zoneId/slots` — List slots in zone
- `PATCH /parking/slots/:slotId` — Update slot (assign, free, set status)
- `GET /apartments/:apartmentId/parking-slots` — Get parking assigned to apartment

#### Access Cards (`/api/apartments/:apartmentId/access-cards`)
- `GET /apartments/:apartmentId/access-cards` — List access cards for apartment
- `POST /apartments/:apartmentId/access-cards` — Issue new access card (admin only)
- `GET /access-cards/:id` — Get access card details
- `PATCH /access-cards/:id` — Update card (edit zones, floor access)
- `POST /access-cards/:id/deactivate` — Deactivate card (admin only)
- `POST /access-cards/:id/reactivate` — Reactivate card (admin only)
- `GET /access-cards/stats` — Get access card statistics

#### Access Card Requests (`/api/access-card-requests`)
- `GET /access-card-requests` — List all requests (admin: all, resident: own)
- `GET /access-card-requests/:id` — Get request details
- `POST /access-card-requests` — Submit request (resident)
- `POST /access-card-requests/:id/approve` — Approve request & issue card (admin only)
- `POST /access-card-requests/:id/reject` — Reject request (admin only)
- `DELETE /access-card-requests/:id` — Cancel request (requester only, pending status)

#### Bank Accounts (`/api/buildings/:buildingId/bank-accounts`)
- `GET /buildings/:buildingId/bank-accounts` — List building bank accounts
- `POST /buildings/:buildingId/bank-accounts` — Create bank account (admin only)
- `PATCH /bank-accounts/:id` — Update bank account (admin only)
- `DELETE /bank-accounts/:id` — Delete bank account (admin only)
- `POST /bank-accounts/:id/set-primary` — Set as primary account (admin only)

#### Payment Tracking (`/api/contracts/:id/...`)
- `GET /contracts/:id/payment-schedules` — List payment schedule for contract
- `POST /contracts/:id/payment-schedules/generate-rent` — Auto-generate monthly rent schedule
- `GET /contracts/:id/payments` — List all payments for contract
- `POST /contracts/:id/payments` — Record a payment
- `GET /contracts/:id/financial-summary` — Get total due, paid, balance, overdue
- `POST /contract-payments/:id/void` — Void a recorded payment

#### Invoices (`/api/invoices`)
- `GET /invoices` — List invoices (filterable by status, period)
- `GET /invoices/:id` — Get invoice with line items
- `POST /invoices` — Create invoice (admin only)
- `PATCH /invoices/:id` — Update invoice status
- `POST /invoices/bulk-generate` — Trigger BullMQ batch generation

#### Meter Readings (`/api/meter-readings`)
- `GET /meter-readings` — List meter readings (filterable by apartment, period)
- `GET /meter-readings/:id` — Get reading details
- `POST /meter-readings` — Create reading (with image upload)
- `PATCH /meter-readings/:id` — Update reading
- `DELETE /meter-readings/:id` — Delete reading

#### Utility Types (`/api/utility-types`)
- `GET /utility-types` — List utility types
- `POST /utility-types` — Create utility type (admin only)
- `PATCH /utility-types/:id` — Update utility type

#### Incidents (`/api/incidents`)
- `GET /incidents` — List incidents (filterable by status, category, priority)
- `GET /incidents/:id` — Get incident with comments
- `POST /incidents` — Create incident (resident can create)
- `PATCH /incidents/:id` — Update incident (resident for own, technician/admin for any)
- `POST /incidents/:id/comments` — Add comment

#### Stats (`/api/stats`)
- `GET /stats/dashboard` — Cached dashboard analytics (Redis 5-min TTL)
  - Total buildings, apartments, occupancy rate
  - Revenue breakdown, incident summary, recent activity

#### AI Assistant (`/api/ai-assistant`)
- `POST /ai-assistant/chat` — RAG-powered chat (Gemini + pgvector similarity search)
- `GET /ai-assistant/documents` — List knowledge base documents
- `POST /ai-assistant/documents` — Upload document (admin only, triggers chunking + embedding)

#### Billing Jobs (`/api/billing-jobs`)
- `GET /billing-jobs` — List billing jobs with status
- `GET /billing-jobs/:id` — Get job details with progress

#### Health Checks
- `GET /health` — Liveness probe
- `GET /health/ready` — Readiness probe (checks DB, Redis, Queue health)

---

## Testing

```bash
pnpm test              # Unit tests (Jest)
pnpm test:cov          # Coverage report
```

### Backend Testing Status
- **Current Coverage**: 16.79% (Target: 70% for billing logic)
- **Test Files**:
  - ✅ `auth.service.spec.ts` — Auth service unit tests
  - ✅ `invoices.service.spec.ts` — Invoice generation with tier pricing
  - ✅ `meter-readings.service.spec.ts` — Meter reading logic
  - ✅ `billing.processor.spec.ts` — BullMQ job processing
- **Mock Factories**: `createMockUser()`, `createMockApartment()`, etc.
- **External Services**: Redis, BullMQ, Prisma mocked in unit tests

### Frontend Testing
- **Not yet implemented** (planned: Vitest + React Testing Library)
- Target: Component tests for critical flows (auth, forms, table interactions)

### E2E Testing
- **Not yet implemented** (planned: Playwright)
- Target: Critical user journeys (login → create contract → generate invoice → pay)

## 📊 Monitoring & Observability

### Health Checks
- **Liveness**: `GET /health` — Returns 200 if app is alive
- **Readiness**: `GET /health/ready` — Checks DB connection, Redis connection, BullMQ queue health

### Logging
- **Pino** structured JSON logging with correlation IDs
- **Log Levels**: debug (dev), info (production)
- **Redaction**: Authorization headers, passwords automatically redacted
- **Correlation IDs**: Propagated via `x-correlation-id` header, injected by `CorrelationIdMiddleware`

### Performance Monitoring
- **Web Vitals**: Tracked client-side via `web-vitals-tracker.tsx`
  - FCP (First Contentful Paint)
  - LCP (Largest Contentful Paint)
  - CLS (Cumulative Layout Shift)
  - FID (First Input Delay)
  - TTFB (Time to First Byte)
- **Lighthouse Target**: > 90 score
- **Performance Budget**:
  - FCP < 1.5s
  - LCP < 2.5s
  - ✅ Completed (Phases 0-7)
- [x] **Identity Module**: JWT auth (access + refresh tokens), user CRUD, multi-role RBAC (UserRoleAssignment + Permissions)
- [x] **Apartments Module**: Buildings, Apartments (50+ fields), Contracts (CRUD + terminate)
- [x] **Payment Tracking**: Contract payment schedules, payment recording, financial summaries, void support (NEW)
- [x] **Billing Module**: Invoices, Meter Readings, Utility Types/Tiers (tiered pricing), BullMQ batch processor
- [x] **Incidents Module**: CRUD, Comments, WebSocket Gateway (real-time updates)
- [x] **Stats Module**: Dashboard analytics with Redis caching
- [x] **AI Assistant Module**: RAG chatbot (Gemini + pgvector + LangChain)
- [x] **SVG Floor Plans**: Interactive viewer + builder (drag-drop templates, grid snapping, download/save)
- [x] **3D Building Viewer**: Three.js extrusion of SVG floor plans using `floorHeights[]`
- [x] **Frontend**: 10 dashboard pages, 27 Shadcn/UI components, 15 custom hooks, Framer Motion animations
- [x] **Infrastructure**: Docker Compose (PostgreSQL, Redis, ClamAV, MinIO), health checks, Pino logging

### 🚧 In Progress
- [ ] **Testing**: Increase backend coverage to 70%, add frontend unit tests (Vitest), E2E tests (Playwright)
- [ ] **Accounting Module**: Implement Journal Entries, Ledger Accounts, Vouchers (currently skeleton)
- [ ] **Notifications**: In-app notification UI, email/SMS integration

### 🔮 Enterprise MVP Roadmap (Next Phase)

See [Technical Execution & AI Automation Roadmap](docs/Technical-Execution&AI-Automation-Roadmap.md) for full details.

#### Phase 1: Fiduciary & Security Core (Weeks 1-4)
- [ ] **Multi-Tenant Architecture**: Organization model, PostgreSQL RLS, tenant-scoped data isolation
- [ ] **Trust Accounting**: Financial accounts (operating/trust/maintenance), escrow ledger per contract, co-mingling prevention
- [ ] **Enhanced RBAC**: Organization-scoped roles (owner, portfolio_admin, building_admin, leasing_agent, accountant, viewer)

#### Phase 2: Compliance & Payments (Weeks 5-8)
- [ ] **Regional Compliance Engine**: US escrow laws (state-specific), Vietnamese 2% maintenance fund tracking
- [ ] **Payment Gateway Integration**: Stripe (cards/ACH), VNPay, MoMo, VietQR code generation
- [ ] **Compliance Alerts**: Automated deadline tracking, escalation workflows

#### Phase 3: Communications & Polish (Weeks 9-11)
- [ ] **Notification Hub**: Multi-channel (email/SMS/push), customizable templates, user preferences
- [ ] **Mobile App**: React Native with shared @vully/shared-types
- [ ] **Advanced Reporting**: PDF generation (invoices, contracts), Excel exports
- [ ] **Audit Dashboard**: Visualize audit_logs with filters and search

### Recent Additions ✅
- [x] Payment Tracking System (schedules, payments, financial summaries, void)
- [x] Contract detail page with payment schedule table
- [x] Expanded apartment data model (50+ fields across 7 domains)
- [x] Multi-role RBAC (UserRoleAssignment + Permissions)
- [x] SVG Floor Plan Builder & 3D Viewer
- [x] Contracts backend API (CRUD + terminate)
- [x] Contracts frontend (list, create/edit form, detail sheet)

### In Progress 🚧
- [ ] Phase 7.1: Testing (improve coverage)
- [ ] Accounting module (skeleton created, services TBD)
- [ ] In-app notifications module

### Future 🔮
- [ ] Management board (investors, vendors)
- [ ] Mobile app (React Native)
- [ ] Payment gateway integration
- [ ] Email/SMS notifications
- [ ] Multi-language support

## 🆘 Troubleshooting

<details>
<summary><strong>Database Connection Errors</strong></summary>

```bash
docker ps | grep postgres
docker-compose restart postgres
pnpm db:push --force-reset
```
</details>

<details>
<summary><strong>Redis Connection Errors</strong></summary>

```bash
docker ps | grep redis
redis-cli ping
docker-compose restart redis
```
</details>

<details>
<summary><strong>Build Errors</strong></summary>

```bash
rm -rf node_modules pnpm-lock.yaml
pnpm install
pnpm clean
pnpm db:generate
```
</details>

## 📝 License

Private - All rights reserved

---

**Built with ❤️ using NestJS, Next.js, and modern TypeScript**
