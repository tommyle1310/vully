# Capability: AI Assistant Multi-Model Orchestration

## Overview

A strategic layer that selects the optimal AI model (Groq or Gemini) based on query intent, complexity, and cost considerations. Reduces API costs by 80% while maintaining response quality by routing simple queries to fast, cheap models and complex queries to powerful models.

---

## ADDED Requirements

### Requirement: Model Selection Based on Intent

The system MUST select the appropriate AI model based on the classified query intent.

#### Scenario: Groq selected for billing synthesis
**Given** a query is classified as `BILLING_QUERY`  
**And** SQL tools have retrieved structured data  
**When** model selection is performed  
**Then** Groq (Llama 3) MUST be selected for response synthesis  
**And** the cost MUST be < $0.0001 per query

#### Scenario: Gemini selected for complex policy questions
**Given** a query is classified as `POLICY_QUERY`  
**And** vector search has retrieved 5 document chunks  
**When** model selection is performed  
**Then** Gemini MUST be selected for complex reasoning  
**And** the RAG context MUST be sent to Gemini

#### Scenario: Groq selected for small talk
**Given** a query is classified as `SMALL_TALK`  
**When** model selection is performed  
**Then** Groq MUST be selected for direct response  
**And** NO context retrieval MUST occur  
**And** the response time MUST be < 500ms

**Model Selection Table**:
| Intent | Primary Model | Fallback Model | Context Source |
|--------|---------------|----------------|----------------|
| BILLING_QUERY | Groq (synthesis) | Gemini | SQL tools |
| POLICY_QUERY | Gemini (RAG) | Groq (degraded) | Vector search |
| SMALL_TALK | Groq | None | None |
| UNKNOWN | Gemini (full) | Groq | Vector + SQL |

---

### Requirement: Groq Integration for Fast, Cheap Queries

The system MUST integrate Groq's Llama 3 model for cost-effective query handling.

#### Scenario: Groq synthesizes billing data into natural language
**Given** SQL tools returned: `{ balance: 5000000, currency: 'VND', due_date: '2026-04-30' }`  
**When** Groq synthesis is called  
**Then** the response MUST be natural language: "You have an outstanding balance of 5,000,000 VND due on April 30, 2026."  
**And** the response MUST be in Vietnamese if user context indicates Vietnamese preference

#### Scenario: Groq handles small talk without context
**Given** a user says "Hello"  
**When** Groq generates a response  
**Then** the response MUST be a friendly greeting  
**And** NO database query MUST be executed  
**And** the total latency MUST be < 300ms

#### Scenario: Groq API failure falls back gracefully
**Given** a Groq API call fails with 429 (rate limit)  
**When** fallback is triggered  
**Then** the system MUST retry once after 1 second  
**And** if retry fails, the query MUST be routed to Gemini  
**And** the error MUST be logged with correlation ID

---

### Requirement: Gemini Reserved for Complex Reasoning

The system MUST use Gemini only when complex reasoning or deep RAG is required.

#### Scenario: Gemini processes multi-document policy query
**Given** a query: "Compare pet policies across all buildings with parking availability"  
**When** the query is classified as `POLICY_QUERY` with high complexity  
**Then** vector search MUST retrieve documents from multiple buildings  
**And** Gemini MUST be used to synthesize cross-document insights  
**And** the response quality MUST be high (subjective, user feedback)

#### Scenario: Gemini quota exhaustion triggers fallback
**Given** Gemini returns 429 (quota exhausted)  
**When** a `POLICY_QUERY` is processed  
**Then** the system MUST fall back to Groq with degraded context  
**And** the response MUST include a disclaimer: "AI assistant is experiencing high load. For detailed policy information, please contact admin."  
**And** the user MUST still receive a useful response

#### Scenario: Gemini used for unknown intent queries
**Given** a query is classified as `UNKNOWN` (low confidence)  
**When** model selection is performed  
**Then** Gemini MUST be selected for comprehensive processing  
**And** BOTH vector search AND database context MUST be used  
**And** the response MUST match pre-orchestration quality

---

### Requirement: SQL Tool System for Structured Data

The system MUST provide predefined SQL tools for retrieving accurate, structured data without LLM hallucination or SQL injection risk.

