
-- Enable pg_trgm for full-text search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Share links table
CREATE TABLE IF NOT EXISTS public.share_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  token VARCHAR(64) UNIQUE NOT NULL,
  created_by UUID NOT NULL,
  title VARCHAR(255),
  description TEXT,
  included_document_ids UUID[] DEFAULT '{}',
  include_diagrams BOOLEAN DEFAULT FALSE,
  expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT TRUE,
  view_count INTEGER DEFAULT 0,
  last_viewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.share_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Project members can view share links"
  ON public.share_links FOR SELECT TO authenticated
  USING (is_project_member(auth.uid(), project_id));

CREATE POLICY "Project members can create share links"
  ON public.share_links FOR INSERT TO authenticated
  WITH CHECK (is_project_member(auth.uid(), project_id) AND auth.uid() = created_by);

CREATE POLICY "Project members can update share links"
  ON public.share_links FOR UPDATE TO authenticated
  USING (is_project_member(auth.uid(), project_id));

CREATE POLICY "Project members can delete share links"
  ON public.share_links FOR DELETE TO authenticated
  USING (is_project_member(auth.uid(), project_id));

-- Activity log table
CREATE TABLE IF NOT EXISTS public.activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  user_id UUID NOT NULL,
  action_type VARCHAR(100) NOT NULL,
  entity_type VARCHAR(100),
  entity_id UUID,
  entity_name VARCHAR(500),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Project members can view activity"
  ON public.activity_log FOR SELECT TO authenticated
  USING (is_project_member(auth.uid(), project_id));

CREATE POLICY "Project members can insert activity"
  ON public.activity_log FOR INSERT TO authenticated
  WITH CHECK (is_project_member(auth.uid(), project_id) AND auth.uid() = user_id);

CREATE INDEX idx_activity_project ON public.activity_log(project_id, created_at DESC);

-- Insight approval columns
ALTER TABLE public.project_insights ADD COLUMN IF NOT EXISTS approval_status JSONB DEFAULT '{}';
ALTER TABLE public.project_insights ADD COLUMN IF NOT EXISTS locked BOOLEAN DEFAULT FALSE;

-- Trigram indexes for full-text search
CREATE INDEX IF NOT EXISTS idx_documents_text_trgm ON public.documents USING gin(extracted_text gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_generated_content_trgm ON public.generated_documents USING gin(content gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_projects_name_trgm ON public.projects USING gin(name gin_trgm_ops);
