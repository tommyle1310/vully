# Vully - Apartment Management Platform

> Modern, scalable apartment management platform with real-time features, AI assistance, and comprehensive billing automation.

[![License](https://img.shields.io/badge/license-Private-red.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen.svg)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/typescript-5.0+-blue.svg)](https://www.typescriptlang.org/)

## 🌟 Features

### Core Modules
- **🏢 Apartment Management** - Buildings, units, contracts with interactive floor plans
- **💰 Billing System** - Automated invoice generation with tiered utility pricing
- **🔧 Incident Tracking** - Real-time incident management with WebSocket notifications
- **🤖 AI Assistant** - RAG-powered chatbot for building regulations and FAQs
- **📊 Dashboard** - Real-time analytics with occupancy rates and revenue tracking
- **👥 Multi-tenant RBAC** - Role-based access (Admin, Technician, Resident)

### Technical Highlights
- **Real-time Updates** - Socket.IO WebSocket gateway for instant notifications
- **Background Jobs** - BullMQ queue system for invoice generation
- **Vector Search** - pgvector integration for AI document retrieval
- **Type-Safe API** - Shared Zod schemas between frontend and backend
- **Health Monitoring** - @nestjs/terminus endpoints for production readiness
- **Performance** - TanStack Query caching, virtualized tables, lazy-loaded charts

## 🏗️ Tech Stack

### Backend
| Category | Technology |
|----------|-----------|
| Framework | NestJS (Modular Architecture) |
| Database | PostgreSQL 15+ with Prisma ORM |
| Cache/Queue | Redis 7+ with BullMQ |
| Real-time | Socket.IO WebSocket Gateway |
| AI | Google Gemini + pgvector (RAG) |
| Logging | Pino (structured JSON) |
| Validation | Zod + class-validator |
| Docs | Swagger/OpenAPI |
| Health | @nestjs/terminus |

### Frontend
| Category | Technology |
|----------|-----------|
| Framework | Next.js 15 (App Router) |
| UI Components | Shadcn/UI (Radix UI + Tailwind) |
| State Management | TanStack Query + Zustand + Nuqs |
| Forms | React-Hook-Form + Zod |
| Tables | TanStack Table (virtualized) |
| Animations | Framer Motion |
| Charts | Recharts |
| Maps | Custom SVG with D3.js |
| Styling | Tailwind CSS |

## 🚀 Quick Start

### Prerequisites
- **Node.js** 20+ ([Download](https://nodejs.org))
- **pnpm** 9+ (Install: `npm install -g pnpm`)
- **Docker** & Docker Compose ([Download](https://www.docker.com/get-started))
- **Git** ([Download](https://git-scm.com))

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/yourusername/vully.git
cd vully

# 2. Install dependencies
pnpm install

# 3. Start infrastructure (PostgreSQL, Redis)
docker-compose up -d

# 4. Configure environment variables
cp .env.example .env
# Edit .env and add your GEMINI_API_KEY (see ENVIRONMENT.md)

# 5. Setup database
pnpm db:generate  # Generate Prisma client
pnpm db:migrate   # Run migrations
pnpm db:seed      # (Optional) Seed with test data

# 6. Start development servers
pnpm dev
```

### Development URLs
- 🌐 **Frontend**: [http://localhost:3000](http://localhost:3000)
- 🔌 **API**: [http://localhost:3001](http://localhost:3001)
- 📚 **API Docs**: [http://localhost:3001/api/docs](http://localhost:3001/api/docs)
- 🗄️ **Prisma Studio**: `pnpm db:studio` → [http://localhost:5555](http://localhost:5555)

### Default Credentials
```
Email: admin@vully.com
Password: Admin@123
```
⚠️ **Change these immediately in production!**

## Project Structure

```
apps/
├── api/                    # NestJS Backend
│   └── src/
│       ├── modules/        # Feature modules
│       ├── common/         # Shared utilities
│       ├── providers/      # External services
│       ├── prisma/         # Database schema
│       └── config/         # Environment configs
└── web/                    # Next.js Frontend
    └── src/
        ├── app/            # App Router pages
        ├── components/     # UI components
        ├── hooks/          # Custom hooks
        ├── stores/         # Zustand stores
        └── lib/            # Utilities

packages/
└── shared-types/           # Shared Zod schemas
```

## Available Scripts

```bash
# Development
pnpm dev              # Start all apps in dev mode
pnpm build            # Build all apps
pnpm lint             # Lint all apps
pnpm test             # Run tests

# Database
pnpm db:generate      # Generate Prisma client
pnpm db:migrate       # Run migrations
pnpm db:push          # Push schema to DB
pnpm db:studio        # Open Prisma Studio
```

## 🔧 Configuration

### Environment Variables
See [ENVIRONMENT.md](./ENVIRONMENT.md) for detailed documentation.

Quick setup:
1. Copy `.env.example` to `.env`
2. Add `GEMINI_API_KEY` from [Google AI Studio](https://aistudio.google.com)
3. Generate JWT secrets: `openssl rand -base64 32`

### Database Extensions
- `uuid-ossp` - UUID generation
- `pgvector` - Vector similarity search

## 🏛️ Architecture

### Backend Patterns
```typescript
// Background Jobs
@Processor('billing')
export class BillingProcessor {
  @Process('generate-invoice')
  async handleGenerateInvoice(job: Job) { }
}

// WebSocket Events
this.socketGateway.server
  .to(`apartment:${id}`)
  .emit('incident:updated', payload);

// RBAC Guards
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
async updateIncident() { }
```

### Frontend State Management
- **Server State**: TanStack Query (API caching)
- **Global State**: Zustand (UI preferences)
- **URL State**: Nuqs (filters, pagination)

See [ARCHITECTURE.md](./ARCHITECTURE.md) for detailed diagrams.

## 🔐 Security & RBAC

| Role       | Apartments | Invoices | Incidents | Users | AI Quota |
|------------|------------|----------|-----------|-------|----------|
| Admin      | CRUD       | CRUD     | CRUD      | CRUD  | Unlimited|
| Technician | Read       | Read     | Update*   | -     | 20/day   |
| Resident   | Read*      | Read*    | Create*   | -     | 20/day   |

\* Scoped to own resources

## 🧪 Testing

```bash
pnpm test              # All unit tests
pnpm test:cov          # With coverage
pnpm test:e2e          # E2E tests
```

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

### In Progress 🚧
- [ ] Phase 7.1: Testing (improve coverage)
- [x] Phase 7.2: Documentation

### Future 🔮
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
