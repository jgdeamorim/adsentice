# Matriz Warp × Marketing Skills × Design Tokens

> **Princípio:** Cada superfície Warp tem seu próprio conjunto de skills de marketing + tokens de design + referências visuais. Nada é genérico — tudo é derivado do intent da superfície.
> **Fonte:** 43 skills Corey Haines embedados no Qdrant + 847 design points + 36 Materio tokens + 247 21st-magic components
> **medido=verdade** · 2026-07-14

---

## SUPERFÍCIES WARP (8 superfícies)

```
WARP SURFACES
├── S1 · LANDING PAGE       → Conversão primária (lead magnet, trial, compra)
├── S2 · BLOG / CONTEÚDO    → SEO, autoridade, tráfego orgânico
├── S3 · DASHBOARD ADMIN    → Data display, KPI, ações, cockpit
├── S4 · CHECKOUT / PRICING → Conversão de pagamento, upgrade
├── S5 · EMAIL / SEQUENCE   → Nutrição, onboarding, retenção
├── S6 · LEAD CAPTURE       → Formulários, popups, lead magnets
├── S7 · SOCIAL / ADS       → Criativos, anúncios, posts
└── S8 · APP / SPA          → Discovery engine, lead detail, settings
```

---

## S1 · LANDING PAGE
**Objetivo:** Converter visitante → lead. Máximo impacto visual em 3 segundos.

### Skills aplicáveis

| Skill | O que entrega | Como o compositor usa |
|-------|--------------|----------------------|
| `copywriting` | Headlines, subheads, CTAs, social proof copy | Gera texto da hero, features, depoimentos |
| `marketing-psychology` | Cores por emoção, viés cognitivo, prova social | Define paleta emocional + urgency triggers |
| `product-marketing` | ICP, personas, JTBD, value prop | Define tom de voz + hierarquia de mensagem |
| `cro` | Conversão, scroll depth, heatmaps, A/B testing | Estratégia de variantes + métricas |
| `offers` | Estrutura de oferta, garantia, bônus | Define CTA + pricing highlight |
| `customer-research` | Voz do cliente, objeções, linguagem real | Copy usa palavras REAIS dos clientes |

### Design Tokens prioritários

| Camada | Intensidade | Referência |
|--------|:----------:|-----------|
| **Paleta** | 🔴 Máxima | Psicologia de cor por categoria GMB + emoção |
| **Tipografia** | 🔴 Máxima | Display font (hero), body font (features) |
| **Motion/Scroll** | 🔴 Máxima | Scroll-reveal, parallax, velocity, sticky |
| **Spacing** | 🟡 Média | Hero arejado, features densidade média |
| **Shadows** | 🟡 Média | Cards de depoimento, CTA elevation |
| **Radius** | 🟢 Baixa | Consistente com a paleta |

### Referências embedadas
- `open-design/stripe` — Hero com gradiente + social proof
- `open-design/intercom` — Warm off-white + CTA orange
- `open-design/vercel` — Shadow-as-border, Geist font
- `21st-magic/scroll-based-velocity` — Texto reativo ao scroll
- `21st-magic/magic-card` — Spotlight effect no card principal
- `21st-magic/bento-grid` — Features em grid Bento

---

## S2 · BLOG / CONTEÚDO
**Objetivo:** Tráfego orgânico, autoridade, SEO. Leitura confortável.

### Skills aplicáveis

| Skill | O que entrega | Como o compositor usa |
|-------|--------------|----------------------|
| `content-strategy` | Topic clusters, pillar pages, content calendar | Estrutura de conteúdo |
| `seo-audit` | On-page SEO, meta tags, headings, velocidade | Otimização técnica |
| `programmatic-seo` | Páginas em escala (cidade×categoria) | Templates de landing local |
| `copywriting` | Títulos, subtítulos, body copy | Estrutura do artigo |
| `copy-editing` | Clareza, legibilidade, tom | Refinamento do texto |
| `schema` | Structured data, rich results | JSON-LD automático |
| `image` | Imagens, alt text, compressão | Otimização visual |

### Design Tokens prioritários

