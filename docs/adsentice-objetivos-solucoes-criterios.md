# adsentice — Objetivos, Soluções e Critérios

> Compilado em 2026-07-11 · Fonte: EVO-API + repositório adsentice
> Status do EVO-API: congelado (commit `23edcdd`) · adsentice é standalone

---

## 1. O QUE É ADSENTICE

**Nome:** AD + Sentice = "a sentinela inteligente do seu mercado"

> Captação de leads locais por região via **Google Meu Negócio** → enriquece → **score** (7 dimensões) → **proposta** automática (grátis tips+mockup → planos pagos).

**Posicionamento:** NÃO é "mais uma plataforma de ferramentas" — é um **HUB INTELIGENTE** com ferramentas avançadas. Você diz o INTENT → o hub DECIDE + orquestra + PREVÊ + produz + prova ROI.

**DNA-ref:** Jasper (qualidade de produto/governança) · **além de Jasper** (dado medido + ROI + previsão)

**Cores:** coral-warm `#f9603f`, light-first, dark stone `#1c1917`, Plus Jakarta Sans + Inter

---

## 2. OBJETIVOS (MISSÃO E MÉTRICAS)

### 2.1 Missão (ADR-0069)

Ser o **hub inteligente de marketing** que:
1. **Semantic Resolution** — intent→capability (a UX)
2. **Capability Registry** — as ferramentas avançadas
3. **Dimensões de dado** — mercado real (DataForSEO)
4. **Evidence** — a prova de ROI

### 2.2 Métricas-alvo

| Métrica | Valor |
|---|---|
| **Ticket alvo** | R$800/mês (sentinela recorrente) |
| **Região inicial** | São Paulo (capital) |
| **1º segmento (semente)** | Clínicas estéticas |
| **Custo descoberta lead** | ~$2 para achar 3-5 leads quentes |
| **Custo diagnóstico** | ~$0.10 por negócio (tier 3) |
| **MRR alvo** | Cliente fica pela prova de ROI (variância mercado×conta) |

### 2.3 ICP (Perfil de Cliente Ideal)

**É lead:** PME B2B local, nicho valioso, presença digital EXISTENTE mas SUBAPROVEITADA (tem site+GMB mas lento/pouca kw/poucas reviews), mercado competitivo, com budget.

**NÃO é lead:** negócio novo (sem dado) · site morto (sem budget) · gigante (já tem agência) · nicho sem volume de busca.

---

## 3. ARQUITETURA DO PRODUTO

### 3.1 Stack (managed-first)

```
adsentice/
├── apps/web/         Next.js 15 + MUI (Materio) — dashboard cliente + admin
│                     Supabase Auth, roles admin/client, RLS por tenant
├── apps/api/         backend TS (Railway) — a LÓGICA · a construir
├── packages/
│   ├── vault/        ✅ COFRE DURÁVEL — write-ahead (R2 blob → Postgres série)
│   ├── core/         a construir — Lead, ScoreDimension, Solution
│   ├── evoapi-client/ a construir — consome EVO-API (REST/MCP)
│   └── db/           a construir — schemas Supabase
└── EVO-API (referência congelada) — 73 capabilities DataForSEO
```

### 3.2 Duas faces do dashboard (ADR-0187)

```
③ ADMIN dashboard (operador adsentice)
   • LEADS scoreados + pipeline (Stage 0→7)
   • rodar DIAGNÓSTICO de 1 negócio (custo visível · gated)
   • descobrir leads (business.listings.search)
   • gerenciar CLIENTES (tenants) · ver MRR/ticket

④ CLIENT dashboard (cliente pagante)
   • score-no-tempo · reviews/reputação
   • concorrentes · alertas
   • SÓ o dado DELE (tenant-isolado)
   • Variance Report (mercado × telemetria)
```

### 3.3 Os 2 planos de inteligência (ADR-0122)

```
① PROVIDER NETWORK (DataForSEO) = MERCADO (público · OUTSIDE-IN) → PROSPECÇÃO (v1)
② CONNECTION HUB (google.ads/meta/CRM) = CLIENTE (real · INSIDE-OUT) → ATENDIMENTO (v2 · OAuth)
```

