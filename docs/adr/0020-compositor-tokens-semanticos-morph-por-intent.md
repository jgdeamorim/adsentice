---
id: adr-0020
title: Compositor de Tokens Semânticos — Design System Morph por Intent de Mercado
status: proposed
date: 2026-07-14
deciders: founder, claude
extends: [adr-0017, adr-0018, adr-0019]
references:
  - ADR-0017 (Frontend Enterprise)
  - ADR-0018 (Família Warp, Design System Vivo)
  - ADR-0019 (context7 vs 21st-magic)
  - ADR-0011 (Brain OODA)
  - ADR-0012 (Category Strategy Matrix)
  - EVO-API compose.rs (intent → query_vocab → DctNode tree → output)
  - EVO-API materio_leaves.rs (destilador P0 de design tokens)
  - Materio 36 tokens (palette, typography, spacing — Qdrant adsentice-materio)
  - open-design 150 estilos (Stripe, Apple, Nike, Supabase, Linear, Intercom, Vercel)
  - 21st-magic 247 componentes (scroll-based-velocity, dia-text-reveal, magic-card)
  - Corey Haines 55 marketing skills (product-marketing, marketing-psychology, personas)
  - CSS Scroll-Driven Animations (MDN + Modern CSS 2026)
  - Tailwind CSS v4 (container queries, @theme inline, oklch)
  - shadcn/ui v4 (40 semantic tokens, radius scale, dark mode)
---

# ADR-0020 · Compositor de Tokens Semânticos — Design System Morph por Intent de Mercado

> **"Design tokens não são variáveis CSS estáticas. São o DNA visual do negócio, derivado do mercado, do público e da estratégia."**

## Sumário Executivo

A ADR-0018 definiu a Família Warp com 8 módulos. A ADR-0017 definiu `tokens.css` como fonte única da verdade visual. Porém, `tokens.css` estático é **genérico demais** — uma clínica estética em SP e uma oficina mecânica em MG NÃO deveriam ter a mesma paleta de cores, a mesma tipografia, os mesmos raios de borda.

**Esta ADR propõe o 9º módulo da Warp: o Compositor de Tokens Semânticos.** Em vez de 1 arquivo estático, o sistema gera `tokens.<intent>.css` sob demanda, derivando cada decisão de design de dados reais:

```
Input: intent + mercado + público-alvo + estratégia
         ↓
Query: Qdrant (847 design points) + DataForSEO (mercado) + Marketing Skills (psicologia)
         ↓
Compositor: inferência semântica de tokens (cores, tipografia, spacing, motion, radius)
         ↓
Output: tokens.<clinica-estetica-sp>.css + variantes A/B + telemetria
```

**Fonte da ideia:** Jeffer (founder), sessão 2026-07-14. Inspirado no `compose.rs` do EVO-API (intent → query_vocab → DctNode tree → output) e no `materio_leaves.rs` (destilador de design tokens).

---

## 1. Contexto

### 1.1 O problema do tokens.css estático

A ADR-0017 definiu `tokens.css` com 4 camadas:

```css
:root {
  --color-accent: #f9603f;      /* coral-warm — fixo */
  --font-display: 'Plus Jakarta Sans';
  --radius-md: 8px;
}
```

**Isso funciona para 1 marca. Não funciona para N clientes com públicos diferentes.**

| Cliente | Público | O que tokens.css estático entrega | O que DEVERIA entregar |
|---------|---------|-----------------------------------|------------------------|
| Clínica estética SP | Mulheres 25-45, classe A/B | Coral genérico #f9603f | Rose gold + sage, tipografia elegante, sombras suaves |
| Oficina mecânica MG | Homens 30-60, classe B/C | Coral genérico #f9603f | Azul industrial + laranja, tipografia bold, bordas retas |
| Restaurante RJ | Casais 20-50, turistas | Coral genérico #f9603f | Terracota + verde, tipografia acolhedora, sombras quentes |
| Dentista SP | Famílias, todas idades | Coral genérico #f9603f | Azul clínico + branco, tipografia clean, sem sombras |

