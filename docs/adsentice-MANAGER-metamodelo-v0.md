# adsentice · MANAGER (Control Plane semântico) — metamodelo v0

> O "manager-first sólido" que o founder exigiu ANTES do norte. É o backend de gerenciamento que faltou ao EVO-API
> (lá tudo era gerido por um KG monolítico onde semântico⊗físico se misturavam → quebrou). Aqui: **managed-first**
> (Postgres/Supabase + pgvector + R2), **declarativo** (Manifest), **semântico ⊥ físico**, **inode estável**.
> Regra-mãe: o manager guarda **metadados + referências**, NUNCA bytes/vetores/hashes.

---

## 1. O que o MANAGER é (e o que ele NÃO é)

**É:** um **Registry** (catálogo único) + uma **Control Plane** (a dashboard admin que edita esse catálogo) +
**interfaces de store** estáveis. Ele responde a UMA pergunta: *"o que a plataforma sabe fazer, quem implementa, com
que saúde, e como isso vira dinheiro?"*

**NÃO é:** não executa captação, não roda IA, não guarda arquivo/vetor. Isso é o Data/AI Plane (Railway). O manager
só **declara e governa**. (No EVO-API a gente misturou os dois — a execução mutava o mesmo store que a gestão lia.)

```
CONTROL PLANE (Next.js admin · Vercel)        ← humano edita Manifests, vê saúde/score/custo
        │  (lê/escreve via API)
     REGISTRY (Postgres/Supabase)             ← metadados + referências (inode) · o catálogo
        │  (o Data Plane só LÊ)
DATA/AI PLANE (Railway)                        ← captação·enrich·score·proposta (execução)
        │
 STORES (interfaces): VectorStore(pgvector) · ArtifactStore(R2) · KnowledgeStore(edges) · RuntimeStore(Redis)
```

---

## 2. O metamodelo — as entidades (focado no adsentice · toda entidade tem `inode` + `version` + `Manifest`)

| entidade | o que declara | plano |
|---|---|---|
| **Capability** | a menor unidade funcional (`gmb.profile.rich`, `reviews.google`, `listings.search.region`) | semântico |
| **Provider** | quem implementa (dataforseo, supabase, r2…) | semântico |
| **Plugin** | o adapter técnico provider↔capability (+ quais Secrets exige) | semântico |
| **ScoreDimension** | 1 das 7 dimensões: sinais → regra de gap → peso → Solution que resolve | negócio |
| **Solution** | oferta vendável (bundle de capabilities + tier grátis/pago + pitch) | negócio |
| **Policy** | regras (tenant · spend-cap · sandbox/live · RBAC) | segurança |
| **Secret** | credencial (ref pro Vault/Cloudflare · nunca o valor) | segurança |
| **Eval** | resultado de validação (health/schema/latência/score) de uma Capability | runtime |
| **Probe** | descoberta de um serviço/endpoint (snapshot) | runtime |
| **Artifact** | objeto físico (resposta de API, arquivo, mockup) · `inode`+`blake3`+`storage_uri` | físico |
| **Embedding** | projeção vetorial de um Artifact/chunk (descartável · referencia o inode) | físico |

As **relações** (KnowledgeStore · tabela `edges`): `Plugin IMPLEMENTS Capability` · `Capability FEEDS ScoreDimension` ·
`ScoreDimension RESOLVED_BY Solution` · `Solution USES Capability` · `Capability EVALUATED_BY Eval` · `Artifact EMBEDDED_BY Embedding`.

---

## 3. O `inode` — a identidade estável (a lei nº1 que faltou)

Toda entidade tem um URN permanente que **nunca muda**, mesmo que provider/hash/storage mudem:
```
inode://capability/gmb.profile.rich
inode://provider/dataforseo
inode://score/reputation
inode://solution/reputation-management
inode://artifact/8fa34c...        (blake3 no path só pra artifacts físicos)
inode://embedding/emb_923
```
- **Capability/Solution/etc.** (semântico): inode = `kind/slug` legível e estável.
- **Artifact** (físico): inode lógico separado do `blake3` (o hash muda com o byte → dedup; o inode não).
- **Embedding**: referencia `artifact_inode` — troca de modelo re-embeda, o artifact continua. (Foi ISTO que quebrou
  o EVO-API: embedding tratado como identidade + append sem dedup = 11.296 vetores de lixo.)

