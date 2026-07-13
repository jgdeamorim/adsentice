-- adsentice · L2 Website+SEO Enrichment (v0.3)
-- ADR-0008 Phase 1: on_page_instant_audit + domain_technologies
-- Cost: $0.010125/lead (within $0.012 budget)

-- ═══ L2 OnPage Instant Audit fields ═══
ALTER TABLE discovery_listings ADD COLUMN IF NOT EXISTS l2_onpage_score        INTEGER;
ALTER TABLE discovery_listings ADD COLUMN IF NOT EXISTS l2_meta_title          TEXT;
ALTER TABLE discovery_listings ADD COLUMN IF NOT EXISTS l2_meta_description    TEXT;
ALTER TABLE discovery_listings ADD COLUMN IF NOT EXISTS l2_word_count          INTEGER;
ALTER TABLE discovery_listings ADD COLUMN IF NOT EXISTS l2_internal_links_count INTEGER;
ALTER TABLE discovery_listings ADD COLUMN IF NOT EXISTS l2_external_links_count INTEGER;
ALTER TABLE discovery_listings ADD COLUMN IF NOT EXISTS l2_images_count        INTEGER;
ALTER TABLE discovery_listings ADD COLUMN IF NOT EXISTS l2_seo_checks          JSONB;  -- ~60 boolean SEO flags

-- ═══ L2 Domain Technologies fields ═══
ALTER TABLE discovery_listings ADD COLUMN IF NOT EXISTS l2_cms                   TEXT;
ALTER TABLE discovery_listings ADD COLUMN IF NOT EXISTS l2_has_analytics         BOOLEAN;
ALTER TABLE discovery_listings ADD COLUMN IF NOT EXISTS l2_technology_categories  TEXT[];
ALTER TABLE discovery_listings ADD COLUMN IF NOT EXISTS l2_domain_rank           INTEGER;
ALTER TABLE discovery_listings ADD COLUMN IF NOT EXISTS l2_country_iso_code      TEXT;

-- ═══ Lighthouse scores (reserved for future — not used in MVP v0.3) ═══
ALTER TABLE discovery_listings ADD COLUMN IF NOT EXISTS l2_lighthouse_performance    DOUBLE PRECISION;
ALTER TABLE discovery_listings ADD COLUMN IF NOT EXISTS l2_lighthouse_accessibility  DOUBLE PRECISION;
ALTER TABLE discovery_listings ADD COLUMN IF NOT EXISTS l2_lighthouse_best_practices DOUBLE PRECISION;
ALTER TABLE discovery_listings ADD COLUMN IF NOT EXISTS l2_lighthouse_seo            DOUBLE PRECISION;
ALTER TABLE discovery_listings ADD COLUMN IF NOT EXISTS l2_lighthouse_pwa            DOUBLE PRECISION;

-- ═══ Metadata ═══
ALTER TABLE discovery_listings ADD COLUMN IF NOT EXISTS l2_enriched_at  TIMESTAMPTZ;
ALTER TABLE discovery_listings ADD COLUMN IF NOT EXISTS l2_cost_usd     DOUBLE PRECISION DEFAULT 0;

-- ═══ Comment update ═══
COMMENT ON COLUMN discovery_listings.enrichment_level IS '0=L0 only, 1=L1 GMB, 2=L2 Website+SEO';

-- ═══ Index for L2 filtering ═══
CREATE INDEX IF NOT EXISTS idx_listings_enrichment_level ON discovery_listings(enrichment_level);
CREATE INDEX IF NOT EXISTS idx_listings_l2_has_analytics ON discovery_listings(l2_has_analytics);
CREATE INDEX IF NOT EXISTS idx_listings_l2_cms ON discovery_listings(l2_cms);
