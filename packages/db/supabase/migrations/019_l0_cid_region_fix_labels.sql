-- ══════════════════════════════════════════════════════════════════
-- ADSENTICE · Migration 019 — L0 CID + Region + Fix L1 Labels
-- Auditoria 2026-07-19 (tools/audit_l0_fields.py, $0.0131 live test):
--   1. cid — mapeado no adapter mas NUNCA persistido (bug desde 001)
--   2. address_info.region — não mapeado, não persistido
--   3. address_info.zip/country_code — mapeados como "L1" mas VÊM DO L0
--   4. price_level — top-level key no L0, migration rotula como L1
--   5. COMMENT ON COLUMN correction p/ enrichment_level
-- Custo: $0 — campos já pagos na chamada L0.
-- medido=verdade · 2026-07-19
-- ══════════════════════════════════════════════════════════════════

-- ── 1. CID (Google Customer ID) — adapter mapeia desde 001, persistência esquecia ──
ALTER TABLE discovery_listings ADD COLUMN IF NOT EXISTS cid TEXT;
COMMENT ON COLUMN discovery_listings.cid IS 'Google Customer ID (numérico) — complementar ao place_id. L0, $0 adicional.';

-- ── 2. Region (address_info.region) — ex: "State of Espírito Santo" ──
ALTER TABLE discovery_listings ADD COLUMN IF NOT EXISTS region TEXT;
COMMENT ON COLUMN discovery_listings.region IS 'Região administrativa (address_info.region). L0, $0 adicional.';

-- ── 3. Fix COMMENTs: campos rotulados como "L1" que VÊM DO L0 ──
-- Auditoria live 2026-07-19 confirmou que estes campos são top-level ou address_info.* no L0

COMMENT ON COLUMN discovery_listings.postal_code IS 'CEP (address_info.zip). L0 — NÃO depende de L1. Migração 001 rotulava errado como L1.';
COMMENT ON COLUMN discovery_listings.country_code IS 'Código ISO do país (address_info.country_code). L0 — NÃO depende de L1. Migração 001 rotulava errado como L1.';
COMMENT ON COLUMN discovery_listings.business_status IS 'Status operacional (OPERATIONAL, CLOSED, etc.). Confirmado: NÃO disponível no L0 — somente L1 my_business_info.';
COMMENT ON COLUMN discovery_listings.price_level IS 'Nível de preço 1-4. Top-level key no JSON L0 (confirmado live 2026-07-19). Migração 001 rotulava errado como L1-only.';
COMMENT ON COLUMN discovery_listings.contact_methods IS 'Canais de contato detectados (computado). NÃO depende de API — é derivado do scoring.';

-- ── 4. Fix enrichment_level COMMENT — semântica corrigida ──
-- ADR-0039: L1 GMB Profile DEPRECATED. L0 fornece 35+ campos diretamente.
-- 0 = pre-flight (sem dados de contato)
-- 1 = L0 completo (phone OU website OU fotos — auto-computado pelo persistence)
-- 2 = L2 Website+SEO enriquecido
-- 3 = L3 Social enriquecido
-- 4 = L4 IBGE enriquecido
COMMENT ON COLUMN discovery_listings.enrichment_level IS '0=pre-flight L0, 1=L0 completo (contatos), 2=L2 Website+SEO, 3=L3 Social, 4=L4 IBGE. ADR-0039: L1 DEPRECATED.';

-- ── 5. Index para busca por cid ──
CREATE INDEX IF NOT EXISTS idx_listings_cid ON discovery_listings(cid);
