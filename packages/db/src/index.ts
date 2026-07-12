// ══════════════════════════════════════════════════════════════════
// @adsentice/db — Unified Database Layer
// ══════════════════════════════════════════════════════════════════
//
// Usage:
//   import { createDb } from "@adsentice/db"
//   const db = createDb("dev")   // all in-memory, zero setup
//   const db = createDb("prod")  // R2 + Supabase + Qdrant
//
//   await db.cache.set("diagnostic:domain.com", result)
//   const cached = await db.cache.get("diagnostic:domain.com")
//   await db.leads.upsert({ domain: "clinica.com", stage: 3, score: 72 })
//   const hits = await db.search.search("SEO local")
// ══════════════════════════════════════════════════════════════════

export { createDb, getDb, resetDb } from "./client"
export { MemBlobStore } from "./blob"
export { MemSeriesStore } from "./series"
export { MemCacheStore } from "./cache"
export { MemSearchStore } from "./search"
export { MemLeadStore } from "./leads"

export type {
  DbClient,
  DbEnv,
  DbConfig,
  BlobStore,
  SeriesStore,
  VaultRecord,
  CacheStore,
  SearchStore,
  SearchHit,
  LeadStore,
  LeadRecord,
} from "./types"
