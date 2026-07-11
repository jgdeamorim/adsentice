---
id: rsxt-bridge-adsentice
title: "RSXT Bridge — Como a doutrina RSXT informa o adsentice"
status: living
type: spec
version: "1.0.0"
date: 2026-07-12
owner: "Jeferson Galote de Amorim"
tags: [rsxt, bridge, doctrine, intent, self-knowledge]
---

# Ponte RSXT → adsentice

> A família RSXT (14.552 linhas Rust, 10 crates, 3 docs de doutrina) é o **substrato cognitivo** que informa COMO o adsentice deve tomar decisões. Ingerimos como self-knowledge no Qdrant.
> Fonte: `/media/jeffer/5aab5a95-8290-d3f7-2e4f-8c27cc2d09a93/rsxt/docs/`

---

## 1. O QUE MUDOU

Antes da ingestão, o adsentice não tinha **pipeline decisório**. O fluxo era:

```
URL → POST /api/diagnostic → 5 pipelines em paralelo → LLM sintetiza → JSON
```

Depois da ingestão, o fluxo DEVE ser:

```
URL → POST /api/diagnostic
  → L0: extrai domínio, valida URL (estrutural)
  → L1: check frequência, já foi analisado? (estatístico)
  → L2: ANTI-ICP filter, credit gate (determinístico)
  → L3: busca diagnósticos similares no Qdrant (sensor)
  → L4: quais pipelines esse tipo de negócio precisa? (graph)
  → L5: BOA score: vale o custo DataForSEO? (consensus)
  → L6: DeepSeek V4 sintetiza cards + tips (árbitro, LAST RESORT)
```

**O LLM só é chamado se L0-L5 não bastarem.**

---

## 2. INTENT RESOLUTION

Cada intent do usuário é resolvido via busca semântica no Qdrant:

| Usuário diz | Intent detectado | Pipeline | Layers |
|------------|-----------------|----------|--------|
| "analisa minhaclinica.com.br" | `full_discovery` | 5 pipelines | L0→L6 completo |
| "como está o SEO deles?" | `seo_discovery` | serp + keywords | L0→L3 + L6 |
| "qual a reputação?" | `gmb_reputation` | gmb + reviews | L0→L3 |
| "quem são os concorrentes?" | `competitor_intel` | competitors + gap | L0→L4 + L6 |
| "esse lead vale a pena?" | `lead_scoring` | scoring engine | L2 + L5 |
| "cria o endpoint de diagnóstico" | `code_assist` | code search | L3 + L6 |

Schema em: `docs/spec/rsxt-intent-schema.json`

---

## 3. MAPEAMENTO RSXT → ADSENTICE

| RSXT | adsentice | Status |
|------|-----------|--------|
| **s0** (filesystem cognitivo) | Vault (R2 + Supabase, 463 linhas, 6/6 testes) | ✅ Implementado |
| **t0** (time-series) | BOA timeline + diagnostics history | 🔴 Schema pronto |
| **v0** (vector sensor) | Qdrant :6352 (486 pts, HNSW 768d) | ✅ Implementado |
| **k0** (knowledge graph) | adsentice-kg MCP (34→77 edges RSXT bridge) | ✅ Expandido |
| **f0** (BOA domain) | adsentice_boa_score.py + lead scoring | ✅ Implementado |
| **L0→L6** (pyramid) | Pipeline decisório (a implementar) | 🟡 Ingerido como doctrine |

---

## 4. DOUTRINAS QUE O ADSENTICE HERDA

| Doutrina RSXT | Aplicação adsentice |
|--------------|-------------------|
| **LLM = ÁRBITRO, NUNCA EXTRATOR** | DeepSeek V4 só sintetiza cards depois que L0-L5 processaram. NUNCA extrai entidades do site. |
| **EMBEDDING = SENSOR, NÃO ÁRBITRO** | `adsentice_search` retorna candidates (negócios similares, diagnósticos anteriores). O pipeline decide, não o embedding. |
| **PATTERN ACCUMULATION = FINE-TUNING SEM RETREINAR** | Cada diagnóstico salvo no Vault vira pattern. Score ≥ 80 → Tier 1 (próximo diagnóstico similar usa cache, zero LLM). |
| **FOUNDER_SIGNAL = 0.35 (MAIOR PESO)** | BOA formula adsentice idêntica à RSXT. Founder decide, métricas informam. |
| **SEMPRE L0→L6. NUNCA PULAR.** | Pipeline de diagnóstico NUNCA chama LLM antes de validar URL, checar cache, filtrar ANTI-ICP, buscar similares. |

---

## 5. COMO CONSULTAR

```bash
# Buscar doutrina L0-L6
adsentice_search "L0 L6 pipeline camadas sensor embedding"

# Buscar qual storage usar
adsentice_search "qual storage para audit trail"

# Resolver intent
adsentice_search "intent SEO keywords pipeline"

# Buscar nodes do KG
adsentice_kg_edges --entity "rsxt:"

# Ver schema de intents
cat docs/spec/rsxt-intent-schema.json
```

---

## 6. PRÓXIMOS PASSOS

1. **Implementar L0→L5 no pipeline.ts:** Adicionar validação, cache, filtro ANTI-ICP, busca de similares, BOA score ANTES de chamar DeepSeek.
2. **Pattern accumulation:** Salvar diagnósticos com score ≥ 80 como patterns Tier 1. Próximo diagnóstico similar → cache hit → zero LLM.
3. **rsxt-code skill:** Skill que consulta Qdrant por padrões de código RSXT antes de gerar Rust/TypeScript.
4. **rsxt-intent agent:** Agente que resolve intents do usuário usando o schema ingerido.

---

*Ponte RSXT→adsentice · v1.0.0 · 2026-07-12*
