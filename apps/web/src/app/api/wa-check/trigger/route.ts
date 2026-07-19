// ══════════════════════════════════════════════════════════════════
// ADSENTICE · Wa-Check Trigger — sistema de fila inteligente (v130)
// Processa TODOS os pendentes em lotes com rate limit.
// Auto-reinvoca até zerar. Progresso via Redis.
// medido=verdade · $0 · 2026-07-19
// ══════════════════════════════════════════════════════════════════

import { NextResponse } from 'next/server'
import { execSync } from 'child_process'
import { checkWhatsapp, checkWhatsappBaileys, type WaCheckResult } from '@/lib/wa-check'

// ═══ Config ═══
const BATCH_SIZE = 15        // wa.me rate limit amigável (paralelo)
const L3_BATCH = 100         // Evolution API /check-batch (única chamada)
const PAGE_SIZE = 200        // Supabase REST LIMIT por página
const DELAY_BATCH_MS = 800   // delay entre lotes de 15
const DELAY_PAGE_MS = 2000   // delay entre páginas de 200

// ═══ Redis helpers ═══
function redisRaw(cmd: string): string | null {
  try { return execSync(`redis-cli -p 6396 --no-auth-warning ${cmd}`, { encoding: 'utf-8', timeout: 2000 }).trim() || null } catch { return null }
}
function redisSet(key: string, value: string, ttl?: number) {
  const safe = value.replace(/'/g, "'\\''")
  try { execSync(`redis-cli -p 6396 --no-auth-warning ${ttl ? `SETEX ${key} ${ttl} '${safe}'` : `SET ${key} '${safe}'`}`, { encoding: 'utf-8', timeout: 2000 }) } catch { /* ok */ }
}

// ═══ Persistência Supabase ═══
const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://tdigauruusdhnpvppixb.supabase.co"
const SUPA_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""

async function persistResults(results: Record<string, WaCheckResult & { baileysExists?: boolean }>) {
  const patches = Object.entries(results)
    .filter(([, r]) => r.checked)
    .map(([phone, r]) => ({
      phone, wa_checked: true, wa_has_whatsapp: r.hasWhatsapp,
      wa_is_business: r.isBusiness, wa_display_name: r.displayName,
      wa_verified_at: new Date().toISOString(),
    }))
  if (!patches.length) return

  await Promise.allSettled(patches.map(p =>
    fetch(`${SUPA_URL}/rest/v1/discovery_listings?phone=eq.${encodeURIComponent(p.phone)}`, {
      method: "PATCH",
      headers: { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}`, "Content-Type": "application/json", Prefer: "return=minimal" },
      body: JSON.stringify(p),
      signal: AbortSignal.timeout(5000),
    }).catch(() => null)
  ))
}

// ═══ Core: processa 1 lote de phones ═══
async function processBatch(phones: string[]) {
  const unique = [...new Set(phones)]
  const results: Record<string, WaCheckResult & { baileysExists?: boolean }> = {}
  let business = 0, personal = 0, notFound = 0, errors = 0

  for (let i = 0; i < unique.length; i += BATCH_SIZE) {
    const batch = unique.slice(i, i + BATCH_SIZE)

    // Camada 2: wa.me (paralelo, 15 concorrentes)
    const l2Results = await Promise.all(batch.map(async (phone) => {
      try { return { phone, result: await checkWhatsapp(phone) } }
      catch { return { phone, result: { hasWhatsapp: false, displayName: null, isBusiness: false, checked: false } as WaCheckResult } }
    }))

    // Camada 3: Evolution API para os "Share on WhatsApp"
    const needL3 = l2Results.filter(({ result }) => result.checked && !result.isBusiness && !result.hasWhatsapp)
    const l3Map = new Map<string, boolean>()
    if (needL3.length > 0) {
      const l3Results = await Promise.all(needL3.map(async ({ phone }) => {
        const r = await checkWhatsappBaileys(phone)
        return { phone, existe: r?.existe ?? false }
      }))
      for (const { phone, existe } of l3Results) l3Map.set(phone, existe)
    }

    // Classifica
    for (const { phone, result } of l2Results) {
      if (!result.checked) { errors++; results[phone] = result; continue }
      if (result.isBusiness) { business++; results[phone] = result; continue }
      if (result.hasWhatsapp) { personal++; results[phone] = result; continue }

      const existe = l3Map.get(phone)
      if (existe === true) {
        personal++; results[phone] = { hasWhatsapp: true, displayName: null, isBusiness: false, checked: true, baileysExists: true }
      } else if (existe === false) {
        notFound++; results[phone] = { hasWhatsapp: false, displayName: null, isBusiness: false, checked: true, baileysExists: false }
      } else {
        errors++; results[phone] = { hasWhatsapp: false, displayName: null, isBusiness: false, checked: false }
      }
    }

    if (i + BATCH_SIZE < unique.length) {
      await new Promise(r => setTimeout(r, DELAY_BATCH_MS))
    }
  }

  return { results, business, personal, notFound, errors }
}

// ═══ POST /api/wa-check/trigger ═══
export async function POST(request: Request) {
  const t0 = Date.now()
  try {
    const body = await request.json().catch(() => ({})) as {
      phones?: string[]; city?: string; category?: string; page?: number
    }
    const page = body.page || 0

    // ── Coleta phones desta página ──
    let phones: string[] = body.phones || []
    if (!phones.length) {
      // Count total pendentes primeiro
      const countRes = await fetch(
        `${SUPA_URL}/rest/v1/discovery_listings?select=place_id&phone=not.is.null&wa_checked=not.is.true&limit=1`,
        { headers: { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}`, ...{ Prefer: 'count=exact' } as any } },
      )
      const contentRange = countRes.headers.get('content-range')
      const totalPending = contentRange ? parseInt(contentRange.split('/')[1]) : 0

      if (page === 0) {
        // Primeira página — inicializa progresso no Redis
        redisSet('adsentice:wa-check:progress', JSON.stringify({
          total: totalPending,
          processed: 0,
          startedAt: new Date().toISOString(),
          status: 'running',
        }), 3600)
      }

      if (totalPending === 0) {
        redisSet('adsentice:wa-check:progress', JSON.stringify({ total: 0, processed: 0, status: 'done' }), 3600)
        return NextResponse.json({ done: true, total: 0, message: 'Nenhum phone pendente.' })
      }

      // Busca página atual
      const offset = page * PAGE_SIZE
      const res = await fetch(
        `${SUPA_URL}/rest/v1/discovery_listings?select=phone&phone=not.is.null&wa_checked=not.is.true&order=created_at.desc&limit=${PAGE_SIZE}&offset=${offset}`,
        { headers: { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}` }, signal: AbortSignal.timeout(5000) },
      )
      if (!res.ok) {
        return NextResponse.json({ error: `Supabase ${res.status}` }, { status: 502 })
      }
      const rows = await res.json() as any[]
      phones = [...new Set(rows.map((r: any) => r.phone).filter(Boolean))]
    }

    if (!phones.length) {
      redisSet('adsentice:wa-check:progress', JSON.stringify({ total: 0, processed: 0, status: 'done' }), 3600)
      return NextResponse.json({ done: true, total: 0, message: 'Todos os phones verificados.' })
    }

    // ── Processa este lote ──
    const { results, business, personal, notFound, errors } = await processBatch(phones)
    const total = business + personal + notFound + errors
    const latency = Date.now() - t0

    // ── Persiste Supabase ──
    await persistResults(results)

    // ── Atualiza histórico Redis ──
    const historyRaw = redisRaw('GET adsentice:wa-check:history')
    const history: any[] = historyRaw ? JSON.parse(historyRaw) : []
    const baileysConfirmed = Object.values(results).filter((r: any) => r.baileysExists === true).length
    const baileysNotFound = Object.values(results).filter((r: any) => r.baileysExists === false).length
    history.unshift({
      ts: new Date().toISOString(), total, business, personal, notFound, errors,
      baileysConfirmed, baileysNotFound, latencyMs: latency, page,
      sampleBusiness: Object.entries(results).filter(([, r]) => r.isBusiness && r.displayName).slice(0, 5).map(([p, r]) => ({ phone: p, name: r.displayName })),
    })
    redisSet('adsentice:wa-check:history', JSON.stringify(history.slice(0, 50)), 86400 * 30)
    redisSet('adsentice:wa-check:last_run', new Date().toISOString(), 86400 * 30)

    // ── Atualiza progresso ──
    const progressRaw = redisRaw('GET adsentice:wa-check:progress')
    const progress = progressRaw ? JSON.parse(progressRaw) : { total: 0, processed: 0 }
    progress.processed += total
    redisSet('adsentice:wa-check:progress', JSON.stringify(progress), 3600)

    // ── Verifica se tem mais pendentes ──
    const remainingRes = await fetch(
      `${SUPA_URL}/rest/v1/discovery_listings?select=place_id&phone=not.is.null&wa_checked=not.is.true&limit=1`,
      { headers: { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}`, ...{ Prefer: 'count=exact' } as any } },
    )
    const remainingRange = remainingRes.headers.get('content-range')
    const remaining = remainingRange ? parseInt(remainingRange.split('/')[1]) : 0
    const nextPage = page + 1
    const hasMore = remaining > 0

    // ── Auto-reinvoca próximo lote (fire-and-forget) ──
    if (hasMore && !body.phones) {
      await new Promise(r => setTimeout(r, DELAY_PAGE_MS))
      fetch(`${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/api/wa-check/trigger`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ page: nextPage }),
      }).catch(() => {})
    } else if (!hasMore) {
      progress.status = 'done'
      progress.completedAt = new Date().toISOString()
      redisSet('adsentice:wa-check:progress', JSON.stringify(progress), 3600)
    }

    return NextResponse.json({
      page, hasMore, nextPage, remaining,
      entry: history[0],
      stats: { total, business, personal, notFound, errors, baileysConfirmed, baileysNotFound, businessRate: total > 0 ? Math.round((business / total) * 100) : 0 },
      progress,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message?.slice(0, 200) }, { status: 500 })
  }
}

// ═══ GET /api/wa-check/trigger — progresso da fila ═══
export async function GET() {
  const progressRaw = redisRaw('GET adsentice:wa-check:progress')
  const progress = progressRaw ? JSON.parse(progressRaw) : { total: 0, processed: 0, status: 'idle' }
  return NextResponse.json(progress)
}
