---
id: adsentice-architecture-flow
title: "Ads​entice Arquitetura Completa — Fluxo Operacional Técnico v1.0"
status: living
type: spec
version: "1.0.1"
date: 2026-07-12
audited_at: 2026-07-13T01:00:00-03:00
sources:
  - apps/web/src/lib/evo-mcp.ts (MCP client :7700)
  - apps/web/src/lib/scoring.ts (Scoring Engine)
  - apps/web/src/lib/engine.ts (Admin Dashboard Data Bridge)
  - apps/web/src/lib/discovery-cache.ts (Cache + Cost Tracking)
  - apps/web/src/lib/discovery-persistence.ts (Supabase Persistence)
  - apps/web/src/app/api/discovery-search/route.ts (Discovery API)
  - apps/web/src/app/api/competitive-benchmark/route.ts (Benchmark API)
  - apps/web/src/app/api/discovery-data/route.ts (Data API)
  - apps/web/src/app/[lang]/(dashboard)/(private)/admin/ (7 pages)
  - apps/web/.env (Supabase + Cloudflare R2 + DataForSEO creds)
  - packages/db/supabase/migrations/001_discovery_tables.sql
  - docker-compose.yml (Redis :6396 + Qdrant :6352)
---

# Arquitetura Completa — Fluxo Operacional Técnico

> **medido=verdade.** Toda conexão abaixo foi verificada contra o código fonte real e testada. Nada é diagrama teórico.

---

## 1. Diagrama de Arquitetura (ASCII)

