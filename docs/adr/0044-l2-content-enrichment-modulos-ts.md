# ADR-0044 · L2 Website Content Enrichment — Crawler Modular .TS + LLM Cirúrgica

**Status:** ACCEPTED
**Date:** 2026-07-19
**Author:** jeffer + Claude Opus 4.8
**Supersedes:** Nenhum (novo)
**Sources:** Análise de memória live (19/jul 21:30 BRT), cheerio 1.0.0 PoC, Firecrawl self-hosting audit, refinamento founder, **vsforge-design-crawler SPEC-025** (blueprint de referência para design-extractor)

---

## 🧬 Blueprint de referência: vsforge-design-crawler (SPEC-025)

Antes de reinventar o Design DNA, auditamos um crawler de design já implementado e testado em produção. O **vsforge-design-crawler** (v0.1.0, 9 arquivos TypeScript, ~700 linhas) é um design intelligence crawler que captura, classifica e indexa designs de sites. Ele serve como **blueprint de referência** para o módulo `design-extractor.ts` do L2b.

### Arquitetura do vsforge (10 etapas)

```
URL
 │
 ├── Tier 1: fetch() SSR → detecta framework (Noisy-OR, 7 sinais cumulativos)
 ├── Tier 2: Playwright → screenshot retina 2x + computed styles
 ├── Screenshot → WebP (full + thumb 400px) via Sharp
 ├── Extrai cores da imagem (quantize 16, skip white/black) via Sharp
 ├── Extrai cores do CSS (computed styles via Playwright)
 ├── Extrai fontes (computed + Google Fonts links)
 ├── Fingerprint DOM → hash SHA-256 + linear notation
 ├── Detecta seções: hero, features, pricing, testimonials, cta, faq, team, contact, footer, navbar, about
 ├── Vision GPT-4o-mini → classifica layout, estilo, componentes, nicho
 ├── Normaliza → DesignResult + quality score (0-1)
 └── Indexa Qdrant (score ≥ 0.5) + persiste MongoDB
```

### Matriz de reuso: o que copiamos vs adaptamos vs descartamos

| Arquivo vsforge | O que faz | Status L2b | Como usar |
|-----------------|-----------|------------|-----------|
| **types.ts** | `DesignResult` com layout, design, components, grid, techStack | ✅ **100% direto** | Blueprint exato do nosso `BrandDNA`. Mesma estrutura, expandida com campos de clínica (services, doctors, insurance) |
| **fingerprint.ts** | `detectSections()` — 11 padrões regex | ✅ **100% direto** | Copiar regex em cheerio. Adicionar +6 padrões: booking, doctors, insurance, gallery, blog, whatsapp |
| **crawler.ts** | `detectFromHTML()` — Noisy-OR framework detection | ✅ **100% direto** | 7 sinais cumulativos (Next.js, React, WordPress, Wix, Shopify). Já testado em produção. |
| **quality-scorer.ts** | `scoreDesign()` — 0.4×confidence + 0.3×source + 0.2×complexity + 0.1×uniqueness | ✅ **90% direto** | Remover sourceWeight (não precisamos de awwwards/behance). Ajustar peso de complexity. |
| **normalizer.ts** | Merge colors, fonts, sections com dedup | ✅ **80% adaptável** | Lógica de merge/dedup igual. Substituir `computedStyles` (Playwright) por CSS custom properties + style tags do cheerio. |
| **image-processor.ts** | `extractImageColors()` — paleta de imagem via Sharp | 🟡 **50% adaptável** | Algoritmo de quantize (round to 16, skip white/black) copiável. Sem Sharp → usar fetch da imagem ou pular (cores do CSS são suficientes). |
| **screenshot-engine.ts** | Playwright headless + `extractComputedStyles()` | 🔴 **Substituído** | 1GB RAM. Substituir computação de estilos por cheerio CSS extraction (custom properties + style tags + classes Tailwind). |
| **vision-classifier.ts** | GPT-4o-mini em screenshot | 🔴 **Substituído** | API paga. Substituir por heurísticas CSS cheerio + DeepSeek (texto, não visão) quando necessário. |

### Três técnicas copiadas diretamente

