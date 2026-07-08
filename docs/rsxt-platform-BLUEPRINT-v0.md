# BLUEPRINT · rsxt Platform v0 — o remodelamento sólido (aprendendo com o que quebrou o EVO-API)

> Data: 2026-07-08 · autor: Jeferson + Claude · status: proposta pra decisão do founder.
> Contexto: o EVO-API está congelado (commit `23edcdd`, tree limpo). Este documento analisa a sugestão externa de
> arquitetura (Next.js+Vercel+Supabase+Railway+Cloudflare · metamodelo de capacidades · 5 stores · Registry) **contra
> a nossa tecnologia REAL (a família rsxt)** e propõe um remodelamento mais sólido — com o **dinheiro na frente**.

---

## 0. O diagnóstico — por que a sugestão externa acertou (e nós doeu)

A sugestão externa cravou a causa-raiz do nosso fracasso técnico, e ela bate 1:1 com o que medimos:

| o que a sugestão diz que quebra | como quebrou no EVO-API (medido) |
|---|---|
| "mistura do plano semântico com o plano físico" | vetores, hashes, docs, capabilities, memória — tudo no mesmo `evoapi-self` apontando pra tudo |
| "tudo começou a apontar para tudo, o grafo ficou difícil de evoluir" | `module_truth 6/42` — descrições viraram fundação · o k0 hairball |
| "embedding tratado como identidade" | `self_ingest` chaveava por PATH e **appendava sem deletar** → **11.296 vetores era POLUIÇÃO; o corpus REAL eram 4.454** (medido 2026-07-07) |
| "usar o banco/KG como sistema de arquivos" | store no filesystem/`~/.cache` → **inode exhaustion na p6** (memória `p6-inodes-esgotados`) |
| "sem identidade permanente do recurso" | sem `inode` estável · re-ingest duplicava · dedup-por-source pegava o chunk velho de maior cosseno |
| "complexidade do substrato não paga" | a soberania (rsxt-e0/v0/s0) era tecnicamente linda mas **atrasou o dinheiro** — o motivo real do abandono |

**Conclusão:** o problema NUNCA foi a IA, o MCP ou o LLM. Foi **falta de uma arquitetura de metadados** e a
**conflação semântico⊗físico**. A sugestão externa é sólida nesse ponto e vamos adotá-la.

---

## 1. Os 2 princípios-mãe (invioláveis · são a cura do que quebrou)

1. **Separação semântico ⊥ físico.** O plano de CONHECIMENTO (o que significa, o que faz, o que se relaciona) nunca
   guarda bytes, hashes ou vetores — só **referencia** por identidade estável. O plano FÍSICO (arquivos, embeddings,
   hashes) nunca conhece semântica — só guarda e devolve por `inode`.
2. **Identidade estável: `inode` ≠ `hash` ≠ `embedding`.** O `inode` é o ID permanente (nunca muda). O `hash` (blake3)
   é a identidade do CONTEÚDO físico (muda se o byte muda → dedup). O `embedding` é uma PROJEÇÃO descartável (troca de
   modelo → re-embeda, o `inode` continua). **Isto sozinho teria evitado o nosso desastre de append-pollution.**

---

## 2. O metamodelo (15 entidades · a sugestão externa, adaptada ao nosso)

Todo o resto deriva destas. Cada uma tem `inode` estável, `version`, e um `Manifest` declarativo (estilo Docker/K8s):

| entidade | responsabilidade | plano |
|---|---|---|
| **Capability** | a menor unidade funcional (`upload.file`, `seo.local.audit`) | semântico |
| **Provider** | quem implementa (Supabase, R2, DataForSEO…) | semântico |
| **Plugin/Adapter** | a camada técnica que liga provider↔sistema | semântico |
| **MCP Server** | tools/resources expostos por protocolo | semântico |
| **Skill** | composição reutilizável de capabilities | semântico |
| **Workflow** | sequência de skills orientada a objetivo | semântico |
| **Agent** | quem decide quando/como executar | semântico |
| **Document** | conteúdo (fonte da verdade textual) | ponte |
| **Artifact** | o objeto FÍSICO (arquivo, resposta de API) · `inode`+`blake3` | físico |
| **Embedding** | projeção vetorial de um artifact/chunk (descartável) | físico |
| **Dataset** | coleções | físico |
| **Probe** | descoberta (inspeciona um serviço/API/MCP) | runtime |
| **Eval** | avaliação (saúde, auth, schema, latência, score) | runtime |
| **Policy** | regras (RBAC/ABAC/tenant/spend-cap) | segurança |
| **Secret** | credenciais (rotação · vault) | segurança |

