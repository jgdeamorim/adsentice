# HANDOFF v090 FINAL · 2026-07-18 · Popup Real + Phone PATCH + Pipeline Unificado

**commit 00c1a10 · 3 bugs raiz corrigidos em 1 selo**

## Entregas

1. **Popup re-enrich MOSTRA loading real** (não mais estimativas falsas):
   - `baseLoading` state + useEffect robusto (AbortController + finally + deps completas: cityLabel, selected.length)
   - Spinner "🔍 Contando base real no Supabase ($0)..." enquanto a query roda
   - Título muda: "Pipeline (EXATO — contado da base)"
   - **Race condition resolvida**: antes o Dialog renderizava com `basePreflight=null` e caía no fallback "60% histórico"

2. **Phone PATCH**: whitelist `L2L3_COLS` incluía `l3_whatsapp`/`l3_emails` mas NÃO `phone` — o campo mais valioso. 2 meses do código de merge existindo sem nunca persistir.

3. **Leads /admin/leads**: card "Places Únicos 50" hardcoded → **Rede Social** com dados reais (l3_social_links + l3_whatsapp)

4. **Pipeline /admin/pipeline**: 2 queries dedup → 1 query unificada + enrichmentCounts.l3

## Lições (v081→v090 · 10 selos)

- Discovery é SÉRIE TEMPORAL (migration 016): sempre dedup por place_id
- Phone demorou 2 meses p/ funcionar: código certo, persistência errada
- Pipeline tinha 2 queries diferentes vendo o mesmo dado: 900 vs 960
- Popup mentia estimativa enquanto o efeito assíncrono rodava: race condition

## Pendente

- task #17: Gate S11 elegibilidade via L2 (insumo pronto)
- Pre-flight+L1+L4 com IBGE confirmado como stack correto
- Base-matriz changelog v090
