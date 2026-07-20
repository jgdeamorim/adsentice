# ADR-0053 · Copilot Lateral por Página — Sensor + Finding + Telemetria

**Status:** PROPOSED
**Date:** 2026-07-20
**Author:** jeffer + Claude Opus 4.8
**Supersedes:** ADR-0052 v2.1 (substitui — a necessidade real não é distribuir dados de categoria, é uma camada META de observação)
**Reference:** EVO-API ADR-0139 (Founder Cockpit), ADR-0141 (Finding Sensor rsxt-fnd), ADR-0148 (Cognitive Twin), ADR-0149 (Cockpit Components), ADR-0164 (Per-Page Telemetry), ADR-0198 (rsxt-chat v2 Context-Conscious Copilot)
**Sources:** DAG cross-project — 6 ADRs EVO-API + cockpit.py + ecosystem_cockpit.py + 12 páginas adsentice + finding_arbiter.py (já existe) + telemetry.ts (já existe)

---

## 0. O Problema Real (reformulado)

A ADR-0052 tentou resolver "estratégia de vendas não aparece nas páginas" injetando dados de categoria. Mas o problema é mais profundo:

**Nenhuma página do dashboard :3000 sabe se está mostrando a verdade.**

Cada página foi construída em sessões diferentes, com dados diferentes, por 2 agentes (founder + Claude). Não existe uma camada que:
1. **Identifique** qual página é essa e qual seu propósito
2. **Verifique** se os dados que ela mostra batem com a realidade do banco
3. **Detecte** gaps entre o que a UI promete e o que o sistema entrega
4. **Sugira** refinamentos baseados em evidência

O founder pediu: **um copilot lateral em cada página** — igual ao `CopilotRail` do EVO-API cockpit (ADR-0139).

---

## 1. Contexto

### 1.1 O padrão EVO-API (3 ADRs de referência)

```
ADR-0139 · Founder Context Cockpit
├── NarrativeCard — tag + narrativa da página
├── AlertLane — gaps críticos · pulse
├── PatchCard — diffs/commits relevantes
└── CopilotRail — agente finding lateral (DeepSeek · gated)

ADR-0141 · Finding Sensor (rsxt-fnd)
├── SENSOR ≠ ÁRBITRO (doutrina inviolável)
├── RETRIEVE → CROSS-REF → COMPLETENESS-CRITIC
├── FindingCandidate { kind, layer, src, confidence, evidence[] }
├── Taxonomy: Gap · Drift · Risk · Refine · Opportunity · Delta
└── Determinístico $0 + 1 synth (LLM gated)

ADR-0164 · Per-Page Telemetry-Jury Set
├── QUALITY-JURY (build-time): a11y · objetivo/CTA · SEO · LGPD
├── TELEMETRY RUNTIME (comportamento): client-id · time-on-page · cta-clicks
├── DADO por página (editável · zero código por página)
└── Gerenciador: /control/surfaces
```

### 1.2 Tradução para adsentice

| EVO-API | adsentice |
|---------|-----------|
| `rsxt-fnd` (Rust crate) | `copilot-sensor.ts` (TypeScript module) |
| `evoapi:cockpit:evidence` (Redis :6395) | `adsentice:copilot:{page}:findings` (Redis :6396) |
| `CopilotRail` (DCTMorph gen) | `<CopilotRail>` (React/MUI drawer) |
| `FindingArbiter` (DeepSeek gated) | `brainTurn()` via Cockpit API (já existe) |
| `surface-family.json` (DADO por página) | `PAGE_REGISTRY` (const em `copilot-sensor.ts`) |
| `/control/surfaces` | `/admin/*` (as próprias páginas) |

### 1.3 Infraestrutura adsentice JÁ existente (reutilizável)

**Não estamos começando do zero.** O adsentice já tem 4 peças do padrão EVO-API:

