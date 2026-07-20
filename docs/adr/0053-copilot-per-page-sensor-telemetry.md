# ADR-0053 · SPEC-Driven Analysis Engine — Brain OODA como Motor de Consistência Cross-Page

**Status:** PROPOSED (v2 · reformulada após feedback do founder)
**Date:** 2026-07-20
**Author:** jeffer + Claude Opus 4.8
**Supersedes:** ADR-0053 v1 (CopilotRail UI — sintoma, não causa)
**Extends:** ADR-0047 (Brain KG), ADR-0050 (Category Intel), ADR-0051 (Auto-Pilot)
**Reference:** EVO-API ADR-0141 (rsxt-fnd Finding Sensor), ADR-0148 (Cognitive Twin), ADR-0139 (Founder Cockpit), ADR-0164 (Per-Page Telemetry-Jury)
**Sources:** DAG cross-project — 6 ADRs EVO-API + 12 páginas adsentice + finding_arbiter.py + cockpit.py

---

## 0. Diagnóstico Real (o founder cravou)

### 0.1 O sintoma

12 páginas admin · 7,128 linhas · construídas em 155 versões · sem spec canônica por página.

Quando o founder olha para `/admin/categories` e vê 29 categorias estáticas, ele **não tem como saber** se isso é o comportamento correto ou um bug. Não existe um SPEC que diga: "Categories deve mostrar dados dinâmicos de `getCategoryIntelligence()` com cards de oportunidade."

### 0.2 A causa raiz

> "Iniciamos com a documentação técnica errada e não estamos conseguindo analisar o sistema por completo sobre contextualidade semântica de SPEC-driven."

**Não somos SPEC-driven.** Cada página foi construída ad-hoc, sem um contrato declarativo do que ela DEVE ser. Sem spec, não há como medir drift. Sem medir drift, o founder precisa inspecionar manualmente cada página para encontrar gaps — e o Claude não tem contexto cross-page para ajudar.

### 0.3 O que o founder precisa (nas palavras dele)

1. **Análise periódica** — o Brain OODA executa ciclos de análise, não sensores on-demand
2. **Cross-page** — une rotas, estratégias globais, e lógicas de outras páginas
3. **SPEC-driven** — cada página tem um spec canônico; a análise compara spec vs realidade
4. **Reports + Insights** — não uma lista de findings num drawer, mas reports acionáveis com links para ADRs, código, OODA
5. **Auto-suficiência do founder** — o founder consegue analisar sozinho e direcionar o Claude com precisão

### 0.4 Exemplo concreto (dado pelo founder)

> "A captação por categoria sobre regionalidade é uma camada primitiva de análise de abertura de mercado geo. Segunda camada: vender o que já temos sobre ROI e MRR de adsentice sobre suas Soluções — que as surfaces não estão completas e as soluções propostas não estão entregando o que o cliente precisa."

**Tradução:** Category Intel (ADR-0050) é Layer 1 — primitivo, geográfico. Layer 2 deveria ser **vender o valor do adsentice** (ROI, MRR) — mas:
- As surfaces (S10, S11) não estão completas
- As soluções (`/admin/solutions`) não refletem o que o cliente realmente recebe
- Ninguém detectou isso porque não há SPEC que defina o que cada camada deve entregar

**Se tivéssemos SPEC-driven analysis:**
- O Brain detectaria: "`/admin/solutions` promete 5 planos mas `/admin/surface` mostra 22 superfícies com status beta/spec — drift entre produto vendido e produto entregue"
- O founder leria o report, concordaria, e diria: "Claude, ajusta `/admin/solutions` para refletir o estado real das surfaces"
- O Claude leria o SPEC de Solutions, o SPEC de Surface, o diff report, e faria o ajuste cirúrgico

---

## 1. Contexto (DAG cross-project)

### 1.1 O padrão EVO-API que queremos replicar

O EVO-API não tem "telemetria de clique". Tem **Cognitive Twin** (ADR-0148):

```
Event → Twin → Projection → Morph → UI
         ↑
    Structural Graph  (deps, edges)
    Runtime Graph     (influence, data flow)
    Cognitive Graph   (findings → hypotheses → decisions)
```

