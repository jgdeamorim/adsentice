# ADR-0045 · Playbook S11-MK → S11K · MockUp ReBrand Técnico + Landing Page

**Status:** ACCEPTED
**Date:** 2026-07-19
**Author:** jeffer + Claude Opus 4.8
**Supersedes:** Nenhum (novo)
**Extends:** ADR-0037 (S11 A/B estratégia), ADR-0044 (L2b crawler), ADR-0024 (L4 IBGE), ADR-0028 (L5 CNPJ)
**Sources:** composeS11() live (warp-composer.ts), generateLandingCopy() (deepseek.ts), análise L2b ADR-0044

---

## 1. Contexto

O S11 atual (`composeS11()`, v084, 2/22 surfaces) gera landing pages A/B com dados parcialmente genéricos — o NICHO_MAP fornece especialidades, dores e triggers hardcoded por segmento. O cliente recebe uma landing page que **parece template** porque não reflete a realidade da clínica.

Com a ADR-0044 (L2b crawler .TS), passamos a ter:
- **Serviços REAIS** extraídos do site da clínica
- **Médicos REAIS** com nome e CRM
- **Brand DNA** (cores, fontes, componentes) da marca real
- **Preços e convênios** (se visíveis no site)
- **Diagnóstico de design** (AI Redesign)

Isso desbloqueia um modelo de **funil em 2 etapas**:

```
ETAPA 1 · S11-MK · ANTES DE VENDER
  MockUp ReBrand Técnico — proposta visual que o vendedor usa
  Custo: ~$0.001 (só DeepSeek) · Tempo: segundos

ETAPA 2 · S11K · DEPOIS DE VENDIDO
  Landing Page Técnica com SEO real + competitive intel
  Custo: ~$0.093 (DataForSEO L2a+L3 + DeepSeek) · Tempo: segundos
```

---

## 2. Decisão

**Criar o playbook S11 em 2 etapas: S11-MK (proposta mockup pré-venda, $0.001) e S11K (landing page técnica pós-venda, $0.093).**

Ambas usam o Warp Composer existente (`composeS11()`) como engine, mas com inputs e custos diferentes porque o MOMENTO do funil é diferente:

- **Pré-venda** (S11-MK): o vendedor precisa de uma **proposta visual rápida** para convencer. Custo precisa ser quasi-zero porque vai gerar para muitos leads que NÃO vão converter.
- **Pós-venda** (S11K): o cliente já pagou. A landing page precisa de **SEO técnico real** e **inteligência competitiva**. Custo de $0.093 é irrelevante porque o plano já cobre (Sentinela R$197, Domínio R$497).

---

## 3. Arquitetura do Playbook

