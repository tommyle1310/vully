# Vully Project Structure

## Monorepo Layout

```
vully/
├── .github/
│   ├── copilot-instructions.md    # Copilot AI guidelines
│   ├── SYSTEM_PROMPT.md           # Session prompts
│   └── workflows/                 # CI/CD pipelines
│
├── apps/
│   ├── api/                       # NestJS Backend
│   │   ├── src/
│   │   │   ├── main.ts
│   │   │   ├── app.module.ts
│   │   │   │
│   │   │   ├── modules/           # Feature modules
│   │   │   │   ├── identity/      # Auth, RBAC, users
│   │   │   │   │   ├── identity.module.ts
│   │   │   │   │   ├── identity.controller.ts
│   │   │   │   │   ├── identity.service.ts
│   │   │   │   │   ├── dto/
│   │   │   │   │   │   ├── login.dto.ts
│   │   │   │   │   │   ├── register.dto.ts
│   │   │   │   │   │   └── user-response.dto.ts
│   │   │   │   │   ├── entities/
│   │   │   │   │   │   └── user.entity.ts
│   │   │   │   │   ├── guards/
│   │   │   │   │   │   ├── jwt-auth.guard.ts
│   │   │   │   │   │   └── roles.guard.ts
│   │   │   │   │   └── decorators/
│   │   │   │   │       ├── current-user.decorator.ts
│   │   │   │   │       └── roles.decorator.ts
│   │   │   │   │
│   │   │   │   ├── apartments/    # Buildings, units, contracts
│   │   │   │   │   ├── apartments.module.ts
│   │   │   │   │   ├── apartments.controller.ts
│   │   │   │   │   ├── apartments.service.ts
│   │   │   │   │   ├── dto/
│   │   │   │   │   └── entities/
│   │   │   │   │
│   │   │   │   ├── billing/       # Invoices, meter readings
│   │   │   │   │   ├── billing.module.ts
│   │   │   │   │   ├── billing.controller.ts
│   │   │   │   │   ├── billing.service.ts
│   │   │   │   │   ├── billing.processor.ts  # BullMQ worker
│   │   │   │   │   ├── dto/
│   │   │   │   │   └── entities/
│   │   │   │   │
│   │   │   │   ├── incidents/     # Issue reporting
│   │   │   │   │   ├── incidents.module.ts
│   │   │   │   │   ├── incidents.controller.ts
│   │   │   │   │   ├── incidents.service.ts
│   │   │   │   │   ├── dto/
│   │   │   │   │   └── entities/
│   │   │   │   │
│   │   │   │   ├── notifications/ # WebSocket gateway
│   │   │   │   │   ├── notifications.module.ts
│   │   │   │   │   ├── notifications.gateway.ts
│   │   │   │   │   └── dto/
│   │   │   │   │
│   │   │   │   └── ai/            # RAG assistant
│   │   │   │       ├── ai.module.ts
│   │   │   │       ├── ai.controller.ts
│   │   │   │       ├── ai.service.ts
│   │   │   │       └── dto/
│   │   │   │
│   │   │   ├── common/            # Shared utilities
│   │   │   │   ├── filters/
│   │   │   │   │   └── http-exception.filter.ts
│   │   │   │   ├── interceptors/
│   │   │   │   │   ├── logging.interceptor.ts
│   │   │   │   │   └── transform.interceptor.ts
│   │   │   │   ├── decorators/
│   │   │   │   ├── pipes/
│   │   │   │   └── utils/
│   │   │   │
│   │   │   ├── providers/         # External service clients
│   │   │   │   ├── redis/
│   │   │   │   │   └── redis.module.ts
│   │   │   │   ├── bullmq/
│   │   │   │   │   └── bullmq.module.ts
│   │   │   │   └── openai/
│   │   │   │       └── openai.module.ts
│   │   │   │
│   │   │   ├── database/          # Prisma ORM
│   │   │   │   ├── prisma.module.ts
│   │   │   │   ├── prisma.service.ts
│   │   │   │   └── migrations/
│   │   │   │
│   │   │   └── config/            # Environment config
│   │   │       ├── app.config.ts
│   │   │       ├── database.config.ts
│   │   │       ├── redis.config.ts
│   │   │       └── jwt.config.ts
│   │   │
│   │   ├── prisma/
│   │   │   └── schema.prisma
│   │   ├── test/
│   │   │   ├── unit/
│   │   │   └── e2e/
│   │   ├── Dockerfile
│   │   ├── nest-cli.json
│   │   ├── tsconfig.json
│   │   └── package.json
│   │
│   └── web/                       # Next.js Frontend
│       ├── src/
│       │   ├── app/               # App Router pages
│       │   │   ├── layout.tsx
│       │   │   ├── page.tsx
│       │   │   ├── (auth)/
│       │   │   │   ├── login/
│       │   │   │   └── register/
│       │   │   ├── (dashboard)/
│       │   │   │   ├── layout.tsx
│       │   │   │   ├── page.tsx           # Dashboard home
│       │   │   │   ├── apartments/
│       │   │   │   ├── billing/
│       │   │   │   ├── incidents/
│       │   │   │   └── settings/
│       │   │   └── api/                   # API routes (if needed)
│       │   │
│       │   ├── components/        # UI components
│       │   │   ├── ui/            # Base components (buttons, inputs)
│       │   │   ├── layout/        # Navigation, sidebar, header
│       │   │   ├── dashboard/     # Dashboard widgets
│       │   │   │   ├── OccupancyChart.tsx
│       │   │   │   ├── RevenueChart.tsx
│       │   │   │   └── IncidentsSummary.tsx
│       │   │   ├── apartments/
│       │   │   │   ├── ApartmentCard.tsx
│       │   │   │   └── FloorPlanMap.tsx
│       │   │   ├── billing/
│       │   │   │   └── InvoiceCard.tsx
│       │   │   ├── incidents/
│       │   │   │   └── IncidentTimeline.tsx
│       │   │   └── skeletons/     # Loading skeletons
│       │   │       ├── CardSkeleton.tsx
│       │   │       ├── TableSkeleton.tsx
│       │   │       └── ChartSkeleton.tsx
│       │   │
│       │   ├── hooks/             # Custom hooks
│       │   │   ├── useAuth.ts
│       │   │   ├── useApartments.ts
│       │   │   ├── useInvoices.ts
│       │   │   ├── useIncidents.ts
│       │   │   └── useWebSocket.ts
│       │   │
│       │   ├── stores/            # Zustand stores
│       │   │   ├── authStore.ts
│       │   │   ├── mapStore.ts    # SVG map state
│       │   │   └── notificationStore.ts
│       │   │
│       │   ├── lib/               # Utilities
│       │   │   ├── api/           # API client
│       │   │   │   ├── client.ts
│       │   │   │   ├── apartments.ts
│       │   │   │   ├── billing.ts
│       │   │   │   └── incidents.ts
│       │   │   ├── utils/
│       │   │   └── constants.ts
│       │   │
│       │   └── types/             # TypeScript types
│       │       ├── api.ts
│       │       ├── apartment.ts
│       │       ├── invoice.ts
│       │       └── incident.ts
│       │
│       ├── public/
│       ├── Dockerfile
│       ├── next.config.js
│       ├── tailwind.config.js
│       ├── tsconfig.json
│       └── package.json
│
├── packages/                      # Shared packages
│   ├── shared-types/              # Cross-app TypeScript types (CRITICAL)
│   │   ├── src/
│   │   │   ├── index.ts           # Barrel export
│   │   │   ├── api/               # API request/response types
│   │   │   │   ├── auth.ts        # LoginRequest, TokenResponse
│   │   │   │   ├── apartments.ts  # ApartmentDto, BuildingDto
│   │   │   │   ├── billing.ts     # InvoiceDto, MeterReadingDto
│   │   │   │   └── incidents.ts   # IncidentDto, CommentDto
│   │   │   ├── entities/          # Domain entities (shared)
│   │   │   │   ├── user.ts
│   │   │   │   ├── apartment.ts
│   │   │   │   ├── invoice.ts
│   │   │   │   └── incident.ts
│   │   │   ├── enums/             # Shared enums (sync with Prisma)
│   │   │   │   ├── user-role.ts
│   │   │   │   ├── invoice-status.ts
│   │   │   │   └── incident-status.ts
│   │   │   └── events/            # WebSocket event payloads
│   │   │       ├── incident-events.ts
│   │   │       └── notification-events.ts
│   │   ├── tsconfig.json
│   │   └── package.json
│   │   # Usage: import { InvoiceDto } from '@vully/shared-types'
│   │   # Benefit: Backend field change → Frontend compile error
│   │
│   └── eslint-config/             # Shared ESLint config
│       └── index.js
│
├── openspec/                      # Specifications
│   ├── project.md
│   ├── specs/
│   └── changes/
│
├── docker-compose.yml             # Local development
├── docker-compose.prod.yml        # Production
├── pnpm-workspace.yaml            # Monorepo config
├── turbo.json                     # Turborepo config (optional)
├── package.json
├── .env.example
├── .gitignore
└── README.md
```

## Module Template

When creating a new NestJS module, follow this structure:

```
modules/[module-name]/
├── [module-name].module.ts        # Module definition
├── [module-name].controller.ts    # HTTP endpoints
├── [module-name].service.ts       # Business logic
├── [module-name].processor.ts     # BullMQ worker (if needed)
├── dto/
│   ├── create-[entity].dto.ts
│   ├── update-[entity].dto.ts
│   └── [entity]-response.dto.ts
├── entities/
│   └── [entity].entity.ts
├── guards/                        # Module-specific guards
├── decorators/                    # Module-specific decorators
└── __tests__/
    ├── [module-name].service.spec.ts
    └── [module-name].controller.spec.ts
```

## Frontend Page Template

When creating a new Next.js page:

```
app/(dashboard)/[feature]/
├── page.tsx                       # Server Component (data fetching)
├── loading.tsx                    # Skeleton loader
├── error.tsx                      # Error boundary
├── layout.tsx                     # Feature layout (if needed)
└── _components/                   # Page-specific client components
    ├── [Feature]List.tsx
    └── [Feature]Card.tsx
```
