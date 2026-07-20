# 🔍 ADSENTICE · Desync Audit · 2026-07-20

**medido=verdade · DAG 5-passos · 3 agentes paralelos**
**12 páginas · 42 APIs · 20 migrations · 4 libs · 7,128 linhas de UI**

---

## Resumo

15 desyncs encontrados. 4 críticos (mentira ao usuário/cliente). 6 warnings (stale/estático). 5 info (melhorias).

| Severity | Count |
|----------|-------|
| 🔴 CRITICAL | 4 |
| 🟡 WARNING | 6 |
| 🔵 INFO | 5 |

---

## 🔴 CRITICAL (4)

### C1 · `/admin/solutions` vende produto que não está live

**Desync:** A página lista 5 planos com status, features e preços. O plano **Sentinela R$197** promete "Landing Page A/B (S11K)" e "MockUp ReBrand (S11-MK)". Mas `/api/surface/status` mostra que várias superfícies ainda estão com status `spec` ou `beta`, não `live`.

**Evidência:**
- `solutions/page.tsx:34` — `{ tier: 'starter', name: 'Sentinela', status: 'beta' as const, delivers: ['Landing Page A/B (S11K)', 'MockUp ReBrand (S11-MK)'] }`
- `surface/page.tsx:50` — `fetch('/api/surface/status')` retorna 22 superfícies com `status` field
- `s11_events` (migration 015) — tabela existe mas `event` types são `'view'` e `'cta_click'`, sem tracking de conversão

**Impacto:** Se um lead pagar R$197/mês pelo Sentinela, recebe produto incompleto. Risco de churn e dano à reputação.

**Ação sugerida:** Alinhar `solutions/page.tsx` com estado real das surfaces OU priorizar S11K/S11-MK como milestone imediato.

---

### C2 · `/admin/categories` mostra 29 categorias com dados que não existem

**Desync:** A página tem `CATEGORY_INFO` hardcoded (29 categorias, 397 linhas) com `market`, `tier`, `segment`, `why`. Mas a API real `getCategoryIntelligence()` (category-intel.ts) mostra que **23/29 categorias têm 0 leads**. A página não faz distinção visual entre categorias com dados e sem dados.

**Evidência:**
- `categories/page.tsx:30-71` — `CATEGORY_INFO` hardcoded 29 entries
- `category-intel.ts:89` — `getCategoryIntelligence()` retorna `totalDiscovered: 0` para 23 categorias
- `categories/page.tsx:169` — `getPreflightMarketIntel()` comentário: "DataForSEO retorna total_count agregado (não quebra por categoria)"

**Impacto:** Founder e Claude tomam decisões baseadas em dados que parecem completos mas não são. As 23 categorias "fantasmas" poluem a UI.

**Ação sugerida:** Substituir `CATEGORY_INFO` estática por cards dinâmicos de `getCategoryIntelligence()`. Badge visual: 🟢 tem dados / 🔴 0 leads.

---

### C3 · `/admin/leads/[id]` é 100% MOCK — nunca mostra dados reais

**Desync:** A página de detail de lead (`leads/[id]/page.tsx`, 280 linhas) usa `MOCK_LEAD` hardcoded. Nenhuma query ao Supabase. O LeadTable (client component) tem mais dados que a página de detalhe.

**Evidência:**
- `leads/[id]/page.tsx` — `const MOCK_LEAD = {...}` (hardcoded, 280 linhas totais)
- `leads/LeadTable.tsx:532` — modal de detail no client component TEM dados reais (props do server)
- `leads/page.tsx:345` — server component busca dados reais do Supabase

**Impacto:** Qualquer link para "ver detalhe do lead" mostra dados falsos. Founder não consegue inspecionar um lead real.

**Ação sugerida:** Refatorar `leads/[id]/page.tsx` para buscar do Supabase por `place_id` (igual o LeadTable modal faz).

---

### C4 · `category-intel.ts` retorna métricas de negócio hardcoded como 0

**Desync:** A interface `CategoryIntelligence` define `conversion: { raioXSent, proposalsGenerated, clientsActive, mrrByCategory }` mas **todas são hardcoded a 0**. Não existem tabelas `clients`, `mrr`, `proposals` no banco. O TypeScript mente — a interface promete dados que não existem.

**Evidência:**
- `category-intel.ts:234` — `conversion: { raioXSent: 0, proposalsGenerated: 0, clientsActive: 0, mrrByCategory: 0 }`
- `category-intel.ts:300` — `emptyCategoryIntel()` mesmo padrão
- `packages/db/supabase/migrations/` — 20 migrations, zero tabelas de `clients`/`mrr`/`proposals`
- `grep -rn "clients\|mrr\|proposals" packages/db/supabase/migrations/` → 0 hits

