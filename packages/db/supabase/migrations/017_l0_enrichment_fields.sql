-- ══════════════════════════════════════════════════════════════════
-- ADSENTICE · Migration 017 — L0 enrichment fields (ADR-0024 P1)
-- L0 business_listings/search/live retorna 37 campos. O adapter
-- mapeava só 18. Adiciona os 11 faltantes com valor real de negócio.
-- Custo: $0 adicional — campos já pagos na chamada L0.
-- medido=verdade · 2026-07-19
-- ══════════════════════════════════════════════════════════════════

ALTER TABLE discovery_listings ADD COLUMN IF NOT EXISTS main_image             text;
ALTER TABLE discovery_listings ADD COLUMN IF NOT EXISTS rating_distribution    jsonb;
ALTER TABLE discovery_listings ADD COLUMN IF NOT EXISTS snippet                text;
ALTER TABLE discovery_listings ADD COLUMN IF NOT EXISTS check_url              text;
ALTER TABLE discovery_listings ADD COLUMN IF NOT EXISTS work_time              jsonb;
ALTER TABLE discovery_listings ADD COLUMN IF NOT EXISTS first_seen             timestamptz;
ALTER TABLE discovery_listings ADD COLUMN IF NOT EXISTS last_updated_time      timestamptz;
ALTER TABLE discovery_listings ADD COLUMN IF NOT EXISTS domain                 text;
ALTER TABLE discovery_listings ADD COLUMN IF NOT EXISTS people_also_search     jsonb;
ALTER TABLE discovery_listings ADD COLUMN IF NOT EXISTS attributes             jsonb;
ALTER TABLE discovery_listings ADD COLUMN IF NOT EXISTS logo                   text;

DO $$
BEGIN
  RAISE NOTICE '017 aplicada: 11 colunas L0 adicionadas';
END $$;
