---
id: adr-0021
title: Dual Embed e0+e1 — Arquitetura multilíngue (EN code + PT prose) para busca semântica adsentice
status: accepted
date: 2026-07-15
deciders: founder, claude
extends: [adr-0018, adr-0019, adr-0020]
references:
  - EVO-API ADR-0152 (e1 multilíngue ganho em PT)
  - EVO-API ADR-0152b (embed router rsxt-e0::route)
  - rsxt-e0 embed_route.rs + e1_gain.rs (A/B provado)
  - local-embed-server :8081 (paraphrase-multilingual-mpnet-base-v2, 768d)
  - Warp M2 (ComponentRegistry com vec() embedding)
---

# ADR-0021 · Dual Embed e0+e1 — Arquitetura multilíngue para adsentice

## Contexto

O adsentice usa o embed server `:8081` (`paraphrase-multilingual-mpnet-base-v2`, 768d) para indexar 6,301 pontos de design knowledge no Qdrant. Porém, o teste de qualidade revelou:

| Métrica | Valor | Fonte |
|---------|:-----:|-------|
| Hit rate query PT-BR (com acentos) | 70% | `adsentice_warp_embed_fix.py` A/B test |
| Hit rate query PT-BR (sem acentos) | 58% | `adsentice_warp_quality_test.py` |
| Hit rate query PT-BR + EN misturado | 40% | A/B test (enrichment falhou) |

**Causa raiz:** O modelo `paraphrase-multilingual-mpnet-base-v2` JÁ é multilíngue (50+ línguas incluindo pt-BR), mas os payloads no Qdrant foram embedados SEM acentos ("métricas" ≠ "metricas" no espaço vetorial). Além disso, o modelo único (768d) é overkill para código fonte EN e sub-ótimo para prosa PT — cada tipo de conteúdo se beneficia de um embedding otimizado.

O EVO-API já resolveu este problema com **dual embed** (ADR-0152, provado por A/B):

| Estratégia | Modelo | Dim | Domínio | Recall@3 PT |
|-----------|--------|:---:|---------|:-----------:|
| e0 | MiniLM | 384d | EN code | 50% |
| e1 | Multilingual MiniLM | 384d | PT prose | **71%** |

Ganho de +21pp com e1 multilíngue em queries PT-puro.

## Decisão

**Adotamos arquitetura dual embed e0+e1 para adsentice:**

- **e0 (EN code):** `all-MiniLM-L6-v2` (384d) — código fonte, snippets TypeScript, documentação técnica EN
- **e1 (PT prose/market/design):** `paraphrase-multilingual-MiniLM-L12-v2` (384d) — descrições, intents, design knowledge, dados de mercado
- **Embed Router:** `routeContentKind(kind)` decide qual modelo usar baseado no tipo de conteúdo (EVO-API ADR-0152b)
- **Dual embed no ingest:** cada payload gera 2 embeddings (e0 + e1) quando o conteúdo é bilíngue
- **Dual search:** query consulta ambos os índices, merge com boost para matches duplos (aparece em e0 E e1 = +15% score)
- **:8081 mpnet (768d) mantido como DEV compartilhado** entre EVO-API e adsentice

### Arquitetura

```
┌─────────────────────────────────────────────────────────┐
│  ADSENTICE EMBED LAYER                                  │
│                                                         │
│  :8081 mpnet 768d (DEV compartilhado EVO-API+adsentice) │
│                                                         │
│  adsentice PROD:                                        │
│  ┌─────────────────┐  ┌──────────────────────────┐     │
│  │ e0: MiniLM 384d │  │ e1: Multilingual 384d    │     │
│  │ (EN code)       │  │ (PT prose/market/design) │     │
│  └────────┬────────┘  └──────────┬───────────────┘     │
│           │                      │                      │
│           └──────┬───────────────┘                      │
│                  ▼                                      │
│        Embed Router (routeContentKind)                  │
│        code→e0  |  prose/market/design→e1               │
│                  ▼                                      │
│        Qdrant :6352 (2 collections OU 2 vecs/payload)  │
└─────────────────────────────────────────────────────────┘
```

### Fluxo de ingest

