# Capability: AI Assistant Intent Routing

## Overview

The AI assistant intelligently classifies user queries into intent categories and routes them to the optimal processing strategy (model selection, tool usage, caching). This reduces costs by 80% and improves response times from 2-5s to <1s for most queries.

---

## ADDED Requirements

### Requirement: Intent Classification System

The system MUST classify every user query into one of the predefined intent categories before processing.

#### Scenario: Billing query is classified correctly
**Given** a user asks "How much do I owe for last month?"  
**When** the query is sent to the intent classifier  
**Then** the intent MUST be classified as `BILLING_QUERY`  
**And** the confidence score MUST be ≥ 0.75  
**And** the classification time MUST be < 500ms

#### Scenario: Low confidence defaults to Gemini fallback
**Given** a user asks "Phí bảo trì 2% của sổ hồng được tính như thế nào?" (Vietnamese real estate terminology)  
**When** the Groq intent classifier processes the query  
**And** the confidence score is < 0.75  
**Then** the intent MUST be set to `UNKNOWN`  
**And** the query MUST be routed to Gemini for comprehensive processing  
**And** the low confidence MUST be logged for system improvement

#### Scenario: Policy query is classified correctly
**Given** a user asks "What are the pet rules in the building?"  
**When** the query is sent to the intent classifier  
**Then** the intent MUST be classified as `POLICY_QUERY`  
**And** relevant entities MUST be extracted (building context if available)

#### Scenario: Small talk is handled efficiently
**Given** a user sends "Hello" or "Thank you"  
**When** the query is classified  
**Then** the intent MUST be `SMALL_TALK`  
**And** NO vector search MUST occur  
**And** NO database query MUST occur  
**And** the response MUST use Groq (cheap model)

#### Scenario: Ambiguous query defaults to comprehensive search
**Given** a user query that doesn't clearly match any intent  
**When** the confidence score is < 0.75  
**Then** the intent MUST be set to `UNKNOWN`  
**And** the query MUST be routed to the Gemini RAG fallback (current comprehensive flow)

#### Scenario: Vietnamese building management terminology is recognized
**Given** a user asks "Quy định tạm trú tạm vắng là gì?" (temporary residence rules)  
**When** intent classification is performed  
**Then** the intent MUST be `POLICY_QUERY`  
**And** the confidence MUST be ≥ 0.75  
**Or** if confidence < 0.75, fallback to Gemini MUST be triggered

---

### Requirement: Entity Extraction from Queries

The intent classifier MUST extract relevant entities from queries to enable targeted data retrieval.

#### Scenario: Building name extracted from query
**Given** a user asks "How many vacant apartments in Sunrise Tower?"  
**When** intent is classified as `BILLING_QUERY` or `POLICY_QUERY`  
**Then** the entity `buildingName: "Sunrise Tower"` MUST be extracted  
**And** subsequent database queries MUST filter by this building

#### Scenario: Date range extracted for time-based queries
**Given** a user asks "Show my invoices from January 2026"  
**When** intent is classified as `BILLING_QUERY`  
**Then** the entities MUST include `dateRange: [2026-01-01, 2026-01-31]`  
**And** the SQL tool MUST use this date filter

#### Scenario: Apartment ID inferred from user context
**Given** a resident user with an active contract  
**When** they ask "What's my balance?"  
**Then** the entity `apartmentId` MUST be inferred from their contract  
**And** billing queries MUST scope to their apartment

---

### Requirement: Routing Logic Based on Intent

The system MUST route queries to different processing pipelines based on the classified intent.

#### Scenario: Billing query routed to SQL tools + Groq
**Given** intent is `BILLING_QUERY`  
**When** routing decision is made  
**Then** the query MUST be sent to `AiAssistantSearchService` for SQL tool execution  
**And** the structured data MUST be synthesized using Groq (not Gemini)  
**And** the total cost MUST be < $0.001 per query

