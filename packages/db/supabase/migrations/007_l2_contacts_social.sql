-- ══════════════════════════════════════════════════════════════════
-- ADSENTICE · Migration 007 — L2 Contact + Social Enrichment
-- Colunas extras do pipeline L2 v1.0: emails, social links extraídos
-- do website via DataForSEO content_parsing + domain_technologies.
-- medido=verdade · 2026-07-16
-- ══════════════════════════════════════════════════════════════════

ALTER TABLE IF EXISTS discovery_listings
  ADD COLUMN IF NOT EXISTS l2_emails TEXT[] DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS l2_social_links JSONB DEFAULT NULL;
