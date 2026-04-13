# Manual Test Cases: Agentic AI Orchestration

**Feature**: Multi-model AI assistant with intent routing, semantic cache, and SQL tools  
**Date**: April 13, 2026  
**Status**: Ready for Testing

---

## Test Environment Setup

### Prerequisites
- [ ] Backend running: `pnpm dev` in `apps/api`
- [ ] Database migrated with orchestration fields
- [ ] Environment variables set:
  - `GROQ_API_KEY` (console.groq.com)
  - `GEMINI_API_KEY` (existing)
- [ ] Test user accounts:
  - Admin user (unlimited queries)
  - Resident user with active contract
  - Resident user with pending invoices

---

## Test Suite 1: Intent Classification

### TC1.1: Small Talk Detection
**Objective**: Verify Groq classifies greetings correctly and responds without hitting cache or expensive models

**Steps**:
1. Send chat query: `"Xin chào"`
2. Observe logs for intent classification
3. Check response time

**Expected Results**:
- Intent: `SMALL_TALK`
- Confidence: ≥ 0.75
- Model used: `groq-llama-3.1-8b-instant`
- Response time: < 500ms
- No cache check (first time)
- Response contains greeting in Vietnamese

**Variations**:
- `"Hello"` (English)
- `"Good morning"`
- `"How are you?"`
- `"Thank you"`

---

### TC1.2: Billing Query Detection
**Objective**: Verify billing-related queries route to SQL tools

**Steps**:
1. Send query: `"Tôi còn nợ bao nhiêu tiền?"`
2. Check logs for intent + tools executed
3. Verify response contains financial data

**Expected Results**:
- Intent: `BILLING_QUERY`
- Confidence: ≥ 0.75
- Model used: `groq-llama-3.1-8b-instant`
- Tools executed: `["get_user_balance"]`
- Response includes VND amounts
- User ID injected (not from LLM)

**Variations**:
- `"Show me my recent invoices"` → `get_recent_invoices`
- `"What's my payment history?"` → `get_payment_history` (auto-resolves contract from userId)
- `"When is my next rent payment?"` → `get_contract_summary`
- `"How much electricity did I use?"` → `get_utility_usage` (auto-resolves apartment from userId)

---

### TC1.3: Policy Query Detection
**Objective**: Verify policy-related queries use correct intent

**Steps**:
1. Send query: `"Pet policy trong tòa nhà là gì?"`
2. Check intent classification

**Expected Results**:
- Intent: `POLICY_QUERY`
- Confidence: ≥ 0.75
- Model used: `groq-llama-3.1-8b-instant`
- Fallback to database context search (SQL tools for policies not implemented yet)

**Variations**:
- `"Maximum residents per apartment?"`
- `"Trash collection schedule?"`
- `"Late fee percentage?"`

---

### TC1.4: Unknown Intent Fallback
**Objective**: Verify complex queries fall back to Gemini RAG

**Steps**:
1. Send query: `"How do I report a broken elevator?"`
2. Check routing decision

**Expected Results**:
- Intent: `UNKNOWN` (confidence < 0.75) OR `ACTION_REQUEST`
- Model used: `gemini-2.0-flash`
- Document search executed
- Response includes relevant policy documents

---

## Test Suite 2: Semantic Cache

### TC2.1: Cache Miss on First Query
**Objective**: Verify new queries don't hit cache

**Steps**:
1. Send unique query: `"What's my outstanding balance as of April 13, 2026?"`
2. Check logs

**Expected Results**:
- `cache_checked: true`
- `cache_hit: false`
- `cache_verified: false`
- `cache_similarity: null`
- SQL tool executed
- Response written to cache asynchronously

---

### TC2.2: Cache Hit with High Similarity
**Objective**: Verify semantically similar queries hit cache

**Steps**:
1. Send query: `"What's my outstanding balance as of April 13, 2026?"` (wait for cache write)
2. Wait 2 seconds
3. Send similar query: `"How much do I owe right now?"`
4. Check logs

**Expected Results**:
- `cache_checked: true`
- `cache_hit: true`
- `cache_similarity: ≥ 0.95`
- `cache_verified: true` (if similarity < 0.98) OR `false` (if ≥ 0.98, skipped verification)
- No tool execution
- Response time: < 200ms
- Same response as first query

---

### TC2.3: Cache Miss with Negation Detection
**Objective**: Verify LLM catches semantic differences (Vietnamese negation)

