// ══════════════════════════════════════════════════════════════════
// ADSENTICE · DB Client — unified database layer
// import { createDb } from "@adsentice/db"
// const db = createDb("dev")  // zero setup, all in-memory
// const db = createDb("prod") // R2 + Supabase + Qdrant + Redis
// ══════════════════════════════════════════════════════════════════

import type { DbClient, DbEnv } from "./types"
import { createBlobStore } from "./blob"
import { createSeriesStore } from "./series"
import { createCacheStore } from "./cache"
import { createSearchStore } from "./search"
import { createLeadStore } from "./leads"

// ── Singleton ─────────────────────────────────────────────────

let _db: DbClient | null = null

export function createDb(env: DbEnv = "dev", config?: Record<string, string>): DbClient {
  if (_db) return _db

  const blob = createBlobStore(env, config)
  const series = createSeriesStore(env, config)
  const cache = createCacheStore()
  const search = createSearchStore(env, config)
  const leads = createLeadStore(env, config)

  _db = {
    blob,
    series,
    cache,
    search,
    leads,

    async health() {
      const status: Record<string, string> = {}
      status.env = env
      status.blob = blob instanceof (await import("./blob")).MemBlobStore ? "memory" : "R2"
      status.series = series instanceof (await import("./series")).MemSeriesStore ? "memory" : "Supabase"
      status.cache = "memory"
      status.search = "memory"
      status.leads = "memory"
      status.cache_hit_rate = String((await cache.stats()).hitRate)
      return status
    },
  }

  return _db
}

export function getDb(): DbClient {
  if (!_db) throw new Error("DB não inicializado. Chame createDb() primeiro.")
  return _db
}

export function resetDb(): void {
  _db = null
}
