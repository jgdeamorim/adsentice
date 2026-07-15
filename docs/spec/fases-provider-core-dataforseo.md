# Fases de Implementação: Provider-Core DataForSEO Completo

> **Propósito:** Roadmap completo de TODAS as capabilities DataForSEO que o EVO-API tem
> mapeadas (shapes + translators + cost-registry) e que o adsentice ainda não implementou.
> Inclui padrão de **Market Holds** absorvido do capital.RS (time-series trading-style).
> **Data:** 2026-07-15 · **Status:** CANON
> **Referências:** `auditoria-evo-api-capabilities-adsentice.md` · `capital.RS/crates/capital-core/src/market.rs`

---

## §0 · O que é um Market Hold (capital.RS → adsentice)

No **capital.RS** (plataforma de trading Rust), um "hold" é uma **posição mantida ao longo do tempo**
com monitoramento contínuo. O crate `capital-core` define:

```rust
pub struct Ohlcv { ts_ns, o, h, l, c, v }           // barra de preço
pub struct MarketSnapshot { class_, symbol, ts_ns, bid, ask, mid, spread, features }
```

Cada snapshot é imutável e append-only. O `rsxt-t0` armazena séries temporais por
`(tenant, provider, capability, entity, metric)` — cada métrica é uma série independente.

**No adsentice, um Market Hold é análogo:**
- `Ohlcv` → `MarketHold { category, city, metric, value, recorded_at }`
- `MarketSnapshot` → snapshot de agregados de mercado (avg_score, total_businesses, distribution) após cada Discovery search
- Append-only no Supabase (`market_holds` table, migration 004)
- Cada `(category, city, metric)` é uma série temporal independente

**Por que isso importa:** Com 6 meses de market holds, podemos responder perguntas como:
- "O score médio dos dentistas em Madureira está subindo ou caindo?"
- "Qual bairro do Rio teve o maior crescimento de negócios verificados em 2026?"
- "A concorrência em SP aumentou 30% no último trimestre — quais categorias?"

**Isso é inteligência de mercado que NENHUM concorrente tem.** É o equivalente a ter
"candles" de mercado local — mesma lógica de trading aplicada a SMB marketing.

---

## §1 · Status Atual (2026-07-15)

| Métrica | Valor |
|---------|-------|
| **Caps EVO-API mapeadas** | 73 |
| **Caps relevantes p/ SMB Brasil** | 40 |
| **Implementadas no provider-core** | 8 (20%) |
| **Padrões EVO-API absorvidos** | 8/14 (57%) |
| **Custo pipeline atual** | ~$0.058/lead |
| **Market holds ativos** | migration pronta, tabela vazia |

---

## §2 · Visão geral das 6 Fases

```
FASE 1 ✅ COMPLETA (8 tools)
  L0: listings_search
  L1: profile_gmb
  L2: instant_pages, domain_technologies, lighthouse
  L3: backlinks_competitors
  L4: serp_organic, google_reviews

FASE 2 🔴 L3 Competitive Intelligence (6 tools)
  domain.competitors, domain.ranked_keywords, domain.keyword_gap,
  domain.overview, keyword.research, serp.local_finder

FASE 3 🟡 L4 Keywords & Market Intel (5 tools)
  keyword.volume, keyword.trends, keyword.related,
  on_page.links, content.sentiment_summary

FASE 4 🟢 Deep Intelligence (5 tools)
  databases.keyword.historical, business.qa,
  content.search, serp.maps, serp.ai_mode

FASE 5 🔵 Market Holds Pipeline (infra)
  market_holds live, triangulação cross-cap,
  /admin/market time-series, keyword_history ingest

FASE 6 ⚪ Enterprise (4 tools)
  ai.llm.mentions, ai.llm.responses,
  domain.whois, on_page.crawl_summary
```

---

## §3 · FASE 2 — L3 Competitive Intelligence

