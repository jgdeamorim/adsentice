# RSXT + EVO-API vs Claude SEO — Análise Comparativa Completa

> 2026-07-11 · Comparação lado a lado dos dois ecossistemas
> Fonte: `github.com/AgricIDaniel/claude-seo` vs `rsxt` + `EVO-API`

---

## 1. VISÃO GERAL — DOIS ECOSSISTEMAS, DOIS MUNDOS

| Dimensão | Claude SEO | RSXT + EVO-API |
|---|---|---|
| **O que é** | Plugin Claude Code para auditoria SEO | Substrato cognitivo soberano + hub de capabilities |
| **Autor** | Agrici Daniel (AI Workflow Architect) | Jeferson Galote de Amorim (solo, 2 anos) |
| **Licença** | MIT | MIT OR Apache-2.0 |
| **Linguagem** | Python (89.6%) + Shell/JS | Rust (100%) + TypeScript (adsentice) |
| **Linhas de código** | ~3.000-5.000 (estimado) | **~30.000+** (14.718 provider + 4.400 s0 + crates + adsentice) |
| **Repositório** | 200 commits | 2 anos de handoffs + ADRs + commits |
| **Paradigma** | Plugin efêmero (roda no chat) | **Plataforma persistente** (servidor, stores, KG, vault) |
| **Público-alvo** | Devs, SEO pros que usam Claude Code | Empresas (B2B SaaS via adsentice) |
| **Modelo** | Open source, self-serve | Plataforma enterprise (vault, tenancy, audit) |

---

## 2. ARQUITETURA COMPARADA

### 2.1 Claude SEO — Arquitetura

```
┌──────────────────────────────────────────────────┐
│  Claude Code (chat efêmero)                       │
│  ┌────────────────────────────────────────────┐   │
│  │  /seo audit (orchestrator)                 │   │
│  │  ├── Industry Detection (5 tipos)           │   │
│  │  ├── Dispatch (14-step conditional)         │   │
│  │  │   ├── seo-technical (paralelo)          │   │
│  │  │   ├── seo-content (paralelo)            │   │
│  │  │   ├── seo-schema (paralelo)             │   │
│  │  │   ├── seo-geo (paralelo)                │   │
│  │  │   ├── seo-local (condicional)           │   │
│  │  │   ├── seo-ecommerce (condicional)       │   │
│  │  │   ├── seo-google (se Google APIs)       │   │
│  │  │   ├── seo-maps (se DataForSEO)          │   │
│  │  │   └── seo-backlinks (se APIs)           │   │
│  │  ├── Synthesize (10-principle framework)    │   │
│  │  └── Action Plan (Critical→High→Med→Low)   │   │
│  └────────────────────────────────────────────┘   │
│                                                    │
│  Extensions (opcionais):                           │
│  ├── DataForSEO MCP (22 comandos, 9 módulos)      │
│  ├── Firecrawl MCP                                  │
│  ├── Ahrefs MCP                                     │
│  ├── Google APIs (4 tiers de credenciais)          │
│  └── SE Ranking, Profound, Bing Webmaster...       │
└──────────────────────────────────────────────────┘
```

### 2.2 RSXT + EVO-API — Arquitetura