```
+-----------------------------------------------------------------------------------+
|                        ADSENTICE ECOSSISTEMA COMPLETO                              |
|                               v1.0.1  2026-07-13                                  |
+-----------------------------------------------------------------------------------+

                           +----------------------+
                           |   USUARIO (Admin)    |
                           | http://localhost:3000|
                           +----------+-----------+
                                      |
                 +--------------------+--------------------+
                 |                    |                    |
                 v                    v                    v
       +--------------+    +--------------+    +--------------+
       | /admin       |    | /admin/      |    | /admin/      |
       | (Dashboard)  |    | discovery    |    | categories   |
       | page.tsx     |    | page.tsx     |    | page.tsx     |
       | SERVER comp  |    | CLIENT comp  |    | SERVER comp  |
       +------+-------+    +------+-------+    +------+-------+
              |                   |                    |
              |                   |                    |
  =================== API LAYER (Next.js Route Handlers) ===================
              |                   |                    |
              v                   v                    v
+----------------+  +--------------------+  +--------------------+
| engine.ts      |  | POST /api/         |  | GET /api/          |
| getAdminDash   |  | discovery-search   |  | discovery-data     |
| boardData()    |  | route.ts           |  | route.ts           |
+---+--+--+-----+  +--------+-----------+  +--------+-----------+
    |  |  |                  |                       |
    |  |  |                  v                       |
    |  |  |     +--------------------+               |
    |  |  |     | EVO-API MCP :7700  |               |
    |  |  |     | evo-mcp.ts         |               |
    |  |  |     | MCP 2024-11-05     |               |
    |  |  |     | JSON-RPC over SSE  |               |
    |  |  |     +--------+-----------+               |
    |  |  |              |                           |
    |  |  |              v                           |
    |  |  |     +--------------------+               |
    |  |  |     | DataForSEO LIVE    |               |
    |  |  |     | api.dataforseo.com |               |
    |  |  |     | business_listings  |               |
    |  |  |     | _search $0.015     |               |
    |  |  |     +--------+-----------+               |
    |  |  |              |                           |
    |  |  |              | (dados brutos retornam)   |
    |  |  |              v                           |
    |  |  |     +========================+           |
    |  |  |     |    SCORING ENGINE       |           |
    |  |  |     | scoring.ts             |           |
    |  |  |     | scoreLeads() 50 listings|           |
    |  |  |     | Fitx0.40+Engx0.35+Intx0.25|        |
    |  |  |     | Schwartz 5-level class  |           |
    |  |  |     +========================+           |
    |  |  |              |                           |
    |  |  |              | (scores + distribution)   |
    |  |  |              v                           |
    |  |  |     +--------------------+               |
    |  |  |     | Cost Tracking      |               |
    |  |  |     | trackCost() Redis  |               |
    |  |  |     +--------------------+               |
    |  |  |                                         |
  =========== PERSISTENCE LAYER (3 camadas) ==========================
    |  |  |                                         |
    v  v  v                                         v
+----------+ +----------+ +----------+  +------------------------+
| SUPABASE | |  REDIS   | |  MEMORY  |  | discovery-persistence  |
| Postgres | |  :6396   | |  Map<>   |  | .ts                    |
| PERMANENT| | Cache 24h| | Cache 30m|  | saveDiscoverySearch()  |
+----+-----+ +----+-----+ +----+-----+  | getCategoryAnalytics() |
     |            |            |         | getScoreDistribution() |
     |            |            |         +------------------------+
     v            v            v
+--------------------------------------------------------+
|                  SUPABASE POSTGRES                       |
| project: tdigauruusdhnpvppixb  region: ca-central-1     |
|                                                          |
| Tables:                                                  |
| +- discovery_searches (UUID PK, categories[], lat/lng,   |
| |   radius_km, total_count, cost_usd, avg_score,         |
| |   schwartz dist 5 cols, created_at)                    |
| |                                                        |
| +- discovery_listings (UUID PK, search_id FK, place_id,  |
| |   title, category, rating, reviews, is_claimed,        |
| |   lat/lng, score_compound/fit/engagement/intent,       |
| |   schwartz_level, schwartz_label, signals_detected)    |
| |                                                        |
| +- VIEW: category_analytics (GROUP BY category)          |
| |   -> total, pain_pct, avg_score, schwartz breakdown   |
| |                                                        |
| +- RPC: get_score_distribution()                         |
|     -> total, avg, unaware, problem_aware,               |
|        solution_aware, product_aware, most_aware         |
|                                                          |
| Indexes: search_id, category, schwartz_level,            |
|          place_id, created_at DESC                       |
+----------------------------------------------------------+

  ================ INFRA LAYER (Docker + Processos) ================

+----------+ +----------+ +----------+ +----------+ +----------+
| REDIS    | | QDRANT   | | EMBED    | | NEXT.JS  | | EVO-API  |
| :6396    | | :6352    | | :8081    | | :3000    | | :7700    |
| OODA     | |adsentice | | mpnet    | |dev mode  | | MCP      |
| Cost     | | -self    | | 768d     | |turbopack | | Rust     |
| Cache    | | -conv    | |          | |          | | 76 caps  |
| Score    | | -materio | |          | |          | | ~10K LOC |
+----------+ +----------+ +----------+ +----------+ +----------+
 adsentice    adsentice    embed-       Next.js 15   EVO-API
 -redis       -qdrant      server-rs    :3000        main/
 7.4-alpine   v1.13.6      (shared      dev mode     Rust
 :6396        :6352        process)                  binary
```

---

## 2. Fluxo Completo — Discovery Search (ação principal)

### Step 0: User Action
```
Usuário: /admin/discovery
  1. Seleciona categorias (ex: ["dentist"])
  2. Seleciona estado → cidade (ex: SP → sp-capital, lat=-23.55, lng=-46.63)
  3. Seleciona raio (ex: 10km)
  4. Clica "Buscar Agora ($0.015)"
  5. Confirma no modal de gasto
```

### Step 1: Client → API Route
```
File: apps/web/src/app/[lang]/(dashboard)/(private)/admin/discovery/page.tsx (L156-183)
Function: doSearch(force)

POST /api/discovery-search
Body: {
  categories: ["dentist"],
  lat: -23.5505,
  lng: -46.6333,
  radiusKm: 10,
  limit: 50,
  force: true           // Skip cache
}
```

### Step 2: Cache Check
```
File: apps/web/src/app/api/discovery-search/route.ts (L30-38)

if (!force):
  1. Memory cache: getCached(key) → Map<> TTL 30min  (discovery-cache.ts L28-35)
  2. Redis cache: getPersistedResults(key) → SETEX 24h (discovery-cache.ts L80-85)
  
  Cache HIT → retorna payload + scores + fromCache:true → custo $0
  Cache MISS → continua para Step 3
```

