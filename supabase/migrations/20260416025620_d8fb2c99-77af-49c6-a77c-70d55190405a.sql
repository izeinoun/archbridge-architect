
-- Add diagram_description to generated_documents
ALTER TABLE public.generated_documents ADD COLUMN IF NOT EXISTS diagram_description TEXT;

-- Search performance indexes
CREATE INDEX IF NOT EXISTS idx_documents_project ON public.documents(project_id);
CREATE INDEX IF NOT EXISTS idx_generated_docs_project ON public.generated_documents(project_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_project ON public.chat_messages(project_id);
CREATE INDEX IF NOT EXISTS idx_project_members_user ON public.project_members(user_id);
CREATE INDEX IF NOT EXISTS idx_project_members_project ON public.project_members(project_id);