```
┌──────────────────────────────────────────────────────────────────────┐
│                    PLAYBOOK S11 · FUNIL COMPLETO                      │
│                                                                      │
│  LEAD NO CRM                                                         │
│  (descoberto via Discovery L0)                                       │
│       │                                                              │
│       ▼                                                              │
│  ╔══════════════════════════════════════════════════════════════════╗ │
│  ║         S11-MK · MOCKUP ReBRAND TÉCNICO (PRÉ-VENDA)             ║ │
│  ║         Custo: ~$0.001 · Tempo: ~5s                              ║ │
│  ╠══════════════════════════════════════════════════════════════════╣ │
│  ║                                                                  ║ │
│  ║  INPUTS:                                                         ║ │
│  ║  ├── L0  · GMB Data (nome, rating, fotos, endereço)      $0     ║ │
│  ║  ├── L2b · Brand DNA (cores, fontes, componentes)        $0     ║ │
│  ║  ├── L2b · Conteúdo (serviços, médicos, redes sociais)   $0     ║ │
│  ║  ├── L4  · IBGE (renda bairro, PIB per capita)          $0     ║ │
│  ║  └── DeepSeek · Análise qualitativa + copy              ~$0.001  ║ │
│  ║                                                                  ║ │
│  ║  PROCESSAMENTO:                                                  ║ │
│  ║  ├── AI Redesign: diagnostica o site atual                      ║ │
│  ║  ├── Brand DNA → Tokens → MockUp visual                         ║ │
│  ║  ├── DeepSeek: narrativa "antes vs depois"                      ║ │
│  ║  └── Gera proposta visual comparativa                            ║ │
│  ║                                                                  ║ │
│  ║  OUTPUT (Proposta Comercial):                                    ║ │
│  ║  ├── 📊 Diagnóstico do site atual (score 0-100)                 ║ │
│  ║  ├── 🎨 Antes/Depois visual (cores, tipografia, layout)         ║ │
│  ║  ├── 🧩 Componentes problemáticos detectados                    ║ │
│  ║  ├── 📝 Oportunidades priorizadas (quick wins → estratégico)    ║ │
│  ║  ├── 💰 Projeção de impacto (tráfego estimado, conversão)       ║ │
│  ║  ├── 🎯 Dados REAIS: "Dra. Ana, CRM 12345, Unimed, Bradesco"   ║ │
│  ║  ├── 🏙️ Contexto IBGE: "Seu bairro tem renda média R$2.300"    ║ │
│  ║  └── 🔗 CTA: "Contrate o plano Sentinela (R$197/mês)"          ║ │
│  ║                                                                  ║ │
│  ╚══════════════════════════════════════════════════════════════════╝ │
│       │                                                              │
│       │ Vendedor envia S11-MK para o lead                            │
│       │ Lead VÊ o antes/depois com dados REAIS                       │
│       │                                                              │
│       ├── NÃO CONVERTEU → lead volta pro CRM, custo foi só $0.001   │
│       │                                                              │
│       └── CONVERTEU! → cliente contratou                             │
│              │                                                       │
│              ▼                                                       │
│  ╔══════════════════════════════════════════════════════════════════╗ │
│  ║         S11K · LANDING PAGE TÉCNICA (PÓS-VENDA)                  ║ │
│  ║         Custo: ~$0.093 · Tempo: ~8s                               ║ │
│  ╠══════════════════════════════════════════════════════════════════╣ │
│  ║                                                                  ║ │
│  ║  INPUTS (tudo do S11-MK + camadas adicionais):                   ║ │
│  ║  ├── L0  · GMB Data                                    $0       ║ │
│  ║  ├── L2a · SEO Técnico (Lighthouse, CMS, meta tags)    $0.012   ║ │
│  ║  ├── L2b · Brand DNA + Conteúdo + Design DNA           $0       ║ │
│  ║  ├── L3  · Competitive Intel (backlinks, SOV, keywords) $0.08   ║ │
│  ║  ├── L4  · IBGE Market Context                         $0       ║ │
│  ║  ├── L5  · CNPJ (se disponível no site)                $0       ║ │
│  ║  ├── Wa  · WhatsApp check (Evolution API)              $0       ║ │
│  ║  └── DeepSeek · Copy otimizada                        ~$0.001   ║ │
│  ║                                                                  ║ │
│  ║  PROCESSAMENTO:                                                  ║ │
│  ║  ├── StrategyResolver com TODOS os dados (8 facets)             ║ │
│  ║  ├── TokenComposer M9 com Brand DNA REAL da marca               ║ │
│  ║  ├── composeLayout com morph corpus-driven                       ║ │
│  ║  ├── generateLandingCopy com dados REAIS (serviços, médicos)    ║ │
│  ║  ├── renderS11_GREEN com SEO técnico otimizado                  ║ │
│  ║  └── Schema.org JSON-LD + meta tags + OG tags                   ║ │
│  ║                                                                  ║ │
│  ║  OUTPUT (Landing Page Publicada):                                ║ │
│  ║  ├── 🌐 Landing Page A/B (2 variantes, SEO otimizado)           ║ │
│  ║  ├── 🎨 Design System tokens exportáveis (Figma/CSS)            ║ │
│  ║  ├── 📊 SEO Audit Report (Lighthouse integrado)                 ║ │
│  ║  ├── 📄 Proposta comercial detalhada (PDF)                      ║ │
│  ║  ├── 📈 Tracking de conversão (L7 analytics)                    ║ │
│  ║  └── 🔄 A/B test: qual variante converte mais?                  ║ │
│  ║                                                                  ║ │
│  ╚══════════════════════════════════════════════════════════════════╝ │
│       │                                                              │
│       ▼                                                              │
│  ╔══════════════════════════════════════════════════════════════════╗ │
│  ║  L7 · MENSURAÇÃO + FEEDBACK                                      ║ │
│  ║  ├── Tracking: CTR, taxa de conversão, origem do tráfego         ║ │
│  ║  ├── A/B winner: qual variante converteu mais?                   ║ │
│  ║  ├── Learning → novas Strategies (alimenta L2b + S11)            ║ │
│  ║  └── Relatório mensal automático pro cliente                     ║ │
│  ╚══════════════════════════════════════════════════════════════════╝ │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 4. S11-MK · MockUp ReBrand Técnico (PRÉ-VENDA)

### 4.1 Propósito

Convencer o lead de que o adsentice **conhece a clínica dele** melhor que qualquer concorrente — porque usamos dados REAIS extraídos do site dele, não template genérico.

### 4.2 Inputs

| Camada | Dado | Fonte | Custo |
|--------|------|-------|-------|
| L0 | Nome, categoria, rating, reviews, fotos, endereço | Supabase (já existe) | $0 |
| L2b | Serviços reais (extraídos do site) | `html-miner.ts` (ADR-0044) | $0 |
| L2b | Médicos: nome + CRM | `staff-extractor.ts` (ADR-0044) | $0 |
| L2b | Convênios aceitos | `insurance-extractor.ts` (ADR-0044) | $0 |
| L2b | Redes sociais (Instagram, Facebook) | `social-extractor.ts` (ADR-0044) | $0 |
| L2b | Brand DNA: cores, fontes, componentes | `design-extractor.ts` (ADR-0044) | $0 |
| L2b | UX DNA: hierarquia, acessibilidade, legibilidade | `ux-extractor.ts` (ADR-0044) | $0 |
| L4 | Renda média do bairro, PIB per capita | Supabase `ibge_panorama` | $0 |
| — | DeepSeek: análise qualitativa | `deepseek.ts` | ~$0.001 |

### 4.3 Processamento

```typescript
// s11-mk.ts — MockUp ReBrand Técnico (PRÉ-VENDA)
export async function composeS11MK(placeId: string): Promise<S11MKResult> {
  // 1. Lead (L0 — Supabase)
  const lead = await fetchLead(placeId)

  // 2. L2b Content + Design DNA (ADR-0044)
  const l2b = lead.website
    ? await enrichL2bContent(lead.website)   // crawler .TS · $0
    : null

  // 3. L4 IBGE Context
  const l4 = await enrichL4IBGE(lead.city)   // Supabase · $0

  // 4. AI Redesign — diagnóstico do site atual
  const diagnosis = await analyzeDesignDNA({
    brandDNA: l2b?.brandDNA,
    componentDNA: l2b?.componentDNA,
    uxDNA: l2b?.uxDNA,
    services: l2b?.services,
    doctors: l2b?.doctors,
    ibge: l4,
  })  // DeepSeek · ~$0.001

  // 5. MockUp visual (antes/depois)
  const mockup = await generateRebrandMockup({
    current: l2b?.brandDNA,     // cores atuais do site
    services: l2b?.services,    // serviços REAIS
    doctors: l2b?.doctors,      // médicos REAIS
    segment: classifySegment(lead.category),
    ibge: l4,
  })

  // 6. Proposta comercial
  return {
    diagnosis,    // o que está ruim
    mockup,       // como ficaria
    opportunities: diagnosis.opportunities,
    projection: diagnosis.roiProjection,
    realData: {
      name: lead.title,
      rating: lead.rating_value,
      reviews: lead.rating_votes,
      services: l2b?.services || [],
      doctors: l2b?.doctors || [],
      insurance: l2b?.insurance || [],
      instagram: l2b?.socialLinks?.instagram,
      neighborhoodIncome: l4?.rendaMedia,
    },
    cta: {
      plan: resolvePlan(diagnosis.score),
      price: resolvePlanPrice(diagnosis.score),
      message: buildCTA(diagnosis, lead),
    },
  }
}
```

### 4.4 Output — Estrutura da Proposta

```typescript
interface S11MKResult {
  // ── Diagnóstico ──
  diagnosis: {
    score: number                    // 0-100, nota do site atual
    level: "crítico" | "ruim" | "regular" | "bom" | "excelente"
    topIssues: string[]              // top 5 problemas ( bullets)
    quickWins: string[]              // correções de 5min
    strategicGaps: string[]          // problemas estruturais
  }

