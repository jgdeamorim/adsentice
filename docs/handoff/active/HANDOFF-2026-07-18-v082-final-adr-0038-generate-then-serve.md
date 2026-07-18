# HANDOFF v082 FINAL · 2026-07-18 · ADR-0038 Generate-then-Serve LIVE

**commit 4085616 · ADR-0038 accepted+implementado · serve 0.54s (era 14.7s)**

## Pipeline v082 (evolução do v081)

```
GERAÇÃO (async · POST /api/s10-artifacts token · fallback on-miss)
  composeS10 BLUE L0-L6 (~10-15s) → QG gate (critique.passed)
  → R2 s10/{place_id}/v{N}.json {html, blue 51 campos, meta 7 traces}
    (PutObject IfNoneMatch:"*" imutável · bucket adsentice · lifecycle 35d)
  → Supabase s10_artifacts (migration 014 · content_hash sha256 ·
    ab_variant congelada · expires_at +30d = ciclo de aquecimento)

VIEW (Route Handler · substitui page.tsx JSX v081)
  GET /s10-raio-x/[place_id] → série REST → R2 get → hash check
  → Response(text/html) 0.54-0.80s · bytes idênticos entre views
  → Cache-Control s-maxage=86400 (CDN CF pronto p/ deploy)
  ?v=N inspeção · miss/expirado → gera inline + persiste
```

## Medido (lead Kamilla Scalzer)

- v1 18:16 (browser founder) + v2 18:19 (POST 9.7s) — ambas QG 7.8 published
- Headline v2: "Sua clínica tem 4.9★, mas apenas 47% dos concorrentes
  reivindicaram o Google Meu Negócio..." (market intel real no copy)
- Probe infra: pg direct-5432 OK (DDL real!) · R2 roundtrip OK
- Cloudflare status founder: **R2 ✅ único ativo** · Workers/KV/D1/Queues ⬜

## Ferramentas novas

- `tools/adsentice_migrate_pg.mjs` — DDL real via pg :5432 (migrations de verdade)
- `tools/adsentice_s10_infra_probe.mjs` — probe pg+R2
- `tools/adsentice_r2_lifecycle_setup.mjs` — lifecycle merge-safe (executado)

## Pendente

1. Fix A copy higiene (subtitleTemplate + validação + footer persona.who)
2. Fase B conversionFacets (copy morph — ADR-0037 Fase 6)
3. ADR-0038 Fase 2: Worker Cron batch pre-warm (quando Workers ⬜→✅)
4. ADR-0038 Fase 3: renderToStaticMarkup(S10RaioXPage) como renderer da geração
5. Promise.all 7 queries L3 · S11 specialist · WarpCache L2 RESP
