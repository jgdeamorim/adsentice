---
id: ADR-0034
title: Adsentice Design Vivo — Sistema Fechado de Design Inteligente (unificação 0018/0020/0032/0033)
status: proposed
date: 2026-07-18
deciders: [jgdeamorim]
consulted: [claude]
related: [ADR-0016, ADR-0018, ADR-0020, ADR-0021, ADR-0032, ADR-0033]
---

# ADR-0034 — Adsentice Design Vivo

> **"Design vivo = o sistema aprende o design do mercado, compõe por intent, se auto-critica, e realimenta o corpus com o resultado. Sem humano no loop de geração — humano no loop de aprovação."**

## Contexto

### Linhagem medida (git)

| Commit | Marco |
|--------|-------|
| `0322e5a` | ADR-0020 — Compositor M9 (morph por intent, design jury, feedback loop) — proposta |
| `4362d21` | `adsentice_s10_generator.py` — pipeline Python 8 etapas (1º design vivo REAL) |
| `27b39c2`/`17951f0` | ADR-0031/0032 — Surface Dashboard + Composer Runtime dual |
| `c438ebd`/`52c1abc` | Intend Composer + ts_morph zero hardcoded |
| `dfa8c02` | Python port completo → `composeS10` TS |
| `a106e7e` | "adsentice vivo" — design intelligence autônomo no composeS10 |
| `559b002`/`88806a2` | ADR-0033 — vec()→Intend→Excelência + N1 parcial |
| `004ed59` | N1.3 render por componentes + **fix contrato embed (`{texts}`) — pipeline vec() VIVO** |

### O que existe HOJE (medido 2026-07-18)

**Corpus (Qdrant `adsentice-self`, 18.464 pts):** 236 components (payload FLAT: `a11y_role`, `a11y_keyboard`, `tokens`, **`edges`** — grafo pronto), 6.267 design-knowledge, 733 color-palettes, 60 motion, 64 svg, 8.920 google-fonts, 36 Materio.

**Família Warp (`packages/warp/src/`, 6.898 linhas):**
- `2-registry.ts:113` ComponentRegistry.queryByIntent
- `4-composer.ts:260` Composer — inferLayout, resolveDependencies, **critique 6D** (functionality 0.25, visualHierarchy 0.20, detailExecution 0.15, philosophyConsistency 0.15, marketFit 0.15, innovation 0.10)
- `runtime.ts` Devloop · `8-agents.ts` AgentRouter (Claude/DeepSeek-árbitro-L6/Qwen) · `tokens-composer.ts` M9 (450 l)
- espelhos: `composer-core.ts` ≡ `apps/web/src/lib/warp-composer.ts` · `warp-kg.ts` ×2

**Genealogia Python (`tools/adsentice_s10_generator.py`) — 3 ouros NÃO portados pro TS:**
1. `store_trace():317` — feedback loop: cada geração upserted no Qdrant `kind=market-intel` (18 traces medidos)
2. `track_llm_cost():272` — DeepSeek KV cache hit/miss REAL ($0.0028 vs $0.14/1M); TS usa 0.001 fixo
3. System prompt em camadas (Schwartz tones + Corey + Kim Barrett + anti-patterns)

**Bugs conhecidos (medidos):** `design_hint` sem threshold de score (lead dentista recebeu "Barbearia | Design System Completo" — 4 traces contaminados); "Design Jury" do selo v037.3 é **conceito, não código** (grep "jury" em packages/warp = 0 hits); duplicatas 5× no histórico `adsentice-conversation` (dedup pendente).

## Decisão

**O Design Vivo é um sistema fechado de 5 órgãos.** Cada órgão já tem dono; o que falta é fechar o ciclo:

```
┌──────────────────────────────────────────────────────────────────┐
│  1. CORPUS vec()      Qdrant 18.464 pts · payload FLAT · edges   │
│         │  queryByIntent (VIVO desde 004ed59)                    │
│         ▼                                                        │
│  2. COMPOSITOR        intent → componentes → LayoutTree →        │
│     (composeS10 +       tokens morph (M9) → render a11y herdado  │
│      4-composer.ts)     [#4: resolveDependencies via edges]      │
│         │                                                        │
│         ▼                                                        │
│  3. JURY 6D           critique composite ≥ 7.0 → entrega         │
│     (4-composer +       < 7.0 → Devloop re-iterate ≤3x [#5]      │
│      Devloop)           + threshold relevância score ≥ 0.45 nas  │
│                          queries design (fix bug design_hint)    │
│         │                                                        │
│         ▼                                                        │
│  4. FEEDBACK LOOP     store_trace → Qdrant kind=market-intel     │
│     (port do Python)    + meta sidecar JSON na route [#6]        │
│         │                                                        │
│         ▼                                                        │
│  5. TELEMETRIA        variantes A/B (ADR-0020) + KV cache real   │
│     (fecha o ciclo)     → próxima geração consulta os traces     │
└──────────────────────────────────────────────────────────────────┘
```

