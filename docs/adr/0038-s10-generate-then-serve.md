---
id: adr-0038
title: S10 Generate-then-Serve — Artefatos Vault-backed (R2 + Supabase) com TTL 30 dias
status: accepted
date: 2026-07-18
deciders: founder, claude
extends: [adr-0005, adr-0010, adr-0032, adr-0037]
---

# ADR-0038 · S10 Generate-then-Serve — Artefatos Vault-backed com TTL 30d

## Contexto

A rota `/s10-raio-x/[place_id]` (v081, commit `25beea2`) é **compose-on-view**: o pipeline
BLUE L0-L6 completo (DeepSeek + 7 queries Qdrant + Supabase) roda no request do lead.

**Medido (2026-07-18):**
- Cold: **11.8-14.7s** (DeepSeek V4 ~5-10s dominante) · cache quente: 0.44s
- Cache real é **só L1 memory** do processo — L2 Redis é silent fail (fala HTTP com servidor
  RESP, selo v060) e TTL 5min → **quase toda primeira view real é cold**
- O Raio-X é ferramenta de **outreach**: lead recebe link via WhatsApp, abre no celular,
  janela de atenção ~3s. 14s de tela branca = conversão morta.
- Se o DeepSeek falha *naquele* request, o fallback vaza jargão interno ("AGITAR A DOR")
  direto ao lead — sem chance de revisão.
- A/B testing (`composedLayout.abTest`, v080) exige variante **fixa por lead** entre views;
  compose-on-view pode alternar variantes → métrica de conversão contaminada.

**Insight do founder:** *geração* (evento do sistema, qualidade primeiro, 14s ok) e
*primeira view* (momento de conversão, <1s, nunca falha) são eventos distintos com
requisitos opostos — e **a página não precisa viver para sempre: 30 dias é o ciclo de
aquecimento do lead**. Artefato expirado + lead requentado = raio-X novo (dados frescos),
que é comportamento desejável, não bug.

**Infra provada nesta sessão (probe `tools/adsentice_s10_infra_probe.mjs`):**
- `pg direct-5432: OK` — DDL aplicável via node+pg (bloqueio anterior era só no pooler)
- `r2 put-get-delete: OK · bucket=adsentice` — creds `CLOUDFLARE_R2_*` do `.env` funcionam
  via `@aws-sdk/client-s3` (SigV4 real; o `r2-vault.ts` legado usa auth Bearer inválida)
- `query_vault` vivo no Supabase (HTTP 200) — série vault canônica operacional

## Decisão

**Adotamos generate-then-serve para a surface S10**, aplicando a doutrina #5 do Vault
("R2 blob → Postgres série ANTES de indexar") ao artefato que o lead vê, sobre o
**plano free da Cloudflare** (ADR-0010) + Supabase:

```
① GERAÇÃO (async · qualidade primeiro · ~14s ok)
   trigger: POST /api/s10-artifacts {place_id} · fallback on-miss da view · batch futuro
     └→ composeS10(place_id)            (BLUE L0-L6 + GREEN, inalterado)
     └→ QG gate: critique.passed        (reprovou → NÃO publica; lead nunca vê versão ruim)
     └→ R2  s10/{place_id}/v{N}.json    ({html, blue, meta} · 1 objeto atômico/versão ·
                                          PutObject IfNoneMatch:"*" — imutável, nunca sobrescreve)
     └→ PG  s10_artifacts               (série: place_id, version, blob_key, content_hash,
                                          headline/copy_model/ab_variant, qg, custo,
                                          expires_at = generated_at + 30d)

② VIEW (síncrona · <1s · Route Handler)
   GET /s10-raio-x/[place_id]  (route.ts substitui page.tsx — artefato é text/html puro)
     └→ SELECT publicado não-expirado (REST Supabase ~100-200ms)
         ├─ hit  → R2 GetObject → Response(html) + Cache-Control s-maxage
         └─ miss/expirado → ① inline (gera+persiste) → serve  [degrada, não quebra]

③ EXPIRAÇÃO (TTL 30 dias — ciclo de aquecimento do lead)
   lógica:  expires_at na série → view ignora expirados → re-gen on-demand (dados frescos)
   física:  R2 Object Lifecycle rule — delete prefix s10/ após 35d (5d de carência
            para inspeção pós-expiração) · nativo e gratuito
   versões: v1..vN preservadas até o lifecycle físico (WORM-friendly, dimensão EVD)
```

### Papel do plano free Cloudflare (medido vs ADR-0010)

| Produto | Free tier | Papel no ADR-0038 | Status |
|---|---|---|---|
| **R2** | 10 GB storage · egress $0 · lifecycle rules nativas | blob do artefato (~100 KB/versão → capacidade ~100k versões) | ✅ agora |
| **CDN/Cache** | ilimitado | `Cache-Control: s-maxage` já emitido; edge cache ativa quando o domínio entrar na CF | ⬜ deploy |
| **Workers + Cron** | 100K req/dia | batch pre-warm de leads em campanha + GC | ⬜ Fase 2 (ADR-0010 Fase 2) |
| **KV** | 100K reads/dia · TTL nativo | aceleração do índice no edge (opcional) | ⬜ avaliação |