**Objetivo:** Fechar o gap de competitive landscape. Hoje o S10 diz "47 concorrentes na região"
— número estimado. Com Fase 2, será "Seus 3 principais concorrentes são X, Y, Z. Eles rankeiam
para 230 keywords que você não rankeia. A maior oportunidade é 'periodontia em Madureira'."

### 2.1 · `domain.competitors` ($0.0101)

**Endpoint:** `POST /v3/dataforseo_labs/google/competitors_domain/live`
**Input:** domain, location_code, language_code
**Output:** Array de `{ competitor_domain, common_keywords, organic_traffic, paid_traffic, avg_position }`
**Uso:** "Quem compete com ksoodontologia.com.br?"
**SLA:** 8s · **Linhas:** ~60

### 2.2 · `domain.ranked_keywords` ($0.0101)

**Endpoint:** `POST /v3/dataforseo_labs/google/ranked_keywords/live`
**Input:** target (domain), location_code, language_code, limit
**Output:** Array de `{ keyword, position, volume, cpc, difficulty, intent, serp_features }`
**Uso:** "Quais keywords ksoodontologia.com.br rankeia?"
**SLA:** 8s · **Linhas:** ~60

### 2.3 · `domain.keyword_gap` ($0.0101)

**Endpoint:** `POST /v3/dataforseo_labs/google/domain_intersection/live`
**Input:** target1, target2, location_code, language_code
**Output:** Array de `{ keyword, volume, cpc, difficulty, position_target1, position_target2 }`
**Uso:** "Quais keywords o concorrente rankeia e eu não?"
**SLA:** 8s · **Linhas:** ~60

### 2.4 · `domain.overview` ($0.0101)

**Endpoint:** `POST /v3/dataforseo_labs/google/domain_rank_overview/live`
**Input:** target (domain)
**Output:** `{ organic_traffic, organic_kw_count, paid_traffic, paid_kw_count, count_top_3, count_top_10 }`
**Uso:** Snapshot rápido do domínio (sem iterar keywords)
**SLA:** 8s · **Linhas:** ~50

### 2.5 · `keyword.research` ($0.02)

**Endpoint:** `POST /v3/dataforseo_labs/google/keyword_overview/live`
**Input:** keyword (seed), location_code, language_code
**Output:** `{ keyword, volume, cpc, difficulty, intent, trend[12m], competition, categories }`
**Uso:** "Qual o volume de busca de 'periodontia em Madureira'? Vale a pena atacar?"
**SLA:** 5s · **Linhas:** ~70

### 2.6 · `serp.local_finder` ($0.002)

**Endpoint:** `POST /v3/serp/google/local_finder/live/advanced`
**Input:** keyword, location_code, language_code
**Output:** Array de SERP items do Google Maps local pack
**Uso:** "Quem aparece no Maps quando busco 'dentista Madureira'?"
**SLA:** 8s · **Linhas:** ~50

**Custo Fase 2:** +$0.0624/lead · **Pipeline acumulado:** ~$0.120/lead

---

## §4 · FASE 3 — L4 Keywords & Market Intel

### 4.1 · `keyword.volume` ($0.075)

**Endpoint:** `POST /v3/keywords_data/google_ads/search_volume/live`
**Input:** keywords[] (até 1000), location_code, language_code
**Output:** Array de `{ keyword, search_volume, competition, cpc, monthly_searches[12m] }`
**Uso:** Batch de volume para lista de keywords candidatas
**SLA:** 8s · **Linhas:** ~60
⚠️ Caro ($0.075). Usar com moderação — 1 chamada cobre 1000 keywords.

### 4.2 · `keyword.trends` ($0.009)

**Endpoint:** `POST /v3/keywords_data/google_trends/explore/live`
**Input:** keywords[] (max 5), type (web/news/youtube/images), time_range
**Output:** `{ interest_over_time[{ date_from, timestamp, values[] }], averages[] }`
**Uso:** "'Clareamento dental' tem pico em dezembro (férias)?"
**SLA:** 8s · **Linhas:** ~60

### 4.3 · `keyword.related` ($0.0109)

