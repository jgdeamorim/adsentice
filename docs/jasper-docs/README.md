# Jasper.ai — Referência Canônica para adsentice

> Compilado 2026-07-11 · Fontes: developers.jasper.ai/docs, pipeline-jasper-frontend-capture.md, jasper-api-docs-completo.md
> Propósito: benchmark de capacidades, arquitetura de referência, padrões de API/MCP, e gap analysis para adsentice.

---

## Estrutura do diretório

```
docs/jasper-docs/
├── README.md                          ← este arquivo (referência canônica)
├── jasper-api-docs-completo.md        ← API docs completa (16 seções, 582 linhas)
├── guides/                            ← (placeholder)
├── mcp/                               ← (placeholder)
├── reference/                         ← (placeholder)
└── recipes/                           ← (placeholder)
```

Arquivos irmãos (em `docs/`):
- `jasper-ai-analise-competitiva.md` — análise competitiva completa (eval + probe)
- `jasper-solutions-analise.md` — soluções Jasper vs oportunidades adsentice
- `/home/jeffer/Downloads/pipeline-jasper-frontend-capture.md` — pipeline de captura visual (9 fases)

---

## 1. ARQUITETURA JASPER — 3 PILARES

```
┌──────────────────────────────────────────────────────┐
│                    JASPER.AI                          │
│                                                       │
│  ① AGENTS (100+)                                      │
│  Agentes especializados que executam trabalho real    │
│  de marketing: SEO, campanhas, email, social,         │
│  personalização, pesquisa, tradução                   │
│                                                       │
│  ② CONTENT PIPELINES                                  │
│  Workflows repetíveis: ideia → launch                │
│  Canvas, Grid, AI Studio, Image Pipelines             │
│                                                       │
│  ③ JASPER IQ (camada de inteligência de marca)        │
│  Brand Voice · Style Guide · Visual Guidelines        │
│  Audience Profiles · Product Knowledge · Knowledge Base│
│  → TUDO que é gerado é automaticamente on-brand      │
└──────────────────────────────────────────────────────┘
```

### Mapeamento adsentice

| Pilar Jasper | Equivalente adsentice | Status |
|---|---|---|
| 100+ Agents | 6 pipelines discovery + Stage 3 (8 eixos) | 🔴 pipelines spec pronta, zero código |
| Content Pipelines | API `/chat/discover` → `/chat/analyze` | 🔴 spec pronta |
| Jasper IQ (brand context) | Brand IQ automático (descoberto do GMB/site, não configurado) | 🔴 a construir |

**Lição chave:** Jasper AI = brand intelligence + agents + pipelines. O diferencial NÃO é o LLM, é a camada de contexto de marca (Jasper IQ) que faz todo output ser on-brand sem prompting manual. Nosso equivalente: Brand IQ descoberto automaticamente do Google Business Profile + site + redes sociais, em vez de configurado manualmente.

---

## 2. API JASPER — ESTRUTURA COMPLETA

### Base
```
Base URL: https://api.jasper.ai
Auth: X-API-KEY header
Rate limits: por workspace (105-200 RPM por categoria)
Versioning: 6 meses aviso para depreciação
```

### Endpoints por domínio (11 domínios, ~40 endpoints)

| Domínio | Endpoints | Relevância adsentice |
|---------|-----------|---------------------|
| **Attachments** | POST `/v1/attachments` | Média — ingest de URLs para análise |
| **Agent Tasks** | GET `/v1/tasks`, GET/POST `/v1/tasks/{id}/run[/stream]` | ALTA — padrão discovery→configure→execute |
| **Commands** | POST `/v1/commands/run` | ALTA — prompt aberto com context + IQ |
| **Knowledge** | CRUD + `/v1/knowledge/search` (semântico) | ALTA — nosso Vault + Qdrant |
| **Voices** | CRUD `/v1/voices` | ALTA — Brand IQ automático |
| **Style Guides** | GET `/v1/style-guides` | Média — derivado do Brand IQ |
| **Audiences** | GET `/v1/audiences` | Média — persona discovery |
| **Templates** | GET + POST `/v1/templates/{id}/run` | ALTA — template = pipeline config |
| **Images** | 10 endpoints (remove bg, upscale, etc.) | Baixa — não é nosso foco |
| **Documents** | CRUD `/v1/documents` | Média — output storage |
| **Usage** | GET `/v1/usage` | Baixa — analytics interna |