O Twin é o MODELO do sistema. Os sensores comparam o modelo com a realidade. Os findings alimentam o modelo. O founder vê projeções (reports), não dados brutos.

**O que o adsentice precisa é de um Twin do ecossistema de negócio** — não um gêmeo de código (Rust crates), mas um gêmeo de **estratégia + produto + dados**:

```
SPEC (o que cada página/surface/solução DEVE ser)
  ↓
Brain OODA periódico: SPEC vs REALIDADE
  ↓
Findings cross-page com links para ADRs, código, OODA
  ↓
Report: "Estas 3 páginas estão driftadas. Estas 2 soluções não têm surface completa.
        Prioridade: X. Custo estimado: Y. Documentação relevante: ADR-Z."
```

### 1.2 Infraestrutura JÁ existente

| Peça | Arquivo | Função |
|------|---------|--------|
| Brain OODA | `brain/b3-decide.ts` | Motor de decisão com certainty scoring |
| Cockpit API | `api/cockpit/ask/route.ts` | Q&A cross-collection (self + conversation + memory) |
| Finding Arbiter | `tools/adsentice_finding_arbiter.py` | DeepSeek SRE, cost-capped, já lê Redis e emite veredictos |
| Telemetry | `lib/telemetry.ts` | `pushEvent`, `pushAlert`, `getRouteStats` |
| Category Intel | `lib/category-intel.ts` | 29 dimensões de mercado com coverage/quality/opportunity |
| Auto-Pilot | `lib/auto-pilot.ts` | Decisão de prospecção com 3-tier viability |
| Qdrant self | `adsentice-self` (20,647 pts) | Docs, ADRs, specs, código — CORPUS de documentação |
| Redis OODA | `adsentice:ooda:*` | Estado atual do ciclo OODA |

---

## 2. Decisão

**Criar um SPEC-Driven Analysis Engine onde cada página/superfície/solução do adsentice tem um SPEC canônico, o Brain OODA executa ciclos periódicos de análise cross-page comparando SPEC vs REALIDADE, e emite Reports acionáveis com links semânticos para documentação (ADRs, código, OODA).**

### 2.1 O que NÃO é

- ❌ Um drawer lateral com sensores on-click (isso é UI, não análise)
- ❌ Telemetria de comportamento de usuário (CTR, time-on-page)
- ❌ Um dashboard de "page health" genérico
- ❌ Um substituto do founder na tomada de decisão

### 2.2 O que É

- ✅ Um **SPEC canônico por página** — declara o que cada página DEVE ser
- ✅ Um **motor de análise periódica** — Brain OODA roda ciclos, não espera clique
- ✅ **Cross-page por desenho** — análise conecta páginas, rotas, estratégias, surfaces
- ✅ **SPEC vs REALIDADE** — compara o spec com o que o código realmente faz
- ✅ **Reports semânticos** — cada finding linka para ADRs, arquivos, commits, OODA
- ✅ **Auto-suficiência do founder** — founder lê o report, entende, decide, direciona

---

## 3. Arquitetura

### 3.1 O SPEC (coração do sistema)

Cada página/superfície/solução tem um **SPEC canônico** — um documento declarativo que define:

