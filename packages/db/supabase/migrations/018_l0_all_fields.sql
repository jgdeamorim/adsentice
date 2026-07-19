-- ══════════════════════════════════════════════════════════════════
-- ADSENTICE · Migration 018 — ALL L0 fields (37/37)
-- Complementa migration 017. Cada campo da API tem coluna no banco.
-- medido=verdade · 2026-07-19
-- ══════════════════════════════════════════════════════════════════

ALTER TABLE discovery_listings ADD COLUMN IF NOT EXISTS additional_categories   text[];
ALTER TABLE discovery_listings ADD COLUMN IF NOT EXISTS category_ids            text[];
ALTER TABLE discovery_listings ADD COLUMN IF NOT EXISTS contact_info            jsonb;
ALTER TABLE discovery_listings ADD COLUMN IF NOT EXISTS feature_id              text;
ALTER TABLE discovery_listings ADD COLUMN IF NOT EXISTS hotel_rating            jsonb;
ALTER TABLE discovery_listings ADD COLUMN IF NOT EXISTS local_business_links    jsonb;
ALTER TABLE discovery_listings ADD COLUMN IF NOT EXISTS original_title          text;
ALTER TABLE discovery_listings ADD COLUMN IF NOT EXISTS place_topics            jsonb;
ALTER TABLE discovery_listings ADD COLUMN IF NOT EXISTS popular_times           jsonb;
ALTER TABLE discovery_listings ADD COLUMN IF NOT EXISTS services                jsonb;
ALTER TABLE discovery_listings ADD COLUMN IF NOT EXISTS source_type             text;  -- "type" é reservado

DO $$ BEGIN RAISE NOTICE '018 aplicada: +11 colunas L0'; END $$;