**Impacto:** API `/api/category/intel` retorna JSON com campos zerados. Consumidores da API (Market Intel, Auto-Pilot) recebem dados inválidos silenciosamente.

**Ação sugerida:** Remover campos `conversion.*` da interface até que as tabelas existam OU criar migration para tracking de conversão.

---

## 🟡 WARNING (6)

### W1 · `/admin/criteria` — "87 sinais" vs 66 no código vs 35+ no scoring.ts

**Desync:** A UI declara "87 sinais". O código da página tem 66 sinais hardcoded (12 famílias). `scoring.ts` tem 35+ sinais ativos no motor de score. Números inconsistentes entre documentação, UI e engine.

**Evidência:**
- `criteria/page.tsx:651` — 66 sinais em 12 arrays hardcoded
- `scoring.ts:856` — 35+ sinais com pesos e condições (F1-F11, E1-E10, I1-I6, W1-W12)
- Nenhuma query ao Supabase para distribuição real dos sinais

**Ação:** Auditar contagem real de sinais. Alinhar UI com scoring.ts. Gerar tabela dinamicamente.

---

### W2 · `/admin/pipeline` — estágios S0-S7 computados em memória, sem coluna

**Desync:** A página computa estágios de pipeline a partir de `enrichment_level`, `website`, `l3_social_links` etc. em memória. Os estágios não são persistidos — cada render recalcula. Não há rastreabilidade de quando um lead mudou de estágio.

**Evidência:**
- `pipeline/page.tsx:39-59` — dedup + enrichment counts computados em memória
- `RUNBOOKS` hardcoded (S0-S7) sem dados reais de transição
- Nenhuma coluna `pipeline_stage` em `discovery_listings` (20 migrations)

**Ação:** Adicionar seletor de categoria + funnel por categoria (ADR-0052). Futuro: coluna `pipeline_stage`.

---

### W3 · `/admin/costs` lê Redis via `execSync` — frágil

**Desync:** A página usa `child_process.execSync` para rodar `redis-cli` e parsear output. Se o Redis estiver offline, a página quebra com erro de shell, não com erro HTTP gracioso.

**Evidência:**
- `costs/page.tsx:8` — `import { execSync } from 'child_process'`
- `costs/page.tsx:130-150` — múltiplos `execSync('redis-cli -p 6396 GET ...')`
- `telemetry.ts` — já existe cliente Redis via MCP/fetch, mas costs não usa

**Ação:** Migrar para fetch Redis REST (padrão das outras páginas) ou usar o MCP Redis.

---

### W4 · `/admin/discovery` — 2,239 linhas, a maior página, `'use client'`

**Desync:** Discovery é o componente mais complexo do admin (30+ variáveis de estado, 8 APIs chamadas) mas é 100% client-side. Qualquer refactor é arriscado. Sem testes.

**Evidência:**
- `discovery/page.tsx:1` — `'use client'`
- `discovery/page.tsx:2239` — 2,239 linhas em 1 arquivo
- 30+ `useState`, `useEffect`, `useCallback`

**Ação:** Extrair sub-componentes (AutoPilot já feito). NÃO refatorar agora — risco alto.

---

### W5 · `/admin/surface` — importa `WarpComposeDemo` não documentado

**Desync:** A página importa `@/components/WarpComposeDemo` mas o componente não está documentado em nenhuma ADR de surface.

**Evidência:**
- `surface/page.tsx:19` — `import WarpComposeDemo from '@/components/WarpComposeDemo'`
- ADR-0031 (Warp Family) — menciona 22 superfícies, não menciona WarpComposeDemo

**Ação:** Documentar ou remover.

---

### W6 · `/admin/solutions` + `/admin/criteria` + `/admin/leads/[id]` — 100% estáticos

**Desync:** 3 das 12 páginas (25%) não têm NENHUMA fonte de dados viva. Mudanças no banco, scoring, ou surfaces não se refletem.

**Evidência:**
- `solutions/page.tsx:526` — `PLANS`, `PERSONAS`, `PROJECTION` hardcoded
- `criteria/page.tsx:651` — todos os sinais hardcoded
- `leads/[id]/page.tsx:280` — `MOCK_LEAD` hardcoded

**Ação:** Wire dados reais. Prioridade: C3 (leads/[id]) > W6 (criteria) > W6 (solutions).

---

## 🔵 INFO (5)

### I1 · Links cross-page — 4 quebrados de 32 (12.5%)

**Evidência:**
- `/admin/solutions` → sem link para `/admin/surface` (products não linkam para surfaces)
- `/admin/costs` → link para plans interno, não para `/admin/solutions`
- `/admin/market` → já importa `getCategoryOpportunityQuick` mas não linka de volta para `/admin/categories`
- `/admin` (dashboard) → `RECENT_ACTIVITY` hardcoded desde v0.2

---

