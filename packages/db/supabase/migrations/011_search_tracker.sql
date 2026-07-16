-- ══════════════════════════════════════════════════════════════════
-- ADSENTICE · Migration 011 — Search Tracker Metadata
-- Rastreia quantos leads foram buscados vs quantos faltam por região.
-- medido=verdade · 2026-07-16
-- ══════════════════════════════════════════════════════════════════

ALTER TABLE IF EXISTS discovery_searches
  ADD COLUMN IF NOT EXISTS search_metadata JSONB DEFAULT NULL;

COMMENT ON COLUMN discovery_searches.search_metadata IS
  'Paginação tracker: {tracker_id, total_in_region, fetched_count, pages_fetched, remaining, offsets_used}';