**1. Section Detection (fingerprint.ts → component-extractor.ts)**
```typescript
// 20 padrões GENÉRICOS: 11 originais do vsforge + 9 multi-nicho (29 categorias)
const SECTION_PATTERNS = [
  // vsforge originais (11) — universais para qualquer site
  ["hero", /class="[^"]*hero|id="[^"]*hero|<section[^>]*hero/i],
  ["features", /class="[^"]*feature|id="[^"]*feature|<section[^>]*feature/i],
  ["pricing", /class="[^"]*pric|id="[^"]*pric|<section[^>]*pric/i],
  ["testimonials", /class="[^"]*testimon|id="[^"]*testimon|review/i],
  ["cta", /class="[^"]*cta|id="[^"]*cta|call.to.action/i],
  ["faq", /class="[^"]*faq|id="[^"]*faq|accordion/i],
  ["team", /class="[^"]*team|id="[^"]*team/i],
  ["contact", /class="[^"]*contact|id="[^"]*contact|<form/i],
  ["footer", /<footer/i],
  ["navbar", /<nav|class="[^"]*nav|class="[^"]*header/i],
  ["about", /class="[^"]*about|id="[^"]*about/i],
  // adsentice multi-nicho (9 NOVOS — genéricos para 29 categorias SMB)
  ["booking", /agend|booking|reserva|marcar|horário|consulta|liga|whatsapp/i],
  ["gallery", /galeria|portfolio|antes.depois|resultado|trabalho|projeto/i],
  ["blog", /blog|artigo|noticia|novidade|dica|guia/i],
  ["services", /serviço|servico|especialidade|procedimento|tratamento|atuação/i],
  ["social_proof", /cliente|parceiro|convênio|plano|credenciado|associado/i],
  ["location", /endereço|localização|mapa|bairro|região|como.chegar/i],
  ["menu", /cardápio|catalogo|menu|produto|serviço|preço/i],
  ["team_specialist", /dr\.?|dra\.?|crm|crea|oab|profissional|especialista/i],
  ["certification", /certificado|licença|registro|filiado|associado|anvisa/i],
]
// Exemplo para um ADVOGADO: detecta team_specialist (OAB), location, contact, blog
// Exemplo para uma PADARIA: detecta menu, location, social_proof, contact
// Exemplo para um DENTISTA: detecta booking (agendamento), team_specialist (CRM), gallery
```

**2. Framework Detection Noisy-OR (crawler.ts → strategy-resolver.ts)**
```typescript
// 7 sinais cumulativos, testados em produção — agnóstico a nicho
const signals: Record<string, number[]> = {
  "next.js": [], "react": [], "vue": [], "nuxt": [],
  "webflow": [], "wordpress": [], "shopify": [],
  "wix": [], "google_sites": [], "landing_page": [], // +3 para SMB
}
if (html.includes("__NEXT_DATA__")) signals["next.js"].push(0.9)
if (html.includes("data-reactroot")) signals["react"].push(0.8)
if (html.includes("wp-content"))     signals["wordpress"].push(0.85)
if (html.includes("data-wf-site"))   signals["webflow"].push(0.95)
if (html.includes("wix.com"))        signals["wix"].push(0.95)
if (html.includes("sites.google.com")) signals["google_sites"].push(0.90)
if (html.includes("cdn.shopify.com")) signals["shopify"].push(0.95)
// Noisy-OR: 1 - Π(1 - wᵢ) → confiança cumulativa por framework
```

**3. Quality Scoring adaptado (quality-scorer.ts → content-analyzer.ts)**
```typescript
// Fórmula do vsforge: 0.4×confidence + 0.3×sourceWeight + 0.2×complexity + 0.1×uniqueness
// Adaptada: genérica para 29 categorias, sem sourceWeight
export function scoreSMBDesign(
  techConfidence: number,    // Noisy-OR framework confidence (0-1)
  sections: string[],        // seções detectadas (dos 20 padrões)
  hasSchemaOrg: boolean,     // JSON-LD estruturado?
  wordCount: number,         // conteúdo textual (>200 = mínimo)
): number {
  const confidence  = techConfidence
  const complexity  = Math.min(sections.length / 8, 1.0)
  const structure   = hasSchemaOrg ? 1.0 : 0.3
  const contentRich = Math.min(wordCount / 500, 1.0)
  return +(confidence * 0.35 + complexity * 0.25 + structure * 0.20 + contentRich * 0.20).toFixed(2)
}
// Score universal — funciona igual para dentista, advogado, padaria, academia
```

### O que NÃO trazemos do vsforge

| Componente | Motivo |
|-----------|--------|
| **Playwright** | 1GB RAM. CSS extraction via cheerio é suficiente para 90% dos sites de clínica (SSR). |
| **Sharp** | ~50MB de dependências nativas. Cores do CSS têm qualidade suficiente. |
| **GPT-4o-mini vision** | $0.002/imagem. Heurísticas CSS + DeepSeek texto são $0 e cobrem o mesmo. |
| **MongoDB** | Usamos Supabase (PostgreSQL). |
| **Qdrant separado** | Já temos Qdrant para specs. Pode indexar designs depois. |
| **Awwwards/Behance/Landbook** | Hubs de inspiração de design. Irrelevante para sites de clínica SMB Brasil. |

### Economia de desenvolvimento

| Módulo L2b | Sem vsforge | Com vsforge | Ganho |
|------------|------------|------------|-------|
| `design-extractor.ts` | ~3h (do zero) | ~45min (80% reuso) | 2.25h |
| `component-extractor.ts` | ~2h (padrões novos) | ~30min (11 copiados + 9 genéricos multi-nicho) | 1.5h |
| `strategy-resolver.ts` | ~1.5h (framework detection) | ~15min (Noisy-OR copiado) | 1.25h |
| `quality-scorer.ts` | ~1h (fórmula nova) | ~20min (adaptada) | 40min |
| **Total Fase 4 (Design DNA)** | **~7.5h** | **~2h** | **~5.5h economizadas** |

