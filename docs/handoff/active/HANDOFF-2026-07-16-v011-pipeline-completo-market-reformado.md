# HANDOFF v011 (2026-07-16) · Pipeline Completo + Market Reformado

> Auto-gerado · sessão `seed-20260711160437` · ~21:45 UTC
> BOA: 0.948 (EXCELLENT) · 300 commits · 23 ADRs · 7 skills

## 🛑 START-HERE (próxima sessão)

1. `redis :6396` · ler `adsentice:ooda:stage:*` + `adsentice:boa:*`
2. **Docs essenciais:** este handoff + `docs/spec/base-matriz-adsentice.md` v1.9.0
3. **Novos ADRs:** ADR-0022 Geo, ADR-0023 Auto-Pilot
4. **Novos componentes:** `BrazilDiscoveryMap.tsx`, `DiscoveryAutoPilot.tsx`, `MarketCoverageMap.tsx`, `MarketCoverageMapWrapper.tsx`
5. **Novas libs:** `coverage.ts`, `target-scorer.ts`
6. **Novas APIs:** `/api/coverage`, `/api/coverage/pins`, `/api/coverage/queue`, `/api/geo/search`

## ✅ O QUE FOI FEITO

### /admin/market (reformado)
- **Overview mode** — default sem filtro: 142 negócios únicos, 8 categorias, 6 cidades
- **Mini-mapa CartoDB** — Leaflet com pins das 11 discovery_searches (220px, cores suaves)
- **Wrapper SSR-safe** — MarketCoverageMapWrapper com next/dynamic(ssr:false)
- **Suspense pattern** — MarketPage shell (sync, SWC-safe) + MarketContent inner async
- **Drill-down** — clica categoria → TOP Gaps + MRR potencial + Densidade + Ações
- **MarketHolds** — time-series + sparkline quando há dados

### /admin/discovery
- **Mapa Brasil** — Leaflet nativo (L.map), pins + círculos de cobertura
- **Busca livre** — `/api/geo/search` (Nominatim)
- **Auto-Pilot 2 modos** — 📋 Cobertura (L0+L1) vs 🧠 Inteligência (Target Scorer L0→L3)
- **Target Scorer** — Composite: dor(30%) + ticket(25%) + concorrência(20%) + quick win(10%) + cobertura(15%)

### Pipeline de Ingest (executado)
| Pipeline | Resultado |
|----------|-----------|
| Claude History | 827 chunks → adsentice-conversation |
| Self-Ingest | 1,306 corpus + 36 materio → adsentice-self |

### KG Status
| Collection | Points |
|-----------|--------|
| adsentice-conversation | 77,505 |
| adsentice-self | 18,286 |
| claude-memory | 30 |
| adsentice-materio | 36 |
| **Total** | **95,857** |

### Supabase
| Tabela | Rows |
|--------|------|
| discovery_searches | 11 |
| discovery_listings | 404 (142 unique) |
| market_holds | 4 |

### Lições SWC (Next.js 15.1.2)
- `dynamic(ssr:false)` só em client components
- Imports de libs com `window` (Leaflet) precisam de wrapper `'use client'` + `next/dynamic`
- Server Components com muita lógica → Suspense + inner async component
- `catch {}` vazio quebra SWC → `catch (e: any) {}`

## 🎯 ESTADO OODA

- **observe:** Pipeline completo executado. KG 95,857 pts. /admin/market reformado com overview + mapa. /admin/discovery com Auto-Pilot 2 modos funcional.
- **orient:** 21/40 caps (52.5%). Market mostra dados reais (142 negócios, 8 cats, 6 cidades). 93/142 listings sem city (backfill pendente).
- **decide:** Fases 1-5 completas. ADR-0022+0023 aprovados. Market funcional. Próximo: rodar Discovery para validar market com dados frescos.
- **act:** SELADO v031 · 300 commits · 23 ADRs · :3000 online

## ▶️ PRÓXIMO (a fila)

1. **Rodar Discovery RJ 5km** — validar /admin/market com dados frescos (city, market_holds, Schwartz)
2. **Backfill city** — 93 listings antigos sem city → `reverseGeocode(lat, lng)` via Nominatim
3. **Fase A Geo (ADR-0022)** — `@turf/turf` no market-intel (área real)
4. **M2 Frontend** — React 19 + Vite + shadcn/ui
5. **Hetzner CAX11** — provisionar

---
*HANDOFF v011 · 2026-07-16 · adsentice*