```typescript
interface PageSpec {
  // ── Identidade ──
  route: string                        // "/admin/categories"
  label: string                        // "Categorias · Discovery Engine"
  
  // ── Propósito (SPEC-driven) ──
  purpose: string                      // "Rankear 29 nichos SMB por oportunidade de prospecção"
  strategyLayer: number                // 1=primitivo(geo) 2=produto(ROI/MRR) 3=ecosistema(cross)
  
  // ── Contrato de Dados ──
  dataContract: {
    sources: ('supabase' | 'redis' | 'qdrant' | 'dataforseo' | 'static')[]
    primaryQuery: string               // "getCategoryIntelligence()" | "Supabase REST discovery_listings"
    refreshPolicy: 'realtime' | 'cache-5min' | 'static'
    expectedCardinality: string        // "29 categorias" | "~5745 leads" | "22 superfícies"
  }
  
  // ── Contrato de UI ──
  uiContract: {
    renderMode: 'server' | 'client' | 'hybrid'
    primaryComponents: string[]        // ["CardStatVertical", "Table", "Chip"]
    userActions: string[]              // ["filtrar por categoria", "clicar para Discovery", "ver lead detail"]
  }
  
  // ── Integração Cross-Page ──
  crossPageLinks: {
    linksTo: string[]                  // ["/admin/discovery", "/admin/leads?category=X"]
    linkedFrom: string[]               // ["/admin (quick link)", "/admin/market"]
    dataSharedWith: string[]           // ["discovery_listings (Supabase)", "category-intel.ts"]
  }
  
  // ── Estratégia ──
  strategyAlignment: {
    servesPlan: string[]               // ["Raio-X", "Sentinela"]
    servesPersona: string[]            // ["Problem Aware", "Solution Aware"]
    businessGoal: string               // "Converter visitante em lead qualificado"
    kpiTarget: string                  // "Cobertura > 50% nas 29 categorias"
  }
  
  // ── Proveniência ──
  provenance: {
    createdIn: string                  // "v142 · ADR-0050"
    lastSpecReview: string             // "2026-07-20"
    implementedBy: string[]            // ["jeffer", "claude"]
    relatedADRs: string[]              // ["ADR-0050", "ADR-0051", "ADR-0046"]
  }
}
```

### 3.2 O Engine de Análise

```
┌────────────────────────────────────────────────────────────────────┐
│                    BRAIN OODA · Ciclo de Análise                    │
│                                                                    │
│  Cron: a cada 6h (ou manual: POST /api/spec/analyze)               │
│                                                                    │
│  PASSO 1 · LOAD SPECs                                              │
│  ├── PAGE_SPECS (12 páginas)                                       │
│  ├── SURFACE_SPECS (22 superfícies Warp)                           │
│  ├── SOLUTION_SPECS (5 planos)                                     │
│  └── STRATEGY_SPEC (estratégia global adsentice)                   │
│                                                                    │
│  PASSO 2 · MEASURE REALITY                                         │
│  ├── Lê código real de cada página (fs.readFile)                   │
│  ├── Query Supabase para dados reais (count, avg, distribuição)    │
│  ├── Query Redis para estado OODA                                  │
│  └── Query Qdrant para documentação relevante                      │
│                                                                    │
│  PASSO 3 · CROSS-REFERENCE (SPEC vs REALITY)                       │
│  ├── DataContract: a página usa as fontes que o SPEC declara?      │
│  ├── UIContract: a página renderiza o que o SPEC declara?          │
│  ├── CrossPageLinks: as integrações declaradas funcionam?          │
│  ├── StrategyAlignment: a página serve a estratégia declarada?     │
│  └── Cardinalidade: os dados batem com o esperado?                 │
│                                                                    │
│  PASSO 4 · CROSS-PAGE ANALYSIS                                     │
│  ├── Página A declara link para B → B realmente recebe?            │
│  ├── Solution X promete superfície Y → Y está live ou spec?        │
│  ├── Estratégia global diz "foco em T1" → páginas refletem T1?    │
│  └── Dados fluem entre páginas como o SPEC declara?                │
│                                                                    │
│  PASSO 5 · GENERATE REPORT                                         │
│  ├── Findings por página (SPEC vs REALITY)                         │
│  ├── Findings cross-page (inconsistências entre páginas)           │
│  ├── Insights estratégicos (o que o ecossistema está dizendo)      │
│  ├── Links semânticos (ADRs, código, commits, OODA)                │
│  └── Priorização (critical > warning > info)                       │
│                                                                    │
│  OUTPUT: Report salvo em Redis + Qdrant + acessível via API        │
└────────────────────────────────────────────────────────────────────┘
```

### 3.3 Tipos de Finding (expandidos)