| Camada | Intensidade | Referência |
|--------|:----------:|-----------|
| **Tipografia** | 🔴 Máxima | Leitura longa: font-size +20%, line-height 1.6+ |
| **Spacing** | 🔴 Máxima | Largura de leitura (65ch), espaço entre parágrafos |
| **Paleta** | 🟡 Média | Background leitura (nunca branco puro), links |
| **Motion/Scroll** | 🟡 Média | Progress bar, scroll-spy, reveal sutil |
| **Responsive** | 🟡 Média | Mobile-first, font-size responsivo |

### Referências embedadas
- `open-design/apple` — Editorial precision, SF Pro Display
- `open-design/stripe` — Content pages com tipografia sohne-var
- `open-design/perplexity` — Dark mode reading

---

## S3 · DASHBOARD ADMIN
**Objetivo:** Data display, ações rápidas, clareza. Densidade alta de informação.

### Skills aplicáveis

| Skill | O que entrega | Como o compositor usa |
|-------|--------------|----------------------|
| `analytics` | Métricas, KPIs, dashboards, tracking | Estrutura de dados + hierarquia |
| `revops` | Funil, receita, métricas de negócio | KPIs do dashboard |
| `product-marketing` | ICP, health score, lead scoring | Dados exibidos no cockpit |
| `sales-enablement` | Battle cards, objection handling | Cards de lead + concorrentes |

### Design Tokens prioritários

| Camada | Intensidade | Referência |
|--------|:----------:|-----------|
| **Paleta** | 🔴 Máxima | Data colors (chart-1 a chart-5), semantic colors (score, status) |
| **Spacing** | 🔴 Máxima | Densidade alta, compacto, grid alinhado |
| **Tipografia** | 🟡 Média | Mono para dados, tabular numbers, font-size pequeno |
| **Radius** | 🟡 Média | Cards, chips, badges |
| **Motion/Scroll** | 🟢 Zero | Dados não dançam. Zero animação (exceto loading). |
| **Shadows** | 🟢 Baixa | Elevação sutil para cards |

### Referências embedadas
- `open-design/linear-app` — Dark precision, minimal chrome
- `open-design/supabase` — Dark emerald dashboard, pill geometry
- `open-design/posthog` — Warm sage data display
- `open-design/cisco` — Enterprise dashboard density
- **Materio** — 36 tokens base (spacing, palette, typography) — referência PRIMÁRIA

---

## S4 · CHECKOUT / PRICING
**Objetivo:** Converter trial → pago. Transparência, confiança, zero atrito.

### Skills aplicáveis

| Skill | O que entrega | Como o compositor usa |
|-------|--------------|----------------------|
| `pricing` | Tiers, packaging, freemium, trials, discounts | Estrutura de preços + design |
| `offers` | Garantia, bônus, escassez | Elementos de confiança |
| `cro` | Checkout flow, objeções, fricção | Otimização do fluxo |
| `paywalls` | Upgrade prompts, paywall timing | Quando mostrar upgrade |
| `marketing-psychology` | Ancoragem, aversão à perda, prova social | Destaque do plano recomendado |

### Design Tokens prioritários

| Camada | Intensidade | Referência |
|--------|:----------:|-----------|
| **Paleta** | 🔴 Máxima | Tier colors (free=stone, starter=mint, pro=navy, escala=coral) |
| **Shadows** | 🔴 Máxima | Plano recomendado elevado, glow effect |
| **Radius** | 🟡 Média | Cards de preço, botões de CTA |
| **Spacing** | 🟡 Média | Comparação lado a lado, feature lists |

### Referências embedadas
- `open-design/stripe` — Pricing page elegante, multi-layer shadows
- `open-design/vercel` — Minimal pricing, shadow-as-border
- `21st-magic/shine-border` — Destaque no plano recomendado
- `21st-magic/magic-card` — Spotlight no CTA principal

---

## S5 · EMAIL / SEQUENCE
**Objetivo:** Nutrir leads, onboardar, reter. Consistência cross-device.

### Skills aplicáveis

