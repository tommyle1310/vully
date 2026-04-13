# Technical Design: Agentic Multi-Model AI Orchestration

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        AiAssistantService                        │
│                         (Orchestrator)                           │
└────────────┬────────────────────────────────────────────────────┘
             │
             ├─── 1. Semantic Cache Check (pgvector similarity)
             │    ├─ Hit (>0.95) → Return cached response
             │    └─ Miss → Continue
             │
             ├─── 2. Intent Classification (Groq Llama 3)
             │    ├─ BILLING_QUERY
             │    ├─ POLICY_QUERY
             │    ├─ ACTION_REQUEST
             │    └─ SMALL_TALK
             │
             ├─── 3. Route by Intent
             │    │
             │    ├─ BILLING_QUERY
             │    │   ├─ AiAssistantSearchService (SQL queries)
             │    │   └─ Groq synthesis (cheap, fast)
             │    │
             │    ├─ POLICY_QUERY
             │    │   ├─ DocumentService (vector search)
             │    │   └─ Gemini (complex reasoning, RAG)
             │    │
             │    ├─ ACTION_REQUEST
             │    │   └─ Reserved for future (incident creation, etc.)
             │    │
             │    └─ SMALL_TALK
             │        └─ Groq (direct response)
             │
             └─── 4. Cache Response (with embedding)
```

## Component Design

### 1. Semantic Cache System

**Purpose**: Eliminate redundant LLM calls for previously answered questions

**Implementation**:
```typescript
// New table column
model chat_queries {
  // ... existing fields
  response_embedding Unsupported("vector(768)")?
  
  // NEW: Enhanced tracing fields
  intent_confidence Decimal?
  cache_verified Boolean @default(false)
  cache_similarity Decimal?
  tools_executed Json?
  model_time_ms Int?
  total_time_ms Int?
  correlation_id String? @unique
  error_during_routing Boolean @default(false)
  fallback_used String?
}

// NEW: User feedback table
model chat_query_feedback {
  id String @id @default(cuid())
  chat_query_id String
  user_id String
  feedback_type String // "helpful" | "unhelpful"
  reason String? // "wrong_information" | "irrelevant" | "unclear"
  comment String?
  created_at DateTime @default(now())
  
  chat_query chat_queries @relation(fields: [chat_query_id], references: [id], onDelete: Cascade)
  user users @relation(fields: [user_id], references: [id], onDelete: Cascade)
  
  @@index([chat_query_id])
  @@index([user_id])
  @@map("chat_query_feedback")
}

// Cache lookup WITH LLM VERIFICATION
async checkSemanticCache(queryEmbedding: number[]): Promise<CachedResponse | null> {
  const cached = await prisma.$queryRaw`
    SELECT query, response, created_at, similarity
    FROM chat_queries
    WHERE response_embedding IS NOT NULL
      AND created_at > NOW() - INTERVAL '7 days'
    ORDER BY response_embedding <=> ${queryEmbedding}::vector
    LIMIT 1
  `;
  
  if (cached[0] && cached[0].similarity > 0.95) {
    // CRITICAL: Verify with LLM before returning
    const isEquivalent = await this.groqService.verifySementicEquivalence(
      cached[0].query,
      newQuery
    );
    
    if (isEquivalent) {
      return { ...cached[0], cache_verified: true };
    } else {
      this.logger.warn(`Cache similarity ${cached[0].similarity} but LLM verification failed`);
      return null;
    }
  }
  return null;
}
```

**Cache Strategy**:
| Query Type | TTL | Invalidation Trigger |
|------------|-----|---------------------|
| Policy questions | 7 days | BuildingPolicy update |
| Apartment data | 1 day | Apartment/Contract update |
| Billing queries | 6 hours | Invoice/Payment creation |
| General knowledge | 30 days | Manual only |

**Trade-offs**:
- ✅ **Pro**: 30-40% cache hit rate = massive cost savings
- ✅ **Pro**: Instant responses (<50ms)
- ⚠️ **Con**: Stale data risk (mitigated by TTL + invalidation)
- ⚠️ **Con**: Storage cost (~4KB per cached query)

---

### 2. Intent Classification Layer

**Purpose**: Route queries to the optimal model/strategy

**Groq Integration**:
```typescript
// apps/api/src/modules/ai-assistant/groq.service.ts
@Injectable()
export class GroqService {
  async classifyIntent(query: string): Promise<IntentResult> {
    const completion = await this.groq.chat.completions.create({
      model: 'llama-3.1-8b-instant', // 700 tokens/sec, $0.05/1M tokens
      messages: [
        {
          role: 'system',
          content: INTENT_CLASSIFIER_PROMPT, // ~200 tokens with Vietnamese examples
        },
        { role: 'user', content: query },
      ],
      temperature: 0.1,
      max_tokens: 50,
    });
    
    const result = parseIntentFromResponse(completion);
    
    // CRITICAL: Check confidence threshold
    if (result.confidence < 0.75) {
      this.logger.warn(`Low confidence ${result.confidence} for query: ${query.substring(0, 50)}`);
      return { intent: QueryIntent.UNKNOWN, confidence: result.confidence };
    }
    
    return result;
  }
  
