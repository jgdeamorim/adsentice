# ADSENTICE · Coding SOP — Next.js 15.1.2 + Módulos .ts Puros

> ⚠️ **LEIA ANTES de editar qualquer Server Component (.tsx) OU módulo .ts de lib.**
> Fontes: 7 SWC fixes (308 commits) + context7 + Qdrant KG + TypeScript ESLint canonical rules
> v3.0 · 2026-07-19 — adicionada Seção III (Módulos .ts Puros)

---

## I. Ciclo de Codificação

```
1. DAG (KG recall) → 2. Coda com regras → 3. Validate → 4. Commit
```

### 1. Pré-flight — DAG + KG

Antes de escrever código, buscar no KG:

```
DAG: "<keyword> [padrão] [pattern] [erro]"
     → Qdrant adsentice-self:
       ① tag=nextjs-official-practices (10 docs, Vercel oficial via context7)
       ② tag=nextjs-15 (10 regras empíricas, 7 SWC fixes)
       ③ tag=swc-compiler (9 docs, error.rs oficial + cross-reference)
     → Qdrant adsentice-conversation: histórico de erros similares
     → claude-memory: decisões SWC + SOP
```

Se for editar um arquivo que já quebrou antes, ver commits de referência:
- `ea492ed` — Suspense + inner async
- `45309b8` — return indent fix
- `e4f2419` — Leaflet SSR wrapper
- `6652753` — missing closing bracket

### 2. Coda — Aplicar regras

| Se for... | Usar |
|-----------|------|
| Server Component com dados | Suspense + inner async |
| Mapa/Leaflet | `'use client'` wrapper + `dynamic(ssr:false)` |
| Props complexas | Inline type (nunca interface) |
| try/catch | `catch (e: unknown) { void e }` |
| JSX com template literal | Evitar `&&` dentro de `{}` |

### 3. Check — Validar

```bash
# Rápido (1 arquivo)
npx tsc --noEmit -p apps/web/tsconfig.json 2>&1 | grep "meu-arquivo"

# Completo (todos os arquivos)
bash .claude/hooks/adsentice-nextjs-check.sh

# Acesso rápido (confirma que compilou)
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/en/admin/<pagina>
# 307 = compilou OK (redirect auth)
# 500 = quebrou
```

### 4. Log — Verificar erros

```bash
tail -20 /tmp/nextjs-output.log | grep -i "error\|Error\|Unexpected"
```

---

## II. Server Components (.tsx) — Regras SWC

> ⚠️ O erro `Unexpected token Grid. Expected jsx identifier` NÃO é erro de JSX.
> É o SWC (Rust) descartando o arquivo inteiro porque encontrou algo que
> não entendeu ANTES do `return (`.

### ✅ Padrões que FUNCIONAM

#### 1. Suspense + Inner Async (páginas com dados)
```tsx
import { Suspense } from 'react'

export default function Page(props: { params: Promise<{ lang: string }>; searchParams: Promise<...> }) {
  return (
    <Grid container spacing={6}>
      <Suspense fallback={<LinearProgress />}>
        <PageContent searchParams={props.searchParams} />
      </Suspense>
    </Grid>
  )
}

async function PageContent({ searchParams }: { searchParams: Promise<...> }) {
  const sp = await searchParams
  const data = await fetchData()
  return <>{/* JSX com dados */}</>
}
```

#### 2. Funções auxiliares FORA do componente
```tsx
// ✅ FORA — SWC não processa durante parse de JSX
async function getPins() { return await supabase.from(...) }
async function fetchHolds(...) { ... }

export default function Page(...) {
  const data = await getPins()
  return <JSX />
}
```

#### 3. Client Components para Leaflet/Mapas
```tsx
'use client'
import dynamic from 'next/dynamic'
const LeafletMap = dynamic(() => import('./ActualMap'), { ssr: false })
export default function Wrapper({ pins }: { pins: any[] }) {
  return <LeafletMap pins={pins} />
}
```
Regra: `dynamic(ssr: false)` só em arquivos com `'use client'`.

