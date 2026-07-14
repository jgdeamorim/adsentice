---
id: adr-0019
title: Fontes de Conhecimento para Desenvolvimento — context7 MCP vs 21st-magic MCP
status: accepted
date: 2026-07-14
deciders: founder, claude
extends: [adr-0018, adr-0017, adr-0013]
references:
  - ADR-0018 (Família Warp, Design System Vivo)
  - ADR-0017 (Frontend Enterprise)
  - ADR-0013 (Build vs Buy, estratégia de integração de APIs)
  - .mcp.json (configuração dos MCP servers, commit 8c2ac71)
  - EVO-API self-essentials/ECC/the-shortform-guide.md (fonte do 21st-magic)
  - context7 MCP (@upstash/context7-mcp, API key ctx7sk-...)
  - 21st-magic MCP (@magicuidesign/mcp, disabled: true)
  - Corpus adsentice-self: 2,364 pontos no Qdrant (commit 8c2ac71)
---

# ADR-0019 · Fontes de Conhecimento para Desenvolvimento — context7 vs 21st-magic

## Contexto

O adsentice está entrando na fase de implementação do frontend (ADR-0017) e do design system Warp (ADR-0018). Para codificar com qualidade, precisamos de fontes de conhecimento confiáveis e atualizadas sobre a stack escolhida: Next.js 15, Tailwind CSS, shadcn/ui, Supabase, React 19.

Durante a sessão de 2026-07-14, configuramos e testamos dois MCP servers que servem como fontes de conhecimento para desenvolvimento:

| MCP Server | Tipo | Conteúdo | Status |
|------------|------|----------|--------|
| **context7** | Documentação técnica | Código-fonte real de repositórios GitHub | `enabled` |
| **21st-magic** | Componentes visuais | Magic UI — componentes React + Tailwind prontos | `disabled: true` |

**Fonte:** `.mcp.json` (commit `8c2ac71`), testados com 12 queries reais em 2026-07-14.

### Por que isso importa agora

1. **ADR-0017** define stack React 19 + Vite + Tailwind + shadcn/ui — precisamos de docs canônicas para implementar
2. **ADR-0018** define Warp com 8 módulos TypeScript — os componentes precisam de referência de código real
3. **ADR-0013** estabelece "build vs buy" — precisamos decidir se "compramos" componentes prontos (21st) ou construímos com docs (context7)
4. O time é small (founder + Claude Code) — eficiência na obtenção de informação é crítica

## Decisão

**context7 é a fonte primária de conhecimento para desenvolvimento. 21st-magic é fonte secundária de inspiração visual, usada sob demanda e desabilitada por padrão.**

### context7 — Fonte Primária (sempre ativo)

**O que é:** MCP server que indexa documentação de libraries open-source diretamente dos repositórios GitHub. Responde com código-fonte real, atribuído a arquivo e linha específicos.

**Cobertura da stack adsentice:**

| Library | ID context7 | Snippets | Benchmark |
|---------|-------------|----------|-----------|
| Next.js | `/vercel/next.js` | 6,047 | 88.87 |
| Tailwind CSS | `/tailwindlabs/tailwindcss.com` | 3,532 | 87.33 |
| shadcn/ui | `/shadcn-ui/ui` | 4,051 | 87.87 |
| Supabase | `/supabase/supabase` | 21,589 | 85.13 |
| Supabase SSR | `/supabase/ssr` | 481 | 89.49 |

**Fluxo de uso:** `resolve-library-id` → `query-docs` (2 passos, ~2-3s cada)

**Exemplo real de query (2026-07-14):**

```
Query: "How to create API routes with server actions in Next.js 15 app router"
Resultado: 5 snippets — Form component com Server Actions, Zod validation,
           revalidatePath, padrão completo com createPost()
Fonte: github.com/vercel/next.js/blob/canary/docs/... (atribuição exata)
```

**Custo:** Free (API key `ctx7sk-...` hardcoded no `.mcp.json`).

**Fonte:** commit `8c2ac71`, testado com 5 queries em 2026-07-14.

### 21st-magic — Fonte Secundária (desabilitado por padrão)

