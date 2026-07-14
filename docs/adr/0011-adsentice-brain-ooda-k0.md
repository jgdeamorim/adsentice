---
id: adr-0011
title: adsentice Brain OODA — 12 containers cognitivos (inspirado no EVO-API chat_ooda.rs + dag.rs)
status: accepted
date: 2026-07-13
deciders: founder, claude
extends: [adr-0001, adr-0008]
references:
  - EVO-API crates/evo-superadmin/src/chat_ooda.rs (ADR-0197)
  - EVO-API crates/evo-superadmin/src/dag.rs (ADR-0197/0203)
  - EVO-API crates/evo-superadmin/src/chat_brain.rs (ADR-0197 §4)
  - EVO-API crates/evo-superadmin/src/k0_breath.rs (ADR-0184)
  - rsxt-k0 (Knowledge Graph soberano Fjall)
---

# ADR-0011 · adsentice Brain OODA — 12 containers cognitivos

## Contexto

O EVO-API implementa um **cérebro OODA completo** com 12 containers (ADR-0197) que opera o ciclo Observar→Orientar→Decidir→Agir de forma **soberana e determinística**. As peças-chave:

- **chat_ooda.rs**: o loop OODA com 3 tiers de execução (BypassScore → BypassCache → B3Qwen). O bypass decide SOZINHO se a pergunta já foi respondida, economizando LLM.
- **dag.rs**: 4 recuperadores (c0 Intérprete, c1 Re-rank híbrido, c3 Honestidade, c4 Memória-de-Fio) que garantem `medido=verdade` automatizado.
- **chat_brain.rs**: Qwen 2.5 1.5B local (peso ABERTO, $0) como voz primária, DeepSeek como fallback ($0.02), extrativo como piso.
- **k0_breath.rs**: grafo de conhecimento soberano (rsxt-k0, Fjall) que persiste arestas entre entidades — o KG que alimenta o c1.

O adsentice tem os **componentes equivalentes** mas não integrados num loop OODA:

| Peça EVO-API | Equivalente adsentice | Estado |
|-------------|----------------------|:------:|
| c0 Intérprete (dag.rs:455) | `/dag` skill manual | ⚠️ Manual |
| c1 Recuperador (dag.rs:340) | `adsentice_conversation_search` × 3 | ⚠️ Sem re-rank |
| B2 Self-Score (chat_ooda.rs) | — | ❌ Inexistente |
| B3 Decide (chat_brain.rs) | Claude Code (externo, pago) | ⚠️ Sempre LLM |
| D1 Grounding (chat_ooda.rs:69) | — (manual) | ❌ Inexistente |
| c3 Honestidade (dag.rs:400) | — | ❌ Inexistente |
| A3 Pattern Cache (chat_ooda.rs:47) | Redis 24h TTL cego | ⚠️ Sem situation_key |
| c4 Memória-de-Fio (dag.rs:336) | `claude_history_ingest.py` | ⚠️ Não consultado no loop |

## Decisão

**Adotamos a arquitetura de 12 containers OODA do EVO-API, adaptada para TypeScript/Next.js, usando a infraestrutura existente (Qdrant :6352, Redis :6396, Embed :8081, Claude como voz).**

### Arquitetura

```
┌──────────────────────────────────────────────────────────┐
│  ADSENTICE BRAIN — 12 containers OODA (v0.7)             │
│                                                          │
│  TRIGGER: pergunta do founder / decisão de implementação │
│     │                                                    │
│  B1 OBSERVE  <50ms   → c0 classifica intenção            │
│  B2 ORIENT   <100ms  → c1 recupera fatos + self-score    │
│  B3 DECIDE   <1s     → Claude (primário) ou cache (bypass)│
│     │                                                    │
│  D1 GROUNDING CHECK  → c3: resposta ancorada nos fatos?   │
│  A3 PATTERN CACHE    → resposta cacheada (blake3 key)     │
│     │                                                    │
│  G1-G6 EXECUTORS     → os pipelines de ação               │
└──────────────────────────────────────────────────────────┘
```

### Os 6 módulos TypeScript

| # | Módulo | Container EVO-API | Função |
|:--:|--------|:-----------------:|--------|
| 1 | `lib/brain/c0-interpreter.ts` | c0 Intérprete | Classifica intenção via Qdrant semantic search (ask-explicar/ask-recall/ask-factual) |
| 2 | `lib/brain/c1-retriever.ts` | c1 Recuperador | Re-rank híbrido: `0.45·sim + 0.20·autoridade + 0.15·recência + 0.20·lexical` |
| 3 | `lib/brain/b2-self-score.ts` | B2 Orient | Calcula certainty (0-1) baseado em: quantos fatos? quantos commits? quantos arquivos? |
| 4 | `lib/brain/b3-decide.ts` | B3 Decide | Se certainty ≥0.80 → bypass (cache). Senão → Claude responde (ancorado nos fatos) |
| 5 | `lib/brain/d1-grounding.ts` | D1 + c3 Honestidade | Overlap de palavras entre resposta e fatos (≥2). Poda frases sem lastro. |
| 6 | `lib/brain/a3-cache.ts` | A3 Pattern Cache | Redis `adsentice:brain:cache:{blake3_hash}` com watermark do corpus |

### Tiers de execução (o bypass)

| Tier | Condição | Ação | Custo |
|------|----------|------|:-----:|
| **BypassScore** | certainty ≥0.80 | Resposta da cache (glass-box). SEM Claude. | $0 |
| **BypassCache** | certainty <0.80 MAS situation_key no cache | Resposta cacheada de um turno anterior que JÁ rodou Claude. | $0 |
| **B3Claude** | certainty <0.80 + cache-miss | Claude responde ANCORADO nos fatos do c1 → A3 cacheia para próxima. | tokens Claude |