```
┌──────────────────────────────────────────────────────┐
│  APLICAÇÕES (consumidores)                            │
│  ┌────────────────────────────────────────────────┐  │
│  │  adsentice (Next.js :3000)                      │  │
│  │  ├── ADMIN dashboard (operador)                 │  │
│  │  ├── CLIENT dashboard (tenant-isolado)          │  │
│  │  └── Vault (R2 blob → Postgres série)           │  │
│  ├────────────────────────────────────────────────┤  │
│  │  EVO-API Superadmin (:7700)                     │  │
│  │  ├── Control-plane (FASE 1.1)                   │  │
│  │  ├── Cockpit (founder gate)                     │  │
│  │  ├── Brain /chat, /brain/ask                    │  │
│  │  └── OpenAPI 3.1 + MCP server                   │  │
│  └────────────────────────────────────────────────┘  │
│                                                       │
│  CAMADA DE INTELIGÊNCIA (EVO-API)                     │
│  ┌────────────────────────────────────────────────┐  │
│  │  Pipeline L0→L6 cognitivo                       │  │
│  │  ├── L0: Structural (AST, parser, regex)        │  │
│  │  ├── L1: Statistical (frequency, BOA accum)     │  │
│  │  ├── L2: Deterministic (spec_validator)         │  │
│  │  ├── L3: Embedding (rsxt-v0, SENSOR ONLY)      │  │
│  │  ├── L4: Graph traversal (rsxt-k0, 3-hop)      │  │
│  │  ├── L5: Consensus (BOA, Council)               │  │
│  │  └── L6: LLM Árbitro (DeepSeek, LAST resort)   │  │
│  │                                                  │  │
│  │  73 Capabilities DataForSEO                      │  │
│  │  ├── 48 Translators tipados (Rust)              │  │
│  │  ├── Dual-mode: Sandbox ($0) + Live (prod)      │  │
│  │  ├── Spend-cap gate por tenant                  │  │
│  │  └── Evidence + BillingEvent 1:1                │  │
│  └────────────────────────────────────────────────┘  │
│                                                       │
│  SUBSTRATO (RSXT · 10 crates)                         │
│  ┌────────────────────────────────────────────────┐  │
│  │  rsxt-s0: Filesystem WORM (0.28µs p50)         │  │
│  │  rsxt-t0: Time-series (OHLCV, métricas)         │  │
│  │  rsxt-v0: Vetores (HNSW+BM25, SENSOR ONLY)     │  │
│  │  rsxt-k0: Knowledge Graph (24 arestas, 6 kinds) │  │
│  │  rsxt-e0/e1: Embedders (MiniLM, mpnet)          │  │
│  │  rsxt-f0: Finance (BOA score, audit)            │  │
│  │  rsxt-design: Design engine (DCT soberano)      │  │
│  │  rsxt-g0: Charts/Sparklines (DCT)               │  │
│  │  rsxt-validator: Validation framework           │  │
│  │  rsxt-fnd: Finding sensor (taxonomy engine)     │  │
│  └────────────────────────────────────────────────┘  │
│                                                       │
│  DEPLOY: Alpine Linux · ext4 NVMe · read-only rootfs │
└──────────────────────────────────────────────────────┘
```

---

## 3. COMPARAÇÃO POR DIMENSÃO

### 3.1 Auditoria e Análise

| Critério | Claude SEO | RSXT + EVO-API |
|---|---|---|
| **Tipos de auditoria** | 7 (full-site, single-page, technical, content, schema, performance, visual) | 8 eixos Stage 3 (Dor, Persona, Campanhas, Reputação, Concorrência, Budget, Fit temporal, Saúde técnica) |
| **Paralelismo** | ✅ 15 agentes simultâneos | ✅ CapabilityExecutor paralelo (cada cap = 1 chamada) |
| **Industry detection** | ✅ 5 tipos (SaaS, local, e-commerce, publisher, agency) | ✅ 4 nichos 100% cobertos (clínicas, e-commerce, serviços, restaurantes) |
| **Score** | SEO Health Score (0-100, 7 dimensões ponderadas) | **Lead Score (fixability × potential × value-fit)** — decomposto, auditável |
| **Recomendações** | Critical/High/Medium/Low + falsifiability + leading indicator | Stage 4→5 qualificação + proposta automática |
| **Vencedor** | 🤝 **Empate** — Claude SEO é mais maduro em auditoria técnica; EVO-API é mais profundo em scoring de negócio |

### 3.2 Dados e Providers

