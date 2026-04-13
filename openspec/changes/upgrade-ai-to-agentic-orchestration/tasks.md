# Implementation Tasks

## Phase 1: Foundation & Semantic Cache (Week 1-2)

### Database Schema
- [ ] Add `response_embedding vector(768)` column to `chat_queries` table
- [ ] Create ivfflat index on `response_embedding` for similarity search
- [ ] Add metadata columns: `intent`, `model_used`, `cache_hit`, `routing_time_ms`
- [ ] **Add new trace columns:**
  - [ ] `intent_confidence DECIMAL(3,2)` - Confidence score 0.00-1.00
  - [ ] `cache_verified BOOLEAN` - Whether LLM verified cache hit
  - [ ] `cache_similarity DECIMAL(3,2)` - Similarity score for cache hits
  - [ ] `tools_executed JSONB` - Which SQL tools were called
  - [ ] `model_time_ms INTEGER` - Time spent in LLM call
  - [ ] `total_time_ms INTEGER` - End-to-end time
  - [ ] `correlation_id UUID` - For distributed tracing
  - [ ] `error_during_routing BOOLEAN` - If any routing step failed
  - [ ] `fallback_used VARCHAR(50)` - Which fallback was triggered
- [ ] **Create `chat_query_feedback` table:**
  - [ ] `id, chat_query_id, user_id, feedback_type, reason, comment, created_at`
- [ ] Write and test migration script
- [ ] Verify index performance with 10k+ cached queries

### Embedding Service Enhancement
- [ ] Update `EmbeddingService.embed()` to support query embedding
- [ ] Add batch embedding method for cache backfill
- [ ] Implement embedding error handling and fallback

### Semantic Cache Implementation
- [ ] Create `SemanticCacheService` with similarity search
- [ ] Implement cache lookup with configurable threshold (0.95 default)
- [ ] **Add LLM verification step using Groq before returning cached results**
- [ ] **Implement negation detection to prevent false cache hits (Vietnamese)**
- [ ] **Add diacritics normalization for Vietnamese query matching**
- [ ] Add TTL-based cache expiration logic
- [ ] Implement cache write with embedding storage
- [ ] Add cache invalidation methods (by query type, date range)
- [ ] **Implement event-driven cache invalidation (EventEmitter2)**
- [ ] **Add cache invalidation listeners for domain events:**
  - [ ] `BuildingPolicyUpdated` → invalidate POLICY_QUERY cache
  - [ ] `InvoiceCreated` → invalidate BILLING_QUERY cache
  - [ ] `PaymentRecorded` → invalidate user balance cache
  - [ ] `ApartmentStatusChanged` → invalidate availability cache
- [ ] Write unit tests for cache hit/miss scenarios
- [ ] **Write tests for LLM verification pass/fail scenarios**
- [ ] **Write tests for event-driven invalidation**
- [ ] Add telemetry for cache hit rate tracking

### Configuration
- [ ] Add AI config module with cache settings
- [ ] Add environment variables for cache control
- [ ] Create feature flag for cache enable/disable
- [ ] Document configuration options

---

## Phase 2: Intent Classification & Groq Integration (Week 2-3)

### Gr**Add Vietnamese building management terminology to prompt examples**
- [ ] Implement `GroqService.classifyIntent()` method
- [ ] Add entity extraction from query (building, apartment, dates)
- [ ] Implement confidence threshold filtering (0.75 default)
- [ ] **Add fallback to UNKNOWN for low-confidence results (< 0.75)**
- [ ] **Implement automatic Gemini fallback when confidence < 0.75**
- [ ] Write unit tests with mock Groq responses
- [ ] **Test classification accuracy with Vietnamese terminology:**
  - [ ] "Phí bảo trì 2%"
  - [ ] "Sổ hồng"
  - [ ] "Tạm trú tạm vắng"
- [ ] Test classification accuracy with 50 sample queries **including Vietnamese**
- [ ] **Add confidence score tracking to chat_queries table**