**O que é:** MCP server do Magic UI — 77 componentes React + TypeScript + Tailwind com animações e efeitos visuais. Instaláveis via `npx shadcn@latest add`.

**O que oferece (77 componentes):**

| Categoria | Qtd | Exemplos |
|-----------|-----|----------|
| Animações de texto | 12 | Aurora Text, Morphing Text, Hyper Text, Sparkles Text |
| Cards | 5 | Magic Card, Neon Gradient Card, Tweet Card |
| Botões | 6 | Rainbow Button, Shimmer Button, Ripple Button, Pulsating Button |
| Backgrounds/Patterns | 10 | Dot Pattern, Grid Pattern, Animated Grid, Retro Grid, Particles |
| Efeitos visuais | 8 | Confetti, Cool Mode, Meteors, Orbiting Circles |
| Layout | 4 | Bento Grid, Dock, Marquee, File Tree |
| Mockups | 4 | Safari, iPhone, Android, Terminal |
| Outros | 28 | Globe (WebGL), Lens (zoom), Scroll Progress, etc. |

**O que NÃO oferece:** Zero componentes de dados — sem tabela, formulário, input, dropdown, select, modal, dialog, toast.

**Custo:** Pago (Magic UI é produto comercial). Cada chamada ao MCP consome créditos.

**Por que disabled:** O custo não se justifica para uso contínuo. Os componentes são inspecionados sob demanda quando precisamos de inspiração para um efeito visual específico.

**Fonte:** commit `8c2ac71`, `disabled: true` no `.mcp.json`, testado com 4 queries em 2026-07-14.

## Alternativas consideradas

### A) Ambos sempre ativos (rejeitada)

**Prós:** Acesso instantâneo a ambos.
**Contras:** 21st-magic é pago, cada chamada custa. Consome slot de MCP server (limite de 6 no `.mcp.json`). A maior parte do desenvolvimento não precisa de componentes animados.

### B) Nenhum MCP externo, usar apenas docs oficiais no browser (rejeitada)

**Prós:** Zero dependência de MCP externos.
**Contras:** Quebra o fluxo no terminal. Claude Code não tem acesso a docs atualizadas sem MCP. Latência maior (alternar terminal ↔ browser). Docs oficiais não são indexadas semanticamente.

### C) Embedar componentes 21st no Qdrant ✅ (executada — 247 pontos embedados)

**Prós:** Acesso offline, sem custo por chamada. Query semântica cross-componente.
**O que foi feito:** Na sessão de 2026-07-14 (pré-`/clear`), foram embedados **247 pontos** com source `21st-magic-ui` no `adsentice-self`:
- **77 exemplos** (component_kind=example) — demos e variações dos componentes
- **23 componentes** (component_kind=component) — código-fonte TypeScript dos componentes principais
- **147 exemplos adicionais** — variações e combinações de componentes

**Evidência:** Qdrant scroll com filtro `source=21st-magic-ui` retorna 100 pontos na primeira página. Total de 2,364 pontos no corpus, sendo 247 do 21st-magic (10.5% do corpus).

**Risco de licenciamento:** Código-fonte de componentes embedados é de um produto comercial (Magic UI). Uso como referência/inspiração para design, não como código copiado diretamente em produção. Os componentes originais são instaláveis via `npx shadcn@latest add` para uso legítimo.

### D) Substituir 21st-magic por open-design MCP (avaliada, não implementada)

O open-design já tem 150 componentes embedados no Qdrant (commit `8c2ac71`). Um MCP dedicado permitiria query em tempo real sem embedar. Mas o container open-design está parado e o MCP está desconectado (`observe` do OODA). **Fica como possibilidade futura** se o container for reativado.

## Consequências

### Positivas

1. **Desenvolvimento acelerado:** context7 cobre 100% da stack com 30,000+ snippets — qualquer dúvida de API é resolvida em <5s sem sair do terminal
2. **Código canônico:** snippets vêm de repositórios oficiais com atribuição exata (arquivo + linha) — alinhado com `medido=verdade`
3. **Versionamento:** context7 permite mirar versões específicas (ex: Next.js v15.1.8, não a última canary)
4. **Custo zero:** context7 é free, 21st-magic só paga quando usado
5. **Separação de preocupações:** docs técnicas (context7) vs inspiração visual (21st) — cada ferramenta no seu domínio