| Critério | Claude SEO | RSXT + EVO-API |
|---|---|---|
| **Provider principal** | DataForSEO (via MCP oficial) | DataForSEO (via provider.core próprio) |
| **Cobertura DataForSEO** | 9 módulos, 22 comandos | **12 módulos, 73 caps, 48 translators** |
| **Outros providers** | 7 via MCP (Ahrefs, SE Ranking, Firecrawl, etc.) | Google Ads (OAuth e2e), Meta (pendente) |
| **Google APIs** | 4 tiers de credencial (PageSpeed, CrUX, GSC, GA4, Indexing, Keyword Planner) | Google Ads (OAuth completo, reporting/GAQL mapeado) |
| **Tipagem dos dados** | Zod (runtime) | **Rust (compile-time)** — 11 shapes tipados |
| **Sandbox ($0)** | ❌ | ✅ `DataForSeoSandboxProber` |
| **Field filtering** | ✅ field-config.json (reduz ~75%) | ❌ |
| **Vencedor** | 🏆 **EVO-API** — 3.3× mais caps, dual-mode sandbox/live, compile-time safety |

### 3.3 Controle de Custo e Billing

| Critério | Claude SEO | RSXT + EVO-API |
|---|---|---|
| **Spend-cap** | ❌ | ✅ Gate ANTES da chamada (`can_afford`) |
| **Custo real vs estimado** | ❌ | ✅ Extrai `response.cost` da API |
| **Billing por tenant** | ❌ | ✅ Centro de custos + BillingEvent 1:1 |
| **Sandbox default** | ❌ | ✅ Diagnóstico abre em $0 (real-shape) |
| **Kill-switch** | ❌ | ✅ Policy por tenant (spend-cap + soluções) |
| **O usuário vê o custo** | ❌ (não documentado) | ✅ Custo visível no diagnóstico |
| **Vencedor** | 🏆 **EVO-API** — controle enterprise completo que o Claude SEO não tem |

### 3.4 Audit Trail e Compliance

| Critério | Claude SEO | RSXT + EVO-API |
|---|---|---|
| **Audit trail** | ❌ (efêmero, morre com o chat) | ✅ `rsxt-s0` WORM + hash-chain blake3 |
| **Evidence store** | ❌ | ✅ `evo-evidence-store` |
| **Provenance** | ❌ | ✅ tenant→capability→endpoint→custo→hash |
| **Vault write-ahead** | ❌ | ✅ R2 blob + Postgres série (6/6 testes) |
| **Drift monitoring** | ✅ SQLite snapshots entre auditorias | ✅ `rsxt-t0` séries + watchdog + variance report |
| **Falsifiability** | ✅ "How would we know this failed?" por recomendação | ✅ `medido=verdade` — toda afirmação cita fonte |
| **Vencedor** | 🏆 **EVO-API** — audit trail imutável é enterprise-grade. Claude SEO tem falsifiability check (bom) mas sem persistência |

### 3.5 Knowledge Graph e Memória

| Critério | Claude SEO | RSXT + EVO-API |
|---|---|---|
| **Knowledge Graph** | ❌ | ✅ `rsxt-k0` — 24 arestas, 6 edge-kinds |
| **Memória entre sessões** | ❌ (chat efêmero) | ✅ OODA Redis + k0 + corpus-A (11k vetores) |
| **Pattern accumulation** | ❌ | ✅ Curva de maturação 0→500 patterns (95% autonomia) |
| **Aprendizado** | ❌ (cada auditoria começa do zero) | ✅ Brain cache soberano (Q→A, invalidação por watermark) |
| **Navegação semântica** | ❌ | ✅ intent→capability→provider via k0 |
| **Vencedor** | 🏆 **EVO-API** — Claude SEO não tem memória nem KG. É stateless |

### 3.6 Superfícies e Entrega