**Endpoint:** `POST /v3/dataforseo_labs/google/related_keywords/live`
**Input:** seed_keyword, depth (0-4), location_code, language_code
**Output:** Array de `{ keyword, search_volume, competition, cpc, depth, monthly_searches[] }`
**Uso:** "Quais keywords relacionadas a 'dentista' as pessoas buscam?"
**SLA:** 8s · **Linhas:** ~60

### 4.4 · `on_page.links` ($0.000125)

**Endpoint:** `POST /v3/on_page/links` (task-based)
**Input:** target (domain), max_crawl_pages
**Output:** `{ items[{ link_type, direction, dofollow, domain_from, domain_to, is_broken }] }`
**Uso:** Detectar backlinks internos quebrados, links externos, estrutura de navegação
**SLA:** 20s (task poll) · **Linhas:** ~70

### 4.5 · `content.sentiment_summary` ($0.02003)

**Endpoint:** `POST /v3/content_analysis/summary/live`
**Input:** keyword (brand/topic), language_code
**Output:** `{ total_count, top_domains[], sentiment_connotations{6}, connotation_types{3}, countries{}, languages{} }`
**Uso:** "O que estão falando da clínica na internet? Positivo ou negativo?"
**SLA:** 12s · **Linhas:** ~60

**Custo Fase 3:** +$0.115/lead · **Pipeline acumulado:** ~$0.235/lead

---

## §5 · FASE 4 — Deep Intelligence

### 5.1 · `databases.keyword.historical` ($0.0101)

**Endpoint:** `POST /v3/dataforseo_labs/google/historical_keyword_data/live`
**Input:** keywords[] (max 700), location_code, language_code
**Output:** Array de `{ keyword, history[{ year, month, search_volume, competition, cpc }] }` (até 56 meses)
**Uso:** **Market hold puro** — 4 anos de histórico de volume de busca. Gráfico de tendência no /admin/market.
**SLA:** 10s · **Linhas:** ~70
⭐ Este é o equivalente mais próximo do padrão `capital.RS Ohlcv` — cada keyword é uma série temporal OHLCV.

### 5.2 · `business.qa` ($0.00075)

**Endpoint:** `POST /v3/business_data/google/questions_and_answers/task_post` (task-based)
**Input:** keyword, location_code, language_code
**Output:** `{ questions[{ question_text, timestamp, answers[{ answer_text, profile_name }] }] }`
**Uso:** Perguntas REAIS de pacientes: "Aceita convênio?", "Faz implante?", "Parcela?"
**SLA:** 20s · **Linhas:** ~70

### 5.3 · `content.search` ($0.02)

**Endpoint:** `POST /v3/content_analysis/search/live`
**Input:** keyword, language_code, limit
**Output:** `{ total_count, items[{ url, domain, title, snippet, sentiment_connotations, content_quality_score }] }`
**Uso:** "Onde a clínica é mencionada na internet? Quais sites falam dela?"
**SLA:** 12s · **Linhas:** ~60

### 5.4 · `serp.maps` ($0.002)

**Endpoint:** `POST /v3/serp/google/maps/live/advanced`
**Input:** keyword, location_code, language_code
**Output:** Array de SERP items do Google Maps (local pack)
**Uso:** "Quem aparece no topo do Maps? O que eles têm que eu não tenho?"
**SLA:** 8s · **Linhas:** ~50

### 5.5 · `serp.ai_mode` ($0.004)

**Endpoint:** `POST /v3/serp/google/ai_mode/live/advanced`
**Input:** keyword, location_code, language_code
**Output:** Array de AI Overview references (GEO — Generative Engine Optimization)
**Uso:** "O Google AI Overview menciona minha clínica? E a do concorrente?"
**SLA:** 8s · **Linhas:** ~50

**Custo Fase 4:** +$0.037/lead · **Pipeline acumulado:** ~$0.272/lead

---

## §6 · FASE 5 — Market Holds Pipeline (INFRA)

