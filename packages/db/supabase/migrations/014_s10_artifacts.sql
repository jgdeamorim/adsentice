-- ══════════════════════════════════════════════════════════════════
-- ADSENTICE · Migration 014 — s10_artifacts (ADR-0038 Generate-then-Serve)
-- Problema: /s10-raio-x é compose-on-view — lead paga 14s de BLUE na
-- primeira view (momento de conversão) e cache real é só L1 memory.
--
-- Solução: série durável de artefatos (doutrina Vault #5). Blob {html,
-- blue, meta} imutável no R2 (s10/{place_id}/v{N}.json), série aqui.
-- TTL 30 dias = ciclo de aquecimento do lead; expirado → re-gen fresco.
-- medido=verdade · 2026-07-18
-- ══════════════════════════════════════════════════════════════════

-- ── 1. Série de artefatos (append-only por convenção: UPDATE só em status) ──

CREATE TABLE IF NOT EXISTS s10_artifacts (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  place_id      text NOT NULL,
  version       int  NOT NULL,
  status        text NOT NULL DEFAULT 'published',   -- published | draft | rejected
  blob_key      text NOT NULL,                       -- R2: s10/{place_id}/v{N}.json
  content_hash  text NOT NULL,                       -- sha256 do html (integridade)
  headline      text,
  subtitle      text,
  cta           text,
  copy_model    text,                                -- deepseek-refine | s10-pipeline | ...
  ab_variant    text,                                -- variante congelada (A/B limpo)
  qg_composite  numeric,
  qg_passed     boolean,
  segment       text,
  score         int,
  cost_usd      numeric NOT NULL DEFAULT 0,
  generated_at  timestamptz NOT NULL DEFAULT now(),
  expires_at    timestamptz NOT NULL DEFAULT now() + interval '30 days',
  UNIQUE (place_id, version)
);

-- ── 2. Índice do fast-path da view: publicado + não-expirado + última versão ──

CREATE INDEX IF NOT EXISTS idx_s10_artifacts_serve
  ON s10_artifacts (place_id, status, expires_at DESC, version DESC);

-- ── 3. Padrão do projeto (006): RLS off + acesso só via service_role/backend ──

ALTER TABLE s10_artifacts DISABLE ROW LEVEL SECURITY;
GRANT ALL ON public.s10_artifacts TO service_role;

-- ── 4. Verificação ──

DO $$
BEGIN
  RAISE NOTICE 's10_artifacts criada: % colunas',
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 's10_artifacts');
END $$;