| Peça adsentice | Equivalente EVO-API | Estado |
|---------------|---------------------|--------|
| `lib/telemetry.ts` (`pushEvent`, `pushAlert`, `getRouteStats`) | `k0_breath.rs` (edge quality sensor) | ✅ LIVE |
| `tools/adsentice_finding_arbiter.py` (DeepSeek SRE, cost-capped, cron) | FindingArbiter trait (DeepSeek gated) | ✅ LIVE |
| `api/cockpit/ask/route.ts` (`brainTurn`, cross-collection Qdrant) | CopilotRail + rsxt-fnd synth sensor | ✅ LIVE |
| `packages/warp/src/6-telemetry.ts` (WarpTracker, Design Quality Score) | `var/sensors/*.finding.json` | ✅ LIVE |

**O que falta:** o componente UI (`<CopilotRail>`) + o `PAGE_REGISTRY` + os 5 sensores determinísticos + wire nas 12 páginas.

### 1.4 ADR-0198 — Page Tag vira Policy (contexto consciente)

O ADR-0198 do EVO-API (`rsxt-chat v2 Copilot Context-Conscious`) estabelece:

> O **page tag** vira **policy** — a célula que restringe o escopo do chat.
> Turn v2: `{msg, origin: {tenant, page_tag, surface}, who: {user_id, role}, mode: Scoped|Global}`

No adsentice, isso significa:
- CopilotRail em `/admin/categories` → contexto É `categories`
- Queries ao Cockpit carregam `origin.page_tag = '/admin/categories'`
- Brain OODA restringe recall ao escopo da página
- Founder alterna `Scoped` (página atual) ↔ `Global` (cross-pages)

---

## 2. Decisão

**Criar uma camada META de observação — o Copilot — que vive LATERALMENTE em cada página admin, executando sensores determinísticos ($0) e emitindo findings ancorados com evidência.**

### 2.1 O Copilot NÃO é

- ❌ Um chatbot (já temos o Cockpit `/api/cockpit/ask`)
- ❌ Um dashboard separado (já temos `/admin`)
- ❌ Injeção de dados de categoria nas páginas (isso era ADR-0052)
- ❌ Um editor de página
- ❌ Um substituto do founder

### 2.2 O Copilot É

- ✅ Um **painel lateral** (drawer) que abre em qualquer página admin
- ✅ Um **sensor** que verifica se a página está mostrando a verdade
- ✅ Um **emissor de findings** ancorados com proveniência
- ✅ Um **auto-crítico** que sugere refinamentos baseados em gaps detectados
- ✅ **Per-page**: cada página tem seu próprio conjunto de sensores e telemetria

---

## 3. Arquitetura

### 3.1 Componentes

```
┌──────────────────────────────────────────────────────────────────┐
│  /admin/categories                                               │
│  ┌────────────────────────────────────┐  ┌─────────────────────┐ │
│  │                                    │  │ 🔍 COPILOT          │ │
│  │  Conteúdo normal da página         │  │                     │ │
│  │  (já existe)                       │  │ 📋 Page Tag         │ │
│  │                                    │  │ /admin/categories   │ │
│  │                                    │  │ Propósito: rankear  │ │
│  │                                    │  │ nichos e descobrir  │ │
│  │                                    │  │ melhores leads      │ │
│  │                                    │  ├─────────────────────┤ │
│  │                                    │  │ 🔬 Sensores (5)     │ │
│  │                                    │  │ ✅ dados Supabase   │ │
│  │                                    │  │ ⚠ 29 cats estático  │ │
│  │                                    │  │ ❌ sem getCategory   │ │
│  │                                    │  │    Intel()          │ │
│  │                                    │  ├─────────────────────┤ │
│  │                                    │  │ 🎯 Findings (3)     │ │
│  │                                    │  │ GAP: CATEGORY_INFO  │ │
│  │                                    │  │ hardcoded, não usa   │ │
│  │                                    │  │ API real            │ │
│  │                                    │  │ DRIFT: 6/29 cats    │ │
│  │                                    │  │ têm dados vs 29     │ │
│  │                                    │  │ estáticas           │ │
│  │                                    │  │ REFINE: trocar      │ │
│  │                                    │  │ tabela por cards     │ │
│  │                                    │  │ dinâmicos           │ │
│  │                                    │  ├─────────────────────┤ │
│  │                                    │  │ 📊 Telemetria       │ │
│  │                                    │  │ Page view: 12       │ │
│  │                                    │  │ Avg time: 2.3min    │ │
│  │                                    │  │ (runtime · futuro)  │ │
│  │                                    │  └─────────────────────┘ │
│  └────────────────────────────────────┘                          │
└──────────────────────────────────────────────────────────────────┘
```

