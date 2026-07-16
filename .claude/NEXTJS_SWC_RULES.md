# Next.js 15.1.2 SWC — Guia de Sobrevivência adsentice

> ⚠️ Leia ANTES de editar qualquer Server Component (.tsx sem 'use client')
> Fontes: context7 + git log (308 commits) + DAG · medido=verdade

## O Erro
```
x Unexpected token `Grid`. Expected jsx identifier
```
**Não é um erro de JSX.** É o SWC (Rust) descartando o arquivo inteiro porque encontrou algo que não entendeu ANTES do `return (`.

---

## ✅ Padrões que FUNCIONAM (use estes)

### 1. Suspense + Inner Async (páginas com dados)
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

### 2. Funções auxiliares FORA do componente
```tsx
// ✅ FORA — SWC não processa durante parse de JSX
async function getPins() { return await supabase.from(...) }
async function fetchHolds(...) { ... }

export default function Page(...) {
  const data = await getPins()
  return <JSX />
}
```

### 3. Client Components para Leaflet/Mapas
```tsx
'use client'
import dynamic from 'next/dynamic'
const LeafletMap = dynamic(() => import('./ActualMap'), { ssr: false })
export default function Wrapper({ pins }: { pins: any[] }) {
  return <LeafletMap pins={pins} />
}
```
Regra: `dynamic(ssr: false)` só em arquivos com `'use client'`.

### 4. Props inline, sem interfaces
```tsx
// ✅ Isto funciona
export default function Foo(props: { data: any; onClick: () => void }) {
// ❌ Isto QUEBRA o SWC em Server Components
interface Props { data: any; onClick: () => void }
export default function Foo({ data, onClick }: Props) {
```

---

## ❌ Padrões PROIBIDOS

| Padrão | Exemplo | Por que quebra |
|--------|---------|----------------|
| `catch {}` vazio | `try { ... } catch {}` | SWC não parseia bloco vazio |
| `next/dynamic` em Server | `const X = dynamic(...)` em page.tsx | `ssr: false` proibido |
| Interface antes de JSX | `interface Props { ... }` | Confunde o parser |
| Template literal com `&&` | `{x && \`texto ${var}\`}`  | SWC perde o contexto |
| `return` na col 0 | `\nreturn (` em .map() | Indentação quebrada |

---

## Commits de referência (swc fixes)
- `ea492ed` — Suspense + inner async (market page)
- `f288930` — add React import, simplify types
- `ffdc466` — rename `dynamic` import → `nextDynamic`
- `b30e188` — direct import, remove nextDynamic
- `e4f2419` — wrapper client component + dynamic(ssr:false)
- `45309b8` — fix return indent in CATS.map
- `6652753` — fix missing closing bracket on L2 section

## Checklist pré-commit
- [ ] Server Component? → Funções auxiliares FORA do componente
- [ ] Mapa/Leaflet? → Wrapper `'use client'` + `dynamic(ssr: false)`
- [ ] Tem `catch` vazio? → `catch (e: unknown) { void e }`
- [ ] Tem interface? → Usar inline props type
- [ ] Compilou? → `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/en/admin/<page>`

---
*v1.0 · 2026-07-16 · adsentice*
