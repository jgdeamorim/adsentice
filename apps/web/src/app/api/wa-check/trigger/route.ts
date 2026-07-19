// ══════════════════════════════════════════════════════════════════
// ADSENTICE · Wa-Check Trigger — fila inteligente c/ padrão humano (v131)
// - Modo manual: processa todos pendentes em páginas
// - Modo auto:   processa 50 por vez, 20-60min entre lotes
// - Time gate:   pausa 23:30-06:00 BRT (horário de Brasília)
// - Auto-resume: 06:00 BRT
// medido=verdade · $0 · 2026-07-19
// ══════════════════════════════════════════════════════════════════

import { NextResponse } from 'next/server'
import { execSync } from 'child_process'
import { checkWhatsapp, checkWhatsappBaileys, type WaCheckResult } from '@/lib/wa-check'

const AUTO_BATCH_SIZE = 500    // phones por execução automática (250-500 a cada 20-60min)
const MIN_RESUME_MIN = 20      // delay mínimo entre lotes (minutos)
const MAX_RESUME_MIN = 60      // delay máximo entre lotes (minutos)
const PAUSE_START_HOUR = 23.5  // 23:30 BRT
const PAUSE_END_HOUR = 6       // 06:00 BRT
const PAGE_SIZE = 200
const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://tdigauruusdhnpvppixb.supabase.co"
const SUPA_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ""

