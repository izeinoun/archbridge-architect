-- Add pipeline stage and CRM fields to projects
ALTER TABLE projects ADD COLUMN IF NOT EXISTS pipeline_stage VARCHAR(50) DEFAULT 'discovery';
ALTER TABLE projects ADD COLUMN IF NOT EXISTS crm_deal_id VARCHAR(255);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS crm_synced_at TIMESTAMP WITH TIME ZONE;

-- CRM integrations table
CREATE TABLE IF NOT EXISTS public.crm_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connector_type VARCHAR(50) NOT NULL,
  is_enabled BOOLEAN DEFAULT FALSE,
  config JSONB DEFAULT '{}',
  field_mappings JSONB DEFAULT '{}',
  created_by UUID NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.crm_integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage CRM integrations"
  ON public.crm_integrations FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- CRM sync log table
CREATE TABLE IF NOT EXISTS public.crm_sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id UUID REFERENCES crm_integrations(id) ON DELETE CASCADE,
  project_id UUID,
  sync_type VARCHAR(100) NOT NULL,
  direction VARCHAR(20) DEFAULT 'outbound',
  payload_sent JSONB,
  response_received JSONB,
  status VARCHAR(20) NOT NULL,
  error_message TEXT,
  crm_record_id VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.crm_sync_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view sync logs"
  ON public.crm_sync_log FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert sync logs"
  ON public.crm_sync_log FOR INSERT
  TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Index for analytics queries
CREATE INDEX IF NOT EXISTS idx_activity_log_created_at ON activity_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_projects_pipeline_stage ON projects(pipeline_stage);