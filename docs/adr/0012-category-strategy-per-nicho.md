---
id: adr-0012
title: Estratégia por Categoria/Nicho — cada segmento tem seu próprio ecossistema de canais, scores e produtos
status: accepted
date: 2026-07-13
deciders: founder, claude
extends: [adr-0008, adr-0009, adr-0011]
---

# ADR-0012 · Estratégia por Categoria/Nicho

## Contexto

O adsentice opera 29 categorias em 7 segmentos de mercado. Até agora, tratávamos todas as categorias com a mesma estratégia: mesmos scores, mesmos hubs, mesmos planos, mesmo discurso de vendas. Isso é um erro.

Um restaurante tem ecossistema de canais diferente de um dentista. O restaurante lida com iFood, delivery, PDV. O dentista lida com convênio, agendamento, prevenção. Oferecer "integração com iFood" para um dentista é irrelevante. Oferecer "gestão de convênios" para um restaurante também.

Além disso, cada segmento tem **dores, canais de aquisição e objeções diferentes**. A abordagem de vendas que funciona para um dentista ("seu paciente pesquisa no Google antes de escolher") não funciona para um restaurante ("seus clientes estão espalhados em 5 canais e você não tem visão única deles").

## Decisão

**Cada segmento de mercado tem sua própria matriz de estratégia: canais, hubs, scores prioritários, abordagem de vendas e plano de precificação.**

### Os 7 segmentos e suas diferenças

| Segmento | Canais críticos | Hubs exclusivos | Score mais importante | Abordagem de venda |
|----------|----------------|-----------------|----------------------|-------------------|
| **Saúde** | GMB, WhatsApp, Convênio | Convenio, Agendamento | Reputation + SEO Local | "Seu paciente pesquisa antes de escolher" |
| **Beleza** | Instagram, WhatsApp, GMB | Social, Agendamento | Channel Health | "Seu cliente decide pelo Instagram e confirma pelo WhatsApp" |
| **Serviços Profissionais** | Google, LinkedIn, Referral | Reputation, Content | Reputation + SEO Local | "Seu cliente pesquisa 3 opções antes de contratar" |
| **Alimentação** | **iFood**, WhatsApp, GMB, PDV, Site | **Delivery**, Customer, PDV | **Customer Independence** | "Seus clientes estão espalhados. Você tem visão única?" |
| **Comércio** | GMB, WhatsApp, Telefone | — | Response Time + SEO Local | "Seu cliente pesquisa quando precisa. Você é o primeiro?" |
| **Educação** | Google, Facebook, Instagram | Social, Reputation | Reputation + SEO Local | "Pais pesquisam meses antes da matrícula" |
| **Hospitalidade** | Booking, Decolar, GMB, Instagram | **OTA**, Site próprio | **Customer Independence** | "Booking come 25%. Site próprio converte mais barato?" |

### Novos scores segmentados

| Score | Aplica a | O que mede |
|-------|----------|-----------|
| **Customer Independence** | Alimentação, Hospitalidade | % de pedidos que NÃO vêm do marketplace dominante (iFood, Booking) |
| **Channel Health** | Alimentação, Beleza | CAC por canal, ticket médio por canal, recorrência por canal |
| **Response Time** | Todos | Tempo médio de resposta no WhatsApp + Google reviews |
| **Delivery Performance** | Alimentação | Tempo de preparo, cancelamentos, horários de pico |

### Produtos diferenciados por segmento

| Plano base | Todos os segmentos | Alimentação | Hospitalidade |
|-----------|:---:|:---:|:---:|
| **Sentinela** | R$197/mês | R$197 + **Delivery Intel R$297** | R$197 + **OTA Intel R$197** |
| **Domínio** | R$497/mês | R$497 + Delivery Intel | R$497 + OTA Intel |
| **Growth OS** | R$997/mês | **R$1.497/mês** | **R$1.497/mês** |

### Foco de implementação

1. **Fase 1 (agora):** Saúde — 79 leads, nicho dominante. Domina antes de expandir.
2. **Fase 2 (v0.8):** Alimentação — ecossistema mais complexo, maior potencial de receita por cliente.
3. **Fase 3 (v0.9):** Beleza + Serviços Profissionais.
4. **Fase 4 (v1.0):** Todos os segmentos com Cockpit TOP-K unificado.

## Consequências

### Positivas
- Cada segmento recebe abordagem de vendas especifica (conversa com a dor real)
- Produtos modulares: cliente paga pelo que precisa (dentista não paga por Delivery Intel)
- Barreira de entrada mais baixa: Raio-X gratuito → upsell especifico por segmento
- Dados segmentados melhoram o benchmark ("você está entre os 15% melhores dentistas de SP")

### Negativas
- Complexidade de produto: precificacao e features variam por segmento
- Esforco de vendas: cada segmento precisa de material de vendas proprio
- Discovery Engine precisa rodar em mais categorias para popular dados

## Prova (medido)

- 100 leads no Supabase (79 dentistas, 13 dental clinics, 3 orthodontists)
- 29 categorias definidas no ICP (`scoring.ts` ICP_CATEGORIES)
- 7 segmentos com dores e canais distintos
- Matriz completa em `docs/spec/adsentice-category-strategy-matrix.md`

## Referências
- ADR-0008 (EVO-API L0-L4)
- ADR-0009 (Market Intelligence)
- ADR-0011 (Brain OODA)
- `docs/spec/adsentice-category-strategy-matrix.md`
- `docs/Sugestão para análise para soluções adicionais.txt`
- `apps/web/src/lib/scoring.ts` (ICP_CATEGORIES, 29 categorias)
