-- ══════════════════════════════════════════════════════════════════
-- ADSENTICE · Migration 005 — Market Intel RPC Functions
-- Substitui pg Pool (porta 6543 bloqueada) por funcoes chamadas via REST.
-- Executar no Supabase SQL Editor.
-- medido=verdade · 2026-07-15
-- ══════════════════════════════════════════════════════════════════

-- ── RPC: market_overview(category TEXT, city TEXT DEFAULT NULL) ──

CREATE OR REPLACE FUNCTION market_overview(cat TEXT, city_filter TEXT DEFAULT NULL)
RETURNS JSONB LANGUAGE plpgsql STABLE AS $$
DECLARE
  total INTEGER; enriched INTEGER; avg_s INTEGER; avg_r NUMERIC;
  avg_p INTEGER; claimed NUMERIC; website NUMERIC; analytics NUMERIC;
  result JSONB;
BEGIN
  WITH dedup AS (
    SELECT DISTINCT ON (place_id) *
    FROM discovery_listings
    WHERE category ILIKE cat || '%'
      AND (city_filter IS NULL OR city ILIKE '%' || city_filter || '%')
    ORDER BY place_id, enrichment_level DESC
  )
  SELECT
    COUNT(DISTINCT place_id),
    COUNT(DISTINCT CASE WHEN enrichment_level >= 1 THEN place_id END),
    ROUND(AVG(score_compound))::INTEGER,
    ROUND(AVG(rating_value)::numeric, 1),
    ROUND(AVG(total_photos))::INTEGER,
    ROUND(100.0*COUNT(DISTINCT CASE WHEN is_claimed THEN place_id END)/NULLIF(COUNT(DISTINCT place_id),0), 1),
    ROUND(100.0*COUNT(DISTINCT CASE WHEN website IS NOT NULL THEN place_id END)/NULLIF(COUNT(DISTINCT place_id),0), 1),
    ROUND(100.0*COUNT(DISTINCT CASE WHEN l2_has_analytics THEN place_id END)/NULLIF(COUNT(DISTINCT CASE WHEN l2_has_analytics IS NOT NULL THEN place_id END),0), 1)
  INTO total, enriched, avg_s, avg_r, avg_p, claimed, website, analytics
  FROM dedup;

  IF total IS NULL OR total = 0 THEN RETURN NULL; END IF;

  SELECT jsonb_build_object(
    'total', total, 'enriched', COALESCE(enriched,0),
    'avg_score', COALESCE(avg_s,0), 'avg_rating', COALESCE(avg_r,0),
    'avg_photos', COALESCE(avg_p,0), 'claimed_pct', COALESCE(claimed,0),
    'website_pct', COALESCE(website,0), 'analytics_pct', COALESCE(analytics,0)
  ) INTO result;
  RETURN result;
END;
$$;

-- ── RPC: market_gaps(category TEXT, city TEXT DEFAULT NULL) ──

CREATE OR REPLACE FUNCTION market_gaps(cat TEXT, city_filter TEXT DEFAULT NULL)
RETURNS JSONB LANGUAGE plpgsql STABLE AS $$
DECLARE
  result JSONB;
BEGIN
  WITH dedup AS (
    SELECT DISTINCT ON (place_id) signals_detected
    FROM discovery_listings
    WHERE category ILIKE cat || '%'
      AND (city_filter IS NULL OR city ILIKE '%' || city_filter || '%')
    ORDER BY place_id, enrichment_level DESC
  ),
  signal_counts AS (
    SELECT sig, COUNT(*) as n
    FROM (
      SELECT DISTINCT place_id, unnest(signals_detected) as sig FROM dedup
    ) t
    GROUP BY sig
    ORDER BY n DESC
    LIMIT 20
  ),
  total AS (SELECT COUNT(*) as n FROM dedup)
  SELECT jsonb_agg(jsonb_build_object(
    'signal', LEFT(sig, 3),
    'count', n,
    'pct', ROUND(100.0 * n / (SELECT n FROM total), 1)
  ) ORDER BY n DESC) INTO result
  FROM signal_counts;
  RETURN COALESCE(result, '[]'::JSONB);
END;
$$;

-- ── RPC: score_distribution() ──

CREATE OR REPLACE FUNCTION get_score_distribution()
RETURNS TABLE(total BIGINT, avg DOUBLE PRECISION, unaware BIGINT, problem_aware BIGINT, solution_aware BIGINT, product_aware BIGINT, most_aware BIGINT)
LANGUAGE SQL STABLE AS $$
  WITH dedup AS (
    SELECT DISTINCT ON (place_id) score_compound, schwartz_level
    FROM discovery_listings
    ORDER BY place_id, enrichment_level DESC
  )
  SELECT
    COUNT(*)::BIGINT,
    COALESCE(AVG(score_compound), 0),
    COUNT(*) FILTER (WHERE schwartz_level = 1)::BIGINT,
    COUNT(*) FILTER (WHERE schwartz_level = 2)::BIGINT,
    COUNT(*) FILTER (WHERE schwartz_level = 3)::BIGINT,
    COUNT(*) FILTER (WHERE schwartz_level = 4)::BIGINT,
    COUNT(*) FILTER (WHERE schwartz_level = 5)::BIGINT
  FROM dedup;
$$;
