# Architecture - Vully Platform

Complete system architecture documentation for the Vully apartment management platform.

## 📐 System Overview

Vully is a modern, scalable apartment management platform built with a microservices-ready architecture using NestJS (backend) and Next.js (frontend).

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Frontend                             │
│              Next.js 15 (App Router)                        │
│                                                              │
│  ┌────────────┐  ┌────────────┐  ┌──────────────────┐     │
│  │  Server    │  │   Client   │  │   Static Assets   │     │
│  │ Components │  │ Components │  │   (CDN Ready)     │     │
│  └────────────┘  └────────────┘  └──────────────────┘     │
│         │              │                    │               │
│         └──────────────┴────────────────────┘               │
│                        │                                     │
└────────────────────────┼─────────────────────────────────────┘
                         │
                         │ REST API / WebSocket
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                         Backend                              │
│                  NestJS (Modular)                           │
│                                                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │Identity  │  │Apartments│  │ Billing  │  │Incidents │  │
│  │ Module   │  │  Module  │  │  Module  │  │  Module  │  │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘  │
│                                                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                 │
│  │   AI     │  │  Stats   │  │WebSocket │                 │
│  │Assistant │  │  Module  │  │ Gateway  │                 │
│  └──────────┘  └──────────┘  └──────────┘                 │
│         │              │              │                     │
└─────────┼──────────────┼──────────────┼─────────────────────┘
          │              │              │
          ▼              ▼              ▼
┌──────────────────────────────────────────────────────────┐
│                   Infrastructure Layer                    │
│                                                            │
│  ┌────────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐ │
│  │ PostgreSQL │  │  Redis  │  │ BullMQ  │  │  S3 /   │ │
│  │  +pgvector │  │  Cache  │  │  Queue  │  │  MinIO  │ │
│  └────────────┘  └─────────┘  └─────────┘  └─────────┘ │
│                                                            │
│  ┌────────────┐  ┌─────────┐                             │
│  │   Gemini   │  │  Pino   │                             │
│  │     AI     │  │ Logging │                             │
│  └────────────┘  └─────────┘                             │
└──────────────────────────────────────────────────────────┘
```

---

## 🏢 Backend Architecture

### Modular Design

NestJS modules are self-contained, loosely coupled units with clear boundaries.

```
apps/api/src/
├── modules/
│   ├── identity/           # Authentication & User Management
│   │   ├── identity.module.ts
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   ├── guards/
│   │   │   ├── jwt-auth.guard.ts
│   │   │   └── roles.guard.ts
│   │   └── dto/
│   │
│   ├── apartments/         # Buildings, Units, Contracts
│   │   ├── apartments.module.ts
│   │   ├── buildings.controller.ts
│   │   ├── apartments.controller.ts
│   │   ├── apartments.service.ts
│   │   └── dto/
│   │
│   ├── billing/            # Invoices, Meter Readings
│   │   ├── billing.module.ts
│   │   ├── invoices.controller.ts
│   │   ├── invoices.service.ts
│   │   ├── meter-readings.controller.ts
│   │   ├── meter-readings.service.ts
│   │   ├── billing.processor.ts  # BullMQ worker
│   │   └── dto/
│   │
│   ├── incidents/          # Incident Management
│   │   ├── incidents.module.ts
│   │   ├── incidents.controller.ts
│   │   ├── incidents.service.ts
│   │   ├── incidents.gateway.ts  # WebSocket
│   │   └── dto/
│   │
│   ├── ai-assistant/       # RAG-powered Chatbot
│   │   ├── ai-assistant.module.ts
│   │   ├── ai-assistant.controller.ts
│   │   ├── ai-assistant.service.ts
│   │   ├── document.service.ts
│   │   ├── embedding.service.ts
│   │   └── dto/
│   │
│   └── stats/              # Dashboard Analytics
│       ├── stats.module.ts
│       ├── stats.controller.ts
│       └── stats.service.ts
│
└── common/                 # Shared Infrastructure
    ├── decorators/         # @CurrentUser, @Roles, etc.
    ├── filters/            # HttpExceptionFilter
    ├── guards/             # RolesGuard
    ├── interceptors/       # LoggingInterceptor
    ├── middleware/         # CorrelationIdMiddleware
    └── prisma/             # PrismaService
