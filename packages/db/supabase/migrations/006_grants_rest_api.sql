-- ══════════════════════════════════════════════════════════════════
-- ADSENTICE · Migration 006 — Grants para REST API
-- Corrige: permission denied for table discovery_searches (erro 403)
--
-- O Supabase usa PostgREST para expor a REST API. Tabelas criadas
-- manualmente no SQL Editor precisam de grants EXPLÍCITOS para os
-- roles anon, authenticated e service_role.
--
-- Fonte: supabase.com/docs → GRANT ALL ON table TO service_role;
--
-- Executar no Supabase SQL Editor:
--   https://supabase.com/dashboard/project/tdigauruusdhnpvppixb
--   → SQL Editor → colar este arquivo → Run
--
-- medido=verdade · 2026-07-15 · adsentice
-- ══════════════════════════════════════════════════════════════════

-- 1. Desabilita RLS nas tabelas de discovery (não precisamos de RLS —
--    são tabelas internas de analytics, não dados de usuários finais)
ALTER TABLE IF EXISTS discovery_searches DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS discovery_listings DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS market_holds DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS keyword_history DISABLE ROW LEVEL SECURITY;

-- 2. Grants para service_role (usado pelo supabase-admin.ts)
GRANT ALL ON public.discovery_searches TO service_role;
GRANT ALL ON public.discovery_listings TO service_role;
GRANT ALL ON public.market_holds TO service_role;
GRANT ALL ON public.keyword_history TO service_role;

-- 3. Grants para anon/authenticated (permite leitura pública se necessário)
GRANT SELECT ON public.discovery_searches TO anon, authenticated;
GRANT SELECT ON public.discovery_listings TO anon, authenticated;
GRANT SELECT ON public.market_holds TO anon, authenticated;
GRANT SELECT ON public.keyword_history TO anon, authenticated;

-- 4. Permissões em views e funções
GRANT ALL ON FUNCTION public.get_score_distribution TO service_role, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_score_distribution TO service_role, anon, authenticated;
