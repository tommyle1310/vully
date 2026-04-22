# Capability: Module Atomic Context Docs

## ADDED Requirements

### Requirement: Backend Module Atomic Documentation
Each NestJS module under `apps/api/src/modules` SHALL have atomic context documentation.

#### Scenario: Backend module onboarding
- **GIVEN** a backend module (for example `billing`, `apartments`, `identity`, `incidents`, `ai-assistant`)
- **WHEN** a maintainer prepares module context docs
- **THEN** the module contains `_module.md` describing input/output, side effects, and dependencies
- **AND** contains `README.context.md` summarizing business logic, key DTOs, and queue/event interactions

### Requirement: Frontend Feature Atomic Documentation
Frontend feature domains SHALL have short context headers for AI-first understanding.

#### Scenario: Frontend feature analysis
- **GIVEN** a frontend task touching dashboard pages and hooks
- **WHEN** an AI agent searches feature context
- **THEN** it can read a feature `README.context.md` describing use-cases, data hooks, and API dependencies
- **AND** avoid scanning unrelated components

### Requirement: Ten-Second Comprehension Target
Atomic docs SHALL be concise enough for rapid retrieval and understanding.

#### Scenario: Fast context read
- **GIVEN** a reviewer opens module context docs
- **WHEN** they read `_module.md` and `README.context.md`
- **THEN** they understand module purpose and integration points within 10 seconds
- **AND** can proceed to implementation details only if needed

### Requirement: Side-Effect and Dependency Traceability
Atomic docs SHALL explicitly list side effects and upstream/downstream dependencies.

#### Scenario: Safe change planning
- **GIVEN** a planned modification in one module
- **WHEN** reviewing module context docs
- **THEN** queue jobs, websocket events, external notifications, and dependent modules are listed
- **AND** impact analysis can be initiated without full repository scan
