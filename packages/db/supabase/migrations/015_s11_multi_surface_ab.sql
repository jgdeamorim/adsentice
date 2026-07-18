-- ══════════════════════════════════════════════════════════════════
-- ADSENTICE · Migration 015 — s10_artifacts multi-surface + A/B (ADR-0037 F6)
-- Problema: série de artefatos era S10-only com UNIQUE(place_id,version).
-- A S11 gera DUAS variantes A/B por versão (estratégias de conversão
-- congeladas) e outras 20 superfícies virão (factory).
--
-- Solução: coluna surface + UNIQUE por (place_id, surface, version,
-- ab_variant com COALESCE p/ legado NULL). Corrige também o bug v082:
-- ab_variant gravou "[object Object]" (String(objeto)) — limpar.
-- medido=verdade · 2026-07-18
-- ══════════════════════════════════════════════════════════════════

-- ── 1. Coluna surface (legado = S10) ──

ALTER TABLE s10_artifacts ADD COLUMN IF NOT EXISTS surface text NOT NULL DEFAULT 'S10';

-- ── 2. Bug v082: ab_variant "[object Object]" → NULL (dado sem sentido) ──

UPDATE s10_artifacts SET ab_variant = NULL WHERE ab_variant = '[object Object]';

-- ── 3. UNIQUE novo: por superfície + variante (COALESCE p/ NULL legado) ──

ALTER TABLE s10_artifacts DROP CONSTRAINT IF EXISTS s10_artifacts_place_id_version_key;
DROP INDEX IF EXISTS idx_s10_artifacts_unique_surface_variant;
CREATE UNIQUE INDEX idx_s10_artifacts_unique_surface_variant
  ON s10_artifacts (place_id, surface, version, COALESCE(ab_variant, '-'));

-- ── 4. Índice do serve por superfície ──

DROP INDEX IF EXISTS idx_s10_artifacts_serve;
CREATE INDEX idx_s10_artifacts_serve
  ON s10_artifacts (place_id, surface, status, expires_at DESC, version DESC);

-- ── 5. Eventos de conversão (F6 — view + cta_click por variante) ──

CREATE TABLE IF NOT EXISTS s11_events (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  place_id    text NOT NULL,
  surface     text NOT NULL DEFAULT 'S11',
  version     int,
  ab_variant  text,                      -- 'A' | 'B' (estratégia congelada)
  event       text NOT NULL,             -- 'view' | 'cta_click'
  at          timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_s11_events_conv
  ON s11_events (place_id, surface, ab_variant, event, at DESC);
ALTER TABLE s11_events DISABLE ROW LEVEL SECURITY;
GRANT ALL ON public.s11_events TO service_role;

-- ── 6. Verificação ──

DO $$
BEGIN
  RAISE NOTICE 's10_artifacts multi-surface: % colunas · s11_events: % colunas',
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 's10_artifacts'),
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 's11_events');
END $$;