#### 4. Props inline, sem interfaces
```tsx
// ✅ Isto funciona
export default function Foo(props: { data: unknown; onClick: () => void }) {
// ❌ Isto QUEBRA o SWC em Server Components
interface Props { data: unknown; onClick: () => void }
export default function Foo({ data, onClick }: Props) {
```

### ❌ Padrões PROIBIDOS (.tsx)

| Padrão | Exemplo | Por que quebra |
|--------|---------|----------------|
| `catch {}` vazio | `try { ... } catch {}` | SWC não parseia bloco vazio |
| `next/dynamic` em Server | `const X = dynamic(...)` em page.tsx | `ssr: false` proibido |
| Interface antes de JSX | `interface Props { ... }` | Confunde o parser |
| Template literal com `&&` | `{x && \`texto ${var}\`}`  | SWC perde o contexto |
| `return` na col 0 | `\nreturn (` em .map() | Indentação quebrada |

---

## III. Módulos .ts Puros — Regras & Utility Map

> 🔑 Módulos `.ts` (lib, services, extractors) NÃO passam pelo SWC — mas têm
> suas próprias regras de qualidade, anti-duplicação e falha segura.
> Estas regras são derivadas de bugs reais encontrados na sessão v135 (2026-07-19).

### III.A · Utility Map — O que já existe e onde

> ⚠️ **ANTES de criar qualquer função, consulte este mapa.** Duplicar helpers
> é o erro nº 1 em módulos .ts (3 ocorrências na Fase 1 do L2b).

| Se você precisa de... | Já existe em... | Import |
|----------------------|-----------------|--------|
| **Redis raw command** | `lib/brain/a3-cache.ts` | `import { redisRaw } from "@/lib/brain/a3-cache"` |
| **Redis SETEX (cache TTL)** | `lib/brain/a3-cache.ts` | `redisRaw(\`SETEX key ${ttl} '${json}'\`)` |
| **Redis KEYS/DEL (bulk)** | `lib/brain/a3-cache.ts` | `redisRaw("KEYS prefix:*")` |
| **Fetch HTML (robusto)** | `lib/l2b/site-fetcher.ts` | `import { fetchSite } from "@/lib/l2b/site-fetcher"` |
| **URL normalize** | `lib/l2b/site-fetcher.ts` | `import { normalizeUrl, extractDomain } from "@/lib/l2b/site-fetcher"` |
| **Parse HTML (cheerio)** | `lib/l2b/parser.ts` | `import { parseHTML } from "@/lib/l2b/parser"` |
| **Framework detection (Noisy-OR)** | `lib/l2b/strategy-resolver.ts` | `import { detectFramework } from "@/lib/l2b/strategy-resolver"` |
| **Section detection (20 padrões)** | `lib/l2b/strategy-resolver.ts` | `import { detectSections } from "@/lib/l2b/strategy-resolver"` |
| **CMS detection (20 sigs)** | `lib/l2b/strategy-resolver.ts` | `import { detectCMS } from "@/lib/l2b/strategy-resolver"` |
| **Cache by domain** | `lib/l2b/cache.ts` | `import { getCached, setCache } from "@/lib/l2b/cache"` |
| **CNPJ extraction** | `lib/cnpj-crawler.ts` | `import { extractCNPJ } from "@/lib/cnpj-crawler"` |
| **CNPJ validation** | `lib/cnpj-enricher.ts` | `import { isValidCNPJ } from "@/lib/cnpj-enricher"` |
| **Discovery cache** | `lib/discovery-cache.ts` | `import { getCached, setCache } from "@/lib/discovery-cache"` ⚠️ escopo discovery |
| **WhatsApp check** | `lib/wa-check.ts` | `import { checkWhatsapp, checkWhatsappBaileys } from "@/lib/wa-check"` |
| **WA number normalize** | `lib/wa-check.ts` | `import { normWaNumber } from "@/lib/wa-check"` |
| **DataForSEO call** | `lib/dataforseo.ts` | `import { dfPost } from "@/lib/dataforseo"` |
| **DeepSeek call** | `lib/deepseek.ts` | `import { generateCopy, generateLandingCopy } from "@/lib/deepseek"` |
| **Scoring** | `lib/scoring.ts` | `import { scoreLead, ICP_CATEGORIES } from "@/lib/scoring"` |
| **Supabase REST** | `lib/discovery-persistence.ts` | `SUPA_URL + SUPA_KEY env vars` |
| **IBGE data** | `lib/ibge/` | `import { IBGEService } from "@/lib/ibge/client"` |
| **Token composer (M9)** | `lib/warp-composer.ts` | TokenComposer class |
| **Strategy resolver** | `packages/warp/src/strategy-resolver.ts` | `resolveStrategies()` |
| **Confidence scoring** | `lib/scoring.ts` | Already has multi-signal confidence |

