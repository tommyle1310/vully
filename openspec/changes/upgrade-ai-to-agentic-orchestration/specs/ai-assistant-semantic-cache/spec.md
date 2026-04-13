# Capability: AI Assistant Semantic Cache

## Overview

A vector-based semantic caching layer that identifies and returns previously answered similar questions, eliminating redundant LLM API calls. Achieves 30-40% cache hit rate, reducing costs and improving response times to <50ms for cached queries.

---

## ADDED Requirements

### Requirement: Semantic Similarity Matching

The system MUST use vector embeddings to identify semantically similar queries, even when phrasing differs.

#### Scenario: Exact query match returns cached response
**Given** a user previously asked "How much is my rent?"  
**And** the response was cached with embedding  
**When** the same user asks "How much is my rent?" again  
**Then** the cache MUST return the previous response  
**And** NO LLM call MUST be made  
**And** the response time MUST be < 100ms

#### Scenario: Paraphrased query matches cache with LLM verification
**Given** a user previously asked "What's my monthly rent amount?"  
**And** the response was cached  
**When** another user asks "How much do I pay per month?"  
**Then** the semantic similarity MUST be ≥ 0.95  
**And** an LLM verification step (using Groq) MUST confirm semantic equivalence  
**And** ONLY if verification passes, the cached response MUST be returned  
**And** the response MUST be marked with `cache_hit: true` and `cache_verified: true`

#### Scenario: Similar but different context query misses cache
**Given** a cached query "How many vacant apartments in Sunrise Tower?"  
**When** a user asks "How many vacant apartments in Ocean View?"  
**Then** the semantic similarity MUST be < 0.95 (different building)  
**And** the cache MUST NOT return the Sunrise Tower response  
**And** a fresh query MUST be processed

