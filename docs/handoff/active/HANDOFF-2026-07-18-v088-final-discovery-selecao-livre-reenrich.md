# HANDOFF v088 FINAL · 2026-07-18 · Discovery Seleção Livre L0-L4 + Re-enrich por Base

**commit b6b39e6 · L2/L3 destravados após 3 dias adiados (v015) · doutrina place_id cravada**

## Entrega

```
admin/discovery · Camadas: 5 toggles LIVRES (era L0/L4 travados + só L1)
  [L0 Search] [L1 $0.0054] [L2 Website+SEO ~$0.0101×web%] [L3 Contatos] [L4 IBGE $0]
  custos dinâmicos (websitePct do preflight) · popup 6 linhas · hint cache L3

L0 OFF = MODO RE-ENRICH (♻️):
  universo = BASE por place_id já capturados (ADR-0024 Parte 3:
  "cada lead L0+L1+L2+L3+L4 completo" — acumulação POR LEAD)
  zero custo search · zero lógica geográfica (centroide real no tracker)
```

## Correção doutrinária (founder)

Eu havia contaminado o re-enrich com lat/lng/radius (fallback SP hardcoded
no trackCost). O founder corrigiu: **após o L0, o lead É o place_id** —
L2/L3 rodam sobre a base, a área já foi determinada na captura. DAG no
ADR-0024 confirmou. Fix: centroide REAL dos leads + radiusKm 0.

## A cadeia de 3 bugs (todos medidos, todos corrigidos)

1. **L2 null desde a criação**: adapter esperava `{items}` — API DataForSEO
   responde `tasks[0].result[0].items` (curl provou: 20000 Ok, 1.5s).
   O legado evo-mcp.ts (:7700 offline) era pista falsa — a rota já usava
   provider-core; o shape é que nunca funcionou.
2. **tech null**: `technologies/live` tem shape próprio — `result[0]` É o
   item (sem .items). Unwrap específico.
3. **persisted 2/18**: funções L2/L3 são IN-MEMORY (persistDiscovery só roda
   no fluxo L0) + colunas INTEGER × API decimal ("98.9" → 22P02).
   Fix: PATCH por id + Math.round nas 8 colunas int (medidas no schema).

## E2E medido (Psychologist + Vitória)

- Base: 312 rows → 171 c/ website (dedup série)
- **19 leads L2 persistidos**: avg onpage 78 · WordPress detectado · 4 tech
- Custo real $0.1322 rastreado · retrocompat: fluxo L0 legado intacto · tsc limpo

## Destrava (fila)

1. **Task #17 — Gate S11**: agora com insumo real (l2_onpage_score + l2_cms
   + detectDomainType) → Tier 1/2/3. Caso Laís: google_sites, score 29
   (fora do top-20 — base completa custa ~$1.60, decisão founder)
2. Cache Redis L2 não segura re-run (escape SETEX) — economia futura
3. Lighthouse/content_maturity não populados no re-enrich (só no fluxo L0)

## Sessão 2026-07-18 acumulada: v081→v088 (8 selos)

S10 route → ADR-0038 0.54s → CF+Supabase → S11 A/B estratégia → dashboard
conversão → Intend v2 cockpit → honestidade números → **enrichment livre**.
