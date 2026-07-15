---
name: adsentice-competitive-landscape
description: Competitive Landscape TOP 3 — identifica e analisa os 3 principais concorrentes locais. Usa DataForSEO domain_competitors + backlinks_summary + keyword_gap. Pipeline da Solução #2 (Análise de Concorrência). Output: battle cards por concorrente.
type: project
---

# adsentice-competitive-landscape

Identifica os TOP 3 concorrentes locais de um negócio SMB e gera **battle cards** com dados quantitativos.
Usa **DataForSEO MCP** (domain_analytics, backlinks, labs) para análise baseada em dados.

## Quando usar

- Descobrir quem são os principais concorrentes online de um cliente
- Analisar força/fracos de cada concorrente (SEO, backlinks, tráfego)
- Identificar oportunidades de keywords que concorrentes rankeiam e cliente não
- Construir battle cards para o time de vendas
- Pipeline `competitor_intel` — integração com L3 discovery

## Pipeline (6 passos)

### 1. Domain Competitors Discovery
```
mcp__dataforseo__dataforseo_labs_google_competitors_domain → lista de concorrentes
```
Output: domínios que competem nas mesmas keywords + métricas de overlap

### 2. Domain Rank Overview (TOP 3)
```
mcp__dataforseo__dataforseo_labs_google_domain_rank_overview → ranking + tráfego
```
Output: posições orgânicas, paid, featured snippet, tráfego estimado

### 3. Backlinks Analysis
```
mcp__dataforseo__backlinks_summary → perfil de backlinks
mcp__dataforseo__backlinks_referring_domains → domínios que linkam
mcp__dataforseo__backlinks_competitors → competidores de backlinks
mcp__dataforseo__backlinks_bulk_ranks → domain rank
```
Output: autoridade de domínio, perfil de backlinks, domínios referenciadores

### 4. Keyword Gap Analysis
```
mcp__dataforseo__dataforseo_labs_google_domain_intersection → keywords que concorrente rankeia e cliente não
```
Output: oportunidades de keywords, estimativa de tráfego perdido

### 5. Technology Stack
```
mcp__dataforseo__domain_analytics_technologies_domain_technologies → stack de cada concorrente
```
Output: CMS, analytics, frameworks, CDN, plugins

### 6. Battle Cards Generation
Aplicar framework `lib/competitor-intel.ts` (K1-K4 signals) + `lib/battle-card.ts`:
- **K1 Domain Authority:** rank, backlinks, referring domains
- **K2 Keyword Overlap:** % keywords compartilhadas, keywords exclusivas
- **K3 Content Strength:** páginas indexadas, blog ativo, tipos de conteúdo
- **K4 Tech Sophistication:** stack moderna, performance, mobile-friendly

## Battle Card Schema

```typescript
interface BattleCard {
  competitor: {
    domain: string;
    business_name: string;
    category: string;
    estimated_traffic: number;      // orgânico + paid
    domain_rank: number;            // 0-1000
    backlinks_count: number;
    referring_domains: number;
  };

  strengths: string[];              // o que fazem bem
  weaknesses: string[];             // onde são vulneráveis
  opportunities: string[];          // keywords que podemos tomar

  keyword_overlap: {
    shared_keywords: number;
    exclusive_to_competitor: number;
    exclusive_to_client: number;
    top_opportunities: {             // keywords high-volume que cliente não rankeia
      keyword: string;
      volume: number;
      competitor_position: number;
      difficulty: string;
    }[];
  };

  content_analysis: {
    indexed_pages: number;
    has_blog: boolean;
    content_types: string[];
    avg_content_depth: number;      // palavras por página
  };

  tech_stack: {
    cms: string;
    analytics: string[];
    cdn: string;
    frameworks: string[];
  };

  battle_card_html: string;         // HTML pronto para o Portal S9
}
```

## Ferramentas MCP

### DataForSEO (primário)
| Tool | Uso |
|------|-----|
| `dataforseo_labs_google_competitors_domain` | Descobrir concorrentes |
| `dataforseo_labs_google_domain_rank_overview` | Ranking + tráfego |
| `dataforseo_labs_google_domain_intersection` | Keyword gap |
| `dataforseo_labs_google_ranked_keywords` | Keywords de cada concorrente |
| `backlinks_summary` | Perfil de backlinks |
| `backlinks_referring_domains` | Quem linka para o concorrente |
| `backlinks_competitors` | Competidores de backlinks |
| `backlinks_bulk_ranks` | Domain rank |
| `backlinks_bulk_backlinks` | Contagem de backlinks |
| `domain_analytics_technologies_domain_technologies` | Stack tecnológica |

## Integração com código existente

```
apps/web/src/lib/
├── competitor-intel.ts  # K1-K4 signals (119 linhas)
├── battle-card.ts       # Battle card generator (285 linhas)
├── pipeline.ts          # L0-L5 pipeline (competitor_intel)
└── types.ts             # BattleCard, CompetitorIntel types
```

## Exemplo de uso

```
Usuário: "Quem são os TOP 3 concorrentes da clínica dermatologia sp?"
→ 1. DataForSEO: domain_competitors → lista de concorrentes
→ 2. Selecionar TOP 3 por domain_rank + overlap
→ 3. DataForSEO: rank_overview de cada TOP 3
→ 4. DataForSEO: backlinks_summary de cada TOP 3
→ 5. DataForSEO: domain_intersection (keyword gap)
→ 6. DataForSEO: domain_technologies (stack)
→ 7. Gerar 3 battle cards com K1-K4 + oportunidades
→ 8. Output: battle cards HTML para Portal S9
```

## Doutrinas

1. **medido=verdade:** toda métrica de concorrente tem fonte DataForSEO (link, timestamp)
2. **TOP 3 apenas:** não listar 10 concorrentes genéricos. 3 com profundidade > 10 superficiais
3. **Battle cards acionáveis:** cada card tem "como vencer" (não só "eles são melhores")
4. **Custo controlado:** ~$0.03 por análise completa (3 concorrentes)
5. **Cache 30 dias:** concorrentes não mudam todo dia. Redis TTL 30d para landscape reports

---

*adsentice-competitive-landscape v1.0 · 2026-07-14 · medido=verdade*