### III.B · Checklist pré-criação de módulo .ts

Execute ESTES 5 COMANDOS antes de criar qualquer arquivo/função nova:

```bash
# 1. A função que vou criar já existe?
grep -rn "nomeDaFuncao\|nomeSimilar" apps/web/src/lib/ packages/

# 2. Estou duplicando redisRaw/execSync redis?
grep -rn "redis-cli\|execSync.*redis\|redisRaw" apps/web/src/lib/ | grep -v node_modules

# 3. Estou duplicando cheerio/fetch wrapper?
grep -rn "cheerio\.load\|from.*\"cheerio\"" apps/web/src/lib/ | grep -v node_modules
grep -rn "fetch\(.*\{.*signal.*AbortSignal\|fetch\(.*timeout" apps/web/src/lib/ | grep -v node_modules

# 4. Estou duplicando cache pattern?
grep -rn "SETEX\|cacheKey\|setCache\|getCached" apps/web/src/lib/ | grep -v node_modules

# 5. Já existe type/idêntico no types.ts ou em interfaces existentes?
grep -rn "export interface.*Nome\|type.*Nome" apps/web/src/lib/ | grep -v node_modules
```

**Se qualquer grep retornar hit → ESTENDER o existente, NÃO duplicar.**

### III.C · Padrões de erro (canônicos)

> Fonte: TypeScript ESLint canonical rules (context7 audit 2026-07-19)
> + `useUnknownInCatchVariables` (TypeScript 4.4+, default ON no tsconfig)

#### Regra 1: catch SEMPRE tipado com `unknown`

```typescript
// ❌ PROIBIDO — SWC quebra em .tsx, ESLint quebra em .ts
try { await fetch(url) } catch {}
try { await fetch(url) } catch { /* vazio */ }

// ❌ PROIBIDO — `any` implícito (useUnknownInCatchVariables)
try { await fetch(url) } catch (e) { console.error(e.message) } // e é any

// ❌ PROIBIDO — não trata o erro
try { await fetch(url) } catch (e: unknown) {} // bloco vazio

// ✅ CORRETO — fail-soft com void explícito
try { await fetch(url) } catch (e: unknown) { void e; return null }

// ✅ CORRETO — log + fail controlado
try { await fetch(url) } catch (e: unknown) {
  const msg = e instanceof Error ? e.message : String(e)
  if (process.env.NODE_ENV === 'development') console.error("[módulo]", msg.slice(0, 80))
  return fallbackValue
}

// ✅ CORRETO — re-throw com contexto (erro não recuperável)
try { await fetch(url) } catch (e: unknown) {
  throw new Error(`[módulo] Falha ao buscar ${url}: ${e instanceof Error ? e.message : String(e)}`)
}
```

#### Regra 2: `void e` em catch de fail-soft

