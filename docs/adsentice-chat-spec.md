---
id: adsentice-interaction-hub-spec
title: "adsentice Interaction Hub — AG-UI Native Implementation"
status: living
type: spec
version: "1.0.0"
date: 2026-07-11
owner: "Jeferson Galote de Amorim"
deciders: [jgdeamorim]
tags: [interaction-hub, ag-ui, mcp, pipeline, discovery, brand-iq]
supersedes: adsentice-chat-spec (v0.1.0)
---

# adsentice Interaction Hub v1.0.0

> **Propósito:** especificação completa do Hub de Interação adsentice — AG-UI nativo, pipelines de discovery, Brand IQ como shared state.
> **Protocolo:** [AG-UI](https://docs.ag-ui.com) — MIT license, 24 eventos, 13 padrões de interação.
> **Regra-mãe:** `medido=verdade` — toda afirmação cita fonte.
> **Língua:** português (pt-BR).

---

## 1. REPOSICIONAMENTO

```
ERRADO:                               CERTO:
┌──────────────────┐                 ┌──────────────────────────────────┐
│  ADSENTICE CHAT   │                 │  ADSENTICE INTERACTION HUB       │
│  (caixa de texto) │                 │                                  │
│                   │                 │  AG-UI ── Agent-User Interaction │
│  input: URL       │                 │  MCP   ── Agent ↔ Tools & Data  │
│  output: cards    │                 │  A2A   ── Agent ↔ Agent         │
└──────────────────┘                 │                                  │
                                      │  13 padrões de interação:        │
                                      │  📝 Chat  🧠 Thinking  🖼️ UI    │
                                      │  🗂️ State  🔧 Tools  🛑 HITL    │
                                      │  🎯 Steer  🔗 Sub-agents  📎 MM │
                                      │  📡 Stream  🔌 Custom  🏃 Life   │
                                      └──────────────────────────────────┘
```

**"Chat is one entry point into that system, not the system itself."** — Jasper.ai
**"AG-UI brings agents into user-facing applications."** — AG-UI docs

---

## 2. ARQUITETURA DE 3 CAMADAS

### 2.1 Protocol Stack

```
┌──────────────────────────────────────────────────────────┐
│                   USUÁRIO (SMB Brasil)                    │
│                                                           │
│  ┌──────────────────────────────────────────────────┐    │
│  │         AG-UI LAYER (interaction)                 │    │
│  │  Next.js 15 + Materio + @ag-ui/client              │    │
│  │  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐   │    │
│  │  │ Chat │ │Cards │ │Score │ │HITL  │ │Steer │   │    │
│  │  └──────┘ └──────┘ └──────┘ └──────┘ └──────┘   │    │
│  └──────────────────┬───────────────────────────────┘    │
│                     │ SSE / WebSocket                     │
│  ┌──────────────────┴───────────────────────────────┐    │
│  │         MCP LAYER (tools & data)                  │    │
│  │  6 servers: redis, qdrant, kg, conversation,      │    │
│  │  dataforseo, context7                              │    │
│  └──────────────────┬───────────────────────────────┘    │
│                     │                                     │
│  ┌──────────────────┴───────────────────────────────┐    │
│  │         A2A LAYER (agent ↔ agent)                │    │
│  │  6 pipelines como sub-agents com scoped state     │    │
│  │  LLM Árbitro (DeepSeek V4) sintetiza              │    │
│  └──────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────┘
```

### 2.2 Justificativa AG-UI

| Critério | AG-UI | Alternativas |
|----------|-------|-------------|
| Licença | MIT ✅ | — |
| Eventos padronizados | 24 eventos em 6 categorias ✅ | Proprietário ❌ |
| SDKs | JS/TS + Python + .NET ✅ | — |
| State management | Snapshot + JSON Patch RFC 6902 ✅ | — |
| Interrupts (HITL) | Nativos ✅ | Custom ❌ |
| Generative UI | Draft spec ✅ | — |
| Ecossistema | LangGraph, CrewAI, Mastra, Google ADK ✅ | — |
| Adoção | Jasper, CopilotKit, LangChain ✅ | — |

---

## 3. EVENT CATALOG (AG-UI mapped to adsentice)

### 3.1 Lifecycle Events

| Event AG-UI | adsentice | Quando |
|-------------|-----------|--------|
| `RunStarted` | `discovery:started` | Usuário submete URL |
| `RunFinished` | `discovery:complete` | Todos os 6 pipelines terminaram |
| `RunError` | `discovery:error` | Pipeline falhou |
| `StepStarted` | `pipeline:started {name}` | Início de cada pipeline |
| `StepFinished` | `pipeline:done {name}` | Fim de cada pipeline |

### 3.2 Text Message Events

| Event AG-UI | adsentice | Quando |
|-------------|-----------|--------|
| `TextMessageStart` | `message:start` | Chat livre (DeepSeek/Qwen) |
| `TextMessageContent` | `message:delta` | Streaming de resposta |
| `TextMessageEnd` | `message:end` | Resposta completa |

### 3.3 Reasoning Events

| Event AG-UI | adsentice | Quando |
|-------------|-----------|--------|
| `ReasoningStart` | `thinking:start` | LLM árbitro começa síntese |
| `ReasoningMessageContent` | `thinking:delta` | Raciocínio intermediário |
| `ReasoningEnd` | `thinking:end` | Síntese concluída |

### 3.4 Tool Call Events

| Event AG-UI | adsentice | Quando |
|-------------|-----------|--------|
| `ToolCallStart` | `tool:start {cap}` | Pipeline chama DataForSEO |
| `ToolCallArgs` | `tool:args {cap}` | Parâmetros da chamada |
| `ToolCallEnd` | `tool:end {cap}` | Chamada concluída |
| `ToolCallResult` | `tool:result {cap}` | Resultado do DataForSEO |

### 3.5 State Events

| Event AG-UI | adsentice | Quando |
|-------------|-----------|--------|
| `StateSnapshot` | `brand_iq:snapshot` | Brand IQ completo |
| `StateDelta` | `brand_iq:delta` | Atualização incremental |
| `MessagesSnapshot` | `thread:history` | Histórico da conversa |

### 3.6 Activity Events (Generative UI)

| Event AG-UI | adsentice | Quando |
|-------------|-----------|--------|
| `ActivitySnapshot` | `card:render {id}` | Card de descoberta |
| `ActivityDelta` | `card:update {id}` | Card atualizado |

### 3.7 Interrupt Events

| Event AG-UI | adsentice | Quando |
|-------------|-----------|--------|
| `RunFinished(outcome=interrupt)` | `credit:gate {action}` | Deep-dive requer créditos |
| `resume` | `credit:approved` | Usuário confirma gasto |

---

## 4. SHARED STATE: BRAND IQ

### 4.1 Modelo

```typescript
// Brand IQ — shared state AG-UI entre agente e frontend
interface BrandIQ {
  // Descoberto automaticamente (GMB + site + redes)
  business: {
    name: string
    url: string
    domain: string
    category: string          // "clínica dentária"
    subcategory?: string      // "ortodontia"
    location: {
      address: string
      city: string
      state: string
      lat: number
      lng: number
    }
  }

  // Brand Voice (descoberto, não configurado)
  voice: {
    tone: string              // "profissional e acolhedor"
    formality: number         // 0-1 (casual → formal)
    keywords: string[]        // ["sorriso", "confiança", "tecnologia"]
    audienceSignals: string[] // ["mulheres 25-45", "classe B+", "SP zona sul"]
  }

  // Visual Identity (extraído do site)
  visual: {
    primaryColor: string      // "#1a56db"
    secondaryColor: string    // "#f59e0b"
    fontFamily: string        // "Inter, sans-serif"
    logoUrl?: string
  }

  // Market Position (descoberto dos dados)
  market: {
    score: number             // 0-100
    rank: number              // posição entre concorrentes
    totalCompetitors: number
    strengths: string[]       // ["reviews positivos", "site rápido"]
    gaps: string[]            // ["sem posts GMB 6 meses", "não anuncia"]
  }
}
```

### 4.2 Fluxo de Sincronização

```
Browser (Next.js)                    Backend (Railway)
     │                                    │
     │  POST /api/chat/discover            │
     │  {url: "minhaclinica.com.br"}       │
     │ ──────────────────────────────────► │
     │                                    │ 6 pipelines → DataForSEO
     │                                    │ LLM árbitro → síntese
     │  STATE_SNAPSHOT                     │
     │  {brandIQ: {...}}                  │
     │ ◄────────────────────────────────── │
     │                                    │
     │  STATE_DELTA                        │
     │  [{op:"replace",                    │
     │    path:"/market/score",            │
     │    value:62}]                       │
     │ ◄────────────────────────────────── │
     │                                    │
     │  ACTIVITY_SNAPSHOT (card: seo)     │
     │ ◄────────────────────────────────── │
     │  ACTIVITY_SNAPSHOT (card: gmb)     │
     │ ◄────────────────────────────────── │
     │  ... (6 cards)                     │
     │                                    │
     │  RUN_FINISHED {outcome: "success"} │
     │ ◄────────────────────────────────── │
```

---

## 5. INTERRUPTS: CREDIT GATE

### 5.1 Fluxo HITL (Human-in-the-Loop)

```
┌──────────┐     ┌──────────┐     ┌──────────┐
│ DISCOVER │ ──► │  CARDS   │ ──► │ DEEP-DIVE│
│ (grátis) │     │ (grátis) │     │ (crédito)│
└──────────┘     └──────────┘     └────┬─────┘
                                       │
                              ┌────────┴────────┐
                              │  RUN_FINISHED    │
                              │  outcome:        │
                              │  "interrupt"     │
                              │  interrupts: [{  │
                              │    reason:        │
                              │    "confirmation" │
                              │    message:       │
                              │    "Análise de    │
                              │     concorrentes  │
                              │     custa 5       │
                              │     créditos"     │
                              │  }]              │
                              └────────┬────────┘
                                       │
                          ┌────────────┴────────────┐
                          │  Usuário decide          │
                          │  [Confirmar] [Cancelar]  │
                          └────────────┬────────────┘
                                       │
                          ┌────────────┴────────────┐
                          │  resume: [{              │
                          │    interruptId: "int-1", │
                          │    status: "resolved",   │
                          │    payload: {confirmed:  │
                          │      true}               │
                          │  }]                      │
                          └────────────┬────────────┘
                                       │
                              ┌────────┴────────┐
                              │  DEEP-DIVE       │
                              │  EXECUTA          │
                              └──────────────────┘
```

### 5.2 Interrupt Schema (adsentice)

```typescript
// Credit gate interrupt
{
  id: "credit-gate-{uuid}",
  reason: "confirmation",           // AG-UI core value
  message: "Análise de concorrentes — 5 créditos",
  responseSchema: {
    type: "object",
    properties: {
      confirmed: { type: "boolean" },
      credit_cost: { type: "integer", const: 5 }
    },
    required: ["confirmed"]
  },
  metadata: {
    adsentice: {
      pipeline: "competitor_intel",
      credit_cost: 5,
      estimated_time_ms: 3000,
      capabilities: ["domain.competitors", "domain.keyword_gap"]
    }
  }
}
```

---

## 6. FRONTEND TOOLS: PIPELINES COMO TOOLS

### 6.1 Pipeline Tool Definitions

```typescript
// Cada pipeline exposto como frontend tool (AG-UI pattern)
const PIPELINE_TOOLS: Tool[] = [
  {
    name: "discover_site_audit",
    description: "Auditoria técnica do site — tecnologia, performance, Lighthouse",
    parameters: {
      type: "object",
      properties: {
        url: { type: "string", format: "uri", description: "URL do site" },
        mobile: { type: "boolean", default: true }
      },
      required: ["url"]
    }
  },
  {
    name: "discover_seo",
    description: "SEO Discovery — keywords, SERP, ranqueamento, volume de busca",
    parameters: {
      type: "object",
      properties: {
        domain: { type: "string", description: "Domínio a analisar" },
        location: { type: "string", default: "São Paulo,Brazil" },
        maxKeywords: { type: "integer", default: 30 }
      },
      required: ["domain"]
    }
  },
  // ... gmb, reputation, competitors, ads, social
]
```

### 6.2 Tool Lifecycle (exemplo: SEO pipeline)

```
TOOL_CALL_START  { toolCallId: "tc-1", toolCallName: "discover_seo" }
TOOL_CALL_ARGS   { delta: '{"domain":"minhaclinica.com.br"}' }
TOOL_CALL_END    { toolCallId: "tc-1" }

... (DataForSEO processing) ...

TOOL_CALL_RESULT {
  toolCallId: "tc-1",
  content: {
    keywords: 23,
    avgPosition: 14,
    topKeyword: { term: "dentista perto de mim", volume: 2900, position: 8 }
  }
}

ACTIVITY_SNAPSHOT {
  activityType: "discovery-card",
  content: {
    id: "seo",
    title: "SEO & Descoberta",
    score: 54,
    highlights: [...]
  }
}
```

---

## 7. SUB-AGENTS: 6 PIPELINES PARALELOS

### 7.1 Composition Pattern (A2A layer)

```
RunStarted { threadId, runId, input: { url: "minhaclinica.com.br" } }
     │
     ├── StepStarted { stepName: "site_audit" }
     │   ├── ToolCall* { toolCallName: "discover_site_audit" }
     │   └── StepFinished { stepName: "site_audit" }
     │
     ├── StepStarted { stepName: "seo_discovery" }    ← paralelo
     │   ├── ToolCall* { toolCallName: "discover_seo" }
     │   └── StepFinished { stepName: "seo_discovery" }
     │
     ├── StepStarted { stepName: "gmb_reputation" }   ← paralelo
     ├── StepStarted { stepName: "competitor_intel" } ← paralelo
     ├── StepStarted { stepName: "ads_intelligence" } ← paralelo
     ├── StepStarted { stepName: "social_discovery" } ← paralelo
     │
     ├── ReasoningStart    ← LLM árbitro (DeepSeek V4)
     │   └── ReasoningMessageContent* (síntese cruzada)
     ├── ReasoningEnd
     │
     ├── StateSnapshot { brandIQ: {...} }    ← Brand IQ completo
     ├── ActivitySnapshot* (6 cards)          ← Generative UI
     └── RunFinished { outcome: "success" }
```

### 7.2 Parallel Execution (A2A pattern)

```typescript
// Backend — 6 pipelines em paralelo
async function discoveryPipeline(input: RunAgentInput): Promise<Observable<BaseEvent>> {
  const { url } = input;

  // 1. Dispara 6 pipelines em paralelo
  const pipelines = [
    runSiteAudit(url),
    runSEODiscovery(url),
    runGMBReputation(url),
    runCompetitorIntel(url),
    runAdsIntelligence(url),
    runSocialDiscovery(url),
  ];

  // 2. Emite StepStarted/StepFinished conforme completam
  const results = await Promise.allSettled(pipelines);

  // 3. LLM árbitro sintetiza (Reasoning)
  yield* reason(results);

  // 4. Emite Brand IQ (StateSnapshot)
  yield { type: "STATE_SNAPSHOT", snapshot: buildBrandIQ(results) };

  // 5. Emite cards (ActivitySnapshot x6)
  for (const card of buildCards(results)) {
    yield { type: "ACTIVITY_SNAPSHOT", activityType: "discovery-card", content: card };
  }

  // 6. Tips ordenados por prioridade
  yield { type: "ACTIVITY_SNAPSHOT", activityType: "tips", content: buildTips(results) };
}
```

---

## 8. ENDPOINTS (REST → AG-UI)

### 8.1 Migration Path

| Antigo (Chat Spec v0.1) | Novo (AG-UI v1.0) | Mudança |
|--------------------------|-------------------|---------|
| `POST /api/chat/discover` | `POST /api/ag-ui/run` | Padronizado AG-UI |
| `POST /api/chat/analyze` | resume com `credit:gate` resolvido | Via interrupt |
| `POST /api/chat/message` | `POST /api/ag-ui/run` (chat livre) | Unificado |
| `GET /api/chat/thread/:id` | `GET /api/ag-ui/thread/:id` | Renomeado |
| — | `GET /api/ag-ui/thread/:id/events` | NOVO: event stream replay |
| — | `GET /api/ag-ui/openapi.json` | NOVO: OpenAPI spec |
| — | `GET /api/ag-ui/llms.txt` | NOVO: machine-readable index |

### 8.2 RunAgentInput (AG-UI standard)

```typescript
// POST /api/ag-ui/run
interface RunAgentInput {
  threadId: string          // sessão do usuário
  runId: string             // idempotência
  parentRunId?: string      // branching (deep-dive deriva de discover)
  input: {
    url?: string            // discovery
    message?: string        // chat livre
    deep_dive_id?: string   // deep-dive específico
  }
  tools?: Tool[]            // frontend-defined tools
  context?: {
    brandIQ?: Partial<BrandIQ>  // estado pré-existente
  }
  resume?: Array<{          // HITL resume
    interruptId: string
    status: "resolved" | "cancelled"
    payload?: any
  }>
}
```

### 8.3 Response (SSE stream de BaseEvent[])

```
Content-Type: text/event-stream

event: message
data: {"type":"RUN_STARTED","threadId":"th-1","runId":"run-1"}

event: message
data: {"type":"STEP_STARTED","stepName":"site_audit"}

event: message
data: {"type":"TOOL_CALL_START","toolCallId":"tc-1","toolCallName":"on_page_lighthouse"}

event: message
data: {"type":"TOOL_CALL_RESULT","toolCallId":"tc-1","content":{...}}

event: message
data: {"type":"STEP_FINISHED","stepName":"site_audit"}

... (5 more pipelines in parallel) ...

event: message
data: {"type":"REASONING_START","messageId":"reason-1"}

event: message
data: {"type":"REASONING_MESSAGE_CONTENT","delta":"Clínica bem posicionada em SEO local mas..."}

event: message
data: {"type":"REASONING_END","messageId":"reason-1"}

event: message
data: {"type":"STATE_SNAPSHOT","snapshot":{"business":{...},"voice":{...},"market":{...}}}

event: message
data: {"type":"ACTIVITY_SNAPSHOT","activityType":"discovery-card","content":{"id":"seo","title":"SEO","score":54}}

... (5 more cards) ...

event: message
data: {"type":"RUN_FINISHED","threadId":"th-1","runId":"run-1","outcome":{"type":"success"}}
```

---

## 9. GENERATIVE UI: CARDS + TIPS + SCORE

### 9.1 Activity Types

```typescript
// Tipos de atividade generativa do adsentice
type AdsenticeActivityType =
  | "discovery-card"      // Card de pipeline (SEO, GMB, etc.)
  | "tip"                 // Recomendação acionável
  | "market-score"        // Score de mercado
  | "deep-dive-result"    // Resultado de análise aprofundada
  | "brand-iq-summary"    // Resumo do Brand IQ descoberto
```

### 9.2 Card Component Schema

```typescript
// ACTIVITY_SNAPSHOT com activityType: "discovery-card"
interface DiscoveryCard {
  id: string               // "seo" | "gmb" | "reputation" | "competitors" | "social" | "ads"
  icon: string             // ícone Lucide
  title: string            // "SEO & Descoberta"
  score: number            // 0-100
  highlights: string[]     // bullets informativos
  severity: "critical" | "warning" | "good" | "excellent"
  deepDiveAvailable: boolean
  deepDiveCreditCost?: number
}
```

### 9.3 Tip Component Schema

```typescript
// ACTIVITY_SNAPSHOT com activityType: "tip"
interface Tip {
  priority: number         // 1 = mais urgente
  urgency: "high" | "medium" | "low"
  title: string
  detail: string
  action: string           // label do botão
  credit_cost: number      // 0 = grátis
  pipeline?: string        // pipeline relacionado
}
```

---

## 10. UX FLOW COMPLETO

### 10.1 Tela Inicial → Discovery → Cards → Deep-Dive

```
┌────────────────────────────────────────────────────────────┐
│ 1. IDLE                                                      │
│    Input: "minhaclinica.com.br" + [Analisar]                 │
│    Event: RUN_STARTED                                        │
├────────────────────────────────────────────────────────────┤
│ 2. THINKING (6 pipelines paralelos)                          │
│    STEP_STARTED/STEP_FINISHED × 6                            │
│    Progress bar: [████████████░░░░] 78%                      │
│    Template: "✅ Site encontrado · ✅ GMB · ⏳ SEO..."       │
├────────────────────────────────────────────────────────────┤
│ 3. REASONING (LLM árbitro)                                   │
│    REASONING_MESSAGE_CONTENT (streaming)                     │
│    "Cruzando dados dos 6 pipelines..."                       │
├────────────────────────────────────────────────────────────┤
│ 4. BRAND IQ (state snapshot)                                 │
│    STATE_SNAPSHOT → frontend recebe Brand IQ completo        │
│    Sidebar: informações do negócio (voz, posição, gaps)     │
├────────────────────────────────────────────────────────────┤
│ 5. CARDS (generative UI)                                     │
│    ACTIVITY_SNAPSHOT × 6 (cards de descoberta)               │
│    Grid: 3×2 cards com scores e highlights                   │
│    ACTIVITY_SNAPSHOT × 3 (tips prioritários)                 │
├────────────────────────────────────────────────────────────┤
│ 6. DEEP-DIVE (HITL interrupt)                                │
│    RUN_FINISHED { outcome: "success" }                       │
│    Botões de deep-dive abaixo dos cards                      │
│    Click → RUN_FINISHED { outcome: "interrupt" }             │
│    Modal: "Análise de concorrentes — 5 créditos. Confirmar?" │
│    Confirm → resume → novo run com deep-dive                 │
└────────────────────────────────────────────────────────────┘
```

---

## 11. IMPLEMENTAÇÃO (FASES)

### 11.1 MVP (2 semanas)

| Feature | Tech | AG-UI Events |
|---------|------|-------------|
| `POST /api/ag-ui/run` | Next.js API route | RunStarted, StepStarted/Finished, RunFinished |
| 6 pipelines paralelos | Promise.all() DataForSEO MCP | ToolCall*, ToolCallResult |
| LLM árbitro | DeepSeek V4 | ReasoningStart, ReasoningMessageContent, ReasoningEnd |
| Brand IQ (estado inicial) | GMB + site crawl | StateSnapshot |
| Cards + Tips + Score | ActivitySnapshot × 9 | ActivitySnapshot (discovery-card, tip, market-score) |
| SSE streaming | text/event-stream | Formato AG-UI padrão |

### 11.2 v0.2 (1 mês)

| Feature | Tech | AG-UI Events |
|---------|------|-------------|
| Chat livre multi-modelo | DeepSeek + Qwen local | TextMessageStart, TextMessageContent, TextMessageEnd |
| Credit gate (HITL) | Interrupt pattern | RunFinished(outcome=interrupt), resume |
| State delta | JSON Patch RFC 6902 | StateDelta |
| Thread history | Supabase | MessagesSnapshot |
| OpenAPI spec pública | openapi-typescript | GET /api/ag-ui/openapi.json |
| llms.txt | Static + auto-gen | Machine-readable index |

### 11.3 v1.0 (3 meses)

| Feature | Tech | AG-UI Events |
|---------|------|-------------|
| Agent steering | Refinar pipeline mid-execution | Custom event |
| Sub-agent fanout | Pipelines delegam entre si | parentRunId, nested runs |
| Multimodality | Screenshot, voice input | MultimodalInput |
| Generative UI declarativa | JSON Schema → React components | Draft: generateUserInterface |
| MCP server público | mcp SDK + adsentice tools | Complementa AG-UI |

---

## 12. DOUTRINAS (ATUALIZADAS)

1. **medido=verdade:** toda afirmação cita fonte (arquivo, commit, MCP tool, evento AG-UI).
2. **AG-UI first:** toda interação agente↔UI segue o protocolo AG-UI. Chat é 1 dos 13 padrões.
3. **Pipeline discovery:** URL → 6 pipelines paralelos (A2A) → cards + tips + score (AG-UI generative).
4. **LLM = árbitro NUNCA extrator:** DeepSeek cost-capped, Qwen local $0.
5. **Sandbox default ($0) · live gated:** spend-cap por tenant · credit gate via interrupt.
6. **Vault:** R2 blob → Postgres série ANTES de indexar.
7. **Corpora:** A=self(adsentice) ≠ B=cliente(tenant·PII) ≠ C=tooling.
8. **Spec primeiro · ADR para decisões · Português (pt-BR).**
9. **Stack:** Next.js 15 + Railway + Supabase + Cloudflare R2 + DataForSEO MCP + AG-UI.
10. **Público:** SMB brasileiro (dono de clínica, lojista, contador).
11. **Ticket:** R$0 (free) · R$47 (starter) · R$197 (pro) · R$497 (escala).
12. **3 machine paths:** llms.txt + OpenAPI + MCP server — interoperabilidade por padrão.
13. **"Chat is one entry point, not the system itself."** — Jasper.ai + AG-UI.

---

## 13. REFERÊNCIAS

| Documento | Local |
|-----------|-------|
| AG-UI Docs (54 páginas) | https://docs.ag-ui.com |
| AG-UI Event Catalog | https://docs.ag-ui.com/concepts/events |
| AG-UI Interrupts | https://docs.ag-ui.com/concepts/interrupts |
| AG-UI State | https://docs.ag-ui.com/concepts/state |
| AG-UI Tools | https://docs.ag-ui.com/concepts/tools |
| AG-UI Generative UI (draft) | https://docs.ag-ui.com/drafts/generative-ui |
| AG-UI GitHub (MIT) | https://github.com/ag-ui-protocol/ag-ui |
| Jasper fork do AG-UI | https://github.com/gojasper/ag-ui |
| Jasper MCP Server | https://mcp.jasper.ai |
| Probe Público Jasper | `docs/jasper-docs/probe-2026-07-11-public.md` |
| Análise Repos gojasper | `docs/jasper-docs/gojasper-repos-analysis.md` |
| Base-Matriz adsentice | `docs/spec/base-matriz-adsentice.md` |
| CLAUDE.md | raiz do projeto |

---

*Especificação v1.0.0 · 2026-07-11 · AG-UI Native · supersedes adsentice-chat-spec v0.1.0*