#### Scenario: Negation detection prevents false cache hits
**Given** a cached query "Tiền điện đã đóng chưa?" (Has electricity been paid?) with response "Yes"  
**When** a user asks "Tiền điện chưa đóng à?" (Hasn't electricity been paid?)  
**Then** the semantic similarity MAY be ≥ 0.95  
**And** the LLM verification MUST detect semantic opposition (negation)  
**And** the cache MUST NOT return the cached response  
**And** a fresh query MUST be processed

#### Scenario: Vietnamese diacritics don't break cache matching
**Given** a cached query "Phí bảo trì là bao nhiêu?"  
**When** a user asks "Phi bao tri la bao nhieu?" (missing diacritics)  
**Then** the embedding similarity MUST still be ≥ 0.93  
**And** the LLM verification MUST confirm equivalence  
**And** the cached response MUST be returned

#### Scenario: Query language doesn't affect cache matching
**Given** a cached query in English: "What are the pet rules?"  
**When** a user asks in Vietnamese: "Quy định về thú cưng là gì?"  
**Then** the semantic similarity MUST be ≥ 0.95  
**And** the cached response MUST be returned (assuming it was in Vietnamese or context-appropriate)

---

### Requirement: LLM Verification for Cache Hits

To prevent false positives from similarity matching alone, the system MUST use a lightweight LLM verification step before returning cached responses.

#### Scenario: LLM confirms semantic equivalence before cache return
**Given** a cached query "What is my rent amount?"  
**And** a new query "How much is my monthly rent?"  
**And** the similarity score is 0.96  
**When** LLM verification is performed using Groq  
**Then** the verification prompt MUST be: "Are these two questions semantically equivalent? Q1: [cached] Q2: [new]. Answer YES or NO."  
**And** the verification MUST complete in < 200ms  
**And** ONLY if the answer is "YES", the cached response MUST be returned  
**And** the verification cost MUST be < $0.00001

#### Scenario: LLM detects semantic opposition and blocks cache
**Given** a cached query "Tôi đã đóng tiền chưa?" with response "Chưa" (No)  
**And** a new query "Tôi chưa đóng tiền phải không?" (I haven't paid, right?)  
**And** the similarity score is 0.97  
**When** LLM verification is performed  
**Then** the LLM MUST detect the questions are NOT equivalent (negation issue)  
**And** the verification MUST return "NO"  
**And** the cache MUST be bypassed  
**And** a fresh query MUST be processed

#### Scenario: Verification failure falls back to fresh query
**Given** a cache hit with similarity 0.96  
**When** the LLM verification API fails  
**Then** the system MUST treat it as cache miss  
**And** a fresh query MUST be processed  
**And** the error MUST be logged for monitoring

#### Scenario: Verification is skipped for very high similarity
**Given** a cache hit with similarity ≥ 0.98  
**And** the queries are in the same language  
**When** cache lookup is performed  
**Then** LLM verification MAY be skipped (optional optimization)  
**And** the cached response MAY be returned directly  
**And** this threshold MUST be configurable via environment variable

---

### Requirement: Cache Write Strategy

Every successfully processed query response MUST be cached with its embedding for future reuse.

#### Scenario: Response is cached after LLM generation
**Given** a query has been processed by Gemini or Groq  
**When** the response is successfully generated  
**Then** the response embedding MUST be computed  
**And** the embedding MUST be stored in `chat_queries.response_embedding`  
**And** the metadata MUST be stored: `intent`, `model_used`, `cache_hit: false`

#### Scenario: Cache write doesn't block user response
**Given** a query is processed and response is ready  
**When** the response is returned to the user  
**Then** the cache write MUST happen asynchronously  
**And** the user response time MUST NOT include cache write latency  
**And** cache write failures MUST NOT affect user experience

#### Scenario: Failed queries are not cached
**Given** a query processing fails with an error  
**When** the error response is returned  
**Then** NO cache entry MUST be created  
**And** the query MUST be retryable without cache interference

---

### Requirement: Time-To-Live (TTL) Based Expiration

Cached responses MUST expire based on the query type to prevent stale data.

#### Scenario: Policy query cache expires after 7 days
**Given** a `POLICY_QUERY` was cached 8 days ago  
**When** a similar query is asked today  
**Then** the cache MUST NOT return the expired response  
**And** a fresh query MUST be processed  
**And** the old cache entry SHOULD be cleaned up

#### Scenario: Billing query cache expires after 6 hours
**Given** a `BILLING_QUERY` was cached 7 hours ago  
**When** a similar billing query is asked  
**Then** the cache MUST NOT return the stale financial data  
**And** a fresh database query MUST be executed

#### Scenario: General knowledge cache lasts 30 days
**Given** a `SMALL_TALK` or general query was cached 20 days ago  
**When** the same query is asked  
**Then** the cache MUST return the response (still valid)  
**And** the cache hit MUST be logged

**TTL Table**:
| Intent | TTL | Rationale |
|--------|-----|-----------|
| POLICY_QUERY | 7 days | Policies change infrequently |
| BILLING_QUERY | 6 hours | Financial data updates frequently |
| SMALL_TALK | 30 days | Greetings don't change |
| UNKNOWN | 3 days | General knowledge |

---

### Requirement: Cache Invalidation on Data Changes

When underlying data changes, related cached queries MUST be invalidated to prevent stale responses through event-driven invalidation.

#### Scenario: Building policy update invalidates policy cache
**Given** multiple cached queries about "pet rules in Sunrise Tower"  
**When** the building policy is updated for Sunrise Tower  
**Then** an event MUST be emitted: `BuildingPolicyUpdated { buildingId }`  
**And** the cache invalidation service MUST listen to this event  
**And** ALL cached queries with `intent=POLICY_QUERY` for that building MUST be invalidated  
**And** subsequent similar queries MUST fetch fresh data

#### Scenario: Invoice creation invalidates billing cache
**Given** cached queries about a user's balance  
**When** a new invoice is created for that user's apartment  
**Then** an event MUST be emitted: `InvoiceCreated { userId, apartmentId }`  
**And** ALL cached `BILLING_QUERY` responses for that user MUST be invalidated immediately  
**And** the next similar query MUST recalculate the balance from database

#### Scenario: Payment recorded invalidates user's financial cache
**Given** a user has cached queries about their balance  
**When** a payment is recorded for their invoice  
**Then** an event MUST be emitted: `PaymentRecorded { userId, invoiceId }`  
**And** ALL cached `BILLING_QUERY` responses for that user MUST be invalidated  
**And** the cache timestamp MUST be updated to mark invalidation time

#### Scenario: Apartment status change invalidates apartment cache
**Given** cached queries about "vacant apartments"  
**When** an apartment status changes from `vacant` to `occupied`  
**Then** an event MUST be emitted: `ApartmentStatusChanged { buildingId, apartmentId }`  
**And** cached queries containing that building's availability MUST be invalidated  
**And** the cache timestamp MUST be updated

**Implementation Pattern**: 
- Use NestJS EventEmitter2 or BullMQ events for decoupled invalidation
- Cache invalidation service subscribes to domain events
- Vector similarity search finds affected cached queries by building/user/apartment context
- Batch delete from `chat_queries` where `response_embedding` matches context embeddings

---

### Requirement: Cache Performance Optimization

The semantic cache MUST be performant enough to not become a bottleneck in the query flow.

#### Scenario: Cache lookup completes within latency budget
**Given** any user query  
**When** semantic cache lookup is performed  
**Then** the lookup MUST complete within 100ms (p95)  
**And** the lookup MUST complete within 50ms (p50)

#### Scenario: Vector index is used for similarity search
**Given** the `chat_queries` table has 10,000+ cached entries  
**When** a similarity search is performed  
**Then** the query MUST use the ivfflat index on `response_embedding`  
**And** the query plan MUST NOT perform a sequential scan  
**And** the search MUST examine < 1000 vectors

#### Scenario: Cache storage is within acceptable limits
**Given** 100,000 cached queries  
**When** storage usage is measured  
**Then** total storage MUST be < 500 MB (avg ~5KB per entry)  
**And** old entries (> TTL) SHOULD be purged weekly

---

### Requirement: Cache Hit Rate Monitoring

The system MUST track and report cache performance metrics to inform optimization.

#### Scenario: Cache hit rate is calculated daily
**Given** the system has processed 1000 queries today  
**When** cache metrics are aggregated  
**Then** the cache hit rate MUST be calculated as: `(cache_hits / total_queries) * 100`  
**And** the rate MUST be stored for trend analysis

#### Scenario: Cache hit rate meets target threshold
**Given** the system has been running for 2 weeks  
**When** cache hit rate is measured  
**Then** the rate MUST be ≥ 30%  
**And** if rate is < 20%, an alert MUST be triggered for investigation

#### Scenario: Cache metrics are exposed via API
**Given** an admin user  
**When** they request `GET /api/ai-assistant/stats/cache-performance`  
**Then** the response MUST include:
  - Total queries (last 7 days)
  - Cache hits
  - Cache misses
  - Cache hit rate (%)
  - Average lookup time
  - Storage usage
**And** the data MUST be visualized in a dashboard

#### Scenario: Cache effectiveness is tracked per intent
**Given** queries are classified by intent  
**When** cache metrics are analyzed  
**Then** cache hit rate MUST be broken down by intent:
  - BILLING_QUERY: target 35%+
  - POLICY_QUERY: target 40%+
  - SMALL_TALK: target 60%+
**And** low-performing intents MUST be flagged for optimization

---

### Requirement: Similarity Threshold Configuration

The similarity threshold MUST be configurable to balance cache hit rate vs response accuracy.

#### Scenario: Default threshold prevents false positives
**Given** the default similarity threshold is 0.95  
**When** a query is "What's the water bill?" and cached query is "What's the electricity bill?"  
**Then** the similarity MUST be < 0.95  
**And** the cache MUST NOT return a false match  
**And** a fresh query MUST be processed

#### Scenario: Threshold can be adjusted per intent
**Given** `SMALL_TALK` queries have high tolerance for variation  
**When** the threshold for `SMALL_TALK` is set to 0.90  
**Then** "Hi" and "Hello" MUST match (similarity ~0.92)  
**And** the cached greeting MUST be returned

#### Scenario: Threshold is configurable via environment variable
**Given** the environment variable `AI_CACHE_SIMILARITY_THRESHOLD=0.93`  
**When** the application starts  
**Then** the global similarity threshold MUST be 0.93  
**And** the threshold CAN be overridden per intent type in code

**Recommended Thresholds**:
| Intent | Threshold | Reason |
|--------|-----------|--------|
| BILLING_QUERY | 0.97 | High precision for financial data |
| POLICY_QUERY | 0.95 | Balance between reuse and accuracy |
| SMALL_TALK | 0.90 | Greetings have high variation tolerance |
| UNKNOWN | 0.95 | Default conservative threshold |

---

### Requirement: Cache Warming Support

The system MUST support pre-populating the cache with frequently asked questions to improve initial cache hit rates.

#### Scenario: FAQ list is pre-cached on deployment
**Given** a list of 50 common questions (FAQ)  
**When** the application is deployed  
**Then** the FAQ responses MUST be available for pre-caching via admin command  
**And** embeddings MUST be generated for all FAQ queries when cache warming is triggered  
**And** the cache hit rate MUST improve by ≥10% within first week

#### Scenario: Manual cache warming for building-specific policies
**Given** a new building is added with custom policies  
**When** an admin triggers cache warming via API endpoint  
**Then** the system MUST generate responses for predefined policy questions  
**And** the responses MUST be cached with building context  
**And** the operation MUST complete within 5 minutes for 50 questions

---

### Requirement: Cache Bypass for Forced Refresh

Users or admins MUST be able to bypass the cache for fresh data.

#### Scenario: Admin bypasses cache with query parameter
**Given** an admin user  
**When** they request `/api/ai-assistant/chat?query=...&bypass_cache=true`  
**Then** the semantic cache MUST be skipped  
**And** a fresh query MUST be processed  
**And** the new response MUST overwrite the existing cache

#### Scenario: User detects stale cached response and requests refresh
**Given** a user receives a cached response  
**And** they suspect it's outdated  
**When** they click "Refresh" or similar UI action  
**Then** the cache MUST be bypassed  
**And** the fresh response MUST be cached with updated timestamp

---

## Related Capabilities

- **ai-assistant-intent-routing**: Intent is used to determine cache TTL
- **ai-assistant-multi-model**: Cache hit skips model selection entirely
- **billing-data-accuracy**: Cache invalidation ensures financial data freshness
