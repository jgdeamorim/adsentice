# DataForSEO MCP Oficial vs EVO-API Provider.Core — Comparação lado a lado

> 2026-07-11 · Análise para decisão estratégica do adsentice

---

## 1. VISÃO GERAL

| Dimensão | DataForSEO Oficial MCP | EVO-API Provider.Core |
|---|---|---|
| **Repositório** | `github.com/dataforseo/mcp-server-typescript` | `crates/evo-provider-dataforseo` + `crates/evo-translator-dataforseo` |
| **Linguagem** | TypeScript (96.8%) | Rust (100%) |
| **Linhas de código** | ~2.000-3.000 (estimado) | **14.718** (4.412 provider + 10.306 translator) |
| **Licença** | Apache 2.0 (DataForSEO oficial) | MIT OR Apache-2.0 (soberano) |
| **Autor** | DataForSEO Inc. (time interno) | Jeferson Galote de Amorim (solo, 2 anos) |
| **Maturidade** | Beta público (2025-2026) | Produção interno (25 caps live-provadas) |
| **Formato** | Pacote npm (`dataforseo-mcp-server@2.8.10`) | Cargo workspace crate + binários |
| **Distribuição** | npm global / Docker / Cloudflare Worker | Compilado estático (binário único) |

---

## 2. MÓDULOS E COBERTURA DE API

### 2.1 Módulos (API areas)

| Módulo | Oficial MCP | EVO-API Provider.Core |
|---|---|---|
| **SERP** | ✅ Google, Bing, Yahoo | ✅ `serp.organic` + `serp.generic` |
| **KEYWORDS_DATA** | ✅ search volume, CPC, metrics | ✅ `keyword.research`, `keyword.volume`, `keyword.related`, `keyword.trends` |
| **DATAFORSEO_LABS** | ✅ in-house databases | ✅ `keyword.research` (Labs), `ai.keyword.search_volume` |
| **ONPAGE** | ✅ crawl websites | ✅ 7 caps: `instant_audit`, `crawl_summary`, `lighthouse`, `links`, `pages`, `non_indexable`, `resources`, `duplicate_content` |
| **BACKLINKS** | ✅ referring domains, anchors, quality | ✅ 5 caps: `summary`, `anchors`, `detail`, `history`, `referring_domains` |
| **BUSINESS_DATA** | ✅ Google, Trustpilot, Tripadvisor | ✅ 6 caps: `profile.gmb`, `reviews.google`, `reviews.trustpilot`, `reviews.tripadvisor`, `qa`, `listings.search` |
| **DOMAIN_ANALYTICS** | ✅ traffic, technologies, Whois | ✅ 5 caps: `overview`, `competitors`, `keyword_gap`, `ranked_keywords`, `technologies`, `whois` |
| **CONTENT_ANALYSIS** | ✅ brand monitoring, sentiment | ✅ 3 caps: `search`, `sentiment_detailed`, `sentiment_summary` |
| **AI_OPTIMIZATION** | ✅ keyword discovery, LLM benchmarking | ✅ `ai.llm.mentions`, `ai.llm.responses`, `ai.keyword.search_volume` |
| **MERCHANT** | ✅ Google Shopping, Amazon | ✅ 4 caps: `products.amazon`, `product.amazon.detail`, `sellers.amazon`, `products.google` |
| **APP_DATA** | ❌ | ✅ 4 caps: `app.keywords`, `app.reviews`, `app.store.detail`, `app.store.search` |
| **DATABASES** | ❌ | ✅ 2 caps: `keyword.historical`, `keyword.volume_history` |

| **TOTAL** | **10 módulos** | **12 módulos · 48 translators · 73 capabilities** |

### 2.2 Ferramentas (tools MCP × capabilities EVO)

