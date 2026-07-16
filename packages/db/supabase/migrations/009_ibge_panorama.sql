-- ══════════════════════════════════════════════════════════════════
-- ADSENTICE · Migration 009 — ibge_panorama (portal Cidades@IBGE)
-- Dados por município: população, PIB, IDHM, área, densidade
-- Fonte: servicodados.ibge.gov.br/api/v1/pesquisas/indicadores
-- medido=verdade · 2026-07-16
-- ══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS ibge_panorama (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  municipio_id TEXT NOT NULL UNIQUE,          -- código IBGE 7 dígitos (ex: 3205309)
  municipio_nome TEXT NOT NULL,
  uf TEXT NOT NULL,
  populacao INTEGER,                          -- população estimada mais recente
  populacao_censo INTEGER,                    -- Censo 2022
  pib_per_capita NUMERIC(12,2),               -- PIB per capita mais recente (R$)
  area_km2 NUMERIC(10,2),                     -- área territorial
  densidade_demografica NUMERIC(10,2),         -- hab/km²
  idhm NUMERIC(6,4),                          -- IDHM 2010
  receitas_total NUMERIC(16,2),               -- receitas brutas realizadas
  despesas_total NUMERIC(16,2),               -- despesas brutas empenhadas
  indicadores_json JSONB DEFAULT '{}',        -- todos os outros indicadores
  ano_referencia TEXT DEFAULT '2024',
  source TEXT NOT NULL DEFAULT 'IBGE Cidades@',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_panorama_uf ON ibge_panorama (uf);
CREATE INDEX IF NOT EXISTS idx_panorama_municipio ON ibge_panorama (municipio_id);