---

## ⚠️ Relação com L2 e L3 — NÃO substitui, COMPLEMENTA

Esta ADR **não substitui** o L2 nem o L3 existentes. Ela adiciona uma nova camada de dados qualitativos que nenhuma API fornece:

```
L0  · DataForSEO business_listings  → GMB: nome, telefone, endereço, reviews  · $0.048
L2a · DataForSEO on_page + tech     → SEO técnico, Lighthouse, CMS, analytics  · $0.012
L2b · ADR-0044 crawler .TS          → Conteúdo, serviços, preços, Design DNA   · $0     ⬅ ESTA ADR
L3  · DataForSEO backlinks          → Concorrentes, backlinks, domain rank     · $0.08
Wa  · Evolution API :3100           → WhatsApp check 3 camadas                 · $0
───
Total: $0.14/lead ≈ R$0.77
```

| Dado | DataForSEO | ADR-0044 | Relação |
|------|-----------|----------|---------|
| Lighthouse scores | ✅ Numérico preciso | ❌ Não extrai | DataForSEO cobre |
| CMS/Stack detection | ✅ Wappalyzer-based | ❌ Não extrai | DataForSEO cobre |
| Backlinks/KW gaps | ✅ API dedicada | ❌ Não extrai | DataForSEO cobre |
| Conteúdo textual real | ❌ Não fornece | ✅ cheerio extrai | **ADR-0044 cobre** |
| Serviços/médicos/convênios | ❌ Não fornece | ✅ Extratores dedicados | **ADR-0044 cobre** |
| Design DNA (cores, fontes, UX) | ❌ Não fornece | ✅ CSS/HTML analysis | **ADR-0044 cobre** |

---

## 1. Contexto

O L2 atual (`on_page_instant_pages` + `domain_technologies` via DataForSEO) cobre métricas **técnicas** do website (Lighthouse, CMS, analytics, meta tags), mas não extrai o **conteúdo textual e visual** — o que a clínica diz sobre si mesma, quais serviços oferece, qual a identidade visual, se o design é profissional ou amador.

Isso limita o scoring a dados de superfície. Precisamos de **engenharia reversa do DNA da marca** a partir do HTML/CSS do site para enriquecer os leads com:
- Dados estruturados da clínica (telefones, médicos, convênios)
- Sinais de maturidade digital (design, conteúdo, UX)
- Design tokens extraíveis (cores, tipografia, componentes)
- Diagnóstico de marca para propostas de redesign

Avaliamos duas abordagens:

| Abordagem | RAM | Dependências |
|-----------|-----|-------------|
| **Firecrawl Self-Hosted** (Docker) | ~2 GB | 5 containers |
| **Crawler Modular .TS + DeepSeek cirúrgica** | ~20 MB | cheerio + turndown + fast-xml-parser |

---

## 2. Situação do hardware

```
RAM Total:      7.0 GB
RAM Disponível: 1.2 GB
Swap:           7.5 GB (6.2 GB em uso — já swappando pesado)
Containers:     6 ativos
```

Firecrawl Docker (+2 GB) **não cabe**. Módulos .TS usam ~20 MB.

---

## 3. Decisão

**Crawler modular TypeScript com 5 níveis de extração e LLM (DeepSeek) apenas nos casos de baixa confiança.** Firecrawl fica como **referência de API surface**, não como infra.

### 3.1 Princípios de design

1. **Parse estruturado primeiro, LLM por último** — regex + cheerio resolvem 90%+ dos casos a $0
2. **LLM cirúrgica, não massiva** — só quando confidence < 95%, com contexto reduzido (4K tokens, não 180K)
3. **LLM gera regras, não apenas extrai** — outputs viram novas Strategies que alimentam o crawler
4. **Estratégias por plataforma** — WordPress ≠ Wix ≠ Doctoralia ≠ SPA React
5. **Fallback progressivo para SPAs** — JSON-LD → `__NEXT_DATA__` → hydration state → Playwright (só como último recurso)

---

## 4. Arquitetura

### 4.1 Pipeline principal