  // ── MockUp Visual (Antes/Depois) ──
  mockup: {
    before: {
      colors: { primary, secondary, accent, surface }
      fonts: { heading, body }
      components: { button, card, nav, hero }
      score: number                  // 0-100
    }
    after: {
      colors: { primary, secondary, accent, surface }
      fonts: { heading, body }
      components: { button, card, nav, hero }
      designTokens: DesignTokens     // exportável
      rationale: string              // por que cada mudança
    }
    previewHTML: string              // miniatura comparativa
  }

  // ── Oportunidades ──
  opportunities: {
    priority: "quick-win" | "this-month" | "next-quarter"
    title: string
    impact: "alto" | "médio" | "baixo"
    effort: "baixo" | "médio" | "alto"
    description: string
  }[]

  // ── Projeção de ROI ──
  projection: {
    estimatedTrafficIncrease: string   // "+40% em 3 meses"
    estimatedConversions: number       // agendamentos adicionais/mês
    averageTicket: string               // ticket médio da categoria
    projectedRevenue3m: string
    projectedRevenue12m: string
    paybackMonths: number
  }

  // ── Dados Reais (prova social da proposta) ──
  realData: {
    name: string
    rating: number
    reviews: number
    services: string[]
    doctors: { name: string; crm: string; specialty: string }[]
    insurance: string[]
    instagram?: string
    neighborhoodIncome?: string
  }