Regras:
1. **Invocar, não duplicar** (ADR-0033): compositor consome `4-composer.ts`/`2-registry.ts`; `warp-kg.ts` permanece como cliente fino de transporte.
2. **Threshold de relevância:** toda query design/component descarta hits com score < 0.45 (calibrar com medição). Sem hit acima do threshold → fallback honesto, NUNCA hint de outro nicho.
3. **Jury 6D vira código:** critique já computa; o jury = critique + Devloop + (fase 2, ADR-0020) 3 candidatos → melhor composite.
4. **Feedback loop obrigatório:** geração sem trace no Qdrant não é design vivo — é design descartável.
5. **Contrato embed canônico:** `{texts:[...]}` → `{vectors:[[768d]]}` (medido; regressão aqui mata o sistema inteiro em silêncio — Quality Gate #7 deve testar).

## Teste da Inteligência Viva (protocolo + resultado 2026-07-18)

**Protocolo:** compor N leads de segmentos distintos → o sistema DEVE divergir (paleta, nicho, componentes) de forma coerente com o mercado, sem código por-nicho no caminho.

**Resultado medido (2 segmentos, base atual):**

| Lead | Categoria | Primary (oklch) | Nicho | Componentes por intent |
|------|-----------|-----------------|-------|------------------------|
| IOS Clínica Odontológica (Vitória) | Dentist | `oklch(55% 35% 220)` azul clínico | Dentista ✅ | Neon Gradient Card, Badge |
| Salão Santo Antônio (Guarapari) | Barber shop | `oklch(55% 35% 340)` rose | Barbearia ✅ | + **Animated Circular Progress Bar** (`role="progressbar"` herdado) |

**PASSOU:** hues divergem por segmento, nichos corretos (pós-`cac3e77`), e a **seleção de componentes muda com o intent** — progressbar só veio no intent beleza. ⚠ Restaurant: nenhum lead score≥40 na base — repetir teste após batch #8.

## Alternativas consideradas

1. **Continuar só com warp-kg fino + HTML inline** — rejeitada: ignora 6.898 linhas prontas da família Warp e mantém o jury como decoração.
2. **Reescrever tudo no M9 tokens-composer** — rejeitada por ora: composeS10 validado end-to-end; migração incremental (#4→#7) preserva o que funciona.
3. **LLM gerar o HTML inteiro** — rejeitada (doutrina: LLM = árbitro NUNCA extrator; custo e alucinação de design).

## Consequências

**Positivas:** ciclo fechado aprende com cada geração ($0 — Qdrant/heurísticas locais); divergência por mercado comprovada; a11y herdada do corpus; rastreabilidade por trace.
**Negativas:** threshold mal calibrado pode empobrecer hints (mitigar: medir distribuição de scores antes de fixar 0.45); traces crescem no Qdrant (mitigar: TTL/compactação futura); duplicatas do histórico poluem recall (dedup pendente).

**Mapeamento nas tasks:** #4 (órgão 2: edges→LayoutTree) · #5 (órgão 3: Devloop+threshold) · #6 (órgão 4: sidecar+store_trace TS) · #7 (gate testa contrato embed) · #8 (re-teste 7 segmentos) · #9 (og-image SVG do corpus).

## Referências

- `docs/adr/0020-compositor-tokens-semanticos-morph-por-intent.md` (M9, jury, feedback loop)
- `docs/adr/0033-vec-intend-composition-pipeline-excellence.md` (+ nota payload FLAT)
- `tools/adsentice_s10_generator.py` (genealogia: 8 etapas, store_trace, track_llm_cost)
- `packages/warp/src/{2-registry,4-composer,runtime,tokens-composer,8-agents}.ts`
- claude-memory: `d291d67b` (vec até o osso) · `00b75498` (genealogia s10_7310)
- Teste vivo: `/tmp/teste-vivo.json` · previews `docs/preview/warp-s10-n13-componentes-bbc.html`