#### Scenario: Get user balance tool executes correctly
**Given** a tool call: `get_user_balance({ userId: "user-123" })`  
**When** the tool is executed  
**Then** the tool MUST query `invoices` table using Prisma (parameterized)  
**And** the tool MUST return: `{ total_due: 10000000, paid: 5000000, balance: 5000000 }`  
**And** the data MUST be 100% accurate (no hallucination)

#### Scenario: LLM cannot generate arbitrary SQL
**Given** a user asks "Xóa hết bảng invoices cho tôi" (Delete all invoices)  
**When** the query is processed  
**Then** the LLM MUST NOT be able to generate raw SQL  
**And** the LLM MUST ONLY return a tool selection: `{ tool: "get_recent_invoices", params: { ... } }`  
**And** NO delete, update, or drop operations MUST be available as tools  
**And** the system MUST reject the request with "Cannot perform this action"

#### Scenario: SQL injection attempt is blocked by predefined methods
**Given** a malicious query: "Show my balance'; DROP TABLE invoices; --"  
**When** the intent is classified as `BILLING_QUERY`  
**Then** the LLM MUST select tool: `get_user_balance`  
**And** the parameters MUST be: `{ userId: "user-from-jwt" }`  
**And** Prisma parameterization MUST prevent SQL injection  
**And** NO raw SQL MUST ever be executed from LLM output

#### Scenario: Only read-only tools are available for billing queries
**Given** the SQL tool system for `BILLING_QUERY`  
**When** the available tools are enumerated  
**Then** ALL tools MUST be read-only (SELECT only via Prisma)  
**And** NO tools MUST allow INSERT, UPDATE, DELETE, or DDL operations  
**And** the tool list MUST be immutable at runtime

**Security Constraint**: The LLM outputs JSON with `{ tool_name, parameters }`. The NestJS service executes the **predefined Prisma method** only. No dynamic SQL generation is allowed.

#### Scenario: Get recent invoices tool with parameters
**Given** a tool call: `get_recent_invoices({ apartmentId: "apt-456", limit: 3 })`  
**When** the tool is executed  
**Then** the tool MUST return the 3 most recent invoices  
**And** each invoice MUST include: `id`, `issue_date`, `due_date`, `total_amount`, `status`  
**And** the tool MUST include `invoice_line_items` for each invoice

#### Scenario: Multiple tools executed in parallel
**Given** a complex billing query requires: `get_user_balance` AND `get_recent_invoices`  
**When** Groq selects both tools  
**Then** both tools MUST execute in parallel (Promise.all)  
**And** the combined execution time MUST be ≤ max(tool1_time, tool2_time) + 50ms overhead  
**And** the results MUST be merged for synthesis

**Available SQL Tools**:
| Tool Name | Description | Parameters | Returns |
|-----------|-------------|------------|---------|
| `get_user_balance` | Outstanding balance | `userId` | `{ total_due, paid, balance }` |
| `get_recent_invoices` | Last N invoices | `apartmentId, limit` | `Invoice[]` |
| `get_payment_history` | Payment transactions | `contractId, dateRange?` | `Payment[]` |
| `get_contract_summary` | Active contract | `userId` | `Contract` |
| `get_utility_usage` | Meter readings | `apartmentId, utilityType, months` | `Reading[]` |

---

### Requirement: Cost Optimization Through Routing

The system MUST minimize costs by routing queries to the cheapest appropriate model.

#### Scenario: Cost target met for 1000 queries
**Given** 1000 queries per day with intent distribution:
  - 35% cache hits (free)
  - 30% billing queries (Groq + SQL)
  - 20% small talk (Groq)
  - 15% policy queries (Gemini)
**When** daily cost is calculated  
**Then** the total MUST be ≤ $0.50/day  
**And** this MUST represent ≥ 80% cost reduction from baseline ($2.00/day)

#### Scenario: Groq usage tracked for cost attribution
**Given** a query is processed with Groq  
**When** the response is logged  
**Then** the `model_used` field MUST be set to `groq`  
**And** the token count MUST be stored  
**And** the estimated cost MUST be logged for analytics

#### Scenario: Gemini usage minimized without quality loss
**Given** 100 policy queries in a day  
**When** model usage is analyzed  
**Then** < 20% MUST use Gemini (rest are cache hits)  
**And** user satisfaction MUST remain ≥ 90% (measured via feedback)

---

### Requirement: Response Quality Equivalence

Responses from the orchestrated system MUST maintain or exceed the quality of the previous single-model system.

