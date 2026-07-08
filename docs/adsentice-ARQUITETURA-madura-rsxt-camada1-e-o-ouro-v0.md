# adsentice · Arquitetura madura — reusar rsxt/EVO-API como Camada 1, mas o OURO num cofre durável

> O founder: "não jogar fora meses de tecnologia que funciona, MAS com maturidade — containers de segurança pra não
> perder tudo, e os dados de consulta DataForSEO já pagos (histórico global + por tenant, estilo hold-trading) são OURO
> a guardar. Estou com MEDO do store do rsxt/EVO-API." Este doc resolve o medo.

## O princípio que mata o medo (a lei nº1)

> **Sistema de Registro (durável, chato, com backup) ≠ Índice Derivado (rsxt/vec, descartável, rebuildável).**

- O **OURO** — cada resposta de query DataForSEO já paga (histórico global + série por tenant) — mora no **Sistema de
  Registro durável** (Postgres/Supabase + R2). Append-only (hold-trading · nunca sobrescreve). Com backup. **Fonte da verdade.**
- O **rsxt-v0 / pgvector** vira só um **índice DERIVADO** — reconstruível 100% a partir do Sistema de Registro. Se ele
  corromper (como a poluição de 11k que vivemos), **você apaga e reconstrói. Zero dado perdido.** O medo do store do rsxt
  some porque ele **deixa de guardar a verdade** — só guarda uma cópia de busca.

O que quebrou o EVO-API: o `~/.cache/evoapi-self` era AO MESMO TEMPO fonte-da-verdade e índice. Corromperam juntos.
Aqui: separados. O rsxt pode explodir à vontade.

## A arquitetura (reconciliada · reusa o que funciona)

```
   adsentice stack (Vercel · Cloudflare · Supabase)          ← o produto do dinheiro
        │  solicitação (HTTPS · atrás da Cloudflare)
   ┌────┴───────────────────────────────────────────┐
   │  [CONTAINER isolado] EVO-API/rsxt = CAMADA 1     │      ← os meses de tech que FUNCIONAM
   │  executa DataForSEO (73 caps · cost-gate ·        │        (Docker · restartável · sem estado crítico dentro)
   │  Evidence · Billing 1:1)                          │
   └────┬───────────────────────────────────────────┘
        │  ① WRITE-AHEAD: grava o OURO ANTES de indexar
        ▼
   COFRE DURÁVEL (o Sistema de Registro · o OURO):
   · Supabase Postgres → metadados + SÉRIE por tenant + histórico global (hold-trading · append-only · backup diário)
   · Cloudflare R2     → o JSON CRU de cada query (blake3-dedup · imutável · versionado)
        │
        ▼  ② indexa (derivado · pode explodir · rebuildável do cofre)
   rsxt-v0 / pgvector  → busca semântica
```

**A ordem é inviolável (write-ahead):** toda query paga → grava no cofre durável PRIMEIRO → só depois indexa no rsxt.
Nunca o contrário. Assim o índice pode falhar/corromper sem NUNCA perder o dado pago.

## Os "containers de segurança" (o que o founder pediu · concreto)

1. **Isolamento (Docker):** o EVO-API/rsxt roda em container isolado — só executa e devolve. Reiniciável. Se morrer,
   sobe de novo sem perder nada (o estado crítico não vive dentro dele).
2. **Durabilidade (cofre managed):** Supabase (Postgres com PITR/backup) + R2 (11 noves de durabilidade · versionado).
   O OURO tem backup automático — não depende de disco local, de inode, de mmap frágil.
3. **Imutabilidade (append-only):** o histórico DataForSEO é série que só CRESCE (hold-trading · [[hold-trading-frame-dual-dimensional]]
   · [[nenhum-dado-perdido-persist-soberano-dual]]). Nunca update destrutivo. Dado pago = ativo que acumula valor.
4. **Dedup por blake3:** a mesma query nunca paga 2× nem duplica no cofre (o blake3 vira chave · UPSERT, não append cego).

## Por que os dados DataForSEO são OURO (o founder está certo)

- **Créditos são escassos** ([[creds-live-escassos-sandbox-only-diferir-live]]) — cada query LIVE custou dinheiro real.
- **Histórico global** (a mesma ficha/keyword ao longo do tempo) = dado que ninguém mais tem = MOAT.
- **Por tenant** (as análises de cada cliente do adsentice) = a base do relacionamento + retenção.
- Guardá-lo durável = transformar gasto em ATIVO. Perdê-lo = pagar de novo. Por isso o cofre, não o store frágil.

## O que muda no plano (vs os docs anteriores)

- O **BLUEPRINT** (`rsxt-platform-BLUEPRINT-v0.md`) dizia "rsxt = driver opcional depois". Refino: **rsxt entra JÁ, como
  Camada 1 de execução (containerizada)** — mas NUNCA como sistema-de-registro. Reusa o que funciona, sem o risco.
- O **MANAGER** (`adsentice-MANAGER-metamodelo-v0.md`) ganha a regra: `artifacts` (o cofre R2+Postgres) é a fonte;
  `embeddings`/rsxt é índice derivado. Já estava certo — só reforça o write-ahead.

## Decisão pra fechar

Confirma este desenho? Se sim, a 1ª pedra vira: **o cofre durável + o write-ahead** (Supabase + R2 + o contrato "grava
o ouro antes de indexar"), com o EVO-API/rsxt containerizado como Camada 1. É o que te dá segurança pra reusar a tech
sem medo de perder o ouro.
