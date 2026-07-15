---
name: adsentice-recommend
description: Recommendation Engine — gera 3-5 ações priorizadas por lead usando dados reais de enrichment. Usa DataForSEO + Qdrant Warp Registry + Scoring Engine. Pipeline da Solução #1 (Diagnóstico SEO Local). Output: ActionPlan com quick win + ROI.
type: project
---

# adsentice-recommend

Motor de Recomendações do adsentice. Gera **3-5 ações priorizadas** por lead com base em dados REAIS de enriquecimento (GMB, Lighthouse, tecnologias, concorrentes, conteúdo).

Usa **DataForSEO MCP** para dados de mercado + **Qdrant Warp Registry** (6,284 pontos de design knowledge) para recomendações contextualizadas por segmento.

## Quando usar

- Gerar plano de ação para um lead específico (URL ou GMB)
- Priorizar ações por impacto × esforço × receita potencial
- Gerar WhatsApp script + mini-deck para vendedor abordar o lead
- Pipeline `recommend` — integração com o discovery engine

## Pipeline (5 passos)

### 1. Coletar Sinais (já existentes no lead)
```
ScoringInput — todos os sinais de enriquecimento L0-L2:
- GMB: is_claimed, rating_value, rating_votes, total_photos, category
- Site: l2_onpage_score, l2_lighthouse_performance, l2_has_analytics, l2_cms, l2_word_count
- Schema: s1_missing_local_business, s2_missing_organization
- Arquitetura: a1_flat_structure, a2_orphan_risk, internal_links
- Conteúdo: c1_thin_content, c2_missing_meta, c3_no_schema, c4_poor_architecture
- Concorrência: K1-K4 signals, topCompetitors
```

### 2. Scoring Engine (apps/web/src/lib/scoring.ts)
```
Compound Score = Fit × 0.40 + Engagement × 0.35 + Intent × 0.25
Schwartz 5 Awareness Levels: Unaware → Problem Aware → Solution Aware → Product Aware → Most Aware
37 sinais de scoring + regras anti-false-positive
```

### 3. Content Gap (apps/web/src/lib/content-gap.ts)
```
8 sinais C1-C8: thin_content, missing_meta, no_schema, poor_architecture,
missing_key_pages, no_blog, competitor_gap, intent_mismatch
Classificação de maturidade: beginner → developing → established → advanced
```

### 4. Gerar Ações (apps/web/src/lib/recommend.ts)
```
Rule engine determinístico com 10+ categorias:
- SEO Técnico (schema JSON-LD, sitemap, robots.txt)
- Arquitetura (estrutura multi-página, navegação)
- Conteúdo (expandir para 500+ palavras, blog)
- GMB (reivindicar perfil, otimizar categorias)
- Analytics (GA4 + Search Console)
- Reputação (recuperar reviews, responder críticas)
- Performance (mobile, imagens, cache)
- Conversão (WhatsApp button, CTA visível)
- Prova Social (fotos reais, depoimentos)
- Ferramenta Gratuita (calculadora, quiz, checklist)

Priorização: score = impact × 0.40 + effort_inverse × 0.25 + revenue × 0.25 + urgency × 0.10
```

### 5. Battle Card + WhatsApp Script (apps/web/src/lib/battle-card.ts)
```
- Objeções por categoria (dentista, restaurante, academia, etc.)
- ROI estimado (tráfego × conversão × ticket)
- Mini-deck 5 slides (Problema → Oportunidade → Concorrência → Solução → ROI)
- Script WhatsApp com dados reais do lead
```

## Ferramentas MCP

### DataForSEO (enriquecimento opcional)
| Tool | Uso |
|------|-----|
| `dataforseo_labs_google_keywords_for_site` | Keywords do lead (contexto adicional) |
| `dataforseo_labs_google_competitors_domain` | Concorrentes (K1-K4 enrichment) |
| `business_data_business_listings_search` | GMB profile verification |

### Qdrant Warp (contexto de design)
| Tool | Uso |
|------|-----|
| `adsentice_search` | Buscar melhores práticas por segmento/categoria |
| `adsentice_search(kind=design-knowledge)` | Paleta, tipografia, landing pattern para o segmento |

## Integração com código existente

```
apps/web/src/lib/
├── recommend.ts         # ActionPlan generator (246 linhas)
├── scoring.ts           # Pain Criteria v1.2 (762 linhas)
├── content-gap.ts       # Content maturity scoring (334 linhas)
├── site-architecture.ts # Architecture analyzer (176 linhas)
├── schema-scoring.ts    # Schema validator (175 linhas)
├── competitor-intel.ts  # K1-K4 signals (119 linhas)
├── battle-card.ts       # Sales battle cards (285 linhas)
├── tool-suggester.ts    # Free tool suggestions (199 linhas)
└── pipeline.ts          # L0-L5 pipeline (673 linhas)
```

## Exemplo de uso

```
Usuário: "Gera recomendações para a clínica dermatologia sp"
→ 1. Verificar se lead já tem enriquecimento L0-L2
→ 2. Se não: rodar DataForSEO GMB + Lighthouse + Technologies
→ 3. Content Gap: analisar site → sinais C1-C8
→ 4. Competitor Intel: TOP 3 concorrentes → sinais K1-K4
→ 5. Scoring Engine: calcular compound score + Schwartz level
→ 6. Recommendation Engine: gerar 5-7 ações priorizadas
→ 7. Battle Card: gerar mini-deck + WhatsApp script
→ 8. Output: ActionPlan + BattleCard para o vendedor
```

## Doutrinas

1. **medido=verdade:** toda recomendação cita o sinal que a originou (ex: "Seu rating_value=3.2 com 15 avaliações → ação de reputação")
2. **Determinístico primeiro:** rule engine cobre 80% dos casos. LLM (L6) só para recomendações criativas ou fora do domínio
3. **Quick win sempre:** toda recomendação identifica a ação de maior impacto com menor esforço
4. **Português (pt-BR):** output em português, adaptado para SMB brasileiro
5. **Custo $0:** rule engine não chama APIs pagas. DataForSEO só se lead não tiver enriquecimento

---

*adsentice-recommend v1.0 · 2026-07-14 · medido=verdade*