Esta fase não adiciona novas capabilities DataForSEO — ela **ativa a inteligência
acumulada** das fases anteriores como séries temporais.

### 6.1 · Market Holds Live

**O que é:** Cada Discovery search grava `market_holds` no Supabase:
```typescript
await appendMarketHolds([
  { category: 'dentist', city: 'Rio de Janeiro', metric: 'avg_score', value: 62.3, searchId },
  { category: 'dentist', city: 'Rio de Janeiro', metric: 'total_businesses', value: 5404, searchId },
  { category: 'dentist', city: 'Rio de Janeiro', metric: 'claimed_pct', value: 68.5, searchId },
  // ... 12 métricas por busca
])
```
**Status:** `market-holds.ts` pronto, `appendMarketHold()` implementado, migration 004 criada.
**Falta:** Wire no `discovery-search/route.ts` — chamar `appendMarketHolds()` após cada busca.

### 6.2 · Triangulação Cross-Cap

**O que é:** Combinar 4+ capabilities para gerar sinais derivados que NENHUM provedor
oferece sozinho. Padrão absorvido do `EVO-API/crates/evo-execution/src/triangulate.rs`.

```typescript
interface TriangulatedKeyword {
  keyword: string
  volume: number          // keyword.research
  difficulty: number      // keyword.research
  cpc: number             // keyword.research
  competitor_count: number // serp.organic (quantos concorrentes aparecem?)
  gap_opportunity: number  // domain.keyword_gap (quantas keywords o concorrente tem que eu não?)
  clicks_per_usd: number   // DERIVADO: volume * ctr_estimate / cpc
  score: number            // 0-100 composite opportunity score
}
```

**Linhas:** ~150 (novo arquivo `packages/provider-core/src/triangulate.ts`)

### 6.3 · `/admin/market` Time-Series Dashboard

Atualizar a página de market para mostrar gráficos de evolução temporal:
- **Gráfico de linha:** avg_score por mês (dos `market_holds`)
- **Gráfico de barra:** distribuição Schwartz ao longo do tempo
- **Heatmap:** densidade competitiva por bairro×categoria
- **Tabela:** top keywords com maior crescimento de volume (keyword_history)

### 6.4 · Keyword History Ingest

Rodar `keyword.historical` para as TOP 50 keywords de cada categoria principal
e popular `keyword_history` table. Isso cria uma base de conhecimento de tendências.

**Custo estimado:** 5 categorias × 50 keywords × $0.0101 = ~$2.53 (one-time)

### 6.5 · Redis Market Cache (TTL 1h)

```typescript
// Já implementado em cacheMarketSnapshot()
redisCli(`SETEX adsentice:market:dentist:Rio de Janeiro:avg_score 3600 62.3`)
```
Evita query no Supabase a cada reload do /admin/market.

---

## §7 · FASE 6 — Enterprise

Fase para o plano Escala (R$997/mês) e Growth OS (R$1.497/mês).

### 7.1 · `ai.llm.mentions` ($0.20) ⚠️ CARO

Monitora onde uma marca é mencionada em ChatGPT, Gemini, Claude.
**Uso:** Brand monitoring em AI search. Plano Escala.
**Custo:** $0.20/call — usar com limite mensal.

### 7.2 · `ai.llm.responses` ($0.0008)

Respostas de LLMs para prompts específicos.
**Uso:** "O que o ChatGPT responde quando perguntam 'melhor dentista em Madureira'?"
**Custo:** $0.0008 — barato.

### 7.3 · `domain.whois` ($0.101)

Data de criação, expiração, registrar do domínio.
**Uso:** Domain age como sinal de autoridade (concorrente com domínio de 2005 vs 2024).
**Custo:** $0.101 — usar com parcimônia.

### 7.4 · `on_page.crawl_summary` ($0.000125)

Resumo do site inteiro: quantas páginas, CMS detectado, broken links, duplicate titles.
**Uso:** Auditoria completa de site (complementa instant_pages).
**Custo:** $0.000125 — barato.