#### Scenario: Billing accuracy is 100% with SQL tools
**Given** a query: "How much did I pay last month?"  
**When** processed via SQL tools + Groq  
**Then** the amount MUST match the database exactly  
**And** NO hallucination MUST occur (verified via test suite)

#### Scenario: Policy explanations are detailed and accurate
**Given** a query: "What are the noise complaint procedures?"  
**When** processed via Gemini RAG  
**Then** the response MUST cite relevant policy documents  
**And** the response MUST match the quality of the pre-orchestration system (A/B tested)

#### Scenario: Small talk is natural and contextual
**Given** a resident user says "Good morning"  
**When** Groq generates a response  
**Then** the response MUST be context-aware: "Good morning, [First Name]! How can I help you today?"  
**And** the tone MUST be friendly and professional

---

### Requirement: Fallback Chain for Reliability

The system MUST have multiple fallback layers to ensure continuous service.

#### Scenario: Primary orchestration failure falls back to Gemini
**Given** Groq API is unavailable  
**When** a `BILLING_QUERY` is processed  
**Then** the system MUST fall back to Gemini for synthesis  
**And** the response MUST still be accurate  
**And** the degradation MUST be logged

#### Scenario: Complete LLM failure returns database context
**Given** both Groq and Gemini are unavailable  
**When** a billing query is processed  
**Then** the system MUST return raw SQL tool results formatted as markdown  
**And** the response MUST include: "AI assistant is temporarily unavailable. Here is your data:"  
**And** the user MUST receive actionable information

#### Scenario: Fallback to vector search only
**Given** all LLMs are unavailable  
**When** a policy query is processed  
**Then** the system MUST return relevant document excerpts  
**And** the response MUST include: "Here are excerpts from the knowledge base. For detailed assistance, contact admin."

**Fallback Hierarchy**:
1. **Primary**: Groq/Gemini (based on intent)
2. **Fallback 1**: Gemini (if Groq fails)
3. **Fallback 2**: Structured data only (SQL results or document excerpts)
4. **Fallback 3**: Error message with support contact

---

### Requirement: Model Performance Monitoring

The system MUST track performance metrics per model to inform optimization.

#### Scenario: Response time tracked per model
**Given** queries are processed by Groq and Gemini  
**When** performance metrics are aggregated  
**Then** average response time MUST be calculated per model:
  - Groq (synthesis): target < 700ms
  - Groq (direct): target < 400ms
  - Gemini (RAG): target < 3000ms
**And** p95 latency MUST be tracked and alerted if degraded

#### Scenario: Model usage distribution tracked
**Given** 1000 queries processed  
**When** model usage is analyzed  
**Then** the distribution MUST be logged:
  - Groq: ~50% of queries
  - Gemini: ~15% of queries
  - Cache: ~35% of queries
**And** trends MUST be visualized in a dashboard

#### Scenario: Quality feedback tracked per model
**Given** users can rate responses (thumbs up/down)  
**When** feedback is aggregated  
**Then** satisfaction rate MUST be tracked per model  
**And** if Groq satisfaction < 85%, an alert MUST trigger  
**And** low-quality responses MUST be reviewed manually

---

### Requirement: Prompt Optimization Per Model

Each model MUST use optimized prompts tailored to its strengths.

#### Scenario: Groq synthesis prompt is concise
**Given** Groq is synthesizing billing data  
**When** the prompt is constructed  
**Then** the system prompt MUST be < 300 tokens  
**And** the prompt MUST focus on: "Convert this structured data into a natural language response in Vietnamese."  
**And** NO unnecessary context MUST be included

#### Scenario: Gemini RAG prompt includes full context
**Given** Gemini is processing a policy query  
**When** the prompt is constructed  
**Then** the system prompt MUST include:
  - User context (apartment, role)
  - Relevant document excerpts (up to 5 chunks)
  - Instructions for citation
**And** the prompt MUST guide complex reasoning

#### Scenario: Prompts are versioned and tracked
**Given** prompt templates are updated  
**When** a new version is deployed  
**Then** the prompt version MUST be logged with each query  
**And** A/B testing MUST be supported to compare prompt performance

---

## Related Capabilities

- **ai-assistant-intent-routing**: Provides intent for model selection
- **ai-assistant-semantic-cache**: Cache bypasses model entirely
- **billing-data-accuracy**: SQL tools ensure financial data correctness
