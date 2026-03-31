# Tasks: Scaffold Apartment Management Platform

## Phase 0: Design System & Onboarding Flow

### 0.1 Shadcn/UI Setup
- [x] Install Shadcn/UI CLI and initialize with Tailwind CSS
- [x] Configure theme tokens (colors, spacing, typography)
- [x] Add core components: Button, Input, Select, Dialog, Toast, Skeleton
- [x] Create dark/light mode toggle with theme provider
- [ ] Setup component storybook (optional but recommended)

### 0.2 Framer Motion Integration
- [x] Install Framer Motion and configure AnimatePresence provider
- [x] Create reusable page transition wrapper component
- [ ] Define `LayoutGroup` wrapper for list animations
- [x] Create standard enter/exit animations (fade, slide, scale)
- [ ] Add motion variants for common UI patterns (modals, toasts, dropdowns)

### 0.3 Shepherd.js Tour Guide System
- [x] Install Shepherd.js and create `useTourGuide` custom hook
- [ ] Add `has_seen_tour` JSONB field to users table (migration)
- [ ] Create tour step definitions for Admin dashboard onboarding
- [x] Implement "Don't show again" toggle with user profile update
- [ ] Add tour trigger button for returning users
- [ ] Create tour themes matching Shadcn design tokens

### 0.4 Shared Types Package Setup
- [x] Create `packages/shared-types` with Zod schemas
- [x] Define base API response schemas (success, error, paginated)
- [x] Create entity schemas matching Prisma models
- [x] Setup type inference helpers (`z.infer<typeof Schema>`)
- [x] Configure package exports for FE/BE consumption

**Dependencies**: 0.4 should be done early as other phases depend on shared types.

---

## Phase 1: Project Foundation

### 1.1 Repository & Tooling Setup
- [x] Initialize monorepo structure (pnpm workspaces or Nx)
- [x] Configure ESLint + Prettier (shared config)
- [ ] Setup Husky + lint-staged for pre-commit hooks
- [x] Create `docker-compose.yml` for local dev (PostgreSQL, Redis)
- [x] Add `.env.example` files for both packages

### 1.2 Backend Bootstrap (NestJS)
- [x] Scaffold NestJS application with strict TypeScript
- [x] Configure Prisma ORM with PostgreSQL connection
- [x] Create initial database migration (users, buildings, apartments)
- [x] Setup Swagger/OpenAPI documentation
- [x] Configure global exception filter
- [x] Add Pino logger with correlation IDs
- [x] Setup health check endpoints (`/health`, `/health/ready`) with @nestjs/terminus
- [ ] Configure file validation middleware (MIME types, size limits)

### 1.3 Frontend Bootstrap (Next.js 15)
- [x] Scaffold Next.js 15 with App Router
- [x] Configure TanStack Query provider
- [x] Setup Zustand stores (skeleton)
- [x] Configure Nuqs for URL state management
- [x] Add Tailwind CSS with design tokens (from Phase 0)
- [x] Create base layout with responsive shell and Framer Motion transitions
- [x] Verify Shadcn/UI components render correctly

**Parallelizable**: 1.1, 1.2, 1.3 can run concurrently after repo setup

---

## Phase 2: Identity & Core Data

### 2.1 Identity Module (Backend)
- [x] Define User entity with role enum (Admin, Technician, Resident)
- [x] Implement JWT authentication (login, refresh, logout)
- [x] Create RBAC guards and decorators (`@Roles()`)
- [x] Add user registration endpoint (admin-only initially)
- [ ] Implement password reset flow (token-based)
- [x] Write unit tests for auth logic (>80% coverage)
- [x] Document auth endpoints in Swagger

### 2.2 Apartments Module (Backend)
- [x] Define Building, Apartment, Contract entities
- [x] Create CRUD endpoints for buildings
- [x] Create CRUD endpoints for apartments
- [x] Implement contract management (create, terminate)
- [x] Add apartment status management (vacant, occupied, maintenance)
- [ ] Write e2e tests for apartment flows

### 2.3 Auth & Core UI (Frontend)
- [x] Create login page with React-Hook-Form + Zod validation
- [x] Implement auth context with secure token storage
- [x] Add protected route wrapper with Framer Motion transitions
- [x] Create user profile dropdown (Shadcn DropdownMenu)
- [x] Build apartment listing page with TanStack Table
- [x] Create apartment detail panel (Shadcn Sheet/Dialog)

**Dependencies**: 2.2 depends on 2.1 (guards). 2.3 depends on 2.1 API.

---

## Phase 3: Billing System

### 3.1 Billing Module (Backend)
- [x] Define Invoice, LineItem entities (Prisma schema)
- [x] Define MeterReading entity (electric, water, gas)
- [x] Create meter reading submission endpoint
- [x] Implement invoice calculation logic (utilities + rent with tiered pricing)
- [x] Add invoice CRUD endpoints
- [ ] Implement invoice PDF generation (deferred to Phase 5)

