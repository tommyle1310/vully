# Upgrade AI Assistant to Agentic Multi-Model Orchestration

## Problem Statement

The current AI assistant implementation has critical inefficiencies:

1. **Cost Inefficiency**: Every query consumes expensive Gemini API quota, even for simple questions or cached answers
2. **Slow Response Times**: RAG-based responses take 2-5 seconds due to unnecessary vector searches and LLM calls
3. **No Intent Awareness**: The system treats all queries the same, missing opportunities to optimize routing
4. **Quota Vulnerability**: When Gemini quota is exhausted, the system degrades to basic fallback responses
5. **Accuracy Issues**: Financial/billing queries should use structured SQL, not RAG embeddings

**Current Flow**:
```
User Query → Vector Search → Gemini (every time) → Response
```

**Problems**:
- 100% of queries hit Gemini API (expensive)
- No differentiation between "Hello" and complex policy questions
- Financial data routed through RAG instead of direct SQL queries
- No caching layer for repeated questions

## Proposed Solution

Transform the passive RAG chatbot into an **Agentic Multi-Model Orchestration System** with intelligent routing:

```
User Query → Semantic Cache Check → Intent Classification (Groq) → Dynamic Router:
  ├─ BILLING_QUERY → SQL Tool → Groq (synthesis)
  ├─ POLICY_QUERY → Vector Search → Gemini (complex reasoning)
  ├─ SMALL_TALK → Groq (fast, cheap)
  └─ CACHED → Return immediately
```

### Key Improvements

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Avg Response Time | 2-5s | <1s (80% of queries) | 75% faster |
| Gemini API Calls | 100% | ~20% | 80% reduction |
| Cost per 1000 queries | ~$2.00 | ~$0.40 | 80% savings |
| Cache Hit Rate | 0% | 30-40% | New capability |
| Financial Query Accuracy | ~85% | 100% | Direct SQL |

### Architecture Components

1. **Semantic Cache Layer**: Vector-based similarity matching (>0.95) for previously answered questions
2. **Intent Router**: Groq-powered classification (BILLING, POLICY, ACTION, SMALL_TALK)
3. **Multi-Model Strategy**:
   - **Groq (Llama 3)**: Intent classification, simple queries, synthesis (fast, cheap)
   - **Gemini**: Complex policy questions requiring RAG (accurate, expensive)
4. **SQL Tool System**: Direct database queries for financial/billing data (100% accuracy)
5. **Fallback Chain**: Graceful degradation when primary models fail

## Business Value

- **Cost Reduction**: 80% decrease in LLM API costs without sacrificing quality
- **Performance**: Sub-second response times improve user experience
- **Reliability**: Multi-model fallback prevents total outages
- **Scalability**: Can handle 10x query volume within same budget
- **Accuracy**: Financial queries use authoritative database, not embeddings

## Technical Strategy

### Phase 1: Semantic Cache (Weeks 1-2)
- Add `response_embedding` to `chat_queries` table (pgvector)
- Implement similarity search with 0.95 threshold
- Cache TTL: 7 days for policy, 1 day for data queries

### Phase 2: Intent Classification (Weeks 2-3)
- Integrate Groq SDK
- Build intent classifier with predefined categories
- Add routing logic with confidence thresholds

### Phase 3: Multi-Model Orchestration (Weeks 3-5)
- Refactor AiAssistantService into orchestrator pattern
- Implement SQL tool system for structured queries
- Add model selection logic based on intent + complexity

### Phase 4: Monitoring & Optimization (Week 6)
- Add telemetry (intent distribution, model usage, cache hit rate)
- Optimize prompts for each model
- Fine-tune routing thresholds

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Groq rate limits | Service degradation | Fallback to Gemini for classification |
| Intent misclassification | Poor routing | Confidence thresholds + manual override |
| Cache staleness | Outdated answers | TTL policies + invalidation on data changes |
| Increased complexity | Harder debugging | Comprehensive logging + tracing correlation IDs |

## Success Criteria

- [ ] 80% reduction in Gemini API calls
- [ ] <1s response time for 80% of queries
- [ ] 30%+ cache hit rate within 2 weeks of launch
- [ ] Zero degradation in answer quality (user feedback)
- [ ] 100% uptime maintained with fallback chain

## Related Changes

- Complements `add-accounting-module` (trust accounting queries)
- Depends on existing `ai-assistant` module infrastructure
- Foundation for future agent capabilities (incident creation, payment reminders)

## Open Questions

1. Should we implement streaming responses for long-form answers?
2. What's the optimal cache invalidation strategy for policy changes?
3. Should intent classification results be stored for model improvement?
