
-- Add parse_error column to documents
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS parse_error TEXT;

-- Create storage bucket for document uploads
INSERT INTO storage.buckets (id, name, public) VALUES ('documents', 'documents', false);

-- Storage policies: authenticated users can upload to their project folder
CREATE POLICY "Authenticated users can upload documents"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'documents');

CREATE POLICY "Authenticated users can read documents"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'documents');

CREATE POLICY "Authenticated users can delete documents"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'documents');

-- Allow project members to insert insights
CREATE POLICY "Project members can insert insights"
ON public.project_insights FOR INSERT TO authenticated
WITH CHECK (public.is_project_member(auth.uid(), project_id));

-- Allow project members to update insights
CREATE POLICY "Project members can update insights"
ON public.project_insights FOR UPDATE TO authenticated
USING (public.is_project_member(auth.uid(), project_id));

-- Allow project members to delete documents
CREATE POLICY "Project members can delete documents"
ON public.documents FOR DELETE TO authenticated
USING (public.is_project_member(auth.uid(), project_id));

-- Allow updating document parse status (for edge functions via service role)
CREATE POLICY "Project members can update documents"
ON public.documents FOR UPDATE TO authenticated
USING (public.is_project_member(auth.uid(), project_id));