```
Kind                 O que detecta                    Exemplo
────────────────────────────────────────────────────────────────────
SPEC-DRIFT           Código diverge do SPEC           "SPEC declara getCategoryIntelligence()
                     canônico                         mas código usa CATEGORY_INFO hardcoded"
                                                      [src: page.tsx:30 vs spec.ts:45]

DATA-CONTRACT        Fonte de dados não bate          "/admin/criteria declara 'supabase'
BREACH                                                mas 651 linhas são 100% estáticas"
                                                      [evidence: grep "supabase" page.tsx → 0 hits]

CROSS-PAGE-LINK      Link declarado quebrado           "/admin/solutions linka para /admin/surface
BROKEN                                                mas a rota de surface não tem query param" 
                                                      [src: solutions/page.tsx:440]

STRATEGY-MISALIGN    Página não serve a estratégia    "/admin/market declara 'inteligência por
                     declarada no SPEC                categoria' mas não importa category-intel"
                                                      [evidence: grep "getCategoryIntelligence" → 0]

SURFACE-GAP          Solução prometida sem surface    "Plano Sentinela declara S11-MK surface
                     correspondente                   mas surface.status = 'spec' (não live)"
                                                      [src: solutions/page.tsx vs surface/status API]

PRODUCT-DRIFT        Produto vendido ≠ entregue       "Solutions promete 'Landing Page A/B'
                                                      mas composeS11 gera 1 variante fixa"
                                                      [evidence: warp-composer.ts:composeS11()]

ECOSYSTEM-GAP        Falta camada inteira             "Layer 1 (Category Intel geo) existe.
                                                      Layer 2 (ROI/MRR por solução) não existe.
                                                      Layer 3 (cross-ecosystem) não existe."
                                                      [src: estratégia global vs SPECs existentes]

DOCUMENTATION-GAP    SPEC sem lastro em ADR           "SPEC de /admin/criteria declara 87 sinais
                                                      mas ADR-0022 define 66 — gap de 21"
                                                      [src: criteria/page.tsx vs ADR-0022]
```

### 3.4 O Report (output do ciclo de análise)