### Intent Classification
- [ ] Define `QueryIntent` enum (BILLING, POLICY, ACTION, SMALL_TALK, UNKNOWN)
- [ ] Create `IntentResult` interface with confidence + entities
- [ ] Write intent classifier system prompt (minimal, <200 tokens)
- [ ] Implement `GroqService.classifyIntent()` method
- [ ] Add entity extraction from query (building, apartment, dates)
- [ ] Implement confidence threshold filtering (0.75 default)
- [ ] Add fallback to UNKNOWN for low-confidence results
- [ ] Write unit tests with mock Groq responses
- [ ] Test classification accuracy with 50 sample queries

### Intent Classifier Prompt
- [ ] Write concise system prompt with examples
- [ ] Test prompt with edge cases (multilingual, ambiguous)
- [ ] Optimize for speed (< 50 token responses)
- [ ] Version prompt in codebase with changelog
**CRITICAL: Ensure LLM NEVER generates raw SQL - only tool selection**
- [ ] **Implement tool parameter validation to prevent injection**
- [ ] Implement billing tools (all read-only, Prisma-based):
  - [ ] `get_user_balance` - Outstanding balance for user
  - [ ] `get_recent_invoices` - Last N invoices for apartment
  - [ ] `get_payment_history` - Payment transactions
  - [ ] `get_contract_summary` - Active contract details
  - [ ] `get_utility_usage` - Meter readings over time
- [ ] **Add runtime check: ALL tools MUST be read-only (no INSERT/UPDATE/DELETE)**
- [ ] **Implement tool allowlist - reject unknown tool names**
- [ ] Create tool selector in `GroqService` (tool calling API)
- [ ] **Design LLM → Tool interface: LLM returns { tool_name, params }, service executes**
- [ ] Implement parallel tool execution
- [ ] Add structured data formatting for LLM synthesis
- [ ] Write unit tests for each tool
- [ ] **Write security tests:**
  - [ ] Test SQL injection attempts are blocked
  - [ ] Test malicious tool names are rejected
  - [ ] Test only read operations are allowed
  - [ ] `handleSmallTalk()`
  - [ ] `handleFallback()`
- [ ] Implement router switch logic based on intent
- [ ] Add routing duration tracking

### SQL Tool System
- [ ] Refactor `AiAssistantSearchService` to tool-based architecture
- [ ] Define `SqlTool` interface (name, description, parameters, execute)
- [ ] Implement billing tools:
  - [ ] `get_user_balance` - Outstanding balance for user
  - [ ] `get_recent_invoices` - Last N invoices for apartment
  - [ ] `get_payment_history` - Payment transactions
  - [ ] `get_contract_summary` - Active contract details
  - [ ] `get_utility_usage` - Meter readings over time
- [ ] Create tool selector in `GroqService` (tool calling API)
- [ ] Implement parallel tool execution
- [ ] Add structured data formatting for LLM synthesis
- [ ] Write unit tests for each tool
- [ ] Add error handling for tool failures

### Groq Synthesis
- [ ] Implement `GroqService.synthesize()` for natural language generation
- [ ] Create synthesis prompt template
- [ ] Add structured data → narrative conversion
- [ ] Test synthesis quality vs Gemini (A/B comparison)
- [ ] Optimize prompt for conciseness and accuracy

### Model-Specific Handlers
- [ ] **BILLING_QUERY**: SQL tools → Groq synthesis
- [ ] **POLICY_QUERY**: Vector search → Gemini RAG (existing)
- [ ] **SMALL_TALK**: Direct Groq response (no tools)
- [ ] **UNKNOWN**: Full Gemini flow (current implementation)

### Response Caching
- [ ] Add post-response cache write with embedding
- [ ] Implement intent-based TTL selection
- [ ] Add metadata tracking (model_used, intent, cache_hit)
- [ ] Ensure cache write doesn't block response

---

## Phase 4: Fallback & Reliability (Week 4-5)

### Multi-Tier Fallback Chain
- [ ] Implement try-catch hierarchy:
  1. Primary orchestrated flow
  2. Gemini-only fallback
  3. Database context only (no LLM)
  4. Vector search only
  5. Error message
- [ ] Add logging at each fallback stage
- [ ] Implement circuit breaker for Groq failures
- [ ] Add health check endpoint for model availability
- [ ] Test all fallback scenarios