O `void e` **NÃO é opcional** — é exigido pelo ESLint `no-unused-vars` com `caughtErrors: 'all'` (TypeScript ESLint v8+ default). Sem `void e`, o linter reporta `'e' is defined but never used`.

```typescript
// ✅ fail-soft idiom canônico do adsentice
try { return redisRaw(`GET ${key}`) } catch (e: unknown) { void e; return null }
```

#### Regra 3: Fail-soft NUNCA deve silenciar em produção

Se o erro for **inesperado** (ex: Redis offline por horas, não só timeout ocasional), o fail-soft DEVE logar. Use `process.env.NODE_ENV` para controlar verbosidade:

```typescript
const FAIL_SOFT_LOG_VERBOSE = process.env.NODE_ENV === 'development'

export async function getCached(key: string): Promise<Data | null> {
  try {
    const raw = redisRaw(`GET ${key}`)
    if (!raw) return null
    return JSON.parse(raw) as Data
  } catch (e: unknown) {
    if (FAIL_SOFT_LOG_VERBOSE) {
      const msg = e instanceof Error ? e.message : String(e)
      console.error("[l2b:cache:getCached]", msg.slice(0, 120))
    }
    void e
    return null
  }
}
```

### III.D · Padrões de import/export

#### Barrel exports (index.ts)

Todo diretório de módulo DEVE ter um `index.ts` com barrel exports. Regras:

```typescript
// ✅ CORRETO — barrel conciso com type segregation
export type * from "./types"           // types primeiro (não geram JS)
export { fetchSite, normalizeUrl } from "./site-fetcher"
export { parseHTML } from "./parser"
export { detectFramework, detectSections } from "./strategy-resolver"

// ❌ ERRADO — re-exportar TUDO (polui namespace de quem importa)
export * from "./site-fetcher"
```

#### server-only em módulos server-side

```typescript
// ✅ CORRETO — módulo que usa Node.js APIs (fs, child_process, Redis raw)
import "server-only"

// ❌ ERRADO — módulo que pode ser importado no client SEM 'server-only'
// Isso causa erro em runtime: "Module not found: Can't resolve 'child_process'"
```

#### Type imports

```typescript
// ✅ CORRETO — type imports explícitos (eliminados do bundle)
import type { EnrichResult, MinedContent } from "./types"
import { fetchSite } from "./site-fetcher"  // runtime import

// ✅ CORRETO — inline type qualifier (TypeScript 4.5+)
import { type EnrichResult, fetchSite } from "./index"

// ❌ ERRADO — misturar type e runtime no mesmo import sem distinção
// Pode causar circular imports ou bundle inflation
import { EnrichResult, fetchSite } from "./index"  // EnrichResult é type mas parece runtime
```

### III.E · Padrões de função e tipo

#### Explicit return types em funções públicas

```typescript
// ✅ CORRETO — return type explícito em funções exportadas
export async function fetchSite(url: string): Promise<SiteFetcherResult> { ... }
export function detectFramework(html: string, headers: Record<string, string>): FrameworkDetection { ... }

// ✅ OK em funções internas (não exportadas)
function pickUserAgent(): string { ... }        // inferido, OK
async function redisRaw(cmd: string): string | null { ... }  // explícito, melhor

// ⚠️ EVITAR — return type implícito em função pública complexa
export async function enrichL2b(url: string) { ... }  // retorna EnrichResult mas não declara
```

#### Type narrowing com guard clauses

```typescript
// ✅ CORRETO — guard clause linear (SWC-friendly + TypeScript narrows type)
if (!data?.items?.length) return []
const first = data.items[0]  // TypeScript sabe que não é undefined

// ❌ ERRADO — if aninhado (4 níveis, SWC-unfriendly, type widening risk)
if (data) {
  if (data.items) {
    if (data.items.length > 0) {
      return data.items[0]  // TypeScript narrowing funciona mas código é frágil
    }
  }
}
```

