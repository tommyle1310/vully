# Vully - Apartment Management Platform

Modern apartment management platform built with NestJS and Next.js 15.

## Tech Stack

### Backend
- **Framework**: NestJS (Modular Architecture)
- **Database**: PostgreSQL 15+ with Prisma ORM
- **Cache/Queue**: Redis 7+ with BullMQ
- **Real-time**: Socket.IO WebSocket Gateway
- **Logging**: Pino (structured JSON logging)
- **Health Checks**: @nestjs/terminus

### Frontend
- **Framework**: Next.js 15 (App Router)
- **UI**: Shadcn/UI + Tailwind CSS
- **State**: TanStack Query + Zustand + Nuqs
- **Animations**: Framer Motion
- **Forms**: React-Hook-Form + Zod

## Getting Started

### Prerequisites
- Node.js 20+
- pnpm 9+
- Docker (for PostgreSQL and Redis)

### Installation

```bash
# Clone the repository
git clone <repo-url>
cd vully

# Install dependencies
pnpm install

# Start infrastructure
docker-compose up -d

# Setup environment
cp .env.example .env

# Generate Prisma client
pnpm db:generate

# Run database migrations
pnpm db:migrate

# Start development servers
pnpm dev
```

### Development URLs
- **API**: http://localhost:3001
- **API Docs**: http://localhost:3001/api/docs
- **Web**: http://localhost:3000

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

## Architecture

See `/openspec/changes/scaffold-apartment-platform/design.md` for detailed architecture documentation.

## License

Private - All rights reserved
