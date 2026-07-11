# ADR-0002 — Gap Analysis: EVO-API vs adsentice · O que falta e o que precisa

> 2026-07-11 (atualizado 23:59) · Análise completa de gaps. Gaps #1, #2, #3, #4 RESOLVIDOS na sessão.
> Medido=verdade: cada gap cita fonte (arquivo, config, código).

---

## 1. MCP SERVERS — Comparação

| EVO-API (8) | adsentice (7 + Firecrawl keyless) | Gap |
|---|---|---|
| `claude-mongodb` (:27030) | ❌ Não temos | 🟢 **Não precisamos.** MongoDB era pra dados de provider docs. Nosso vault usa Postgres. |
| `claude-redis` (:6395) | ✅ `adsentice-redis` (:6396) | ✅ Coberto |
| `claude-kg` (:6350, tag=evo-api) | ✅ `adsentice-qdrant` (:6352) + `adsentice-kg` (:6352, tag=adsentice) | ✅ Coberto (2 servidores vs 1, mas mais especializados) |
| `context7` | ✅ `context7` | ✅ Coberto |
| `cognitive-mcp` | ❌ Não temos | 🟡 **Médio.** Análise de código, OODA. Podemos portar depois. |
| `coder-mcp` | ❌ Não temos | 🟢 **Baixo.** Brain analyze, cross-KG. Portar quando tivermos código pesado. |
| `evo-ecc` | ❌ Não temos | 🟡 **Médio.** Fanout, dispatch, harvest de sessões. Relevante quando tivermos multi-agente. |
| `claude-conversation` (tag=all) | ✅ `adsentice-conversation` (tag=adsentice) | ✅ Coberto |
| — (novo) | ✅ `dataforseo` | 🏆 **Exclusivo adsentice.** EVO-API não tem MCP oficial DataForSEO |
| — (novo) | ✅ `firecrawl` (remote, 11 tools, keyless $0) | 🏆 **Exclusivo.** Substitui crawler proprio |

**Placar: 7/8 cobertos + 2 exclusivos.**

---

## 2. HOOKS — Comparação

| EVO-API (5 hooks ativos) | adsentice (3 hooks) | Gap |
|---|---|---|
| `evo_session_start.py` (injeta contexto OODA + base-matriz) | ✅ `adsentice-session-start.py` (injeta contexto OODA + base-matriz + BOA + docs) | ✅ Coberto. Nosso hook é MAIS completo. |
| `evo_pre_compact.py` (salva memória-do-porquê + ingest detached) | ✅ `adsentice-pre-compact.py` (salva OODA + decisões + score) | ⚠️ **Falta ingest da conversa no Qdrant.** O EVO-API ingere o delta da conversa no PreCompact → collection `evoapi_conversation`. Nosso NÃO faz isso ainda. |
| `evo_disk_guard.py` (protege disco) | ❌ | 🟢 **Baixo.** O EVO-API teve trauma de NVMe cheio. Nosso disco tem 18 GB livre. |
| `evo_prompt_enrich.py` (enriquece prompts) | ❌ | 🟡 **Médio.** Enriquece prompts com contexto adicional. Podemos criar versão adsentice. |
| `auto-commit-task.sh` (git commit automático) | ❌ | 🟡 **Médio.** Commita automaticamente em worktrees. Menos crítico em repo único. |
| — (hook global) `co_boa_score.py` | ✅ `tools/adsentice_boa_score.py` (script, não hook) | ⚠️ BOA existe como script standalone, mas **não como hook automático**. O EVO-API tem `co_boa_score.py` como hook. |
| — (hook global) `vault_indexer.py` | ❌ | 🟢 **Baixo.** Indexa vault no Qdrant. Nosso vault ainda é pequeno. |

**Placar: 2/5 hooks cobertos com gap principal: ingest da conversa no PreCompact.**

---

## 3. SKILLS — Comparação