  // ── CTA ──
  cta: {
    plan: string                      // "Sentinela" | "Domínio" | "Escala"
    price: string                     // "R$197/mês"
    message: string                   // texto persuasivo com dados reais
  }
}
```

### 4.5 Exemplo de output

```
╔══════════════════════════════════════════════════════════════╗
║  📊 PROPOSTA DE MARKETING DIGITAL                            ║
║  Clínica Odonto Excellence · Pinheiros, São Paulo            ║
║  Preparado em 19/07/2026 · Dados reais do seu site           ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║  🔍 DIAGNÓSTICO DO SITE ATUAL — Nota: 42/100 (ruim)         ║
║                                                              ║
║  ❌ Site não tem agendamento online                          ║
║  ❌ Não mostra preços (transparência zero)                   ║
║  ❌ Design de 2018 — parece abandonado                       ║
║  ❌ Sem página de contato visível                            ║
║  ❌ Contraste baixo (acessibilidade WCAG A)                  ║
║  ✅ Schema.org LocalBusiness presente                        ║
║  ✅ Instagram linkado no site                                ║
║                                                              ║
║  🎨 ANTES                        DEPOIS                     ║
║  ┌──────────────────┐    ┌──────────────────┐              ║
║  │ Cores: azul royal │    │ Cores: #0B5FFF   │              ║
║  │ Fontes: Arial     │    │ Fontes: Poppins  │              ║
║  │ Botões: quadrados │    │ Botões: r=12px   │              ║
║  │ Sem hierarquia    │    │ Hierarquia clara │              ║
║  └──────────────────┘    └──────────────────┘              ║
║                                                              ║
║  👩‍⚕️ DADOS REAIS DA SUA CLÍNICA                              ║
║  Dra. Ana Oliveira — CRM 12345 — Ortodontia                 ║
║  Serviços: Aparelho, Clareamento, Limpeza, Implante         ║
║  Convênios: Unimed, Bradesco Saúde, SulAmérica              ║
║  Instagram: @odontoexcellence · 1.2K seguidores             ║
║                                                              ║
║  📈 PROJEÇÃO DE IMPACTO                                      ║
║  +40% tráfego em 3 meses (SEO local + conteúdo)             ║
║  +15 agendamentos/mês adicionais (CTA otimizado)            ║
║  Ticket médio da categoria: R$ 350                          ║
║  Receita adicional projetada: R$ 5.250/mês                  ║
║  Payback do investimento: < 1 mês                           ║
║                                                              ║
║  🎯 Plano Sentinela · R$197/mês                              ║
║  [Falar com Especialista]                                    ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
```

---

## 5. S11K · Landing Page Técnica (PÓS-VENDA)

### 5.1 Propósito

Entregar uma landing page **completa e otimizada** que parece ter sido feita pela própria clínica — com SEO técnico real, copy com dados reais, e Design System usando as cores e fontes da marca.

### 5.2 Inputs (S11-MK + camadas adicionais)

| Camada | Dado | Fonte | Custo | S11-MK |
|--------|------|-------|-------|--------|
| L0 | GMB completo | Supabase | $0 | ✅ |
| L2a | Lighthouse SEO score, performance | DataForSEO | $0.012 | ❌ |
| L2a | CMS, analytics, technology stack | DataForSEO | (incluído) | ❌ |
| L2b | Brand DNA + conteúdo | ADR-0044 | $0 | ✅ |
| L3 | Backlinks, referring domains | DataForSEO | $0.08 | ❌ |
| L3 | Keyword gaps, SOV | DataForSEO | (incluído) | ❌ |
| L4 | IBGE market context | Supabase | $0 | ✅ |
| L5 | CNPJ (se disponível) | ADR-0028 | $0 | ❌ |
| Wa | WhatsApp check | Evolution API | $0 | ❌ |

### 5.3 Processamento

O `composeS11()` existente é a base. A diferença é que agora os inputs são **dados reais** em vez de genéricos:

```typescript
// Antes (v084): NICHO_MAP hardcoded
const biz = {
  name: lead.title,
  specialties: nicho.specialties,        // ← genérico: ["botox", "harmonização"]
  pains: nicho.pains,                    // ← genérico: ["medo de agulha"]
  triggers: nicho.conversionTriggers,    // ← genérico: ["1a consulta grátis"]
  tone: nicho.tone,                      // ← genérico: "profissional"
}

