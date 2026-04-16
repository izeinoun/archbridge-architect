
CREATE SCHEMA IF NOT EXISTS extensions;
DROP EXTENSION IF EXISTS pg_trgm CASCADE;
CREATE EXTENSION IF NOT EXISTS pg_trgm SCHEMA extensions;

CREATE INDEX IF NOT EXISTS idx_documents_text_trgm ON public.documents USING gin(extracted_text extensions.gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_generated_content_trgm ON public.generated_documents USING gin(content extensions.gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_projects_name_trgm ON public.projects USING gin(name extensions.gin_trgm_ops);