| Skill | O que entrega | Como o compositor usa |
|-------|--------------|----------------------|
| `emails` | Sequências, automação, segmentação | Estrutura da sequência |
| `onboarding` | Ativação, first value, time-to-value | Emails de onboarding |
| `churn-prevention` | Cancel flow, save offers, win-back | Emails de retenção |
| `referrals` | Programa de indicação, recompensas | Emails de referral |
| `copywriting` | Subject lines, body copy, CTAs | Texto do email |

### Design Tokens prioritários

| Camada | Intensidade | Referência |
|--------|:----------:|-----------|
| **Tipografia** | 🔴 Máxima | Email-safe fonts, line-height generoso |
| **Spacing** | 🔴 Máxima | Largura máxima 600px, padding consistente |
| **Paleta** | 🟡 Média | Brand + link color + CTA |
| **Responsive** | 🔴 Máxima | Mobile-first obrigatório (60%+ abertura mobile) |

### Referências embedadas
- `open-design/intercom` — Email templates conversacionais
- `open-design/linear-app` — Minimal transactional emails

---

## S6 · LEAD CAPTURE
**Objetivo:** Formulários, popups, lead magnets. Máxima conversão com mínimo atrito.

### Skills aplicáveis

| Skill | O que entrega | Como o compositor usa |
|-------|--------------|----------------------|
| `lead-magnets` | Checklist, templates, calculadoras, diagnósticos | Tipo de lead magnet |
| `popups` | Timing, trigger, exit-intent, design | Quando e como mostrar |
| `signup` | Form fields, social login, progressive profiling | Design do formulário |
| `cro` | Form optimization, field reduction, micro-copy | Otimização de conversão |
| `marketing-psychology` | Prova social, reciprocidade, escassez | Elementos de persuasão |

### Design Tokens prioritários

| Camada | Intensidade | Referência |
|--------|:----------:|-----------|
| **Spacing** | 🔴 Máxima | Form fields, labels, CTAs |
| **Radius** | 🟡 Média | Inputs, botões |
| **Shadows** | 🟡 Média | Modal/popup elevation |
| **Motion** | 🟡 Média | Entrada do popup, focus states |

### Referências embedadas
- `21st-magic/confetti` — Celebração pós-captura
- `21st-magic/cool-mode` — Delight na interação

---

## S7 · SOCIAL / ADS CREATIVE
**Objetivo:** Criativos para Meta, Google, TikTok, LinkedIn. Formatos específicos por plataforma.

### Skills aplicáveis

| Skill | O que entrega | Como o compositor usa |
|-------|--------------|----------------------|
| `ads` | Google Ads, Meta Ads, LinkedIn Ads, TikTok | Estratégia de mídia paga |
| `ad-creative` | Formatos, hooks, CTAs, A/B testing | Design do criativo |
| `social` | Calendário, formato por plataforma, voz | Conteúdo orgânico |
| `video` | Roteiro, formatos (9:16, 16:9, 1:1) | Video ads |
| `copywriting` | Hooks (3 segundos), corpo, CTA | Copy do anúncio |
| `image` | Dimensões, compressão, boas práticas | Assets visuais |

### Design Tokens prioritários

| Camada | Intensidade | Referência |
|--------|:----------:|-----------|
| **Paleta** | 🔴 Máxima | Brand + high contrast (ads precisam chamar atenção) |
| **Tipografia** | 🔴 Máxima | Bold, legível em mobile (tamanho mínimo 14px) |
| **Motion** | 🔴 Máxima | Video hooks (3s), transições rápidas |
| **Responsive** | 🔴 Máxima | Formatos: 1:1, 9:16, 16:9, 4:5 |

---

## S8 · APP / SPA (Discovery Engine)
**Objetivo:** Aplicação interativa. Descoberta de leads, scoring, detalhes.

### Skills aplicáveis

