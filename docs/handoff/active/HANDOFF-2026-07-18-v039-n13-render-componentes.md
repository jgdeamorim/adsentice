# HANDOFF v039 · 2026-07-18 · N1.3 render por componentes + pipeline vec() VIVO

**Selo anterior:** v038 FINAL (`ad7824e`) · **Commits desta sessão:** aeb788f → 004ed59 (10)

## O que foi feito (medido=verdade)

| Commit | Entrega |
|--------|---------|
| `942d5bf` | warp-kg porta Qdrant :6352 (era :6333 — queries falhavam silenciosas) |
| `e7eca95` | deepseek V2 Market Intelligence + warp-kg portado pro packages/warp |
| `1fa04c0` | ADR-0033 nota medida: contrato REAL do payload é FLAT (a11y_role/tokens/edges) |
| `cac3e77` | #1 nicho: normalizeCategory + GENERIC_NICHO + concorrência real Supabase |
| `5d4e0d0` | #2 oklch válido: computa em JS + withAlpha() |
| `f89080e` | Inteligência de bordo: hook SessionStart (safe_redis) + finding_arbiter --cron no crontab |
| `004ed59` | **#3 N1.3: render por componentes + CAUSA-RAIZ embed** |

### Descoberta central (004ed59)
O pipeline vec() estava **morto desde o início**: warp-kg enviava `{text}` mas o
embed-server-rs :8081 exige `{texts:[...]}` → `{vectors:[[768d]]}`. Todo vetor
voltava `[]` → queryComponentsByIntent/queryDesignBestPractices retornavam vazio
silenciosamente. Corrigido + dedup dual-embed + validado BBC: score-ring herda
`role="progressbar"` do **Animated Circular Progress Bar** (componente real do
corpus motion), 3 componentes wireados, edges visíveis no render.

## DAG 2026-07-18 — "temos coisa melhor que warp-kg" (confirmado)

`warp-kg.ts` é só um cliente HTTP fino do Qdrant. A máquina real (ADR-0033: "invocar, não duplicar"):

| Módulo | Arquivo | O que dá |
|--------|---------|----------|
| ComponentRegistry | `packages/warp/src/2-registry.ts:113` | queryByIntent + registro tipado |
| Composer + CritiqueScore 6D | `packages/warp/src/4-composer.ts:260` | inferLayout, resolveDependencies, critique — o **design jury 6D** |
| Devloop | `packages/warp/src/runtime.ts` | re-iterate < 7.0 |
| **tokens-composer.ts (M9!)** | `packages/warp/src/tokens-composer.ts` (450 l) | ADR-0020: intent → query_vocab → inferência 6 camadas |

Padrão-bússola (ADR-0016/0020, compose.rs EVO-API): `intent → query_vocab → DctNode tree → resolve_dependencies → render`. O payload FLAT já traz `edges` — grafo pronto pro resolveDependencies.

## Próximos passos (tasks)

- **#4 N2** — inferLayout + resolveDependencies via `4-composer.ts` (consumir `edges` do payload; NÃO reimplementar no warp-composer)
- #5 Devloop (`runtime.ts`) · #6 Meta sidecar · #7 Quality Gate TS · #8 batch ES+SP · #9 Schema.org image/og-SVG
- Avaliar: composeS10 migrar de warp-kg (fino) → registry/composer (família Warp completa)

## Estado vivo
BOA 0.9276 EXCELLENT · :3000 online · Qdrant :6352 · Redis :6396 · embed :8081 `{texts}` · cron finding_arbiter */5min ativo
Preview validação: `docs/preview/warp-s10-n13-componentes-bbc.html` (gitignored)