**A VARIÂNCIA entre os dois = o moat.** Jasper gera, Epiminds roda — **ninguém cruza mercado × conta.**

---

## 4. CATÁLOGO DE SOLUÇÕES

### 4.1 As 5 soluções-core (ADR-0205 · corpus "soluções para clientes")

| Solução | Bundle de capabilities | Pra quem |
|---|---|---|
| **Diagnóstico SEO Local** | `business.profile.gmb` + `business.reviews.google` + `business.qa` + `keyword.research` local + `on_page.audit` | Clínicas, restaurantes, serviços locais |
| **Análise de Concorrência** | `domain.competitors` + `domain.ranked_keywords` + `domain.keyword_gap` | E-commerce, imobiliárias, academias |
| **Reputação Online** | `business.reviews.google` + `business.reviews.tripadvisor` + `business.reviews.trustpilot` + `business.qa` | Restaurantes, hotéis, clínicas |
| **GEO · Marca na IA** | `serp.ai_mode` + `ai.llm.responses` | Qualquer negócio local |
| **Auditoria de Site** | `on_page.instant_audit` + `on_page.lighthouse` + `on_page.crawl_summary` + `backlinks.summary` | WordPress antigo, e-commerce |

### 4.2 Cruzamento Jasper × Epiminds (demanda dupla-validada)

| Disciplina | Jasper (CRIAR) | Epiminds (RODAR) | EVO-API (superior) |
|---|---|---|---|
| **Ad copy ROI** | gera copy | bidding/budget | `ads.traffic_forecast` + `keyword.research` |
| **Competitive intel** | campaign-brief | nomeia mas não entrega | `domain_analytics` — **moat puro** |
| **Reporting** | — | disciplina #1 | `ads.reporting` + triangulação mercado |
| **SEO/AEO/GEO** | conteúdo SEO | — | `keyword.research` + `serp` + `ai_optimization` |
| **Campaign execution** | brief→content | execução agêntica | cross-data RAG + Jasper executa |
| **Content synthesis** | trends→assets | — | mode:evolution + hype radar |
| **Field/localized** | localized content | — | região×idioma + trends regionais |
| **Brand voice** | Jasper IQ | — | cross-validar com dado medido |

### 4.3 Nichos com cobertura (medido 2026-07-01)

| Nicho | Cobertura | Caps ready |
|---|---|---|
| **Clínicas / saúde local** | 100% (6/6) | keyword.research, serp.organic, domain.competitors, business.profile.gmb, business.reviews.google, ads.traffic_forecast |
| **E-commerce local** | 100% (7/7) | + domain.keyword_gap, domain.ranked_keywords, domain.technologies |
| **Serviços** | 100% (5/5) | + domain.overview, business.reviews.google |
| **Restaurantes** | 71% (5/7) | Falta: business.listings.search, business.reviews.tripadvisor |

### 4.4 Inventário de capabilities (25 ready · 19 live-provadas)

**READY (25):** keyword.research, keyword.related, keyword.volume, keyword.trends, serp.organic, domain.overview, domain.competitors, domain.keyword_gap, domain.ranked_keywords, domain.technologies, domain.whois, ads.traffic_forecast, on_page.instant_audit, on_page.crawl_summary, on_page.lighthouse, on_page.links, on_page.pages, on_page.non_indexable, on_page.resources, backlinks.summary, content.sentiment_summary, ai.llm.mentions, ai.llm.responses, business.profile.gmb, business.reviews.google

**PENDING (11):** business.reviews.trustpilot, business.reviews.tripadvisor, business.listings.search, backlinks.anchors, backlinks.detail, backlinks.history, backlinks.referring_domains, app.reviews, app.store.detail, business.qa, databases.keyword.volume_history

---

## 5. CRITÉRIOS DE LEAD

### 5.1 A LEI-mãe