#### Scenario: Policy query routed to Gemini RAG
**Given** intent is `POLICY_QUERY`  
**When** routing decision is made  
**Then** the query MUST trigger vector search in `DocumentService`  
**And** the context MUST be sent to Gemini for complex reasoning  
**And** the response quality MUST match current RAG implementation

#### Scenario: Small talk routed to fast Groq response
**Given** intent is `SMALL_TALK`  
**When** routing decision is made  
**Then** NO database query MUST be executed  
**And** NO vector search MUST be executed  
**And** Groq MUST generate a direct response  
**And** the response time MUST be < 500ms

#### Scenario: Unknown intent uses comprehensive fallback
**Given** intent is `UNKNOWN`  
**When** routing decision is made  
**Then** the system MUST execute the current comprehensive flow:
  - Vector search for relevant documents
  - Database context retrieval
  - Gemini RAG generation
**And** the response quality MUST be identical to pre-orchestration system

---

### Requirement: Intent Classification Performance

The intent classification layer MUST be fast and cost-effective to avoid becoming a bottleneck.

#### Scenario: Classification completes within latency budget
**Given** any user query  
**When** intent classification is performed  
**Then** the classification MUST complete within 500ms (p95)  
**And** the classification MUST complete within 300ms (p50)

#### Scenario: Classification cost is minimal
**Given** 1000 queries per day  
**When** all queries are classified  
**Then** the total classification cost MUST be < $0.10/day  
**And** the cost per classification MUST be < $0.0001

#### Scenario: Groq fallback when primary classifier fails
**Given** the Groq API returns an error  
**When** intent classification is attempted  
**Then** the system MUST retry once with exponential backoff  
**And** if retry fails, the intent MUST default to `UNKNOWN`  
**And** the query MUST still be processed successfully via Gemini fallback

---

### Requirement: Intent Distribution Monitoring

The system MUST track intent distribution to inform optimization decisions.

#### Scenario: Intent metrics are logged for each query
**Given** a query is classified and processed  
**When** the response is returned  
**Then** the following MUST be logged:
  - Intent category
  - Confidence score
  - Classification time
  - Model used for response
  - Total response time
**And** logs MUST be stored in `chat_queries` table

#### Scenario: Admin can view intent distribution
**Given** an admin user  
**When** they request `GET /api/ai-assistant/stats/intent-distribution`  
**Then** the response MUST include:
  - Count of queries per intent (last 7 days)
  - Average confidence per intent
  - Percentage breakdown
**And** the data MUST be visualized in a pie chart

#### Scenario: Alerts trigger for anomalous intent patterns
**Given** the system is running normally  
**When** `UNKNOWN` intent exceeds 50% of traffic for 1 hour  
**Then** an alert MUST be sent to the engineering team  
**And** the alert MUST include sample queries for debugging

---

### Requirement: Multilingual Intent Classification

The intent classifier MUST support both Vietnamese and English queries with equal accuracy.

#### Scenario: Vietnamese billing query classified correctly
**Given** a user asks "Tôi nợ bao nhiêu tiền tháng trước?"  
**When** intent is classified  
**Then** the intent MUST be `BILLING_QUERY`  
**And** the confidence MUST be ≥ 0.75

#### Scenario: Vietnamese policy query classified correctly
**Given** a user asks "Quy định về nuôi thú cưng là gì?"  
**When** intent is classified  
**Then** the intent MUST be `POLICY_QUERY`

#### Scenario: Mixed-language queries handled gracefully
**Given** a user asks "What is my balance trong tháng này?"  
**When** intent is classified  
**Then** the system MUST still identify `BILLING_QUERY`  
**And** no error MUST be thrown

---

## Related Capabilities

- **ai-assistant-semantic-cache**: Intent is used to determine cache TTL
- **ai-assistant-multi-model**: Intent determines which model to use
- **billing-data-accuracy**: Ensures billing queries use authoritative SQL data
