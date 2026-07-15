---
name: adsentice-content-gap
description: Content Gap Analyzer — analisa gaps de conteúdo do site vs concorrentes. Usa DataForSEO (keyword_data, SERP, content_analysis) + Firecrawl. Pipeline da Solução #1 (Diagnóstico SEO Local) e Solução #2 (Análise de Concorrência). Output: relatório de gaps priorizados.
type: project
---

# adsentice-content-gap

Analisa GAPS de conteúdo entre o site do cliente e seus concorrentes locais.
Usa **DataForSEO MCP** (keyword_data, labs, SERP) + **Firecrawl MCP** (scrape, map) para identificar oportunidades de conteúdo.

## Quando usar

- Analisar por que concorrentes ranqueiam melhor para keywords locais
- Identificar conteúdo faltante no site do cliente vs TOP 3 concorrentes
- Gerar recomendações de conteúdo priorizadas por impacto
- Construir briefings de conteúdo para landing pages locais
- Pipeline `content_gap` — integração com L3 discovery

## Pipeline (5 passos)

### 1. Site Crawl (Firecrawl)
```
firecrawl_map → descobrir todas as páginas
firecrawl_scrape → extrair conteúdo das páginas principais
```
Output: estrutura do site, páginas existentes, tipos de conteúdo

### 2. Keyword Discovery (DataForSEO)
```
mcp__dataforseo__dataforseo_labs_google_keywords_for_site → keywords do cliente
mcp__dataforseo__dataforseo_labs_google_keywords_for_site → keywords de cada concorrente
mcp__dataforseo__dataforseo_labs_google_domain_intersection → keywords que concorrentes rankeiam e cliente não
```
Output: universo de keywords, overlap, gaps

### 3. SERP Analysis
```
mcp__dataforseo__serp_organic_live_advanced → SERP para top 10 keywords
```
Output: quem ranqueia, features (featured snippet, local pack, PAA)

### 4. Content Scoring
Aplicar o framework `lib/content-gap.ts` (C1-C8 signals):
- **C1 Thin Content:** páginas com <300 palavras
- **C2 Missing Meta:** sem title, description, H1
- **C3 No Schema:** sem JSON-LD estruturado
- **C4 Poor Architecture:** estrutura plana ou muito profunda
- **C5 Missing Key Pages:** sem página de serviços, contato, sobre
- **C6 No Blog/Content:** sem produção de conteúdo
- **C7 Competitor Gap:** keywords que concorrentes cobrem e cliente não
- **C8 Intent Mismatch:** conteúdo não alinhado com search intent

### 5. Recommendations
Output: cards priorizados com:
- Gap type (C1-C8)
- Priority (HIGH/MEDIUM/LOW)
- Estimated impact (tráfego adicional)
- Action ("Criar página de serviços com 500+ palavras e schema LocalBusiness")
- DataForSEO evidence (keyword volume, competitor ranking)

## Ferramentas MCP

### DataForSEO (primário)
| Tool | Uso |
|------|-----|
| `dataforseo_labs_google_keywords_for_site` | Keywords do cliente e concorrentes |
| `dataforseo_labs_google_domain_intersection` | Keywords que concorrente rankeia e cliente não |
| `dataforseo_labs_google_related_keywords` | Keywords relacionadas para expandir |
| `dataforseo_labs_google_ranked_keywords` | Ranking atual de keywords |
| `serp_organic_live_advanced` | SERP features, concorrentes na SERP |
| `dataforseo_labs_google_keyword_overview` | Volume, competição, CPC |

### Firecrawl (complementar)
| Tool | Uso |
|------|-----|
| `firecrawl_map` | Descobrir estrutura do site |
| `firecrawl_scrape` | Extrair conteúdo das páginas |

## Integração com código existente

```
apps/web/src/lib/
├── content-gap.ts     # Content maturity scoring (C1-C8)
├── pipeline.ts        # L0-L5 pipeline (content_gap é pipeline opcional)
├── scoring.ts         # Pain Criteria v1.2 (Schwartz levels)
└── types.ts           # DiscoveryCard, ContentGapResult
```

## Output Schema

```typescript
interface ContentGapReport {
  client: {
    domain: string;
    pages_found: number;
    content_score: number;        // 0-100
    maturity_level: string;       // "beginner" | "developing" | "established" | "advanced"
    signals: ContentSignal[];     // C1-C8 flags
  };
  competitors: {
    domain: string;
    pages_found: number;
    content_score: number;
    key_strengths: string[];
  }[];
  gaps: {
    type: string;                 // "missing_page" | "thin_content" | "keyword_gap" | "schema_gap"
    priority: "HIGH" | "MEDIUM" | "LOW";
    keyword: string;
    volume: number;
    competitor_coverage: string[]; // quais concorrentes cobrem
    recommendation: string;
    estimated_traffic_gain: number;
  }[];
  summary: {
    total_gaps: number;
    high_priority: number;
    quick_wins: number;           // gaps resolvíveis em <1 semana
    content_plan: string[];       // próximos 5 conteúdos a criar
  };
}
```

## Exemplo de uso

```
Usuário: "Analisa o content gap da clínica dermatologia sp"
→ 1. Firecrawl: mapear site da clínica
→ 2. DataForSEO: keywords da clínica + 3 concorrentes locais
→ 3. DataForSEO: domain intersection → keywords que concorrentes rankeiam
→ 4. DataForSEO: SERP analysis → quem ranqueia, que conteúdo Google recompensa
→ 5. Score: aplicar C1-C8
→ 6. Output: relatório com gaps priorizados + plano de conteúdo
```

## Doutrinas

1. **medido=verdade:** todo gap citado tem evidência DataForSEO
2. **LLM = árbitro NUNCA extrator:** scoring é determinístico (C1-C8), LLM só formata output
3. **Custo controlado:** cada análise consome ~$0.06 em APIs DataForSEO
4. **Português (pt-BR):** output em português, adaptado para SMB brasileiro
5. **Sandbox default ($0):** usar cache Redis antes de chamar APIs pagas

---

*adsentice-content-gap v1.0 · 2026-07-14 · medido=verdade*