```markdown
# 📊 ADSENTICE · SPEC Analysis Report
## 2026-07-20 · Ciclo #1 · Brain OODA B2 · certainty 0.87

---

## 🔴 CRITICAL (2)

### PRODUCT-DRIFT · Solutions promete mas surfaces não entregam
**Páginas:** /admin/solutions → /admin/surface
**SPEC diz:** Sentinela R$197 entrega "Landing Page A/B (S11K)" + "SEO audit integrado"
**Realidade:** S11K surface status = 'spec' (não 'live'). composeS11() gera 1 variante, não A/B.
**Impacto:** Cliente paga R$197 por produto que não está pronto. Risco de churn antes de começar.
**Docs:** ADR-0038 (S10 generate-then-serve) · ADR-0037 (S11 A/B) · ADR-0047 (Brain KG)
**Ação sugerida:** Priorizar S11K A/B como próxima milestone OU ajustar solutions para refletir status real.

### ECOSYSTEM-GAP · Layer 2 (ROI/MRR) inexistente
**Páginas afetadas:** /admin/solutions, /admin/costs, /admin/surface
**SPEC diz:** "Vender o que já temos sobre ROI e MRR"
**Realidade:** conversion.mrrByCategory hardcoded a 0. Sem tabela clients/mrr. Sem tracking de conversão.
**Impacto:** Não conseguimos provar ROI do adsentice para o cliente. O core value proposition é invisível.
**Docs:** ADR-0052 v2.1 (schema audit) · ADR-0016 (Hetzner/Supabase)
**Ação sugerida:** Criar tracking de conversão (nova migration) como pré-requisito para Layer 2.

---

## 🟡 WARNING (5)

### SPEC-DRIFT · /admin/categories — SPEC vs realidade
**SPEC declara:** dataContract.sources = ['supabase', 'qdrant'] · primaryQuery = 'getCategoryIntelligence()'
**Realidade:** CATEGORY_INFO hardcoded (29 entries estáticas). Supabase usado apenas para KPIs, não para cards.
**Gap:** 23/29 categorias sem dados → página mostra como se todas tivessem.
**Docs:** ADR-0050 (Category Intel) · category-intel.ts:89
**Ação:** Trocar tabela estática por cards dinâmicos de getCategoryIntelligence()

### DATA-CONTRACT-BREACH · /admin/criteria — 100% estático
**SPEC declara:** dataContract.sources = ['supabase']
**Realidade:** 651 linhas, zero queries ao Supabase. 66 sinais hardcoded.
**Gap:** Novos sinais adicionados no código (scoring.ts) não aparecem na UI.
**Docs:** ADR-0022 (Scoring Engine) · scoring.ts (856 linhas, 35+ sinais)
**Ação:** Gerar tabela de sinais dinamicamente do scoring.ts OU adicionar query de distribuição real

### SURFACE-GAP · 22 superfícies, quantas live?
**SPEC declara:** Soluções usam superfícies Warp como interface com cliente
**Realidade:** /api/surface/status retorna 22 superfícies. Quantas 'live' vs 'spec' vs 'beta'?
**Impacto:** Planos vendem superfícies que podem não estar prontas.
**Docs:** ADR-0031 (Warp Family) · ADR-0038 (S10 generation)
**Ação:** Auditar status real de cada superfície e alinhar com solutions

[... mais findings por página ...]

---

## 🔵 INFO (3)

### CROSS-PAGE-LINK · Integração entre páginas — 71% funcional
**Mapeamento:** 12 páginas × 12 links cruzados possíveis
**Realidade:** 32 links existem, 28 funcionam, 4 quebrados (12.5%)
**Quebrados:** /admin/solutions → /admin/surface (sem query param) · /admin/costs → plans (link interno)
**Docs:** VerticalMenu.tsx · middleware.ts
**Ação:** Corrigir 4 links quebrados

[... mais insights ...]

---

## 📈 INSIGHTS ESTRATÉGICOS

### 1. Estamos vendendo Layer 2 sem ter Layer 1 completo
6/29 categorias têm dados. 23 não prospectadas. Mas já estamos construindo produto pago.
**Recomendação:** Completar Layer 1 (prospecção das 23) antes de investir em Layer 2 (ROI tracking).

### 2. SPEC-driven revela que 33% das páginas são 100% estáticas
/admin/criteria, /admin/solutions, /admin/leads/[id] — não refletem mudanças no banco.
**Recomendação:** Priorizar wire-up de dados reais nas 4 páginas estáticas.

### 3. Documentação e código divergem em 21 sinais
scoring.ts tem 35+ sinais mas criteria/page.tsx documenta 66 — gap de ~31 sinais não documentados ou documentação inflada.
**Recomendação:** Auditoria de sinais: quais existem no código vs quais estão na UI vs quais estão nos ADRs.

---

## 🔗 Links Semânticos

- [ADR-0050 · Category Intelligence Engine](docs/adr/0050-*.md)
- [ADR-0051 · Auto-Pilot](docs/adr/0051-*.md)
- [ADR-0052 · Schema Audit](docs/adr/0052-*.md)
- [scoring.ts · 856 linhas](apps/web/src/lib/scoring.ts)
- [category-intel.ts · 315 linhas](apps/web/src/lib/category-intel.ts)
- [OODA · Redis :6396](redis://adsentice:ooda:*)
- [Brain OODA · b3-decide](apps/web/src/lib/brain/b3-decide.ts)

---
Gerado por: Brain OODA B2 · certainty 0.87 · 6 sensores · 12 SPECs · 22 superfícies · 5 planos
Próximo ciclo: 2026-07-20 20:00 BRT
```

---

## 4. API

### 4.1 `POST /api/spec/analyze` — Dispara ciclo de análise

```typescript
// Body: { scope?: 'all' | 'page' | 'cross-page', page?: string }
// Opcional: { mode: 'spec-driven' | 'llm-arbiter' } — spec-driven = $0 determinístico
// Retorna: SpecAnalysisReport
```

### 4.2 `GET /api/spec/report` — Último report gerado

```typescript
// Query: ?page=/admin/categories (filtra findings de 1 página)
// Query: ?kind=critical (filtra por severity)
// Retorna: SpecAnalysisReport (cache Redis TTL 6h)
```

### 4.3 `GET /api/spec/page?route=/admin/categories` — SPEC de uma página

```typescript
// Retorna: PageSpec completo (dataContract, uiContract, crossPageLinks, strategyAlignment, provenance)
```

### 4.4 `PUT /api/spec/page` — Atualiza SPEC de uma página

```typescript
// Body: PageSpec parcial (merge com existente)
// Founder edita o SPEC → próximo ciclo de análise usa SPEC atualizado
```

---

## 5. SPEC Registry Inicial (12 páginas · a construir)