| Critério | Claude SEO | RSXT + EVO-API |
|---|---|---|
| **Interface principal** | Chat do Claude Code (texto) | **Dashboard web** (:3000 admin, :3000 client) + Cockpit (:7700) |
| **Relatório** | Action plan em markdown no chat | **Dashboard vivo** (morph WS, atualização live) + PDF report |
| **Multi-tenant** | ❌ (1 usuário = 1 chat) | ✅ Tenant-isolado (RLS, base+overlay) |
| **Canais** | 1 (chat via `/seo`) | **5 canais**: MCP, REST/OpenAPI 3.1, Brain (chat), k0 (graph), Web |
| **Design system** | ❌ | ✅ Coral design system (48 tokens, DCT soberano) |
| **White-label** | ❌ | ✅ Surface warp por tenant (tokens customizáveis) |
| **Vencedor** | 🏆 **EVO-API** — superfícies enterprise multi-tenant vs chat efêmero |

### 3.7 Metodologia e Doutrina

| Critério | Claude SEO | RSXT + EVO-API |
|---|---|---|
| **Framework** | 10 princípios (PERCEIVE→ANALYZE→VALIDATE→ACT) | Pipeline L0→L6 + OODA 12-task + BOA formula canônica |
| **Falsifiability** | ✅ "How would we know this failed?" + leading indicator | ✅ `medido=verdade` — sem fonte = não verificado |
| **Gates de qualidade** | ✅ FAQPage deprecated, HowTo deprecated, CWV usa INP | ✅ Founder gate, BOA score ≥0.50, spend-cap, compile-time |
| **Anti-alucinação** | ⚠️ Depende do LLM (Claude) | ✅ LLM = árbitro NUNCA extrator (L0-L5 primeiro) |
| **Custo decrescente** | ❌ (cada auditoria custa o mesmo) | ✅ Curva de maturação: $ cai 50-100× com patterns |
| **Vencedor** | 🏆 **EVO-API** — doutrina mais profunda, custo decrescente, anti-alucinação estrutural |

### 3.8 Stack e Infraestrutura

| Critério | Claude SEO | RSXT + EVO-API |
|---|---|---|
| **Linguagem core** | Python (89.6%) | **Rust** (100% no substrato) |
| **Performance storage** | SQLite (snapshots) | **rsxt-s0**: 0.28µs p50 frio, 178× margem |
| **Dependências** | Playwright, Claude Code, MCP servers externos | **Zero dependência externa** no hot path |
| **Instalação** | ✅ `claude plugins install claude-seo` | ❌ Compilação Rust + Alpine |
| **Portabilidade** | Onde tem Claude Code | **Binário único** (Linux x86-64, ARM, RISC-V futuro) |
| **Container** | ❌ (roda no host) | ❌ (zero container por design) |
| **Vencedor** | 🤝 **Empate** — Claude SEO é mais fácil de instalar; EVO-API é mais performante e portável |

---

## 4. O QUE O CLAUDE SEO FAZ MELHOR

### 4.1 Plug-and-play imediato

```
claude plugins install claude-seo
/seo audit https://example.com
```

**Zero setup.** Em 2 minutos você tem uma auditoria SEO completa. O EVO-API precisa de compilação, credenciais, serviços (Redis, Qdrant, embed).

### 4.2 Cobertura de extensões

7 extensões MCP opcionais (Ahrefs, SE Ranking, Firecrawl, Profound, Bing Webmaster, Banana, DataForSEO). O EVO-API só tem DataForSEO + Google Ads. **O Claude SEO é mais flexível** em escolher providers.

### 4.3 Industry detection automática

5 tipos de negócio detectados por sinais do site (SaaS, local, e-commerce, publisher, agency). O EVO-API tem 4 nichos, mas são hardcoded no `niche-solutions.json`.

### 4.4 Maturidade de SEO técnico

- 9 categorias de auditoria técnica
- Core Web Vitals (LCP/INP/CLS) com decomposição LCP
- Speculation Rules detection
- IndexNow support
- FAQPage/HowTo deprecated — alerta atualizado
- 30+ location pages warning

**O EVO-API é mais forte em inteligência de negócio, não em SEO técnico puro.**

### 4.5 Comunidade

200 commits, contribuidores, instalador, documentação pública. O EVO-API é um projeto solo fechado.

---

## 5. O QUE O RSXT + EVO-API FAZ MELHOR

### 5.1 Persistência e memória

