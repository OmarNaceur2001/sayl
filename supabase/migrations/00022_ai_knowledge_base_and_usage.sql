-- Stage 2: AI knowledge base (pgvector) + AI usage/cost log.
-- Embeddings: openai/text-embedding-3-small (1536 dimensions).

CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;

-- ============================================================
-- KNOWLEDGE BASE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.kb_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
  kind text NOT NULL DEFAULT 'text' CHECK (kind IN ('faq', 'text', 'csv')),
  language text CHECK (language IS NULL OR language IN ('fr', 'en', 'ar', 'tn')),
  chunk_count integer NOT NULL DEFAULT 0,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id, workspace_id)
);

CREATE TABLE IF NOT EXISTS public.kb_chunks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  document_id uuid NOT NULL,
  position integer NOT NULL DEFAULT 0,
  content text NOT NULL CHECK (char_length(content) BETWEEN 1 AND 4000),
  embedding extensions.vector(1536) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  -- a chunk can only point to a document of the SAME workspace
  FOREIGN KEY (document_id, workspace_id)
    REFERENCES public.kb_documents (id, workspace_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_kb_documents_workspace ON public.kb_documents (workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_kb_chunks_workspace ON public.kb_chunks (workspace_id);
CREATE INDEX IF NOT EXISTS idx_kb_chunks_document ON public.kb_chunks (document_id);
CREATE INDEX IF NOT EXISTS idx_kb_chunks_embedding
  ON public.kb_chunks USING hnsw (embedding extensions.vector_cosine_ops);

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.kb_documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE public.kb_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kb_chunks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view kb documents"
  ON public.kb_documents FOR SELECT USING (is_workspace_member(workspace_id));
CREATE POLICY "Owners and admins can insert kb documents"
  ON public.kb_documents FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = kb_documents.workspace_id AND wm.user_id = auth.uid()
        AND wm.role IN ('owner', 'admin')));
CREATE POLICY "Owners and admins can update kb documents"
  ON public.kb_documents FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = kb_documents.workspace_id AND wm.user_id = auth.uid()
        AND wm.role IN ('owner', 'admin')));
CREATE POLICY "Owners and admins can delete kb documents"
  ON public.kb_documents FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = kb_documents.workspace_id AND wm.user_id = auth.uid()
        AND wm.role IN ('owner', 'admin')));

CREATE POLICY "Members can view kb chunks"
  ON public.kb_chunks FOR SELECT USING (is_workspace_member(workspace_id));
CREATE POLICY "Owners and admins can insert kb chunks"
  ON public.kb_chunks FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = kb_chunks.workspace_id AND wm.user_id = auth.uid()
        AND wm.role IN ('owner', 'admin')));
CREATE POLICY "Owners and admins can delete kb chunks"
  ON public.kb_chunks FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = kb_chunks.workspace_id AND wm.user_id = auth.uid()
        AND wm.role IN ('owner', 'admin')));

-- Retrieval is called by the flow engine with the service role only.
CREATE OR REPLACE FUNCTION public.match_kb_chunks(
  p_workspace_id uuid,
  p_query_embedding extensions.vector(1536),
  p_match_count integer DEFAULT 4,
  p_min_similarity double precision DEFAULT 0
)
RETURNS TABLE (id uuid, document_id uuid, content text, similarity double precision)
LANGUAGE sql STABLE
SET search_path = public, extensions
AS $$
  SELECT c.id, c.document_id, c.content,
         1 - (c.embedding <=> p_query_embedding) AS similarity
  FROM public.kb_chunks c
  WHERE c.workspace_id = p_workspace_id
    AND 1 - (c.embedding <=> p_query_embedding) >= p_min_similarity
  ORDER BY c.embedding <=> p_query_embedding
  LIMIT LEAST(GREATEST(p_match_count, 1), 20);
$$;

REVOKE ALL ON FUNCTION public.match_kb_chunks(uuid, extensions.vector, integer, double precision)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.match_kb_chunks(uuid, extensions.vector, integer, double precision)
  TO service_role;

-- ============================================================
-- AI USAGE LOG (one row per AI call; written by the service role only)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.usage_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  flow_id uuid REFERENCES public.flows(id) ON DELETE SET NULL,
  contact_id uuid REFERENCES public.contacts(id) ON DELETE SET NULL,
  conversation_id uuid REFERENCES public.conversations(id) ON DELETE SET NULL,
  kind text NOT NULL CHECK (kind IN ('ai_response', 'embedding')),
  model text,
  language text CHECK (language IS NULL OR language IN ('fr', 'en', 'ar', 'tn')),
  input_tokens integer NOT NULL DEFAULT 0,
  output_tokens integer NOT NULL DEFAULT 0,
  cost_usd numeric(12, 6),
  status text NOT NULL DEFAULT 'ok' CHECK (status IN ('ok', 'handover', 'failed')),
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_usage_events_workspace_created
  ON public.usage_events (workspace_id, created_at DESC);

ALTER TABLE public.usage_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view usage events"
  ON public.usage_events FOR SELECT USING (is_workspace_member(workspace_id));

REVOKE ALL ON TABLE public.usage_events FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.usage_events TO authenticated;
GRANT ALL ON TABLE public.usage_events TO service_role;