#### unknown > any (TypeScript ESLint canonical)

```typescript
// ✅ CORRETO — `unknown` força validação antes do uso
function parseJSON(raw: string): unknown {
  return JSON.parse(raw)  // caller DEVE validar
}

// ❌ ERRADO — `any` silencia TypeScript, perde type safety
function parseJSON(raw: string): any {
  return JSON.parse(raw)  // caller pode acessar .foo.bar sem erro de compilação
}
```

### III.F · Padrões de cache (Redis)

#### Prefixo e namespace

```typescript
// ✅ CORRETO — prefixo canônico adsentice com namespace do módulo
const CACHE_PREFIX = "adsentice:l2:content"   // módulo l2b
const CACHE_PREFIX = "adsentice:brain:cache"   // módulo brain/a3
const CACHE_PREFIX = "adsentice:wa-check"      // módulo wa-check

// ❌ ERRADO — chave sem namespace (colide com outros módulos)
const CACHE_KEY = "cache:data"
```

#### TTL padrão por escopo

| Escopo | TTL | Justificativa |
|--------|-----|--------------|
| Conteúdo de site (HTML, metadados) | 24h (86400) | Site não muda em horas |
| Sessão WhatsApp | 7 dias (604800) | Sessão WebSocket persiste |
| Progresso de batch | 1h (3600) | Batch efêmero |
| Cache de query KG | 30 dias (2592000) | Corpus muda devagar |
| Cache de discovery | 5min (300) | Evita re-scrape acidental |

### III.G · Padrões de teste rápido (.ts puro)

Módulos `.ts` puros podem ser testados SEM subir o Next.js:

```bash
# Teste unitário rápido (sem JSX, sem SWC)
npx tsx -e "
import { detectFramework } from './apps/web/src/lib/l2b/strategy-resolver.ts'
const fw = detectFramework('<html>...</html>', {})
console.log(fw)
"

# Teste de integração com Redis local
npx tsx -e "
import { setCache, getCached } from './apps/web/src/lib/l2b/cache.ts'
await setCache('teste.com', { extracted: true })
console.log(await getCached('teste.com'))
"
```

### III.H · Anti-padrões que JÁ causaram bugs

| # | Anti-padrão | Bug real | Sessão | Prevenção |
|---|------------|---------|--------|-----------|
| 1 | **Duplicar helper** | `redisRaw()` criada 2× (cache.ts + a3-cache.ts) | v135 | Utility Map §III.A |
| 2 | **catch {} vazio** | `cache.ts:10` lugares com `catch {}` sem bind | v135 | §III.C Regra 1 |
| 3 | **Função duplicada entre módulos** | `extractDomain()` em site-fetcher.ts + parser.ts | v135 | Checklist §III.B |
| 4 | **Supabase JS client filtra colunas** | wa_* fields invisíveis nas queries (`select()` sem incluir as colunas) | v132 | Usar REST (`fetch` com `count=exact`) |
| 5 | **`const` shadowing em inner scope** | Card mostrava 0 porque `const` no bloco interno criava nova variável | v132 | `let` no outer, sem redeclaração |
| 6 | **Progress total calculado errado** | Inicializava `total=3` hardcoded em vez de `count=exact` do Supabase | v131 | Sempre recalcular total da fonte real |

---

## IV. Regras de Ouro (cross-cutting)

1. **Nunca edite um Server Component sem antes rodar DAG no KG**
2. **Sempre rode `bash .claude/hooks/adsentice-nextjs-check.sh` antes de commitar**
3. **Se HTTP 500, leia o log ANTES de tentar outro fix**
4. **7 erros SWC = 7 padrões aprendidos. Não repita.**
5. **Antes de criar função: grep (§III.B) + Utility Map (§III.A). Extender > duplicar.**
6. **`catch (e: unknown) { void e }` — SEMPRE. Nunca `catch {}`.**
7. **`import "server-only"` em todo módulo que usa Node.js APIs.**
8. **Barrel export com `export type *` (types primeiro).**