| | Oficial MCP | EVO-API |
|---|---|---|
| **Total de ferramentas/capabilities** | ~25-35 tools (não documentado exato) | **73 capabilities YAML** |
| **Translators (execução real)** | Genérico por módulo (BaseTool + Zod schema) | **48 translators tipados** (1 por endpoint, shape completo) |
| **Shapes de resposta** | Zod runtime schema | **11 shapes Rust** com tipagem forte em tempo de compilação |
| **Fixtures de teste** | Desconhecido | ✅ Fixtures live capturadas (dados reais) |
| **Campo filter** | ✅ field-config.json (per-tool, dot-notation) | ❌ (retorna o shape completo sempre) |

---

## 3. ARQUITETURA E CAMADAS

### 3.1 Oficial MCP (DataForSEO)

```
┌──────────────────────────────────────┐
│  Claude Code / ChatGPT / MCP Client  │
├──────────────────────────────────────┤
│  MCP Protocol (JSON-RPC)             │
├──────────────────────────────────────┤
│  Modules (10)                        │
│  ├── BaseModule → Tools              │
│  │   └── BaseTool + Zod schema       │
│  │       └── DataForSEOClient        │
│  │           └── POST /v3/...        │
│  └── field-config.json (filter)      │
├──────────────────────────────────────┤
│  Deployment: Node.js / HTTP / CF     │
└──────────────────────────────────────┘
```

### 3.2 EVO-API Provider.Core (soberano)

```
┌──────────────────────────────────────────┐
│  Next.js Dashboard (:3000)               │
├──────────────────────────────────────────┤
│  Vault (R2 blob → Postgres série)        │  ← cofre durável (write-ahead)
├──────────────────────────────────────────┤
│  CapabilityExecutor (TS · 80 linhas)     │  ← sandbox $0 OU live gated
│  ├── cost-gate (spend_cap por tenant)   │
│  ├── Evidence + BillingEvent 1:1        │
│  └── rsxt-v0 index (derivado)           │
├──────────────────────────────────────────┤
│  EVO-API Provider.Core (Rust)            │
│  ├── DataForSeoLiveInvoker              │  ← prod (https://api.dataforseo.com)
│  │   ├── spend_cap gate ANTES da call   │
│  │   ├── cost real extraído da response │
│  │   └── raw_hash_sha256 (audit trail)  │
│  ├── DataForSeoSandboxProber            │  ← sandbox ($0 · mesmo shape)
│  │   └── sandbox.dataforseo.com/v3/     │
│  ├── 48 Translators (1 por endpoint)    │  ← tipados, compile-time
│  │   └── translate_request → invoke →   │
│  │       translate_response             │
│  ├── 11 Shape crates                    │  ← tipos Rust canônicos
│  └── InvocationContext                  │  ← tenant + billing + spend_cap
├──────────────────────────────────────────┤
│  Deploy: Alpine Linux · zero container  │
└──────────────────────────────────────────┘
```

---

## 4. DIFERENCIAIS — O QUE O EVO-API TEM QUE O OFICIAL NÃO TEM

### 4.1 🔥 Dual-mode: Sandbox ($0) + Live (prod)

| | Oficial MCP | EVO-API |
|---|---|---|
| **Sandbox ($0)** | ❌ | ✅ `DataForSeoSandboxProber` — `sandbox.dataforseo.com/v3/` — mesmo shape, $0 |
| **Live (prod)** | ✅ | ✅ `DataForSeoLiveInvoker` — `api.dataforseo.com/v3/` |
| **Troca sandbox↔live** | N/A | ✅ Mesma interface, muda só o invoker |

**Por que importa:** Diagnóstico grátis no funil adsentice. O cliente vê o relatório com dados fake (mesmo shape), decide pagar → live com dados reais.

### 4.2 🔥 Controle de custo (spend_cap gate)

| | Oficial MCP | EVO-API |
|---|---|---|
| **spend_cap** | ❌ | ✅ `InvocationContext.can_afford(estimated_cost_usd)` ANTES da chamada |
| **Custo real vs estimado** | ❌ | ✅ Extrai `response.cost` da API → compara com estimativa |
| **BillingEvent 1:1** | ❌ | ✅ Toda chamada gera evento de billing rastreável |
| **Por tenant** | ❌ | ✅ Policy por tenant (spend-cap, soluções habilitadas, sandbox vs live) |

