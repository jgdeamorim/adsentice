// ══════════════════════════════════════════════════════════════════
// ADSENTICE · DB Series Store — Dev (in-memory) · Prod (Supabase)
// ══════════════════════════════════════════════════════════════════

import type { SeriesStore, VaultRecord } from "./types"

// ── In-Memory (dev) ──────────────────────────────────────────

export class MemSeriesStore implements SeriesStore {
  private rows: VaultRecord[] = []

  async append(row: {
    tenantId: string
    capabilityId: string
    inputHash: string
    blake3: string
    parsed: unknown
    costUsd: number
    provider: string
    mode: string
    status: string
  }): Promise<{ id: string; ranAt: string }> {
    const id = `mem_${this.rows.length}`
    const ranAt = new Date().toISOString()
    this.rows.push({ id, ranAt, blobDeduped: false, ...row })
    return { id, ranAt }
  }

  async query(params: {
    tenantId?: string
    capabilityId?: string
    limit?: number
  }): Promise<VaultRecord[]> {
    let result = this.rows
    if (params.tenantId) result = result.filter((r) => r.tenantId === params.tenantId)
    if (params.capabilityId) result = result.filter((r) => r.capabilityId === params.capabilityId)
    return result.slice(-(params.limit || 50))
  }

  get length(): number {
    return this.rows.length
  }
}

// ── Factory ──────────────────────────────────────────────────

export function createSeriesStore(env: "dev" | "prod", config?: Record<string, string>): SeriesStore {
  if (env === "dev") {
    return new MemSeriesStore()
  }

  try {
    const { SupabaseSeriesStore } = require("@adsentice/vault/src/impl/supabase-series-store") as typeof import("@adsentice/vault/src/impl/supabase-series-store")
    return SupabaseSeriesStore.fromEnv()
  } catch {
    console.warn("[adsentice-db] Supabase config ausente — usando series em memória (dev mode)")
    return new MemSeriesStore()
  }
}
