-- ══════════════════════════════════════════════════════════════════
-- ADSENTICE · Migration 020 — Wa-Check persistence fields
-- Camada 3 do wa-check (Evolution API) — resultado salvo no banco
-- Antes (v119-v123): wa-check era UI-only, resultados efêmeros
-- Agora (v127): persistência durável via Supabase
-- Custo: $0 — campos populados após verificação
-- medido=verdade · 2026-07-19 · ADR-0041 + ADR-0042
-- ══════════════════════════════════════════════════════════════════

ALTER TABLE discovery_listings ADD COLUMN IF NOT EXISTS wa_checked BOOLEAN DEFAULT false;
COMMENT ON COLUMN discovery_listings.wa_checked IS 'Já foi verificado pelo wa-check? (Camada 2 ou 3)';

ALTER TABLE discovery_listings ADD COLUMN IF NOT EXISTS wa_has_whatsapp BOOLEAN;
COMMENT ON COLUMN discovery_listings.wa_has_whatsapp IS 'Tem WhatsApp? (confirmado via wa.me ou Evolution API)';

ALTER TABLE discovery_listings ADD COLUMN IF NOT EXISTS wa_is_business BOOLEAN;
COMMENT ON COLUMN discovery_listings.wa_is_business IS 'É WhatsApp Business? (og:title ≠ Share on WhatsApp)';

ALTER TABLE discovery_listings ADD COLUMN IF NOT EXISTS wa_display_name TEXT;
COMMENT ON COLUMN discovery_listings.wa_display_name IS 'Nome do perfil WhatsApp (og:title do wa.me). Só preenchido se is_business=true.';

ALTER TABLE discovery_listings ADD COLUMN IF NOT EXISTS wa_verified_at TIMESTAMPTZ;
COMMENT ON COLUMN discovery_listings.wa_verified_at IS 'Timestamp da última verificação wa-check.';

CREATE INDEX IF NOT EXISTS idx_listings_wa_checked ON discovery_listings(wa_checked);
CREATE INDEX IF NOT EXISTS idx_listings_wa_has_whatsapp ON discovery_listings(wa_has_whatsapp);