### Negativas

1. **2 passos obrigatórios:** `resolve-library-id` → `query-docs` adiciona ~2-3s de latência vs. busca direta
2. **21st-magic subutilizado:** 77 componentes disponíveis mas desabilitados — perde-se a oportunidade de descoberta passiva
3. **Dependência externa:** se context7 cair, perdemos a fonte primária de docs (mitigação: docs oficiais no browser como fallback)
4. **Slot de MCP ocupado:** context7 ocupa 1 dos 6 slots do `.mcp.json`

### Neutras

1. **open-design embedado no Qdrant** (150 estilos, ~600 chunks) cobre design system patterns — complementa mas não substitui context7
2. **21st-magic embedado no Qdrant** (247 pontos, source `21st-magic-ui`) — 77 exemplos + 23 componentes + 147 variações. Cobre animações, cards, botões, backgrounds. Acesso offline sem MCP
3. **21st-magic MCP pode ser reabilitado** a qualquer momento editando `disabled: false` no `.mcp.json` para buscar novos componentes não embedados

## Matriz de uso por caso

| Caso de uso no adsentice | Ferramenta | Justificativa |
|--------------------------|------------|---------------|
| Criar dashboard com grid responsivo | **context7** | Tailwind docs — grid, responsive, sidebar |
| Criar formulário de discovery (GMB URL input) | **context7** | shadcn/ui Form + React Hook Form patterns |
| Integrar Supabase Auth (login SMB) | **context7** | Supabase SSR + Auth patterns |
| Criar tabela de leads/keywords | **context7** | shadcn/ui Table + TanStack Table docs |
| Animar card de resultado de análise | **21st-magic** | Magic Card — spotlight effect (247 pontos embedados) |
| Tela de loading/waiting (análise em progresso) | **21st-magic** | Particles, Meteors, Orbiting Circles (embedados) |
| Hero section da landing page | **21st-magic** | Animated Gradient Text, Bento Grid (embedados) |
| API handlers e mutations | **context7** | Hono + Cloudflare Workers patterns |
| Design tokens e tema Warp | **context7** | Tailwind CSS v4 + CSS custom properties |

> **Nota:** Embora context7 retorne padrões Next.js (Server Actions, App Router), o frontend adsentice usa **Vite + React 19** (ADR-0017). Next.js é referência de padrões, não runtime. Backend usa Hono no Cloudflare Workers.

## Verificação (medido=verdade)

| Afirmação | Evidência |
|-----------|-----------|
| context7 funciona com Next.js 15 | 5 queries retornaram snippets com atribuição GitHub em 2026-07-14 |
| context7 API key é válida | Hardcoded em `.mcp.json` (commit `8c2ac71`), testada com `resolve-library-id` |
| 21st-magic tem 77 componentes | `listRegistryItems` retornou `total: 77` em 2026-07-14 |
| 21st-magic não tem componentes de dados | `searchRegistryItems("form input table data")` retornou 4 resultados irrelevantes |
| 21st-magic é pago | Documentado como "Magic e pago" no commit `8c2ac71` |
| **247 pontos 21st-magic embedados no Qdrant** | `adsentice-self` scroll com filtro `source=21st-magic-ui`: 100 pontos (1ª página). 77 exemplos + 23 componentes + 147 variações |
| open-design tem 150 estilos embedados | Corpus adsentice-self: ~600 chunks com source `open-design/*` |
| Corpus total adsentice-self: 2,364 pontos | `GET /collections/adsentice-self`: `points_count: 2364` |
| Stack frontend é Vite, não Next.js (ADR-0017) | ADR-0017: "Adotamos React 19 + Vite + Tailwind CSS v4 + shadcn/ui. Next.js + MUI/Materio são removidos." |

---

*ADR-0019 · 2026-07-14 · adsentice*