### O self-score (B2)

```typescript
certainty = (
  0.35 × min(factsFound / 5, 1.0) +        // ≥5 fatos do KG = full score
  0.25 × min(commitsMatched / 3, 1.0) +     // ≥3 commits relevantes
  0.20 × min(filesystemSources / 2, 1.0) +  // ≥2 arquivos fonte
  0.20 × lexicalMatch                         // fração de termos da pergunta nos fatos
)
```

### O re-rank híbrido (c1)

Mesma fórmula do EVO-API `dag.rs:366`:

```
finalScore = 0.45·sim_norm + 0.20·authority(source) + 0.15·recency_norm + 0.20·lexical
```

Onde `authority(source)` é:
- base-matriz/CLAUDE.md/README → 1.00
- /adr/ ou /spec/ → 0.80
- /handoff/ → 0.60
- código (.ts/.tsx) → 0.45
- outro → 0.35

### O cache com watermark (A3)

```typescript
const key = blake3(`${intent}\n${question}`).slice(0, 16) // hex
const cached = await redis.get(`adsentice:brain:cache:${key}`)
if (cached && cached.watermark === corpusWatermark) {
  return cached.reply  // BYPASS — $0
}
```

O `corpusWatermark` é o HEAD do último self-ingest (`var/self-ingest.head`). Se o corpus mudou (novo ADR, nova spec), o cache inteiro é invalidado — evita servir resposta desatualizada.

### Integração com o `/dag` skill

O `/dag` skill existente vira um **cliente** do Brain OODA. Em vez de executar os 5 passos manualmente, o `/dag` chama:

```
/dag → c0 classifica → c1 recupera → B2 self-score → B3 decide → D1 grounding → A3 cache
```

O founder não precisa saber qual tier foi usado — a resposta é sempre `medido=verdade`, com fontes auditáveis.

## Consequências

### Positivas
- **Bypass reduz custo**: perguntas repetidas → cache → $0 (hoje toda pergunta gasta tokens Claude)
- **Grounding automatizado**: c3 poda frases sem lastro — o "não inventa" é determinístico, não depende de disciplina humana
- **Aprendizado contínuo**: A3 cacheia cada resposta do Claude → o brain fica mais inteligente a cada turno
- **medido=verdade sistêmico**: toda resposta cita fontes (KG + commits + filesystem)
- **Stack existente**: Qdrant, Redis, Embed — zero novas dependências pesadas
- **Alinhamento EVO-API**: mesma arquitetura, mesma doutrina, stacks diferentes

### Negativas
- **Complexidade**: +6 módulos no pipeline cognitivo
- **Cold start**: cache vazio no início — os primeiros turnos sempre caem no B3Claude
- **Watermark frágil**: se o self-ingest falhar, o cache não invalida (serve resposta velha)
- **Dependência do Embed**: se :8081 cair, o c0 e c1 degradam (mas o A3 cache ainda serve)

## Implementação

### Fase 1 · v0.7 — Brain Core (6 módulos)
- [ ] `lib/brain/c0-interpreter.ts` — classificação de intenção
- [ ] `lib/brain/c1-retriever.ts` — re-rank híbrido
- [ ] `lib/brain/b2-self-score.ts` — certainty calculator
- [ ] `lib/brain/b3-decide.ts` — bypass/cache/Claude router
- [ ] `lib/brain/d1-grounding.ts` — honesty + grounding check
- [ ] `lib/brain/a3-cache.ts` — pattern cache com watermark

### Fase 2 · v0.8 — Integração
- [ ] Atualizar `/dag` skill para usar o Brain OODA
- [ ] Hook PreToolUse: auto-grounding antes de respostas
- [ ] Dashboard: `/admin/brain` — learning curve (bypass rate, cache hits, tier distribution)

### Fase 3 · v0.9 — Qwen Local
- [ ] Qwen 2.5 1.5B como fallback local ($0, soberano)
- [ ] Substitui Claude para perguntas factuais simples
- [ ] Claude reservado para síntese estratégica (o 5% caro)

## Prova (medido)

- EVO-API `chat_ooda.rs` (12 containers, 3 tiers) — arquitetura de referência
- EVO-API `dag.rs:340-371` — c1 re-rank híbrido (fórmula exata)
- EVO-API `dag.rs:400-421` — c3 sentence_grounded (implementação de referência)
- EVO-API `chat_brain.rs:12-20` — GroundedPrompt (persona + fatos injetados)
- adsentice Qdrant :6352 — 4 coleções, 32K+ pontos
- adsentice Redis :6396 — OODA loop + BOA score
- adsentice Embed :8081 — mpnet 768d (compartilhado com EVO-API)

## Referências
- ADR-0001 (Arquitetura Standalone adsentice)
- ADR-0008 (EVO-API como Motor de Enriquecimento L0-L4)
- EVO-API `crates/evo-superadmin/src/chat_ooda.rs` (ADR-0197 §8)
- EVO-API `crates/evo-superadmin/src/dag.rs` (ADR-0197/0203)
- EVO-API `crates/evo-superadmin/src/chat_brain.rs` (ADR-0197 §4)
- EVO-API `crates/evo-superadmin/src/k0_breath.rs` (ADR-0184)
- `.claude/skills/adsentice-dag/SKILL.md` — skill /dag existente