### 3.2 Pipeline do Sensor (adaptado de rsxt-fnd)

```
PAGE_REGISTRY[page] → define sensores esperados para esta página
        ↓
SENSORES DETERMINÍSTICOS ($0) — rodam a cada page load
        ↓
   ┌─────────────────────────────────────────────────┐
   │ S1 · DataSourceSensor                           │
   │   "Esta página usa dados REAIS ou hardcoded?"   │
   │   Verifica: Supabase? Redis? MOCK? static?      │
   │                                                 │
   │ S2 · FreshnessSensor                            │
   │   "Os dados exibidos são atuais ou stale?"      │
   │   Compara: timestamp da query vs now()          │
   │                                                 │
   │ S3 · StrategyAlignmentSensor                    │
   │   "A UI reflete a estratégia definida?"         │
   │   Ex: categorias com 0 leads deveriam mostrar   │
   │   badge 'não prospectada', não score vazio      │
   │                                                 │
   │ S4 · CoverageSensor                             │
   │   "O que esta página cobre vs deveria cobrir?"  │
   │   Ex: 29 cats no ICP vs 6 com dados reais       │
   │                                                 │
   │ S5 · IntegrationSensor                          │
   │   "Esta página se conecta com as outras?"       │
   │   Ex: /admin/categories linka para Discovery?   │
   │   Ex: /admin/leads linka para Pipeline?         │
   └─────────────────────────────────────────────────┘
        ↓
CROSS-REFERENCE: discrepância entre DADO real e UI → finding-candidato
        ↓
FindingCandidate[] → Redis → CopilotRail renderiza
```

### 3.3 Tipos (TypeScript)

```typescript
// ── Finding (adaptado de rsxt-fnd Kind) ──

type FindingKind = 'gap' | 'drift' | 'risk' | 'refine' | 'opportunity' | 'delta'

interface FindingCandidate {
  kind: FindingKind
  layer: 'data' | 'ui' | 'strategy' | 'integration'
  title: string                      // 1 linha
  detail: string                     // 2-3 linhas com evidência
  src: string                        // proveniência: "category-intel.ts:89" | "Supabase.count()" 
  confidence: number                 // 0.0-1.0 (determinístico = 1.0)
  evidence: string[]                 // fatos medidos que sustentam o finding
  severity: 'critical' | 'warning' | 'info'
}

// ── Page Tag ──

interface PageTag {
  route: string                      // "/admin/categories"
  label: string                      // "Categorias"
  purpose: string                    // "Rankear nichos e descobrir melhores leads"
  dataSources: ('supabase' | 'redis' | 'qdrant' | 'static' | 'mock')[]
  builtIn: string                    // sessão/ADR que criou: "v081 · ADR-0031"
  lastModified: string               // último commit que mexeu
  linesOfCode: number
}

// ── Sensor ──

interface PageSensor {
  id: string
  name: string
  description: string
  run: (page: PageTag) => Promise<FindingCandidate[]>  // determinístico · $0
}

// ── Per-Page Telemetry Config (ADR-0164 · DADO) ──

interface PageTelemetryConfig {
  route: string
  qualityLenses: string[]            // ex: ['data-freshness', 'strategy-alignment', 'cross-linking']
  runtimeSignals: string[]           // ex: ['page-view', 'time-on-page', 'cta-click'] (fase futura)
  findingsCount: number
  lastSensorRun: string | null
}
```

---

## 4. Registro de Páginas (PAGE_REGISTRY)

DADO canônico — editável, zero código por página adicionada.

