-- CreateTable
CREATE TABLE "chat_queries" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "query" TEXT NOT NULL,
    "response" TEXT NOT NULL,
    "source_docs" JSONB NOT NULL DEFAULT '[]',
    "tokens_used" INTEGER NOT NULL DEFAULT 0,
    "response_time" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_queries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "chat_queries_user_id_created_at_idx" ON "chat_queries"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "documents_category_idx" ON "documents"("category");

-- CreateIndex
CREATE INDEX "documents_is_active_idx" ON "documents"("is_active");

-- AddForeignKey
ALTER TABLE "chat_queries" ADD CONSTRAINT "chat_queries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