  // NEW: LLM verification for cache hits
  async verifySementicEquivalence(query1: string, query2: string): Promise<boolean> {
    const completion = await this.groq.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      messages: [
        {
          role: 'system',
          content: 'Are these two questions semantically equivalent? Consider negations carefully. Answer only YES or NO.',
        },
        {
          role: 'user',
          content: `Q1: ${query1}\nQ2: ${query2}`,
        },
      ],
      temperature: 0,
      max_tokens: 5,
    });
    
    const answer = completion.choices[0]?.message?.content?.trim().toUpperCase();
Vietnamese terminology understanding:
- "Phí bảo trì", "tiền điện", "tiền nước" → BILLING_QUERY
- "Sổ hồng", "tạm trú", "quy định" → POLICY_QUERY
- "Báo cáo", "khiếu nại" → ACTION_REQUEST

Examples:
- "How much do I owe?" → BILLING_QUERY (confidence: 0.95)
- "Tiền điện tháng 3 là bao nhiêu?" → BILLING_QUERY (confidence: 0.92)
- "What are the pet rules?" → POLICY_QUERY (confidence: 0.90)
- "Quy định về nuôi thú cưng?" → POLICY_QUERY (confidence: 0.88)
- "Report broken AC" → ACTION_REQUEST (confidence: 0.85)
- "Hello" → SMALL_TALK (confidence: 0.98)

IMPORTANT: If confidence < 0.75, return UNKNOWN.

