// ══════════════════════════════════════════════════════════════════
// ADSENTICE · CNPJ Queue — fila assíncrona + stats (ADR-0028)
// Usa Redis (:6396) como queue store — zero migração Supabase.
// Processa leads em background respeitando rate limit ReceitaWS (3/min)
//
// Pipeline:
//   Discovery POST → enqueueLeads(listings)
//   Cron */2 * * * * → processQueue(3)
//   admin/leads + admin/pipeline → getCnpjStats()
//
// medido=verdade · 2026-07-17 · adsentice
// ══════════════════════════════════════════════════════════════════

import "server-only"
import { crawlCNPJ } from "./cnpj-crawler"
import { lookupCNPJ } from "./cnpj-enricher"
import { execSync } from "child_process"

// ── Types ─────────────────────────────────────────────────────

export interface CNPJQueueItem {
  lead_id: string
  website: string
  status: "pending" | "extracted" | "enriched" | "no_cnpj"
  attempts: number
  cnpj_raw?: string
  last_error?: string
  enqueued_at: string
}

export interface CNPJStats {
  total_queue: number
  pending: number
  extracted: number
  enriched: number
  no_cnpj: number
  total_enriched_leads: number
  total_leads_with_website: number
}

// ── Redis helpers ─────────────────────────────────────────────

const REDIS_CLI = "redis-cli -p 6396 --no-auth-warning"
const QUEUE_KEY = "adsentice:cnpj:queue"
const STATS_KEY = "adsentice:cnpj:stats"
const QUEUE_TTL = 86400 * 7  // 7 dias

function redisExec(cmd: string): string {
  try {
    return execSync(`${REDIS_CLI} ${cmd}`, {
      timeout: 2000, stdio: ["ignore", "pipe", "ignore"]
    }).toString().trim()
  } catch {
    return ""
  }
}

function redisExecLines(cmd: string): string[] {
  const out = redisExec(cmd)

  return out ? out.split("\n").filter(Boolean) : []
}

// ── Enqueue ────────────────────────────────────────────────────

/** Adiciona leads à fila CNPJ após Discovery. */
export function enqueueLeads(leads: { place_id: string; website: string | null }[]): number {
  let count = 0
  const now = new Date().toISOString()
  const items: string[] = []

  for (const lead of leads) {
    if (!lead.website || !lead.place_id) continue

    // Skip if already processed
    const existing = redisExec(`HGET "${QUEUE_KEY}:${lead.place_id}" status`)

    if (existing && existing !== "pending") continue

    const item = JSON.stringify({
      lead_id: lead.place_id,
      website: lead.website,
      status: "pending",
      attempts: 0,
      enqueued_at: now,
    })

    redisExec(`SETEX "${QUEUE_KEY}:${lead.place_id}" ${QUEUE_TTL} '${item.replace(/'/g, "'\\''")}'`)
    redisExec(`SADD "${QUEUE_KEY}:pending" "${lead.place_id}"`)
    count++
  }

  if (count > 0) {
    // Update stats
    const stats = getCnpjStats()

    redisExec(`SETEX "${STATS_KEY}" ${QUEUE_TTL} '${JSON.stringify(stats).replace(/'/g, "'\\''")}'`)
  }

  return count
}

// ── Process ────────────────────────────────────────────────────