O Claude SEO é **stateless**. Cada auditoria começa do zero. O EVO-API acumula conhecimento no vault, KG, cache do brain, séries temporais. **A 100ª auditoria é melhor que a 1ª.**

### 5.2 Controle de custo

O Claude SEO não tem spend-cap. Se o LLM decidir fazer 50 chamadas DataForSEO, ele faz. O EVO-API tem gate triplo (sandbox default → spend-cap → kill-switch por tenant).

### 5.3 Multi-tenant

O Claude SEO é single-user (1 chat = 1 pessoa). O EVO-API isola tenants com RLS, centro de custos, policy. **Feito pra vender pra múltiplos clientes.**

### 5.4 Audit trail enterprise

Auditoria de SEO precisa de rastreabilidade? Sim — quando o cliente pergunta "por que você recomendou mudar o título da página X?". O Claude SEO depende do chat history. O EVO-API tem WORM imutável + evidence.

### 5.5 Sandbox → Live conversion

O Claude SEO não tem sandbox. Toda chamada gasta crédito real. O EVO-API mostra diagnóstico em sandbox ($0), o cliente vê o valor, paga → live.

### 5.6 Superfícies de produto

O Claude SEO entrega texto no chat. O EVO-API entrega dashboard web, variance report, diagnóstico friendly, white-label por cliente. **É produto, não ferramenta.**

---

## 6. TABELA RESUMO

| Dimensão | Claude SEO | RSXT + EVO-API | Vencedor |
|---|---|---|---|
| **Instalação** | ✅ 1 comando | ❌ Complexo | 🏆 Claude SEO |
| **Cobertura providers** | ✅ 7 extensões | ⚠️ 2 providers | 🏆 Claude SEO |
| **SEO técnico** | ✅ 9 categorias, CWV, deprecations | ⚠️ Via DataForSEO (on_page.*) | 🏆 Claude SEO |
| **Industry detection** | ✅ 5 tipos automático | ⚠️ 4 nichos hardcoded | 🏆 Claude SEO |
| **Comunidade** | ✅ Open source, 200 commits | ❌ Solo, fechado | 🏆 Claude SEO |
| **Cobertura DataForSEO** | 9 módulos, 22 comandos | **12 módulos, 73 caps, 48 translators** | 🏆 EVO-API |
| **Tipagem** | Zod (runtime) | **Rust (compile-time)** | 🏆 EVO-API |
| **Sandbox ($0)** | ❌ | ✅ | 🏆 EVO-API |
| **Controle de custo** | ❌ | ✅ spend-cap + billing + tenant | 🏆 EVO-API |
| **Audit trail** | ❌ (efêmero) | ✅ WORM + hash-chain | 🏆 EVO-API |
| **Knowledge Graph** | ❌ | ✅ k0 + OODA + cache | 🏆 EVO-API |
| **Memória / Aprendizado** | ❌ (stateless) | ✅ Curva de maturação 0→500 patterns | 🏆 EVO-API |
| **Multi-tenant** | ❌ | ✅ RLS + centro de custos | 🏆 EVO-API |
| **Superfícies** | Chat texto | Dashboard web + 5 canais | 🏆 EVO-API |
| **Design system** | ❌ | ✅ Coral 48 tokens + DCT | 🏆 EVO-API |
| **Doutrina** | 10 princípios | Pipeline L0→L6 + OODA + BOA | 🏆 EVO-API |
| **Performance storage** | SQLite | 0.28µs p50, HNSW+BM25 | 🏆 EVO-API |
| **Custo operacional** | $0 + créditos DataForSEO | $0 + créditos DataForSEO | 🤝 Empate |

**Placar: Claude SEO 6 × 11 EVO-API**

---

## 7. INTERPRETAÇÃO — O QUE O PLACAR REALMENTE SIGNIFICA

O placar **não significa que um é melhor que o outro**. Significa que são **produtos diferentes para públicos diferentes**:

| | Claude SEO | RSXT + EVO-API |
|---|---|---|
| **Público** | SEO profissional que usa Claude Code | Dono de empresa que quer mais clientes |
| **Job a ser feito** | "Me dê uma auditoria SEO completa agora" | "Monitore meu mercado e me diga o que fazer" |
| **Frequência** | Sob demanda (auditoria pontual) | Contínuo (sentinela recorrente) |
| **Receita** | $0 (open source) | R$197-800/mês por cliente |
| **Diferencial** | Rapidez, cobertura, facilidade | Profundidade, memória, compliance, multi-tenant |

**O Claude SEO é uma ferramenta excelente para SEO professionals.** É rápido, fácil, completo.

**O EVO-API é uma plataforma enterprise para vender inteligência de mercado como serviço.** É profundo, persistente, auditável, multi-tenant.

---

## 8. ESTRATÉGIA — O QUE O ADSENTICE PODE APRENDER

### 8.1 O que COPIAR do Claude SEO

| Feature | Como aplicar no adsentice |
|---|---|
| **Industry detection automática** | 5 sinais do site → classificar lead automaticamente (Stage 0) |
| **Field filtering nas respostas** | Reduzir JSON da DataForSEO antes de armazenar no vault |
| **Health Score visual** | Score 0-100 no CLIENT dashboard (hoje só lead-score) |
| **Falsifiability checks** | Cada recomendação do variance report: "como saber se falhou?" |
| **Extensões modulares** | Arquitetura de plugins para novos providers (Meta, TikTok, CRM) |
| **Instalação 1 comando** | `npx create-adsentice` ou deploy em 1 clique na Vercel |

### 8.2 O que NÃO copiar (porque o EVO-API já é melhor)

- **Stateless** → manter vault + KG + cache
- **Single-user** → manter multi-tenant com RLS
- **Sem controle de custo** → manter spend-cap gate
- **Efêmero** → manter audit trail WORM

### 8.3 O MOAT do adsentice (defendível contra ambos)

```
┌──────────────────────────────────────────────────┐
│  O que NEM Claude SEO NEM MCP oficial têm:        │
│                                                    │
│  1. SENTINELA RECORRENTE                           │
│     Não é auditoria pontual — é monitoramento      │
│     contínuo do mercado do cliente                 │
│                                                    │
│  2. VARIANCE REPORT                                │
│     Mercado (DataForSEO) × Conta (google.ads)     │
│     = insight que ninguém mais entrega             │
│                                                    │
│  3. LEAD SCORE EXPLICÁVEL                          │
│     Não é "SEO score" genérico — é "quanto $        │
│     você está perdendo e como capturar"            │
│                                                    │
│  4. COFRE DURÁVEL                                  │
│     O histórico de mercado do cliente não some     │
│     quando o chat fecha                            │
│                                                    │
│  5. ZERO COMPLEXIDADE PRO CLIENTE                  │
│     O cliente não sabe o que é DataForSEO,         │
│     Claude Code, ou MCP. Ele só vê o dashboard.    │
└──────────────────────────────────────────────────┘
```

---

## 9. CONCLUSÃO

**O Claude SEO é o melhor plugin de SEO para Claude Code.** Se você é um SEO professional que usa Claude Code, instale ele. É rápido, gratuito, e faz 80% do que você precisa.

**O RSXT + EVO-API é uma plataforma de categoria diferente.** Não é ferramenta de auditoria — é infraestrutura enterprise pra vender inteligência de mercado como serviço recorrente. O Claude SEO compete com Screaming Frog e Ahrefs. O adsentice compete com agências de marketing.

**São produtos complementares, não concorrentes.** Inevitavelmente, o adsentice poderia consumir o MCP oficial da DataForSEO (que o Claude SEO também usa) como camada de commodity — e focar seus 14.718 linhas de Rust no que realmente importa: sandbox, cost-control, vault, KG, brain, e superfícies multi-tenant.

---

*Documento gerado em 2026-07-11 · Análise comparativa Claude SEO vs RSXT + EVO-API*