```typescript
const PAGE_REGISTRY: Record<string, PageTag> = {
  '/admin': {
    route: '/admin',
    label: 'Dashboard · Control Plane',
    purpose: 'Visão geral do ecossistema: BOA, infra, Schwartz, links rápidos',
    dataSources: ['redis', 'supabase', 'static'],
    builtIn: 'v081 · ADR-0031',
    lastModified: '2026-07-20',
    linesOfCode: 345,
  },
  '/admin/categories': {
    route: '/admin/categories',
    label: 'Categorias · Discovery Engine',
    purpose: 'Rankear 29 nichos SMB, mostrar oportunidades de prospecção',
    dataSources: ['supabase', 'static'],
    builtIn: 'v142 · ADR-0050',
    lastModified: '2026-07-20',
    linesOfCode: 397,
  },
  '/admin/discovery': {
    route: '/admin/discovery',
    label: 'Discovery · Prospecção L0-L4',
    purpose: 'Buscar leads no Google Meu Negócio com mapa, Auto-Pilot e session log',
    dataSources: ['redis', 'supabase', 'dataforseo'],
    builtIn: 'v120-v155 · ADR-0022',
    lastModified: '2026-07-20',
    linesOfCode: 2239,
  },
  '/admin/pipeline': {
    route: '/admin/pipeline',
    label: 'Pipeline · Funil L0-L7',
    purpose: 'Visualizar progresso dos leads por estágio de enriquecimento',
    dataSources: ['supabase', 'static'],
    builtIn: 'v120 · ADR-0031',
    lastModified: '2026-07-20',
    linesOfCode: 316,
  },
  '/admin/leads': {
    route: '/admin/leads',
    label: 'Leads · Tabela com Filtros',
    purpose: 'Navegar, filtrar e analisar leads individuais com score e L2',
    dataSources: ['supabase'],
    builtIn: 'v089 · ADR-0031',
    lastModified: '2026-07-20',
    linesOfCode: 345,
  },
  '/admin/costs': {
    route: '/admin/costs',
    label: 'Custos · Centro de Custos',
    purpose: 'Monitorar gastos DataForSEO, DeepSeek, Redis e margem por plano',
    dataSources: ['redis', 'supabase', 'filesystem'],
    builtIn: 'v089 · ADR-0031',
    lastModified: '2026-07-20',
    linesOfCode: 502,
  },
  '/admin/criteria': {
    route: '/admin/criteria',
    label: 'Critérios · Sinais de Score',
    purpose: 'Documentar os 66+ sinais de scoring com pesos e descrições',
    dataSources: ['static'],
    builtIn: 'v081 · ADR-0022',
    lastModified: '2026-07-20',
    linesOfCode: 651,
  },
  '/admin/solutions': {
    route: '/admin/solutions',
    label: 'Soluções · Planos e Produtos',
    purpose: 'Apresentar os 5 planos (Raio-X → Growth OS) com personas e projeções',
    dataSources: ['static'],
    builtIn: 'v081 · ADR-0031',
    lastModified: '2026-07-20',
    linesOfCode: 526,
  },
  '/admin/market': {
    route: '/admin/market',
    label: 'Market Intelligence',
    purpose: 'Inteligência de nicho por categoria × região com mapa de cobertura',
    dataSources: ['supabase', 'redis'],
    builtIn: 'v089 · ADR-0009',
    lastModified: '2026-07-20',
    linesOfCode: 536,
  },
  '/admin/surface': {
    route: '/admin/surface',
    label: 'Surface · Design System',
    purpose: 'Gerenciar 22 superfícies Warp, skills, especialistas e artefatos',
    dataSources: ['qdrant', 'supabase'],
    builtIn: 'v087 · ADR-0031',
    lastModified: '2026-07-20',
    linesOfCode: 434,
  },
  '/admin/telemetry': {
    route: '/admin/telemetry',
    label: 'Telemetria · Logs e Alertas',
    purpose: 'Monitorar eventos, erros, SRE arbiter e saúde das rotas',
    dataSources: ['redis', 'supabase'],
    builtIn: 'v120 · ADR-0031',
    lastModified: '2026-07-20',
    linesOfCode: 233,
  },
  '/admin/settings': {
    route: '/admin/settings',
    label: 'Settings · Configuração',
    purpose: 'Gerenciar infra, integrações, features e inteligência do ecossistema',
    dataSources: ['redis', 'process.env'],
    builtIn: 'v089 · ADR-0031',
    lastModified: '2026-07-20',
    linesOfCode: 604,
  },
}
```