Fontes: [R2 pricing](https://developers.cloudflare.com/r2/pricing/) ·
[R2 object lifecycles](https://developers.cloudflare.com/r2/buckets/object-lifecycles/)

### Decisões cravadas

1. **Servir HTML congelado do blob** (bytes idênticos ao aprovado pelo QG), não re-render
   JSX on-view. O `blue.json` fica no mesmo blob para re-render futuro sem re-pagar BLUE
   — o componente `S10RaioXPage` (v081) passa a ser o renderer da *geração* (evolução
   apontada no próprio revert `980f5b4`: "JSX future: replace in composeS10 pipeline").
2. **Série em tabela dedicada `s10_artifacts`** (migration 014, DDL real via
   `tools/adsentice_migrate_pg.mjs`) — não sobrecarrega `query_vault`; segue padrão
   das migrations (RLS disabled + GRANT service_role; leitura só pelo backend).
3. **Rota única e transparente**: mesma URL serve qualquer versão publicada;
   `?v=N` (admin) inspeciona versões.
4. **Route Handler no lugar de page.tsx**: artefato é documento completo (`<html>`) —
   `Response(html, text/html)` elimina por definição o conflito de layout MUI (causa do
   revert `980f5b4`) e o overhead RSC.
5. **Geração protegida por token** (`x-s10-token` == env `S10_GENERATE_TOKEN`) no endpoint
   POST; o fallback on-miss da view é a válvula pública (custo máx $0.001/geração,
   naturalmente limitado por lead existente no Supabase).

## Consequências

### Positivas
- Primeira view real: **14s → ~0.3-0.6s** (REST + R2, sem BLUE) — sobrevive restart/deploy
- **QG antes do lead**: DeepSeek falhou → não publica → re-tenta; "AGITAR A DOR" nunca chega ao WhatsApp
- **A/B limpo**: variante congelada no artefato → métrica de conversão confiável
- **Audit trail (EVD)**: o que o lead viu, qual copy, qual versão — alimenta o flywheel
  (qual headline converteu → Market Intelligence)
- **TTL 30d alinhado ao funil**: lead requentado ganha raio-X regenerado com dados frescos
- **$0 infra**: R2 free (10 GB ≫ necessidade) + Supabase free + lifecycle nativo

### Negativas
- Artefato é snapshot — reviews de hoje só aparecem na próxima geração (mitigado:
  trigger no re-enrichment; a chave `score_compound` já modela invalidação)
- +1 tabela, +1 caminho de escrita, gestão de versões (~centavos de storage)
- Geração inline no miss ainda custa 14s para o azarado que chega primeiro
  (mitigação futura: batch pre-warm via Worker Cron — ADR-0010 Fase 2)

## Implementação

- [x] `packages/db/supabase/migrations/014_s10_artifacts.sql` — série + índices
- [x] `tools/adsentice_migrate_pg.mjs` — aplicador DDL real (pg direct 5432; substitui
      a limitação do `adsentice_supabase_sql.py`)
- [x] `apps/web/src/lib/s10-artifacts.ts` — `generateS10Artifact()` + `getPublishedS10()`
      (R2 via `@aws-sdk/client-s3` + série via REST service role)
- [x] `apps/web/src/app/s10-raio-x/[place_id]/route.ts` — serve-then-fallback (substitui page.tsx)
- [x] `apps/web/src/app/api/s10-artifacts/route.ts` — POST geração explícita (token)
- [x] `tools/adsentice_r2_lifecycle_setup.mjs` — lifecycle rule s10/ 35d (one-shot)
- [ ] Fase 2: Worker Cron batch pre-warm (leads em campanha) — depende ADR-0010 Fase 2
- [ ] Fase 3: `renderToStaticMarkup(S10RaioXPage)` como renderer da geração (JSX substitui GREEN)

## Prova (medido)

- Probe infra: `node tools/adsentice_s10_infra_probe.mjs` → pg direct OK · R2 roundtrip OK
- Latências v081: cold 11.8-14.7s / quente 0.44s (log dev server, 2026-07-18)
- `query_vault` HTTP 200 · `s10_artifacts` HTTP 404 (pré-migration)
- R2BlobStore vault: `@aws-sdk/client-s3` SigV4 + IfNoneMatch (packages/vault, 6/6 testes)

## Referências
- ADR-0005 (Lead Funnel — ciclo de aquecimento), ADR-0010 (Cloudflare Free Tier),
  ADR-0032 (BLUE/GREEN), ADR-0037 (Convergência Runtime Semântico)
- Doutrina #5 (Vault: R2 blob → Postgres série antes de indexar)
- `HANDOFF-2026-07-18-v081-final-s10-jsx-route-live.md` (arquitetura end-to-end v081)
- <https://developers.cloudflare.com/r2/pricing/> · <https://developers.cloudflare.com/r2/buckets/object-lifecycles/>