| Skill | O que entrega | Como o compositor usa |
|-------|--------------|----------------------|
| `prospecting` | Descoberta, qualificação, list building | Discovery engine |
| `competitor-profiling` | Battle cards, SWOT, diferenciais | Competitive landscape |
| `competitors` | Páginas de comparação, alternative pages | Comparação side-by-side |
| `product-marketing` | ICP, health score, lead scoring | Scoring engine |
| `marketing-ideas` | 43 ideias por canal | Recommendation engine |
| `marketing-plan` | Estratégia completa por lead | Marketing plan generator |
| `sales-enablement` | One-pagers, pitch decks, demo scripts | Output pro SMB |

### Design Tokens prioritários

| Camada | Intensidade | Referência |
|--------|:----------:|-----------|
| **Paleta** | 🔴 Máxima | Semantic scoring colors, Schwartz levels, lead status |
| **Spacing** | 🔴 Máxima | Data density, tabelas, filtros |
| **Tipografia** | 🟡 Média | Tabular numbers, mono para dados |
| **Radius** | 🟡 Média | Chips, badges, filtros |
| **Motion** | 🟢 Zero | Dados, não distração |

### Referências embedadas
- `open-design/linear-app` — App precision, keyboard shortcuts
- `open-design/supabase` — Data-heavy dashboard
- `open-design/cursor` — AI-first interface

---

## TABELA RESUMO: Skill → Superfície

| # | Skill | S1 LP | S2 Blog | S3 Dash | S4 Checkout | S5 Email | S6 Lead | S7 Ads | S8 App |
|---|-------|:-----:|:------:|:------:|:----------:|:------:|:------:|:----:|:----:|
| 1 | `product-marketing` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 2 | `copywriting` | ✅ | ✅ | | ✅ | ✅ | ✅ | ✅ | |
| 3 | `marketing-psychology` | ✅ | | | ✅ | | ✅ | ✅ | |
| 4 | `cro` | ✅ | | | ✅ | | ✅ | | |
| 5 | `offers` | ✅ | | | ✅ | | ✅ | | |
| 6 | `customer-research` | ✅ | | | | | | | |
| 7 | `content-strategy` | | ✅ | | | | | | |
| 8 | `seo-audit` | | ✅ | | | | | | |
| 9 | `programmatic-seo` | | ✅ | | | | | | |
| 10 | `copy-editing` | | ✅ | | | | | | |
| 11 | `schema` | | ✅ | | | | | | |
| 12 | `image` | | ✅ | | | | | ✅ | |
| 13 | `analytics` | | | ✅ | | | | | |
| 14 | `revops` | | | ✅ | | | | | |
| 15 | `sales-enablement` | | | ✅ | | | | | ✅ |
| 16 | `pricing` | | | | ✅ | | | | |
| 17 | `paywalls` | | | | ✅ | | | | |
| 18 | `emails` | | | | | ✅ | | | |
| 19 | `onboarding` | | | | | ✅ | | | |
| 20 | `churn-prevention` | | | | | ✅ | | | |
| 21 | `referrals` | | | | | ✅ | | | |
| 22 | `lead-magnets` | | | | | | ✅ | | |
| 23 | `popups` | | | | | | ✅ | | |
| 24 | `signup` | | | | | | ✅ | | |
| 25 | `ads` | | | | | | | ✅ | |
| 26 | `ad-creative` | | | | | | | ✅ | |
| 27 | `social` | | | | | | | ✅ | |
| 28 | `video` | | | | | | | ✅ | |
| 29 | `prospecting` | | | | | | | | ✅ |
| 30 | `competitor-profiling` | | | | | | | | ✅ |
| 31 | `competitors` | | | | | | | | ✅ |
| 32 | `marketing-ideas` | | | | | | | | ✅ |
| 33 | `marketing-plan` | | | | | | | | ✅ |
| 34 | `marketing-loops` | ✅ | ✅ | | | | | | |
| 35 | `ai-seo` | | ✅ | | | | | | |
| 36 | `site-architecture` | ✅ | ✅ | | | | | | |
| 37 | `free-tools` | ✅ | | | | | ✅ | | |
| 38 | `launch` | ✅ | | | | | | | |
| 39 | `co-marketing` | ✅ | | | | | | | |
| 40 | `public-relations` | | ✅ | | | | | | |
| 41 | `community-marketing` | | | | | | | ✅ | |
| 42 | `cold-email` | | | | | ✅ | | | |
| 43 | `directory-submissions` | | ✅ | | | | | | |