### Step 3: EVO-API MCP → DataForSEO LIVE
```
File: apps/web/src/lib/evo-mcp.ts (L69-142)
Function: businessListingsSearch()

1. MCP Initialize:
   POST http://127.0.0.1:7700/mcp
   { method: "initialize", params: { protocolVersion: "2024-11-05" } }
   → session_id (Mcp-Session-Id header)

2. MCP Notification:
   POST /mcp (Mcp-Session-Id: sid)
   { method: "notifications/initialized" }

3. Tool Call:
   POST /mcp (Mcp-Session-Id: sid)
   { method: "tools/call",
     params: {
       name: "business_listings_search",
       arguments: {
         categories: ["dentist"],
         location_coordinate: "-23.5505,-46.6333,10",
         language_code: "pt",
         limit: 50,
         mode: "live",
         tenancy_id: "adsentice-dev",
         spend_cap_usd: 0.05
       }
     }
   }

4. EVO-API Translator (Rust):
   crates/evo-translator-dataforseo/src/business_listings_search.rs
   MCP args → DataForSEO REST body → POST https://api.dataforseo.com/v3/business_data/business_listings/search/live
   Auth: Basic (DATAFORSEO_LOGIN:DATAFORSEO_PASSWORD)

5. Response Parse:
   SSE stream → JSON → canonical_output:
   { total_count: 5761, listings: [{ title, category, address, rating_value, rating_votes, place_id, cid, latitude, longitude, is_claimed }], cost_usd: 0.015 }
```

### Step 4: Scoring Pass
```
File: apps/web/src/lib/scoring.ts
Function: scoreLeads() + computeDistribution()

Para cada listing (5761 total, 50 returned):
  1. scoreFit()     → F1-F10 (max 70pts raw, normalized 0-100)
  2. scoreEngagement() → E1-E7 (max 70pts raw, normalized 0-100)
  3. scoreIntent()  → I1-I3 (max 60pts raw, normalized 0-100)
  4. compound = fit_norm×0.40 + eng_norm×0.35 + intent_norm×0.25
  5. classifySchwartz(compound) → 5 níveis + messaging rules
  6. applyAntiFalsePositive() → R1-R6

Output: ScoreData[] parallel array + ScoreDistribution { unaware, problemAware, solutionAware, productAware, mostAware, avgScore }
```

### Step 5: Cost Tracking
```
File: apps/web/src/lib/discovery-cache.ts (L43-49)
Function: trackCost()

Redis :6396:
  INCRBYFLOAT adsentice:discovery:cost:today 0.015
  INCRBYFLOAT adsentice:discovery:cost:total 0.015
  SETEX adsentice:discovery:cost:last 86400 "0.015 | dentist | -23.55,-46.63,10km | 5761 leads"
```

### Step 6: Persistence (3 camadas)
```
CAMADA 1 · SUPABASE (PERMANENTE — NUNCA expira)
File: apps/web/src/lib/discovery-persistence.ts
Function: saveDiscoverySearch() [fire-and-forget, não bloqueia resposta]

  1. INSERT INTO discovery_searches
     (categories, lat, lng, radius_km, total_count, cost_usd,
      avg_score, unaware, problem_aware, solution_aware, product_aware, most_aware)
     → search_id (UUID)

  2. INSERT INTO discovery_listings (batch 25 por vez, UPSERT on search_id+place_id)
     (search_id, place_id, title, category, address,
      rating_value, rating_votes, is_claimed, latitude, longitude,
      score_compound, score_fit, score_engagement, score_intent,
      schwartz_level, schwartz_label, signals_detected)

CAMADA 2 · REDIS (Cache 24h — TTL 86400s)
  SETEX adsentice:discovery:last_score_stats 86400 '{...}'
  
CAMADA 3 · MEMORY (Cache 30min — Map<> in-process)
  setCache(key, payload)
```

