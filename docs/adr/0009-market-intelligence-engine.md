---
id: adr-0009
title: Market Intelligence Engine — de lead-level para market-level (categoria × região)
status: accepted
date: 2026-07-13
deciders: founder, claude
extends: [adr-0008]
---

# ADR-0009 · Market Intelligence Engine

## Contexto

O adsentice opera em **nível de lead individual**: cada busca no Discovery Engine retorna 50 negócios, enriquece os top N com L1+L2, e gera scoring + recomendações por lead. Isso é valioso para prospecção (agência aborda 1 lead por vez), mas **ignora o valor agregado** que já está no banco.

Temos **100 leads únicos enriquecidos** (SP+RJ, dentistas) no Supabase. Cada lead tem:
- 27 campos GMB (L1)
- 20 campos de website audit (L2)
- Score composto + Schwartz + Content Maturity + Architecture + Schema
- 37 sinais de dor (F/E/I/W/C/A/S)

Esses dados, **agregados por categoria × região**, respondem perguntas que agências de marketing cobram R$5.000+ por "estudo de mercado":

- "Qual o score médio dos dentistas em São Paulo?"
- "Quantos % não tem site próprio?"
- "Qual bairro tem mais concorrência?"
- "Quanto vale o mercado de SEO local para clínicas estéticas em SP?"

**Duas fontes externas foram avaliadas como referência:**

### `gbp-review-agent` (MCP server TypeScript)
GitHub: `satheeshds/gbp-review-agent` — MCP server para gestão de reviews do Google Business Profile. Oferece `list_locations`, `get_reviews`, `generate_reply` (LLM), `post_reply`. **Útil como produto futuro** (Gestão de Reputação automatizada) mas requer OAuth 2.0 do Google — acesso à conta GMB do lead. É um produto diferente do Discovery Engine (que é passivo, só lê dados públicos).

### `enterprise-business-intelligence-extraction-engine`
GitHub: `bitsandbrainsai/enterprise-business-intelligence-extraction-engine` — Backend Express + BullMQ + MongoDB standalone. Faz scraping de GMB via **Playwright (browser automation)**. **NÃO serve para adsentice**: scraping frágil (Google bloqueia), stack incompatível, não é MCP. Nosso DataForSEO é API oficial.

## Decisão

**Criamos o Market Intelligence Engine — agregação de dados existentes por categoria × região, sem novas chamadas de API.**

### Arquitetura

```
Supabase (100+ leads enriquecidos)
    │
    ├── GROUP BY category, city, district
    │
    ▼
lib/market-intel.ts (ZERO novas APIs)
    ├── aggregateByCategory(category, lat, lng, radius)
    │   └── AVG(score_compound), distribuição Schwartz, Content Maturity
    ├── marketGapAnalysis(category, city)
    │   └── TOP 5 sinais mais frequentes (ex: "68% sem schema")
    ├── marketOpportunity(category, city)
    │   └── TAM × penetração × ticket médio = receita potencial
    ├── competitiveDensity(category, city)
    │   └── Negócios/km², saturação de mercado
    └── nicheIntelligence(category, city)
        └── Perfil completo do nicho: maturidade, gaps, oportunidades
```

### Dados usados (já existentes no Supabase)

| Métrica | Coluna | Agregação |
|---------|--------|-----------|
| Score médio do mercado | `score_compound` | `AVG()` |
| Distribuição Schwartz | `schwartz_level` | `COUNT() GROUP BY` |
| Maturidade de conteúdo | `l2_content_maturity` | `AVG()` |
| % sem website | `website IS NULL` | `COUNT() / total` |
| % sem analytics | `l2_has_analytics = false` | `COUNT() / total` |
| % sem schema | `signals_detected` | `LIKE '%W8%'` |
| % com CMS de risco | `l2_cms` | `COUNT() GROUP BY` |
| Densidade competitiva | `latitude, longitude` | `COUNT() / área` |
| Ticket médio estimado | `category` → `CATEGORY_TICKETS` | lookup table |

### Produtos que habilita

| Produto | Preço | Fonte dos dados |
|---------|:-----:|----------------|
| **Raio-X de Mercado** (gratuito) | R$0 | aggregated stats públicos |
| **Relatório de Inteligência de Nicho** | R$197 | PDF com TOP 10 gaps + TAM + concorrência |
| **Radar Competitivo** (mensal) | R$497/mês | Monitoramento contínuo da categoria na região |

### Skills Corey relacionadas

| Skill | Aplicação no Market Intel |
|-------|--------------------------|
| `competitor-profiling` | Densidade competitiva por km² |
| `marketing-ideas` | Recomendações agregadas por nicho |
| `customer-research` | VOC agregado por categoria |
| `prospecting` | Priorização de nichos (qual categoria×região vale mais?) |

### Redes sociais + e-mail sobre perfil GMB

Identificamos que o `on_page_content_parsing` (MCP tool DataForSEO, $0.000125) pode extrair links de redes sociais e emails do site do lead. Isso alimenta um sinal novo de "maturidade social" no Market Intel. **MVP: extrair na próxima iteração L2; Market Intel consome quando disponível.**

## Consequências

### Positivas
- **Zero custo adicional** — 100% dos dados já estão no Supabase
- **Diferencial competitivo** — nenhuma ferramenta SMB Brazil gera market intel automático
- **Escala com o uso** — cada busca Discovery enriquece o banco e melhora o market intel
- **Produto novo:** Relatório de Inteligência de Nicho (R$197) e Radar Competitivo (R$497/mês)

### Negativas
- **Depende de volume de dados** — 100 leads é MVP; precisa de 500+ para significância estatística
- **Qualidade dos dados** — se L1/L2 falhar para alguns leads, a agregação fica enviesada
- **Manutenção do viés geográfico** — SP tem mais dados que outras cidades

## Implementação (Roadmap)

### Fase 1 · v0.6 — Market Intel MVP
- [ ] `lib/market-intel.ts` — 5 funções de agregação
- [ ] SQL queries com `GROUP BY category, city` no Supabase
- [ ] UI: nova rota `/admin/market` com dashboard de nicho
- [ ] TOP 5 gaps por categoria × região
- [ ] TAM estimado + penetração

### Fase 2 · v0.7 — Radar Competitivo
- [ ] Monitoramento contínuo (cron job semanal no Supabase)
- [ ] Alertas de mudança (ex: "3 novos concorrentes abriram esse mês")
- [ ] Relatório PDF automático agendado

### Fase 3 · v0.8 — Social Media + Email Intel
- [ ] `on_page_content_parsing` para extrair redes sociais
- [ ] Cruzamento email GMB × email do site
- [ ] Maturidade social agregada por nicho

## Prova (medido)

- 100 leads únicos no Supabase (SP+RJ, dentistas) — commit `f48fd3a`
- 37 sinais de scoring ativos por lead — `lib/scoring.ts`
- `gbp-review-agent` analisado: útil como produto futuro (OAuth), não como substituto
- `enterprise-business-intelligence-extraction-engine` analisado: descartado (scraping frágil)

## Referências
- ADR-0008 (EVO-API como Motor de Enriquecimento L0-L4)
- `apps/web/src/lib/scoring.ts` — 37 sinais ativos
- `packages/db/supabase/migrations/` — schema discovery_listings
- `apps/web/src/app/[lang]/(dashboard)/(private)/admin/` — UI dashboard existente
- `https://github.com/satheeshds/gbp-review-agent` — MCP server reviews GMB (referência futuro)
- `https://github.com/bitsandbrainsai/enterprise-business-intelligence-extraction-engine` — descartado (Playwright scraping)