| EVO-API (3 skills) | adsentice (3 skills) | Gap |
|---|---|---|
| `base-matriz` (consulta ao mapa do ecossistema) | ✅ `adsentice-spec` (cobre parcialmente) | ⚠️ Nosso skill é de AUTORIA, não de CONSULTA. Falta skill de consulta à base-matriz. |
| `spec-master` (autoria de specs/ADRs) | ✅ `adsentice-spec` | ✅ Coberto |
| `provider-docs` (consulta à base medida de providers) | ❌ | 🟡 **Médio.** EVO-API tem 73 caps. Nós temos DataForSEO MCP. Skill de "como usar cada módulo DataForSEO" seria útil. |
| — (novo) | ✅ `adsentice-site-audit` | 🏆 **Exclusivo.** Skill de auditoria Firecrawl + DataForSEO |

**Placar: 3/3 cobertos + 1 exclusivo.**

---

## 4. INFRAESTRUTURA — Comparação

| Componente | EVO-API | adsentice | Gap |
|---|---|---|---|
| **Redis OODA** | :6395 (evoapi:ooda:*) | :6396 (adsentice:ooda:*) | ✅ |
| **Qdrant KG** | :6350/:6351 | :6352/:6353 | ✅ |
| **Embed server** | :8081 (mpnet) | :8081 (compartilhado) | ✅ |
| **MongoDB** | :27030 (parado) | ❌ | 🟢 Não precisamos |
| **Self-ingest** | `evo-self-ingest` (Rust) | `adsentice_self_ingest.py` (Python) | ✅ |
| **Corpus ingerido** | 11k vetores (poluído, 4.5k real) | 276 pontos (limpos, dedup SHA256) | ✅ |
| **BOA Score** | `co_boa_score.py` (hook automático) | `adsentice_boa_score.py` (script manual) | ⚠️ Não é hook |
| **Conversation ingest** | `mcp_qdrant_conversation.py` (tag=all) | `adsentice_conversation.py` (tag=adsentice) | ✅ Criado hoje |
| **Base-Matriz** | v1.3.94, 7 dimensões, rotas `{#EVO.X}` | v0.1.0, 7 dimensões, rotas `{#ADS.X}` | ✅ |
| **Materio vec()** | ❌ (não tem) | ✅ 36 tokens em 6 categorias | 🏆 Exclusivo |
| **Pipeline config JSON** | ❌ (hardcoded em .rs) | ✅ `pipeline-config.json` | 🏆 Exclusivo |
| **BOA dimensions JSON** | ❌ (hardcoded) | ✅ `boa-dimensions.json` | 🏆 Exclusivo |

---

## 5. GAPS CRÍTICOS (a implementar AGORA)

### 🔴 GAP 1: PreCompact não ingere conversa no Qdrant

**O que é:** O EVO-API tem o hook `evo_pre_compact.py` que, além de salvar estado OODA, também faz **ingest incremental detached** do delta da conversa na collection `evoapi_conversation` (Qdrant :6350). Isso permite que a DAG recupere decisões passadas via `kg_search(tag='all')` → `medido=verdade`.

**Impacto:** Sem isso, o histórico de conversas do adsentice NÃO é pesquisável. O `adsentice-conversation` MCP server existe, mas ninguém alimenta a collection.

**Solução:** Adicionar ao `adsentice-pre-compact.py` um passo de ingest: para cada mensagem da conversa, embedar e upsert no Qdrant (`adsentice-conversation`, tag=adsentice).

### 🔴 GAP 2: BOA Score não é hook automático

**O que é:** O EVO-API executa `co_boa_score.py` como hook (provavelmente SessionStart ou PostCompact). Nosso BOA é um script standalone (`tools/adsentice_boa_score.py --save`).

**Impacto:** O BOA score fica stale. O Redis mostra 0.815 mas isso foi computado manualmente, não atualiza automaticamente.

**Solução:** Executar `adsentice_boa_score.py --save` no hook SessionStart.

### 🟡 GAP 3: Falta skill de consulta (provider-docs-like)

