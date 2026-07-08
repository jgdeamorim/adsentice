// adsentice · @adsentice/vault — o cofre durável (write-ahead)
export { vaultPut, canonicalJson, blake3Hex } from "./vault.js";
export type { BlobStore, SeriesStore, DerivedIndex } from "./stores.js";
export type { VaultInput, VaultRecord } from "./types.js";
// impls concretas (managed v0)
export { R2BlobStore, type R2Config } from "./impl/r2-blob-store.js";
export { SupabaseSeriesStore } from "./impl/supabase-series-store.js";
