# Vully Project Architecture Summary

This document explains the project structure, AI-assisted development workflow, and how all configuration pieces work together.

---

## 1. Project Code Structure

```
vully/
├── apps/
│   ├── api/                    # NestJS Backend (port 3001)
│   │   └── src/
│   │       ├── modules/        # Feature modules (identity, apartments, etc.)
│   │       ├── common/         # Shared utilities (guards, decorators, prisma)
│   │       ├── providers/      # External service integrations
│   │       ├── config/         # Environment configuration
│   │       └── prisma/         # Database schema & migrations
│   └── web/                    # Next.js 15 Frontend (port 3000)
│       └── src/
│           ├── app/            # App Router pages
│           ├── components/     # UI components (Shadcn/UI)
│           ├── hooks/          # Custom React hooks
│           ├── stores/         # Zustand state stores
│           └── lib/            # Utilities
├── packages/
│   └── shared-types/           # Shared Zod schemas & TypeScript types
├── agents/                     # AI agent definitions (domain specialists)
├── openspec/                   # Spec-driven development system
├── .github/                    # GitHub Copilot & AI configurations
└── docker-compose.yml          # PostgreSQL + Redis infrastructure
```

### Tech Stack Overview
| Layer | Technology |
|-------|------------|
| Backend | NestJS, Prisma ORM, PostgreSQL 15, Redis/BullMQ |
| Frontend | Next.js 15 (App Router), Shadcn/UI, TanStack Query, Zustand |
| Monorepo | pnpm workspaces + Turborepo |
| AI Integration | LangChain.js + pgvector for RAG |

---

## 2. OpenSpec System (`openspec/`)

OpenSpec is a **spec-driven development workflow** that ensures AI assistants follow structured planning before implementation.

### Structure
```
openspec/
├── AGENTS.md           # Instructions for AI on how to use OpenSpec
├── project.md          # Project context, conventions, domain knowledge
├── specs/              # Living specifications (capabilities)
│   └── [capability]/
│       └── spec.md     # Requirements & scenarios
└── changes/            # Pending change proposals
    ├── [change-id]/
    │   ├── proposal.md # What & why
    │   ├── tasks.md    # Implementation checklist
    │   ├── design.md   # Architecture decisions (optional)
    │   └── specs/      # Delta specs (ADDED/MODIFIED/REMOVED)
    └── archive/        # Completed changes (YYYY-MM-DD-[name])
```

### Three-Stage Workflow

| Stage | Purpose | Key Actions |
|-------|---------|-------------|
| **1. Proposal** | Plan before coding | Create `proposal.md`, `tasks.md`, spec deltas; validate with `openspec validate <id> --strict` |
| **2. Implementation** | Execute the plan | Follow `tasks.md` sequentially; mark tasks `[x]` as completed |
| **3. Archive** | Document completion | Move to `archive/`; update main specs; run `openspec archive <id> --yes` |

### When to Create a Proposal
- ✅ New features or capabilities
- ✅ Breaking changes (API, schema)
- ✅ Architecture shifts
- ✅ Performance/security work

### Skip Proposal For
- ❌ Bug fixes (restore intended behavior)
- ❌ Typos, formatting, comments
- ❌ Non-breaking dependency updates

---

## 3. GitHub Copilot Configuration (`.github/`)

```
.github/
├── copilot-instructions.md     # Main AI instructions (auto-loaded)
└── prompts/                    # Reusable prompt templates
    ├── openspec-proposal.prompt.md   # Create new proposals
    ├── openspec-apply.prompt.md      # Implement approved changes
    └── openspec-archive.prompt.md    # Archive completed work
```

### copilot-instructions.md
This file is **automatically attached** to every Copilot conversation. It contains:
- Project tech stack & conventions
- RBAC reference (Admin/Technician/Resident permissions)
- Coding standards (TypeScript strict mode, no `any`, etc.)
- Architecture patterns (BullMQ for jobs, TanStack Query for API calls)
- Definition of Done checklists (backend/frontend)
- References to specialized agents

### Prompt Files (`.prompt.md`)
Reusable workflow prompts that can be invoked directly:
- **openspec-proposal**: Scaffolds proposal + validates
- **openspec-apply**: Implements approved changes task-by-task
- **openspec-archive**: Archives deployed changes

---

## 4. Specialized Agents (`agents/`)

```
agents/
├── backend-architect.md    # API design, service boundaries, schemas
├── database-architect.md   # Data modeling, indexing, migrations
├── frontend-developer.md   # React/Next.js components, state management
└── code-reviewer.md        # Quality gates, security review
```

