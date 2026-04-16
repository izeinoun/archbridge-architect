
-- Notifications table
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  project_id UUID,
  type VARCHAR(100) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications"
  ON public.notifications FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own notifications"
  ON public.notifications FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Service role inserts notifications (from edge functions)
CREATE POLICY "Service can insert notifications"
  ON public.notifications FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Add parent_document_id to generated_documents
ALTER TABLE public.generated_documents
  ADD COLUMN parent_document_id UUID REFERENCES public.generated_documents(id);

-- Add missing policies on generated_documents
CREATE POLICY "Project members can insert generated docs"
  ON public.generated_documents FOR INSERT
  TO authenticated
  WITH CHECK (is_project_member(auth.uid(), project_id));

CREATE POLICY "Project members can delete generated docs"
  ON public.generated_documents FOR DELETE
  TO authenticated
  USING (is_project_member(auth.uid(), project_id));

CREATE POLICY "Project members can update generated docs"
  ON public.generated_documents FOR UPDATE
  TO authenticated
  USING (is_project_member(auth.uid(), project_id));
