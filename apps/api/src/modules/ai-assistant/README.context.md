# README.context - ai-assistant

## 10-Second Summary
AI chat orchestration with retrieval, semantic cache, and model routing.

## Core Business Logic
- Module manages: Assistant responses, chat history entries, indexed document chunks.
- Entry points are controller routes and service orchestration in this folder.

## DTO Surface
- Use module DTO folder and adjacent feature DTO files as contract surface.
- Update this summary whenever request/response contracts change.

## Events and Queues
- Side effects: Embeddings generation, vector queries, cache reads/writes, optional model fallback telemetry.

## Dependency Map
- Depends on: Document service, embedding service, Groq/Gemini providers, Prisma, Redis.
- Upstream callers: frontend hooks/pages, internal services, and scheduled processors.
