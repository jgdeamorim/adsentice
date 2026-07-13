-- adsentice · Content Gap Analyzer v0.5
-- L2 data already captured — this migration adds classification columns
-- Source: Corey Haines content-strategy skill (marketingskills)

ALTER TABLE discovery_listings ADD COLUMN IF NOT EXISTS l2_content_maturity INTEGER;
ALTER TABLE discovery_listings ADD COLUMN IF NOT EXISTS l2_content_gaps JSONB;

COMMENT ON COLUMN discovery_listings.l2_content_maturity IS 'Content maturity level 0-4 (Invisivel/Basico/Presente/Estruturado/Maduro)';
COMMENT ON COLUMN discovery_listings.l2_content_gaps IS 'Content gap analysis: {maturity_score, pain_score, level, label, gaps[], recommendations[]}';

CREATE INDEX IF NOT EXISTS idx_listings_content_maturity ON discovery_listings(l2_content_maturity);
