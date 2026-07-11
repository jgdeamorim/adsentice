---
name: adsentice-site-audit
description: Skill de auditoria de site — Firecrawl MCP + DataForSEO ONPAGE + DOMAIN_ANALYTICS. Pipeline de discovery da Solução #1 (Diagnóstico SEO Local).
type: project
---

# adsentice-site-audit

Skill de AUDITORIA DE SITE — o primeiro pipeline do adsentice Interaction Hub.
Usa **Firecrawl MCP** (scrape, map, crawl) como camada de extração + **DataForSEO MCP** (on_page, domain_analytics) como camada de dados de mercado.

## Quando usar

- Fazer auditoria completa de um site de cliente (URL → relatório)
- Construir ou modificar o pipeline `site_audit` no backend
- Extrair estrutura, tecnologia e conteúdo de qualquer site
- Comparar stack tecnológica entre concorrentes
- Debuggar por que o Firecrawl não está retornando dados

## Ferramentas (MCP)

### Firecrawl (keyless — $0)
| Tool | Uso adsentice |
|------|---------------|
| `firecrawl_scrape` | Extrair página principal do site (home, serviços, contato) |
| `firecrawl_map` | Descobrir todas as páginas indexadas do site |
| `firecrawl_crawl` | Crawl profundo do site (até profundidade N) |
| `firecrawl_search` | Buscar menções do negócio na web |
| `firecrawl_extract` | Extração estruturada com LLM (extrair serviços, preços, equipe) |

### DataForSEO
| Tool | Uso adsentice |
|------|---------------|
| `on_page_instant_pages` | Lighthouse + auditoria técnica (Performance, SEO, a11y) |
| `domain_analytics_technologies_domain_technologies` | Stack tecnológica (CMS, framework, hosting, CDN) |
| `domain_analytics_whois_overview` | WHOIS (idade do domínio, registrar, expiração) |

## Pipeline: site_audit

```
URL input (minhaclinicaestetica.com.br)
     │
     ├─ Firecrawl: firecrawl_map(url)
     │   → lista de TODAS as páginas do site
     │
     ├─ Firecrawl: firecrawl_scrape(url, formats=["markdown"], onlyMainContent=true)
     │   → conteúdo principal em markdown (serviços, sobre, contato)
     │
     ├─ Firecrawl: firecrawl_extract(urls=[home, servicos, contato])
     │   → extrai estruturado: { servicos: [...], precos: [...], equipe: [...], telefone, endereco }
     │
     ├─ DataForSEO: on_page_instant_pages(url, enable_javascript=true)
     │   → Lighthouse audit: performance_score, seo_score, a11y_score, best_practices_score
     │
     ├─ DataForSEO: domain_analytics_technologies_domain_technologies(target=domain)
     │   → Stack: CMS, framework, hosting, CDN, analytics, plugins
     │
     └─ DataForSEO: domain_analytics_whois_overview(filters=[domain])
         → WHOIS: created_date, expiry_date, registrar
```

## Output: SiteAuditCard

```typescript
interface SiteAuditCard {
  url: string
  domain: string
  pages_discovered: number

  // Firecrawl
  content: {
    services: string[]
    has_pricing: boolean
    has_contact: boolean
    has_team: boolean
    has_blog: boolean
  }

  // DataForSEO
  lighthouse: {
    performance: number      // 0-100
    seo: number              // 0-100
    accessibility: number    // 0-100
    best_practices: number   // 0-100
  }

  stack: {
    cms: string              // "WordPress 6.4"
    framework: string        // "Next.js" | null
    hosting: string          // "Cloudflare"
    cdn: string              // "Cloudflare"
    analytics: string[]      // ["GA4", "Facebook Pixel"]
  }

  domain_age_days: number

  // Score derivado
  score: number              // 0-100 (média ponderada)
  recommendations: string[]  // tips acionáveis
}
```

## Exemplo de uso

```
Usuário: "Audite o site minhaclinicaestetica.com.br"

Skill:
1. firecrawl_map → 23 páginas descobertas
2. firecrawl_scrape(home) → "Clínica Estética XPTO · Harmonização Facial · Botox · Preenchimento..."
3. firecrawl_extract → { servicos: ["Harmonização Facial", "Botox", "Preenchimento Labial", ...] }
4. on_page_instant_pages → Lighthouse: Perf 72, SEO 89, A11y 64, Best Practices 91
5. domain_technologies → WordPress 6.4, Elementor, Cloudflare, GA4, Facebook Pixel
6. whois → domínio criado 2019-03-15 (7 anos)

Output (AG-UI ActivitySnapshot):
  Card: "🖥️ Site: WordPress moderno, performance ok, SEO bem configurado"
  Score: 78/100
  Tips:
    1. Imagens não otimizadas → -12pts performance (webp > jpg)
    2. Meta descriptions ausentes em 8/23 páginas
    3. Blog sem posts desde janeiro → conteúdo fresco = +SEO
```

## Doutrinas

1. **Firecrawl PRIMEIRO, DataForSEO DEPOIS.** Firecrawl extrai o que EXISTE no site. DataForSEO analisa o que o site VALE no mercado.
2. **Markdown, não HTML.** `firecrawl_scrape(formats=["markdown"])` é mais limpo e o DeepSeek processa melhor.
3. **Só conteúdo público.** Não tentar acessar /admin, /wp-admin, ou páginas login-gated.
4. **Respeitar robots.txt.** Firecrawl já faz isso automaticamente.
5. **Cache agressivo.** Site audit do mesmo domínio em <24h = usar cache (Vault dedup por blake3).
