-- ══════════════════════════════════════════════════════════════════
-- ADSENTICE · Migration 010 — L3 Social + L4 IBGE Context
-- ADR-0024: separa social contacts (L3) e IBGE market context (L4)
-- medido=verdade · 2026-07-16
-- ══════════════════════════════════════════════════════════════════

-- L3: Social & Contacts (redes sociais + emails + WhatsApp do website)
ALTER TABLE IF EXISTS discovery_listings
  ADD COLUMN IF NOT EXISTS l3_emails TEXT[] DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS l3_social_links JSONB DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS l3_whatsapp TEXT DEFAULT NULL;

-- L4: IBGE Market Context (pop, PIB, renda, densidade do município)
ALTER TABLE IF EXISTS discovery_listings
  ADD COLUMN IF NOT EXISTS l4_ibge_populacao INTEGER DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS l4_ibge_pib_per_capita NUMERIC(12,2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS l4_ibge_densidade NUMERIC(10,2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS l4_ibge_renda_media INTEGER DEFAULT NULL;
