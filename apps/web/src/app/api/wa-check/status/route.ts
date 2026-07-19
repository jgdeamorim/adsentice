// ══════════════════════════════════════════════════════════════════
// ADSENTICE · Wa-Check Status — GET /api/wa-check/status
// Lê estado do Redis: pendências, último run, histórico, estatísticas
// medido=verdade · $0 · 2026-07-19
// ══════════════════════════════════════════════════════════════════

import { NextResponse } from 'next/server'
import { execSync } from 'child_process'

function redisGet(key: string): string | null {
  try {
    const v = execSync(`redis-cli -p 6396 --no-auth-warning GET ${key}`, {
      encoding: 'utf-8', timeout: 2000,
    }).trim()
    return v || null
  } catch { return null }
}

export async function GET() {
  try {
    const pendingRaw = redisGet('adsentice:wa-check:pending')
    const lastRun = redisGet('adsentice:wa-check:last_run')
    const historyRaw = redisGet('adsentice:wa-check:history')

    const pending = pendingRaw ? JSON.parse(pendingRaw) : null
    const history: any[] = historyRaw ? JSON.parse(historyRaw) : []

    // Conta do Supabase (REST) — total de phones no banco
    let dbPhones = 0
    try {
      const supaUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
      const supaKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
      const res = await fetch(
        `${supaUrl}/rest/v1/discovery_listings?select=place_id&phone=not.is.null&limit=1`,
        { headers: { apikey: supaKey, Authorization: `Bearer ${supaKey}` },
          signal: AbortSignal.timeout(3000) },
      )
      if (res.ok) {
        const text = await res.text()
        // Supabase returns content-range header with count
        const rangeHeader = res.headers.get('content-range')
        if (rangeHeader) {
          const match = rangeHeader.match(/\d+-\d+\/(\d+)/)
          if (match) dbPhones = parseInt(match[1])
        }
      }
    } catch { /* fail-soft */ }

    // Stats do último run
    const lastEntry = history[0]
    const totalVerified = history.reduce((s: number, h: any) => s + (h.total || 0), 0)
    const totalBusiness = history.reduce((s: number, h: any) => s + (h.business || 0), 0)

    return NextResponse.json({
      pending,
      lastRun: lastRun || null,
      history: history.slice(0, 20), // últimos 20 runs
      stats: {
        dbPhones,
        totalVerified,
        totalBusiness,
        businessRate: totalVerified > 0 ? Math.round((totalBusiness / totalVerified) * 100) : 0,
      },
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
