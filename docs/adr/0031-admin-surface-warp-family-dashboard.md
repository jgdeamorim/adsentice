# ADR-0031 · /admin/surface — Warp Family Dashboard · Status das 22 Superfícies

**Status:** proposed
**Date:** 2026-07-17
**Deciders:** founder, claude
**Extends:** ADR-0018 (Warp Family Design System), ADR-0030 (Intelligence Runtime), ADR-0029 (Session Log)
**Supersedes:** none

## Contexto

O adsentice possui um **Design System Semântico** — a **Família Warp** — documentado em ADR-0018 e implementado em `packages/warp/` (18 arquivos TypeScript, ~108 KB, 9 módulos M1-M9). A Warp define **22 superfícies (S1-S22)** — cada tela/produto do ecossistema adsentice — com mapeamento para planos, segmentos, skills de marketing e tokens de design.

**Estado atual das 22 superfícies (2026-07-17):**

| Status | Superfícies |
|--------|-------------|
| 🟢 **LIVE** | S3 (Dashboard Admin em :3000) · S10 (Raio-X — pipeline completo, 30 previews geradas) |
| 🟡 **PARTIAL** | S4 (Checkout esboçado em solutions/page.tsx) · S11 (Landing Cliente — template base) |
| 🔴 **PLANNED** | 18 superfícies (S1, S2, S5-S9, S12-S22) apenas documentadas na matriz Warp |

**Problema:** não há uma página que consolide o status das 22 superfícies, seu progresso de implementação, skills associadas, planos e tokens. O fundador e o time precisam de um **dashboard unificado** para gerenciar o roadmap de produto.

**Inventário completo do ecossistema Warp:**

| Recurso | Quantidade | Fonte |
|---------|:---:|------|
| Superfícies (S1-S22) | 22 | `warp-surfaces-marketing-skills-matrix.md` |
| Módulos (M1-M9) | 9 implementados | `packages/warp/src/` |
| Componentes Qdrant | 107 | `adsentice-self` (kind=component, tag=adsentice-warp) |
| Snippets + referências | 57 | `adsentice-self` (kind=snippet/reference) |
| Design knowledge points | 6.267 | `adsentice-self` (kind=design-knowledge) |
| Previews HTML geradas | 74 | `docs/preview/` |
| Skills de marketing mapeadas | 59 | `vendor/marketingskills/` + `vendor/advertising-skills/` |
| Segmentos cobertos | 7 (Saúde, Beleza, Serviços, Alimentação, Comércio, Educação, Hospitalidade) | Matriz Warp |
| Planos | 4 (Raio-X R$0, Sentinela R$197, Domínio R$497, Escala R$997) | `solutions/page.tsx` |
| Tokens CSS | 40 tokens em 10 camadas | `apps/web/src/tokens.css` |

## Decisão

Implementar **`/admin/surface`** — uma **23ª superfície (S3-aux)** que serve como **Dashboard de Status das 22 Superfícies Warp**. É uma superfície 🟡 Internal que consolida o roadmap de produto com dados vivos do filesystem e do Qdrant.

### Arquitetura