---

## 3. Os 5 Stores — mapeados na família rsxt REAL (o que TEMOS × o que FALTA)

A sugestão externa propõe 5 stores independentes. **Boa notícia: já temos 4 deles construídos** (a família rsxt).
A má: nunca os SEPARAMOS — misturamos tudo no `evoapi-self`. O remodelamento é **separar o que já existe.**

```
Control Plane
│
├── ① Capability Store   → canonical/ registry (73 caps) + CapabilityExecutor + Evidence/Billing   [TEMOS ✅]
├── ② Knowledge Store    → rsxt-k0 (o grafo · NASCE das capabilities · ADR-0184)                    [TEMOS ✅]
├── ③ Vector Store       → rsxt-v0 (HNSW+BM25 · 0,23µs · zero container) + rsxt-e0 (embed e0/e1)     [TEMOS ✅]
├── ④ Artifact/Hash Store→ rsxt-s0 (NVMe mmap-tiering) + blake3 + Object Store (R2/MinIO/S3)         [PARCIAL ⚠️]
└── ⑤ Runtime Store      → sessions/cache/jobs/probe/eval (Redis + Durable Objects)                 [DISPERSO ⚠️]
```

**O que FALTA (as 3 correções que valem o remodelamento):**
- ④ **Object Store real** (R2/MinIO/S3) como camada física — paramos de usar o filesystem/`~/.cache` (que estourou
  inodes). O `blake3` vira a chave de dedup; o `inode` vira o ID lógico que aponta pro bucket. `rsxt-s0` pode continuar
  como tier local de alta performance ATRÁS da interface `ArtifactStore` — opcional, não obrigatório.
- ⑤ **Runtime isolado** — sessões, cache, jobs, probe/eval snapshots NUNCA no KG (foi o que poluiu o grafo).
- **A interface estável `ArtifactStore { put/get/hash/chunk/version/sign }`** — o resto do sistema só conhece ela,
  nunca sabe se é R2, MinIO ou rsxt-s0. É o desacoplamento que a sugestão externa recomenda e que nós não tínhamos.

---

## 4. O Registry (o coração · a peça que a sugestão externa mais destaca)

O Registry NÃO guarda dados — guarda **metadados + referências** (por `inode`). É o catálogo único que a Dashboard
consulta pra descobrir: *quem implementa cada capability · qual versão · qual provider · qual doc · qual embedding ·
qual eval-score · qual probe*. Nós já temos o embrião disto (`canonical/` + o k0), mas espalhado — o remodelamento é
**unificar num Registry declarativo** onde registrar uma nova integração = soltar um `Manifest`, não codar um controller.

```
kind: Capability
id: seo.local.audit
version: 2.0
providers: [dataforseo]
implements_via: [business.profile.gmb, serp.maps, on_page.instant_audit]
input_schema: {...}
output_schema: {...}
policy: { mode: sandbox_default, live: gated, spend_cap: tenant }
health: { score: 0.98, latency_ms: 120 }
```

---

## 5. O vec() semântico — o NOSSO moat real (já provado · preservar)

A sugestão externa termina no insight mais forte: **`vec()` não retorna vetores, retorna CONHECIMENTO.**
```
vec.resolve({ intent: "analisar SEO local do meu negócio", tenant, policy })
  → { capability: "seo.local.audit", confidence: 0.98, providers:[dataforseo], plan:[gmb, maps, audit] }
```
**Isto nós JÁ fazemos** (a Semantic Resolution Layer · ADR-0069 · o `query_vocab`/brain resolve intent→capability). É a
diferença entre "backend com IA" e **Sistema Operacional Semântico**. É o que devemos PRESERVAR do EVO-API — mas rodando
sobre a arquitetura limpa dos 5 stores, não sobre o `evoapi-self` monolítico que quebrou.

