-- ============================================================
-- ARQALUM LEADS TRACKING — Supabase schema
-- Run once in Supabase Studio > SQL Editor
-- Project: fneppfjeywhayknrgahe
-- Creates: arqalum_leads table + indexes + read/insert RLS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.arqalum_leads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  lead_ref VARCHAR(12) NOT NULL,
  click_type VARCHAR(30) NOT NULL, -- pageview | whatsapp_click | call_click | form_start | form_submit | scroll_25 | scroll_50 | scroll_75 | scroll_100 | gallery_click | proof_cta
  page_path VARCHAR(100),
  landing_version VARCHAR(30),
  gclid TEXT,
  gbraid TEXT,
  wbraid TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_term TEXT,
  utm_content TEXT,
  referrer TEXT,
  session_id VARCHAR(60) NOT NULL,
  time_on_page_ms INT,
  scroll_depth_pct INT,
  user_agent TEXT,
  device_type VARCHAR(20),
  screen_size VARCHAR(20),
  language VARCHAR(10),
  extra JSONB
);

CREATE INDEX IF NOT EXISTS idx_arqalum_leads_created ON public.arqalum_leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_arqalum_leads_click_type ON public.arqalum_leads(click_type);
CREATE INDEX IF NOT EXISTS idx_arqalum_leads_gclid ON public.arqalum_leads(gclid) WHERE gclid IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_arqalum_leads_session ON public.arqalum_leads(session_id);
CREATE INDEX IF NOT EXISTS idx_arqalum_leads_ref ON public.arqalum_leads(lead_ref);

-- Enable RLS (required by Supabase defaults; service_role bypasses it)
ALTER TABLE public.arqalum_leads ENABLE ROW LEVEL SECURITY;

-- Allow authenticated dashboard reads (optional, for monitoring)
DROP POLICY IF EXISTS "Allow authenticated read" ON public.arqalum_leads;
CREATE POLICY "Allow authenticated read" ON public.arqalum_leads
  FOR SELECT TO authenticated USING (true);

-- ============================================================
-- VIEWS for quick analysis
-- ============================================================

CREATE OR REPLACE VIEW public.arqalum_leads_today AS
SELECT
  created_at,
  click_type,
  page_path,
  utm_term,
  utm_campaign,
  gclid,
  device_type,
  session_id,
  lead_ref
FROM public.arqalum_leads
WHERE created_at::date = CURRENT_DATE
ORDER BY created_at DESC;

CREATE OR REPLACE VIEW public.arqalum_sessions AS
SELECT
  session_id,
  MIN(created_at) AS session_start,
  MAX(created_at) AS session_end,
  EXTRACT(EPOCH FROM (MAX(created_at) - MIN(created_at))) AS duration_s,
  COUNT(*) AS event_count,
  MAX(scroll_depth_pct) AS max_scroll,
  BOOL_OR(click_type = 'whatsapp_click') AS clicked_whatsapp,
  BOOL_OR(click_type = 'call_click') AS clicked_call,
  BOOL_OR(click_type = 'form_submit') AS submitted_form,
  MAX(gclid) AS gclid,
  MAX(utm_term) AS keyword,
  MAX(device_type) AS device
FROM public.arqalum_leads
GROUP BY session_id
ORDER BY session_start DESC;

-- Quick check query (run after deploy):
-- SELECT * FROM arqalum_leads_today LIMIT 20;
-- SELECT * FROM arqalum_sessions WHERE clicked_whatsapp LIMIT 20;