### Skills FUNDAÇÃO (aplicam-se a TODAS as superfícies)

| Skill | Função |
|-------|--------|
| `product-marketing` | ICP, personas, brand voice, value prop — lido PRIMEIRO por todos os outros |
| `marketing-council` | Simula banca de especialistas (Seth Godin, David Ogilvy) para julgar qualidade |
| `ab-testing` | Metodologia de teste A/B para qualquer superfície |

---

## INTEGRAÇÃO COM ADR-0020 (Compositor de Tokens)

O compositor agora tem **8 superfícies × 6 pipelines de inferência**:

```typescript
// tokens-composer.ts — atualizado com matriz de superfícies

interface TokenIntent {
  surface: 'landing-page' | 'blog' | 'dashboard' | 'checkout' | 
           'email' | 'lead-capture' | 'social-ads' | 'app-spa';
  category: string;        // GMB category
  region: string;          // geo
  audience: Audience;      // derivado de DataForSEO + product-marketing
  
  // NOVO: skills prioritários para esta superfície
  activeSkills: string[];  // ex: ["copywriting", "marketing-psychology", "cro"]
  
  // NOVO: referências de design para esta superfície
  designRefs: {
    openDesign: string[];  // ex: ["stripe", "intercom"]
    magicUi: string[];     // ex: ["magic-card", "scroll-based-velocity"]
    materio: boolean;      // dashboard sempre true
  };
}
```

### Pipeline de inferência por superfície

| Superfície | Paleta | Tipo | Spacing | Shadow | Motion | Responsive |
|-----------|:------:|:----:|:------:|:-----:|:-----:|:---------:|
| S1 Landing | 🔴 psi+cor | 🔴 display | 🟡 médio | 🟡 card | 🔴 scroll | 🟡 mobile |
| S2 Blog | 🟡 leitura | 🔴 body | 🔴 65ch | 🟢 none | 🟡 progress | 🔴 mobile |
| S3 Dashboard | 🔴 data+semantic | 🟡 mono | 🔴 denso | 🟢 sutil | 🟢 zero | 🟢 desktop |
| S4 Checkout | 🔴 tiers | 🟡 bold | 🟡 comp | 🔴 glow | 🟢 zero | 🔴 mobile |
| S5 Email | 🟡 brand | 🔴 safe | 🔴 600px | 🟢 none | 🟢 zero | 🔴 mobile |
| S6 Lead Capture | 🟡 brand | 🟡 clean | 🔴 form | 🟡 modal | 🟡 entrada | 🔴 mobile |
| S7 Social Ads | 🔴 contrast | 🔴 bold | 🟡 formato | 🟢 none | 🔴 video | 🔴 multi |
| S8 App SPA | 🔴 semantic | 🟡 mono | 🔴 data | 🟢 sutil | 🟢 zero | 🟡 desktop |

---

## CONCLUSÃO

**Sim, escolhemos os skills certos para a ADR-0020** — mas a matriz revela que:

1. **`product-marketing` é FUNDAÇÃO** — todo pipeline de tokens DEVE ler o ICP/persona antes de inferir
2. **Cada superfície tem seu próprio conjunto** — Landing usa `copywriting+psychology+cro`, Dashboard usa `analytics+revops`, App usa `prospecting+competitor`
3. **Materio é referência PRIMÁRIA para Dashboard** — não open-design. Dashboard = Materio + semantic tokens.
4. **21st-magic é referência PRIMÁRIA para Landing** — scroll, magic-card, bento-grid, confetti
5. **open-design é referência para TODAS** — mas com pesos diferentes por superfície
6. **Faltam 3 skills no Qdrant?** — Temos 43 de 43. Todos os Corey Haines skills estão embedados.

### Atualização necessária na ADR-0020

A ADR-0020 deve incluir esta matriz. O `tokens-composer.ts` recebe `surface` como parâmetro e seleciona os skills + design refs corretos automaticamente.
