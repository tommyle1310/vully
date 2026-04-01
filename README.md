 # Vully — Apartment Management Platform

> Scalable apartment management with real-time updates, AI assistance, automated billing, and interactive 3D floor plans.

---

## Overview

Vully is a monorepo apartment management platform built for Vietnamese high-rise complexes. It handles the full lifecycle: building/unit management, tenant contracts, utility billing (tiered pricing), incident tracking, and an AI chatbot for building regulations.

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
| API | http://localhost:3001 |
| Swagger Docs | http://localhost:3001/api/docs |
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
│   ├── api/                        # NestJS backend (port 3001)
│   │   ├── prisma/
│   │   │   └── schema.prisma      # Database schema + migrations
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
│   │           ├── apartments/     # Buildings, apartments, contracts
│   │           ├── billing/        # Invoices, meter readings, BullMQ processor, tiered pricing
│   │           ├── incidents/      # Incident CRUD, comments, WebSocket gateway
│   │           ├── stats/          # Dashboard analytics (Redis-cached)
│   │           ├── ai-assistant/   # RAG chatbot (Gemini + pgvector + LangChain)
│   │           ├── accounting/     # Journal entries, ledger accounts, vouchers (skeleton)
│   │           └── management-board/ # Investors, vendors (skeleton)
│   │
│   └── web/                        # Next.js 15 frontend (port 3000)
│       └── src/
│           ├── app/
│           │   ├── (auth)/         # /login, /register, /forgot-password, /reset-password
│           │   └── (dashboard)/    # /dashboard, /buildings, /apartments, /contracts,
│           │                       # /incidents, /invoices, /meter-readings, /users
│           ├── components/
│           │   ├── ui/             # Shadcn/UI (24 components)
│           │   ├── maps/           # SVG floor plan viewer + builder
│           │   ├── 3d/             # Three.js building 3D viewer
│           │   ├── dashboard/      # Chart widgets (occupancy, revenue, incidents, activity)
│           │   └── users/          # User management dialogs
│           ├── hooks/              # 14 custom hooks (auth, CRUD, contracts, websocket, svg-to-3d, tour)
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

### Models (26 total)

| Model | Purpose |
|-------|---------|
| **User** | All users (admin, technician, resident). Fields: email, passwordHash, role, firstName, lastName, phone, profileData, isActive |
| **RefreshToken** | JWT refresh token rotation with IP/UA tracking |
| **PasswordResetToken** | Time-limited password reset flows |
| **AuditLog** | Immutable audit trail (actor, action, resource, old/new values) |
| **UserRoleAssignment** | Multi-role support (user ↔ role junction) |
| **Permission** | Permission keys with descriptions |
| **RolePermission** | Role ↔ permission mapping |
| **Building** | Building/block: name, address, floorCount, svgMapData, floorHeights, amenities |
| **Apartment** | Unit within buildings: unit_number, floor, status, grossArea, bedrooms, bathrooms, svgElementId, owner, unitType, orientation, billingCycle, metering IDs |
| **Contract** | Lease agreements: tenant, apartment, dates, rent, deposit, depositMonths, termsNotes, createdBy |
| **ManagementFeeConfig** | Per-building pricing: unitType, pricePerSqm, effective date range |
| **UtilityType** | Utility definitions (electricity, water, gas) with unit codes |
| **UtilityTier** | Tiered pricing per utility per building with effective date ranges |
| **MeterReading** | Monthly meter readings with image proof |
| **Invoice** / **InvoiceLineItem** | Generated invoices with tier-calculated line items |
| **BillingJob** | BullMQ job tracking for batch invoice generation |
| **Incident** / **IncidentComment** | Maintenance requests with category, priority, status lifecycle, comments |
| **Notification** | In-app notifications (type, resource link, read status) |
| **Document** / **DocumentChunk** | AI knowledge base documents with pgvector embeddings |
| **ChatQuery** | AI chat history with token usage and response time tracking |

### Enums

| Enum | Values |
|------|--------|
| `UserRole` | admin, technician, resident |
| `ApartmentStatus` | vacant, occupied, maintenance, reserved |
| `ContractStatus` | draft, active, expired, terminated |
| `InvoiceStatus` | draft, pending, paid, overdue, cancelled |
| `IncidentCategory` | plumbing, electrical, hvac, structural, appliance, pest, noise, security, other |
| `IncidentStatus` | open, assigned, in_progress, pending_review, resolved, closed |
| `IncidentPriority` | low, medium, high, urgent |
| `BillingJobStatus` | pending, processing, completed, failed |
| `UnitType` | studio, one_bedroom, two_bedroom, three_bedroom, duplex, penthouse, shophouse |
| `OwnershipType` | permanent, fifty_year, leasehold |
| `Orientation` | north, south, east, west, northeast, northwest, southeast, southwest |
| `BillingCycle` | monthly, quarterly, yearly |
| `SyncStatus` | synced, pending, error, disconnected |

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

### Auth Flow
- `POST /api/auth/login` → `{ accessToken, refreshToken, user }`
- `POST /api/auth/refresh` → rotated tokens
- `POST /api/auth/logout` → revoke refresh token
- `GET /api/auth/me` → current user profile

### Key Endpoints
- `/api/apartments/buildings` — Building CRUD + SVG management
- `/api/apartments` — Apartment CRUD
- `/api/contracts` — Contract lifecycle (create, list, update, terminate)
- `/api/billing/invoices` — Invoice generation + payment tracking
- `/api/billing/meter-readings` — Meter reading CRUD with image proof
- `/api/incidents` — Incident lifecycle management (WebSocket events)
- `/api/stats/dashboard` — Cached analytics
- `/api/ai-assistant/chat` — RAG-powered queries
- `/health` — Liveness check
- `/health/ready` — Readiness check (DB + Redis)

---

## Testing

```bash
pnpm test              # Unit tests (Jest)
pnpm test:cov          # Coverage report
```

- Unit tests for all billing logic (coverage > 70%)
- Mock factories: `createMockUser()`, etc.
- External services (Redis, AI) mocked in unit tests

**Current Coverage:** 16.79% (Target: 70% for billing)

## 📊 Monitoring

### Health Checks
- **Liveness**: `GET /health`
- **Readiness**: `GET /health/ready` (DB + Redis + Queue)

### Logging
Structured JSON via Pino with correlation IDs

### Performance Targets
- Lighthouse: >90
- CLS: 0 (no layout shift)
- TBT: <200ms

## 📚 Documentation

- [Environment Variables](./ENVIRONMENT.md)
- [API Guide](./API_GUIDE.md)
- [Architecture](./ARCHITECTURE.md)
- [OpenSpec Design](./openspec/changes/scaffold-apartment-platform/)

## 🗺️ Roadmap

### Completed ✅
- [x] Phase 0-6: Core platform features
- [x] AI Assistant with RAG
- [x] Real-time WebSocket updates
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
