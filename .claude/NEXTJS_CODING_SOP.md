# ADSENTICE · Coding SOP — Next.js 15.1.2

> ⚠️ **LEIA ANTES de editar qualquer Server Component.**
> Fontes: 7 SWC fixes (308 commits) + context7 + Qdrant KG (tag=nextjs-15)

## Ciclo de Codificação

```
1. DAG (KG recall) → 2. Coda com regras → 3. Next.js Check → 4. Commit
```

### 1. Pré-flight — DAG + KG

Antes de escrever código, buscar no KG:

```
DAG: "nextjs server component [padrão] [pattern]"
     → Qdrant adsentice-self (tag=nextjs-15): 10 regras
     → Qdrant adsentice-conversation: histórico de erros similares
     → claude-memory: decisões SWC
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

## Regras de Ouro

1. **Nunca edite um Server Component sem antes rodar DAG no KG**
2. **Sempre rode `bash .claude/hooks/adsentice-nextjs-check.sh` antes de commitar**
3. **Se HTTP 500, leia o log ANTES de tentar outro fix**
4. **7 erros SWC = 7 padrões aprendidos. Não repita.**

## Regras Absorvidas (Next.js Best Practices filtrado)

Extraídas de template de 45 seções, absorvidas só as que impactam SWC e segurança:

| # | Regra | Por que importa pra nós |
|---|-------|------------------------|
| 1 | **Componente < 200 linhas** | `discovery/page.tsx` com 1200+ linhas foi a causa de metade dos erros SWC. Extrair sub-componentes REDUZ superfície de crash |
| 2 | **Guard Clauses em vez de `if` aninhado** | Código linear = SWC não se perde em nested blocks. `if (!x) return` no topo |
| 3 | **Nunca `any` — usar `unknown`** | `any` silencia erros que o SWC poderia detectar. `unknown` força type narrowing |
| 4 | **Server Actions em `actions/`** | Lógica de escrita isolada das rotas. Menos complexidade no Server Component |
| 5 | **Imports ordenados** | React → Next → libs → `@/` alias → relativos. Evita circular imports que quebram SWC |
| 6 | **Nunca expor secrets** | `process.env` só no server. Já temos Secrets Manager. Reforçar. |

### Exemplo: Guard Clause (antes vs depois)

```tsx
// ❌ if aninhado (SWC-unfriendly, 4 níveis de indentação)
if (data) {
  if (data.items) {
    if (data.items.length > 0) {
      return <List items={data.items} />
    }
  }
}
return <Empty />

// ✅ Guard Clause (SWC-friendly, linear)
if (!data?.items?.length) return <Empty />
return <List items={data.items} />
```

### Exemplo: Componente grande → Extrair

```tsx
// ❌ 1200 linhas no mesmo arquivo
// discovery/page.tsx — SWC perde contexto, quebra em mudanças pequenas

// ✅ Extrair sub-componentes (máx 200 linhas cada)
// discovery/page.tsx        → 400 linhas (shell + lógica principal)
// DiscoveryAutoPilot.tsx     → 180 linhas (extraído, nunca mais quebrou)
// BrazilDiscoveryMap.tsx     → 110 linhas (Leaflet isolado)
// DiscoveryLeadDetail.tsx    → seria extraído do modal de 500 linhas
```

---
*v2.0 · 2026-07-16 · adsentice*