**Um token estático = todas as landing pages parecem iguais. Design genérico = conversão baixa.**

### 1.2 O que o mercado enterprise faz em 2026

| Empresa | Abordagem | Fonte |
|---------|-----------|-------|
| **Vercel** | Geist font + shadow-as-border + monochrome | open-design/vercel |
| **Stripe** | Multi-layer blue-tinted shadows + sohne-var font | open-design/stripe |
| **Linear** | Dark-mode-first + single purple accent + Inter 510 weight | open-design/linear-app |
| **Intercom** | Warm off-white canvas + Fin Orange accent + 4px geometry | open-design/intercom |
| **Apple** | Binary section rhythm + SF Pro dual mode (cinematic/commerce) | open-design/apple |
| **Supabase** | Dark emerald + pill-shaped geometry + code-first aesthetic | open-design/supabase |

**Nenhum deles usa "1 tokens.css para tudo."** Cada superfície (landing, dashboard, docs, blog) tem seu próprio sistema de tokens derivado do contexto de uso.

### 1.3 O padrão EVO-API que inspira esta ADR

O `compose.rs` (3,019 linhas) implementa:

```
intent → query_vocab(intent) → DctNode tree → resolve_dependencies() → render(surface)
```

O `materio_leaves.rs` (459 linhas) implementa:

```
materio_raw → destilação P0 → leaves (tokens CSS atômicos) → assemble(leaves) → stylesheet
```

**Esta ADR aplica o mesmo padrão a design tokens:**

```
intent("landingpage-clinica-estetica-sp")
  → query_vocab_design(intent) → Qdrant + DataForSEO + Marketing Skills
  → DctNode tree (cores, fontes, spacing, motion, radius)
  → resolve(mercado, público, estratégia)
  → tokens.<intent>.css
```

---

## 2. Decisão

**Adotamos o Compositor de Tokens Semânticos como 9º módulo da Família Warp.**

### 2.1 Arquitetura do Compositor

