-- AlterTable: Add AI orchestration tracing fields to chat_queries
ALTER TABLE "chat_queries" ADD COLUMN IF NOT EXISTS "response_embedding" vector(768);
ALTER TABLE "chat_queries" ADD COLUMN IF NOT EXISTS "intent" VARCHAR(50);
ALTER TABLE "chat_queries" ADD COLUMN IF NOT EXISTS "intent_confidence" DECIMAL(3,2);
ALTER TABLE "chat_queries" ADD COLUMN IF NOT EXISTS "cache_checked" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "chat_queries" ADD COLUMN IF NOT EXISTS "cache_hit" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "chat_queries" ADD COLUMN IF NOT EXISTS "cache_verified" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "chat_queries" ADD COLUMN IF NOT EXISTS "cache_similarity" DECIMAL(3,2);
ALTER TABLE "chat_queries" ADD COLUMN IF NOT EXISTS "model_used" VARCHAR(50);
ALTER TABLE "chat_queries" ADD COLUMN IF NOT EXISTS "tools_executed" JSONB DEFAULT '[]'::jsonb;
ALTER TABLE "chat_queries" ADD COLUMN IF NOT EXISTS "routing_time_ms" INTEGER;
ALTER TABLE "chat_queries" ADD COLUMN IF NOT EXISTS "model_time_ms" INTEGER;
ALTER TABLE "chat_queries" ADD COLUMN IF NOT EXISTS "total_time_ms" INTEGER;
ALTER TABLE "chat_queries" ADD COLUMN IF NOT EXISTS "correlation_id" UUID UNIQUE;
ALTER TABLE "chat_queries" ADD COLUMN IF NOT EXISTS "error_during_routing" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "chat_queries" ADD COLUMN IF NOT EXISTS "fallback_used" VARCHAR(50);

-- CreateIndex: Add indexes for AI orchestration fields
CREATE INDEX IF NOT EXISTS "chat_queries_correlation_id_idx" ON "chat_queries"("correlation_id");
CREATE INDEX IF NOT EXISTS "chat_queries_intent_idx" ON "chat_queries"("intent");
CREATE INDEX IF NOT EXISTS "chat_queries_created_at_idx" ON "chat_queries"("created_at");

-- CreateIndex: Add ivfflat index on response_embedding for semantic cache
CREATE INDEX IF NOT EXISTS "chat_queries_embedding_idx" ON "chat_queries" 
USING ivfflat (response_embedding vector_cosine_ops) 
WITH (lists = 100);

-- CreateTable: chat_query_feedback
CREATE TABLE IF NOT EXISTS "chat_query_feedback" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "chat_query_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "feedback_type" VARCHAR(20) NOT NULL,
    "reason" VARCHAR(50),
    "comment" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_query_feedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "chat_query_feedback_chat_query_id_idx" ON "chat_query_feedback"("chat_query_id");
CREATE INDEX IF NOT EXISTS "chat_query_feedback_user_id_idx" ON "chat_query_feedback"("user_id");
CREATE INDEX IF NOT EXISTS "chat_query_feedback_feedback_type_idx" ON "chat_query_feedback"("feedback_type");

-- AddForeignKey
ALTER TABLE "chat_query_feedback" ADD CONSTRAINT "chat_query_feedback_chat_query_id_fkey" 
FOREIGN KEY ("chat_query_id") REFERENCES "chat_queries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "chat_query_feedback" ADD CONSTRAINT "chat_query_feedback_user_id_fkey" 
FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
