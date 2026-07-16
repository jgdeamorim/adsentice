---
id: adr-0024
title: Camadas de Enriquecimento L0→L4 + Market Intelligence Orchestrator
status: accepted
date: 2026-07-16
deciders: founder, claude
extends: [adr-0008, adr-0009, adr-0022, adr-0023]
references:
  - apps/web/src/app/api/discovery-search/route.ts (pipeline L0→L2 atual)
  - apps/web/src/lib/scoring.ts (Pain Criteria v1.2, sinais F/E/I/W/C)
  - apps/web/src/lib/state-scorer.ts (rankStates, 27 UFs)
  - apps/web/src/lib/target-scorer.ts (MunicipalityTarget, buildDiscoveryQueue)
  - apps/web/src/lib/ibge/ (IBGEService: client + localidades + censo + economia)
  - apps/web/src/lib/cep/ (CEPService: client + resolver)
  - packages/db/supabase/migrations/008_ibge_districts.sql
  - packages/db/supabase/migrations/009_ibge_panorama.sql
  - Supabase: ibge_market_size (783 rows), ibge_income (27 UFs), ibge_panorama (22 capitais), district_registry (354 municípios)
---

# ADR-0024 · Camadas de Enriquecimento L0→L4 + Market Intelligence Orchestrator

## Contexto

O adsentice construiu, ao longo de 324 commits, 4 sistemas de dados independentes que nunca foram formalmente integrados:

### O que temos (ativos)

| Sistema | Dados | Fonte |
|---------|-------|-------|
| **Pipeline Discovery** | L0 (GMB Search, 11 campos) + L1 (GMB Profile, 27 campos) + L2 parcial (Website+SEO, 24 colunas) | DataForSEO + Supabase |
| **IBGE Data** | 783 rows de market size (29 categorias × 27 UFs), 27 UFs de renda, 22 capitais com panorama (PIB, pop, densidade) | IBGE CEMPRE + PNAD + SIDRA |
| **CEPService** | CEP → coordenadas + bairro + IBGE panorama do município | ViaCEP + Nominatim + Supabase |
| **Auto-Pilot** | State Scorer (27 estados) + Target Scorer (354 municípios em 22 RMs) | Supabase + IBGE |
| **KG Semântico** | 97,5K pontos em 4 collections (self + conversation + memory + materio) | Qdrant + Embed :8081 |

### O problema

1. **Camadas de enriquecimento misturadas.** O `enrichTopLeadsL2` atual faz 3 coisas diferentes em 1 função: SEO técnico (`on_page_instant_audit`), tecnologia (`domain_technologies`), e crawling de redes sociais (`parseWebsiteContacts`). Essas são responsabilidades de camadas diferentes.

2. **Dados IBGE não alimentam o scoring.** O `state-scorer` e `target-scorer` usam IBGE para decidir ONDE prospectar, mas o scoring do lead (`scoring.ts`) não usa IBGE para decidir QUANTO o lead vale. Um dentista em Guarulhos (renda R$2.300) e um dentista em São Luís (renda R$700) têm o mesmo score — o que é falso.

3. **Inteligência não é cumulativa.** Cada busca Discovery é isolada. O sistema não aprende com buscas anteriores. O Market Holds grava snapshots mas o Auto-Pilot não os consulta para refinar sua estratégia.

4. **Sem diferenciação entre SEO técnico e inteligência social.** O L2 atual junta métricas de página (onpage score, meta tags, word count) com métricas sociais (Instagram, Facebook, WhatsApp). São domínios diferentes e deveriam ser camadas separadas.

## Decisão

### Parte 1: Separação das camadas de enriquecimento

**Adotamos 5 camadas distintas, cada uma com responsabilidade e custo próprios:**

| Camada | Nome | Fonte | Campos | Custo/lead |
|--------|------|-------|--------|-----------|
| **L0** | Atração | `business_listings_search` | 11 campos (title, category, address, rating, place_id, lat/lng, is_claimed) | $0.0003 |
| **L1** | Perfil GMB | `business_profile_gmb` | 27 campos (phone, website, fotos, descrição, horários, categorias, city, district) | $0.0054 |
| **L2** | Website & SEO | `on_page_instant_audit` + `domain_technologies` | OnPage score, meta tags, word count, links, CMS, analytics, domain rank | $0.010125 |
| **L3** | Social & Contacts | `content_parsing` | Redes sociais (Instagram, Facebook, LinkedIn, TikTok, YouTube, WhatsApp), emails, telefones adicionais | $0.0005 |
| **L4** | Market Context | IBGE + CEP | PIB per capita, renda média, densidade, população do município/bairro, score de mercado | $0 |

**L3 é SEPARADO de L2.** O que já existe no código (`parseWebsiteContacts`) é movido para sua própria função `enrichTopLeadsL3()`. O L2 permanece puramente técnico (SEO + tecnologia). O L3 é inteligência de contato e presença social.

**L4 é $0 e roda em TODOS os leads** — lê dados do Supabase (`ibge_panorama`, `ibge_income`) e enriquece o scoring com contexto de mercado. Um dentista em SP (renda R$2.300) recebe +10pts no ticket score vs um dentista em São Luís (renda R$700).

### Parte 2: Market Intelligence Orchestrator

**Criamos um orquestrador que integra as 5 camadas com os 4 sistemas de dados:**

