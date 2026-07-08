// adsentice · @adsentice/vault — o cofre durável (write-ahead)
export { vaultPut, canonicalJson, blake3Hex } from "./vault.js";
export type { BlobStore, SeriesStore, DerivedIndex } from "./stores.js";
export type { VaultInput, VaultRecord } from "./types.js";
// impls concretas (managed v0)
export { R2BlobStore, type R2Config } from "./impl/r2-blob-store.js";
export { SupabaseSeriesStore } from "./impl/supabase-series-store.js";
// executor + porta REST + translators
export {
  CapabilityExecutor,
  type ProviderPort,
  type Translator,
  type ExecuteRequest,
  type ExecuteResult,
  type ExecutorDeps,
} from "./executor/capability-executor.js";
export { handleCapabilityRest, type RestRequestBody, type RestResponse } from "./executor/rest.js";
export { translators } from "./translators.js";
export { loadSupabaseSecrets, type SupabaseSecrets } from "./config/supabase-secrets.js";
export { loadR2Config } from "./config/r2-secrets.js";
export { translateGmbProfile, type GmbProfile } from "./gmb/translate.js";