### 7.5 · NÃO implementar (33 caps irrelevantes)

App Store (4), Merchant/Amazon (4), Databases (2), SERP não-Google/Baidu/Bing/Yahoo (15),
SERP Images/News/Jobs/Events/Finance (8) — irrelevantes para SMB Brasil.

---

## §8 · Resumo de Custos por Fase

| Fase | Tools | Custo extra | Pipeline acumulado | Tempo estimado |
|------|-------|:----------:|:------------------:|:-------------:|
| **Fase 1** ✅ | 8 | — | **$0.058** | — |
| **Fase 2** | 6 | +$0.062 | **$0.120** | 2-3h |
| **Fase 3** | 5 | +$0.115 | **$0.235** | 2-3h |
| **Fase 4** | 5 | +$0.037 | **$0.272** | 2-3h |
| **Fase 5** | infra | $0 | **$0.272** | 3-4h |
| **Fase 6** | 5 | +$0.322 | **$0.594** | 2-3h |

**Pipeline completo (40 caps):** ~$0.594/lead

---

## §9 · Market Holds — O Paralelo com Trading

| Conceito | capital.RS (trading) | adsentice (market intel) |
|----------|---------------------|-------------------------|
| **Ativo** | BTCUSDT, EURUSD | "dentist:Rio de Janeiro" |
| **Barra OHLCV** | open/high/low/close/volume | avg_score (open=last, high=max, low=min, close=current) |
| **MarketSnapshot** | bid/ask/mid/spread + features | (total_businesses, claimed_pct, website_pct, analytics_pct...) |
| **Série temporal** | rsxt-t0 ticks/bars | market_holds table (append-only) |
| **Indicador** | RSI(14), EMA(20), regime tag | score_velocity (mês a mês), competitor_growth_rate |
| **Hold** | Posição mantida com stop-loss/take-profit | Categoria×região monitorada com alertas |
| **Backtest** | Walk-forward validation | "Se tivéssemos abordado dentistas em SP em jan/2026, qual seria o ROI?" |
| **Signal** | BUY/SELL baseado em indicadores | "ALTA oportunidade: dentistas em Pinheiros com score<50 e rating>4.0" |

### 9.1 · O Padrão de Hold no adsentice

```typescript
// capital.RS: MarketSnapshot { symbol, ts_ns, bid, ask, mid, spread, features }
// adsentice: MarketHold { category, city, metric, value, recorded_at, metadata }

interface MarketHold {
  category: string       // "symbol" do mercado local (ex: "dentist")
  city: string            // "venue" (ex: "Rio de Janeiro")
  metric: MarketMetric    // "indicator" (ex: "avg_score")
  value: number           // o valor numérico (ex: 62.3)
  recorded_at: string     // timestamp (ex: "2026-07-15T14:30:00Z")
  metadata?: {            // features computadas (ex: distribution, signals)
    schwartz_distribution: Record<string, number>
    top_gaps: string[]
    sample_size: number
  }
}
```

### 9.2 · Alertas de Mercado (futuro)

Com 3+ meses de market holds, podemos implementar:

```typescript
interface MarketAlert {
  category: string
  city: string
  type: 'score_drop' | 'density_spike' | 'opportunity_window'
  threshold: number
  current_value: number
  message: string
}

// Exemplo:
// "🚨 ALERTA: avg_score de dentistas em Pinheiros caiu 12% nos últimos 30 dias.
//  3 novos concorrentes abriram. Oportunidade: 78% não têm site."
```

---

## §10 · Ordem de Execução