### Step 7: Response to Client
```
Payload retornado:
{
  total_count: 5761,
  listings: [{ title, category, ... }],  // 50 listings
  scores: [{ compound: 48, fit: {...}, engagement: {...}, intent: {...}, schwartz: {...} }],
  distribution: { unaware: 8, problemAware: 15, solutionAware: 20, productAware: 5, mostAware: 2, avgScore: 48 },
  cost_usd: 0.015,
  fromCache: false,
  costToday: 0.015,
  costTotal: 0.015
}
```

### Step 8: Client Rendering
```
File: apps/web/src/app/[lang]/(dashboard)/(private)/admin/discovery/page.tsx

1. Recebe response → setResults(listings) + setScores(scores) + setDistribution(distribution)
2. enriched = results.map((l, i) => ({...l, score: scores[i]}))
3. Filtro por score mínimo (minScore slider 0-100)
4. Filtro por nível Schwartz (schwartzFilter chips)
5. Ordenação por score (default: desc)
6. Paginação (10-100 por página)

Tabela renderizada:
  Score (chip colorido) | Nome | Categoria | ⭐ | Reviews | Reivindicado? | →

Modal de detalhe (ao clicar na linha):
  Score Breakdown (3 barras Fit/Engagement/Intent)
  Schwartz badge + messaging rule
  Competitive Benchmark (fetch /api/competitive-benchmark on-demand)
```

---

## 3. Fluxo — Competitive Benchmark (on-demand)

### Trigger
```
Usuário clica em uma linha da tabela no Discovery → dispara fetch adicional
```

### Flow
```
File: apps/web/src/app/[lang]/(dashboard)/(private)/admin/discovery/page.tsx (openLeadDetail)

POST /api/competitive-benchmark
Body: { lat, lng, radiusKm, categories, lead_place_id }

File: apps/web/src/app/api/competitive-benchmark/route.ts
  1. Cache check (memory 30min)
  2. businessListingsSearch({ categories, lat, lng, radiusKm, limit: 20 })
  3. scoreLeads() em todos os 20 concorrentes
  4. Separa lead do TOP 5 concorrentes
  5. Calcula market_avg (rating, reviews, claimed_pct)
  6. Detecta gaps (rating abaixo da média, não reivindicado...)
  7. Retorna lead_rank + gaps[]

Client render:
  Tabela comparativa: Métrica | Lead | Média Mercado | Top 1
  Gaps como Alert warn
```

---

## 4. Fluxo — Admin Dashboard

```
File: apps/web/src/app/[lang]/(dashboard)/(private)/admin/page.tsx
Server Component

getAdminDashboardData() → engine.ts:

READS (em paralelo):
  ┌─ Redis :6396
  │  GET adsentice:boa:score
  │  GET adsentice:boa:verdict
  │  GET adsentice:ooda:stage:act
  │  GET adsentice:ooda:stage:decide
  │  GET adsentice:discovery:cost:today
  │  GET adsentice:discovery:cost:total
  │
  ├─ Qdrant :6352
  │  POST /collections/adsentice-self/points/count
  │  POST /collections/adsentice-conversation/points/count
  │  POST /collections/adsentice-materio/points/count
  │
  ├─ EVO-API :7700
  │  GET /health → online?
  │  GET /health → capabilities count
  │
  ├─ Embed :8081
  │  GET /healthz → online?
  │
  ├─ .mcp.json (filesystem)
  │  readFileSync → count MCP servers
  │
  ├─ Git (filesystem)
  │  git rev-list --count HEAD → commit count
  │  readdirSync docs/adr/ → ADR count
  │
  └─ Supabase (discovery-persistence.ts)
     getScoreDistribution() → RPC function
     Fallback → Redis adsentice:discovery:last_score_stats

MONTAGEM: EngineData com TODOS os campos de fontes REAIS
  (zero hardcoded desde auditoria commit 0eb6dc7)

RENDER: 5 CardStatVertical + Infra Chips + Schwartz Funnel + Distribution Bar + Activity Table + Quick Links
```

---

## 5. Fluxo — Categories Page