```
URL (website do lead)
 │
 ▼
┌─────────────────────────────────────────────────────────┐
│ CAMADA 0 · STRATEGY RESOLVER                            │
│ Identifica a plataforma do site:                        │
│   WordPress · Wix · GoogleSites · Doctoralia            │
│   React/Next · LandingPage · Unknown                    │
│ Seleciona a CrawlStrategy correta.                      │
└─────────────────────────────────────────────────────────┘
 │
 ▼
┌─────────────────────────────────────────────────────────┐
│ CAMADA 1 · FETCHER                                      │
│ fetch() com:                                            │
│   ├── gzip / brotli decompression                       │
│   ├── keep-alive connection pool                        │
│   ├── user-agent rotation (mobile/desktop/bot)          │
│   ├── timeout 5s + retry 1x + redirect follow           │
│   └── robots.txt opcional (courtesy delay)              │
└─────────────────────────────────────────────────────────┘
 │
 ▼
┌─────────────────────────────────────────────────────────┐
│ CAMADA 2 · PARSER (cheerio)                             │
│ Extrai todas as fontes de dados estruturados:           │
│   ├── JSON-LD (schema.org)                              │
│   ├── Microdata (itemprop)                              │
│   ├── OpenGraph (og:*)                                  │
│   ├── Meta tags (description, keywords, viewport)       │
│   ├── __NEXT_DATA__ (SPA React/Next)                    │
│   ├── __INITIAL_STATE__ (hydration SPA)                 │
│   ├── CSS custom properties (--primary, --font, etc.)   │
│   ├── <style> tags & inline styles                      │
│   ├── Font imports (Google Fonts, Adobe, self-hosted)   │
│   ├── SVG inline, <img> sources, favicon                │
│   └── HTML body text (para NLP)                         │
└─────────────────────────────────────────────────────────┘
 │
 ▼
┌─────────────────────────────────────────────────────────┐
│ CAMADA 3 · EXTRACTORS (modulares)                       │
│ Cada extrator é independente e retorna JSON:            │
│                                                         │
│ contact-extractor.ts                                    │
│   → { phones, emails, whatsapp, address }               │
│                                                         │
│ services-extractor.ts                                   │
│   → { specialties, procedures, categories }             │
│                                                         │
│ insurance-extractor.ts                                  │
│   → { acceptsInsurance, plans[], hasPartnerPage }       │
│                                                         │
│ staff-extractor.ts                                      │
│   → { doctors: [{name, crm, specialty}], team }         │
│                                                         │
│ social-extractor.ts                                     │
│   → { instagram, facebook, tiktok, youtube, linkedin }  │
│                                                         │
│ booking-extractor.ts                                    │
│   → { hasBooking, platform, url }                       │
│                                                         │
│ design-extractor.ts ← NOVO · Brand DNA                  │
│   → { colors, typography, spacing, radius, shadows,     │
│        iconography, photography, illustration }         │
│                                                         │
│ component-extractor.ts ← NOVO · Component DNA           │
│   → { buttons, cards, forms, nav, hero, footer, CTAs }  │
│                                                         │
│ ux-extractor.ts ← NOVO · UX DNA                         │
│   → { hierarchy, navigation, readability, a11y,         │
│        consistency, perceivedPerformance }              │
└─────────────────────────────────────────────────────────┘
 │
 ▼
┌─────────────────────────────────────────────────────────┐
│ CAMADA 4 · NORMALIZER                                   │
│ Padroniza dados extraídos:                              │
│   "(11) 98888-9999" → "+5511988889999"                  │
│   "Clínica Geral / Clínico Geral" → ["Clínica Geral"]   │
│   "Atendemos Unimed, Bradesco" → [{name, normalized}]   │
│                                                         │
│ Se confidence ≥ 95% → salva direto                      │
│ Se confidence < 95% → envia para DeepSeek (4K tokens)   │
└─────────────────────────────────────────────────────────┘
 │
 ▼
┌─────────────────────────────────────────────────────────┐
│ CAMADA 5 · DEEPSEEK (cirúrgica, só se necessário)       │
│                                                         │
│ Funções:                                                │
│   1. Normalizador: padroniza dados ambíguos             │
│   2. Classificador: identifica categorias não mapeadas  │
│   3. Extrator de campos novos: descobre o que não foi   │
│      programado (ex: médicos, convênios, premiações)    │
│   4. Gerador de regras: cria novas Strategies que       │
│      alimentam o crawler para próximos sites iguais     │
│                                                         │
│ Input: HTML reduzido (~4K tokens, só sections relevantes)│
│ Output: JSON estruturado + confidence score             │
│ Custo: ~$0.0002/chamada (DeepSeek V3)                  │
│ Taxa de uso: < 5% dos leads                             │
└─────────────────────────────────────────────────────────┘
 │
 ▼
┌─────────────────────────────────────────────────────────┐
│ CAMADA 6 · PERSISTÊNCIA                                 │
│   ├── Supabase: PATCH discovery_listings                │
│   ├── Redis:   SET adsentice:l2:content:{domain}       │
│   │            TTL 24h (cache cross-lead)               │
│   └── Learning: novas Strategies → brain/semantic-reg   │
└─────────────────────────────────────────────────────────┘
```

### 4.2 Strategy Pattern — por plataforma