| Página | Strategy Layer | Data Sources | Status SPEC |
|--------|---------------|--------------|-------------|
| `/admin` | 3 (ecosistema) | redis, supabase, static | 🔴 sem SPEC |
| `/admin/categories` | 1 (geo) | supabase, static | 🔴 sem SPEC |
| `/admin/discovery` | 1 (geo) | redis, supabase, dataforseo | 🔴 sem SPEC |
| `/admin/pipeline` | 2 (produto) | supabase, static | 🔴 sem SPEC |
| `/admin/leads` | 2 (produto) | supabase | 🔴 sem SPEC |
| `/admin/costs` | 2 (produto) | redis, supabase, filesystem | 🔴 sem SPEC |
| `/admin/criteria` | 2 (produto) | static | 🔴 sem SPEC |
| `/admin/solutions` | 2 (produto) | static | 🔴 sem SPEC |
| `/admin/market` | 1 (geo) | supabase, redis | 🔴 sem SPEC |
| `/admin/surface` | 3 (ecosistema) | qdrant, supabase | 🔴 sem SPEC |
| `/admin/telemetry` | 3 (ecosistema) | redis, supabase | 🔴 sem SPEC |
| `/admin/settings` | 3 (ecosistema) | redis, process.env | 🔴 sem SPEC |

Todas as 12 estão **sem SPEC canônico**. Este é o gap fundamental.

---

## 6. Sequência de Implementação

### Fase 1 · SPEC Foundation (4h · $0)

| # | O que | Descrição | Tempo |
|---|-------|-----------|-------|
| 1.1 | `PageSpec` types | Tipos TypeScript: PageSpec, SurfaceSpec, SolutionSpec, StrategySpec | 30min |
| 1.2 | `PAGE_SPECS` registry | 12 specs iniciais (1 por página) — DADO canônico, editável | 2h |
| 1.3 | `SURFACE_SPECS` registry | 22 specs de superfície (do `/api/surface/status`) | 1h |
| 1.4 | `SOLUTION_SPECS` registry | 5 specs de plano (dos STRATEGIC_PLANS + estado real) | 30min |

### Fase 2 · Analysis Engine (5h · $0)

| # | O que | Descrição | Tempo |
|---|-------|-----------|-------|
| 2.1 | `spec-analyzer.ts` | Motor determinístico: SPEC vs REALITY (fs.readFile + Supabase + Redis) | 3h |
| 2.2 | `cross-page-analyzer.ts` | Análise cross-page: links, data flow, strategy alignment | 1.5h |
| 2.3 | `report-generator.ts` | Gera Markdown report com findings + links semânticos | 30min |

### Fase 3 · API + Brain OODA Integration (2.5h · $0)

| # | O que | Descrição | Tempo |
|---|-------|-----------|-------|
| 3.1 | `POST /api/spec/analyze` | Dispara ciclo de análise | 30min |
| 3.2 | `GET /api/spec/report` | Último report | 20min |
| 3.3 | `GET /api/spec/page` | SPEC de uma página | 20min |
| 3.4 | `PUT /api/spec/page` | Atualiza SPEC | 20min |
| 3.5 | Brain OODA cron | Cron job (ou systemd timer) para ciclo a cada 6h | 1h |
| 3.6 | Redis persistence | `adsentice:spec:report:*` (TTL 24h) + `adsentice:spec:page:*` | 20min |

### Fase 4 · UI de Análise (futuro · após validação)

Só depois que o engine estiver rodando e o founder validar os reports:
- Página `/admin/spec` — dashboard de SPEC-driven analysis
- CopilotRail (ADR-0053 v1) — drawer lateral com findings da página atual
- Alertas no `/admin` cockpit quando há findings críticos

**Total Fase 1-3: ~11.5h · $0 · 0 páginas novas · SPEC-driven foundation.**

---

## 7. Diferança fundamental vs ADR-0053 v1 (CopilotRail)