```
┌──────────────────────────────────────────────────────────────────┐
│                    /ADMIN/SURFACE — Warp Dashboard                │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  HEADER                                                          │
│  📊 Warp Surface Dashboard · 22 superfícies · 9 módulos          │
│  2 live · 2 partial · 18 planned · $0 (read-only)               │
│                                                                  │
│  ┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐  │
│  │ 🟢 LIVE (2)     │ │ 🟡 PARTIAL (2)  │ │ 🔴 PLANNED (18) │  │
│  │ S3 Admin        │ │ S4 Checkout      │ │ S1-S22 restantes │  │
│  │ S10 Raio-X      │ │ S11 Landing      │ │                  │  │
│  └──────────────────┘ └──────────────────┘ └──────────────────┘  │
│                                                                  │
│  ── MATRIZ SUPERFÍCIES × PLANOS × SEGMENTOS ──                   │
│                                                                  │
│  Surface │ Nome              │ Plano  │ Segmento │ Skills │ Tokens│
│  ────────┼───────────────────┼────────┼──────────┼────────┼──────│
│  🟢 S3   │ Dashboard Admin   │ Interno│ Todos    │analytics│🔴   │
│  🟢 S10  │ Relatório Raio-X   │ R$0    │ Todos    │seo-audit│🔴  │
│  🟡 S4   │ Checkout/Pricing   │ Todos  │ Todos    │pricing │🔴    │
│  🔴 S1   │ Landing adsentice  │ R$0    │ Todos    │copywriting│🔴 │
│  ...     │ ...               │ ...    │ ...      │ ...    │ ...   │
│                                                                  │
│  ── BREAKDOWN POR PLANO ──                                       │
│                                                                  │
│  R$0 Raio-X:     S10 ✅ · S1 ⏳ · S2 ⏳ · S12 ⏳                  │
│  R$197 Sentinela: S9 ⏳ · S11 ⏳ · S13 ⏳                         │
│  R$497 Domínio:   S9 ⏳ · S15 ⏳                                  │
│  R$997 Escala:    S9 ⏳ · S4 ⏳ · S19 ⏳                          │
│                                                                  │
│  ── BREAKDOWN POR SKILL ──                                       │
│                                                                  │
│  seo-audit         → S10 ✅, S2 ⏳, S11 ⏳                        │
│  copywriting       → S1 ⏳, S4 ⏳, S10 ✅, S12 ⏳                 │
│  analytics         → S3 ✅, S15 ⏳, S16 ⏳, S17 ⏳                │
│  ... (59 skills mapeadas)                                        │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### Dados vivos vs estáticos

A página mescla **duas fontes**:

**1. Dados ESTÁTICOS** (definições da matriz Warp, `warp-surfaces-marketing-skills-matrix.md`):
- Lista das 22 superfícies com nome, grupo, plano, segmento, skills, tokens
- Mapeamento superfície → solução → skills → tokens
- Relacionamentos entre superfícies (ex: S10 alimenta S9)

**2. Dados VIVOS** (filesystem checks, $0):
- Superfície → existe página/rota em `:3000`? (check `apps/web/src/app/[lang]/(dashboard)/(private)/admin/[surface]`)
- Superfície → tem previews HTML em `docs/preview/`? (count)
- Superfície → tem código em `packages/warp/src/`? (check)
- Superfície → tem componentes no Qdrant? (kind=component, tag=adsentice-warp)
- Superfície → skills wireadas? (ADR-0030 Nível 5)
- Progresso de implementação: LIVE / PARTIAL / PLANNED

### Fonte de verdade: arquivo JSON de configuração

Para evitar hardcoding, criar `docs/spec/warp-surface-status.json` como **fonte única de verdade**:

```json
{
  "surfaces": [
    {
      "id": "S3",
      "name": "Dashboard Admin",
      "group": "internal",
      "plan": "internal",
      "segment": "todos",
      "skills": ["analytics", "revops", "product-marketing"],
      "tokens": ["data", "semantic", "denso", "zero-motion"],
      "status": "live",
      "route": "/admin",
      "warpModule": null,
      "previews": 0
    },
    {
      "id": "S10",
      "name": "Relatório Raio-X",
      "group": "client-facing",
      "plan": "r0",
      "segment": "todos",
      "skills": ["seo-audit", "schema", "site-architecture", "copywriting", "psychology"],
      "tokens": ["semantic", "data-colors", "brand"],
      "status": "live",
      "route": null,
      "warpModule": "s10-raio-x.ts",
      "previews": 30
    }
  ]
}
```

A página lê este JSON (estático) + faz filesystem checks (dinâmico) para determinar status real.

## Implementação

### Nível 1: Fonte de verdade + API

| Passo | Arquivo | Ação |
|-------|---------|------|
| 1.1 | `docs/spec/warp-surface-status.json` (NOVO) | Criar JSON com as 22 superfícies + status + metadados |
| 1.2 | `api/surface/status/route.ts` (NOVO) | `GET /api/surface/status` — ler JSON + filesystem checks → status vivo |

### Nível 2: Página `/admin/surface`

| Passo | Arquivo | Ação |
|-------|---------|------|
| 2.1 | `admin/surface/page.tsx` (NOVO) | Server Component com Suspense + inner async |
| 2.2 | Componente `WarpSurfaceCard` | Card por superfície: nome, grupo, plano, skills, tokens, status chip |
| 2.3 | Componente `WarpProgressBar` | Barra de progresso: LIVE / PARTIAL / PLANNED |

### Nível 3: Menu item

| Passo | Arquivo | Ação |
|-------|---------|------|
| 3.1 | `VerticalMenu.tsx` | Adicionar `<MenuItem>` " Surface" no admin submenu |
| 3.2 | `middleware.ts` | Adicionar `api/surface` ao matcher público |

### Nível 4: Cross-reference com ADR-0030

| Passo | Arquivo | Ação |
|-------|---------|------|
| 4.1 | `surface/page.tsx` | Coluna "🤖 Auto-Pilot" — mostra quais superfícies são alimentadas pelo Intelligence Runtime |
| 4.2 | `surface/page.tsx` | Link para `/admin/pipeline` nas superfícies com dados de funil |

### Nível 5: Wire com Qdrant

| Passo | Arquivo | Ação |
|-------|---------|------|
| 5.1 | `api/surface/status/route.ts` | Query Qdrant por `kind=component,tag=adsentice-warp` — count por superfície |
| 5.2 | `surface/page.tsx` | Mostrar "📦 107 componentes" com breakdown por superfície |

## Custos

| Componente | Custo |
|------------|:---:|
| JSON estático | $0 |
| Filesystem checks | $0 |
| Qdrant query | $0 (local) |
| Supabase | $0 (não usado — dados são estáticos) |
| **Total** | **$0** |

## Referências

- `docs/spec/warp-surfaces-marketing-skills-matrix.md` — Matriz completa das 22 superfícies
- `docs/adr/0018-warp-family-design-system-semantico.md` — Família Warp M1-M9
- `docs/adr/0020-compositor-tokens-semanticos-morph-por-intent.md` — M9 Tokens Composer
- `docs/adr/0030-adsentice-intelligence-runtime-capture-engine.md` — Intelligence Runtime
- `packages/warp/src/s10-raio-x.ts` — S10 Raio-X (455 linhas)
- `packages/warp/src/tokens-composer.ts` — Tokens por segmento
- `docs/spec/base-matriz-adsentice.md` — Base-Matriz `ADS.COR.warp`
- `apps/web/src/components/layout/vertical/VerticalMenu.tsx` — Admin menu items
- `vendor/marketingskills/` — 47 skills Corey Haines
- `vendor/advertising-skills/` — 12 skills Kim Barrett