```typescript
interface CrawlStrategy {
  name: string
  canHandle(html: string, url: string, headers: Headers): boolean
  extract($: CheerioAPI, html: string): ClinicData
  confidence(data: ClinicData): number  // 0-100
}

// Implementações:
class WordPressStrategy implements CrawlStrategy { ... }
class WixStrategy implements CrawlStrategy { ... }
class GoogleSitesStrategy implements CrawlStrategy { ... }
class DoctoraliaStrategy implements CrawlStrategy { ... }
class LandingPageStrategy implements CrawlStrategy { ... }
class ReactSPAFallbackStrategy implements CrawlStrategy { ... }
class GenericStrategy implements CrawlStrategy { ... }
```

A `StrategyResolver` detecta automaticamente:
- **WordPress:** `/wp-content/`, `/wp-json/`, class `wp-*`, generator meta
- **Wix:** `wix.com`, `_wix`, `wixstatic`
- **GoogleSites:** `sites.google.com`, class `g-sites`
- **Doctoralia:** `doctoralia.com.br`
- **React/Next:** `__NEXT_DATA__`, `react-root`, `_next`
- **LandingPage:** página única, sem navegação, muitos CTAs
- **Generic:** fallback para o pipeline padrão

### 4.3 SPA Fallback Chain

```
fetch() → tem HTML?
  │
  ├── SIM → tem JSON-LD?
  │          ├── SIM → extrai estruturado ✅
  │          └── NÃO → tem __NEXT_DATA__?
  │                     ├── SIM → JSON.parse + extrai ✅
  │                     └── NÃO → tem __INITIAL_STATE__?
  │                                ├── SIM → parse hydration ✅
  │                                └── NÃO → Playwright (último recurso) 🔴
  │
  └── NÃO → site offline → fallback null, sem penalizar scoring
```

**Expectativa de cobertura:**
```
1000 sites de clínica:
  ├── 700 fetch normal (SSR WordPress/Wix/etc.)    → $0, 1-3s
  ├── 180 JSON-LD (schema.org estruturado)          → $0, 1s
  ├── 80  __NEXT_DATA__ (SPA com dados expostos)    → $0, 1s
  ├── 30  hydration state (SPA com estado inline)   → $0, 2s
  └── 10  Playwright (SPA opaca, SPA pura)         → $0, 5-10s (local)

Custo LLM: ~5% dos casos → ~$0.0002 × 50 leads = $0.01/mês
```

### 4.4 Sistema de 4 níveis de extração

| Nível | Técnica | Cobertura | Custo |
|-------|---------|-----------|-------|
| **N1** | Regex (telefone, e-mail, CPF, CRM, CEP) | 50-60% | $0 |
| **N2** | Cheerio + JSON-LD + Schema + OG | 85-90% | $0 |
| **N3** | Heurísticas (estratégias por plataforma) | 93-97% | $0 |
| **N4** | DeepSeek (cirúrgica, só baixa confiança) | 100% | < $0.01/mês |

### 4.5 Learning Loop — LLM gera regras

```
Site desconhecido → DeepSeek analisa →
  └── output: "telefone sempre em .contact-info > span.phone"
       └── salva como nova Strategy
            └── próximos 50 sites iguais → $0 (não chama LLM)
```

Isso significa que o sistema **melhora com o tempo** e a dependência da LLM **diminui** progressivamente.

---

## 5. Módulos de Design DNA (novos)

Além dos extratores de dados de negócio, implementamos extratores de **DNA de marca** — transformam o site em um retrato estruturado da identidade visual.

### 5.1 Brand DNA

```typescript
// design-extractor.ts
interface BrandDNA {
  personality: {
    tone: "institucional" | "popular" | "premium" | "infantil" | "técnico"
    emotion: "confiança" | "inovação" | "acolhimento" | "autoridade"
    positioning: "premium" | "acessível" | "popular" | "luxo"
  }
  colors: {
    primary: string       // cor dominante (extraída do CSS/header)
    secondary: string     // cor secundária
    accent: string        // cor de destaque (CTAs)
    surface: string       // fundo
    textPrimary: string   // cor do texto principal
  }
  typography: {
    heading: string       // nome da fonte (Google Fonts ou self-hosted)
    body: string          // fonte do corpo
    scale: string[]       // tamanhos em uso
    weights: number[]     // pesos em uso
  }
  spacing: {
    scale: number[]       // múltiplos de espaçamento detectados
    unit: "px" | "rem" | "mixed"
  }
  visualStyle: {
    radius: "sharp" | "soft" | "rounded" | "pill"
    shadow: "none" | "subtle" | "medium" | "strong"
    photography: "human-centered" | "facility" | "stock" | "none"
    illustration: "medical-flat" | "abstract" | "none"
    iconography: "outline" | "filled" | "custom" | "emoji"
  }
}
```

### 5.2 Component DNA

```typescript
// component-extractor.ts
interface ComponentDNA {
  button: {
    variants: string[]     // "primary", "secondary", "outline"
    styles: { radius, padding, fontSize, fontWeight }
  }
  card: {
    detected: boolean
    styles: { radius, shadow, padding }
  }
  form: {
    detected: boolean
    style: "material" | "bootstrap" | "custom"
  }
  nav: {
    type: "top" | "side" | "hamburger" | "none"
    sticky: boolean
  }
  hero: {
    detected: boolean
    type: "image" | "video" | "text-only" | "slider"
  }
  footer: {
    columns: number
    hasSitemap: boolean
    hasSocialLinks: boolean
  }
}
```

