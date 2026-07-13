---
name: dag
description: DAG — KG-first grounded recall. Busca semântica cross-KG → cruza git commits → cruza filesystem → medido=verdade. Use para qualquer pergunta sobre o sistema, decisão, arquitetura, ou histórico do adsentice.
type: project
---

# /dag — Knowledge Graph Grounded Recall

Recuperação canônica do adsentice seguindo o padrão DAG (EVO-API `dag.rs`):
**KG-first → git log → filesystem → medido=verdade.**

Inspirado no `c1·Recuperador` do EVO-API (`crates/evo-superadmin/src/dag.rs`),
adaptado para o ecossistema adsentice (Redis :6396, Qdrant :6352, Embed :8081).

## Quando usar

- Perguntas sobre "o que decidimos sobre X?"
- Auditoria de arquitetura — "como funciona Y?"
- Verificação de estado do sistema — "qual o status de Z?"
- Qualquer dúvida que precise de grounding cross-KG + git + filesystem
- Antes de tomar uma decisão de implementação — verificar se já foi decidido antes

## Pipeline DAG (5 passos)

### Passo 1 · KG-First — Busca semântica cross-KG

Executar **3 buscas em paralelo** (MCP `adsentice_conversation_search`):

| Collection | Tag | Propósito |
|-----------|-----|-----------|
| `adsentice-conversation` | `adsentice` | Histórico de conversas (o que discutimos) |
| `adsentice-self` | (any) | Docs, ADRs, specs (o que documentamos) |
| `claude-memory` | `adsentice` | Memória curada de decisões (o que decidimos) |

Cada busca: `limit=5`, query com as palavras-chave da pergunta.

### Passo 2 · Git Log — Cruza commits relevantes

```bash
git log --oneline --grep="<keyword>" -15 --format="%h %s (%ai)"
```

Filtrar pelos termos extraídos da pergunta (ex: "L2", "enrichment", "ADR-0008", "scoring").
Se o KG retornou menção a commit SHA → verificar com `git show <sha>`.

### Passo 3 · Filesystem — Cruza com fontes canônicas

Com base nos hits do KG, ler os arquivos-fonte relevantes:

| Se KG menciona | Ler arquivo |
|---------------|-------------|
| ADR-NNNN | `docs/adr/NNNN-*.md` |
| Spec | `docs/spec/<nome>.md` |
| Migration | `packages/db/supabase/migrations/NNN_*.sql` |
| Código | `apps/web/src/lib/<arquivo>.ts` |
| Handoff | `docs/handoff/active/HANDOFF-*.md` |
| Matriz | `docs/spec/base-matriz-adsentice.md` |
| BOA/OODA | Redis `adsentice:ooda:*` + `adsentice:boa:*` |

### Passo 4 · Síntese — medido=verdade

Produzir resposta com:
1. **Afirmação** — o que é verdade, baseado nas fontes
2. **Fontes** — lista de arquivos, commits, MCP calls que comprovam
3. **Nível de confiança** — HIGH (3+ fontes independentes), MEDIUM (2 fontes), LOW (1 fonte)

Se uma afirmação NÃO tiver lastro → marcá-la `⚠ não-verificado` (NÃO conta como fato).

### Passo 5 · Persistência — Salvar no claude-memory

Se a síntese produziu um fato ou decisão relevante, salvar com:

```
mcp__adsentice-conversation__adsentice_conversation_remember
  text: "<síntese com fontes>"
  kind: "insight" | "decision" | "fact"
  source: "dag-<timestamp>"
```

## Doutrinas DAG

- **KG-FIRST:** sempre começar pela busca semântica. NUNCA responder de cabeça.
- **medido=verdade:** toda afirmação cita fonte (arquivo, commit, MCP call).
- **Cross-reference:** KG sozinho não basta — sempre cruzar com git log + filesystem.
- **Fail-soft:** se uma coleção estiver offline, continuar com as outras (degradar, não quebrar).
- **Over-retrieve:** buscar 5 hits por coleção → filtrar os melhores na síntese (não usar só o top-1).
- **Tags corretas:** `adsentice-conversation` usa `tag=adsentice`. `adsentice-self` usa sem tag. `claude-memory` usa `tag=adsentice`.

## Exemplo de execução

```
Pergunta: "O que decidimos sobre L2 Website+SEO?"

Passo 1: search("L2 website SEO enrichment", collection="adsentice-self", limit=5)
         → hit: base-matriz-adsentice.md (0.63)
         → hit: rsxt-family-ingest "SEMPRE L0→L1→L2" (0.62)
         search("L2 website enrichment v0.3 implementado", collection="claude-memory", limit=5)
         → hit: session-2026-07-13-l2-website-seo (0.40)

Passo 2: git log --grep="L2.*Website" → 7b45d70 feat: L2 Website+SEO enrichment v0.3
         git log --grep="enriquecimento" → 15 commits relevantes

Passo 3: Read docs/adr/0008-evo-api-enriquecimento-completo-l0-l4.md
         Read apps/web/src/lib/evo-mcp.ts (onPageInstantAudit, domainTechnologies)
         Read apps/web/src/lib/scoring.ts (W1-W8 signals)

Passo 4: Síntese — L2 usa 2 chamadas EVO-API ($0.010125/lead), 8 sinais W ativos,
         20 colunas Supabase (migration 002), commit 7b45d70.
         Confiança: HIGH (ADR + código + commit + memory).

Passo 5: remember("L2 Website+SEO v0.3 ...", kind="decision", source="dag-2026-07-13")
```

## Integração com BOA/OODA

Cada execução do DAG que produz uma decisão ou insight deve:
1. Atualizar `adsentice:ooda:stage:observe` com o que foi descoberto
2. Salvar no `claude-memory` para alimentar o `founder_signal.decision_boost`
3. O BOA recalcula automaticamente no próximo `SessionStart` ou `adsentice_boa_score.py --save`