```

### Request Lifecycle

```
┌─────────────┐
│   Client    │
└──────┬──────┘
       │
       │ 1. HTTP Request
       ▼
┌─────────────────────────────────────────┐
│      Middleware Layer                    │
│  ┌────────────────────────────────────┐ │
│  │ CorrelationIdMiddleware            │ │
│  │  • Generate unique request ID      │ │
│  │  • Add to Pino logger context      │ │
│  └────────────────────────────────────┘ │
└─────────────────┬───────────────────────┘
                  │
                  │ 2. Apply Middleware
                  ▼
┌─────────────────────────────────────────┐
│      Guard Layer                         │
│  ┌────────────────┐  ┌────────────────┐│
│  │ JwtAuthGuard   │  │  RolesGuard    ││
│  │ • Verify token │  │ • Check role   ││
│  │ • Extract user │  │ • Compare perms││
│  └────────────────┘  └────────────────┘│
└─────────────────┬───────────────────────┘
                  │
                  │ 3. Authentication & Authorization
                  ▼
┌─────────────────────────────────────────┐
│      Interceptor Layer (Pre)             │
│  ┌────────────────────────────────────┐ │
│  │ LoggingInterceptor                 │ │
│  │  • Log request start               │ │
│  │  • Start timer                     │ │
│  └────────────────────────────────────┘ │
└─────────────────┬───────────────────────┘
                  │
                  │ 4. Pre-processing
                  ▼
┌─────────────────────────────────────────┐
│      Validation Layer                    │
│  ┌────────────────────────────────────┐ │
│  │ ValidationPipe                     │ │
│  │  • Validate DTO with class-validator│ │
│  │  • Transform types                 │ │
│  │  • Sanitize input                  │ │
│  └────────────────────────────────────┘ │
└─────────────────┬───────────────────────┘
                  │
                  │ 5. Execute Validation
                  ▼
┌─────────────────────────────────────────┐
│      Route Handler                       │
│  ┌────────────────────────────────────┐ │
│  │ Controller Method                  │ │
│  │  • Extract params/body             │ │
│  │  • Call service methods            │ │
│  │  • Return response                 │ │
│  └────────────────────────────────────┘ │
│         │                                │
│         │ 6. Delegate to Service         │
│         ▼                                │
│  ┌────────────────────────────────────┐ │
│  │ Service Layer                      │ │
│  │  • Business logic                  │ │
│  │  • Database operations             │ │
│  │  • External service calls          │ │
│  └────────────────────────────────────┘ │
└─────────────────┬───────────────────────┘
                  │
                  │ 7. Return Data
                  ▼
┌─────────────────────────────────────────┐
│      Interceptor Layer (Post)            │
│  ┌────────────────────────────────────┐ │
│  │ LoggingInterceptor                 │ │
│  │  • Calculate duration              │ │
│  │  • Log response                    │ │
│  │  • Transform response format       │ │
│  └────────────────────────────────────┘ │
└─────────────────┬───────────────────────┘
                  │
                  │ 8. Post-processing
                  ▼
┌─────────────────────────────────────────┐
│      Exception Filter (if error)         │
│  ┌────────────────────────────────────┐ │
│  │ HttpExceptionFilter                │ │
│  │  • Catch exceptions                │ │
│  │  • Standardize error format        │ │
│  │  • Log errors                      │ │
│  └────────────────────────────────────┘ │
└─────────────────┬───────────────────────┘
                  │
                  │ 9. HTTP Response
                  ▼
             ┌─────────┐
             │ Client  │
             └─────────┘