| # | O quê | Fase | Arquivos | Minutos |
|---|-------|------|----------|---------|
| 1 | `domain.competitors` tool | F2 | `packages/provider-core/src/tools/domain-competitors.ts` | 15 |
| 2 | `ranked-keywords` tool | F2 | `packages/provider-core/src/tools/ranked-keywords.ts` | 15 |
| 3 | `keyword-gap` tool | F2 | `packages/provider-core/src/tools/keyword-gap.ts` | 15 |
| 4 | `domain-overview` tool | F2 | `packages/provider-core/src/tools/domain-overview.ts` | 10 |
| 5 | `keyword-research` tool | F2 | `packages/provider-core/src/tools/keyword-research.ts` | 15 |
| 6 | `serp-local-finder` tool | F2 | `packages/provider-core/src/tools/serp-local-finder.ts` | 10 |
| 7 | Wire Fase 2 no adapter | F2 | `provider-core-adapter.ts` | 10 |
| 8 | Wire `appendMarketHolds()` no discovery | F5 | `discovery-search/route.ts` | 10 |
| 9 | `/admin/market` time-series | F5 | `market/page.tsx` | 20 |
| 10 | `triangulate.ts` | F5 | `packages/provider-core/src/triangulate.ts` | 30 |
| 11 | Fase 3 tools (5) | F3 | `packages/provider-core/src/tools/*.ts` × 5 | 60 |
| 12 | Fase 4 tools (5) | F4 | `packages/provider-core/src/tools/*.ts` × 5 | 60 |
| 13 | Fase 6 tools (5) | F6 | `packages/provider-core/src/tools/*.ts` × 5 | 60 |

**Total estimado:** ~5h30 para as Fases 2-6 completas.

---

---

## §11 · Secret Rotation + CI/CD Production Readiness (FASE 0 · pré-deploy)

**Status:** Planejado para o primeiro deploy em produção (Hetzner CAX11).

### 11.1 · Rotação de secrets comprometidos

Keys que já apareceram em commits públicos (DEVEM ser rotacionadas ANTES de produção):

| Secret | Onde estava exposto | Ação |
|--------|-------------------|------|
| `SUPABASE_DB_PASSWORD` | 4 arquivos `.ts` com senha hardcoded | 🔴 Rotacionar no Supabase Dashboard → Settings → Database |
| `DATAFORSEO_PASSWORD` | `.env` não foi commitado, mas circulou em logs | 🟡 Rotacionar em app.dataforseo.com → Profile |
| `DEEPSEEK_API_KEY` | `docs/secret/.env.DEEPSEEK` tracked (removido em `28d95ef`) | 🟡 Rotacionar em platform.deepseek.com → API Keys |
| `SUPABASE_SERVICE_ROLE_KEY` | `.env` gitignored, mas o JWT expõe project ref | 🟢 Rotacionar no Supabase Dashboard → API |

### 11.2 · CI/CD Pipeline (Cloudflare Workers + GitHub Actions)

```
Git push → GitHub Actions →
  1. secrets: Cloudflare Workers Secrets (wrangler secret put)
  2. build: npm run build (Next.js output)
  3. deploy: wrangler deploy (Cloudflare Workers)
  4. vault: Supabase Vault (pgsodium) para secrets em repouso
```

### 11.3 · Migração de process.env → getSecret()

Todos os arquivos que leem `process.env.X` devem migrar para `getSecret("X")`:

| Arquivo | Secrets usados | Prioridade |
|---------|---------------|------------|
| `provider-core-adapter.ts` | DATAFORSEO_LOGIN, DATAFORSEO_PASSWORD, DEEPSEEK_API_KEY | 🔴 |
| `supabase-admin.ts` | NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY | 🔴 |
| `dataforseo.ts` | DATAFORSEO_PASSWORD | 🟡 |
| `r2-vault.ts` | CLOUDFLARE_R2_* | 🟡 |
| `engine.ts` | (health checks, sem secrets) | 🟢 |

### 11.4 · Checklist pré-deploy

- [ ] Todos os secrets rotacionados (sem keys expostas em commits)
- [ ] `getSecret()` usado em todo o código (zero `process.env.X` direto)
- [ ] Cloudflare Workers Secrets configurados (wrangler secret put)
- [ ] Supabase Vault (pgsodium) configurado para criptografia em repouso
- [ ] `.env` local validado com `auditSecrets()` — sem missing required
- [ ] CI/CD pipeline testada em staging antes de produção