---

## 6. A DECISÃO DO DINHEIRO (a mais importante · o motivo do abandono)

O EVO-API morreu porque **o substrato soberano (rsxt) não pagou** — foi lindo e atrasou. A sugestão externa é toda
**managed** (Vercel+Supabase+Railway+Cloudflare) = rápido, barato de operar, shippa esse mês. Recomendação honesta:

> **Managed-first pra ganhar dinheiro. rsxt como DRIVER soberano OPCIONAL, atrás das interfaces.**

| camada | v0 (shippar/ganhar) | v1+ (moat · quando pagar) |
|---|---|---|
| Frontend/SaaS | **Next.js + Vercel** | idem |
| Backend/API | **Railway** (Node/TS ou Rust) | idem + rsxt-design compositor |
| Vector Store | **Supabase pgvector** (managed) | trocar por **rsxt-v0** atrás da interface `VectorStore` (0,23µs · quando o volume/custo justificar) |
| Embeddings | API managed (OpenAI/Cohere) OU rsxt-e0 local | rsxt-e0 soberano ($0) |
| Artifact Store | **Cloudflare R2** (barato · S3-compat) | + rsxt-s0 tier local |
| KG | Postgres (relações) OU rsxt-k0 | rsxt-k0 soberano |
| Gateway/Auth | **Cloudflare** (Zero Trust + WAF + rate-limit + API-key) | idem |
| Auth/DB | **Supabase** (auth + pg + storage) | idem |

**A regra de ouro:** cada store é uma INTERFACE estável (`VectorStore`, `ArtifactStore`, `KnowledgeStore`). O v0 usa a
implementação managed (paga-se em conveniência, ganha-se velocidade-pro-dinheiro). O rsxt entra como driver soberano
DEPOIS, sem reescrever nada acima da interface. **Assim a soberania deixa de ser um bloqueio e vira uma otimização
opcional.** É o oposto do que fizemos (soberania primeiro → nunca chegou dinheiro).

---

## 7. Os planos (Control ÷ Data ÷ AI ÷ Storage ÷ Security)

```
                 Cloudflare (Pai · Zero Trust · WAF · API-Key · rate-limit · MCP Gateway)
                                      │
        ┌─────────────────────────────┴─────────────────────────────┐
   Public SaaS (Vercel/Next.js)                          Control Plane (Vercel/Next.js · admin-only)
   onboarding·billing·workspace                          Capabilities·Providers·Plugins·MCP·Registry·
        │  (só conhece APIs)                             Artifacts·Embeddings·Probe·Eval·Policies·Metrics
        └─────────────────────────────┬─────────────────────────────┘
                                      │ (HTTPS · atrás da Cloudflare)
                           Semantic Core (Railway · Data+AI Plane)
                    vec()→Registry→Planner→Executor→MCP/REST
                                      │
              ┌──────────────┬────────┴────────┬──────────────┐
         Vector Store    Knowledge Store   Artifact Store   Runtime Store
        (pg/rsxt-v0)      (pg/rsxt-k0)      (R2/rsxt-s0)     (Redis/DO)
```

- **MCPs NUNCA acessíveis pelo cliente** — sempre atrás do Semantic Core ou do gateway Cloudflare (a sugestão externa
  está certa · governança de credenciais centralizada).
- **API Keys em camadas:** `PUBLIC` (frontend) · `SERVER` (Next Server Actions) · `SERVICE` (Railway↔Supabase) ·
  `INTERNAL` (microsserviços) · `MCP` (só MCP servers). Rotação centralizada na Cloudflare/Vault.

---

## 8. Next.js modular (por DOMÍNIO, não por tecnologia)