```
┌─────────────────────────────────────────────────────────────────────┐
│                COMPOSITOR DE TOKENS SEMÂNTICOS (Warp M9)            │
│                                                                     │
│  INPUT (intent + contexto de mercado)                               │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ intent: "landingpage-clinica-estetica-sp"                    │   │
│  │ categoria: GMB "beauty" · região: "Sao Paulo" · raio: 5km   │   │
│  │ público: mulheres 25-45 · renda A/B · interesse beleza/saúde│   │
│  │ estratégia: variante A (acolhedor) vs B (luxo)              │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                              │                                      │
│                              ▼                                      │
│  QUERY (fontes de conhecimento)                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ ┌─ DataForSEO MCP ─────────────────────────────────────┐    │   │
│  │ │ · GMB profile (categoria, fotos, reviews, atributos)  │    │   │
│  │ │ · SERP competitors (cores, fontes, layout dos top 10) │    │   │
│  │ │ · Business reviews (sentimentos, palavras repetidas)  │    │   │
│  │ │ · Demografia da região (idade, renda, gênero)         │    │   │
│  │ └──────────────────────────────────────────────────────┘    │   │
│  │ ┌─ Qdrant (847 design points) ──────────────────────────┐   │   │
│  │ │ · open-design 150 estilos (Stripe, Apple, Nike, etc.)  │   │   │
│  │ │ · 21st-magic 247 componentes (scroll, cards, buttons)  │   │   │
│  │ │ · Materio 36 tokens base (palette, spacing, typography) │   │   │
│  │ └──────────────────────────────────────────────────────┘    │   │
│  │ ┌─ Marketing Skills (55) ────────────────────────────────┐   │   │
│  │ │ · marketing-psychology (cores, viés cognitivo, emoção)  │   │   │
│  │ │ · product-marketing (ICP, personas, JTBD)              │   │   │
│  │ │ · copywriting (tom de voz, framing)                    │   │   │
│  │ └──────────────────────────────────────────────────────┘    │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                              │                                      │
│                              ▼                                      │
│  INFERÊNCIA SEMÂNTICA (pipeline de decisão)                         │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ 1. PALETA                                                  │   │
│  │    query: "palette + {categoria} + {público} + {emoção}"   │   │
│  │    → Qdrant cross-design (Stripe luxo? Apple clean?)       │   │
│  │    → psicologia de cor (azul=confiança, rose=feminino)     │   │
│  │    → output: --color-primary, --color-accent, --color-bg   │   │
│  │                                                             │   │
│  │ 2. TIPOGRAFIA                                              │   │
│  │    query: "typography + {público} + {dispositivo}"         │   │
│  │    → serif = elegante/luxo, sans = moderno/clean            │   │
│  │    → font-size scale: idade 40+ = +1 step (acessibilidade) │   │
│  │    → output: --font-display, --font-body, --text-hero      │   │
│  │                                                             │   │
│  │ 3. ESPAÇAMENTO + RADIUS                                    │   │
│  │    query: "spacing + {categoria} + {densidade}"            │   │
│  │    → spa/clínica = arejado (space-lg+), oficina = denso    │   │
│  │    → radius: acolhedor = arredondado, industrial = reto    │   │
│  │    → output: --space-*, --radius-*                         │   │
│  │                                                             │   │
│  │ 4. SHADOWS + ELEVAÇÃO                                      │   │
│  │    query: "shadow + {estilo} + {profundidade}"             │   │
│  │    → Stripe multi-layer (luxo) vs Vercel shadow-as-border  │   │
│  │    → output: --shadow-*                                    │   │
│  │                                                             │   │
│  │ 5. MOTION + SCROLL                                         │   │
│  │    query: "motion + {público} + {dispositivo}"             │   │
│  │    → scroll-driven animations (0 KB JS, CSS nativo)        │   │
│  │    → reduced-motion: prefer-respect                       │   │
│  │    → output: --duration-*, --ease-*, @keyframes            │   │
│  │                                                             │   │
│  │ 6. RESPONSIVE STRATEGY                                     │   │
│  │    query: "responsive + {dispositivo} + {público}"         │   │
│  │    → mobile-first (default) ou desktop-first (B2B)         │   │
│  │    → container queries (component-level, não viewport)     │   │
│  │    → output: --breakpoint-*, @container queries            │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                              │                                      │
│                              ▼                                      │
│  OUTPUT (tokens gerados, não hardcoded)                             │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ tokens.clinica-estetica-sp.css                              │   │
│  │ ├── :root { --color-primary: oklch(0.75 0.12 340); }       │   │
│  │ ├── :root { --font-display: 'Cormorant Garamond'; }        │   │
│  │ ├── :root { --radius: 1rem; }                              │   │
│  │ ├── @keyframes fade-in { ... }  /* scroll-driven */        │   │
│  │ └── @container (min-width: 400px) { ... }                  │   │
│  │                                                             │   │
│  │ + tokens.clinica-estetica-sp.variant-b.css (A/B test)      │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

### 2.2 Camada 5 · MOTION + SCROLL (CSS Scroll-Driven Animations)

A maior inovação desta ADR: **zero JavaScript para animações de scroll.** CSS Scroll-Driven Animations são nativas, performáticas (fora da main thread), e suportadas em browsers modernos (Chrome 115+, Edge 115+, Firefox Nightly).

#### Tokens de Motion

```css
/* Gerado dinamicamente pelo compositor para cada intent */