---

---

## §12 · FASE 7 — Pipeline de Captação adsentice (funil ativo)

**Objetivo:** Transformar o pipeline de passivo (contador de Schwartz) para ativo (motor de vendas da adsentice). Cada lead avança por estágios conforme é enriquecido e nutrido com estratégia de marketing.

**Status:** Em implementação · 2026-07-15

### 12.1 · Estágios do Funil adsentice

| Estágio | O que é | Como avança | Ação de nutrição |
|---------|---------|-------------|-----------------|
| **S0 · Descoberto** | Lead encontrado no GMB (L0) | Score composto > 0 | Nenhuma — aguardando enriquecimento |
| **S1 · Perfilado** | L1 completo (27 campos GMB) | `enrichment_level >= 1` | Raio-X gratuito → WhatsApp |
| **S2 · Auditado** | L2 Website+SEO (schema, conteúdo, lighthouse) | `enrichment_level >= 2` | Proposta Sentinela (R$197/mês) |
| **S3 · Qualificado** | Score > 70 + website + claimed | Múltiplos sinais de dor | Proposta Domínio (R$497/mês) |
| **S4 · Contatado** | WhatsApp enviado / email disparado | Ação registrada | Follow-up D+3, D+7 |
| **S5 · Em negociação** | Respondeu, pediu orçamento | Interação registrada | Case de sucesso + objeções |
| **S6 · Cliente** | Plano ativo, MRR recorrente | Pagamento confirmado | Onboarding + NPS 30 dias |
| **S7 · Embaixador** | Indica outros negócios | Indicação registrada | Comissão de indicação |

### 12.2 · Estratégia de Nutrição por Estágio

| Estágio | Canal | Mensagem | Timing |
|---------|-------|----------|--------|
| S0→S1 | Automático | Enriquecimento L1 via API | Imediato após busca |
| S1→S2 | Automático | Enriquecimento L2 via API | Imediato após L1 |
| S2→S3 | WhatsApp | "Dra. [Nome], seu Raio-X está pronto. 4.9★ e 77 avaliações — mas seu site não aparece no Google. Veja: [link]" | D+0 |
| S3→S4 | Email | Relatório completo + 3 gaps + plano de ação | D+1 |
| S4→S5 | WhatsApp | "Concorrentes em [bairro] estão aparecendo no Google. Seu score é [X]/100. Quer ver como chegar em 85+?" | D+3 |
| S5→S6 | Ligação | Founder call — proposta personalizada | D+7 |

### 12.3 · Métricas do Funil (visíveis no /admin/pipeline)

```
S0 Descoberto:  5404 (100%)
S1 Perfilado:    210 (3.9%)
S2 Auditado:      12 (0.2%)
S3 Qualificado:     5
S4 Contatado:       0
S5 Negociação:      0
S6 Cliente:         0
S7 Embaixador:      0
```

**Taxa de conversão alvo:** S0→S1 = 5%, S1→S2 = 10%, S2→S3 = 50% (quem chega no L2 já está pronto)

### 12.4 · Implementação

| # | O quê | Onde | Status |
|---|-------|------|--------|
| 1 | Badge L0/L1/L2 na tabela de leads | `leads/LeadTable.tsx` + `leads/page.tsx` | 🔴 Implementar |
| 2 | Funil ativo com estágios + nutrição | `pipeline/page.tsx` | 🔴 Implementar |
| 3 | Coluna `funnel_stage` no Supabase | migration 006 | ⏳ Planejado |
| 4 | Registro de ações (WhatsApp, email, call) | `lead-actions.ts` | ⏳ Planejado |
| 5 | Automação de follow-up (Cloudflare Workers cron) | `workers/nurture.ts` | ⏳ Planejado |

---

*Fases Provider-Core DataForSEO · 2026-07-15 · medido=verdade*
*21/40 caps implementadas (52.5%) · 7 fases planejadas · Pipeline alvo: $0.594/lead · Fase 0 + Fase 7 documentadas*