### Agent Structure (YAML frontmatter)
```yaml
---
name: backend-architect
description: "When to invoke this agent..."
tools: Read, Write, Edit, Bash, Grep, Glob
---

# System prompt with focus areas, approach, and output expectations
```

### Agent Purposes
| Agent | Use For | Don't Use For |
|-------|---------|---------------|
| `backend-architect` | API design, microservice boundaries, scalability | Writing implementation code |
| `database-architect` | ERD design, indexing strategy, migrations | Application logic |
| `frontend-developer` | UI components, state management, responsive design | Backend services |
| `code-reviewer` | PR review, security audit, performance analysis | New feature development |

### How to Invoke
```
@workspace @agents/backend-architect Design the billing module API
@workspace @agents/database-architect Create ERD for incidents system
```

---

## 5. How Everything Integrates

```
┌─────────────────────────────────────────────────────────────────┐
│                        AI Conversation                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. copilot-instructions.md (auto-loaded)                       │
│     └── Provides: Tech stack, coding standards, RBAC, patterns │
│                                                                 │
│  2. User mentions planning/proposal/spec?                       │
│     └── triggers: openspec/AGENTS.md instructions               │
│         └── Creates: proposal.md, tasks.md, spec deltas         │
│                                                                 │
│  3. User invokes specialized agent?                             │
│     └── loads: agents/[agent-name].md                           │
│         └── Provides: Domain expertise, focused output format   │
│                                                                 │
│  4. User uses prompt file?                                      │
│     └── loads: .github/prompts/[prompt].prompt.md               │
│         └── Executes: Specific workflow (propose/apply/archive) │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Typical Development Flow

```
[User Request] 
    │
    ▼
┌───────────────────┐
│ Is it a new       │ YES → Use openspec-proposal.prompt.md
│ feature/breaking  │       or trigger via AGENTS.md
│ change?           │       
└─────────┬─────────┘
          │ NO
          ▼
┌───────────────────┐
│ Need architecture │ YES → @agents/backend-architect
│ or API design?    │       @agents/database-architect
└─────────┬─────────┘
          │ NO
          ▼
┌───────────────────┐
│ Building UI       │ YES → @agents/frontend-developer
│ components?       │       (follows copilot-instructions patterns)
└─────────┬─────────┘
          │ NO
          ▼
┌───────────────────┐
│ Code review       │ YES → @agents/code-reviewer
│ needed?           │
└─────────┬─────────┘
          │ NO
          ▼
[Default: Direct implementation following copilot-instructions.md]
```

### Key Integration Points

1. **`copilot-instructions.md` references `agents/`**
   - Lists available agents with use cases
   - Provides invocation syntax: `@workspace @agents/[name]`

2. **`openspec/project.md` mirrors `copilot-instructions.md`**
   - Both contain tech stack info (single source of truth)
   - OpenSpec focuses on domain entities and constraints
   - Copilot instructions focus on coding patterns

3. **Agents reference `openspec/`**
   - Backend architect outputs feed into spec deltas
   - Database architect designs become Prisma schema proposals
   - All significant changes go through OpenSpec workflow

4. **Prompts enforce OpenSpec workflow**
   - `openspec-proposal.prompt.md`: Guards against coding without planning
   - `openspec-apply.prompt.md`: Ensures tasks are followed sequentially
   - `openspec-archive.prompt.md`: Maintains spec history

---

## 6. Quick Reference Commands

### OpenSpec CLI
```bash
openspec list                    # List active changes
openspec list --specs            # List specifications
openspec show <id>               # Display change details
openspec validate <id> --strict  # Validate before sharing
openspec archive <id> --yes      # Archive after deployment
```

### Development
```bash
pnpm dev                         # Start API + Web dev servers
pnpm db:migrate                  # Run Prisma migrations
pnpm typecheck                   # Run TypeScript checks
pnpm test                        # Run tests
```

---

## 7. Verification Checklist

For another AI to verify this architecture:

- [ ] Monorepo uses pnpm workspaces with Turborepo
- [ ] Backend is NestJS with modular architecture (`apps/api/src/modules/`)
- [ ] Frontend is Next.js 15 with App Router (`apps/web/src/app/`)
- [ ] Shared types in `packages/shared-types/` using Zod
- [ ] OpenSpec has 3 stages: Proposal → Implementation → Archive
- [ ] `copilot-instructions.md` is auto-loaded in every conversation
- [ ] Agents are invoked via `@workspace @agents/[name]` syntax
- [ ] All significant changes require spec proposals before coding
- [ ] Background jobs use BullMQ (never block main thread)
- [ ] Frontend uses Shadcn/UI (no native HTML buttons/inputs)
- [ ] TanStack Query for server state, Zustand for UI state
