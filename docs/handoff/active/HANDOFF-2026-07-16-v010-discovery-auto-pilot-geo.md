# HANDOFF v010 (2026-07-16) · Discovery Auto-Pilot + Geo Intelligence

> Auto-gerado · sessão `seed-20260711160437` · ~21:00 UTC
> BOA: 0.948 (EXCELLENT) · 290 commits · 23 ADRs · 7 skills

## 🛑 START-HERE (próxima sessão)

1. `redis :6396` · ler `adsentice:ooda:stage:*` + `adsentice:boa:*`
2. **Docs essenciais:** este handoff + `docs/spec/base-matriz-adsentice.md`
3. **ADRs novos:** ADR-0022 (Geo Engine) + ADR-0023 (Auto-Pilot)
4. **Componentes novos:** `BrazilDiscoveryMap.tsx`, `DiscoveryAutoPilot.tsx`
5. **APIs novas:** `/api/coverage`, `/api/coverage/pins`, `/api/coverage/queue`, `/api/geo/search`
6. **Libs novas:** `coverage.ts`, `target-scorer.ts`

## ✅ O QUE FOI FEITO

### ADR-0022 — Geo Intelligence Engine
- 3 fases: Turf.js (Fase A, $0) → H3 + IBGE (Fase B, $0) → PostGIS (Fase C)
- Aprovado. Fase A pendente de implementação.

### ADR-0023 — Discovery Auto-Pilot
- 3 camadas: Coverage Matrix → Target Scorer → Autonomous Prospecting
- Camadas 1+2 implementadas. Camada 3 (autônomo com meta diária) futura.

### Discovery Page (:3000/en/admin/discovery)
- **Mapa do Brasil** — Leaflet nativo (L.map), sem react-leaflet. Pins + círculos de cobertura + clique para selecionar região. $0, sem API key.
- **Busca livre** — `/api/geo/search` (Nominatim). Digita "Pinheiros" → coordenada.
- **Auto-Pilot toggle** — 🟢 Automático ON / ⚪ Manual
- **2 modos** — 📋 Cobertura (varre gaps, L0+L1) vs 🧠 Inteligência (Target Scorer, 5 critérios, L0→L1→L2→L3)
- **Target Scorer** — Composite Score: dor(30%) + ticket(25%) + concorrência(20%) + quick win(10%) + cobertura(15%)
- **Tabela de alvos** — distritos priorizados com score, critérios, estratégia e botão "Mapear" que joga no Nominatim

### /admin/market — 8 gaps corrigidos
- City chips (5 cidades detectadas do Supabase)
- Signal labels (28 IDs mapeados do scoring engine)
- hasAnalyticsPct corrigido (denominador = total, não subconjunto)
- Content Maturity com fallback quando sem L2
- Market Holds sem query com cidade vazia
- Category normalizer: 70+ aliases GMB → slug (DataForSEO "Dentist" → "🦷 Dentista")
- Categorias agrupadas por slug normalizado (Dentist + Dental clinic → 1 categoria)

### Supabase (tdigauruusdhnpvppixb)
| Tabela | Rows | Status |
|--------|------|--------|
| discovery_searches | 11 | ✅ |
| discovery_listings | 404 | ✅ 142 unique place_ids |
| market_holds | 4 | ✅ grants ok |

- **100% dados do RJ** (nenhuma busca em SP ainda)
- 5 cidades: Rio (117), Niterói (4), Caxias (2), São Gonçalo (2), Meriti (1)
- 23 distritos cobertos no RJ de 33 estimados (69%)
- ~90 listings sem city (dados antigos pré-fix `ac00eb8`)

### Geocoding
- `/api/geo/search` — Nominatim server-side (1 req/s rate limit)
- Testado: "Pinheiros" → (-23.567, -46.702) OK

## 🧠 O ENTENDIMENTO

**O Auto-Pilot não é só cobertura.** O Target Scorer usa critérios de marketing REAIS (Pain Criteria, Schwartz, BOA, tickets por categoria, sinais de fixability) do Supabase para decidir QUAL gap atacar primeiro. Isso é o que nenhum concorrente tem.

**Mapa é Leaflet nativo, $0.** Sem Google Maps, sem Cloudflare, sem API key. OpenStreetMap tiles grátis. Pins e círculos renderizados via API imperativa (L.map, L.marker, L.circle) — sem react-leaflet quebrando SSR.

**2 modos = 2 pipelines diferentes.** Cobertura é mecânico (L0+L1 por distrito), Inteligência é estratégico (analisa mercado antes de prospectar). O founder escolhe o modo conforme o momento do negócio.

## 🎯 ESTADO OODA

- **observe:** Auditoria EVO-API completa. Discovery Map funcional. Auto-Pilot com 2 modos operando sobre dados reais do Supabase.
- **orient:** 21/40 caps provider-core (52.5%). Coverage Matrix usa dados existentes ($0). Target Scorer prioriza por critérios de marketing.
- **decide:** Fases 1-5 completas. ADR-0022+0023 aprovados. Fase A Geo pendente. M2 Frontend + Hetzner no roadmap.
- **act:** SELADO v029 · 290 commits · 23 ADRs · :3000 online · BOA 0.948 EXCELLENT

## ▶️ PRÓXIMO (a fila)

1. **Testar modo Cobertura com Discovery RJ real** — rodar busca automática em gap sugerido
2. **Fase A Geo (ADR-0022)** — `@turf/turf` no market-intel (turf.circle → área real)
3. **M2 Frontend** — React 19 + Vite + shadcn/ui
4. **Hetzner CAX11** — provisionar
5. **Fase 6 Enterprise** — ai.llm.mentions, domain.whois

## 📊 CORPUS STATUS (pós-ingest 2026-07-16)

| Collection | Points | Delta |
|-----------|--------|-------|
| adsentice-self | 18,285 | +76 (1306 chunks, 100 arquivos) |
| adsentice-conversation | 76,678 | +825 chunks history |
| claude-memory | 30 | estável |
| adsentice-materio | 36 | estável |
| **Total KG** | **95,029** | +901 |

---
*HANDOFF v010 · 2026-07-16 · adsentice*