Respond with JSON: {"intent": "...", "confidence": 0.95, "entities": {...}
enum QueryIntent {
  BILLING_QUERY = 'BILLING_QUERY',      // Invoice, payment, balance questions
  POLICY_QUERY = 'POLICY_QUERY',        // Building rules, regulations
  ACTION_REQUEST = 'ACTION_REQUEST',    // "Create incident", "Pay invoice"
  SMALL_TALK = 'SMALL_TALK',            // Greetings, thanks
  UNKNOWN = 'UNKNOWN',                  // Fallback to Gemini
}

interface IntentResult {
  intent: QueryIntent;
  confidence: number;  // 0.0 - 1.0
  entities?: {         // Extracted parameters
    buildingName?: string;
    apartmentId?: string;
    dateRange?: [Date, Date];
  };
}
```

**System Prompt** (kept minimal for speed):
```
Classify user intent into one of: BILLING_QUERY, POLICY_QUERY, ACTION_REQUEST, SMALL_TALK, UNKNOWN.

Examples:
- "How much do I owe?" → BILLING_QUERY
- "What are the pet rules?" → POLICY_QUERY
- "Report broken AC" → ACTION_REQUEST
- "Hello" → SMALL_TALK

Respond with JSON: {"intent": "...", "confidence": 0.95}
```

**Performance**:
- Classification time: 200-400ms (Groq)
- Cost: ~$0.00001 per classification
- Fallback: If Groq fails, default to `UNKNOWN` → route to Gemini

---

### 3. Multi-Model Orchestration

**Strategy Table**:

| Intent | Model | Tool | Cost per Query | Avg Response Time |
|--------|-------|------|----------------|-------------------|
| **BILLING_QUERY** | Groq | SQL Tool | $0.0001 | 600ms |
| **POLICY_QUERY** | Gemini | RAG (pgvector) | $0.002 | 2-3s |
| **ACTION_REQUEST** | N/A | Reserved | N/A | N/A |
| **SMALL_TALK** | Groq | None | $0.00005 | 300ms |
| **UNKNOWN** | Gemini | Full context | $0.003 | 3-5s |

**Routing Logic**:
```typescript
async chat(dto: ChatQueryDto): Promise<ChatResponse> {
  // 1. Check semantic cache
  const queryEmbedding = await this.embeddingService.embed(dto.query);
  const cached = await this.checkSemanticCache(queryEmbedding);
  if (cached) {
    return this.formatCachedResponse(cached);
  }

  // 2. Classify intent
  const intentResult = await this.groqService.classifyIntent(dto.query);
  
  // 3. Route
  let response: ChatResponse;
  switch (intentResult.intent) {
    case QueryIntent.BILLING_QUERY:
      response = await this.handleBillingQuery(dto, intentResult);
      break;
    case QueryIntent.POLICY_QUERY:
      response = await this.handlePolicyQuery(dto, intentResult);
      break;
    case QueryIntent.SMALL_TALK:
      response = await this.handleSmallTalk(dto, intentResult);
      break;
    default:
      response = await this.handleFallback(dto); // Current Gemini flow
  }
  
  // 4. Cache response
  await this.cacheResponse(dto.query, queryEmbedding, response);
  
  return response;
}
```

---

### 4. SQL Tool System with STRICT SECURITY
interface SqlTool {
  name: string;
  description: string;
  parameters: object;
  execute: (params: any) => Promise<any>;
  readonly: true; // MUST be true for all tools
}

const BILLING_TOOLS: SqlTool[] = [
  {
    name: 'get_user_balance',
    description: 'Get outstanding balance for a user',
    parameters: { userId: 'string' },
    readonly: true, // ENFORCED
    execute: async ({ userId }) => {
      // CRITICAL: Use Prisma, NEVER raw SQL from LLM
      return await prisma.invoices.aggregate({
        where: { 
          apartment: { 
            contracts: { 
              some: { tenant_id: userId, status: 'active' } 
            } 
          },
          status: { in: ['pending', 'overdue'] }
        },
        _sum: { total_amount: true },
      });
    },
  },
  // ... more read-only tools
];

// SECURITY: LLM outputs JSON, we execute predefined method
async executeBillingQuery(
  query: string,
  userId: string
): Promise<string> {
  // Groq selects which tool(s) to call
  const toolSelection = await this.groqService.selectTools(query, BILLING_TOOLS);
  
  // CRITICAL VALIDATION
  for (const selected of toolSelection) {
    if (!BILLING_TOOLS.find(t => t.name === selected.tool_name)) {
      throw new Error(`Unauthorized tool: ${selected.tool_name}`);
    }
    if (!BILLING_TOOLS.find(t => t.name === selected.tool_name)?.readonly) {
      throw new Error(`Non-readonly tool blocked: ${selected.tool_name}`);
    }
  }
  
  // Execute tools in parallel (all pre-validated)
  const results = await Promise.all(
    toolSelection.map(s => {
      const tool = BILLING_TOOLS.find(t => t.name === s.tool_name);
      // Inject userId from JWT, never trust LLM for user context
      return tool.execute({ ...s.parameters, userId });
    })
  );
  
  // Return structured data
  return JSON.stringify(results);
}
```

**SECURITY GUARANTEES**:
1. ✅ LLM NEVER generates SQL - only selects from predefined tools
2. ✅ All tools use Prisma (parameterized queries)
3. ✅ Runtime validation: tool name MUST exist in allowlist
4. ✅ Runtime validation: tool MUST have `readonly: true`
5. ✅ User context (userId) injected from JWT, not LLM output
6. ✅ No INSERT/UPDATE/DELETE/DROP tools exist const toolSelection = await this.groqService.selectTools(query, BILLING_TOOLS);
  
  // Execute tools in parallel
  const results = await Promise.all(
    toolSelection.map(t => t.tool.execute(t.parameters))
  );
  
  // Return structured data
  return JSON.stringify(results);
}
```

**Groq Synthesis**:
```typescript
async handleBillingQuery(dto: ChatQueryDto, intent: IntentResult) {
  const sqlData = await this.searchService.executeBillingQuery(
    dto.query,
    intent.entities
  );
  
  // Use Groq to synthesize natural language response
  const response = await this.groqService.synthesize(dto.query, sqlData);
  
  return {
    response: response.text,
    sources: [{ title: 'Database Query', category: 'billing' }],
    metadata: { intent: intent.intent, model: 'groq' },
  };
}
```

---

### 5. Fallback Chain

**Reliability Strategy**:
```typescript
async chat(dto: ChatQueryDto): Promise<ChatResponse> {
  try {
    // Primary flow (with intent routing)
    return await this.orchestratedChat(dto);
  } catch (error) {
    this.logger.error('Primary chat failed', error);
    
    // Fallback 1: Try Gemini directly (current flow)
    try {
      return await this.geminiChat(dto);
    } catch (geminiError) {
      this.logger.error('Gemini fallback failed, trying database context');
      
      // Fallback 2: Database context only (no LLM)
      const dbContext = await this.searchService.queryDatabaseForContext(dto.query);
      if (dbContext) {
        return this.buildDatabaseOnlyResponse(dbContext);
      }
      
      // Fallback 3: Vector search only
      const docs = await this.documentService.searchDocuments(dto.query, 3);
      if (docs.length > 0) {
        return this.buildDocumentOnlyResponse(docs);
      }
      
      // Final fallback: Error message
      throw new ServiceUnavailableException(
        'AI assistant is temporarily unavailable. Please try again later.'
      );
    }
  }
}
```

---

## Data Model Changes

### Database Migration

```sql
-- Add semantic cache support
ALTER TABLE chat_queries
ADD COLUMN response_embedding vector(768);