### Error Handling
- [ ] Add graceful degradation for Groq rate limits
- [ ] Handle Gemini quota exhaustion (existing)
- [ ] Add retry logic with exponential backoff
- [ ] Implement user-friendly error messages
- [ ] Log all errors with correlation IDs

### Rate Limiting
- [ ] Keep existing per-user daily query limit
- [ ] Add per-model rate limit tracking
- [ ] **Track confidence scores distribution**
- [ ] **Track LLM verification pass/fail rate**

### Logging Enhancements
- [ ] Add structured logging for each routing decision
- [ ] Log intent classification results with confidence
- [ ] Log cache hits/misses with similarity scores
- [ ] **Log LLM verification results (pass/fail/skip)**
- [ ] Log model selection and execution time
- [ ] Add correlation IDs for trace debugging
- [ ] **Log SQL tools executed with parameters**
- [ ] **Log event-driven cache invalidations**

### Dashboard Endpoints
- [ ] `GET /api/ai-assistant/stats/intent-distribution`
- [ ] `GET /api/ai-assistant/stats/model-usage`
- [ ] `GET /api/ai-assistant/stats/cache-performance`
- [ ] `GET /api/ai-assistant/stats/cost-metrics`
- [ ] Protect endpoints with admin role

### **Admin Trace UI (NEW - Critical for Debugging)**
- [ ] **Create `/admin/ai-trace` page with query table**
- [ ] **Implement search by query text, user, intent**
- [ ] **Add expandable trace details view**
- [ ] **Show full routing decision tree:**
  - [ ] Cache checked? Hit? Verified?
  - [ ] Intent + Confidence
  - [ ] Tools executed + results
  - [ ] Model used + response time
- [ ] **Add CSV export for analysis**
- [ ] **Implement real-time metrics dashboard:**
  - [ ] Intent distribution pie chart
  - [ ] Model usage bar chart
  - [ ] Performance metrics (p50/p95/p99)
  - [ ] Error rate tracking
- [ ] **Add correlation ID search**
- [ ] **Implement query replay functionality**
- [ ] **Add user feedback collection (thumbs up/down)**
- [ ] **Add alerting for anomalies (>50% UNKNOWN intent)**
- [ ] Track fallback rate and reasons
- [ ] Track quota usage per model

### Logging Enhancements
- [ ] Add structured logging for each routing decision
- [ ] Log intent classification results with confidence
- [ ] Log cache hits/misses with similarity scores
- [ ] Log model selection and execution time
- [ ] Add correlation IDs for trace debugging

### Dashboard Endpoints
- [ ] `GET /api/ai-assistant/stats/intent-distribution`
- [ ] `GET /api/ai-assistant/stats/model-usage`
- [ ] `GET /api/ai-assistant/stats/cache-performance`
- [ ] `GET /api/ai-assistant/stats/cost-metrics`
- [ ] Protect endpoints with admin role

---

## Phase 6: Testing & Validation (Week 6)

### Unit Tests
- [ ] Semantic cache hit/miss logic (90% coverage)
- [ ] Intent classification with various inputs
- [ ] Router decision tree coverage
- [ ] SQL tool execution and error handling
- [ ] Fallback chain activation
- [ ] Cache invalidation logic

### Integration Tests
- [ ] End-to-end query flow with real API keys (test mode)
- [ ] Cache warm-up and retrieval
- [ ] Multi-model routing with actual responses
- [ ] Fallback chain with simulated failures
- [ ] Rate limit enforcement
- [ ] Cache invalidation on data mutations

### Load Tests
- [ ] 100 concurrent queries performance
- [ ] Cache warming scenario (1000 queries)
- [ ] Model unavailability simulation
- [ ] Quota exhaustion handling
- [ ] Memory leak testing under sustained load

### Quality Assurance
- [ ] Manually test 100 diverse queries
- [ ] Compare response quality: old vs new system
- [ ] Verify billing query accuracy (SQL vs RAG)
- [ ] Test multilingual queries (Vietnamese + English)
- [ ] Edge case testing (empty query, very long query, special characters)
- [ ] **Test Vietnamese-specific edge cases:**
  - [ ] Diacritics variations (có/co, điện/dien)
  - [ ] Negation detection (đã đóng/chưa đóng)
  - [ ] Building terminology (sổ hồng, tạm trú, phí bảo trì)