### I2 · `LeadTable.tsx` tem mais dados que `leads/[id]/page.tsx`

O modal do LeadTable (client-side, 532 linhas) mostra score breakdown, sinais detectados, concorrentes, L2 data. A página de detail (server, 280 linhas) mostra `MOCK_LEAD`. O componente reutilizável é melhor que a página dedicada.

**Ação:** Unificar — usar o modal do LeadTable como fonte, ou refatorar `leads/[id]` para usar os mesmos dados.

---

### I3 · CRITERIA_TRIGGERS definidos mas não usados em lugar nenhum

`criteria/page.tsx` define 6 triggers acionáveis mas nenhuma outra página os referencia. O Auto-Pilot (ADR-0051) não usa triggers. O Pipeline não usa triggers.

**Ação:** Wire CRITERIA_TRIGGERS no Auto-Pilot como condição de entrada.

---

### I4 · `/admin/settings` lê `process.env` diretamente — expõe chaves?

A página mostra tabelas com nomes de variáveis de ambiente (SUPABASE_URL, DATA_FORSEO_API_KEY, etc.) e indica se estão setadas. Não expõe valores, mas expõe nomes.

**Evidência:**
- `settings/page.tsx:350-450` — `process.env.SUPABASE_URL ? '✅' : '❌'`

**Ação:** Verificar se a página é admin-gated (é, `role !== 'admin'` redirect). OK por enquanto.

---

### I5 · `ibge_panorama` tem 419 municípios — usamos só para gaps

A tabela IBGE tem dados ricos (população, PIB per capita, IDHM, densidade, receitas, despesas) mas `category-intel.ts` só usa para calcular gaps de cobertura. O potencial de análise de mercado não está sendo usado.

**Evidência:**
- `migration 009` — `ibge_panorama` com 14 colunas
- `category-intel.ts:120-126` — usa `ibge_panorama` apenas para `municipio_nome` e `populacao`
- `market-intel.ts` — usa mais campos (PIB, IDHM)

**Ação:** Enriquecer Category Intel com dados IBGE (renda média, PIB per capita) para score de oportunidade mais preciso.

---

## 📊 Cross-Page Data Flow (realidade medida)

```
supabase:discovery_listings (5,745 leads)
        │
        ├── /admin/leads ✅ (REST API, dedup, filtros)
        ├── /admin/pipeline ✅ (2000 rows, dedup, enrichment counts)
        ├── /admin/categories ⚠️ (3000 rows, KPIs só — cards são estáticos)
        ├── /admin/market ✅ (via market-intel.ts, getCategoryOpportunityQuick)
        │
        └── category-intel.ts ✅ (getCategoryIntelligence com normalizeCategory)
                │
                ├── /api/category/intel ✅ (GET, 29 categorias)
                ├── auto-pilot.ts ✅ (autoPilotDecide)
                │       └── /api/auto-pilot/decide ✅ (GET)
                └── /admin/market ✅ (getCategoryOpportunityQuick)
```

**Fluxos quebrados:**
- `category-intel.ts` → `/admin/categories` ❌ (API existe, página não usa)
- `/admin/solutions` → `/admin/surface` ❌ (planos não linkam para status real das surfaces)
- `scoring.ts` → `/admin/criteria` ❌ (sinais reais do motor não chegam na página de documentação)

---

## 🎯 Prioridade sugerida

| # | O que | Severity | Esforço | Dependência |
|---|-------|----------|---------|-------------|
| 1 | C2: Categories dinâmico | 🔴 | 1.5h | getCategoryIntelligence() ✅ |
| 2 | C3: leads/[id] real | 🔴 | 1h | Supabase ✅ |
| 3 | C1: Solutions alinhar com surfaces | 🔴 | 30min | /api/surface/status ✅ |
| 4 | C4: Remover conversion.* ou criar tracking | 🔴 | 15min (remover) | Nenhuma |
| 5 | W6: Wire dados reais em criteria | 🟡 | 2h | scoring.ts ✅ |
| 6 | W6: Wire dados reais em solutions | 🟡 | 1.5h | surfaces + plans ✅ |
| 7 | W1: Auditar contagem de sinais | 🟡 | 30min | scoring.ts ✅ |
| 8 | W3: Migrar costs de execSync para REST | 🟡 | 30min | Redis HTTP ✅ |
| 9 | I1: Corrigir 4 links quebrados | 🔵 | 20min | Nenhuma |
| 10 | I3: Wire CRITERIA_TRIGGERS no Auto-Pilot | 🔵 | 1h | criteria ✅ |

**Total críticos: ~3h. Total tudo: ~9h.**

---

*DAG · 3 agentes paralelos · 16 fontes de código · 20 migrations · medido=verdade*
*Gerado em 2026-07-20 · adsentice · commit d577ec0*
