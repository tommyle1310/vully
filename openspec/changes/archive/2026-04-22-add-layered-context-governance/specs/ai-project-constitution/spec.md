# Capability: AI Project Constitution

## ADDED Requirements

### Requirement: Repository-Wide AI Constitution Document
The repository SHALL define a root-level AI constitution file named `.project-context.md` as the canonical context source for the whole codebase.

#### Scenario: Agent starts a new task
- **GIVEN** an AI agent receives a task in this repository
- **WHEN** the agent performs initial context loading
- **THEN** the agent reads `.project-context.md` before broad code traversal
- **AND** uses it as global constraints for architecture, standards, and retrieval behavior

#### Scenario: Existing sample context is insufficient
- **GIVEN** `docs/sample.project-context.md` only covers sample scope
- **WHEN** maintainers publish full-stack context
- **THEN** `.project-context.md` becomes the authoritative source
- **AND** sample documents are treated as non-canonical references

### Requirement: Accurate Tech Stack and Version Mapping
The constitution SHALL include exact stack versions and critical runtime integrations used by the project.

#### Scenario: Model selection or tooling guidance
- **GIVEN** an AI agent needs framework/runtime assumptions
- **WHEN** reading `.project-context.md`
- **THEN** it finds explicit versions for NestJS, Next.js, BullMQ, Socket.IO, and database stack
- **AND** avoids outdated or generic defaults

### Requirement: End-to-End Data Flow Declaration
The constitution SHALL describe primary data flow across frontend, shared types, backend layers, and persistence/event systems.

#### Scenario: Cross-layer feature analysis
- **GIVEN** a request that affects both frontend and backend
- **WHEN** the agent determines impact path
- **THEN** it can trace Web app -> shared DTO/types -> controllers -> services -> database/queues/websockets
- **AND** identify cross-layer dependencies before proposing changes

### Requirement: Global Token-Saving Rules
The constitution SHALL include global retrieval constraints to minimize unnecessary token usage.

#### Scenario: Large repository traversal
- **GIVEN** the repository has large generated or dependency folders
- **WHEN** the agent gathers context
- **THEN** it excludes `dist`, `node_modules`, and `.next` by default
- **AND** prioritizes context docs over full code ingestion
