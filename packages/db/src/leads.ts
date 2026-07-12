// ══════════════════════════════════════════════════════════════════
// ADSENTICE · DB Lead Store — CRM pipeline Stage 0→7
// Dev: in-memory · Prod: Supabase (leads table)
// ══════════════════════════════════════════════════════════════════

import type { LeadStore, LeadRecord } from "./types"

// ── In-Memory (dev) ──────────────────────────────────────────

export class MemLeadStore implements LeadStore {
  private leads = new Map<string, LeadRecord>()

  async find(domain: string): Promise<LeadRecord | null> {
    return this.leads.get(domain.toLowerCase()) ?? null
  }

  async list(params: {
    stage?: number
    priority?: string
    limit?: number
  }): Promise<LeadRecord[]> {
    let result = [...this.leads.values()]
    if (params.stage !== undefined) result = result.filter((l) => l.stage === params.stage)
    if (params.priority) result = result.filter((l) => l.priority === params.priority)
    result.sort((a, b) => (b.score || 0) - (a.score || 0))
    return result.slice(0, params.limit || 50)
  }

  async upsert(lead: Partial<LeadRecord> & { domain: string }): Promise<LeadRecord> {
    const key = lead.domain.toLowerCase()
    const existing = this.leads.get(key)
    const now = new Date().toISOString()
    const record: LeadRecord = {
      id: existing?.id || `lead_${this.leads.size}`,
      domain: lead.domain,
      businessName: lead.businessName ?? existing?.businessName ?? null,
      category: lead.category ?? existing?.category ?? null,
      city: lead.city ?? existing?.city ?? null,
      stage: lead.stage ?? existing?.stage ?? 1,
      score: lead.score ?? existing?.score ?? null,
      priority: lead.priority ?? existing?.priority ?? null,
      signals: lead.signals ?? existing?.signals ?? {},
      diagnostic: lead.diagnostic ?? existing?.diagnostic ?? {},
      contactStatus: lead.contactStatus ?? existing?.contactStatus ?? "new",
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    }
    this.leads.set(key, record)
    return record
  }

  async updateStage(domain: string, stage: number): Promise<void> {
    const lead = this.leads.get(domain.toLowerCase())
    if (lead) {
      lead.stage = stage
      lead.updatedAt = new Date().toISOString()
    }
  }

  get size(): number {
    return this.leads.size
  }
}

// ── Factory ──────────────────────────────────────────────────

export function createLeadStore(env: "dev" | "prod", _config?: Record<string, string>): LeadStore {
  return new MemLeadStore()
  // Future: SupabaseLeadStore with RLS
}
