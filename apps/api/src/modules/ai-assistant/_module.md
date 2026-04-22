# ai-assistant Module Context

## Core Purpose
AI chat orchestration with retrieval, semantic cache, and model routing.

## Input/Output Contract
- Inputs: Chat query DTOs, document ingestion DTOs, authenticated user context.
- Outputs: Assistant responses, chat history entries, indexed document chunks.

## Side Effects
Embeddings generation, vector queries, cache reads/writes, optional model fallback telemetry.

## Dependencies
Document service, embedding service, Groq/Gemini providers, Prisma, Redis.

## Notes
- Keep this document aligned with DTO/route changes in the same change set.