> Um lead que vale gastar $ de descoberta = **DOR presente E detectável × SOLUÇÃO que entregamos × VALOR que justifica o ticket × busca CONTROLADA**. Sem os 4 = gasto cego.

### 5.2 Matriz DOR → SOLUÇÃO → SINAL → CATEGORIA

| Dor do cliente | Solução adsentice | Sinal detectável (cap) | Categoria onde a dor é AGUDA |
|---|---|---|---|
| "não apareço no Google local" | SEO local | `serp.organic` + `keyword.research` | dentista · advogado · clínica estética |
| "concorrente sempre na frente" | competitive intelligence | `domain.competitors` + `domain.keyword_gap` | e-commerce · imobiliária · academia |
| "poucas/más avaliações" | gestão de reputação | `business.reviews.google` + `business.profile.gmb` | restaurante · clínica · hotel · estética |
| "site velho/lento me custa" | otimização técnica | `on_page.lighthouse` + `domain.technologies` | WordPress antigo (qualquer nicho) |
| "anúncio sem retorno" | ad optimization (ROI) | `ads.traffic_forecast` + `serp.ads_advertisers` | quem já anuncia: e-commerce · ticket-alto |

### 5.3 Controle de custo — TIERS de descoberta

```
TIER 0 ($0) ..... DECIDIR o segmento-alvo (categoria × cidade)
TIER 1 (~$0.01) . business.listings.search do segmento → lista de candidatos
TIER 2 ($0-baixo) pré-filtro: tem site? tem GMB? → descarta ~70% sem-presença
TIER 3 (~$0.10) .. SÓ nos qualificados → diagnóstico completo → lead-score

Resultado: 1 segmento · 50 candidatos → 15 passam → ~$2 para achar 3-5 leads quentes
```

### 5.4 Lead-score EXPLICÁVEL

```
LEAD SCORE = fixability × potential × value-fit

FIXABILITY = saúde técnica · reputação (poucas reviews) · gaps de SEO
POTENTIAL  = volume/demanda · fit temporal (subindo) · budget (anuncia)
VALUE-FIT  = valor-do-nicho × competitividade

Exemplo: 87 = site lento + só 12 reviews (fixability alta)
              × "harmonização facial" 12.1k subindo (potential alto)
              × nicho R$800 competitivo (value-fit bom)
```

---

## 6. FLOW DE LEADS (Stage 0 → 7)

```
STAGE 0 · SELEÇÃO DE SEGMENTO        $0
  market-analysis DESCOBRE sub-nichos + volume (DINÂMICO · não hardcoded)
  gate: founder confirma o alvo (ticket ~R$800 · SP · semente clínicas estéticas)

STAGE 1 · DESCOBERTA DE CANDIDATOS   ~1¢
  business.listings.search(categoria, location=SP)
  ⚠ GAP: location_code SP (hoje BR2076)

STAGE 2 · PRÉ-FILTRO                 $0
  tem site? tem GMB? → descarta ANTI-ICP (~70%)

STAGE 3 · ANÁLISE DO CLIENTE ★       ~10¢
  8 eixos: Dor · Persona · Campanhas · Reputação ·
           Concorrência · Budget · Fit temporal · Saúde técnica
  → produz o DOSSIÊ = JÁ é o /report que converte

STAGE 4 · LEAD-SCORE (explicável)    $0
  fixability × potential × value-fit · cada fator rastreia aos eixos

STAGE 5 · QUALIFICAÇÃO               $0
  value-fit ≥ mínimo → LEAD QUENTE → entra no CRM

STAGE 6 · VENDAS (CRM)
  contato → diagnóstico → proposta → GANHO

STAGE 7 · SERVING (v2 · pós-ganho)
  google.ads telemetria → prova de ROI → VARIÂNCIA → MRR/retenção
```

### Os 8 eixos do Stage 3 (Análise do Cliente)

