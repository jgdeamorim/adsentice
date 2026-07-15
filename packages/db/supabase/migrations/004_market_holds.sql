-- ══════════════════════════════════════════════════════════════════
-- ADSENTICE · Migration 004 — Market Time-Series Holds
-- Padrão absorvido do EVO-API rsxt-t0:
--   SeriesId = "sig_{metric}_{tenant␟provider␟capability␟entity}"
--   Append-only, imutável, geo-suffixed entities
-- medido=verdade · 2026-07-15
-- ══════════════════════════════════════════════════════════════════

-- ── Market holds table (append-only time-series) ──

CREATE TABLE IF NOT EXISTS market_holds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant TEXT NOT NULL DEFAULT 'adsentice',
  category TEXT NOT NULL,              -- 'dentist', 'restaurant', etc.
  city TEXT NOT NULL,                  -- 'Rio de Janeiro', 'Sao Paulo', etc.
  metric TEXT NOT NULL,                -- 'avg_score', 'total_businesses', 'avg_rating', etc.
  value DOUBLE PRECISION NOT NULL,
  source TEXT NOT NULL DEFAULT 'supabase_aggregate',
  search_id UUID REFERENCES discovery_searches(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}',        -- extra context (distribution, signals, etc.)
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for fast time-series queries
CREATE INDEX IF NOT EXISTS idx_market_holds_lookup
  ON market_holds (tenant, category, city, metric, recorded_at DESC);

CREATE INDEX IF NOT EXISTS idx_market_holds_search
  ON market_holds (search_id) WHERE search_id IS NOT NULL;

-- ── Market snapshots view (latest per category/city/metric) ──

CREATE OR REPLACE VIEW market_snapshots AS
SELECT DISTINCT ON (tenant, category, city, metric)
  id, tenant, category, city, metric, value, source, metadata, recorded_at
FROM market_holds
ORDER BY tenant, category, city, metric, recorded_at DESC;

-- ── Keyword time-series table (from DataForSEO historical databases) ──

CREATE TABLE IF NOT EXISTS keyword_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant TEXT NOT NULL DEFAULT 'adsentice',
  keyword TEXT NOT NULL,
  location_code INTEGER NOT NULL DEFAULT 2076,
  language_code TEXT NOT NULL DEFAULT 'pt',
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  search_volume INTEGER NOT NULL DEFAULT 0,
  competition TEXT,                   -- LOW|MEDIUM|HIGH
  competition_index DOUBLE PRECISION,
  cpc DOUBLE PRECISION,
  source TEXT NOT NULL DEFAULT 'dataforseo_databases',
  ingested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant, keyword, location_code, language_code, year, month)
);

CREATE INDEX IF NOT EXISTS idx_keyword_history_lookup
  ON keyword_history (tenant, keyword, year, month);