```
Market Intelligence Orchestrator (apps/web/src/lib/orchestrator.ts)
  │
  ├─► State Scorer: QUAL estado prospectar?
  │     ├─ IBGE market size (29 categorias × 27 UFs)
  │     ├─ IBGE income (renda média por UF)
  │     └─ Cobertura real do Supabase (quantos já mapeamos?)
  │
  ├─► Target Scorer: QUAL município dentro do estado?
  │     ├─ District registry (354 municípios de 22 RMs)
  │     ├─ Schwartz distribution (dor detectada nos leads existentes)
  │     └─ Density + Coverage scores
  │
  ├─► CEPService: QUAL região dentro do município?
  │     ├─ CEPs de alta renda → bairros prioritários
  │     └─ Nominatim → coordenadas para busca GMB
  │
  ├─► Pipeline L0→L4: Execução
  │     ├─ L0: 50 listings GMB ($0.015)
  │     ├─ L1: ALL 50 enriquecidos ($0.27)
  │     ├─ L2: SEO técnico nos websites ($0.10)
  │     ├─ L3: Social + contacts ($0.007)
  │     └─ L4: IBGE context (pop, PIB, renda) em cada lead ($0)
  │
  └─► Feedback Loop: Aprendizado cumulativo
        ├─ Market Holds (time-series snapshots)
        ├─ Conversion scoring (quais bairros convertem mais?)
        └─ Refinement: próximo ciclo prioriza regiões de alta conversão
```

### Parte 3: Estratégia de acumulação de dados

**Fase 1 — Base proprietária SMB Brasil (3 meses)**
- Meta: 5.000 leads/mês em 5 categorias prioritárias
- Cada lead: L0+L1+L2+L3+L4 completo
- Custo: ~$2.200/mês
- Resultado: 15.000 SMBs mapeados com GMB + website audit + social + IBGE

**Fase 2 — Inteligência cumulativa (a partir do mês 3)**
- Market Holds com 3+ meses de dados → tendências sazonais
- Conversion scoring por bairro/CEP → "Heatmap de conversão"
- Refinamento automático dos scores do State/Target Scorer

**Fase 3 — Diferencial competitivo (a partir do mês 6)**
- Base proprietária de 30.000+ SMBs que NENHUM concorrente tem
- Modelo preditivo: "Este bairro converte 3× mais que a média"
- Expansão para todas as 29 categorias

## Arquitetura proposta

```
apps/web/src/lib/
├── orchestrator.ts              # NOVO: Market Intelligence Orchestrator
├── scoring.ts                   # Atualizado: +IBGE signals (PIB, renda)
├── state-scorer.ts              # Mantido (já lê IBGE)
├── target-scorer.ts             # Mantido (já lê district_registry)
├── ibge/                        # Mantido (5 módulos)
├── cep/                         # Mantido (3 módulos)
├── pipeline.ts                  # Mantido (L0→L5 decision)
│
apps/web/src/app/api/discovery-search/route.ts
  # Atualizado: enrichTopLeadsL3() extraído de L2
  # Atualizado: enrichTopLeadsL4() adicionado (IBGE context)
  # Atualizado: Orchestrator decide ONDE e COMO buscar
│
apps/web/src/app/api/coverage/queue/route.ts
  # Mantido (dual mode: state-ranking + city-queue)
│
packages/db/supabase/migrations/
├── 008_ibge_districts.sql       # Já aplicado
├── 009_ibge_panorama.sql        # Já aplicado
└── 010_enrichment_l3_l4.sql     # NOVO: colunas l3_social, l4_ibge_context
```

## Consequências

### Positivas
- **L2 fica mais limpo e rápido** — só SEO técnico, sem overhead de content parsing
- **L3 pode evoluir independentemente** — adicionar TikTok, Threads, sem mexer no L2
- **L4 é $0 e transforma o scoring** — renda e PIB do bairro viram sinais de scoring
- **Orquestrador unifica a inteligência** — State Scorer + CEPService + Pipeline conversam
- **Base proprietária** — a cada busca, o sistema fica mais inteligente
- **Defesa competitiva (data moat)** — ninguém replica 30.000 SMBs com GMB+website+social+IBGE

### Riscos
- **Custo de aquisição de dados: $2.200/mês na Fase 1** — investimento pré-receita
- **Acurácia do CEP → bairro depende do ViaCEP** — fallback Nominatim
- **IBGE é estático (atualização anual)** — OK para decisões estratégicas
- **Complexidade do orquestrador** — 4 sistemas integrados, curva de debug

## Plano de implementação

### Semana 1: Separação L2/L3 + L4 básico
1. Extrair `parseWebsiteContacts` de L2 → nova função `enrichTopLeadsL3()`
2. Criar `enrichTopLeadsL4()` que lê IBGE do Supabase
3. Migration 010: colunas `l3_social` + `l4_ibge_context` no `discovery_listings`

### Semana 2: Market Intelligence Orchestrator
1. `orchestrator.ts`: integra State Scorer + Target Scorer + CEP
2. Loop automático: busca → enriquece → próximo alvo → repete
3. Auto-Pilot autônomo (ADR-0023 Camada 3)

### Semana 3-4: Base proprietária
1. Rodar pipeline completo em 5 categorias prioritárias
2. Popular Market Holds com 1 mês de dados
3. Validar scores de conversão por bairro

## Status

**Proposed** — 2026-07-16. Aguardando aprovação do founder.