- [ ] **Security testing:**
  - [ ] SQL injection attempts
  - [ ] Malicious tool selection attempts
  - [ ] Unauthorized cache access
- [ ] **Cache verification testing:**
  - [ ] False positive rate with LLM verification
  - [ ] Performance impact of verification step
  - [ ] Verification accuracy on Vietnamese queries

---

## Phase 7: Deployment & Rollout (Week 6-7)

### Shadow Mode (Week 6)
- [ ] Deploy to staging environment
- [ ] Run dual-write: log new system results without serving
- [ ] Collect intent classification accuracy data
- [ ] Compare response quality with baseline
- [ ] Analyze performance and cost metrics
- [ ] Fix any issues discovered

### Canary Release (Week 7)
- [ ] Add feature flag `AI_ORCHESTRATION_ENABLED`
- [ ] Enable for 10% of users (admin role only)
- [ ] Monitor error rates, response times, user feedback
- [ ] Collect 7 days of production data
- [ ] Present metrics review to stakeholders

### Gradual Rollout (Week 8)
- [ ] Increase to 25% of users
- [ ] Monitor for 2 days, verify stability
- [ ] Increase to 50% of users
- [ ] Monitor for 2 days, verify stability
- [ ] Increase to 75% of users
- [ ] Monitor for 2 days, verify stability
- [ ] Enable for 100% of users

### Rollback Plan
- [ ] Document rollback procedure (disable feature flag)
- [ ] Test rollback in staging
- [ ] Define rollback criteria (error rate > 5%, p95 > 10s)
- [ ] Assign on-call engineer for monitoring

---

## Phase 8: Optimization & Documentation (Week 8+)

### Performance Tuning
- [ ] Analyze slow queries (p99 > 5s)
- [ ] Optimize SQL tool queries with indexes
- [ ] Tune cache similarity threshold based on false positive rate
- [ ] Optimize Groq/Gemini prompts for token efficiency
- [ ] Implement prompt caching where applicable *(promoted to Phase 5)*
- [ ] Fine-tune intent classifier on production data
- [ ] Add more SQL tools (maintenance, parking, amenities)
- [ ] Implement ACTION intent handlers (create incident, pay invoice)
- [ ] Multi-turn conversation context tracking
- [ ] Voice input support
- [ ] Analytics dashboard UI for non-technical staff
- [ ] **Automated retraining pipeline based on user feedback**
- [ ] **A/B testing framework for prompt variations**
- [ ] **Confidence calibration using production data**
- [ ] Update README.md with new architecture section
- [ ] Write developer guide for adding new SQL tools

### Future Enhancements (Backlog)
- [ ] Streaming responses for long-form answers
- [ ] User feedback mechanism for misclassified intents
- [ ] Fine-tune intent classifier on production data
- [ ] Add more SQL tools (maintenance, parking, amenities)
- [ ] Implement ACTION intent handlers (create incident, pay invoice)
- [ ] Multi-turn conversation context tracking
- [ ] Voice input support
- [ ] Analytics dashboard UI for non-technical staff

---

## Validation Checklist

Before marking proposal as complete:

- [ ] All database migrations applied successfully
- [ ] Zero test failures in CI/CD
- [ ] API documentation updated and validated
- [ ] Performance benchmarks meet targets:
  - [ ] <1s response for 80% of queries
  - [ ] 30%+ cache hit rate
  - [ ] 80% reduction in Gemini API calls
- [ ] Cost analysis validated with 7 days of production data
- [ ] No degradation in answer quality (user satisfaction survey)
- [ ] Monitoring alerts configured for:
  - [ ] High error rate (>5%)
  - [ ] Slow responses (p95 > 10s)
  - [ ] Low cache hit rate (<20%)
  - [ ] High model costs (>$2/day)
- [ ] Security review passed (API key handling, SQL injection prevention)
- [ ] Accessibility review for new dashboard endpoints
- [ ] Knowledge transfer completed to support team
