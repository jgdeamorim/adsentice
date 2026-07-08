# adsentice · Canais de entrega × endpoints (OpenAPI · MCP · brain · k0) — e onde o cofre entra

> O founder: antes de construir os stores concretos, analisar as OUTRAS entregas de solicitação (OpenAPI, MCP, além
> de k0/brain) e a relação com os endpoints. Este doc mapeia isso e prova o ponto-chave: **os 4 canais são só PORTAS
> pra a mesma Capability — e TODOS passam pelo mesmo write-ahead (o cofre).** Logo os stores são agnósticos de canal.

## 1. A regra-mãe: 1 Capability, N portas, 1 execução, 1 cofre

O moat é a **Capability** (`gmb.profile.rich`, `reviews.google`…). Ela é alcançável por 4 portas, mas a execução e o
write-ahead são ÚNICOS:

```
   [porta OpenAPI/REST]   [porta MCP]   [porta brain]   [porta k0]
            └───────────────┴──────┬───────┴──────────────┘
                                   ▼
                    CapabilityExecutor (Camada 1 · EVO-API/rsxt container)
                    · cost-gate · Evidence · executa o provider (DataForSEO)
                                   ▼
                    vault.put()  →  ① R2 blob  → ② Postgres série  (o OURO · write-ahead)
                                   ▼
                    resultado volta pela MESMA porta que entrou
```

**Consequência prática:** `vault.put()` é chamado **1 vez, no CapabilityExecutor**, não por canal. Construir os stores
(Supabase/R2) serve os 4 canais de graça. Zero duplicação, zero retrabalho.

## 2. Os 4 canais (o que é cada um · quem usa · endpoint) — grounded no que o EVO-API JÁ serve

| canal | o que é | quem usa (no adsentice) | endpoint/forma (medido no EVO-API) |
|---|---|---|---|
| **OpenAPI/REST** | cada capability = 1 endpoint HTTP tipado · contrato público | o **Next.js** (Server Actions) · o Data Plane (capture→enrich→score) · máquina | `/openapi.json` (73 caps · 3.1) → `POST /module/<cap>` |
| **MCP** | as capabilities como **tools** · protocolo IA→IA | um **agente IA** externo · o brain do adsentice · o Claude/GPT do cliente | `/mcp` (Streamable HTTP · multi-tenant · ADR-0202) · tool `capability_invoke` |
| **brain** | intent em linguagem natural → capability + **síntese** aterrada | a **conversa** (onboard) · o gerador de **proposta/relatório** | `POST /brain/ask?msg=` |
| **k0** | as **relações** (gap→solução→capability) · resolução declarativa | o motor de **score/proposta** (interno) | interno · query na tabela `edges` |

## 3. A relação com os ENDPOINTS: 1 Capability = 4 faces do mesmo

A Capability `gmb.profile.rich` tem, ao MESMO tempo:
- **REST:** `POST /module/gmb.profile.rich` (input tipado · saída canônica · no `/openapi.json`)
- **MCP tool:** `capability_invoke(id="gmb.profile.rich", input={place_id})`
- **brain intent:** *"a ficha do Google Maps da LuRocha"* → resolve pra `gmb.profile.rich`
- **k0 node:** `capability://gmb.profile.rich` — com edges `feeds→score:presence/visual/reputation`

O **Registry** (o manager · Postgres) é a fonte única: dele derivam o OpenAPI (gera do schema), os tools MCP (gera do
mesmo schema), o resolvedor do brain (embeddings dos intents) e os nós/edges do k0. **1 Manifest → 4 canais** (é o
"1 canonical → N canais" do ADR-0069, agora managed).

## 4. Quem usa qual porta no fluxo adsentice (concreto)

```
Objetivo 1 · captação por região:
   Data Plane → REST(business_listings.search) → vault → leads

Enriquecer + score:
   Data Plane → REST(gmb.profile.rich, reviews.google, on_page.audit…) → vault → parsed → score (k0: gap_rules)

Proposta:
   k0 (gap→solução) + brain (síntese aterrada nos números reais do vault) → proposta

Onboard público (cliente entra):
   Next.js (Vercel) → Server Actions → REST → (mesmas capabilities)

Agente externo / o Claude do cliente:
   → MCP /mcp → capability_invoke → (mesmas capabilities)
```

## 5. O que isto decide pro build (a conclusão)

1. **Os stores concretos são agnósticos de canal** → construir `SupabaseSeriesStore` + `R2BlobStore` agora serve os 4
   canais. Não há por que esperar. ✅
2. **O `vault.put()` mora no CapabilityExecutor** (Camada 1), não em cada rota. Os canais só chamam o Executor.
3. **O Registry é a fonte dos 4 canais** — quando construirmos o manager (M-fases), o OpenAPI + os tools MCP + o
   resolver do brain + os edges do k0 GERAM do mesmo Manifest. Nada hardcoded, nada duplicado por canal.
4. **Ordem confirmada:** (a) esta análise [feito] → (b) `SupabaseSeriesStore` + `R2BlobStore` concretos → (c) o
   CapabilityExecutor chamando `vault.put` → (d) as 4 portas por cima (REST primeiro · o Next consome).

## 6. Nota de reuso (o EVO-API já tem as portas)

O EVO-API/rsxt (Camada 1 containerizada) **já serve** `/openapi.json` (73 caps), `/mcp` (capability_invoke) e
`/brain/ask` (medido · commits `28c96e9`/`90dc658`). Reusamos essas portas — só plugamos o `vault.put()` no caminho de
execução (write-ahead) e persistimos no cofre managed. O que faltava (e é o valor do adsentice) é o **cofre durável** +
o **score/proposta** por cima — não reconstruir as portas.