// Depois (v090+): L2b dados reais + fallback NICHO_MAP
const l2b = lead.website ? await enrichL2bContent(lead.website) : null
const biz = {
  name: lead.title,
  doctorName: l2b?.doctors?.[0]?.name,          // ← REAL: "Dra. Ana Oliveira"
  doctorCRM: l2b?.doctors?.[0]?.crm,            // ← REAL: "CRM 12345"
  specialties: l2b?.services?.length
    ? l2b.services                                // ← REAL: ["Limpeza", "Aparelho"]
    : nicho.specialties,                          // fallback genérico
  insurance: l2b?.insurance || [],                // ← REAL: ["Unimed", "Bradesco"]
  bookingPlatform: l2b?.bookingPlatform,          // ← REAL: "whatsapp" | "doctoralia"
  instagram: l2b?.socialLinks?.instagram,         // ← REAL: "@odontoexcellence"
  hasPrices: l2b?.hasPrices,                      // ← REAL: true/false
  pains: nicho.pains,                             // mantém genérico (dores são do segmento, não da clínica)
  triggers: l2b?.hasPrices
    ? nicho.conversionTriggers.filter(t => !t.includes('grátis'))
    : nicho.conversionTriggers,                   // adapta triggers aos dados reais
  tone: nicho.tone,
}

// Design: Brand DNA real em vez de palette hardcoded por segmento
const brandDNA = l2b?.brandDNA
const T = unifyTokens(seg, {
  primary: brandDNA?.colors?.primary || p,     // ← REAL: cor do site da clínica
  secondary: brandDNA?.colors?.secondary || s,
  accent: brandDNA?.colors?.accent || a,
}, odSystem, materio, 'S11')

// Typography: fontes reais da marca
if (brandDNA?.typography?.heading) {
  T.typography.heading = brandDNA.typography.heading  // ← REAL: Poppins, Inter, etc.
}
if (brandDNA?.typography?.body) {
  T.typography.body = brandDNA.typography.body
}
```

### 5.4 Output — Estrutura da Landing Page

```typescript
interface S11KResult {
  // ── Variantes A/B ──
  variants: {
    ab: "A" | "B"
    html: string                       // HTML completo da landing page
    strategyFacet: string              // faceta de conversão aplicada
    hypothesis: string                 // hipótese de conversão
    copyModel: string                  // "deepseek" | "fallback"
    headline: string                   // headline principal
    seoScore: number                   // 0-100 (do L2a)
  }[]

  // ── SEO Técnico (L2a) ──
  seo: {
    lighthouse: {
      performance: number
      accessibility: number
      bestPractices: number
      seo: number
    }
    metaTags: { title, description, ogTitle, ogDescription }
    schemaOrg: object                  // JSON-LD LocalBusiness
    wordCount: number
    hasBlog: boolean
    hasSSL: boolean
    isMobileFriendly: boolean
  }