-- Index for similarity search
CREATE INDEX idx_chat_queries_embedding 
ON chat_queries 
USING ivfflat (response_embedding vector_cosine_ops)
WITH (lists = 100);

-- Add metadata tracking
ALTER TABLE chat_queries
ADD COLUMN intent VARCHAR(50),
ADD COLUMN model_used VARCHAR(50),
ADD COLUMN cache_hit BOOLEAN DEFAULT false,
ADD COLUMN routing_time_ms INTEGER;
```

### Updated Schema

```prisma
model chat_queries {
  id                  String    @id @default(cuid())
  user_id             String
  query               String
  response            String
  source_docs         String[]
  tokens_used         Int       @default(0)
  response_time       Int       // milliseconds
  
  // NEW: Agentic features
  response_embedding  Unsupported("vector(768)")?
  intent              String?   // BILLING_QUERY, POLICY_QUERY, etc.
  model_used          String?   // groq, gemini
  cache_hit           Boolean   @default(false)
  routing_time_ms     Int?      // Time spent on intent classification
  
  created_at          DateTime  @default(now())
  users               users     @relation(fields: [user_id], references: [id], onDelete: Cascade)
  
  @@index([user_id, created_at])
  @@index([response_embedding(ops: raw("vector_cosine_ops"))]) // Semantic cache
  @@map("chat_queries")
}
```

---

## Configuration

### Environment Variables

```bash
# Existing
GEMINI_API_KEY=xxx