---

## 5. Sensores Determinísticos ($0)

### S1 · DataSourceSensor

```typescript
// Verifica se a página usa dados reais ou hardcoded/mock
async function dataSourceSensor(page: PageTag): Promise<FindingCandidate[]> {
  const findings: FindingCandidate[] = []
  
  if (page.dataSources.includes('static') && page.dataSources.length === 1) {
    findings.push({
      kind: 'gap',
      layer: 'data',
      title: `${page.label}: 100% dados estáticos (hardcoded)`,
      detail: `Esta página usa ${page.linesOfCode} linhas mas NENHUM dado do Supabase/Redis/Qdrant. Mudanças no banco não se refletem na UI.`,
      src: `page.tsx:1-${page.linesOfCode} (audit DAG 2026-07-20)`,
      confidence: 1.0,
      evidence: [`dataSources = [${page.dataSources.join(', ')}]`, `${page.linesOfCode} linhas`],
      severity: 'warning',
    })
  }
  
  if (page.dataSources.includes('mock')) {
    findings.push({
      kind: 'risk',
      layer: 'data',
      title: `${page.label}: dados MOCK — não reflete realidade`,
      detail: 'MOCK_DATA hardcoded. Qualquer decisão baseada nesta página é baseada em ficção.',
      src: `page.tsx (grep MOCK_)`,
      confidence: 1.0,
      evidence: ['dataSources inclui mock'],
      severity: 'critical',
    })
  }
  
  return findings
}
```

### S2 · FreshnessSensor

```typescript
// Verifica se a query ao Supabase é limitada (paginação) e se os dados estão frescos
async function freshnessSensor(page: PageTag): Promise<FindingCandidate[]> {
  // Ex: /admin/categories faz .limit(3000) — se tiver >3000 leads, está truncando
  // Ex: /admin/pipeline faz .limit(2000) — mesma coisa
  // Ex: /admin/criteria NÃO faz query nenhuma — dados 100% estáticos
}
```

### S3 · StrategyAlignmentSensor

```typescript
// Verifica se a UI reflete a estratégia de negócio
// Ex: 23 categorias com 0 leads → a página /admin/categories mostra isso?
// Ex: 6 categorias com dados → a página /admin/market já importa getCategoryOpportunityQuick
async function strategyAlignmentSensor(page: PageTag): Promise<FindingCandidate[]> {
  // Cross-reference: PAGE_REGISTRY.purpose vs dados reais do Supabase
  // Ex: "Rankear nichos e descobrir melhores leads" → mas 23/29 cats sem dados
}
```

### S4 · CoverageSensor

```typescript
// Verifica se a página cobre tudo que deveria cobrir
// Ex: /admin/criteria tem 66 sinais mas diz "87 sinais" na UI — drift de 21 sinais
// Ex: /admin/categories mostra 29 cats estáticas mas só 6 têm dados reais
```

### S5 · IntegrationSensor

```typescript
// Verifica se a página linka com as outras páginas do dashboard
// Ex: /admin/categories → linka para Discovery? Sim (via chips de tier)
// Ex: /admin/pipeline → linka para Leads? Sim (top categories table)
// Ex: /admin/solutions → linka para alguma página? Não diretamente
```

---

## 6. CopilotRail — Componente UI

### 6.1 Localização

Lateral direita, abre como **drawer** (MUI Drawer, variant='persistent', 360px). 
Botão flutuante no canto inferior direito: `<Fab icon={ri-robot-2-line} />` com badge de findings não-lidos.

### 6.2 Anatomia