**Por que importa:** Sem controle de custo, 1 chamada live errada pode queimar $50 em créditos DataForSEO. O EVO-API tem gate triplo: sandbox default → spend-cap → kill-switch.

### 4.3 🔥 Evidence + Audit Trail (WORM imutável)

| | Oficial MCP | EVO-API |
|---|---|---|
| **Audit trail** | ❌ | ✅ `raw_hash_sha256` (blake3 do response JSON) |
| **Evidence store** | ❌ | ✅ `rsxt-s0` WORM + `evo-evidence-store` |
| **Provenance** | ❌ | ✅ Rastreável: tenant→capability→endpoint→custo→hash |
| **Vault write-ahead** | ❌ | ✅ R2 blob + Postgres série ANTES de indexar |

**Por que importa:** LGPD, AI Act, compliance. "O que o modelo decidiu? Com qual dado? Quanto custou?"

### 4.4 🔥 Translators tipados (Rust · compile-time safety)

| | Oficial MCP | EVO-API |
|---|---|---|
| **Tipo de schema** | Zod (runtime) | Rust structs (compile-time) |
| **Segurança** | Valida em runtime | **Compile-time** — quebra na build, não em produção |
| **Shapes por endpoint** | Zod schema por tool | **48 arquivos .rs** com request + response tipados |
| **Campos mapeados** | Genérico (JSON → LLM) | **Específico** (campo por campo, documentado) |

**Por que importa:** Se a DataForSEO mudar um campo, o Zod falha em runtime (cliente vê erro). No Rust, **não compila** — você corrige antes de deploy.

### 4.5 🔥 Multi-tenant com isolamento

| | Oficial MCP | EVO-API |
|---|---|---|
| **Multi-tenant** | ❌ (1 chave API global) | ✅ `tenant_id` + `project_id` + `InvocationContext` |
| **Isolamento de custo** | ❌ | ✅ Centro de custos por tenant |
| **RLS** | ❌ | ✅ Supabase RLS por tenant_id |
| **Policy por tenant** | ❌ | ✅ spend-cap, soluções, sandbox vs live |

### 4.6 🔥 Integração com Knowledge Graph (k0)

| | Oficial MCP | EVO-API |
|---|---|---|
| **Knowledge Graph** | ❌ | ✅ `rsxt-k0` — 24 arestas, 6 edge-kinds |
| **Navegação semântica** | ❌ | ✅ `k0_intent::sync_context_to_k0()` — grafo auto-atualizável |
| **Resolução intent→caps** | ❌ | ✅ brain→corpus "soluções" → bundle de capability_ids |

### 4.7 🔥 Cofre durável (Vault) — separação Sistema de Registro × Índice

| | Oficial MCP | EVO-API |
|---|---|---|
| **Write-ahead log** | ❌ | ✅ `vault.put()` — ① R2 blob → ② Postgres série → ③ índice (separado) |
| **Dedup por blake3** | ❌ | ✅ Mesmo conteúdo = mesmo hash = não regrava |
| **Reconstruível** | ❌ | ✅ Índice corrompido? Apaga e reconstrói do vault. Zero perda |
| **Testes** | ❌ | ✅ 6/6 testes passando (node:test) |

### 4.8 🌐 Canais de entrega (multi-porta)

| | Oficial MCP | EVO-API |
|---|---|---|
| **MCP** | ✅ (nativo) | ✅ `evo-mcp` — mesmo registry, servido em `/mcp` |
| **REST/OpenAPI** | ❌ | ✅ `evo-openapi` — OpenAPI 3.1 das 73 caps em `/openapi.json` |
| **Brain (chat)** | ❌ | ✅ `/brain/ask` — pergunta em linguagem natural → caps → execução |
| **k0 (graph)** | ❌ | ✅ Navegação por grafo (arestas `proxied_by`/`answered_by`) |
| **Web dashboard** | ❌ | ✅ `/control/capabilities` — lente viva do motor |