---

## 4. O Manifest (declarativo · a cura do hardcode)

Registrar uma capability/solution = soltar um Manifest (YAML/JSON) → o Registry faz upsert por `inode`. **Zero código
por integração.** Exemplo REAL — a Capability GMB rica (aterrada nos 66 campos medidos):

```yaml
kind: Capability
inode: inode://capability/gmb.profile.rich
version: 1.0
name: "Google Meu Negócio — Perfil Rico"
category: local
provider: inode://provider/dataforseo
plugin: inode://plugin/dataforseo.my_business_info
input:
  place_id: { type: string, required: true }
output:                       # os 66 campos medidos, expostos (o translator RICO)
  title: string
  category: string
  description: string
  url: string                 # o WEBSITE (antes não expúnhamos)
  phone: string
  total_photos: int
  main_image: string
  logo: string
  rating: float
  rating_distribution: object
  is_claimed: bool            # false = lead quente
  work_time: object
  attributes: object          # delivery/serviços/pagamento…
  place_topics: array         # o que as pessoas mencionam
  people_also_search: array   # concorrentes na ficha
  book_online_url: string
  price_level: string
policy:
  mode: sandbox_default
  live: gated
  spend_cap: tenant
health: { status: unknown }   # preenchido pelo Eval, não à mão
feeds: [inode://score/presence, inode://score/visual, inode://score/reputation, inode://score/digital]
```

E uma ScoreDimension (declarativa · a regra de gap é DADO, não `if` em código):
```yaml
kind: ScoreDimension
inode: inode://score/reputation
name: "Reputação"
weight: 0.20
signals:                      # de quais campos/capabilities vem o sinal
  - { capability: reviews.google, field: rating }
  - { capability: reviews.google, field: reviews_count }
  - { capability: reviews.google, field: owner_answer_rate }   # o dono responde?
gap_rule:                     # quando é DOR (lead quente) — declarativo
  any:
    - { field: rating, lt: 4.0 }
    - { field: reviews_count, lt: 10 }
    - { field: owner_answer_rate, lt: 0.3 }
resolved_by: inode://solution/reputation-management
```

---

## 5. Os 5 Stores como INTERFACES (managed-first · impl concreta)

| store | interface | impl v0 (managed) | impl futura (soberano opcional) |
|---|---|---|---|
| **Registry/Capability** | `registry.get/upsert/list` | Postgres (Supabase) tabelas abaixo | — |
| **Vector** | `vector.embed/search` | **pgvector** (Supabase) | rsxt-v0 (0,23µs) atrás da mesma interface |
| **Artifact** | `artifact.put/get/hash/sign` | **Cloudflare R2** (S3-compat) | + rsxt-s0 tier local |
| **Knowledge** | `graph.link/traverse` | tabela `edges` (Postgres) | rsxt-k0 |
| **Runtime** | `runtime.session/cache/job` | **Redis** (Upstash) / DO | — |

**Schema Postgres do Registry (concreto · buildável):**
```sql
capabilities( inode text pk, id text, version text, kind text, name text, category text,
              input_schema jsonb, output_schema jsonb, manifest jsonb, health jsonb,
              status text, created_at timestamptz )
providers( inode text pk, id text, name text, kind text, config_ref text )
plugins( inode text pk, provider_inode text, implements text[], requires_secrets text[], manifest jsonb )
score_dimensions( inode text pk, name text, weight numeric, signals jsonb, gap_rule jsonb, resolved_by text )
solutions( inode text pk, name text, capability_inodes text[], tier text, pitch_template text, manifest jsonb )
policies( inode text pk, tenant text, rules jsonb )
evals( inode text pk, capability_inode text, status text, score numeric, latency_ms int, ran_at timestamptz )
edges( from_inode text, rel text, to_inode text )        -- o KnowledgeStore
-- FÍSICO (separado · nunca no mesmo lugar que o semântico):
artifacts( inode text pk, blake3 text, mime text, size bigint, storage_uri text, created_at timestamptz )
embeddings( id text pk, artifact_inode text, chunk_idx int, model text, dim int, vec vector )  -- pgvector
```

---

## 6. A Control Plane (as telas · o que o founder gerencia)