```
┌─────────────────────────┐
│ 🔍 COPILOT    [×]       │  ← Header com page tag
│ /admin/categories       │
│ Propósito: rankear...   │
├─────────────────────────┤
│ 🔬 Sensores (5)         │
│ ✅ S1 DataSource        │  ← verde = passou
│ ⚠ S2 Freshness          │  ← amarelo = warning
│ ❌ S3 StrategyAlign      │  ← vermelho = falhou
│ ✅ S4 Coverage          │
│ ✅ S5 Integration       │
├─────────────────────────┤
│ 🎯 Findings (3)         │
│                          │
│ ⚠ GAP — CATEGORY_INFO   │
│ hardcoded, não usa API  │
│ real. 29 cats estáticas │
│ vs 6 com dados no banco │
│ [src: page.tsx:30-71]   │
│                          │
│ ⚠ DRIFT — 23/29 cats    │
│ nunca prospectadas.     │
│ Página mostra todas     │
│ como se tivessem dados. │
│ [src: Supabase count]   │
│                          │
│ 💡 REFINE — Trocar       │
│ tabela estática por     │
│ cards de getCategory    │
│ Intelligence(). Mesmo   │
│ padrão do Market Intel. │
│ [src: category-intel.ts]│
├─────────────────────────┤
│ 📊 Telemetria            │
│ Page views: —           │
│ Avg time: —              │
│ (runtime · fase futura) │
├─────────────────────────┤
│ [Abrir Cockpit →]       │  ← link para /api/cockpit/ask
└─────────────────────────┘
```

### 6.3 Props

```typescript
interface CopilotRailProps {
  page: PageTag                          // identificação da página atual
  findings: FindingCandidate[]           // do sensor run
  telemetry: PageTelemetryConfig         // config de telemetria
  onRefresh: () => Promise<void>         // re-rodar sensores
}
```

### 6.4 States

| State | Gatilho | UI |
|-------|---------|-----|
| **idle** | Page load, sensores ainda não rodaram | Botão FAB pulsando (azul) |
| **running** | Sensores executando | Spinner no drawer |
| **clean** | 0 findings | Drawer vazio, mensagem "✅ Nenhum finding — página sincronizada" |
| **findings** | >0 findings | Lista de findings por severity |
| **error** | Sensor falhou | Mensagem de erro + retry button |

---

## 7. API

### 7.1 `GET /api/copilot/findings?page=/admin/categories`

```typescript
// Retorna findings cacheados (Redis TTL 5min) ou re-roda sensores se stale
interface CopilotResponse {
  page: PageTag
  findings: FindingCandidate[]
  sensorResults: { sensorId: string; passed: boolean; findings: number }[]
  telemetry: PageTelemetryConfig
  cached: boolean
  generatedAt: string
}
```

### 7.2 `POST /api/copilot/refresh`

```typescript
// Força re-run dos sensores para uma página (ou todas)
// Body: { page?: string }  — se omitido, todas as páginas
```

### 7.3 `GET /api/copilot/summary`

```typescript
// Resumo cross-page: quantas páginas têm findings críticos? quantas estão OK?
interface CopilotSummary {
  totalPages: number
  pagesWithCriticalFindings: number
  pagesOk: number
  totalFindings: number
  topFindings: FindingCandidate[]  // top 5 mais críticos
}
```

---

## 8. Sequência de Implementação

| # | O que | Tipo | Esforço | Dependência |
|---|-------|------|---------|-------------|
| **1** | `copilot-sensor.ts` — PAGE_REGISTRY + 5 sensores | Lib | 2h | Nenhuma |
| **2** | `api/copilot/findings/route.ts` — GET endpoint | API | 30min | #1 |
| **3** | `api/copilot/summary/route.ts` — GET cross-page | API | 20min | #1 |
| **4** | `<CopilotRail>` — drawer lateral MUI | Component | 2h | #1, #2 |
| **5** | `<CopilotFab>` — botão flutuante com badge | Component | 30min | #4 |
| **6** | Wire CopilotRail em `/admin/categories` | Integration | 15min | #4 |
| **7** | Wire nas outras 11 páginas admin | Integration | 1.5h | #4 |
| **8** | Redis cache `adsentice:copilot:*` | Infra | 30min | #2 |
| **9** | Telemetria runtime (tracker client-side) | Futuro | Fase 2 | — |