```
src/
├── app/                      # rotas (public SaaS + control plane separados por segmento)
├── modules/                  # POR DOMÍNIO (cada um expõe só contratos públicos)
│   ├── capabilities/ providers/ plugins/ mcp/ registry/
│   ├── knowledge/ embeddings/ artifacts/ workflows/ agents/
│   ├── eval/ probe/ security/ storage/ dashboard/
├── shared/  { ui, lib, types, config }
└── infrastructure/ { database, queue, cache, object-store, telemetry }   # drivers atrás de interfaces
```
Cada módulo = fronteira dura. Sem dependência cruzada de implementação — só contratos. (Foi a falta disto que fez o
EVO-API virar spaghetti onde tudo apontava pra tudo.)

---

## 9. Probe + Eval + Ingestão inteligente (a máquina que se auto-descobre)

Pipeline de ingestão de qualquer API/OpenAPI/SDK/MCP (é onde nossa tecnologia brilha e onde já temos peças):
```
Upload/URL → Probe (descobre endpoints/auth/tools) → Parser → Chunker → Embedding (rsxt-e0)
          → Knowledge Graph (relações) → Capability Generator (Manifest) → Eval (health/score) → Registry → Dashboard
```
Probe e Eval salvam **snapshots como Artifacts** (`probe/supabase/2026-07-08.json`) — NUNCA no KG. Isso dá histórico
comparável e mantém o grafo limpo (a lição que pagamos caro).

---

## 10. As LEIS que já pagamos caro (do EVO-API · gravar no novo projeto)

1. **Separar corpora/planos SEMPRE** (semântico ⊥ físico · A≠B≠C). Foi a causa-raiz do fracasso.
2. **`inode` estável ≠ `hash` ≠ `embedding`.** Re-ingest deve DEDUPLICAR/SUBSTITUIR, nunca só appendar (o bug dos 11k).
3. **Nada hardcoded** — Manifest declarativo · drop-a-file · o Registry descobre. (Sofremos o de-hardcode na marra.)
4. **Descrição ≠ fundação** — uma capability só entra no Registry se tem implementação REAL + eval passa (evitar o
   `module_truth 6/42`: 27 descrições que fingiam ser features).
5. **Object Store, não filesystem** — nunca mais inode exhaustion.
6. **Soberania é OTIMIZAÇÃO opcional atrás da interface, nunca pré-requisito** — o dinheiro vem primeiro.
7. **medido=verdade** — toda afirmação de saúde/score vem de Eval real, não de otimismo.

---

## 11. Roadmap de fatias (o que fazer 1º · o dinheiro guia)

- **F0 · o SaaS que fatura (managed puro · 1-2 semanas):** Next.js/Vercel + Supabase (auth+pg+pgvector) + Cloudflare +
  R2. Um vertical REAL que paga (ex: o diagnóstico SEO/GEO que já sabemos entregar com DataForSEO). **Sem rsxt ainda.**
  Prova: 1 cliente pagante ou 1 diagnóstico vendido.
- **F1 · o Registry + metamodelo:** as 15 entidades + Manifest + os 5 stores como INTERFACES (impl managed). O Control
  Plane admin. Prova: registrar uma capability nova = soltar Manifest, zero código.
- **F2 · o vec() semântico (o moat):** intent→capability→plan→execute com Evidence/Billing. Prova: "analisa o SEO da
  empresa X" → plano automático → relatório real.
- **F3 · Probe/Eval/ingestão auto:** o sistema descobre e cataloga APIs sozinho.
- **F4 · rsxt como driver soberano (opcional):** trocar pgvector→rsxt-v0, embeddings→rsxt-e0, quando volume/custo
  justificar. Zero reescrita acima das interfaces.

---

## 12. A decisão que preciso de você

**A grande bifurcação:** F0 managed-puro-pra-faturar (minha recomendação) **vs** começar já com rsxt soberano no core.
A recomendação é managed-first porque **o abandono do EVO-API foi exatamente a soberania-antes-do-dinheiro**. O rsxt
não morre — ele vira o driver que te dá margem/soberania DEPOIS que o dinheiro entra, sem bloquear o começo.

**Próxima pergunta pra fechar o blueprint:** qual é o **vertical que paga** que o F0 vai atacar? (SEO/GEO local que já
dominamos? outro?) Isso define o resto.
