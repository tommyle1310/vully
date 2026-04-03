# Project Context

## Purpose

Vully is an apartment management platform that enables property administrators to manage tenants, billing, incidents, and real-time communications. The system supports:
- Multi-building property management
- Automated monthly billing with utility calculations
- Incident reporting and technician assignment
- AI-powered Q&A for building regulations
- Real-time notifications via WebSocket

## Tech Stack

### Backend
- **Framework**: NestJS (TypeScript, Modular Architecture)
- **Database**: PostgreSQL 15+ with Prisma ORM
- **Cache/Queue**: Redis 7+ with BullMQ
- **Real-time**: Socket.IO WebSocket Gateway
- **AI**: LangChain.js with pgvector for RAG
- **Documentation**: Swagger/OpenAPI

### Frontend
- **Framework**: Next.js 15 (App Router, Server Components)
- **State**: TanStack Query (server) + Zustand (local)
- **Styling**: Tailwind CSS
- **Charts**: Recharts
- **Maps**: Custom SVG with D3.js

## Project Conventions

### Code Style
- TypeScript strict mode enabled
- ESLint + Prettier for formatting
- PascalCase for components, camelCase for functions/variables
- kebab-case for file names (except React components)

### Architecture Patterns
- **Backend**: Modular monolith with clear module boundaries
- **Frontend**: Feature-based folder structure
- **API**: RESTful with consistent response format `{ data, meta, errors }`
- **State**: Server state in TanStack Query, UI state in Zustand

### Testing Strategy
- Unit tests: Jest with >70% coverage for billing logic
- E2E tests: Critical flows (auth, billing, incidents)
- Frontend: Component tests with Testing Library

### Git Workflow
- Main branch: `main` (protected)
- Feature branches: `feature/[ticket-id]-description`
- Commit format: `type(scope): description` (conventional commits)

## Domain Context

### User Roles
| Role       | Description |
|------------|-------------|
| Admin      | Full system access, manages users and billing |
| Technician | Handles incident assignments, limited read access |
| Resident   | Views own apartment, submits incidents, pays invoices |

### Core Entities
- **Building**: Physical property with floors and SVG map
- **Apartment**: Individual unit with status (vacant/occupied/maintenance)
- **Contract**: Links resident to apartment with rent terms
- **Invoice**: Monthly billing with line items (rent + utilities)
- **Incident**: Resident-reported issue with status workflow

## Important Constraints

- Background jobs MUST use BullMQ (never block main thread)
- All sensitive operations MUST be audit logged
- Frontend MUST have skeleton loaders (CLS = 0)
- Billing logic MUST have >70% test coverage

## External Dependencies

- **OpenAI API**: LLM for RAG assistant
- **Redis**: Caching + BullMQ message broker
- **PostgreSQL**: Primary database with pgvector extension

## Planned Enterprise MVP Features

Based on [Technical Execution & AI Automation Roadmap](../docs/Technical-Execution&AI-Automation-Roadmap.md):

### Phase 1: Fiduciary & Security Core
- **Multi-Tenant Architecture**: Organization model, PostgreSQL Row-Level Security (RLS), X-Organization-ID header
- **Trust Accounting**: Financial accounts (operating/trust/maintenance), escrow ledger, co-mingling prevention
- **Enhanced RBAC**: Organization-scoped roles

### Phase 2: Compliance & Payments  
- **Regional Compliance Engine**: US escrow laws, Vietnamese 2% maintenance fund
- **Payment Gateway Integration**: Stripe, VNPay, MoMo, VietQR

### Phase 3: Communications
- **Notification Hub**: Multi-channel delivery, customizable templates

## Specialized Agents

Domain-specific agents are available in `agents/` for focused tasks:

| Agent | Purpose |
|-------|----------|
| `backend-architect` | API design, microservice boundaries, database schemas |
| `database-architect` | Data modeling, normalization, indexing, migrations |
| `frontend-developer` | Component architecture, state management, UI implementation |
| `code-reviewer` | Code quality, security review, performance analysis |

Reference agents in prompts: `@agents/backend-architect`, `@agents/database-architect`, etc.
