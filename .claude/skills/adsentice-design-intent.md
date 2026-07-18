# /adsentice-design-intent — Design Decision Engine (7 dimensions)

**Agent skill baseada em Vercel agent-skills pattern: trigger-based activation, categorized rules, scorecard output.**

Inspirada em `web-design-guidelines` (100+ rules) e `composition-patterns` (compound components),
aplicada ao vocabulário de design semântico do adsentice (174 KG edges, 55 facets, 8 domains).

## Trigger (quando ativar)

O agente ativa esta skill automaticamente quando detecta:
- "gerar Raio-X", "composeS10", "render landing page"
- "design para {segmento}" (saúde, beleza, alimentação...)
- "aplicar tokens", "queryMediaIcons", "queryCSSPatterns"

## Domínios de Design (8)

### 1. LAYOUT (vocab.layout — 7 facets)
Regras por superfície:
- **S10 Raio-X**: hero→score→info_grid(3col)→gap-list→cta(pill)→footer
- **Landing**: hero→trust→how→capabilities→stats→voice→pricing→faq→cta
- **Dashboard**: sidebar+header+content, kpi cards, charts, tables

### 2. SPACING (vocab.spacing — 5 facets)
| Facet | Valor | Segmentos |
|-------|-------|-----------|
| `compact` | 0.5-0.75rem | comercio, alimentação |
| `default` | 1-1.25rem | saúde, serviços, educação |
| `airy` | 1.5-2rem | beleza, hospitalidade |
| `dense` | 0.25-0.5rem | dashboards (S3, S5) |
| `rhythm` | 8pt baseline grid | todas as superfícies |

### 3. COLOR/EMOTION (vocab.color — 6 facets)
| Facet | Hue range | Segmentos |
|-------|-----------|-----------|
| `warm` | 25-35° (terracota, gold) | alimentação, hospitalidade |
| `cool` | 160-260° (azul, verde) | saúde, tecnologia |
| `vibrant` | high saturation, bold | beleza, entretenimento |
| `muted` | low saturation | serviços corporativos |
| `neutral` | grayscale, slate | profissional, minimal |
| `dark` | carbon-black canvas | EVO-API pattern |

### 4. TYPOGRAPHY (vocab.typography — 5 facets)
| Facet | Font | Uso |
|-------|------|-----|
| `sans` | Inter, system-ui | Default (90%) |
| `serif` | Playfair Display, Georgia | Beleza, hospitalidade premium |
| `display` | Large headings, tight tracking | Editorial/landing hero |
| `mono` | JetBrains Mono, SF Mono | Code, dados, logs |
| `heading_clarity` | text-wrap:balance, 1.2 lh, 800w | Todas as superfícies |

### 5. SHADOW (vocab.shadow — 4 facets)
Pirâmide por plano (plan-tier):
| Facet | Plano | CSS |
|-------|-------|-----|
| `none` | raio-x (R$0) | flat, zero elevation |
| `subtle` | sentinela (R$197) | 0 1px 2px rgba(0,0,0,.05) |
| `moderate` | domínio (R$497) | 0 4px 6px rgba(0,0,0,.07) |
| `dramatic` | escala (R$997) | 0 20px 25px rgba(0,0,0,.1) |

### 6. ANIMATION (vocab.animation — 4 facets)
| Facet | Tech | Quando usar |
|-------|------|------------|
| `animation` | CSS scroll-driven | Performance-first, todas superfícies |
| `keyframe` | @keyframes CSS | Landing pages, hero sections |
| `motion` | Framer Motion / spring | Beleza, hospitalidade, premium |
| `scroll` | GSAP ScrollTrigger | Storytelling, parallax |

### 7. ICONOGRAPHY (vocab.icon — 6 facets)
| Facet | Ícone | Contexto |
|-------|-------|----------|
| `search` | 🔍 magnifying glass | Hero badge, discovery |
| `chart` | 📊 bar graph | Stats, concorrência |
| `action` | 💬 CTA | WhatsApp, call-to-action |
| `rating` | ⭐ star | Reviews, reputação |
| `trust` | 🛡️ shield | Segurança, garantia |
| `premium` | ✨ spark | Diferenciação, AI highlight |

### 8. CONVERSION (vocab.conversion — 8 facets)
Gatilhos psicológicos (Cialdini + Schwartz):
| Facet | Tática | Aplicação |
|-------|--------|-----------|
| `urgency` | Escassez temporal | Hero badge, CTA |
| `social_proof` | Prova social | Ratings, testimonials |
| `guarantee` | Inversão de risco | "Grátis pra começar" |
| `authority` | Especialista | Certificações, experiência |
| `reciprocity` | Valor antecipado | Diagnóstico gratuito → upsell |
| `commitment` | Micro-compromissos | Free trial, passo a passo |

## Composição (composition-patterns applied)

### Slot-Driven Render (g0 doctrine)
O especialista emite gramática, o renderer aplica materials:
```
SurfaceSpecialist.inferLayout(context, components)
  → LayoutTree { slots, layoutHints, tokens }
  → SLOT_RENDERERS[slotName](slot, ctx)
  → HTML string com tokens unificados
```

### Vocab-Driven Selection
```
resolveIntentVocab(segment, ontology)
  → iconFacets → queryMediaIcons(filter)
  → animationFacets → queryMediaAnimation(filter)
  → designFacets → queryCSSPatterns
  → designSystems → queryDesignSystem
```

## Scorecard

A cada render, o agente reporta:
```
╔══════════════════════════════════════╗
║  S10 Raio-X · Kamilla Scalzer       ║
║  QG: 5/5 · SVGs: 9 · Copy: DeepSeek ║
║  Anim: animation, keyframe, fade    ║
║  DSys: carbon_ibm, material3, primer║
║  Icons: search, trust, star, shield ║
╚══════════════════════════════════════╝
```

## Referências

- Vercel agent-skills: `web-design-guidelines` (100+ rules), `composition-patterns` (compound components)
- KG: 174 edges, 55 facets, 8 domains
- `packages/warp/src/vocab-resolver.ts` — resolveIntentVocab()
- `packages/warp/src/4-composer.ts` — SurfaceSpecialist S10
- EVO-API `compose.rs` — query_vocab(facet=X)