### 3.2 BullMQ Worker Setup
- [x] Configure Redis connection for BullMQ
- [x] Create billing queue and worker process
- [x] Implement `generate-monthly-invoices` job
- [x] Add job progress tracking
- [x] Implement dead letter queue handler
- [x] Write unit tests for billing logic (>90% coverage achieved)
- [x] Add admin endpoint to trigger bulk invoice generation

### 3.3 Billing UI (Frontend)
- [x] Create invoice list page with TanStack Table + filters via Nuqs
- [x] Build invoice detail view (Shadcn Card/Sheet)
- [x] Add meter reading form with React-Hook-Form + Zod
- [x] Implement invoice status badge component (Shadcn Badge)
- [x] Add bulk generation trigger for admin (Sheet + TanStack Query hooks)
- [x] Show job progress indicator with Framer Motion animations

**Dependencies**: 3.2 depends on Redis setup (1.1). 3.3 depends on 3.1 API.

---

## Phase 4: Incidents & Real-time

### 4.1 Incidents Module (Backend)
- [x] Define Incident entity with category enum
- [x] Implement incident CRUD endpoints
- [ ] Add image upload with ClamAV validation + S3 presigned URLs
- [x] Implement assignment workflow (admin assigns technician)
- [x] Add status transitions with validation
- [x] Create incident comment/log sub-resource

### 4.2 WebSocket Gateway
- [x] Configure Socket.IO gateway in NestJS
- [x] Implement room-based architecture (building, apartment, user)
- [x] Add connection authentication middleware
- [x] Create event emitters for incident updates
- [ ] Create event emitters for invoice notifications
- [ ] Write integration tests for WS events

### 4.3 Incidents UI (Frontend)
- [x] Create incident submission form with React-Hook-Form + image upload
- [x] Build incident list with TanStack Table (virtualized rows)
- [x] Implement incident detail page with timeline (Framer Motion LayoutGroup)
- [ ] Add real-time status updates via WebSocket with motion notifications
- [x] Create technician assignment modal (Shadcn Dialog)
- [ ] Optimize images with next/image

**Dependencies**: 4.2 depends on 4.1. 4.3 depends on both.

---

## Phase 5: Dashboard & Maps

### 5.1 Dashboard Backend
- [ ] Create statistics aggregation endpoints
- [ ] Implement Redis caching for dashboard data (TTL: 5 min)
- [ ] Add occupancy rate calculation
- [ ] Add revenue summary endpoints
- [ ] Add incident analytics endpoints

### 5.2 SVG Map Engine (Frontend)
- [ ] Create SVG floor plan component
- [ ] Implement Zustand store for map state
- [ ] Add apartment highlighting on hover
- [ ] Implement click-to-select with detail panel
- [ ] Add filter controls (status-based)
- [ ] Support zoom and pan (optional)

### 5.3 Dashboard UI (Frontend)
- [ ] Create dashboard layout with widget grid
- [ ] Implement dynamic import for all widgets
- [ ] Build occupancy chart widget
- [ ] Build revenue chart widget
- [ ] Build recent incidents widget
- [ ] Add skeleton loaders for all widgets
- [ ] Verify Lighthouse score >90

**Parallelizable**: 5.1 and 5.2 can run concurrently. 5.3 depends on both.

---

## Phase 6: AI Assistant

### 6.1 AI Engine Backend
- [ ] Configure LangChain.js with OpenAI (or local model)
- [ ] Create document ingestion pipeline (regulations, FAQ)
- [ ] Setup vector storage (pgvector or external)
- [ ] Implement RAG query endpoint
- [ ] Add rate limiting for AI endpoint
- [ ] Create admin endpoint to manage documents

### 6.2 AI Chat Widget (Frontend)
- [ ] Create floating chat widget component
- [ ] Implement chat history state
- [ ] Add streaming response support
- [ ] Create suggested questions UI
- [ ] Style for mobile (full-screen) and desktop (sidebar)

**Dependencies**: 6.2 depends on 6.1 API.

---

## Phase 7: Quality & Deployment

### 7.1 Testing & Quality
- [ ] Achieve >70% unit test coverage for billing logic
- [ ] Write e2e tests for critical flows (auth, invoice, incidents)
- [ ] Run Lighthouse audit, fix any <90 scores
- [ ] Verify CLS = 0 on all dashboard pages
- [ ] Test responsive layout (mobile, tablet, desktop)
- [ ] Security audit: check for common vulnerabilities

### 7.2 Documentation
- [ ] Complete Swagger API documentation
- [ ] Write README with setup instructions
- [ ] Document environment variables
- [ ] Create architecture diagram (final)

### 7.3 Deployment Setup
- [ ] Create production Dockerfile for backend
- [ ] Create production Dockerfile for frontend
- [ ] Setup docker-compose.prod.yml
- [ ] Configure health checks
- [ ] Add logging aggregation setup (optional)

---

## Validation Checklist (Definition of Done)

### Backend
- [ ] Swagger API Documentation complete
- [ ] Unit Test Coverage >70% for billing logic
- [ ] Audit logging for sensitive actions

### Frontend
- [ ] Lighthouse Performance Score >90
- [ ] No layout shift (CLS = 0) on data load
- [ ] Responsive: Mobile (resident) + Desktop (admin)