### 5.3 UX DNA

```typescript
// ux-extractor.ts
interface UXDNA {
  hierarchy: {
    clarity: 0-100      // headings bem estruturados? h1→h2→h3?
    consistency: 0-100  // mesmos padrões em todas as páginas?
  }
  navigation: {
    depth: number        // quantos cliques para informação importante?
    hasBreadcrumb: boolean
    hasSearch: boolean
  }
  readability: {
    contrastRatio: number
    fontSize: number     // body text, em px
    lineHeight: number
  }
  accessibility: {
    hasAltText: boolean       // imagens têm alt?
    hasAriaLabels: boolean    // elementos interativos têm aria?
    tabbable: boolean         // navegável por teclado?
    wcagLevel: "A" | "AA" | "AAA" | "unknown"
  }
  perceivedPerformance: {
    hasLazyLoading: boolean
    hasPreconnect: boolean
    fontDisplay: "swap" | "block" | "fallback" | "unknown"
  }
}
```

### 5.4 AI Redesign — o output final

```typescript
// ai-redesign.ts
interface AIRedesign {
  score: number                    // 0-100, nota geral do design
  diagnosis: string[]              // bullets do que está bom/ruim
  opportunities: string[]          // sugestões priorizadas de melhoria
  designTokens: DesignTokens       // exportável para Figma/ código
  components: {
    missing: string[]              // componentes que deveriam existir
    improvised: string[]           // componentes que parecem "gambiarras"
    suggested: ComponentSpec[]     // specs de componentes sugeridos
  }
  strategicInsights: {
    seemsPremium: boolean
    seemsPopular: boolean
    seemsTrustworthy: boolean
    seemsAuthoritative: boolean
    isVisuallyOutdated: boolean
    isConsistent: boolean
    alignsWithTargetAudience: boolean
  }
  roadmap: {
    quickWins: string[]            // correções de 5min
    thisMonth: string[]            // melhorias de médio prazo
    nextQuarter: string[]          // redesign estrutural
  }
  promptForRegeneration: string    // prompt pronto para gerar novo design
}
```

---

## 6. Estrutura de arquivos

```
apps/web/src/lib/l2-content/
├── strategy-resolver.ts      ← detecta plataforma, seleciona estratégia
├── site-fetcher.ts            ← fetch() robusto com retry, gzip, UA rotation
├── parser.ts                  ← cheerio: unifica JSON-LD + OG + microdata + CSS
├── extractors/
│   ├── contact-extractor.ts   ← telefones, e-mails, WhatsApp, endereço
│   ├── services-extractor.ts  ← especialidades, procedimentos
│   ├── insurance-extractor.ts ← convênios, planos
│   ├── staff-extractor.ts     ← médicos, CRM, equipe
│   ├── social-extractor.ts    ← Instagram, Facebook, TikTok, YouTube
│   ├── booking-extractor.ts   ← agendamento online, plataforma
│   ├── design-extractor.ts    ← Brand DNA (cores, tipografia, estilo)
│   ├── component-extractor.ts ← Component DNA (botões, cards, forms)
│   └── ux-extractor.ts        ← UX DNA (hierarquia, a11y, legibilidade)
├── normalizer.ts              ← padronização + confidence score
├── deepseek-fallback.ts       ← LLM cirúrgica (só low confidence, 4K tokens)
├── ai-redesign.ts             ← diagnóstico + design tokens + sugestões
├── confidence.ts              ← scoring de confiança por campo extraído
├── cache.ts                   ← Redis adsentice:l2:content:{domain} TTL 24h
├── l2-content-enricher.ts     ← orquestrador principal
└── strategies/
    ├── base-strategy.ts        ← interface CrawlStrategy
    ├── wordpress-strategy.ts
    ├── wix-strategy.ts
    ├── google-sites-strategy.ts
    ├── doctoralia-strategy.ts
    ├── landing-page-strategy.ts
    ├── react-spa-strategy.ts
    └── generic-strategy.ts
```

---

## 7. Sinais de scoring (atuais + novos)

### 7.1 Sinais existentes (mantidos)

| ID | Nome | Origem | Peso |
|----|------|--------|------|
| F3 | Tem website | L0 DataForSEO | 2-10pts |
| W2-W6, W8 | SEO técnico | L2 DataForSEO | 43pts total |

### 7.2 Novos sinais de conteúdo (C1-C8)