```
adsentice · Control Plane (admin-only · atrás do Cloudflare)
├── Capabilities   (lista + Manifest editor + health/eval)
├── Providers / Plugins / MCP Servers
├── Score Dimensions   (as 7 · pesos + gap_rule editáveis)
├── Solutions   (as ofertas · bundle + tier + pitch)
├── Registry (grafo navegável: Capability→Plugin→Provider→Eval→Solution)
├── Evals / Probes   (saúde real · medido)
├── Policies / Secrets   (spend-cap · sandbox/live · vault refs)
├── Artifacts / Embeddings   (físico · só metadados)
└── Metrics / Logs / Custo   (BillingEvent por tenant)
```
Toda tela **lê o Registry** e edita **Manifests**. Nenhuma tela executa captação (isso é o Data Plane).

---

## 7. Como o Data Plane CONSOME o manager (o fluxo adsentice)

O Railway não tem lógica hardcoded — ele **lê o Registry** e executa:
```
capture(region, category)  → registry.get(listings.search.region) → executa → Artifacts (leads)
enrich(lead)               → registry.list(capabilities WHERE feeds score) → executa cada → Artifacts
score(lead)                → para cada ScoreDimension: aplica signals+gap_rule (do Registry) → score + gaps
propose(lead)              → registry.get(Solutions resolved_by os gaps) → vec()/LLM sintetiza a proposta
```
Trocar uma regra de score ou adicionar uma solução = editar Manifest na Control Plane. **Zero deploy de código.** É a
diferença entre "sólido" e o que quebrou.

---

## 8. As garantias que tornam SÓLIDO (o anti-EVO-API)

1. **Semântico ⊥ físico** — `capabilities`/`solutions` (semântico) nunca guardam bytes; `artifacts`/`embeddings`
   (físico) nunca guardam significado. Tabelas separadas, planos separados.
2. **inode estável** — FK por inode em tudo; troca de provider/modelo/storage não quebra referência.
3. **Re-ingest DEDUPLICA** — `artifacts` chaveado por `blake3` (UPSERT, não append). Nunca mais 11k de lixo.
4. **Manifest declarativo** — nova capability/solução = dado, não controller. O de-hardcode nasce pronto.
5. **descrição ≠ fundação** — uma Capability só fica `status=active` quando um **Eval** real passa (health+schema).
   Mata o `module_truth 6/42` (as 27 descrições que fingiam ser features).
6. **medido=verdade** — health/score/custo vêm de Eval/BillingEvent reais, exibidos na Control Plane.

---

## 9. Ordem de build do MANAGER (o que fazer 1º pra ficar sólido)

- **M1 · o Registry Postgres + as interfaces de store** (managed): as tabelas §5 no Supabase + os wrappers
  `registry/vector/artifact/graph/runtime`. Prova: `registry.upsert(Manifest)` → `registry.get(inode)` volta.
- **M2 · o Manifest loader + validação** (drop-a-file): soltar um `.yaml` → upsert no Registry + valida schema.
  Prova: soltar o Manifest do `gmb.profile.rich` → aparece na Control Plane.
- **M3 · o Eval runner** (health real): roda a capability em sandbox → grava `evals` → `status=active`. Prova: GMB rico
  passa o Eval e fica verde (medido).
- **M4 · a Control Plane mínima** (Next.js): telas Capabilities + Score Dimensions + Solutions (ler+editar Manifest).
- **M5 · as 7 ScoreDimensions + as Solutions** como Manifests (o §2 do solution-engine).
- **DEPOIS (o norte):** o Data Plane (capture→enrich→score→propose) + o onboard público + a dashboard/UI+mockups.

Só quando M1-M5 estão de pé (o manager sólido) é que partimos pro norte. Foi essa ordem que faltou no EVO-API.

---

## 10. A decisão pra fechar

O manager está desenhado. Duas escolhas antes de codar M1:
1. **Backend do Data Plane:** Node/TypeScript (mesmo ecossistema do Next · 1 linguagem · mais rápido) **ou** Rust
   (reusa rsxt · mais performático · mais lento de escrever)? Recomendo **TypeScript** no v0 (managed-first · velocidade).
2. **Onde nasce o repo novo?** Posso iniciar `adsentice/` (monorepo: `apps/web` Next + `apps/api` + `packages/registry`)
   como projeto git novo, sibling do EVO-API. Confirma que crio a estrutura?
