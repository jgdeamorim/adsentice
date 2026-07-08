# adsentice

Captação de leads locais por **região** via **Google Meu Negócio** → enriquece → **score** (7 dimensões) →
**proposta** automática (grátis tips+mockup → planos pagos). O dashboard é o produto; o hub semântico
(rsxt/EVO-API · 73 capabilities DataForSEO) é a Camada 1, atrás do **cofre durável**.

## Monorepo (npm workspaces)

```
apps/
  web/          Next.js 15 + MUI (Materio) — dashboard client + admin (Supabase Auth · roles)
  api/          backend TS (Railway) — a lógica (score · leads · enrich-guard) · consome EVO-API   [a construir]
packages/
  vault/        ✅ o cofre — write-ahead (R2 + Supabase) · CapabilityExecutor · GMB rico (39 campos)
  core/         domínio puro — Lead · ScoreDimension · Solution · scoring                            [a construir]
  evoapi-client/ consome os canais rsxt/EVO-API (REST/MCP) = o ProviderPort                          [a construir]
  db/           schemas (query_vault · leads · registry) + Supabase                                  [a construir]
docs/           arquitetura (blueprint · manager · cofre · canais · enterprise)
```

## Princípios (as leis que pagamos caro)

- **managed-first** (Vercel · Cloudflare · Supabase · Railway) — soberania (rsxt) é otimização opcional atrás das interfaces.
- **semântico ⊥ físico** · `inode`/`id` ≠ `blake3` ≠ `embedding` · re-ingest **deduplica** (nunca só appenda).
- **cofre durável ≠ índice descartável** — o ouro (queries DataForSEO pagas) mora no R2 + Supabase (append-only · imutável).
- **RLS por tenant** (o container de segurança) · Manifest declarativo (nada hardcode).

## Rodar

```
npm install                 # instala o workspace
npm test -w @adsentice/vault  # os testes do cofre (6/6)
```

Creds ficam FORA do repo (em `self-essentials/`, via `SUPABASE_ENV_FILE` / `CLOUDFLARE_ENV_FILE`).