**Total Fase 1 (sensores + UI): ~7h. Custo: $0.**
**Fase 2 (telemetria runtime): ~4h. Custo: $0 (Redis + Supabase).**

---

## 9. Verificação (medido=verdade)

1. Abrir `/admin/categories` → FAB visível no canto inferior direito
2. Clicar FAB → drawer abre com sensores + findings para aquela página
3. `/admin/criteria` → finding "100% dados estáticos" (severity: warning)
4. `/admin/leads/[id]` → finding "dados MOCK" (severity: critical)
5. `GET /api/copilot/summary` → retorna contagem cross-page
6. Redis `adsentice:copilot:/admin/categories:findings` → cache populado
7. Clicar "Abrir Cockpit" → navega para `/api/cockpit/ask` com contexto da página

---

## 10. Diferença fundamental vs ADR-0052

| ADR-0052 (v2.1) | ADR-0053 (esta) |
|-----------------|-----------------|
| Injeta **dados de categoria** nas páginas | Injeta **camada META de observação** nas páginas |
| Modifica o CONTEÚDO de cada página | Adiciona um PAINEL LATERAL que observa a página |
| Resolve "a estratégia não aparece" | Resolve "a página não sabe se está certa" |
| Cria funções de domínio (getCategorySalesStrategy) | Cria sensores genéricos (DataSourceSensor, CoverageSensor) |
| 4 funções lib + 8 páginas modificadas | 1 lib sensor + 1 componente + 12 páginas wireadas |
| ~8.5h | ~7h |

**As duas ADRs são complementares, não excludentes.** A 0053 é pré-requisito: primeiro saber O QUE está errado em cada página (sensor), depois injetar os dados certos (0052).

---

## 11. Fontes (DAG cross-project)

### EVO-API (padrão de referência)

| ADR | Arquivo | Conceito |
|-----|---------|----------|
| ADR-0139 | `EVO-API/main/docs/adr/0139-founder-context-cockpit.md` | CopilotRail, evidência cross-kg, NarrativeCard, AlertLane |
| ADR-0141 | `EVO-API/main/docs/adr/0141-rsxt-fnd-finding-sensor-soberano.md` | Finding Sensor, SENSOR≠ÁRBITRO, RETRIEVE→CROSS-REF→COMPLETENESS-CRITIC |
| ADR-0164 | `EVO-API/main/docs/adr/0164-per-page-telemetry-jury-set.md` | Per-page telemetry, QUALITY-JURY + RUNTIME, DADO editável |

### adsentice (páginas auditadas)

| Página | Linhas | DataSources |
|--------|--------|-------------|
| `/admin` | 345 | redis, supabase, static |
| `/admin/categories` | 397 | supabase, static |
| `/admin/discovery` | 2,239 | redis, supabase, dataforseo |
| `/admin/pipeline` | 316 | supabase, static |
| `/admin/leads` | 345 + 532 (LeadTable) | supabase |
| `/admin/costs` | 502 | redis, supabase, filesystem |
| `/admin/criteria` | 651 | **static** |
| `/admin/solutions` | 526 | **static** |
| `/admin/market` | 536 | supabase, redis |
| `/admin/surface` | 434 | qdrant, supabase |
| `/admin/telemetry` | 233 | redis, supabase |
| `/admin/settings` | 604 | redis, process.env |

### APIs existentes (reutilizáveis)

| API | Uso no Copilot |
|-----|---------------|
| `GET /api/category/intel` | Sensor S4 (Coverage) cross-reference |
| `GET /api/auto-pilot/decide` | Sensor S3 (Strategy) — o Auto-Pilot recomenda algo que a página mostra? |
| `POST /api/cockpit/ask` | Link "Abrir Cockpit" no drawer |
| `GET /api/surface/status` | Sensor S5 (Integration) — superfícies ativas vs páginas |

**Confiança:** HIGH — 3 ADRs EVO-API + 12 páginas adsentice + 4 APIs + 20 migrations + DAG 5-passos.

---

*v1.0 · 2026-07-20 · adsentice · Padrão EVO-API CopilotRail + rsxt-fnd adaptado para MUI/React · SENSOR≠ÁRBITRO*