```

---

## 🗄️ Database Architecture

### Schema Design (PostgreSQL)

```
┌────────────┐      ┌────────────┐      ┌────────────┐
│   users    │      │ buildings  │      │ apartments │
│────────────│      │────────────│      │────────────│
│ id (PK)    │      │ id (PK)    │◄─────│ id (PK)    │
│ email      │      │ name       │      │ buildingId │
│ password   │      │ address    │      │ unitNumber │
│ role       │      │ totalFloors│      │ floorNumber│
│ firstName  │      │            │      │ bedrooms   │
│ lastName   │      │            │      │ area       │
│ isActive   │      │            │      │ status     │
└────────────┘      └────────────┘      └────────────┘
       │                                       │
       │                                       │
       │            ┌────────────┐             │
       └───────────►│ contracts  │◄────────────┘
                    │────────────│
                    │ id (PK)    │
                    │ apartmentId│
                    │ tenantId   │
                    │ status     │
                    │ startDate  │
                    │ endDate    │
                    │ rentAmount │
                    └────────────┘
                           │
                           │
              ┌────────────┴────────────┐
              │                         │
              ▼                         ▼
       ┌────────────┐           ┌─────────────┐
       │  invoices  │           │meter_readings│
       │────────────│           │─────────────│
       │ id (PK)    │           │ id (PK)     │
       │ contractId │           │ apartmentId │
       │ billingPeriod│         │ type        │
       │ status     │           │ value       │
       │ totalAmount│           │ readingDate │
       │ dueDate    │           │             │
       └────────────┘           └─────────────┘
              │
              │
              ▼
       ┌────────────┐
       │ line_items │
       │────────────│
       │ id (PK)    │
       │ invoiceId  │
       │ description│
       │ quantity   │
       │ unitPrice  │
       │ amount     │
       └────────────┘


       ┌────────────┐             ┌────────────┐
       │ incidents  │             │ documents  │
       │────────────│             │────────────│
       │ id (PK)    │             │ id (PK)    │
       │ apartmentId│             │ title      │
       │ reportedBy │             │ content    │
       │ assignedTo │             │ category   │
       │ category   │             │ isActive   │
       │ priority   │             └────────────┘
       │ status     │                    │
       │ title      │                    │
       └────────────┘                    ▼
                                  ┌──────────────┐
                                  │document_chunks│
                                  │──────────────│
                                  │ id (PK)      │
                                  │ documentId   │
                                  │ content      │
                                  │ embedding    │
                                  │ (vector 768) │
                                  └──────────────┘
```

### Indexing Strategy

```sql
-- Performance indices
CREATE INDEX idx_apartments_building ON apartments(building_id);
CREATE INDEX idx_apartments_status ON apartments(status);

CREATE INDEX idx_contracts_status ON contracts(status);
CREATE INDEX idx_contracts_tenant ON contracts(tenant_id);
CREATE INDEX idx_contracts_dates ON contracts(start_date, end_date);