| Eixo | Pergunta | Sinal (cap) | Estado |
|---|---|---|---|
| **Dor** | qual das 5 dores é presente+detectável? | serp.organic · reviews · lighthouse · ads | mista |
| **Persona** | quem ele atende? que linguagem? | keyword.research · conteúdo · reviews | READY |
| **Campanhas** | anuncia? onde? = budget + urgência | serp.ads_advertisers (v1) · google.ads (v2·OAuth) | v1 sinal · v2 GATED |
| **Reputação** | nota · volume · sentimento | business.reviews.google · profile.gmb | shape |
| **Concorrência** | quem cresce vs ele + gaps | domain.competitors · domain.keyword_gap | GAP · **MOAT puro** |
| **Budget** | tem verba E consciência? | ads ativos + sinais de investimento SEO | derivado |
| **Fit temporal** | demanda sobe/desce/sazonal? | keyword trend | READY |
| **Saúde técnica** | site lento? tec velha? | on_page.lighthouse · domain.technologies | shape |

---

## 7. VARIANCE REPORT — O artefato que prova ROI

### 7.1 Princípio

```
MERCADO (DataForSEO · OUTSIDE-IN · TEMOS)  = a ESTIMATIVA
TELEMETRIA (google.ads · INSIDE-OUT · OAuth) = a VERDADE do cliente
─────────────────────────────────────────────────────────
A VARIÂNCIA entre os dois = O INSIGHT ACIONÁVEL
```

### 7.2 Degradação elegante

```
SEM OAuth (prospecção) ... só lado MERCADO → diagnóstico grátis (wedge)
COM OAuth (cliente) ...... mercado × telemetria → serviço PROFISSIONAL (MRR)
```

### 7.3 Matriz de decisões → variância

| Decisão | Mercado (DataForSEO) | Telemetria (google.ads) | Variância revela |
|---|---|---|---|
| **Qual cauda converte?** | keyword.research (volumes) | search terms report | keywords com demanda que cliente NÃO captura |
| **Quanto perco pro concorrente?** | domain.competitors + serp.ads | impression_share / auction insights | o buraco competitivo real |
| **Que keyword bidar?** | keyword.research (volume×difficulty×intent) | keyword view (performance) | onde investir mais |
| **Onde otimizar (geo/device)?** | volumes por região | segments geo/device/hora | geo/device sub-aproveitado |
| **ROI real?** | (sem proxy direto) | conversions + ROAS | prova de retenção (MRR) |
| **Anúncio vs orgânico?** | serp.organic (posição) | ads performance | onde parar de pagar |

---

## 8. TAXONOMIA DE CATEGORIAS (dinâmica · não hardcoded)

```
TIER A (maior ROI): dentista · advogado · clínica estética · contador
TIER B: restaurante · academia · salão · imobiliária

SEMENTE (não lista fixa): clínicas estéticas SP
  → keyword.research/serp → sub-nichos REAIS + volumes:
     botox · preenchimento · harmonização facial · limpeza de pele · …
  → sistema RANQUEIA por (volume × competição × dor)
  → DINÂMICO · re-roda quando o mercado muda
```

**Prova medida (2026-07-01 · $0.024):** keyword.research "clínica estética são paulo" — 100 keywords, cost $0.024. Topo: design de sobrancelha 12.100, harmonização facial 5.400, "perto de mim" 2.900.

---

## 9. CAMADA DE INTELIGÊNCIA (Brain → Soluções)

### 9.1 O fluxo brain→solução→execução (ADR-0205)

```
cliente: "analisa o SEO GEO da minha empresa no Maps"
        │
        ▼  brain: intent → SOLUÇÃO (corpus D1) → bundle de capability_ids
        │
        ▼  EXECUTA cada capability via CapabilityExecutor
        │  (sandbox $0 diagnóstico OU live gated · tenant · spend-cap)
        │
        ▼  DeepSeek sintetiza RELATÓRIO (aterrado nos dados REAIS)
        │
        ▼  funil: diagnóstico → CTA → receita
```

### 9.2 Os 3 gates de segurança

1. **Sandbox default** — diagnóstico abre em $0 (real-shape, valores fake)
2. **Live gated** — CTA/tenant paga, com spend-cap do tenant
3. **Fail-closed** — sem creds/saldo → não gasta

