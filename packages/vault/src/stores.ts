// adsentice · vault — as INTERFACES de store (o desacoplamento do blueprint).
// O cofre não conhece R2 nem Supabase diretamente — só estas interfaces. Trocar a impl (ou plugar rsxt
// como índice depois) não toca o contrato vault.put().

import type { VaultRecord } from "./types.js";

/** O armazém de BLOBS crus imutáveis (impl v0: Cloudflare R2 · S3-compat · egress zero). */
export interface BlobStore {
  /** true se a chave já existe (dedup — não regravar nem repagar). */
  has(key: string): Promise<boolean>;
  /** grava imutável. Idempotente: se já existe, no-op. */
  put(key: string, body: string, opts?: { immutable?: boolean }): Promise<void>;
  /** lê o blob cru (pra rebuild do índice a partir do ouro). */
  get(key: string): Promise<string | null>;
}

/** A SÉRIE durável append-only (impl v0: Supabase/Postgres · query_vault · RLS por tenant). */
export interface SeriesStore {
  /** APPEND (nunca update). Retorna a linha gravada. */
  append(row: Omit<VaultRecord, "id" | "ranAt" | "blobDeduped">): Promise<Pick<VaultRecord, "id" | "ranAt">>;
}

/** O ÍNDICE derivado (impl: pgvector v0 · rsxt-v0 depois). É DESCARTÁVEL — rebuildável do BlobStore+SeriesStore.
 *  NÃO faz parte do write-ahead: indexar é downstream e pode falhar sem perder o ouro. */
export interface DerivedIndex {
  index(record: VaultRecord): Promise<void>;
}
