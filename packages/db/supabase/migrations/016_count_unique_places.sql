-- ══════════════════════════════════════════════════════════════════
-- ADSENTICE · Migration 016 — count_unique_places (honestidade nos números)
-- Problema: discovery_listings é SÉRIE (1 row por place_id POR SEARCH,
-- design do persistence DELETE+POST). O competitors count do compose
-- usava count=exact (rows) → "101 concorrentes" quando o real era 51
-- (2× inflado, medido 2026-07-18). A copy do lead herdava o número.
--
-- Solução: RPC count DISTINCT place_id — mesma doutrina do DISTINCT ON
-- das views v021. Tabela intocada (série preservada).
-- medido=verdade · 2026-07-18
-- ══════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION count_unique_places(cat text, city_name text)
RETURNS integer
LANGUAGE sql
STABLE
AS $$
  SELECT COUNT(DISTINCT place_id)::integer
  FROM discovery_listings
  WHERE category = cat AND city = city_name;
$$;

GRANT EXECUTE ON FUNCTION count_unique_places(text, text) TO service_role;

-- Verificação
DO $$
BEGIN
  RAISE NOTICE 'count_unique_places(Dentist, Vitória) = % (série tem % rows)',
    count_unique_places('Dentist', 'Vitória'),
    (SELECT COUNT(*) FROM discovery_listings WHERE category='Dentist' AND city='Vitória');
END $$;