// ═══ Helpers ═══
function redisRaw(cmd: string): string | null {
  try { return execSync(`redis-cli -p 6396 --no-auth-warning ${cmd}`, { encoding: 'utf-8', timeout: 2000 }).trim() || null } catch { return null }
}
function redisSet(key: string, value: string, ttl?: number) {
  const safe = value.replace(/'/g, "'\\''")
  try { execSync(`redis-cli -p 6396 --no-auth-warning ${ttl ? `SETEX ${key} ${ttl} '${safe}'` : `SET ${key} '${safe}'`}`, { encoding: 'utf-8', timeout: 2000 }) } catch { /* ok */ }
}

/** Horário de Brasília (UTC-3) */
function brtHour(): number {
  const now = new Date()
  const utc = now.getUTCHours() + now.getUTCMinutes() / 60
  return (utc - 3 + 24) % 24
}

/** true se entre 23:30 e 06:00 BRT — horário de pausa */
function isPauseWindow(): boolean {
  const h = brtHour()
  return h >= PAUSE_START_HOUR || h < PAUSE_END_HOUR
}

/** Próximo horário de execução (06:00 BRT se em pausa, ou 20-60min a partir de agora) */
function nextResumeMin(): number {
  if (isPauseWindow()) {
    // Calcula minutos até 06:00 BRT
    const now = new Date()
    const utcMin = now.getUTCHours() * 60 + now.getUTCMinutes()
    const targetUtcMin = (PAUSE_END_HOUR + 3) * 60 // 06:00 BRT = 09:00 UTC
    let diff = targetUtcMin - utcMin
    if (diff <= 0) diff += 24 * 60
    return diff
  }
  return MIN_RESUME_MIN + Math.floor(Math.random() * (MAX_RESUME_MIN - MIN_RESUME_MIN))
}

// ═══ Padrão humano: batch alternado ═══
let batchToggle = false
function batchSize(): number { batchToggle = !batchToggle; return batchToggle ? 10 : 5 }
let delayToggle = false
function batchDelay(): number { delayToggle = !delayToggle; return delayToggle ? 3000 : 2000 }

// ═══ Processa phones — Camada 3 PRIMEIRO (evita rate limit wa.me) ═══
async function processPhones(phones: string[]) {
  const unique = [...new Set(phones)]
  const results: Record<string, WaCheckResult & { baileysExists?: boolean }> = {}
  let business = 0, personal = 0, notFound = 0, errors = 0

  // ── Camada 3: Evolution API batch (1 chamada, sem rate limit) ──
  const l3Map = new Map<string, boolean>()
  for (let i = 0; i < unique.length; i += 200) {
    const batch = unique.slice(i, i + 200)
    const l3Results = await Promise.all(batch.map(async (phone) => {
      const r = await checkWhatsappBaileys(phone)
      return { phone, existe: r?.existe ?? false }
    }))
    for (const { phone, existe } of l3Results) l3Map.set(phone, existe)
    if (i + 200 < unique.length) await new Promise(r => setTimeout(r, 2000))
  }

  // ── Camada 2: wa.me SÓ nos que existem (pra nome Business) ──
  //   Em lotes pequenos (5-10) com delay humano → sem bloqueio
  const toCheck = unique.filter(p => l3Map.get(p) === true)
  let i = 0
  while (i < toCheck.length) {
    const bs = batchSize()
    const batch = toCheck.slice(i, i + bs)
    i += bs

    const l2Results = await Promise.all(batch.map(async (phone) => {
      try { return { phone, result: await checkWhatsapp(phone) } }
      catch { return { phone, result: { hasWhatsapp: false, displayName: null, isBusiness: false, checked: false } as WaCheckResult } }
    }))

    for (const { phone, result } of l2Results) {
      if (result.isBusiness) { business++; results[phone] = result; continue }
      if (result.hasWhatsapp) { personal++; results[phone] = result; continue }
      // wa.me não retornou nome → mas Evolution API confirmou que existe
      personal++; results[phone] = { hasWhatsapp: true, displayName: null, isBusiness: false, checked: true, baileysExists: true }
    }

    if (i < toCheck.length) { await new Promise(r => setTimeout(r, batchDelay())) }
  }

  // ── Phones que NÃO existem (Evolution API confirmou) ──
  for (const phone of unique) {
    if (results[phone]) continue // já classificado
    const existe = l3Map.get(phone)
    if (existe === false) {
      notFound++
      results[phone] = { hasWhatsapp: false, displayName: null, isBusiness: false, checked: true, baileysExists: false }
    } else if (existe === undefined) {
      // Evolution API offline → não classificado
      errors++
      results[phone] = { hasWhatsapp: false, displayName: null, isBusiness: false, checked: false }
    }
  }

  return { results, business, personal, notFound, errors }
}

async function persistSupabase(results: Record<string, any>) {
  const patches = Object.entries(results).filter(([, r]) => r.checked).map(([phone, r]) => ({
    wa_checked: true, wa_has_whatsapp: r.hasWhatsapp, wa_is_business: r.isBusiness,
    wa_display_name: r.displayName, wa_verified_at: new Date().toISOString(),
    phone,
  }))
  if (!patches.length) return
  await Promise.allSettled(patches.map(p =>
    fetch(`${SUPA_URL}/rest/v1/discovery_listings?phone=eq.${encodeURIComponent(p.phone)}`, {
      method: "PATCH",
      headers: { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}`, "Content-Type": "application/json", Prefer: "return=minimal" },
      body: JSON.stringify(p), signal: AbortSignal.timeout(5000),
    }).catch(() => null)
  ))
}

// ═══ GET /api/wa-check/trigger — progresso ═══
export async function GET() {
  const progressRaw = redisRaw('GET adsentice:wa-check:progress')
  const progress = progressRaw ? JSON.parse(progressRaw) : { total: 0, processed: 0, status: 'idle' }
  const queueLen = parseInt(redisRaw('LLEN adsentice:wa-check:queue') || '0')
  // Recalcula total real do banco
  try {
    const countRes = await fetch(
      `${SUPA_URL}/rest/v1/discovery_listings?select=place_id&phone=not.is.null&wa_checked=not.is.true&limit=1`,
      { headers: { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}`, ...{ Prefer: 'count=exact' } as any }, signal: AbortSignal.timeout(3000) },
    )
    const range = countRes.headers.get('content-range')
    const pending = range ? parseInt(range.split('/')[1]) : 0
    progress.total = pending + queueLen + (progress.processed || 0)
  } catch { /* keep current */ }
  return NextResponse.json({ ...progress, queueLen, brtHour: brtHour(), isPause: isPauseWindow() })
}

// ═══ POST /api/wa-check/trigger ═══
export async function POST(request: Request) {
  const t0 = Date.now()
  try {
    const body = await request.json().catch(() => ({})) as {
      phones?: string[]; city?: string; category?: string
      page?: number; mode?: string; maxBatch?: number
    }
    const isAuto = body.mode === 'auto'
    const maxBatch = body.maxBatch || (isAuto ? AUTO_BATCH_SIZE : 200)

    // ── TIME GATE: pausa noturna ──
    if (isAuto && isPauseWindow()) {
      const resumeMin = nextResumeMin()
      redisSet('adsentice:wa-check:paused', JSON.stringify({
        reason: 'pause-noturna', until: `06:00 BRT`,
        resumeInMin: resumeMin,
        pausedAt: new Date().toISOString(),
      }), 86400)
      return NextResponse.json({
        paused: true, reason: 'Horário de pausa (23:30-06:00 BRT)',
        resumeInMin, resumeAt: new Date(Date.now() + resumeMin * 60000).toISOString(),
      })
    }

    // ── Coleta phones ──
    let phones: string[] = body.phones || []
    if (!phones.length) {
      // Prioridade: Redis queue (LPOP N items)
      const queueKey = "adsentice:wa-check:queue"
      for (let i = 0; i < maxBatch; i++) {
        const phone = redisRaw(`LPOP ${queueKey}`)
        if (phone) phones.push(phone)
        else break
      }

      // Fallback: Supabase (modo manual)
      if (!phones.length) {
        const page = body.page || 0
        const offset = page * PAGE_SIZE
        const res = await fetch(
          `${SUPA_URL}/rest/v1/discovery_listings?select=phone&phone=not.is.null&wa_checked=not.is.true&order=created_at.desc&limit=${PAGE_SIZE}&offset=${offset}`,
          { headers: { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}` }, signal: AbortSignal.timeout(5000) },
        )
        if (res.ok) {
          const rows = await res.json() as any[]
          phones = [...new Set(rows.map((r: any) => r.phone).filter(Boolean))].slice(0, maxBatch)
        }
      }
    }

    if (!phones.length) {
      redisSet('adsentice:wa-check:paused', JSON.stringify({ reason: 'fila-vazia', at: new Date().toISOString() }), 86400)
      // Update queue size in progress
      const queueLen = parseInt(redisRaw('LLEN adsentice:wa-check:queue') || '0')
      redisSet('adsentice:wa-check:progress', JSON.stringify({ total: 0, processed: 0, status: 'queue-empty', queueLen }), 3600)
      return NextResponse.json({ done: true, total: 0, message: `Fila vazia. ${queueLen} na queue Redis.` })
    }

    // ── Processa ──
    const { results, business, personal, notFound, errors } = await processPhones(phones)
    const total = business + personal + notFound + errors

    // ── Persiste ──
    await persistSupabase(results)

    // ── Histórico Redis ──
    const historyRaw = redisRaw('GET adsentice:wa-check:history')
    const history: any[] = historyRaw ? JSON.parse(historyRaw) : []
    const baileysConfirmed = Object.values(results).filter((r: any) => r.baileysExists === true).length
    history.unshift({
      ts: new Date().toISOString(), total, business, personal, notFound, errors,
      baileysConfirmed, latencyMs: Date.now() - t0, mode: isAuto ? 'auto' : 'manual',
    })
    redisSet('adsentice:wa-check:history', JSON.stringify(history.slice(0, 50)), 86400 * 30)
    redisSet('adsentice:wa-check:last_run', new Date().toISOString(), 86400 * 30)

    // ── Progresso (sempre recalcula total real do banco) ──
    const progressRaw = redisRaw('GET adsentice:wa-check:progress')
    const progress = progressRaw ? JSON.parse(progressRaw) : { total: 0, processed: 0, status: 'running' }
    progress.processed = (progress.processed || 0) + total
    // Busca total REAL do Supabase + Redis queue
    try {
      const countRes = await fetch(
        `${SUPA_URL}/rest/v1/discovery_listings?select=place_id&phone=not.is.null&wa_checked=not.is.true&limit=1`,
        { headers: { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}`, ...{ Prefer: 'count=exact' } as any }, signal: AbortSignal.timeout(3000) },
      )
      const range = countRes.headers.get('content-range')
      const supabasePending = range ? parseInt(range.split('/')[1]) : 0
      const queueLen = parseInt(redisRaw('LLEN adsentice:wa-check:queue') || '0')
      progress.total = supabasePending + queueLen + (progress.processed || 0)
      progress.status = supabasePending > 0 || queueLen > 0 ? 'running' : 'done'
    } catch { /* keep old total */ }
    redisSet('adsentice:wa-check:progress', JSON.stringify(progress), 3600)
    redisSet('adsentice:wa-check:paused', '', 1) // limpa flag de pausa

    // ── AUTO-MODE: agenda próximo lote ──
    if (isAuto) {
      const queueRestante = parseInt(redisRaw('LLEN adsentice:wa-check:queue') || '0')
      if (queueRestante > 0) {
        const resumeMin = nextResumeMin()
        const scheduleKey = "adsentice:wa-check:next-run"
        const nextRun = new Date(Date.now() + resumeMin * 60000).toISOString()
        redisSet(scheduleKey, JSON.stringify({
          nextRun, resumeMin,
          queueRestante,
          mode: 'auto',
        }), Math.ceil(resumeMin * 60) + 300)
        console.log(`[wa-check:auto] Próximo lote em ${resumeMin}min (${nextRun}) · ${queueRestante} na fila`)
      }
    }

    return NextResponse.json({
      mode: isAuto ? 'auto' : 'manual',
      total, business, personal, notFound, baileysConfirmed,
      stats: { total, business, personal, notFound, errors, baileysConfirmed, businessRate: total > 0 ? Math.round((business / total) * 100) : 0 },
      queueRestante: parseInt(redisRaw('LLEN adsentice:wa-check:queue') || '0'),
      brtTime: new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }),
      nextRun: isAuto ? JSON.parse(redisRaw('GET adsentice:wa-check:next-run') || '{}').nextRun : null,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message?.slice(0, 200) }, { status: 500 })
  }
}