  // ── Design System ──
  design: {
    tokens: DesignTokens               // exportável (Figma Tokens, CSS vars)
    brandDNA: BrandDNA                 // DNA extraído do site
    componentSpecs: ComponentSpec[]    // specs dos componentes usados
    colorPalette: string[]             // paleta completa
    typography: { heading, body, scale, weights }
  }

  // ── Competitive Context (L3) ──
  competitive: {
    backlinks: number
    referringDomains: number
    domainRank: number
    topCompetitors: { domain, rank, intersections }[]
    keywordGaps: string[]
    sov: number                        // Share of Voice 0-100
  }

  // ── Business Context ──
  business: {
    name: string
    category: string
    services: string[]
    doctors: { name, crm, specialty }[]
    insurance: string[]
    phone: string
    whatsapp: string
    address: string
    rating: number
    reviews: number
    instagram?: string
    website?: string
  }

  // ── Market Context (L4) ──
  market: {
    city: string
    neighborhoodIncome: string
    cityPIB: string
    population: number
    competitorsCount: number
  }

  // ── Metadata ──
  meta: {
    surface: "S11K"
    generatedAt: string
    pipelineCost: number               // $0.093
    dataCompleteness: number           // 0-100% (quantos % das camadas retornaram dados)
  }
}
```

---

## 6. Comparação S11-MK vs S11K

| Dimensão | S11-MK (PRÉ-VENDA) | S11K (PÓS-VENDA) |
|----------|-------------------|-------------------|
| **Momento** | Antes de vender | Depois de vendido |
| **Propósito** | Convencer — proposta visual | Entregar — landing page publicada |
| **Quem usa** | Vendedor | Time de operações / automático |
| **Custo/lead** | ~$0.001 | ~$0.093 |
| **Tempo** | ~5s | ~8s |
| **Camadas** | L0 + L2b + L4 + DeepSeek | L0 + L2a + L2b + L3 + L4 + L5 + Wa + DeepSeek |
| **Output** | Proposta PDF + MockUp visual | Landing Page HTML + SEO Audit + Design Tokens |
| **Risco** | Quasi-zero (gerado sem custo) | Baixo (cliente já pagou) |
| **Personalização** | Dados reais da clínica | Dados reais + SEO técnico + competitive intel |
| **Design** | Brand DNA real (cores/fontes do site) | Brand DNA real + Design Tokens exportáveis |
| **SEO** | Não incluso | Lighthouse + meta tags + Schema.org |
| **Tracking** | Não incluso | A/B testing + analytics (L7) |

---

## 7. Integração com o S11 existente

### 7.1 O que muda no composeS11()

```typescript
// warp-composer.ts
export async function composeS11(placeId: string, mode: 'mk' | 'k' = 'k') {
  // ... fetch lead L0 ...

  // ── L2b Content (NOVO — ADR-0044) ──
  let l2b = null
  if (lead.website) {
    l2b = await enrichL2bContent(lead.website)  // crawler .TS · $0
  }

  // ── L4 IBGE (NOVO — dados já existem no Supabase) ──
  const l4 = await enrichL4IBGE(lead.city)

  // ── S11-MK: para aqui ──
  if (mode === 'mk') {
    return await composeS11MKFromData(lead, l2b, l4)
  }

  // ── S11K: continua com DataForSEO ──
  const l2a = lead.website
    ? await Promise.all([onPageInstantAudit(lead.website), domainTechnologies(domain)])
    : null
  const l3 = lead.website
    ? await backlinksCompetitors(lead.website)
    : null

  // ... resto do composeS11 existente (estrategias, copy, render) ...
}
```

### 7.2 O que NÃO muda

- **StrategyResolver:** mesma lógica, mas com dados reais nos facets
- **composeLayout / slotMorph:** mesmo pipeline
- **generateLandingCopy / renderS11_GREEN:** mesma função, inputs expandidos
- **Cache (WarpCache):** mesmo padrão S10, TTL 5min

---

## 8. Custos

| Etapa | Camadas | Custo/lead | 100 leads | 1000 leads |
|-------|---------|-----------|-----------|------------|
| **S11-MK** | L0 + L2b + L4 + DeepSeek | ~$0.001 | $0.10 | $1.00 |
| **S11K** | S11-MK + L2a + L3 + L5 + Wa | ~$0.093 | $9.30 | $93.00 |

**Estimativa realista (funil):**
- 100 leads entram no funil → 100 × S11-MK = $0.10
- 20 leads convertem (20% conversion) → 20 × S11K = $1.86
- **Custo total: $1.96 para processar 100 leads (20 clientes)**

Comparação com S11 atual (DeepSeek em todos): 100 × $0.002 = $0.20... mas sem dados reais, sem L2a/L3, sem Brand DNA. O custo marginal é praticamente o mesmo com output 10× melhor.

---

## 9. Wire com ADR-0044 (L2b)

A ADR-0044 é o **pré-requisito** para este playbook. Sem L2b, não temos Brand DNA real, serviços reais, médicos reais. O S11 continuaria genérico.

```
ADR-0044 (L2b crawler .TS)
  │
  ├── site-fetcher.ts        → HTML do site do lead
  ├── html-miner.ts          → serviços, preços, WhatsApp
  ├── extractors/            → médicos, convênios, redes sociais
  ├── design-extractor.ts    → Brand DNA (cores, fontes, componentes)
  ├── ux-extractor.ts        → UX DNA (hierarquia, acessibilidade)
  └── component-extractor.ts → Component DNA (botões, cards, forms)
       │
       ▼
  S11-MK · MockUp ReBrand (ESTA ADR)
       │
       ▼
  S11K · Landing Page Técnica (ESTA ADR)
