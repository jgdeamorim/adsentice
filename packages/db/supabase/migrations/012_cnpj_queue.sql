-- ══════════════════════════════════════════════════════════════════
-- ADSENTICE · Migration 012 — CNPJ Queue (ADR-0028)
-- Fila assíncrona para extração de CNPJ de websites com cheerio.
-- Processado por cron worker respeitando rate limits da ReceitaWS.
-- medido=verdade · 2026-07-17
-- ══════════════════════════════════════════════════════════════════

-- CNPJ Queue table
CREATE TABLE IF NOT EXISTS cnpj_queue (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID REFERENCES discovery_listings(id) ON DELETE CASCADE,
  website TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','crawling','extracted','enriched','failed','no_cnpj')),
  attempts INTEGER DEFAULT 0,
  cnpj_raw TEXT,
  cnpj_data JSONB,
  last_error TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  processed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_cnpj_queue_status ON cnpj_queue(status, created_at);
CREATE INDEX IF NOT EXISTS idx_cnpj_queue_lead ON cnpj_queue(lead_id);

-- Add CNPJ columns to discovery_listings
ALTER TABLE discovery_listings ADD COLUMN IF NOT EXISTS cnpj_enriched BOOLEAN DEFAULT false;
ALTER TABLE discovery_listings ADD COLUMN IF NOT EXISTS cnpj_raw TEXT;
ALTER TABLE discovery_listings ADD COLUMN IF NOT EXISTS cnpj_data JSONB;

-- RPC: Get CNPJ stats for KPIs
CREATE OR REPLACE FUNCTION get_cnpj_stats()
RETURNS jsonb AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'total_queue', COUNT(*),
    'pending', COUNT(*) FILTER (WHERE status = 'pending'),
    'crawling', COUNT(*) FILTER (WHERE status = 'crawling'),
    'extracted', COUNT(*) FILTER (WHERE status = 'extracted'),
    'enriched', COUNT(*) FILTER (WHERE status = 'enriched'),
    'failed', COUNT(*) FILTER (WHERE status = 'failed'),
    'no_cnpj', COUNT(*) FILTER (WHERE status = 'no_cnpj'),
    'total_enriched_leads', (SELECT COUNT(*) FROM discovery_listings WHERE cnpj_enriched = true),
    'total_leads_with_website', (SELECT COUNT(*) FROM discovery_listings WHERE website IS NOT NULL AND website != '')
  ) INTO result
  FROM cnpj_queue;
  RETURN result;
END;
$$ LANGUAGE plpgsql;
