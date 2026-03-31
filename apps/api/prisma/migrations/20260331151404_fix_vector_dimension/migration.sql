-- Fix document_chunks table: ensure it exists with vector(768) column
-- Drop and recreate to match schema intent (768-dim Gemini embeddings with outputDimensionality)

DO $$
BEGIN
  -- Drop document_chunks if exists (no user data yet, seeding hasn't succeeded)
  DROP TABLE IF EXISTS public.document_chunks CASCADE;

  -- Create documents table if not exists
  CREATE TABLE IF NOT EXISTS public.documents (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    category VARCHAR(100) NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT documents_pkey PRIMARY KEY (id)
  );

  -- (Re)create document_chunks with correct vector(768) dimension
  CREATE TABLE public.document_chunks (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL,
    content TEXT NOT NULL,
    embedding vector(768),
    chunk_index INTEGER NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT document_chunks_pkey PRIMARY KEY (id),
    CONSTRAINT document_chunks_document_id_fkey FOREIGN KEY (document_id)
      REFERENCES public.documents(id) ON DELETE CASCADE ON UPDATE CASCADE
  );
  CREATE INDEX document_chunks_document_id_idx ON public.document_chunks(document_id);
END $$;

-- Also create vector similarity index for fast search
CREATE INDEX IF NOT EXISTS document_chunks_embedding_idx
  ON public.document_chunks
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 10);