## V. Regras Absorvidas (Next.js Best Practices)

Extraídas de template de 45 seções, absorvidas só as que impactam SWC e segurança:

| # | Regra | Por que importa |
|---|-------|----------------|
| 1 | **Componente < 200 linhas** | `discovery/page.tsx` com 1200+ linhas causou metade dos erros SWC |
| 2 | **Guard Clauses** | Código linear = SWC não se perde. `if (!x) return` no topo |
| 3 | **Nunca `any` — usar `unknown`** | `any` silencia erros. `unknown` força type narrowing |
| 4 | **Server Actions em `actions/`** | Lógica de escrita isolada. Menos complexidade no Server Component |
| 5 | **Imports ordenados** | React → Next → libs → `@/` alias → relativos |
| 6 | **Nunca expor secrets** | `process.env` só no server. Secrets Manager. |

### Exemplo: Guard Clause

```tsx
// ❌ if aninhado (SWC-unfriendly, 4 níveis)
if (data) { if (data.items) { if (data.items.length > 0) { return <List items={data.items} /> } } }
return <Empty />

// ✅ Guard Clause (SWC-friendly, linear)
if (!data?.items?.length) return <Empty />
return <List items={data.items} />
```

### Exemplo: Componente grande → Extrair

```tsx
// ❌ 1200 linhas no mesmo arquivo
// ✅ Extrair sub-componentes (máx 200 linhas cada)
// discovery/page.tsx        → 400 linhas (shell + lógica principal)
// DiscoveryAutoPilot.tsx     → 180 linhas (extraído)
// BrazilDiscoveryMap.tsx     → 110 linhas (Leaflet isolado)
```

## VI. Commits de referência

### SWC fixes (.tsx)
- `ea492ed` — Suspense + inner async (market page)
- `f288930` — add React import, simplify types
- `ffdc466` — rename `dynamic` import → `nextDynamic`
- `b30e188` — direct import, remove nextDynamic
- `e4f2419` — wrapper client component + dynamic(ssr:false)
- `45309b8` — fix return indent in CATS.map
- `6652753` — fix missing closing bracket on L2 section

### SOP fixes (.ts)
- `cba3fff` — SWC+SOP compliance: catch{}→catch(e:unknown){void e} + cache estende a3-cache
- `a62f66f` — L2b Fase 1 (6 módulos core)
- `00d7137` — stats query usa REST API (Supabase JS client filtrava wa_*)
- `512b6c4` — const→let fix (inner scope shadowing)

---

## VII. Checklist pré-commit (unificado)

### Se commit inclui .tsx:
- [ ] Server Component? → Funções auxiliares FORA do componente
- [ ] Mapa/Leaflet? → Wrapper `'use client'` + `dynamic(ssr: false)`
- [ ] Tem `catch` vazio? → `catch (e: unknown) { void e }`
- [ ] Tem interface? → Usar inline props type
- [ ] Compilou? → `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/en/admin/<page>`

### Se commit inclui .ts:
- [ ] Utility Map consultado? → Nenhuma função duplicada
- [ ] `catch {}` → `catch (e: unknown) { void e }`
- [ ] `import "server-only"` em módulos com Node.js APIs
- [ ] Return types explícitos em funções exportadas
- [ ] Barrel `index.ts` atualizado
- [ ] `npx tsx -e "import ..."` testou o módulo sem Next.js

### Ambos:
- [ ] `bash .claude/hooks/adsentice-nextjs-check.sh` passou
- [ ] `git status` → só arquivos intencionais
- [ ] medido=verdade: fontes citadas nos comentários

---

*v3.0 · 2026-07-19 · adsentice · expandido com Seção III (Módulos .ts Puros) + Utility Map + Context7 TypeScript ESLint canonical rules*