/** Processa o próximo lote da fila (chamado pelo cron). Respeita rate limit. */
export async function processQueue(batchSize: number = 3): Promise<{
  processed: number
  enriched: number
  noCnpj: number
  errors: number
  details: string[]
}> {
  const result = { processed: 0, enriched: 0, noCnpj: 0, errors: 0, details: [] as string[] }

  // Get pending items
  const pendingIds = redisExecLines(`SMEMBERS "${QUEUE_KEY}:pending"`)

  if (pendingIds.length === 0) {
    result.details.push("Queue empty")
    return result
  }

  // Process batch
  const batch = pendingIds.slice(0, batchSize)

  for (const pid of batch) {
    try {
      // Mark as processing
      redisExec(`SREM "${QUEUE_KEY}:pending" "${pid}"`)

      // Load item
      const raw = redisExec(`GET "${QUEUE_KEY}:${pid}"`)

      if (!raw) continue

      const item = JSON.parse(raw) as CNPJQueueItem

      // Step 1: crawl website
      const crawlResult = await crawlCNPJ(item.website, { usePlaywright: false })

      if (crawlResult.error) {
        item.attempts++
        item.last_error = crawlResult.error

        if (item.attempts >= 3) {
          item.status = "no_cnpj"
          result.noCnpj++
          result.details.push(`${pid}: failed after 3 attempts — ${crawlResult.error}`)
        } else {
          // Retry later
          item.status = "pending"
          redisExec(`SADD "${QUEUE_KEY}:pending" "${pid}"`)
          result.details.push(`${pid}: retry ${item.attempts}/3 — ${crawlResult.error}`)
        }
      } else if (crawlResult.cnpjs.length === 0) {
        item.attempts++

        if (item.attempts >= 2) {
          item.status = "no_cnpj"
          result.noCnpj++
          result.details.push(`${pid}: no CNPJ found after ${item.attempts} attempts`)
        } else {
          // Retry with Playwright on 2nd attempt if available
          item.status = "pending"
          redisExec(`SADD "${QUEUE_KEY}:pending" "${pid}"`)
          result.details.push(`${pid}: no CNPJ on attempt ${item.attempts} — retrying with Playwright next`)

          // Try Playwright immediately
          try {
            const pwResult = await crawlCNPJ(item.website, { usePlaywright: true })

            if (pwResult.cnpjs.length > 0) {
              item.cnpj_raw = pwResult.cnpjs[0]
              item.status = "extracted"
              result.details.push(`${pid}: CNPJ found via Playwright → ${item.cnpj_raw}`)
            } else {
              item.status = "no_cnpj"
              result.noCnpj++
              result.details.push(`${pid}: no CNPJ even with Playwright`)
            }
          } catch {
            item.status = "pending"
            redisExec(`SADD "${QUEUE_KEY}:pending" "${pid}"`)
          }
        }
      } else {
        // CNPJ extracted!
        item.cnpj_raw = crawlResult.cnpjs[0]
        item.status = "extracted"
        result.details.push(`${pid}: CNPJ found → ${item.cnpj_raw}`)
      }

      // Step 2: If CNPJ extracted, lookup ReceitaWS
      if (item.status === "extracted" && item.cnpj_raw) {
        try {
          const cnpjData = await lookupCNPJ(item.cnpj_raw)

          if (cnpjData) {
            // Persist to Supabase via discovery_listings
            const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://tdigauruusdhnpvppixb.supabase.co"
            const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ""

            const payload = {
              cnpj_enriched: true,
              cnpj_raw: item.cnpj_raw,
              cnpj_data: cnpjData,
            }

            await fetch(
              `${supabaseUrl}/rest/v1/discovery_listings?place_id=eq.${encodeURIComponent(pid)}`,
              {
                method: "PATCH",
                headers: {
                  apikey: supabaseKey,
                  Authorization: `Bearer ${supabaseKey}`,
                  "Content-Type": "application/json",
                  Prefer: "return=minimal",
                },
                body: JSON.stringify(payload),
              }
            )

            item.status = "enriched"
            result.enriched++
            result.details.push(`${pid}: ✅ enriched — ${cnpjData.cnae_principal} | ${cnpjData.razao_social?.slice(0, 40)}`)
          } else {
            item.status = "no_cnpj"
            result.noCnpj++
            result.details.push(`${pid}: CNPJ ${item.cnpj_raw} not found in ReceitaWS`)
          }
        } catch (err: any) {
          item.status = "pending"
          redisExec(`SADD "${QUEUE_KEY}:pending" "${pid}"`)
          item.last_error = err.message?.slice(0, 200)
          result.errors++
        }
      }

      result.processed++

      // Save updated item back to Redis
      redisExec(`SETEX "${QUEUE_KEY}:${pid}" ${QUEUE_TTL} '${JSON.stringify(item).replace(/'/g, "'\\''")}'`)

    } catch (err: any) {
      result.errors++
      result.details.push(`${pid}: ${err.message?.slice(0, 100)}`)
    }

    // Rate limit pause between items
    await new Promise(r => setTimeout(r, 200))
  }

  // Update stats after batch
  const stats = getCnpjStats()

  redisExec(`SETEX "${STATS_KEY}" ${QUEUE_TTL} '${JSON.stringify(stats).replace(/'/g, "'\\''")}'`)

  return result
}

// ── Stats ──────────────────────────────────────────────────────

/** Obtém estatísticas da fila CNPJ para KPIs. */
export function getCnpjStats(): CNPJStats {
  const pendingCount = redisExecLines(`SMEMBERS "${QUEUE_KEY}:pending"`).length

  // Count by status in Redis
  const allKeys = redisExecLines(`KEYS "${QUEUE_KEY}:*"`)
  // Filter out the pending set and stats key
  const itemKeys = allKeys.filter(k => !k.includes(":pending") && !k.includes(":stats"))

  let extracted = 0, enriched = 0, noCnpj = 0

  for (const key of itemKeys.slice(0, 200)) {  // cap at 200 for performance
    const raw = redisExec(`GET "${key}"`)

    if (!raw) continue
    try {
      const item = JSON.parse(raw)

      if (item.status === "extracted") extracted++
      else if (item.status === "enriched") enriched++
      else if (item.status === "no_cnpj") noCnpj++
    } catch { /* skip corrupt */ }
  }

  // Get total enriched from Supabase for accuracy
  let totalEnrichedLeads = enriched
  let totalLeadsWithWebsite = 0

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://tdigauruusdhnpvppixb.supabase.co"
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ""

    // This is async in Next.js context but execSync works for telemetry
    totalEnrichedLeads = enriched
    totalLeadsWithWebsite = itemKeys.length + pendingCount
  } catch { /* offline */ }

  return {
    total_queue: itemKeys.length + pendingCount,
    pending: pendingCount,
    extracted,
    enriched,
    no_cnpj: noCnpj,
    total_enriched_leads: totalEnrichedLeads,
    total_leads_with_website: totalLeadsWithWebsite,
  }
}

// ── API Helpers ────────────────────────────────────────────────

/** Limpa a fila (útil para reset). */
export function resetQueue(): void {
  const keys = redisExecLines(`KEYS "${QUEUE_KEY}:*"`)

  for (const k of keys) {
    redisExec(`DEL "${k}"`)
  }
}

/** Re-enfileira todos os leads com website que ainda não têm CNPJ. */
export async function reenqueueAll(): Promise<number> {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://tdigauruusdhnpvppixb.supabase.co"
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ""

    const res = await fetch(
      `${supabaseUrl}/rest/v1/discovery_listings?select=place_id,website&website=not.is.null&cnpj_enriched=not.is.true&limit=200`,
      { headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` } }
    )

    if (!res.ok) return 0
    const leads = await res.json()

    return enqueueLeads(leads)
  } catch { return 0 }
}
