# Change: Scaffold Apartment Management Platform

## Why

Build a full-stack apartment management platform (Vully) that enables property administrators to manage tenants, billing, incidents, and real-time communications. The architecture must support future microservices extraction while starting as a modular monolith.

## What Changes

### Backend (NestJS)
- **NEW** Identity Module: RBAC with Admin, Technician, Resident roles
- **NEW** Billing & Worker Module: BullMQ + Redis for background invoice processing
- **NEW** Apartments Module: Unit/floor management with PostgreSQL persistence
- **NEW** Incidents Module: Resident-submitted issues with status tracking
- **NEW** Real-time Gateway: WebSocket notifications via Socket.IO
- **NEW** AI Engine Wrapper: RAG-based Q&A for apartment regulations
- **NEW** Infrastructure: Global exception filter, logging interceptors, Docker setup

### Frontend (Next.js 15)
- **NEW** Dashboard System: Dynamic import widgets with skeleton loaders
- **NEW** SVG Map Engine: Interactive floor plans with Zustand state
- **NEW** Billing UI: Invoice management with TanStack Query caching
- **NEW** Incident UI: Virtual list for long logs, image uploads via next/image
- **NEW** Real-time Layer: WebSocket integration for live notifications

### Database
- **NEW** PostgreSQL schema: Users, Apartments, Contracts, Invoices, Incidents
- **NEW** Redis: Caching layer + BullMQ message broker

## Impact

- Affected specs: All new (identity, billing, apartments, incidents, notifications, ai-assistant, dashboard, svg-maps)
- Affected code: Full greenfield implementation
- Definition of Done:
  - Backend: Swagger docs, >70% unit test coverage for billing logic, audit logging
  - Frontend: Lighthouse >90, CLS=0, mobile + desktop responsive

## Non-Goals (Out of Scope)

- Payment gateway integration (future phase)
- Multi-property/tenant federation
- Native mobile app (web-responsive only)
- Email/SMS notification providers (stub interfaces only)

## Resolved Decisions

### Q1: Modular Monolith vs. Microservices?
**Decision: Modular Monolith (NestJS)**
- Faster development velocity for small team
- NestJS modules allow future extraction without rewriting
- Pragmatic "monolith-first" approach

### Q2: pgvector vs. Pinecone for AI?
**Decision: pgvector**
- Already using PostgreSQL, no additional infrastructure
- Simplifies backups, transactions, and costs
- Sufficient until millions of documents

### Q3: BullMQ vs. Direct Processing?
**Decision: BullMQ**
- Bulk invoice generation (100+ emails, PDFs) would timeout API
- Resilient retry logic with dead letter queue
- Makes system feel "premium" and production-ready

### Q4: Socket.IO vs. Raw WebSockets?
**Decision: Socket.IO**
- Bundle size difference negligible
- Saves significant time on reconnection, rooms, fallbacks
- Built-in room management for building/apartment/user channels

### Q5: Prisma vs. TypeORM?
**Decision: Prisma**
- Superior DX for rapid iteration
- Type-safe queries with autocomplete
- Use `prisma.$queryRaw` for complex queries when needed

## Risk Mitigations (From Review)

### Billing Tier Regulatory Changes
- **Risk**: Utility prices (điện/nước) change frequently
- **Fix**: Price versioning with `effective_from/to` dates
- **Fix**: Invoice snapshots the prices used at generation time

### JWT Refresh Token Security
- **Risk**: LocalStorage vulnerable to XSS attacks
- **Fix**: HttpOnly cookies for refresh tokens
- **Fix**: Access token in memory only (not persisted)

### File Upload Bottleneck
- **Risk**: 5MB incident photos choking NestJS server
- **Fix**: Client-side image compression before upload
- **Fix**: S3 presigned URLs for direct upload to storage