### Context Items (Jasper Agents schema)

O sistema de Context Items do Jasper é uma **inspiração direta para o schema de inputs dos nossos pipelines**:

| Type | Value | UI | Uso adsentice |
|------|-------|----|---------------|
| `INPUT` | string | Text input | URL do site, nome do negócio |
| `TEXTAREA` | string | Text area | Descrição livre, briefing |
| `SELECT` | string (enum) | Dropdown | Nicho, categoria, localização |
| `MULTISELECT` | string[] | Multi-select | Serviços oferecidos, canais |
| `KNOWLEDGE` | array (IDs + extraction prompt) | Knowledge picker | Documentos do Vault como contexto |
| Custom | `{name, question, answer}` | Dynamic form | Inputs específicos por pipeline |

---

## 3. TRÊS CAMINHOS OFICIAIS DE MÁQUINA (Jasper → padrão a seguir)

O pipeline de captura (`pipeline-jasper-frontend-capture.md`) documenta que o Jasper expõe **3 caminhos estruturados para AI/agentes**:

```
┌─────────────────────────────────────────────┐
│          OFFICIAL MACHINE PATHS              │
│                                              │
│  ① llms.txt                                 │
│     developers.jasper.ai/llms.txt           │
│     → índice de TODAS páginas de docs (MD)  │
│     → referência OpenAPI                    │
│     → $0, sem auth, sancionado              │
│                                              │
│  ② OpenAPI Spec                             │
│     → schema canônico de endpoints          │
│     → contratos request/response            │
│     → derivar translator sem scraping       │
│     → $0 para LER (não chamar)              │
│                                              │
│  ③ MCP Server                               │
│     mcp.jasper.ai (streamable HTTP)         │
│     → 7 tools (brand voices, audiences,      │
│       knowledge search, agents, generate)    │
│     → OAuth 2.0 + X-API-KEY                 │
│     → Business plan required                │
└─────────────────────────────────────────────┘
```

### Lição para adsentice

Devemos expor os mesmos 3 caminhos:
1. **`adsentice.ai/llms.txt`** — índice de docs + spec OpenAPI + MCP endpoint
2. **`adsentice.ai/openapi.json`** — schema canônico dos endpoints `/api/chat/*`
3. **MCP server público** — tools de discovery (search, analyze) como porta de entrada para agentes externos

---

## 4. MCP SERVER — JASPER vs ADSENTICE

### Jasper MCP (7 tools)

| Tool | Função | Equivalente adsentice |
|------|--------|----------------------|
| `get-jasper-brand-voices` | Listar brand voices do workspace | `adsentice_search` (brand IQ descoberto) |
| `get-jasper-audiences` | Listar audiências configuradas | Pipeline competitor_intel → persona |
| `search-knowledge-base` | Busca semântica na KB | `adsentice_search` (Qdrant) |
| `get-jasper-style-guides` | Style guides do workspace | Derivado do Brand IQ |
| `get-jasper-agents` | Listar agentes disponíveis | `adsentice_kg_edges` (pipelines) |
| `run-jasper-agent` | Executar tarefa de marketing | `POST /api/chat/discover` |
| `generate-content` | Gerar conteúdo on-brand | `POST /api/chat/analyze` (deep-dive) |

### Conexão com clientes

Jasper suporta 6 clientes MCP:
- Claude (Web + Desktop)
- ChatGPT
- Microsoft Copilot Studio
- OpenAI Agent Builder
- n8n
- Cursor / VS Code / Windsurf

**Estratégia adsentice:** Nosso MCP server deve ser compatível com o ecossistema Claude (Web + Desktop) como canal primário, com OpenAPI + REST como canais secundários. O padrão EVO-API de "1 capability = 4 faces do mesmo" (REST + MCP + brain intent + k0 node) é o norte.

---

## 5. O QUE O JASPER NÃO TEM (nosso fosso)

