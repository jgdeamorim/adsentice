-- ═══════════════════════════════════════════════════════════════
-- ADSENTICE · Discovery Persistence
-- Tabelas duráveis para dados pagos do DataForSEO via EVO-API
-- Executar no Supabase SQL Editor (https://tdigauruusdhnpvppixb.supabase.co)
-- ═══════════════════════════════════════════════════════════════

-- 1. Discovery Searches — cada busca paga registrada
CREATE TABLE IF NOT EXISTS discovery_searches (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  categories    TEXT[] NOT NULL,
  lat           DOUBLE PRECISION NOT NULL,
  lng           DOUBLE PRECISION NOT NULL,
  radius_km     INTEGER NOT NULL DEFAULT 10,
  total_count   INTEGER NOT NULL DEFAULT 0,
  cost_usd      DOUBLE PRECISION NOT NULL DEFAULT 0,
  avg_score     DOUBLE PRECISION,
  unaware       INTEGER DEFAULT 0,
  problem_aware INTEGER DEFAULT 0,
  solution_aware INTEGER DEFAULT 0,
  product_aware INTEGER DEFAULT 0,
  most_aware    INTEGER DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Discovery Listings — cada lead com score composto
CREATE TABLE IF NOT EXISTS discovery_listings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  search_id       UUID REFERENCES discovery_searches(id) ON DELETE CASCADE,
  place_id        TEXT NOT NULL,
  title           TEXT,
  category        TEXT,
  address         TEXT,
  rating_value    DOUBLE PRECISION,
  rating_votes    INTEGER,
  is_claimed      BOOLEAN,
  latitude        DOUBLE PRECISION,
  longitude       DOUBLE PRECISION,
  score_compound  INTEGER NOT NULL DEFAULT 0,
  score_fit       INTEGER NOT NULL DEFAULT 0,
  score_engagement INTEGER NOT NULL DEFAULT 0,
  score_intent    INTEGER NOT NULL DEFAULT 0,
  schwartz_level  INTEGER NOT NULL DEFAULT 1,
  schwartz_label  TEXT NOT NULL DEFAULT 'Unaware',
  signals_detected TEXT[] DEFAULT '{}',
  -- L1 enrichment fields (27 canonical GMB fields)
  website         TEXT,
  phone           TEXT,
  total_photos    INTEGER,
  description     TEXT,
  business_status TEXT,
  categories_arr  TEXT[],
  price_level     INTEGER,
  city            TEXT,
  district        TEXT,
  postal_code     TEXT,
  country_code    TEXT,
  contact_methods TEXT[] DEFAULT '{}',
  enrichment_level INTEGER DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(search_id, place_id)
);

-- 3. Índices
CREATE INDEX IF NOT EXISTS idx_listings_search_id ON discovery_listings(search_id);
CREATE INDEX IF NOT EXISTS idx_listings_category ON discovery_listings(category);
CREATE INDEX IF NOT EXISTS idx_listings_schwartz ON discovery_listings(schwartz_level);
CREATE INDEX IF NOT EXISTS idx_listings_place_id ON discovery_listings(place_id);
CREATE INDEX IF NOT EXISTS idx_searches_created ON discovery_searches(created_at DESC);

-- 4. View agregada por categoria (DISTINCT ON place_id — sem duplicatas)
DROP VIEW IF EXISTS category_analytics CASCADE;
CREATE VIEW category_analytics AS
WITH dedup AS (
  SELECT DISTINCT ON (dl.place_id) dl.category, dl.score_compound, dl.schwartz_level, dl.created_at
  FROM discovery_listings dl
  ORDER BY dl.place_id, dl.enrichment_level DESC, dl.score_compound DESC
)
SELECT
  category,
  COUNT(*) AS total_listings,
  COUNT(*) AS unique_businesses,
  ROUND(AVG(score_compound))::INTEGER AS avg_score,
  COUNT(*) FILTER (WHERE schwartz_level >= 2) AS problem_aware_plus,
  COUNT(*) FILTER (WHERE schwartz_level >= 3) AS solution_aware_plus,
  COUNT(*) FILTER (WHERE schwartz_level >= 4) AS product_aware_plus,
  COUNT(*) FILTER (WHERE schwartz_level >= 5) AS most_aware,
  ROUND(
    COUNT(*) FILTER (WHERE schwartz_level >= 2)::DECIMAL / NULLIF(COUNT(*), 0) * 100, 1
  ) AS pain_pct,
  MAX(created_at) AS last_seen
FROM dedup
GROUP BY category
ORDER BY pain_pct DESC;

-- 5. RPC (DISTINCT ON place_id — sem duplicatas)
DROP FUNCTION IF EXISTS get_score_distribution() CASCADE;
CREATE FUNCTION get_score_distribution()
RETURNS TABLE(total BIGINT, avg DOUBLE PRECISION, unaware BIGINT, problem_aware BIGINT, solution_aware BIGINT, product_aware BIGINT, most_aware BIGINT)
LANGUAGE SQL AS $$
  WITH dedup AS (
    SELECT DISTINCT ON (dl.place_id) dl.score_compound, dl.schwartz_level
    FROM discovery_listings dl
    ORDER BY dl.place_id, dl.enrichment_level DESC, dl.score_compound DESC
  )
  SELECT
    COUNT(*)::BIGINT,
    COALESCE(AVG(score_compound), 0)::DOUBLE PRECISION,
    COUNT(*) FILTER (WHERE schwartz_level = 1)::BIGINT,
    COUNT(*) FILTER (WHERE schwartz_level = 2)::BIGINT,
    COUNT(*) FILTER (WHERE schwartz_level = 3)::BIGINT,
    COUNT(*) FILTER (WHERE schwartz_level = 4)::BIGINT,
    COUNT(*) FILTER (WHERE schwartz_level = 5)::BIGINT
  FROM dedup;
$$;