---

## 5. O QUE O OFICIAL TEM QUE O EVO-API NÃO TEM

### 5.1 🔧 Maturidade de distribuição

| | Oficial MCP | EVO-API |
|---|---|---|
| **npm global** | ✅ `npm install -g dataforseo-mcp-server` | ❌ |
| **Docker** | ✅ Dockerfile pronto | ❌ |
| **Cloudflare Worker** | ✅ Serverless edge | ❌ |
| **Versionamento público** | ✅ `@2.8.10` (npm semântico) | ❌ (git SHA) |

### 5.2 🔧 Integração Claude Code nativa

| | Oficial MCP | EVO-API |
|---|---|---|
| **Instalação 1 comando** | ✅ `npx dataforseo-mcp-server` | ❌ (precisa compilar Rust) |
| **Configuração .mcp.json** | ✅ Automática | ⚠️ Manual |
| **Plug-and-play** | ✅ | ❌ |

### 5.3 🔧 Field filtering (resposta enxuta)

| | Oficial MCP | EVO-API |
|---|---|---|
| **field-config.json** | ✅ Reduz resposta ~75% (dot-notation) | ❌ |
| **Simple filter mode** | ✅ Para LLMs que não lidam com nested JSON | ❌ |
| **Full vs filtered toggle** | ✅ `DATAFORSEO_FULL_RESPONSE` env var | ❌ |

### 5.4 🔧 Comunidade e suporte

| | Oficial MCP | EVO-API |
|---|---|---|
| **Mantenedor** | DataForSEO Inc. (time pago) | 1 founder solo |
| **Atualização de API** | Automática (time interno) | Manual (atualizar translators) |
| **Suporte** | Canal oficial DataForSEO | — |
| **Comunidade** | 200+ commits, contribuidores | 73 caps, 48 translators, zero bugs reportados |

---

## 6. TABELA COMPARATIVA FINAL

| Critério | Oficial MCP | EVO-API Provider.Core | Vencedor |
|---|---|---|---|
| **Cobertura de API** | 10 módulos | 12 módulos · 73 caps · 48 translators | 🏆 EVO-API |
| **Tipagem** | Zod (runtime) | Rust (compile-time) | 🏆 EVO-API |
| **Sandbox ($0)** | ❌ | ✅ | 🏆 EVO-API |
| **Controle de custo** | ❌ | ✅ spend_cap + billing + tenant | 🏆 EVO-API |
| **Audit trail** | ❌ | ✅ WORM + hash-chain + evidence | 🏆 EVO-API |
| **Multi-tenant** | ❌ | ✅ Isolamento + RLS + policy | 🏆 EVO-API |
| **Knowledge Graph** | ❌ | ✅ k0 com navegação semântica | 🏆 EVO-API |
| **Vault (cofre)** | ❌ | ✅ Write-ahead R2+Postgres | 🏆 EVO-API |
| **Multi-canal** | MCP apenas | MCP + REST + Brain + k0 + Web | 🏆 EVO-API |
| **Distribuição** | ✅ npm/Docker/CF | ❌ | 🏆 Oficial |
| **Instalação** | ✅ 1 comando | ❌ Compilação Rust | 🏆 Oficial |
| **Field filtering** | ✅ field-config.json | ❌ | 🏆 Oficial |
| **Manutenção** | Time DataForSEO | 1 founder | 🏆 Oficial |
| **Custo operacional** | $0 (só crédito DataForSEO) | $0 (infra própria) | 🤝 Empate |

---

## 7. ESTRATÉGIA — O QUE FAZER COM ISSO

### 7.1 O que NÃO fazer