**Steps**:
1. Send query: `"Tôi CÓ nợ tiền không?"` (Do I have debt?)
2. Wait for cache write
3. Send negated query: `"Tôi KHÔNG nợ tiền phải không?"` (I don't have debt, right?)
4. Check logs

**Expected Results**:
- First query: Cache miss, tool executed
- Second query:
  - `cache_checked: true`
  - High similarity (≥ 0.95) to first query
  - `cache_verified: false` (LLM detected negation)
  - `cache_hit: false`
  - Tool re-executed
  - Different response (inverse meaning)

---

### TC2.4: Cache TTL by Intent
**Objective**: Verify different cache lifetimes for different intents

**Steps**:
1. Send billing query → cache with 6hr TTL
2. Send policy query → cache with 7d TTL
3. Send small talk → cache with 30d TTL
4. Check database `chat_queries` table for `created_at` + intent

**Expected Results**:
- Billing: Short TTL (frequent changes)
- Policy: Long TTL (infrequent changes)
- Small talk: Longest TTL (never changes)
- Cache invalidation respects these TTLs in `checkCache()` method

---

## Test Suite 3: SQL Tools Execution

### TC3.1: Single Tool - User Balance
**Objective**: Verify `get_user_balance` tool executes correctly

**Steps**:
1. As resident with pending invoices, send: `"How much do I owe?"`
2. Check response and logs

**Expected Results**:
- Tool selected: `get_user_balance`
- SQL query filters invoices by `contracts.tenant_id = userId` (not `user_id` directly)
- Response includes:
  - `totalOutstanding` (VND)
  - `currency: "VND"`
  - `invoiceCount`
- User ID injected by backend (not from LLM parameters)

---

### TC3.2: Tool with Parameters - Recent Invoices
**Objective**: Verify tool parameter extraction from LLM

**Steps**:
1. Send: `"Show me my last 3 invoices"`
2. Check tool selection

**Expected Results**:
- Tool selected: `get_recent_invoices`
- Parameters from LLM: `{ limit: 3 }` (or default 5)
- Parameters injected by backend: `{ userId: <actual_user_id> }`
- Response includes invoice numbers, dates, amounts, statuses
- Correct field names: `paid_amount` (not `amount_paid`), `invoice_stream` (not `type`)

**Note**: Tools `get_payment_history` and `get_utility_usage` now auto-resolve `contractId` and `apartmentId` from the user's active contract, so they only need `userId` parameter.

---

### TC3.3: Multiple Tools in Parallel
**Objective**: Verify parallel tool execution for complex queries

**Steps**:
1. Send: `"Give me a summary of my finances: balance, recent invoices, and payment history"`
2. Check logs for parallel execution

**Expected Results**:
- Tools selected: `["get_user_balance", "get_recent_invoices", "get_payment_history"]`
- All tools execute in parallel (Promise.all)
- Response synthesizes all data into natural Vietnamese
- Total time < sum of individual tool times

---

### TC3.4: Security - Unknown Tool Rejection
**Objective**: Verify tool allowlist protection

**Steps**:
1. Manually modify Groq response (intercept or mock) to return unknown tool: `{ tool_name: "delete_all_data", parameters: {} }`
2. Send query

**Expected Results**:
- Error thrown: `"Unknown tool: delete_all_data"`
- Logged warning about rejected tool
- No database mutation
- User receives error message

---

### TC3.5: Security - Readonly Enforcement
**Objective**: Verify all tools are marked readonly

**Steps**:
1. Check all tools in `getBillingTools()`
2. Verify runtime check in `executeTools()`

**Expected Results**:
- All tools have `readonly: true`
- Runtime check throws if `!tool.readonly`
- No INSERT/UPDATE/DELETE operations in any tool
- Only Prisma `findMany`, `findUnique`, `count`, `groupBy`

---

### TC3.6: Security - User ID Injection
**Objective**: Verify LLM cannot specify different user

**Steps**:
1. Send query as User A: `"Show me invoices for user B"`
2. Check tool execution

**Expected Results**:
- LLM parameters ignored for `userId`
- Backend injects actual authenticated user ID
- Only User A's invoices returned
- No cross-user data leakage

---

## Test Suite 4: Cache Invalidation Events

### TC4.1: Invoice Created Event
**Objective**: Verify cache clears when new invoice is created

**Steps**:
1. As resident, send: `"How much do I owe?"` → cache response
2. Admin creates new invoice for this user
3. Send same query again: `"How much do I owe?"`

**Expected Results**:
- After invoice creation:
  - Event emitted: `invoice.created { userId, buildingId }`
  - `CacheInvalidationListener.handleInvoiceCreated()` triggered
  - Cached billing queries deleted for this user
- Second query:
  - Cache miss (invalidated)
  - Tool re-executed
  - New total includes latest invoice

---

### TC4.2: Payment Recorded Event
**Objective**: Verify cache clears when payment is recorded

**Steps**:
1. Send: `"What's my balance?"` → cache response (e.g., 5,000,000 VND)
2. Admin records payment for user's contract
3. Send same query again

**Expected Results**:
- After payment:
  - Event emitted: `payment.recorded { userId, contractId }`
  - Cache cleared for billing queries
- Second query shows reduced balance

---

### TC4.3: Building Policy Updated Event
**Objective**: Verify policy cache clears when building policy changes

**Steps**:
1. Send: `"What's the pet policy?"` → cache response
2. Admin updates building policy (e.g., changes pet limit)
3. Send same query again

**Expected Results**:
- After policy update:
  - Event emitted: `building-policy.updated { buildingId }`
  - Policy queries cache cleared for this building
- Second query reflects new policy

---

### TC4.4: No Cross-Building Cache Leak
**Objective**: Verify cache invalidation is scoped to correct building

**Steps**:
1. Resident in Building A queries policy → cached
2. Admin updates policy for Building B
3. Resident in Building A queries again

**Expected Results**:
- Building A cache NOT invalidated
- Building B cache invalidated
- No cross-contamination

---

## Test Suite 5: Routing Trace & Observability

### TC5.1: Correlation ID Tracking
**Objective**: Verify all log entries share correlation ID

**Steps**:
1. Send query: `"My balance?"`
2. Check backend logs

**Expected Results**:
- Correlation ID (UUID) generated at start
- All log entries include `[correlation_id]` prefix
- Database `chat_queries.correlation_id` matches
- Unique index prevents duplicates

---

### TC5.2: Trace Fields in Database
**Objective**: Verify all routing decisions logged to DB

**Steps**:
1. Send query and check `chat_queries` table

**Expected Results** for a billing query with tools:
```sql
SELECT 
  intent,               -- 'BILLING_QUERY'
  intent_confidence,    -- 0.95
  cache_checked,        -- true
  cache_hit,            -- false (first time)
  cache_verified,       -- false
  cache_similarity,     -- null
  model_used,           -- 'groq-llama-3.1-8b-instant'
  tools_executed,       -- ["get_user_balance"]
  routing_time_ms,      -- ~50ms
  model_time_ms,        -- ~300ms
  total_time_ms,        -- ~400ms
  error_during_routing, -- false
  fallback_used,        -- null
  correlation_id        -- UUID
FROM chat_queries
ORDER BY created_at DESC LIMIT 1;
```

---

### TC5.3: Performance Breakdown
**Objective**: Verify timing metrics accuracy

**Steps**:
1. Send query
2. Check trace times

**Expected Results**:
- `routing_time_ms` = Cache check + Intent classification time
- `model_time_ms` = Groq/Gemini inference time
- `total_time_ms` ≈ `routing_time_ms` + `model_time_ms` + tool execution
- All values non-null for completed queries

---

### TC5.4: Error Logging
**Objective**: Verify errors are traced properly

**Steps**:
1. Temporarily break Groq API (invalid key)
2. Send query

**Expected Results**:
- `error_during_routing: true`
- `total_time_ms` recorded
- Error message logged
- User receives graceful error response
- No crash

---

### TC5.5: Fallback Tracking
**Objective**: Verify Gemini quota fallback is logged

**Steps**:
1. Exhaust Gemini quota (send many queries)
2. Send complex RAG query

**Expected Results**:
- `fallback_used: "gemini-quota-exceeded"`
- `model_used: "fallback-context-only"`
- Response includes formatted database/document context
- No AI synthesis
- Still functional

---

## Test Suite 6: Multi-Language Support

### TC6.1: Vietnamese Query Processing
**Objective**: Verify Vietnamese intent classification accuracy

**Test Queries**:
- `"Tôi nợ bao nhiêu?"` → BILLING_QUERY
- `"Cho tôi xem hoá đơn gần nhất"` → BILLING_QUERY
- `"Chính sách nuôi thú cưng?"` → POLICY_QUERY
- `"Cảm ơn bạn"` → SMALL_TALK

**Expected Results**:
- Intent confidence ≥ 0.75 for all
- Responses synthesized in Vietnamese
- Correct terminology: "phí bảo trì", "sổ hồng", "tạm trú"

---

### TC6.2: English Query Processing
**Objective**: Verify English queries work equally well

**Test Queries**:
- `"What's my balance?"` → BILLING_QUERY
- `"Show invoices"` → BILLING_QUERY
- `"Pet policy?"` → POLICY_QUERY
- `"Thanks"` → SMALL_TALK

**Expected Results**:
- Same intent classification accuracy
- Responses in English
- No language mixing

---

## Test Suite 7: Rate Limiting & Admin Bypass

### TC7.1: Resident Daily Limit
**Objective**: Verify 20 queries/day limit for non-admin

**Steps**:
1. As resident, send 20 queries
2. Send 21st query

**Expected Results**:
- First 20 queries: Success
- 21st query: `400 Bad Request`
- Error message: `"Daily query limit reached (20 queries/day). Try again tomorrow."`

---

### TC7.2: Admin Unlimited Queries
**Objective**: Verify admin bypasses rate limit

**Steps**:
1. As admin, send 25+ queries in one day

**Expected Results**:
- All queries succeed
- No rate limit error
- `checkRateLimit()` returns early for admin

---

## Test Suite 8: Edge Cases & Error Handling

### TC8.1: Malformed Query
**Objective**: Verify graceful handling of invalid input

**Steps**:
1. Send empty query: `""`
2. Send only whitespace: `"   "`
3. Send very long query (10,000 characters)

**Expected Results**:
- No crash
- Appropriate validation error OR default to UNKNOWN intent
- Error logged

---

### TC8.2: User Without Contract
**Objective**: Verify behavior when user has no financial data

**Steps**:
1. As new user without contracts, send: `"My balance?"`

**Expected Results**:
- Tool executes successfully
- Response: `totalOutstanding: 0, invoiceCount: 0`
- No error

---

### TC8.3: Tool Execution Failure
**Objective**: Verify resilience when tool fails

**Steps**:
1. Temporarily break database connection
2. Send billing query

**Expected Results**:
- Tool execution fails gracefully
- Error logged in `results[tool_name] = { error: "<message>" }`
- LLM synthesizes response with error context
- User informed of issue

---

### TC8.4: Concurrent Queries from Same User
**Objective**: Verify cache doesn't cause race conditions

**Steps**:
1. Send 3 identical queries simultaneously (within 100ms)

**Expected Results**:
- All 3 queries may execute tools (cache write is async)
- OR 1-2 hit cache if timing allows
- No deadlocks or data corruption
- All receive correct response

---

## Test Suite 9: Cost Optimization Verification

### TC9.1: Groq Usage for Simple Queries
**Objective**: Verify 80% of queries use cheap Groq model

**Steps**:
1. Send 100 diverse queries (50 billing, 30 small talk, 20 complex)
2. Query database: `SELECT model_used, COUNT(*) FROM chat_queries GROUP BY model_used`

**Expected Results**:
- ~80% use `groq-llama-3.1-8b-instant` ($0.05/1M tokens)
- ~20% use `gemini-2.0-flash` ($0.15/1M tokens)
- Estimated 83% cost reduction vs all-Gemini

---

### TC9.2: Response Time Performance
**Objective**: Verify <1s response for cached and Groq queries

**Steps**:
1. Measure `total_time_ms` for:
   - Cached query
   - Groq small talk
   - Groq billing query with 1 tool
   - Gemini RAG query

**Expected Results**:
- Cache hit: < 200ms
- Groq small talk: < 500ms
- Groq + SQL tool: < 1000ms
- Gemini RAG: 1-3s (acceptable for complex queries)

---

## Test Suite 10: Regression Tests

### TC10.1: Existing Apartment Search Still Works
**Objective**: Verify legacy functionality not broken

**Steps**:
1. Send: `"How many 3-bedroom apartments are available?"`

**Expected Results**:
- Falls through to `queryDatabaseForContext()`
- Apartment search logic executes
- Response includes apartment counts and details

---

### TC10.2: Document Search Still Works
**Objective**: Verify RAG document retrieval intact

**Steps**:
1. Send complex query requiring knowledge base
2. Check `source_docs` in response

**Expected Results**:
- Document search executes for UNKNOWN/ACTION_REQUEST intents
- Relevant documents returned
- Gemini synthesizes answer from docs

---

## Acceptance Criteria Summary

| Feature | Pass Criteria |
|---------|---------------|
| Intent Classification | Accuracy ≥ 75% on 100 test queries |
| Semantic Cache | Hit rate ≥ 30% on repeated query patterns |
| SQL Tools | All 5 tools return correct data with schema fields |
| Cache Invalidation | Events trigger within 1 second of domain change |
| Security | Zero unauthorized tool access, zero SQL injection |
| Performance | 80% queries < 1s, cache hits < 200ms |
| Observability | 100% queries have complete trace in DB |
| Cost Reduction | ≥ 80% queries use Groq vs Gemini |

---

## Test Execution Checklist

- [ ] All TC1.x tests pass (Intent Classification)
- [ ] All TC2.x tests pass (Semantic Cache)
- [ ] All TC3.x tests pass (SQL Tools)
- [ ] All TC4.x tests pass (Cache Invalidation)
- [ ] All TC5.x tests pass (Routing Trace)
- [ ] All TC6.x tests pass (Multi-Language)
- [ ] All TC7.x tests pass (Rate Limiting)
- [ ] All TC8.x tests pass (Edge Cases)
- [ ] All TC9.x tests pass (Cost Optimization)
- [ ] All TC10.x tests pass (Regression)

**Sign-off**: _______________ Date: _______________