```
File: apps/web/src/app/[lang]/(dashboard)/(private)/admin/categories/page.tsx
Server Component (async)

GET /api/discovery-data (internal fetch, mesmo processo)

  File: apps/web/src/app/api/discovery-data/route.ts (L18-52)

  TRY Supabase (primária):
    getCategoryAnalytics()
      → SELECT * FROM category_analytics ORDER BY pain_pct DESC
      → Retorna array de { category, total_listings, pain_pct, avg_score, ... }

  CATCH → Redis (fallback):
    GET adsentice:discovery:last_score_stats
    → Retorna { total, avgScore, schwartz distribution }

  CATCH → "none":
    → "Execute a 1ª descoberta no Discovery Engine"

RENDER:
  Se tem dados: tabela ranqueada por pain_pct + KPI cards + pipeline visual
  Se sem dados: Alert "Nenhum dado de descoberta ainda" + link para Discovery
```

---

## 6. Fluxo — Pipeline Page

```
File: apps/web/src/app/[lang]/(dashboard)/(private)/admin/pipeline/page.tsx
Server Component

getAdminDashboardData() → engine.ts
  → mesma função do admin dashboard
  → usa schwartzDistribution[] do Redis/Supabase

RENDER:
  8 estágios S0→S7 com dados REAIS:
    S0: total de leads do last_score_stats
    S1-S5: Unaware → Most Aware (da distribuição Schwartz)
    S6-S7: 0 (CRM em desenvolvimento)

  Taxas de conversão calculadas de dados reais
  Estado "Sem dados — execute 1ª descoberta" se tabelas vazias
```

---

## 7. Fluxo — Costs Page

```
File: apps/web/src/app/[lang]/(dashboard)/(private)/admin/costs/page.tsx
Server Component

getAdminDashboardData() → engine.ts
  dataCostToday → Redis adsentice:discovery:cost:today
  dataCostProjected → costTotal || costToday × 30

Read last call detail:
  GET adsentice:discovery:cost:last (Redis :6396)

Preços REAIS DataForSEO:
  CAPABILITIES[] array com endpoints e preços oficiais:
    business_listings_search: $0.015
    business_profile_gmb: $0.0054
    keyword_research: $0.02
    on_page_lighthouse: $0.0001
    domain_competitors: $0.02
    serp_organic: $0.01
    backlinks_summary: $0.02

RENDER:
  4 KPI cards (Custo Hoje, Projeção, Custo/Lead, Chamadas Acumuladas)
  Grid de 7 cards de capability (preço + endpoint + status ativo/ocioso)
  Margem por plano (Raio-X R$0, Sentinela R$197, Domínio R$497)
  ROI projection (custo real por lead)
```

---

## 8. Fluxo — Criteria Page

```
File: apps/web/src/app/[lang]/(dashboard)/(private)/admin/criteria/page.tsx
Server Component (puramente documental)

Dados ESTÁTICOS da spec Pain Criteria v1.2:
  - Schwartz 5 níveis (SCHWARTZ_LEVELS importado de scoring.ts)
  - 20 sinais (FIT_SIGNALS, ENGAGEMENT_SIGNALS, INTENT_SIGNALS)
  - 8 sinais Website (WEBSITE_SIGNALS — marcados "Simulado até v0.3")
  - Fórmula do score composto
  - Decay de engagement
  - Calibração mensal
  - Campos derivados

NÃO consome APIs externas — é documentação de referência.
```

---

## 9. Fluxo — Settings Page

```
File: apps/web/src/app/[lang]/(dashboard)/(private)/admin/settings/page.tsx
Server Component

Detecção REAL de credenciais via process.env:
  SUPABASE_SERVICE_ROLE_KEY → length > 20 → ✅ ativo
  CLOUDFLARE_R2_ACCOUNT_ID → length > 10 → ✅
  CLOUDFLARE_R2_ACCESS_KEY → length > 10 → ✅
  CLOUDFLARE_R2_SECRET_KEY → length > 10 → ✅
  CLOUDFLARE_R2_BUCKET → não vazio → ✅
  DATAFORSEO_LOGIN + PASSWORD → presentes → ✅

Engine data (mesma getAdminDashboardData):
  evoApiOnline, qdrantOnline, redisOnline, embedOnline
  corpusTotal (self + conv + materio)
  capabilities, mcpServers, boaScore, boaVeredict

RENDER:
  6 provider cards com status REAL + env vars tabela
  2 cards de detalhe (Supabase Postgres 8 linhas, R2 Vault 8 linhas)
  Ecosystem health (5 indicadores com contagem)
  Pipeline alert (verde se service_role ativo)
```