| ADR-0053 v1 (descartada) | ADR-0053 v2 (esta) |
|--------------------------|---------------------|
| Drawer lateral com sensores on-click | **SPEC-driven analysis engine** periódico |
| "Copilot" — assistente reativo | **SPEC** — contrato canônico proativo |
| Findings por página isolada | **Cross-page** — integração entre páginas |
| UI component (CopilotRail) | **Report engine** (SPEC vs REALITY + insights) |
| Telemetria = CTR/page-view | **Análise** = consistência estratégica |
| Founder clica para ver | **Brain OODA** executa ciclos, founder lê report |
| ~7h (UI) | **~11.5h** (SPEC + Engine + API + Brain) |

---

## 8. Exemplo de uso (fluxo do founder)

```
1. Brain OODA executa ciclo às 06:00 BRT
2. Report gerado: "SPEC Analysis · 2026-07-21 · Ciclo #1"
3. Redis: adsentice:spec:report:latest ← report completo
4. Qdrant: adsentice-self ← report ingerido (searchable)

5. Founder abre o report (markdown no /admin/spec ou arquivo)
6. Lê: "CRITICAL: PRODUCT-DRIFT · Solutions promete mas surfaces não entregam"
7. Entende: S11K A/B está spec, não live. Soluções vendem o que não existe.

8. Founder: "Claude, prioriza S11K A/B. Aqui está o report e os ADRs linkados."
9. Claude: Lê o SPEC de Solutions, SPEC de Surface, ADR-0037, ADR-0038.
10. Claude: Implementa S11K A/B com contexto completo e SPEC-driven.
```

**O founder não precisa mais inspecionar cada página manualmente. O SPEC-driven engine faz isso.**

---

## 9. Verificação (medido=verdade)

1. `GET /api/spec/page?route=/admin/categories` → retorna PageSpec completo
2. `POST /api/spec/analyze` → retorna report com findings para 12 páginas
3. Report contém `kind: 'spec-drift'` para `/admin/categories` (CATEGORY_INFO hardcoded vs SPEC)
4. Report contém `kind: 'product-drift'` para `/admin/solutions` (planos vs surfaces)
5. Report contém `kind: 'ecosystem-gap'` para Layer 2 (ROI/MRR)
6. Cada finding tem `src` (arquivo:linha), `evidence[]`, links para ADRs
7. Redis `adsentice:spec:report:latest` populado com TTL 24h
8. Qdrant `adsentice-self` contém o report (searchable via `adsentice_search`)

---

## 10. Fontes (DAG cross-project)

### EVO-API (padrão)

| ADR | Arquivo | Conceito aplicado |
|-----|---------|-------------------|
| ADR-0139 | `0139-founder-context-cockpit.md` | Evidência seletiva, NarrativeCard, AlertLane |
| ADR-0141 | `0141-rsxt-fnd-finding-sensor-soberano.md` | SENSOR≠ÁRBITRO, FindingCandidate, Taxonomy |
| ADR-0148 | `0148-evo-twin-cognitive-twin-soberano.md` | Twin como grafo, projeções, morph |
| ADR-0164 | `0164-per-page-telemetry-jury-set.md` | DADO por página, zero código per-page |
| ADR-0198 | `0198-rsxt-chat-v2-copiloto-contexto-consciente.md` | Page tag = policy, Scoped/Global |

### adsentice (páginas + infra)

| Fonte | Arquivo | Linhas |
|--------|---------|--------|
| 12 páginas admin | `apps/web/src/app/[lang]/(dashboard)/(private)/admin/*/page.tsx` | 7,128 |
| Category Intel | `apps/web/src/lib/category-intel.ts` | 315 |
| Auto-Pilot | `apps/web/src/lib/auto-pilot.ts` | 161 |
| Scoring | `apps/web/src/lib/scoring.ts` | 856 |
| Brain OODA | `apps/web/src/lib/brain/b3-decide.ts` | — |
| Cockpit API | `apps/web/src/app/api/cockpit/ask/route.ts` | 139 |
| Finding Arbiter | `tools/adsentice_finding_arbiter.py` | — |
| Telemetry | `apps/web/src/lib/telemetry.ts` | — |
| 20 migrations | `packages/db/supabase/migrations/` | schema real |

**Confiança:** HIGH — 5 ADRs EVO-API + 12 páginas adsentice + 8 fontes de código + DAG 5-passos.

---

*v2.0 · 2026-07-20 · adsentice · SPEC-Driven Analysis Engine · Brain OODA como motor de consistência cross-page*
