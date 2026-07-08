# @adsentice/vault — o cofre durável (write-ahead)

O **Sistema de Registro** do adsentice: guarda o OURO (as queries DataForSEO já pagas · histórico global + por tenant)
de forma durável, **antes** de qualquer índice frágil. Resolve o medo de "perder tudo" separando fonte-da-verdade de índice.

## A lei (write-ahead)

```
vault.put(input) :
  ① blob CRU → R2      (durável · imutável · dedup por blake3 · egress zero)
  ② série    → Postgres (durável · append-only · RLS por tenant)
  ③ [downstream, separado] índice → pgvector/rsxt (DESCARTÁVEL · rebuildável do cofre)
```

Se ① ou ② falharem → **nada é indexado** e o chamador re-tenta. O índice **nunca** vê um dado que o cofre não tem.
O `blake3` é a identidade FÍSICA (dedup do conteúdo); o `id` da série é a identidade LÓGICA (separadas · lei nº1).

## Uso

```ts
import { vaultPut } from "@adsentice/vault";

const record = await vaultPut(
  { tenantId, capabilityId: "gmb.profile.rich", inputHash, raw, parsed, costUsd: 0.02 },
  { blob: r2Store, series: supabaseStore },
);
// record.blake3 = ref do blob no R2 · record.blobDeduped = já existia? · o OURO está salvo.
// depois (downstream, pode falhar sem risco): await derivedIndex.index(record);
```

## Impl das interfaces (v0 managed)
- `BlobStore` → Cloudflare R2 (S3-compat · `@aws-sdk/client-s3` apontado pro endpoint R2).
- `SeriesStore` → Supabase/Postgres (`query_vault` · ver `schema.sql`).
- `DerivedIndex` → pgvector (v0) · rsxt-v0 depois (mesma interface).

## Rodar
```
npm install
npm test        # prova a invariante (3 testes · stores em memória · $0)
npm run typecheck
```

## Schema
`schema.sql` — `query_vault` append-only · RLS por tenant · trigger que PROÍBE update/delete (o ouro é imutável).