| Capacidade | Jasper | adsentice (com DataForSEO MCP) |
|---|---|---|
| Search volume / keyword data | ❌ | ✅ DATAFORSEO_LABS |
| SERP analysis | ❌ | ✅ SERP |
| Competitor domain intelligence | ❌ | ✅ DOMAIN_ANALYTICS |
| GMB / business profile | ❌ | ✅ BUSINESS_DATA |
| Reviews + sentiment | ❌ | ✅ BUSINESS_DATA + CONTENT_ANALYSIS |
| Backlinks analysis | ❌ | ✅ BACKLINKS |
| On-page SEO audit (Lighthouse) | ❌ | ✅ ONPAGE |
| Ad intelligence / traffic forecast | ❌ | ✅ KEYWORDS_DATA |
| AI mention tracking | ❌ | ✅ AI_OPTIMIZATION |
| Content sentiment analysis | ❌ | ✅ CONTENT_ANALYSIS |
| Market data de qualquer tipo | ❌ | ✅ 9 módulos DataForSEO |
| **Descoberta automática de marca** | ❌ (manual) | ✅ (nossa inovação: GMB → Brand IQ) |

**Conclusão:** A API do Jasper é exclusivamente para **GERAÇÃO de conteúdo on-brand**. Nosso diferencial é a camada de **INTELIGÊNCIA DE MERCADO** (9 módulos DataForSEO) + **BRAND IQ AUTOMÁTICO** (descoberto, não configurado).

---

## 6. ARQUITETURA DE REFERÊNCIA — EVO-API + RSXT

O padrão EVO-API/rsxt informa COMO construir as camadas adsentice:

### 6.1 Pipeline Pattern (rsxt appliance)

```
URL de entrada
     │
     ▼
┌─────────────────────────────────────────┐
│         PIPELINE DISCOVERY               │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐   │
│  │ Site │ │ SEO  │ │ GMB  │ │Comp. │   │  ← 6 pipelines paralelos
│  │Audit │ │Disc. │ │Reput.│ │Intel │   │
│  └──┬───┘ └──┬───┘ └──┬───┘ └──┬───┘   │
│     │        │        │        │        │
│     └────────┼────────┼────────┘        │
│              ▼        ▼                  │
│         ┌────────────────┐              │
│         │  LLM ÁRBITRO    │              │
│         │  (DeepSeek V4)  │              │
│         │  sintetiza cards│              │
│         │  + tips + score │              │
│         └────────────────┘              │
└─────────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────┐
│         OUTPUT: cards + tips + score     │
│  → POST /api/chat/discover               │
└─────────────────────────────────────────┘
```

### 6.2 Vault Pattern (EVO-API write-ahead log)

```
Provider call (DataForSEO MCP)
     │
     ▼
vault.put()  →  ① R2 blob (blake3 hash)
             →  ② Postgres série (timeline)
             →  ③ Qdrant index (search)
```

**Propriedades:** dedup automático (blake3), reconstruível (índice corrompido? apaga e reconstrói do vault), auditável (timeline completa).

### 6.3 Multi-Porta Pattern (EVO-API "1 capability = 4 faces")

```
Capability: gmb.profile.rich
     │
     ├── REST:  POST /module/gmb.profile.rich
     ├── MCP:   capability_invoke(id="gmb.profile.rich", input={...})
     ├── Brain: "a ficha do Google Maps da LuRocha" → resolve
     └── k0:    capability://gmb.profile.rich (edges)
```

### 6.4 Jasper Frontend Capture Pipeline (9 fases)

O `pipeline-jasper-frontend-capture.md` define um pipeline de 9 fases para capturar o frontend Jasper:

| Fase | Nome | Output |
|------|------|--------|
| 0 | Gates | robots.txt, legal, scope, rate-limit |
| 0.5 | Official Paths | llms.txt, OpenAPI, MCP tools |
| 1 | Discovery | url-frontier.json, sitemap-tree.json |
| 2 | Page Capture | skeleton.json, asset-refs.json |
| 3 | CSS + Design Tokens + DNA | tokens/jasper-raw-tokens.json, dna/style-profile.md |
| 4 | Media Assets | SVG, WebP, AVIF, fonts, media-inventory.json |
| 5 | JavaScript | bundles, framework.md, network-waterfall.json |
| 6 | Docs Capture | docs/*.md (oficial), openapi.json |
| 7 | Eval Harness | completeness-report.json, probe-log.json |
| 8 | Output Structure | diretório final organizado |
| 9 | Re-run Loop | diff llms.txt → detect change → re-crawl |

**Este pipeline é REUTILIZÁVEL para auditar qualquer concorrente** (não só Jasper). Padrão a seguir para nossos próprios probes de mercado.

---

## 7. GAP ANALYSIS — O QUE CONSTRUIR

### 7.1 Curto prazo (MVP — 2 semanas)

| Feature | Inspiração | Tech |
|---------|-----------|------|
| `POST /api/chat/discover` | Jasper Agents + EVO-API pipeline | Next.js API route + DataForSEO MCP |
| 6 pipelines paralelos | rsxt appliance pattern | Promise.all() sobre DataForSEO calls |
| Cards + tips + score | Jasper Agent output + LLM síntese | DeepSeek V4 árbitro |
| Vault write-ahead | EVO-API vault.put() | R2 blob → Supabase série |

### 7.2 Médio prazo (v0.2 — 1 mês)

| Feature | Inspiração | Tech |
|---------|-----------|------|
| Brand IQ automático | Jasper IQ (mas descoberto, não configurado) | GMB profile + site crawl → LLM síntese |
| OpenAPI spec pública | Jasper OpenAPI | Next.js + openapi-typescript |
| `/llms.txt` | Jasper llms.txt | Static file + auto-gen |
| MCP server público | Jasper MCP (mcp.jasper.ai) | mcp SDK + adsentice tools |
| Template system | Jasper Templates + Context Items | pipeline-config.json por template |

### 7.3 Longo prazo (v1.0 — 3 meses)

| Feature | Inspiração | Tech |
|---------|-----------|------|
| Chat UI completo | Jasper Chat (mas multi-modelo) | Next.js + Materio UI |
| Agent runtime (Stage 3) | Jasper 100+ agents | EVO-API capability executor pattern |
| Credit system | Jasper pricing tiers | Supabase + Stripe |
| Image suite | Jasper Images (10 endpoints) | Cloudflare Images + AI |

---

## 8. DOUTRINAS DERIVADAS DO JASPER

1. **"Chat is one entry point, not the system itself"** — Jasper. Nosso chat é a porta de entrada, o sistema é o pipeline de discovery + Brand IQ + Vault.
2. **Brand context > LLM quality** — O diferencial do Jasper não é o modelo (eles usam fallback entre providers), é a camada de contexto de marca. Nosso equivalente é o Brand IQ descoberto automaticamente.
3. **3 machine paths** — Todo produto AI deve expor llms.txt + OpenAPI + MCP. É o padrão emergente de interoperabilidade.
4. **Pipeline > prompt** — Jasper não faz "prompt engineering", faz agentes com context items estruturados. Nossos pipelines seguem o mesmo princípio: input estruturado → DataForSEO → LLM árbitro.
5. **Vault = audit trail** — Healthcare/Financial Services exigem rastreabilidade. O Vault (EVO-API pattern) resolve isso com blake3 dedup + Postgres timeline.

---

## 9. REFERÊNCIAS CRUZADAS

| Documento | Local | Relevância |
|-----------|-------|------------|
| jasper-api-docs-completo.md | `docs/jasper-docs/` | API completa (16 seções) |
| jasper-ai-analise-competitiva.md | `docs/` | Análise competitiva completa |
| jasper-solutions-analise.md | `docs/` | Soluções Jasper vs oportunidades |
| pipeline-jasper-frontend-capture.md | `~/Downloads/` | Pipeline de captura visual (9 fases) |
| ADR-0001 | `docs/adr/` | Arquitetura standalone adsentice |
| base-matriz-adsentice.md | `docs/spec/` | Mapa navegável do ecossistema |
| adsentice-chat-spec.md | `docs/` | Spec do chat/discovery |
| CLAUDE.md | raiz | Recuperação canônica pós-compact |

---

*Documento mantido como referência viva. Atualizar quando novos probes de concorrentes forem executados.*