| ID | Nome | Condição | Peso | Bloco |
|----|------|---------|------|-------|
| **C1** | Site vazio (word_count < 200) | word_count < 200 | 5pts | Fit |
| **C2** | Não mostra preços | !hasPrices | 5pts | Fit |
| **C3** | Sem página de contato | !hasContact | 10pts | Fit |
| **C4** | Tem agendamento online | hasBooking | 10pts | Engagement |
| **C5** | WhatsApp link no site | hasWhatsAppLink | 8pts | Engagement |
| **C6** | Landing pages por serviço (>2) | servicePagesFound > 2 | 12pts | Engagement |
| **C7** | Tem depoimentos/galeria | hasTestimonials | 8pts | Engagement |
| **C8** | Blog ativo (< 90 dias) | blogActive | 10pts | Engagement |

### 7.3 Novos sinais de design (D1-D7)

| ID | Nome | Condição | Peso | Bloco |
|----|------|---------|------|-------|
| **D1** | Design profissional (score ≥ 70) | designScore ≥ 70 | 15pts | Engagement |
| **D2** | Design amador (score < 30) | designScore < 30 | 10pts | Fit (gap) |
| **D3** | Identidade consistente | uxDNA.consistency ≥ 70 | 10pts | Engagement |
| **D4** | Boa acessibilidade (WCAG AA+) | uxDNA.wcagLevel ≥ AA | 8pts | Engagement |
| **D5** | Design datado (> 5 anos) | visualStyle.outdated | 8pts | Fit (gap) |
| **D6** | Schema.org LocalBusiness | hasSchemaOrg | 5pts | Engagement |
| **D7** | Redes sociais linkadas no site | socialLinksFound ≥ 2 | 5pts | Engagement |

**Total: +129 pontos ao maxRaw (93 → 222 no Engagement).**

---

## 8. Colunas Supabase (migration 021)

```sql
-- Bloco: extração de conteúdo
ALTER TABLE discovery_listings ADD COLUMN l2_content_extracted BOOLEAN DEFAULT false;
ALTER TABLE discovery_listings ADD COLUMN l2_content_mined_at TIMESTAMPTZ;
ALTER TABLE discovery_listings ADD COLUMN l2_content_word_count INTEGER;
ALTER TABLE discovery_listings ADD COLUMN l2_content_services TEXT[] DEFAULT '{}';
ALTER TABLE discovery_listings ADD COLUMN l2_content_has_prices BOOLEAN;
ALTER TABLE discovery_listings ADD COLUMN l2_content_has_booking BOOLEAN;
ALTER TABLE discovery_listings ADD COLUMN l2_content_has_whatsapp BOOLEAN;
ALTER TABLE discovery_listings ADD COLUMN l2_content_social_links JSONB DEFAULT '[]';
ALTER TABLE discovery_listings ADD COLUMN l2_content_has_testimonials BOOLEAN;
ALTER TABLE discovery_listings ADD COLUMN l2_content_has_schema_org BOOLEAN;
ALTER TABLE discovery_listings ADD COLUMN l2_content_page_count INTEGER;
ALTER TABLE discovery_listings ADD COLUMN l2_content_confidence INTEGER DEFAULT 0; -- 0-100

-- Bloco: Blog & Conteúdo
ALTER TABLE discovery_listings ADD COLUMN l2_blog_active BOOLEAN;
ALTER TABLE discovery_listings ADD COLUMN l2_blog_last_post_date DATE;

-- Bloco: Design DNA
ALTER TABLE discovery_listings ADD COLUMN l2_brand_dna JSONB;        -- BrandDNA
ALTER TABLE discovery_listings ADD COLUMN l2_component_dna JSONB;    -- ComponentDNA
ALTER TABLE discovery_listings ADD COLUMN l2_ux_dna JSONB;           -- UXDNA
ALTER TABLE discovery_listings ADD COLUMN l2_design_score INTEGER;   -- 0-100
ALTER TABLE discovery_listings ADD COLUMN l2_ai_redesign JSONB;      -- AIRedesign

-- Bloco: Staff & Insurance (novos extratores)
ALTER TABLE discovery_listings ADD COLUMN l2_staff_doctors JSONB DEFAULT '[]';
ALTER TABLE discovery_listings ADD COLUMN l2_insurance_plans TEXT[] DEFAULT '{}';
ALTER TABLE discovery_listings ADD COLUMN l2_content_emails TEXT[] DEFAULT '{}';

-- Bloco: Narrativa
ALTER TABLE discovery_listings ADD COLUMN l2_content_lead_story TEXT;
ALTER TABLE discovery_listings ADD COLUMN l2_content_signals JSONB DEFAULT '[]';
```

---

## 9. Cache e Performance

### 9.1 Cache cross-lead

```typescript
const domain = new URL(website).hostname
const cacheKey = `adsentice:l2:content:${domain}`
// TTL 24h — sites não mudam a cada hora
// Múltiplos leads no mesmo domínio (franquias) batem cache
```

### 9.2 HTTP optimizations

```typescript
// site-fetcher.ts — fetch com capacidades de navegador
const res = await fetch(url, {
  headers: {
    'Accept-Encoding': 'gzip, br',           // compressão automática
    'Accept-Language': 'pt-BR,pt;q=0.9',
    'User-Agent': pickUserAgent(),           // rotação entre 5 UAs
    'Connection': 'keep-alive',
  },
  signal: AbortSignal.timeout(5000),
  redirect: 'follow',
})
// Node.js descomprime gzip/brotli automaticamente
```

