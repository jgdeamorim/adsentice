// ══════════════════════════════════════════════════════════════════
// ADSENTICE · DB Types — contratos de storage unificados
// Dev: in-memory · Prod: R2 + Supabase + Qdrant
// ══════════════════════════════════════════════════════════════════

// ── Blob Store ────────────────────────────────────────────────
export interface BlobStore {
  has(key: string): Promise<boolean>
  put(key: string, body: string): Promise<void>
  get(key: string): Promise<string | null>
}

// ── Series Store ───────────────────────────────────────────────
export interface VaultRecord {
  id: string
  tenantId: string
  capabilityId: string
  inputHash: string
  blake3: string
  parsed: unknown
  costUsd: number
  provider: string
  mode: string
  status: string
  ranAt: string
  blobDeduped: boolean
}

export interface SeriesStore {
  append(row: {
    tenantId: string
    capabilityId: string
    inputHash: string
    blake3: string
    parsed: unknown
    costUsd: number
    provider: string
    mode: string
    status: string
  }): Promise<{ id: string; ranAt: string }>
  query(params: { tenantId?: string; capabilityId?: string; limit?: number }): Promise<VaultRecord[]>
}

// ── Cache Store ────────────────────────────────────────────────
export interface CacheEntry<T = unknown> {
  value: T
  storedAt: number
  ttlMs: number
}

export interface CacheStore {
  get<T>(key: string): Promise<T | null>
  set<T>(key: string, value: T, ttlMs?: number): Promise<void>
  has(key: string): Promise<boolean>
  delete(key: string): Promise<void>
  stats(): Promise<{ size: number; hitRate: number }>
}

// ── Search Store ───────────────────────────────────────────────
export interface SearchHit {
  source: string
  kind: string
  content: string
  score: number
}

export interface SearchStore {
  search(query: string, limit?: number): Promise<SearchHit[]>
  upsert(points: Array<{ id: string; vector: number[]; payload: Record<string, unknown> }>): Promise<void>
  count(): Promise<number>
}

// ── Lead Store ─────────────────────────────────────────────────
export interface LeadRecord {
  id: string
  domain: string
  businessName: string | null
  category: string | null
  city: string | null
  stage: number          // 1→7
  score: number | null
  priority: "urgent" | "hot" | "cold" | null
  signals: unknown
  diagnostic: unknown
  contactStatus: string
  createdAt: string
  updatedAt: string
}

export interface LeadStore {
  find(domain: string): Promise<LeadRecord | null>
  list(params: { stage?: number; priority?: string; limit?: number }): Promise<LeadRecord[]>
  upsert(lead: Partial<LeadRecord> & { domain: string }): Promise<LeadRecord>
  updateStage(domain: string, stage: number): Promise<void>
}

// ── Unified DB Client ──────────────────────────────────────────
export interface DbClient {
  blob: BlobStore
  series: SeriesStore
  cache: CacheStore
  search: SearchStore
  leads: LeadStore
  health(): Promise<Record<string, string>>
}

// ── Environment ────────────────────────────────────────────────
export type DbEnv = "dev" | "prod"

export interface DbConfig {
  env: DbEnv
  // Prod-only
  supabaseUrl?: string
  supabaseKey?: string
  r2AccountId?: string
  r2AccessKey?: string
  r2SecretKey?: string
  r2Bucket?: string
  qdrantUrl?: string
}