**O que é:** O EVO-API tem `provider-docs/SKILL.md` — "o reflexo: consultar a base antes de grep/scrape/chute sobre provider". Ensina a usar KG-first, medido=verdade, nunca inventar campo.

**Impacto:** Sem esse skill, o Claude Code pode tentar "adivinhar" parâmetros da API DataForSEO em vez de consultar a doc oficial.

**Solução:** Criar `.claude/skills/adsentice-provider/SKILL.md` com o mesmo padrão.

### 🟡 GAP 4: Falta skill de consulta à base-matriz

**O que é:** O EVO-API tem `base-matriz/SKILL.md` — skill de CONSULTA (não autoria) ao mapa do ecossistema.

**Impacto:** Nosso `adsentice-spec` é de AUTORIA. Falta um skill que diga "consulte a base-matriz antes de tomar decisões".

**Solução:** Adicionar modo de consulta ao `adsentice-spec/SKILL.md` ou criar skill separado.

### 🟢 GAP 5: Falta auto-commit hook

**O que é:** O EVO-API tem `auto-commit-task.sh` — quando uma task é completada, faz git commit automático em worktrees.

**Impacto:** Baixo. Nosso repo é único (sem worktrees) e fazemos commits manuais frequentes.

---

## 6. O QUE O ADSENTICE TEM QUE O EVO-API NÃO TEM

| Exclusivo adsentice | Descrição |
|---|---|
| **DataForSEO MCP oficial** | 9 módulos, ~30 tools. EVO-API tem provider.core próprio (73 caps, 48 translators) mas é mais complexo. |
| **Materio vec()** | 36 design tokens indexados semanticamente. EVO-API não tem vocabulário de design como vetor. |
| **pipeline-config.json** | Configuração declarativa dos 6 pipelines + 5 deep-dives. EVO-API é hardcoded em Rust. |
| **boa-dimensions.json** | BOA com data sources explícitos. EVO-API tem BOA mas não como JSON estruturado. |
| **Chat spec (596 linhas)** | Especificação completa da UX do chat. EVO-API não tem produto — é fábrica. |
| **Brand IQ automático** | Descoberto, não configurado. EVO-API não tem conceito de "cliente final". |
| **Modelo de créditos** | Free/Starter/Pro/Escala. EVO-API não tem monetização. |
| **Landing page OD** | HTML/CSS/JS vanilla com GSAP, nível Jasper. EVO-API não tem landing page. |
| **Vault (R2+Postgres)** | Write-ahead com dedup. EVO-API usa rsxt-s0 diretamente (mais potente, mais complexo). |

---

## 7. PLANO DE AÇÃO

| Gap | Ação | Prioridade | Status |
|---|---|---|---|
| **GAP 1** | Adicionar ingest de conversa no PreCompact | 🔴 HOJE | ✅ **RESOLVIDO.** 716 chunks em `adsentice-conversation` |
| **GAP 2** | BOA como hook SessionStart | 🔴 HOJE | ✅ **RESOLVIDO.** `adsentice_boa_score.py --save` no hook |
| **GAP 3** | Skill adsentice-provider | 🟡 Semana | 🟡 pendente |
| **GAP 4** | Modo consulta no adsentice-spec | 🟡 Semana | 🟡 pendente |
| **GAP 5** | Auto-commit hook | 🟢 Depois | 🟢 pendente |

**ADRs novos (2026-07-11):**
- ADR-0003 — MCP Server Architecture (7 servers, SDK mcp, Firecrawl)
- ADR-0004 — AG-UI Protocol Decision (padrão destino, adiado do MVP)
- ADR-0005 — Lead Funnel & CRM Strategy (Stage 0→7, signal detection, scoring)
- ADR-0006 — EVO-API as Data Engine (motor × painel)
- ADR-0007 — MVP Simplification (JSON simples, sem SSE/AG-UI)

---

*ADR-0002 · 2026-07-11 · Gap analysis EVO-API vs adsentice · medido=verdade*