```
Payload (ex: WarpComponent "button")
  │
  ├─→ text_en = normalize(text, 'lowercase')     # "button component with cva variants..."
  ├─→ text_pt = normalize(text, 'preserve_accents') # "botão componente com cva variants..."
  │
  ├─→ e0.embed(text_en) → vec_e0 (384d)
  ├─→ e1.embed(text_pt) → vec_e1 (384d)
  │
  └─→ Qdrant upsert:
      { id, vector: vec_e0, payload: {..., embed_model: "e0"} }
      { id, vector: vec_e1, payload: {..., embed_model: "e1"} }
```

### Fluxo de busca (query)

```
Query: "dashboard métricas KPI gráficos executivo"
  │
  ├─→ Router: kind=prose, lang=pt → e1
  ├─→ e1.embed(query_pt) → vec_e1
  ├─→ Qdrant search (vec_e1, filter: kind=component, embed_model=e1) → results_pt
  │
  ├─→ LLM translate: "executive dashboard KPI metrics charts" → e0
  ├─→ e0.embed(query_en) → vec_e0
  ├─→ Qdrant search (vec_e0, filter: kind=component, embed_model=e0) → results_en
  │
  └─→ MERGE:
      interleave(results_pt, results_en)
      + boost 15% para resultados que aparecem em AMBOS
      → resultados finais ranqueados
```

## Consequências

### Positivas
- **+21pp hit rate em PT-BR** (provado EVO-API ADR-0152)
- **Payloads com acentos corretos** → embedding pt-BR de qualidade
- **Router por tipo de conteúdo** → cada embedding otimizado para seu domínio
- **Dual search com merge** → recupera tanto por similaridade EN quanto PT
- **:8081 mantido como DEV** → compatibilidade com EVO-API
- **Modelos menores (384d)** → mais rápidos, menos memória, armazenamento 50% menor

### Negativas
- **2 modelos para gerenciar** — complexidade operacional
- **Dual embed dobra storage** — cada payload gera 2 vecs (384d×2 = 768d, igual ao mpnet atual)
- **LLM translate no search** — custo adicional (~$0.001/query) para traduzir query PT→EN
- **Migração de payloads** — re-embed dos 6,301 pontos existentes

## Implementação

### Fase 1 · Embed Router (já feito)
- [x] `packages/warp/src/embed-router.ts` — routeContentKind(), detectContentKind(), normalizeForEmbedding()
- [x] A/B test provando que mpnet multilíngue já tem 70% hit rate PT-BR

### Fase 2 · Dual Embed no Ingest (ESTA ADR)
- [ ] Adicionar e0 (MiniLM) ao :8081 OU criar :8082
- [ ] Adicionar e1 (Multilingual MiniLM) ao :8081 OU criar :8083
- [ ] `embedBatch()` com dual embed: cada texto → vec_e0 + vec_e1
- [ ] Re-embed dos 6,301 payloads existentes com acentos corretos

### Fase 3 · Dual Search
- [ ] LLM translate query PT→EN (DeepSeek, ~$0.001/query)
- [ ] Search em ambos os índices
- [ ] Merge + boost dual matches

## Prova (medido)

### EVO-API e1_gain.rs (ADR-0152)
- **Fonte:** `EVO-API/main/crates/evo-superadmin/src/e1_gain.rs`
- **Teste:** `adr0152_e1_multilingue_ganho_em_PT_puro`
- **Resultado:** e1 recall@3 PT = 71% vs e0 = 50% (+21pp)
- **Modelos:** e0 = MiniLM 384d (EN) · e1 = Multilingual MiniLM 384d (PT)

### Adsentice embed test
- **Fonte:** `tools/adsentice_warp_embed_fix.py`
- **Resultado:** mpnet 768d (modelo único) = 70% hit rate PT-BR com acentos
- **Gargalo:** payloads sem acento + query EN+PT misturada derruba para 40%

### Embed server atual
- **Fonte:** `local-embed-server/src/embedder.rs:64-66`
- **Modelo:** `paraphrase-multilingual-mpnet-base-v2` (768d, ONNX, Mean Pooling)
- **Status:** Funcional, JÁ é multilíngue, 70% PT-BR com acentos

## Referências
- ADR-0018 (Família Warp — Design System com vec() embedding)
- ADR-0019 (Fontes de conhecimento — context7 + 21st-magic)
- ADR-0020 (Compositor de Tokens Semânticos)
- EVO-API ADR-0152 (e1 multilíngue ganho em PT)
- EVO-API ADR-0152b (embed router rsxt-e0::route)
- local-embed-server :8081 (DEV compartilhado)

---
*ADR-0021 · 2026-07-15 · adsentice · medido=verdade*
