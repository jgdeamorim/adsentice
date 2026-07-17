-- ══════════════════════════════════════════════════════════════════
-- ADSENTICE · Migration 013 — market_holds dedup + UNIQUE constraint
-- Problema: appendMarketHolds() usava fetch POST puro, sem UPSERT.
-- Cada Discovery inseria 3 rows (avg_score, total_businesses, claimed_pct)
-- mesmo que idênticas às anteriores → duplicatas acumulavam.
--
-- Solução: UNIQUE index em (search_id, category, city, metric).
-- Time-series preservada: diferentes search_id = diferentes snapshots.
-- Mesmo search_id + categoria + cidade + métrica = ÚNICO.
-- medido=verdade · 2026-07-17
-- ══════════════════════════════════════════════════════════════════

-- ── 1. Remove duplicatas existentes (keep earliest per group) ──

DELETE FROM market_holds
WHERE id NOT IN (
  SELECT DISTINCT ON (search_id, category, city, metric) id
  FROM market_holds
  WHERE search_id IS NOT NULL
  ORDER BY search_id, category, city, metric, recorded_at ASC
)
AND search_id IS NOT NULL;

-- ── 2. UNIQUE index FULL (não partial): compatível com ON CONFLICT do Postgres ──
--    NULL search_id → tratado como DISTINCT (NULL != NULL em SQL) → inserts legacy sempre passam
--    Non-NULL search_id → conflito detectado → upsert funciona

CREATE UNIQUE INDEX IF NOT EXISTS idx_market_holds_unique_search_metric
  ON market_holds (search_id, category, city, metric);

-- ── 3. Verificação ──

DO $$
DECLARE
  total_rows INT;
  unique_groups INT;
BEGIN
  SELECT COUNT(*) INTO total_rows FROM market_holds;
  SELECT COUNT(*) INTO unique_groups FROM (
    SELECT DISTINCT search_id, category, city, metric FROM market_holds WHERE search_id IS NOT NULL
  ) sub;
  RAISE NOTICE 'market_holds: % rows, % unique (search_id, category, city, metric) groups', total_rows, unique_groups;
END $$;
