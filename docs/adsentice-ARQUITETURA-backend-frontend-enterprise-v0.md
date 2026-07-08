# adsentice · Arquitetura enterprise (backend TS + frontend + auth) — o dashboard como NORTE

> O founder: estruturar backend+frontend corretamente · backend TS com a LÓGICA · consumir os canais do rsxt/EVO-API ·
> o **dashboard adsentice é o norte do produto** · auth admin/client · gerenciar como estrutura enterprise (não peças soltas).

## 1. O NORTE: o dashboard adsentice (2 superfícies)

- **Client Dashboard** (o cliente/tenant): seus leads capturados por região · score · pontos de melhoria · propostas · métricas de atração.
- **Admin Control Plane** (nós/operadores): gerenciar capabilities, score-dimensions, solutions, tenants, custo/spend, saúde.

Ambas no `apps/web` (Next.js), separadas por **role** (admin × client), atrás do Cloudflare + Supabase Auth.

## 2. Monorepo (npm workspaces · sem tooling novo · managed-first)

```
adsentice/
├── apps/
│   ├── web/              # Next.js (Vercel) — dashboard client + admin + onboard público
│   └── api/              # backend TS (Railway) — a LÓGICA · expõe REST pro web · consome EVO-API
├── packages/
│   ├── vault/            # ✅ JÁ EXISTE — o cofre (write-ahead · R2+Supabase · CapabilityExecutor)
│   ├── core/             # domínio PURO (sem I/O): Lead · ScoreDimension · Solution · scoring · enrich-guard
│   ├── evoapi-client/    # consome os canais EVO-API (REST /module · OpenAPI · MCP) = o ProviderPort real
│   ├── db/               # schemas + migrations (query_vault · leads · registry) + acesso Supabase
│   └── config/           # (opcional) mover os loaders de creds do vault pra cá
└── docs/  infra/
```

**Regra de dependência (limpa · enterprise):** `web → api → {core, vault, evoapi-client, db}`. `core` não depende de nada
(lógica pura, testável $0). Nada de dependência cruzada entre packages de domínio.

## 3. Backend (`apps/api` · TS · Railway) — a lógica

Expõe REST pro frontend (Server Actions do Next chamam aqui). Orquestra:
```
POST /capture   { region, category }  → evoapi-client(business_listings.search) → dedup place_id → cria leads
POST /enrich    { leadId }            → enrich-guard (fresco? pula) → evoapi-client(gmb.rich, reviews, audit)
                                         → CapabilityExecutor.vault.put (o ouro) → core.score → atualiza lead
GET  /leads     { tenant, page }      → lista paginada (do `leads`, nunca varre o cofre)
GET  /lead/:id                        → detalhe + score + gaps + proposta
POST /proposal  { leadId }            → core.resolve(gaps→solution) + LLM sintetiza (grounded no ouro)
```
Toda rota é **tenant-scoped** (o JWT do Supabase traz o tenant_id → RLS + filtro). O backend usa o **service role** pro
cofre (write-ahead) e o **contexto do tenant** pras leituras.

## 4. Frontend (`apps/web` · Next.js · Vercel) — o dashboard

- **Supabase Auth** (managed · email/OAuth). O JWT carrega `role` (admin|client) + `tenant_id`.
- **Middleware** separa as rotas: `/app/*` (client dashboard) · `/admin/*` (control plane · só role=admin).
- **Server Actions** chamam o `apps/api` (via HTTPS · atrás do Cloudflare). O web não tem lógica de negócio — só UI + auth.
- A UI pode ser **gerada no OD** a partir dos dados reais do cofre/leads (o "ponto difícil" resolvido pelo OD → React).

## 5. Como consome o EVO-API/rsxt (o `evoapi-client`)

O EVO-API/rsxt (Camada 1 · containerizada) serve os 3 canais (medido): `/module/<cap>` (REST/OpenAPI) · `/mcp` · `/brain/ask`.
O `evoapi-client` implementa o `ProviderPort` do vault chamando o canal REST:
```
evoApiClient.execute("gmb.profile.rich", { place_id }) → POST http://<evoapi>:7700/module/gmb.profile.rich → { raw, cost }
```
→ o `CapabilityExecutor` traduz (GMB 39) → `vault.put` (o ouro). **Reusa a tech que funciona, atrás de 1 interface.**

## 6. Auth & roles (admin × client · o container de segurança)

| role | vê | pode |
|---|---|---|
| **admin** (adsentice) | todos os tenants · capabilities · custo · saúde | gerenciar o engine (Manifests · score-criteria · solutions) |
| **client** (tenant) | só os SEUS leads/relatórios | capturar região · pedir diagnóstico · ver propostas |

RLS por `tenant_id` em TODA tabela (já está no `query_vault` · estende pra `leads`). `anon` não vê nada.

## 7. As camadas de dados (quem escreve/lê · escala p/ milhares)

| tabela | papel | escreve | lê |
|---|---|---|---|
| `query_vault` | o OURO cru (append-only · imutável) | api (service role · write-ahead) | api (rebuild/auditoria) |
| `leads` | o NEGÓCIO (1 por place_id/tenant · score/gaps/stage) | api (enrich · atualiza) | web (dashboard · paginado) |
| `registry` | Manifests (capabilities · score-dims · solutions) | admin | api (resolve) |

## 8. Ordem de build

- **B1 · scaffold do monorepo** (apps/web + apps/api + packages/core + evoapi-client + db · npm workspaces · tsconfig base).
- **B2 · `db` + `leads`** (schema leads + enrich-guard · o que discutimos p/ escala/custo).
- **B3 · `core`** (Lead · ScoreDimension · scoring · enrich-guard · testes puros $0).
- **B4 · `evoapi-client`** (o ProviderPort real · REST → :7700).
- **B5 · `apps/api`** (as rotas · wire core+vault+evoapi-client).
- **B6 · `apps/web`** (Supabase Auth · admin/client · o dashboard · UI via OD).

## 9. Decisão pra confirmar

- **Monorepo:** npm workspaces (sem tooling novo · recomendo) — ok?
- **Auth:** Supabase Auth com role admin|client no JWT + RLS por tenant — ok?
- **Começo:** B1 (scaffold) → B2 (leads+guard)? Ou prefere outra ordem?

Nada de peça solta: isto é a espinha enterprise. Confirma pra eu fazer o **B1 (scaffold do monorepo)**.