### 9.3 Centro de custos por tenant

- POLICY do tenant governa o spend (spend-cap · quais soluções · sandbox vs live)
- BillingEvent 1:1 (custo→margem→ROI por tenant)
- adsentice é o 1º tenant

---

## 10. COFRE DURÁVEL (Vault)

### 10.1 A lei nº1 (o que resolveu o medo do founder)

> **Sistema de Registro (durável, chato, com backup) ≠ Índice Derivado (rsxt/vec, descartável, rebuildável).**

```
vault.put(raw) →
  ① BLOB → R2 (dedup por blake3, imutável)
  ② SÉRIE → Postgres (append-only, hold-trading)
  ③ ÍNDICE → NUNCA é tocado pelo vault. Chamador indexa depois.
```

**Se o índice explodir, reconstrói do zero. Zero dado perdido.** 6/6 testes passando.

### 10.2 O que o vault NÃO é

- NÃO executa captação
- NÃO roda IA
- NÃO guarda vetor
- SÓ guarda o OURO (dados DataForSEO já pagos)

---

## 11. ESTADO ATUAL (HONesto)

### 11.1 O que existe

| Componente | Status |
|---|---|
| Dashboard Next.js (Materio + Supabase Auth) | ✅ Rodando em :3000 |
| Login (email/senha + Google OAuth) | ✅ Wired |
| Roles admin/client com middleware | ✅ |
| Vault (cofre write-ahead R2+Postgres) | ✅ 6/6 testes |
| Translator GMB rico (39 campos) | ✅ |
| CapabilityExecutor (sandbox $0) | ✅ |
| Landing page HTML (8 seções, "muito bom") | ✅ |
| Brand kit (coral #f9603f, tokens, logo) | ✅ |
| Docs de arquitetura (6 docs) | ✅ |
| 25 caps DataForSEO live-provadas | ✅ |
| 4 nichos com cobertura 100% (medido) | ✅ |

### 11.2 O que falta (gaps honestos)

| Gap | Prioridade | Bloqueador |
|---|---|---|
| `apps/api/` — backend com a LÓGICA | 🔴 Crítico | Sem API, sem produto |
| `packages/core/` — Lead, ScoreDimension, Solution | 🔴 Crítico | Sem domínio, sem score real |
| `packages/db/` — schemas Supabase + migrations | 🔴 Crítico | Sem DB, sem persistência |
| Scoring engine (7 dimensões) wire no backend | 🔴 Crítico | O coração do produto |
| `packages/evoapi-client/` — consumir EVO-API | 🟡 Alto | Desbloqueia dados reais |
| location_code SP no `business.listings.search` | 🟡 Alto | Stage 1 bloqueado sem isso |
| Translator REPORTING/GAQL (google.ads) | 🟡 Alto | Destrava v2 (serving/MRR) |
| CLIENT dashboard (tenant-isolado) | 🟢 Médio | Depende de cliente pagante |
| Proposta automática (grátis → planos pagos) | 🟢 Médio | Depende do scoring engine |
| Stripe/pagamento | 🟢 Médio | Depende de produto funcionando |
| capability-truth (sensor #9) | 🟢 Médio | Confirma READY vs GAP por cap |

---

## 12. PRÓXIMOS PASSOS (sequência)

1. **`apps/api/` + `packages/core/`** — backend Railway com a lógica de scoring (fixability×potential×value-fit)
2. **`packages/db/`** — schemas: leads, tenants, solutions, scoring_runs
3. **Wire ADMIN dashboard** — dados reais do scoring engine (hoje é estático)
4. **location_code SP** — destravar Stage 1 (descoberta de candidatos)
5. **Primeiro diagnóstico real** — 1 segmento (clínicas estéticas SP), Stage 0→5 completo
6. **CLIENT dashboard** — depois do 1º cliente pagante

---

*Documento gerado em 2026-07-11 · Fontes: EVO-API (docs/adr/, docs/spec/, docs/products/, docs/runbooks/) + repositório adsentice*