### 9.3 Estimativa de performance

```
1 lead individual:    fetch (1-3s) + parse (0.2s) + extract (0.1s) = 1.5-3.5s
100 leads batch:      cache reduz 40%+ (domínios repetidos) = 60-180s
1.000 leads batch:    cache reduz 60%+ = 400-600s (~10 min)

Pico de RAM durante batch: ~25 MB
```

---

## 10. Custo

| Recurso | Custo/lead | Custo/mês (1000 leads) |
|---------|-----------|------------------------|
| DataForSEO L2 (métricas técnicas) | $0.012 | $12 |
| Módulos .TS (extração) | $0 | $0 |
| DeepSeek V3 (normalização, ~5% casos) | ~$0.0002 | $0.10 |
| Redis cache | $0 (existente) | $0 |
| Supabase | $0 (existente) | $0 |
| **Total** | **$0.0122** | **$12.10** |

Comparação: L2+L3 DataForSEO puro = **$0.112/lead = $112/mês**. Economia de **89%**.

---

## 11. Riscos

| Risco | Prob. | Mitigação |
|-------|-------|----------|
| SPA não expõe dados (10% dos sites) | Média | Fallback progressivo: JSON-LD → `__NEXT_DATA__` → hydration → Playwright |
| Site bloqueia fetch (WAF/Cloudflare) | Baixa | Fallback null, sem penalizar scoring. DataForSEO cobre métricas técnicas. |
| DeepSeek custo escapa (>5% de uso) | Muito baixa | Confidence threshold ajustável. Monitorar taxa de chamadas LLM. |
| DOM muito grande (>5 MB HTML) | Baixa | Truncar body text a 50KB. Só enviar sections relevantes para LLM. |
| Cache stale 24h | Baixa | TTL curto, invalidar no re-discovery. |
| Design DNA impreciso (CSS não reflete realidade) | Média | Score de confiança no Brand DNA. Se < 70, não usar para scoring. |

---

## 12. Verificação

1. **site-fetcher.ts** buscar URL real → deve retornar HTML em < 5s com gzip
2. **strategy-resolver.ts** identificar 5 URLs (WP, Wix, GoogleSites, SPA, Doctoralia)
3. **extractors/** extrair telefones, e-mails, redes sociais de HTML mock
4. **design-extractor.ts** extrair cores, fontes, spacing de HTML com CSS inline
5. **normalizer.ts** padronizar 10 telefones em formatos diferentes
6. **deepseek-fallback.ts** testar com HTML de baixa confiança (< 95%)
7. **ai-redesign.ts** gerar diagnóstico + design tokens de site real
8. **l2-content-enricher.ts** executar em lead real → PATCH Supabase + SET Redis cache
9. Scoring recalcular com novos sinais C1-C8 + D1-D7

---

## 13. Fases de implementação

| Fase | Escopo | Tempo | Dependência |
|------|-------|-------|------------|
| **Fase 1** | Core: fetcher + parser + strategy-resolver + cache | 1.5h | npm install turndown fast-xml-parser |
| **Fase 2** | Extractors: contact, services, social, booking | 2h | Fase 1 |
| **Fase 3** | Extractors: staff, insurance + normalizer + confidence | 2h | Fase 2 |
| **Fase 4** | Design DNA: design-extractor + component-extractor + ux-extractor | 2h (vsforge blueprint) | Fase 1 |
| **Fase 5** | DeepSeek fallback + AI Redesign | 2h | Fase 3 + 4 |
| **Fase 6** | Migration 021 + Wire scoring (C1-C8, D1-D7) | 1.5h | Fase 3 + 4 |
| **Fase 7** | L2-content-enricher (orquestrador) + pipeline wire | 1.5h | Fase 5 + 6 |
| **Fase 8** | LeadTable: seções "📝 Conteúdo" + "🎨 Design DNA" no modal | 2h | Fase 7 |
| **Fase 9** | Learning loop: DeepSeek → Strategies | 2h | Fase 5 |

**Total: ~12h (vsforge economiza ~5.5h na Fase 4). Custo: $0/mês (sem DeepSeek) ou < $0.10/mês (com DeepSeek).**

---

## 14. Próximos passos

- [x] ADR-0044 escrita (v2 expandida)
- [ ] `npm install turndown fast-xml-parser`
- [ ] Implementar Fase 1 (core)
- [ ] Implementar Fases 2-3 (extractors)
- [ ] Implementar Fase 4 (Design DNA)
- [ ] Implementar Fase 5 (DeepSeek cirúrgica)
- [ ] Migration 021 + wire scoring
- [ ] L2-content-enricher + pipeline wire
- [ ] LeadTable UI para conteúdo + design
- [ ] Learning loop