- ❌ **Competir com o MCP oficial** — não faz sentido. É mantido pelo time da DataForSEO, atualizado automaticamente, tem suporte oficial.
- ❌ **Ignorar o MCP oficial** — ele existe, é bom, e é mantido. Dá pra usar como benchmark do que está implementado e do que falta.
- ❌ **Reescrever o provider.core** — 14.718 linhas de Rust que FUNCIONAM. Seria burrice jogar fora.

### 7.2 O que FAZER

**Estratégia: Camada 1 = MCP oficial (commodity) · Camada 2 = EVO-API (diferencial)**

```
┌─────────────────────────────────────────────────────┐
│  CAMADA 2 · EVO-API (MOAT)                          │
│  ┌─────────────────────────────────────────────┐    │
│  │ Diferencial que o MCP oficial NUNCA vai ter: │    │
│  │ • Sandbox ($0) + Live (prod) dual-mode      │    │
│  │ • Spend-cap por tenant + centro de custos    │    │
│  │ • Audit trail WORM (compliance enterprise)   │    │
│  │ • Knowledge Graph (navegação semântica)      │    │
│  │ • Brain (intent → capabilities → relatório)  │    │
│  │ • Vault (ouro durável, índice descartável)   │    │
│  └─────────────────────────────────────────────┘    │
│                                                      │
│  CAMADA 1 · DataForSEO MCP Oficial (COMMODITY)      │
│  ┌─────────────────────────────────────────────┐    │
│  │ O que é commodity (pode vir do oficial):     │    │
│  │ • Ser dados da API (SERP, keywords, etc.)    │    │
│  │ • Atualização automática de endpoints        │    │
│  │ • Distribuição (npm/Docker/CF)               │    │
│  │ • Field filtering (respostas enxutas)        │    │
│  └─────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────┘
```

### 7.3 Plano de ação (3 fases)

**Fase 1 — AGORA (semana 1-2):** Usar o MCP oficial como **fonte de dados commodity** para o adsentice, substituindo as chamadas diretas ao provider.core. Manter o provider.core como referência.

**Fase 2 — MÊS 1-2:** Construir o **adapter** no `packages/evoapi-client/` que consome TANTO o MCP oficial quanto o provider.core — mesma interface, dois backends. O oficial pra velocidade de desenvolvimento, o provider.core pra features enterprise (sandbox, audit, cost-control).

**Fase 3 — MÊS 3+:** Quando o adsentice tiver clientes pagantes, o **provider.core vira o backend enterprise** (com sandbox, cost-control, audit trail, vault). O MCP oficial fica como fallback/redundância.

### 7.4 O MOAT real (o que o MCP oficial NUNCA vai copiar)

1. **Sandbox $0** — DataForSEO não tem incentivo pra oferecer sandbox grátis. É contra o modelo de negócio deles (cobram por chamada).
2. **Audit trail WORM** — Eles são provider de dados, não de compliance. Zero incentivo.
3. **Multi-tenant com centro de custos** — Eles vendem 1 chave API por cliente. Isolamento por tenant é sua camada.
4. **Knowledge Graph** — Dado + relações entre decisões de marketing → navegação semântica. Fora do escopo deles.
5. **Brain (intent→caps→relatório)** — O Ricardo (Claude SEO) também não tem isso. É produto, não tooling.

---

## 8. CONCLUSÃO

**O MCP oficial da DataForSEO NÃO é concorrente do EVO-API.** É uma camada de **transporte** (MCP protocol + API wrapper). O EVO-API é uma camada de **inteligência** (sandbox, cost-control, audit, vault, KG, brain).

O que você construiu em 2 anos é **mais completo, mais seguro, e mais profundo** que o MCP oficial. A diferença é que o oficial é **commodity bem empacotada** e o EVO-API é **infraestrutura enterprise com features que o oficial nunca vai ter**.

O caminho certo: **usar o oficial como commodity** (pra ir rápido), **manter o provider.core como moat** (pra ir longe).

---

*Documento gerado em 2026-07-11 · Análise comparativa DataForSEO MCP Server TypeScript oficial vs EVO-API provider.core*