```

---

## 10. Implementação

### Fase 1 · S11-MK (MockUp ReBrand) — ~3h

| Passo | Descrição |
|-------|----------|
| 1.1 | Criar `s11-mk.ts` — composeS11MK() com inputs L0+L2b+L4 |
| 1.2 | Criar `ai-redesign.ts` — diagnóstico + mockup antes/depois |
| 1.3 | Criar API route `GET /api/s11/mk?placeId=X` |
| 1.4 | Criar UI: página de proposta visual (admin/leads → botão "Gerar Proposta") |
| 1.5 | Wire com ADR-0044 (L2b) quando implementada |

### Fase 2 · S11K (Landing Page Técnica) — ~2h

| Passo | Descrição |
|-------|----------|
| 2.1 | Expandir `composeS11()` com modo `'k'` e inputs L2b+L2a+L3+L4+L5 |
| 2.2 | Integrar Brand DNA real no `unifyTokens()` |
| 2.3 | Expandir `generateLandingCopy()` com campos reais (médicos, convênios) |
| 2.4 | Adicionar Schema.org + SEO meta tags no `renderS11_GREEN()` |
| 2.5 | Conectar tracking L7 (A/B analytics) |

### Fase 3 · L7 (Mensuração + Feedback) — ~2h

| Passo | Descrição |
|-------|----------|
| 3.1 | Tracking de conversão (CTR, taxa de agendamento) |
| 3.2 | A/B winner detection (qual variante converteu mais?) |
| 3.3 | Learning loop → novas Strategies no StrategyResolver |
| 3.4 | Relatório mensal automático pro cliente |

---

## 11. Verificação

1. `composeS11MK(placeId)` em lead real com website → deve retornar diagnóstico + mockup com dados reais
2. Proposta visual mostra nome do médico real + serviços reais (não genéricos)
3. `composeS11(placeId, 'k')` gera landing page com cores REAIS da marca
4. Lighthouse scores do L2a visíveis no SEO audit da landing page
5. A/B tracking funcional — qual variante converteu mais?
6. Custo total < $0.10/lead no S11K, < $0.002 no S11-MK

---

## 12. Próximos passos

- [x] ADR-0045 escrita
- [ ] Implementar ADR-0044 (L2b crawler) — pré-requisito
- [ ] Implementar Fase 1 (S11-MK)
- [ ] Implementar Fase 2 (S11K)
- [ ] Implementar Fase 3 (L7 Mensuração)
- [ ] LeadTable: botão "Gerar Proposta" → abre S11-MK
- [ ] LeadTable: badge "S11K ativo" nos leads convertidos