---

## 10. Matriz de Conexões Verificadas

| Origem | Destino | Protocolo | Porta | Status |
|--------|---------|-----------|:-----:|:------:|
| Next.js Server | Redis adsentice | redis-cli | :6396 | ✅ |
| Next.js Server | Qdrant adsentice | REST HTTP | :6352 | ✅ |
| Next.js Server | Embed Server | REST HTTP | :8081 | ✅ |
| Next.js Server | EVO-API MCP | JSON-RPC SSE | :7700 | ✅ |
| EVO-API | DataForSEO | REST HTTPS | api.dataforseo.com:443 | ✅ |
| Next.js Server | Supabase Postgres | pg (Pool) | aws-0-ca-central-1.pooler.supabase.com:6543 | ✅ |
| Next.js Server | Supabase REST | HTTP/2 | tdigauruusdhnpvppixb.supabase.co:443 | ✅ |
| Next.js Client | Next.js API Routes | HTTP | :3000 | ✅ |
| Browser | Next.js Dev Server | HTTP | :3000 | ✅ |
| Scoring Engine | (nenhum) | Função pura | — | ✅ |

---

## 11. Dependências entre Arquivos

```
discovery/page.tsx (CLIENT)
  └─► POST /api/discovery-search
       └─► evo-mcp.ts ──► EVO-API :7700 ──► DataForSEO
       └─► scoring.ts (puro, sem I/O)
       └─► discovery-cache.ts ──► Redis :6396
       └─► discovery-persistence.ts ──► Supabase

competitive-benchmark/route.ts
  └─► evo-mcp.ts ──► EVO-API :7700 ──► DataForSEO
  └─► scoring.ts (puro)
  └─► discovery-cache.ts ──► Redis :6396

discovery-data/route.ts
  └─► discovery-persistence.ts ──► Supabase
  └─► Redis :6396 (fallback)

engine.ts
  └─► Redis :6396
  └─► Qdrant :6352
  └─► EVO-API :7700
  └─► Embed :8081
  └─► .mcp.json (fs)
  └─► git (execSync)
  └─► discovery-persistence.ts ──► Supabase

admin/page.tsx ──► engine.ts
pipeline/page.tsx ──► engine.ts
costs/page.tsx ──► engine.ts + Redis :6396 (cost:last)
categories/page.tsx ──► GET /api/discovery-data ──► discovery-persistence.ts ──► Supabase
settings/page.tsx ──► engine.ts + process.env
criteria/page.tsx ──► scoring.ts (SCHWARTZ_LEVELS constant, puro)
```

---

## 12. Custos por Operação

| Operação | Custo | Quem Paga | Tracking |
|----------|:-----:|-----------|----------|
| Discovery Search | $0.015/busca | adsentice | Redis cost:today/total |
| Perfil GMB individual | $0.0054/lead | adsentice | Não implementado ainda |
| Keyword Research | $0.02/keyword | adsentice | Planejado L3 |
| On-Page Lighthouse | $0.0001/URL | adsentice | Planejado L1 |
| Domain Competitors | $0.02/domain | adsentice | Planejado L3 |
| SERP Organic | $0.01/keyword | adsentice | Planejado |
| Backlinks Summary | $0.02/domain | adsentice | Planejado L3 |
| Scoring Engine | $0 | N/A | Função pura |
| Supabase Read/Write | $0 (free tier) | N/A | Incluso |
| Redis | $0 (local Docker) | N/A | Incluso |
| Qdrant | $0 (local Docker) | N/A | Incluso |
| Embed | $0 (local process) | N/A | Incluso |

---

*Arquitetura v1.0 · 2026-07-12 · 12 seções · Todas as conexões verificadas contra código fonte e testadas · medido=verdade*