CREATE INDEX idx_invoices_contract ON invoices(contract_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_period ON invoices(billing_period);
CREATE INDEX idx_invoices_due_date ON invoices(due_date);

CREATE INDEX idx_incidents_apartment ON incidents(apartment_id);
CREATE INDEX idx_incidents_assigned ON incidents(assigned_to);
CREATE INDEX idx_incidents_status ON incidents(status);
CREATE INDEX idx_incidents_created ON incidents(created_at DESC);

-- Full-text search (PostgreSQL)
CREATE INDEX idx_documents_title ON documents USING GIN(to_tsvector('english', title));

-- Vector search (pgvector)
CREATE INDEX idx_document_chunks_embedding ON document_chunks 
  USING ivfflat (embedding vector_cosine_ops);
```

### Migration Strategy

```bash
# Development
pnpm db:migrate          # Create and apply migration
pnpm db:generate         # Regenerate Prisma client

# Production
pnpm db:migrate deploy   # Apply pending migrations only
```

---

## 🔄 Background Jobs (BullMQ)

### Queue Architecture

```
┌──────────────────────────────────────────────────────┐
│                    BullMQ Queues                      │
│                                                       │
│  ┌─────────────────────────────────────────────┐    │
│  │           Billing Queue                      │    │
│  │  ┌────────────────────────────────────┐     │    │
│  │  │  generate-monthly-invoices         │     │    │
│  │  │  • Process all active contracts    │     │    │
│  │  │  • Calculate utilities from meters │     │    │
│  │  │  • Create line items               │     │    │
│  │  │  • Send notifications              │     │    │
│  │  │                                    │     │    │
│  │  │  Retry: 3 attempts                 │     │    │
│  │  │  Backoff: Exponential (1m, 2m, 4m) │     │    │
│  │  └────────────────────────────────────┘     │    │
│  └─────────────────────────────────────────────┘    │
│                                                       │
│  ┌─────────────────────────────────────────────┐    │
│  │        Notifications Queue (Future)          │    │
│  │  ┌────────────────────────────────────┐     │    │
│  │  │  send-email                        │     │    │
│  │  │  send-sms                          │     │    │
│  │  └────────────────────────────────────┘     │    │
│  └─────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────┘
                          │
                          │ Redis Connection
                          ▼
                   ┌─────────────┐
                   │    Redis    │
                   │  Queue Data │
                   └─────────────┘
```

### Job Processing Flow

```
┌─────────────┐
│   Client    │
│  (Admin)    │
└──────┬──────┘
       │
       │ 1. POST /billing/invoices/generate
       ▼
┌────────────────────────────────────┐
│   InvoicesController               │
│  • Validate request                │
│  • Add job to queue                │
│  • Return job ID immediately       │
└────────┬───────────────────────────┘
         │
         │ 2. Queue job with data
         ▼
┌────────────────────────────────────┐
│   BullMQ (Redis)                   │
│  • Store job data                  │
│  • Assign to worker                │
└────────┬───────────────────────────┘
         │
         │ 3. Process when worker available
         ▼
┌────────────────────────────────────┐
│   BillingProcessor                 │
│  @Process('generate-invoice')      │
│                                    │
│  async handleGenerateInvoice() {   │
│    1. Fetch all active contracts   │
│    2. For each contract:           │
│       • Get meter readings         │
│       • Calculate utilities        │
│       • Create invoice + items     │
│       • Update progress            │
│    3. Return summary               │
│  }                                 │
└────────┬───────────────────────────┘
         │
         │ 4. On completion
         ▼
┌────────────────────────────────────┐
│   Notification Service             │
│  • Emit WebSocket event            │
│  • Send email (if configured)      │
└────────────────────────────────────┘
```

### Error Handling

```typescript
// Retry configuration
@Process('generate-invoice')
async handleGenerateInvoice(job: Job<GenerateInvoiceDto>) {
  try {
    // Process job
    await this.processInvoices(job.data);
    return { success: true };
  } catch (error) {
    // Log error with context
    this.logger.error('Invoice generation failed', {
      jobId: job.id,
      error: error.message,
      stack: error.stack,
    });

    // Rethrow to trigger retry
    throw error;
  }
}

// BullMQ will automatically retry with exponential backoff
// After 3 failed attempts, job moves to failed queue
```

---

## 🔌 WebSocket Architecture

### Room-Based Broadcasting

```
┌────────────────────────────────────────────────────────┐
│               WebSocket Gateway                         │
│                                                         │
│  ┌──────────────────────────────────────────────┐     │
│  │            Room Structure                     │     │
│  │                                               │     │
│  │  admin                                        │     │
│  │  ├─ All admin users                          │     │
│  │  │                                            │     │
│  │  technician                                   │     │
│  │  ├─ All technician users                     │     │
│  │  │                                            │     │
│  │  building:{buildingId}                        │     │
│  │  ├─ All users in building                    │     │
│  │  │                                            │     │
│  │  apartment:{apartmentId}                      │     │
│  │  ├─ Residents of specific apartment          │     │
│  │  │                                            │     │
│  │  user:{userId}                                │     │
│  │  └─ Individual user (direct message)         │     │
│  └──────────────────────────────────────────────┘     │
└────────────────────────────────────────────────────────┘
```

### Event Flow

```
┌─────────────┐
│ Admin creates│
│ incident     │
└──────┬───────┘
       │
       │ 1. POST /incidents
       ▼
┌──────────────────────────────────────┐
│   IncidentsController                │
│  • Create incident in DB             │
│  • Call gateway.notifyIncidentCreated│
└──────┬───────────────────────────────┘
       │
       │ 2. Emit to rooms
       ▼
┌──────────────────────────────────────┐
│   IncidentsGateway                   │
│                                      │
│  notifyIncidentCreated(payload) {    │
│    this.server                       │
│      .to(`building:${buildingId}`)   │
│      .emit('incident:created', data);│
│                                      │
│    this.server                       │
│      .to('admin')                    │
│      .emit('incident:created', data);│
│  }                                   │
└──────┬───────────────────────────────┘
       │
       │ 3. Broadcast to subscribed clients
       ▼
  ┌──────────┐  ┌──────────┐  ┌──────────┐
  │ Client 1 │  │ Client 2 │  │ Client 3 │
  │ (Admin)  │  │(Resident)│  │(Resident)│
  └──────────┘  └──────────┘  └──────────┘
       │              │              │
       │              │              │
       └──────────────┴──────────────┘
                      │
                      │ 4. Update UI
                      ▼
               ┌─────────────┐
               │  React UI   │
               │  Updates    │
               └─────────────┘
```

### Connection Lifecycle

```typescript
// Server-side (NestJS)
@WebSocketGateway({
  cors: { origin: process.env.FRONTEND_URL },
})
export class IncidentsGateway {
  @WebSocketServer()
  server: Server;

  // Handle connection
  handleConnection(client: Socket) {
    const user = this.extractUser(client);
    
    // Auto-join role room
    if (user.role === 'admin') {
      client.join('admin');
    } else if (user.role ==='technician') {
      client.join('technician');
    }
    
    // Auto-join user room
    client.join(`user:${user.id}`);
    
    this.logger.log(`Client connected: ${user.id}`);
  }

  // Handle join room
  @SubscribeMessage('join-room')
  handleJoinRoom(client: Socket, room: string) {
    // Validate room permission
    if (this.canJoinRoom(client, room)) {
      client.join(room);
    }
  }
}
```

```typescript
// Client-side (React)
import { io } from 'socket.io-client';

const socket = io('http://localhost:3001', {
  auth: { token: localStorage.getItem('accessToken') }
});

socket.on('connect', () => {
  // Join apartment room
  socket.emit('join-room', `apartment:${apartmentId}`);
});

socket.on('incident:updated', (data) => {
  // Update UI with TanStack Query
  queryClient.invalidateQueries(['incidents', data.incidentId]);
  
  // Show toast notification
  toast.success(`Incident ${data.incidentNumber} updated`);
});
```

---

## 🤖 AI Assistant Architecture (RAG)

### RAG Pipeline

```
┌─────────────┐
│    User     │
│   Query     │
└──────┬──────┘
       │
       │ 1. "What are the pet rules?"
       ▼
┌────────────────────────────────────────┐
│   EmbeddingService                     │
│  • Generate query embedding (768-dim)  │
│  • Using Gemini text-embedding-004     │
└────────┬───────────────────────────────┘
         │
         │ 2. Query vector: [0.12, -0.34, ...]
         ▼
┌────────────────────────────────────────┐
│   DocumentService                      │
│  • Vector similarity search (pgvector) │
│  • SELECT ... ORDER BY embedding       │
│    <=> query_vector LIMIT 5            │
└────────┬───────────────────────────────┘
         │
         │ 3. Relevant chunks (top 5)
         ▼
┌────────────────────────────────────────┐
│   AiAssistantService                   │
│  • Build context from chunks           │
│  • Add user context (apartment, etc.)  │
│  • Construct prompt                    │
└────────┬───────────────────────────────┘
         │
         │ 4. Prompt + Context
         ▼
┌────────────────────────────────────────┐
│   Google Gemini API                    │
│  • Model: gemini-2.0-flash             │
│  • Generate response                   │
└────────┬───────────────────────────────┘
         │
         │ 5. AI Response
         ▼
┌────────────────────────────────────────┐
│   Response + Source Attribution        │
│  {                                     │
│    response: "According to section...",│
│    sources: [                          │
│      { title: "Pet Policy",            │
│        relevance: 0.94 }               │
│    ]                                   │
│  }                                     │
└────────┬───────────────────────────────┘
         │
         │ 6. Return to user
         ▼
    ┌─────────┐
    │  User   │
    └─────────┘
```

### Document Ingestion

```
┌─────────────┐
│   Admin     │
│  Uploads    │
│  Document   │
└──────┬──────┘
       │
       │ 1. Full document text
       ▼
┌────────────────────────────────────────┐
│   DocumentService                      │
│  • Split into chunks (1000 chars each)│
│  • 200 char overlap between chunks     │
└────────┬───────────────────────────────┘
         │
         │ 2. Chunks: ["Section 1...", "Section 2...", ...]
         ▼
┌────────────────────────────────────────┐
│   EmbeddingService                     │
│  • Generate embedding for each chunk   │
│  • Batch size: 5 chunks (rate limit)   │
└────────┬───────────────────────────────┘
         │
         │ 3. Store in database
         ▼
┌────────────────────────────────────────┐
│   PostgreSQL (pgvector)                │
│                                        │
│  document_chunks                       │
│  ├─ content (text)                     │
│  ├─ embedding (vector 768)             │
│  └─ documentId (FK)                    │
└────────────────────────────────────────┘
```

### Vector Similarity Search

```sql
-- Cosine similarity search
SELECT
  dc.id,
  dc.content,
  d.title,
  d.category,
  1 - (dc.embedding <=> $1::vector) AS similarity
FROM document_chunks dc
JOIN documents d ON d.id = dc.document_id
WHERE d.is_active = true
ORDER BY dc.embedding <=> $1::vector
LIMIT 5;
```

**Explanation:**
- `<=>` is pgvector's cosine distance operator
- `1 - distance` converts distance to similarity score
- Lower distance = higher similarity

---

## 🌐 Frontend Architecture

### App Router Structure

```
apps/web/src/app/
├── layout.tsx               # Root layout (providers)
├── page.tsx                 # Landing page (public)
│
├── (auth)/                  # Auth route group (no sidebar)
│   ├── layout.tsx           # Auth layout
│   ├── login/
│   │   └── page.tsx
│   └── register/
│       └── page.tsx
│
└── (dashboard)/             # Dashboard route group (with sidebar)
    ├── layout.tsx           # Dashboard layout + nav
    ├── dashboard/
    │   └── page.tsx         # Overview dashboard
    ├── apartments/
    │   ├── page.tsx         # List view
    │   └── [id]/
    │       └── page.tsx     # Detail view
    ├── billing/
    │   ├── page.tsx
    │   └── [id]/
    │       └── page.tsx
    └── incidents/
        ├── page.tsx
        └── [id]/
            └── page.tsx
```

### State Management Strategy

```
┌──────────────────────────────────────────────────────┐
│              State Management Layers                  │
│                                                       │
│  ┌─────────────────────────────────────────────┐    │
│  │  Server State (TanStack Query)              │    │
│  │  • API responses cached                    │    │
│  │  • Automatic refetch on stale              │    │
│  │  • Optimistic updates                      │    │
│  │  • Background sync                         │    │
│  └─────────────────────────────────────────────┘    │
│                                                       │
│  ┌─────────────────────────────────────────────┐    │
│  │  Global State (Zustand)                     │    │
│  │  • User preferences                         │    │
│  │  • UI state (sidebar open)                  │    │
│  │  • Map interactions                         │    │
│  └─────────────────────────────────────────────┘    │
│                                                       │
│  ┌─────────────────────────────────────────────┐    │
│  │  URL State (Nuqs)                           │    │
│  │  • Filters                                  │    │
│  │  • Pagination                               │    │
│  │  • Search query                             │    │
│  │  • Tabs                                     │    │
│  └─────────────────────────────────────────────┘    │
│                                                       │
│  ┌─────────────────────────────────────────────┐    │
│  │  Local State (useState)                     │    │
│  │  • Form inputs                              │    │
│  │  • Modal open/close                         │    │
│  │  • Component-specific                       │    │
│  └─────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────┘
```

### Data Flow

```
┌──────────────┐
│  Component   │
└───────┬──────┘
        │
        │ 1. Call hook
        ▼
 ┌────────────────┐
 │ useInvoices()  │
 └───────┬────────┘
         │
         │ 2. Check cache
         ▼
 ┌───────────────────┐
 │ TanStack Query    │
 │  • Cache hit?     │
 │    → Return data  │
 │  • Cache miss?    │
 │    → Fetch API    │
 └───────┬───────────┘
         │
         │ 3. API call (if needed)
         ▼
 ┌───────────────────┐
 │  API Client       │
 │  (axios)          │
 │  + Auth header    │
 └───────┬───────────┘
         │
         │ 4. HTTP Request
         ▼
 ┌───────────────────┐
 │  NestJS API       │
 └───────┬───────────┘
         │
         │ 5. Response
         ▼
 ┌───────────────────┐
 │ TanStack Query    │
 │  • Cache data     │
 │  • Return to hook │
 └───────┬───────────┘
         │
         │ 6. Update component
         ▼
 ┌──────────────┐
 │  Component   │
 │  renders     │
 └──────────────┘
```

---

## 🔐 Security Architecture

### Defense in Depth

```
┌─────────────────────────────────────────────────────┐
│  Layer 1: Network Security                          │
│  • Firewall rules                                   │
│  • DDoS protection                                  │
│  • HTTPS only                                       │
└─────────────────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────┐
│  Layer 2: Application Security                      │
│  • CORS configuration                               │
│  • Rate limiting (express-rate-limit)               │
│  • Helmet.js headers                                │
└─────────────────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────┐
│  Layer 3: Authentication                            │
│  • JWT tokens (short-lived)                         │
│  • Refresh token rotation                           │
│  • Secure httpOnly cookies                          │
└─────────────────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────┐
│  Layer 4: Authorization (RBAC)                      │
│  • Role-based guards                                │
│  • Resource ownership checks                        │
│  • Field-level permissions                          │
└─────────────────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────┐
│  Layer 5: Input Validation                          │
│  • DTO validation (class-validator)                 │
│  • SQL injection prevention (Prisma ORM)            │
│  • XSS prevention (sanitization)                    │
└─────────────────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────┐
│  Layer 6: Data Security                             │
│  • Password hashing (bcrypt)                        │
│  • Secrets in environment variables                 │
│  • Encrypted database connections                   │
└─────────────────────────────────────────────────────┘
```

### RBAC Implementation

```typescript
// Guard decorator usage
@Get('/admin/users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
async getAllUsers() {
  return this.userService.findAll();
}

// Service-level authorization
async updateIncident(id: string, userId: string, role: string, dto: UpdateIncidentDto) {
  const incident = await this.prisma.incident.findUnique({ where: { id } });
  
  // Admin: can update any incident
  if (role === 'admin') {
    return this.performUpdate(id, dto);
  }
  
  // Technician: can update assigned incidents
  if (role === 'technician' && incident.assignedTo === userId) {
    return this.performUpdate(id, dto);
  }
  
  // Resident: cannot update incidents
  throw new ForbiddenException('You do not have permission to update this incident');
}
```

---

## 📊 Performance Optimization

### Backend Optimizations

1. **Database Query Optimization**
   - Index frequently queried columns
   - Use `select` to fetch only needed fields
   - Implement cursor-based pagination for large datasets

2. **Caching Strategy**
   ```typescript
   // Redis cache for dashboard stats (5 min TTL)
   async getDashboardStats(buildingId?: string): Promise<DashboardStats> {
     const cacheKey = `dashboard:stats:${buildingId || 'all'}`;
     
     const cached = await this.redis.get(cacheKey);
     if (cached) {
       return JSON.parse(cached);
     }
     
     const stats = await this.calculateStats(buildingId);
     await this.redis.setex(cacheKey, 300, JSON.stringify(stats));
     
     return stats;
   }
   ```

3. **Background Jobs**
   - Move heavy operations to BullMQ queues
   - Prevent blocking main thread

### Frontend Optimizations

1. **Code Splitting**
   ```typescript
   // Dynamic imports for heavy components
   const Chart = dynamic(() => import('@/components/charts/revenue-chart'), {
     loading: () => <ChartSkeleton />,
     ssr: false,
   });
   ```

2. **Virtualization**
   ```typescript
   // TanStack Table with virtualization
   import { useVirtualizer } from '@tanstack/react-virtual';
   
   const rowVirtualizer = useVirtualizer({
     count: data.length,
     getScrollElement: () => tableContainerRef.current,
     estimateSize: () => 50,
   });
   ```

3. **Image Optimization**
   ```tsx
   import Image from 'next/image';
   
   <Image
     src="/building-a.jpg"
     alt="Building A"
     width={800}
     height={600}
     placeholder="blur"
     quality={85}
   />
   ```

---

## 📚 Related Documentation

- [README.md](./README.md) - Setup guide
- [ENVIRONMENT.md](./ENVIRONMENT.md) - Environment variables
- [API_GUIDE.md](./API_GUIDE.md) - API documentation

---

**Last Updated:** Phase 7.2 - April 2026  
**Version:** 1.0.0  
**Maintainer:** Vully Development Team