/* ── Scroll Reveal (fade-in ao entrar no viewport) ── */
.scroll-reveal {
  animation: fade-in linear both;
  animation-timeline: view();
  animation-range: entry 0% entry 100%;
}
@keyframes fade-in {
  from { opacity: 0; transform: translateY(20px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* ── Parallax suave (scroll-linked, não JS) ── */
.parallax-bg {
  animation: parallax linear both;
  animation-timeline: scroll(root);
  animation-range: 0% 100%;
}
@keyframes parallax {
  from { transform: translateY(0); }
  to   { transform: translateY(-20%); }
}

/* ── Pin / Sticky Section ── */
.sticky-section {
  position: sticky;
  top: 0;
  view-timeline-name: --section-pin;
  view-timeline-axis: block;
}

/* ── Scroll Progress (barra de leitura) ── */
.scroll-progress {
  animation: progress-bar linear;
  animation-timeline: scroll(root);
  transform-origin: left;
}
@keyframes progress-bar {
  from { transform: scaleX(0); }
  to   { transform: scaleX(1); }
}

/* ── Velocity-reactive (inspirado 21st-magic scroll-based-velocity) ── */
/* Para casos complexos: Motion One (5 KB) com useVelocity + useSpring */
```

**Fontes:**
- MDN: `animation-timeline: view()`, `scroll-timeline-name`, `view-timeline-inset` (2026)
- Modern CSS: "Scroll-reveal without IntersectionObserver" (2026)
- 21st-magic: `scroll-based-velocity` (motion/react, useVelocity, useSpring)
- Tailwind CSS v4: `@theme inline` motion tokens

#### Matriz de Motion por Intenção

| Contexto | Estratégia de Motion | Intensidade |
|----------|---------------------|:-----------:|
| Landing page luxo | Parallax suave, fade-in lento, stagger elegante | Baixa (ease-fluid, duration 500ms+) |
| Landing page varejo | Scroll-reveal rápido, elementos que "pipocam" | Alta (ease-snappy, duration 250ms) |
| Dashboard admin | Zero scroll animation (dados, não distração) | Nenhuma |
| Blog/Conteúdo | Progress bar + scroll-spy + reveal sutil | Baixa |
| App mobile SPA | Page transitions + gesture-linked (spring) | Média (ease-spring) |
| Acessibilidade | `prefers-reduced-motion: reduce` → tudo 0ms | Zero (respeito ao SO) |

### 2.3 Camada 6 · RESPONSIVE STRATEGY (Container Queries + Mobile-First)

Substitui breakpoints fixos por **container queries** (Tailwind CSS v4):

```html
<!-- O componente se adapta ao CONTAINER, não ao viewport -->
<div class="@container">
  <div class="grid grid-cols-1 @md:grid-cols-2 @lg:grid-cols-3">
    <!-- Cards de serviço que respondem ao espaço disponível -->
  </div>
</div>
```

**Isso permite que o mesmo componente funcione em:**
- Hero section (container largo → 3 colunas)
- Sidebar card (container estreito → 1 coluna)
- Modal (container médio → 2 colunas)

**Sem uma linha de media query manual.**

### 2.4 Tokens de Domínio por Categoria GMB

O compositor gera tokens específicos por categoria Google Meu Negócio:

| GMB Category | Primary Hue | Psychology | Spacing | Radius | Motion |
|-------------|-------------|------------|---------|--------|--------|
| **beauty** (estética) | Rose gold (340°) | Feminino, luxo, acolhimento | Arejado (lg) | Arredondado (lg) | Parallax suave |
| **dentist** (clínica) | Azul clínico (220°) | Confiança, higiene, profissional | Médio (md) | Leve (md) | Nenhum |
| **restaurant** (gastronomia) | Terracota (25°) | Apetite, calor, social | Denso (sm) | Médio (md) | Scroll reveal |
| **gym** (academia) | Laranja energia (30°) | Força, movimento, vitalidade | Compacto (sm) | Reto (sm) | Velocity-reactive |
| **auto_repair** (oficina) | Azul industrial (250°) | Confiança, durabilidade | Denso (sm) | Reto (sm) | Nenhum |
| **spa** (bem-estar) | Verde sage (155°) | Calma, natureza, paz | Muito arejado (xl) | Muito arredondado (xl) | Parallax lento |
| **lawyer** (advocacia) | Navy (260°) | Autoridade, tradição | Formal (md) | Reto (sm) | Nenhum |
| **pet_store** (pet shop) | Verde + amber | Natureza, alegria, cuidado | Médio (md) | Arredondado (md) | Scroll reveal |

**Fonte:** open-design embeddings + marketing-psychology skill + DataForSEO category taxonomy

### 2.5 Variantes A/B como Tokens

Cada landing page pode gerar **variantes de token** para teste A/B:

```css
/* Variante A: acolhedor (controle) */
tokens.clinica-estetica-sp.variant-a.css {
  --color-primary: oklch(0.75 0.12 340);   /* rose gold */
  --radius: 1rem;                            /* arredondado */
  --shadow-card: 0 4px 20px rgba(0,0,0,0.06); /* suave */
}

/* Variante B: luxo (teste) */
tokens.clinica-estetica-sp.variant-b.css {
  --color-primary: oklch(0.60 0.05 280);   /* violeta profundo */
  --radius: 0.3rem;                          /* minimal */
  --shadow-card: 0 20px 50px rgba(0,0,0,0.12); /* dramático */
}
```

**Telemetria decide qual variante performa melhor:** CTR, scroll depth, conversão, tempo na página.

---

## 3. Implementação

### 3.1 Novo Módulo Warp: `tokens-composer.ts` (M9)

```
packages/warp/
├── tokens.css                    ← M1 (base estática, existe)
├── tokens-composer.ts            ← M9 (compositor) NOVO
│   ├── compositor/
│   │   ├── intent-parser.ts      ← Extrai intent do input
│   │   ├── market-query.ts       ← DataForSEO → dados de mercado
│   │   ├── design-query.ts       ← Qdrant → vocabulário visual
│   │   ├── psych-query.ts        ← Marketing skills → psicologia
│   │   ├── palette-infer.ts      ← Inferência de cores
│   │   ├── typography-infer.ts   ← Inferência de tipografia
│   │   ├── spacing-infer.ts      ← Inferência de spacing/radius
│   │   ├── shadow-infer.ts       ← Inferência de sombras
│   │   ├── motion-infer.ts       ← Inferência de motion/scroll
│   │   ├── responsive-infer.ts   ← Inferência de breakpoints
│   │   └── variant-generator.ts  ← Gera variantes A/B
│   ├── output/
│   │   ├── css-generator.ts      ← Serializa tokens → CSS
│   │   ├── tailwind-plugin.ts    ← Integração com Tailwind v4
│   │   └── manifest-generator.ts ← Manifest de tokens (versionado)
│   └── telemetry/
│       ├── variant-tracker.ts    ← Coleta métricas por variante
│       └── feedback-loop.ts      ← Reforça tokens que performam melhor
```

### 3.2 Fluxo de Geração

```typescript
// tokens-composer.ts
interface TokenIntent {
  category: string;        // "beauty", "dentist", "restaurant"...
  region: string;          // "Sao Paulo", "Rio de Janeiro"...
  audience: {              // derivado de DataForSEO + marketing-psychology
    ageRange: [number, number];
    gender: 'female' | 'male' | 'all';
    income: 'A' | 'B' | 'C' | 'D';
    interests: string[];
  };
  strategy: {
    emotion: string;       // "acolhedor", "luxo", "confiança", "energia"
    variant: 'a' | 'b';    // A/B testing
    accessibility: 'AA' | 'AAA';
    mobileFirst: boolean;
  };
}

interface GeneratedTokens {
  meta: {
    intent: string;
    generatedAt: string;
    version: string;
    sources: string[];     // evidências usadas (medido=verdade)
  };
  css: string;             // tokens CSS gerados
  variants: string[];      // variantes A/B
  manifest: Record<string, any>;  // metadados para telemetria
}

async function compose(intent: TokenIntent): Promise<GeneratedTokens> {
  // 1. Query mercado
  const market = await queryMarket(intent.category, intent.region);
  
  // 2. Query design vocabulary (Qdrant)
  const designVocab = await queryDesignVocab(intent);
  
  // 3. Query marketing psychology
  const psychProfile = await queryPsychProfile(intent.audience);
  
  // 4. Inferir tokens
  const palette = inferPalette(market, designVocab, psychProfile);
  const typography = inferTypography(intent.audience, intent.strategy);
  const spacing = inferSpacing(intent.category, intent.strategy);
  const shadows = inferShadows(intent.strategy.emotion, designVocab);
  const motion = inferMotion(intent.strategy, intent.audience);
  const responsive = inferResponsive(intent.strategy, market);
  
  // 5. Gerar CSS
  const css = generateCSS({ palette, typography, spacing, shadows, motion, responsive });
  
  // 6. Gerar variante A/B se solicitado
  const variants = intent.strategy.variant === 'b' 
    ? generateVariant(css, intent.strategy) 
    : [];
  
  return {
    meta: {
      intent: `${intent.category}-${intent.region}`,
      generatedAt: new Date().toISOString(),
      version: '1.0.0',
      sources: [
        `DataForSEO: ${intent.category} GMB`,
        `Qdrant: ${designVocab.sources.join(', ')}`,
        `Marketing: marketing-psychology, product-marketing`
      ]
    },
    css,
    variants,
    manifest: { /* ... */ }
  };
}
```

### 3.3 Integração com o Pipeline de Discovery

```
Usuário → Discovery Engine (ADR-0002)
  ├── Pipeline 1: Keyword Research
  ├── Pipeline 2: SERP Analysis  
  ├── Pipeline 3: Domain Competitors
  ├── Pipeline 4: GMB Profile (27 campos canônicos)
  │     └── categoria + região + público detectados
  │
  ├── Pipeline 5: Landing Page Generation ← NOVO
  │     ├── 1. Tokens Composer (esta ADR)
  │     ├── 2. Content Strategy (marketing-plan.ts)
  │     ├── 3. SEO Architecture (site-architecture.ts)
  │     └── 4. HTML Generation (Warp compositor.ts)
  │
  └── Pipeline 6: A/B Variant + Telemetry ← NOVO
        ├── variant-tracker.ts (CTR, scroll depth, conversão)
        └── feedback-loop.ts (reforça variante vencedora)
```

---

## 4. Fontes de Conhecimento (medido=verdade)

### 4.1 O que já temos

| Fonte | O que contém | Como o compositor usa |
|-------|-------------|----------------------|
| **Qdrant: 847 design points** | 150 open-design + 247 21st-magic + Material tokens | Vocabulário visual para query semântica |
| **DataForSEO MCP** | GMB, SERP, reviews, business data | Dados de mercado (categoria, concorrentes, demografia) |
| **Marketing skills (55)** | Corey Haines: product-marketing, psychology, personas | Psicologia de cores, ICP, JTBD, tom de voz |
| **Materio (36 tokens)** | Palette, typography, spacing, border, muted | Base atômica para o compositor |
| **context7 MCP** | Tailwind v4, shadcn/ui v4, MDN, Modern CSS | Padrões canônicos de CSS |
| **21st-magic MCP** | 77 componentes com motion/scroll | Referência de animações e interações |

### 4.2 CSS Scroll-Driven Animations (especificação)

| Feature | Suporte | Fonte |
|---------|:-------:|-------|
| `animation-timeline: scroll()` | Chrome 115+, Edge 115+ | MDN scroll-driven-animations |
| `animation-timeline: view()` | Chrome 115+, Edge 115+ | MDN, Modern CSS 2026 |
| `view-timeline-name` | Chrome 115+, Firefox Nightly | MDN view-timeline-name |
| `scroll-timeline-name` | Chrome 115+, Firefox Nightly | MDN scroll-timeline-name |
| `animation-range` | Chrome 115+ | MDN animation-range |
| `view-timeline-inset` | Chrome 115+ | MDN view-timeline-inset |
| Container Queries (`@container`) | Chrome 106+, all modern | Tailwind CSS v4, MDN |
| `prefers-reduced-motion` | Todos browsers | MDN, WCAG 2.1 |

**Fallback strategy:** CSS scroll-driven animations são progressive enhancement. Browsers sem suporte simplesmente não animam — o conteúdo continua acessível. Zero JavaScript.

### 4.3 Psicologia de Cores (marketing-psychology skill)

| Cor | Psicologia | Categorias GMB | Fonte |
|-----|-----------|----------------|-------|
| **Rose gold** (340°) | Feminino, luxo, beleza | beauty, spa, jewelry | open-design |
| **Azul** (220-260°) | Confiança, higiene, profissional | dentist, lawyer, clinic | marketing-psychology |
| **Verde sage** (155°) | Calma, natureza, saúde | spa, nutrition, pharmacy | Materio + PostHog |
| **Laranja/coral** (28-30°) | Energia, apetite, ação | restaurant, gym, retail | Materio coral brand |
| **Violeta** (280°) | Luxo, criatividade, exclusivo | premium beauty, art | Stripe, Linear |
| **Terracota** (25°) | Acolhimento, terra, tradição | restaurant, cafe, bakery | open-design |
| **Navy** (260°) | Autoridade, seriedade | lawyer, finance, B2B | Stripe, Intercom |

---

## 5. Consequências

### Positivas

1. **Design que converte por construção:** Cada landing page tem tokens derivados do mercado real, não do gosto pessoal
2. **Zero design manual por cliente:** O compositor gera tokens automaticamente do GMB + DataForSEO
3. **A/B testing nativo:** Variantes de token geradas e medidas sem redesign
4. **CSS nativo, zero runtime JS:** Scroll-driven animations sem IntersectionObserver, sem biblioteca
5. **AAA accessibility:** `prefers-reduced-motion`, font-size por faixa etária, contraste oklch
6. **Container Queries:** Componentes que respondem ao container, não ao viewport — reutilizáveis em qualquer contexto
7. **Medido=verdade:** Cada token gerado cita sua fonte (Qdrant source, DataForSEO query, skill consultada)
8. **Telemetria fecha o loop:** Variantes que performam melhor são reforçadas automaticamente

### Negativas

1. **Complexidade cognitiva:** 6 pipelines de inferência + variantes A/B = mais código para manter
2. **Dependência do Qdrant:** Se o corpus de design estiver offline, compositor degrada para tokens estáticos
3. **Custo DataForSEO:** Cada geração de tokens consulta GMB + SERP + reviews (~$0.01/lead)
4. **CSS Scroll-Driven ainda não 100%:** Firefox apenas Nightly, Safari não implementou (progressive enhancement mitiga)
5. **"Alucinação" de design:** Compositor pode gerar combinações ruins (mitigação: design jury humano + feedback loop)

### Mitigações

- **Fallback estático:** `tokens.css` base (ADR-0017) como fallback offline
- **Cache agressivo:** Tokens gerados são cacheados por intent (KV + Redis + Qdrant)
- **Quality gate:** Compositor gera 3 candidatos → SGA Health Score escolhe o melhor (k0_breath)
- **Progressive enhancement:** Motion tokens são opcionais. Sem suporte = sem animação, não sem conteúdo.
- **Design jury:** Founder aprova primeiros 10 tokens gerados antes de liberar automático

---

## 6. Comparação com Alternativas

| Abordagem | Design Quality | Custo/cliente | Escala | A/B Testing |
|-----------|:------------:|:------------:|:------:|:----------:|
| **Tokens estáticos** (ADR-0017) | Genérico | R$0 | Ilimitada | ❌ |
| **Designer humano por cliente** | Excelente | R$500-5000 | 1-2/mês | Manual |
| **Template marketplace** (Canva, Wix) | Médio | R$0-100 | Ilimitada | Limitado |
| **AI generativa crua** (Midjourney, GPT) | Imprevisível | R$0.01-0.10 | Ilimitada | ❌ |
| **Compositor Semântico** (esta ADR) | **Alto + data-driven** | **R$0.01** | **Ilimitada** | **✅ Nativo** |

---

## 7. Roadmap

### Fase 1 · Setup (Dia 1)
- [ ] `tokens-composer.ts` — estrutura do módulo
- [ ] `palette-infer.ts` — inferência de cores com Qdrant + psicologia
- [ ] `typography-infer.ts` — inferência de fontes + escala
- [ ] Prova de conceito: gerar `tokens.clinica-estetica-sp.css` para 1 cliente

### Fase 2 · Core (Dias 2-3)
- [ ] `spacing-infer.ts` + `shadow-infer.ts`
- [ ] `motion-infer.ts` — CSS scroll-driven animations
- [ ] `responsive-infer.ts` — container queries + mobile-first
- [ ] `css-generator.ts` — serializador CSS
- [ ] 5 landing pages geradas com tokens diferentes

### Fase 3 · Variantes (Dias 4-5)
- [ ] `variant-generator.ts` — A/B token variants
- [ ] `variant-tracker.ts` — telemetria (CTR, scroll depth, conversão)
- [ ] `feedback-loop.ts` — reforço automático
- [ ] Dashboard de performance de variantes

### Fase 4 · Produção (Dias 6-7)
- [ ] `tailwind-plugin.ts` — integração nativa Tailwind v4
- [ ] Cache 3 camadas: KV + Redis + Qdrant
- [ ] Design jury pipeline (3 candidatos → SGA health score → melhor)
- [ ] Deploy primeiro cliente com tokens compostos

---

## 8. O que NÃO fazer

| Não fazer | Por que |
|-----------|--------|
| ❌ Usar JavaScript para scroll animations | CSS scroll-driven é nativo, performático, 0 KB |
| ❌ Hardcodar paletas por categoria | Mercado muda. Tokens devem ser query, não lookup table. |
| ❌ Ignorar `prefers-reduced-motion` | Acessibilidade é requisito, não feature. WCAG 2.1 AA+. |
| ❌ Gerar tokens sem cache | Cada geração consulta 3 APIs. Cache é obrigatório. |
| ❌ Esperar 100% de suporte CSS Scroll-Driven | Progressive enhancement. Sem suporte = sem animação, conteúdo intacto. |
| ❌ Substituir `tokens.css` base | Ele é o fallback offline. Compositor é upgrade, não substituição. |
| ❌ Deploy automático sem design jury | Primeiros 10 tokens passam pelo founder. Depois automatiza com SGA gate. |

---

## 9. Prova (medido=verdade)

### Design Corpus
- **Fonte:** Qdrant `adsentice-self` — 2,424 pontos (847 de design)
- **Fonte:** Qdrant `adsentice-materio` — 36 tokens base
- **Fonte:** 21st-magic MCP — 77 componentes, 247 pontos embedados
- **Fonte:** open-design — 150 estilos de 60+ marcas

### Marketing Intelligence
- **Fonte:** Corey Haines `product-marketing` — 12 seções (ICP, personas, JTBD, competitive)
- **Fonte:** Corey Haines `marketing-psychology` — mental models, color psychology, behavioral science
- **Fonte:** DataForSEO MCP — GMB 27 campos canônicos, SERP, reviews, business data

### CSS Moderno
- **Fonte:** MDN — `scroll-driven-animations` (Chrome 115+, Firefox Nightly)
- **Fonte:** Modern CSS 2026 — "Scroll-reveal without IntersectionObserver"
- **Fonte:** context7 — Tailwind CSS v4 `@container`, `@theme inline`
- **Fonte:** 21st-magic — `scroll-based-velocity` (motion/react, useVelocity, useSpring)

### Padrão EVO-API
- **Fonte:** `compose.rs` (3,019 linhas) — intent → query_vocab → DctNode tree → output
- **Fonte:** `materio_leaves.rs` (459 linhas) — destilação P0 de design tokens

---

## 10. Warp Family — Estado Atualizado

| Módulo | Nome | Status |
|:------:|------|:------:|
| M1 | `tokens.css` (base estática) | ✅ v1.0 criado (2026-07-14) |
| M2 | `components/ui/` (shadcn) | 🔴 0% |
| M3 | `components/adsentice/` | 🔴 0% |
| M4 | `compositor.ts` (HTML) | 🔴 0% |
| M5 | `registry.ts` (Zod) | 🔴 0% |
| M6 | `cache.ts` (3 camadas) | 🔴 0% |
| M7 | `tracker.ts` (telemetria) | 🔴 0% |
| M8 | `8-agents.ts` (multi-agent) | 🔴 0% |
| **M9** | **`tokens-composer.ts`** | **⬜ proposed (esta ADR)** |

---

*ADR-0020 · 2026-07-14 · adsentice · medido=verdade*