# New
GROQ_API_KEY=xxx
AI_CACHE_ENABLED=true
AI_CACHE_SIMILARITY_THRESHOLD=0.95
AI_INTENT_CONFIDENCE_THRESHOLD=0.75
AI_FALLBACK_TO_GEMINI=true
```

### Feature Flags

```typescript
// apps/api/src/config/ai.config.ts
export const aiConfig = registerAs('ai', () => ({
  cache: {
    enabled: process.env.AI_CACHE_ENABLED === 'true',
    similarityThreshold: parseFloat(process.env.AI_CACHE_SIMILARITY_THRESHOLD || '0.95'),
    ttl: {
      policy: 7 * 24 * 60 * 60, // 7 days
      billing: 6 * 60 * 60,      // 6 hours
      general: 30 * 24 * 60 * 60, // 30 days
    },
  },
  routing: {
    intentConfidenceThreshold: 0.75,
    fallbackToGemini: process.env.AI_FALLBACK_TO_GEMINI !== 'false',
  },
  models: {
    gemini: {
      model: 'gemini-2.0-flash',
      apiKey: process.env.GEMINI_API_KEY,
    },
    groq: {
      model: 'llama-3.1-8b-instant',
      apiKey: process.env.GROQ_API_KEY,
    },
  },
}));
```

---

## Monitoring & Observability

### Metrics to Track

```typescript
// apps/api/src/modules/ai-assistant/ai-assistant.telemetry.ts
export class AiTelemetry {
  // Cost tracking
  trackModelUsage(model: 'groq' | 'gemini', tokens: number, cost: number);
  
  // Performance
  trackResponseTime(intent: string, duration: number);
  trackCacheHitRate();
  
  // Quality
  trackIntentConfidence(intent: string, confidence: number);
  trackFallbackRate();
  
  // Business metrics
  trackQueriesPerUser(userId: string);
  trackQuotaUsage();
}
```

### Dashboard
- Intent distribution pie chart
- Model usage over time
- Cache hit rate trend
- Average response time by intent
- Cost per day/week/month

---

## Testing Strategy

### Unit Tests
- Semantic cache hit/miss logic
- Intent classification with mock Groq responses
- Router decision tree
- SQL tool execution
- Fallback chain

### Integration Tests
- End-to-end query flow with real models (using test API keys)
- Cache invalidation on data changes
- Quota exhaustion handling
- Multi-model fallback

### Load Tests
- 100 concurrent queries
- Cache warm-up scenarios
- Model availability failures

---

## Rollout Plan

### Phase 1: Shadow Mode (Week 1-2)
- Run new system alongside old system
- Log intent classifications + routing decisions
- Compare response quality
- **Do not serve to users yet**

### Phase 2: Canary Release (Week 3)
- Enable for 10% of users (admins only)
- Monitor metrics closely
- Gather feedback on response quality

### Phase 3: Gradual Rollout (Week 4-5)
- 25% → 50% → 75% → 100%
- Feature flag for instant rollback

### Phase 4: Optimization (Week 6+)
- Tune similarity thresholds
- Optimize prompts
- Add more SQL tools

---

## Cost Analysis

### Current System (1000 queries/day)
- Gemini API: 1000 queries × $0.002 = **$2.00/day**
- Total: **$60/month**

### Agentic System (1000 queries/day)
| Category | Queries/day | Cost per Query | Total |
|----------|-------------|----------------|-------|
| Cache hits | 350 (35%) | $0 | $0 |
| Billing (Groq + SQL) | 300 (30%) | $0.0001 | $0.03 |
| Small talk (Groq) | 200 (20%) | $0.00005 | $0.01 |
| Policy (Gemini RAG) | 150 (15%) | $0.002 | $0.30 |
| **Total** | **1000** | - | **$0.34/day** |

**Savings**: $60/month → $10/month = **83% cost reduction**

---

## Open Questions for Review

1. **Streaming**: Should we implement SSE streaming for long Gemini responses?
2. **Cache Invalidation**: How to handle bulk policy updates affecting many cached queries?
3. **Intent Feedback**: Should we let users flag misclassified intents for improvement?
4. **Tool Expansion**: What other SQL tools should we add (maintenance schedules, parking availability)?
5. **Groq Limits**: What's our fallback if Groq rate limits are hit (currently free tier)?
