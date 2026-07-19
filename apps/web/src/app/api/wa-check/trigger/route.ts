// ══════════════════════════════════════════════════════════════════
// ADSENTICE · Wa-Check Trigger — POST /api/wa-check/trigger
// Executa verificação WhatsApp em batch, salva histórico no Redis
// medido=verdade · $0 por chamada (wa.me público) · 2026-07-19
// ══════════════════════════════════════════════════════════════════

import { NextResponse } from 'next/server'
import { execSync } from 'child_process'
import { checkWhatsapp, checkWhatsappBaileys, type WaCheckResult } from '@/lib/wa-check'

function redisGet(key: string): string | null {
  try {
    const v = execSync(`redis-cli -p 6396 --no-auth-warning GET ${key}`, {
      encoding: 'utf-8', timeout: 2000,
    }).trim()
    return v || null
  } catch { return null }
}

function redisSet(key: string, value: string, ttlSeconds?: number): boolean {
  try {
    if (ttlSeconds) {
      execSync(`redis-cli -p 6396 --no-auth-warning SETEX ${key} ${ttlSeconds} '${value.replace(/'/g, "'\\''")}'`, { encoding: 'utf-8', timeout: 2000 })
    } else {
      execSync(`redis-cli -p 6396 --no-auth-warning SET ${key} '${value.replace(/'/g, "'\\''")}'`, { encoding: 'utf-8', timeout: 2000 })
    }
    return true
  } catch { return false }
}

function redisDel(key: string): void {
  try { execSync(`redis-cli -p 6396 --no-auth-warning DEL ${key}`, { encoding: 'utf-8', timeout: 2000 }) } catch { /* ok */ }
}

export async function POST(request: Request) {
  const t0 = Date.now()
  try {
    const body = await request.json().catch(() => ({})) as {
      phones?: string[]
      city?: string
      category?: string
    }

    // Determina phones a verificar
    let phones: string[] = body.phones || []
    if (!phones.length) {
      const supaUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
      const supaKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

      // 1. Tenta Redis pending (city + category específicos)
      const pendingRaw = redisGet('adsentice:wa-check:pending')
      if (pendingRaw) {
        const pending = JSON.parse(pendingRaw)
        const city = pending.city || body.city
        const cat = pending.category || body.category
        if (city && cat) {
          try {
            const res = await fetch(
              `${supaUrl}/rest/v1/discovery_listings?select=phone&phone=not.is.null&city=eq.${encodeURIComponent(city)}&category=eq.${encodeURIComponent(cat)}&limit=200`,
              { headers: { apikey: supaKey, Authorization: `Bearer ${supaKey}` }, signal: AbortSignal.timeout(5000) },
            )
            if (res.ok) {
              const rows = await res.json() as any[]
              phones = [...new Set(rows.map((r: any) => r.phone).filter(Boolean))]
            }
          } catch { /* fail-soft */ }
        }
      }

      // 2. Fallback: busca TODOS os phones NÃO verificados do banco
      if (!phones.length && supaUrl && supaKey) {
        try {
          const res = await fetch(
            `${supaUrl}/rest/v1/discovery_listings?select=phone&phone=not.is.null&wa_checked=is.false&limit=200`,
            { headers: { apikey: supaKey, Authorization: `Bearer ${supaKey}` }, signal: AbortSignal.timeout(5000) },
          )
          if (res.ok) {
            const rows = await res.json() as any[]
            phones = [...new Set(rows.map((r: any) => r.phone).filter(Boolean))]
          }
        } catch { /* fail-soft */ }
      }

      // 3. Último fallback: todos os phones não verificados (incluindo null wa_checked)
      if (!phones.length && supaUrl && supaKey) {
        try {
          const res = await fetch(
            `${supaUrl}/rest/v1/discovery_listings?select=phone&phone=not.is.null&wa_checked=not.is.true&limit=200`,
            { headers: { apikey: supaKey, Authorization: `Bearer ${supaKey}` }, signal: AbortSignal.timeout(5000) },
          )
          if (res.ok) {
            const rows = await res.json() as any[]
            phones = [...new Set(rows.map((r: any) => r.phone).filter(Boolean))]
          }
        } catch { /* fail-soft */ }
      }
    }

    if (!phones.length) {
      return NextResponse.json({ error: 'Nenhum phone para verificar. Execute um discovery primeiro ou informe phones manualmente.' }, { status: 400 })
    }

    // ── Pipeline 3 camadas (ADR-0041 + ADR-0042) ──
    // Camada 1: detectWA (formato) → filtra fixos
    // Camada 2: checkWhatsapp (wa.me) → detecta 💼 Business
    // Camada 3: checkWhatsappBaileys (Evolution API :3100) → 📱 WhatsApp pessoal
    const unique = [...new Set(phones)]
    const results: Record<string, WaCheckResult & { baileysExists?: boolean }> = {}
    let business = 0, personal = 0, notFound = 0, errors = 0

    for (let i = 0; i < unique.length; i += 15) {
      const batch = unique.slice(i, i + 15)

      // ── Lote Camada 2 (wa.me público, paralelo) ──
      const l2Results = await Promise.all(
        batch.map(async (phone): Promise<{ phone: string; result: WaCheckResult }> => {
          try {
            const r = await checkWhatsapp(phone)
            return { phone, result: r }
          } catch {
            return { phone, result: { hasWhatsapp: false, displayName: null, isBusiness: false, checked: false } }
          }
        })
      )

      // ── Camada 3 (Evolution API) para quem NÃO é Business ──
      const needL3 = l2Results.filter(({ result }) => result.checked && !result.isBusiness && !result.hasWhatsapp)
      let l3Map = new Map<string, boolean>()
      if (needL3.length > 0) {
        const l3Phones = needL3.map(({ phone }) => phone)
        const l3Batch = await Promise.all(
          l3Phones.map(async (phone) => {
            const r = await checkWhatsappBaileys(phone)
            return { phone, existe: r?.existe ?? false }
          })
        )
        for (const { phone, existe } of l3Batch) {
          l3Map.set(phone, existe)
        }
      }

      // ── Classifica ──
      for (const { phone, result } of l2Results) {
        if (!result.checked) { errors++; results[phone] = result; continue }
        if (result.isBusiness) {
          business++
          results[phone] = result
        } else if (result.hasWhatsapp) {
          personal++
          results[phone] = result
        } else {
          // Camada 2 diz "Share on WhatsApp" → Camada 3 decide
          const existe = l3Map.get(phone)
          if (existe === true) {
            personal++
            results[phone] = { hasWhatsapp: true, displayName: null, isBusiness: false, checked: true, baileysExists: true }
          } else if (existe === false) {
            notFound++
            results[phone] = { hasWhatsapp: false, displayName: null, isBusiness: false, checked: true, baileysExists: false }
          } else {
            // Evolution API offline → classifica como "sem confirmação"
            errors++
            results[phone] = { hasWhatsapp: false, displayName: null, isBusiness: false, checked: false }
          }
        }
      }
    }

    const baileysConfirmed = Object.values(results).filter(r => (r as any).baileysExists === true).length
    const baileysNotFound = Object.values(results).filter(r => (r as any).baileysExists === false).length
    const total = business + personal + notFound + errors
    const latency = Date.now() - t0

    // Salva no Redis
    const entry = {
      ts: new Date().toISOString(),
      total,
      business,
      personal: personal - errors,
      notFound,
      errors,
      baileysConfirmed,
      baileysNotFound,
      latencyMs: latency,
      sampleBusiness: Object.entries(results).filter(([, r]) => r.isBusiness && r.displayName).slice(0, 5).map(([p, r]) => ({ phone: p, name: r.displayName })),
    }

    const historyRaw = redisGet('adsentice:wa-check:history')
    const history: any[] = historyRaw ? JSON.parse(historyRaw) : []
    history.unshift(entry)
    redisSet('adsentice:wa-check:history', JSON.stringify(history.slice(0, 50)), 86400 * 30)
    redisSet('adsentice:wa-check:last_run', entry.ts, 86400 * 30)

    // Limpa pendência
    redisDel('adsentice:wa-check:pending')

    // ── v127: Persistir wa-check no Supabase ──
    try {
      const supaUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
      const supaKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ""
      if (supaUrl && supaKey) {
        const patches = Object.entries(results).map(([phone, r]) => {
          if (!r.checked) return null
          return {
            phone: phone,
            wa_checked: true,
            wa_has_whatsapp: r.hasWhatsapp,
            wa_is_business: r.isBusiness,
            wa_display_name: r.displayName,
            wa_verified_at: new Date().toISOString(),
          }
        }).filter(Boolean) as any[]

        // PATCH listings matching each phone
        await Promise.allSettled(patches.map(p =>
          fetch(`${supaUrl}/rest/v1/discovery_listings?phone=eq.${encodeURIComponent(p.phone)}`, {
            method: "PATCH",
            headers: { apikey: supaKey, Authorization: `Bearer ${supaKey}`, "Content-Type": "application/json", Prefer: "return=minimal" },
            body: JSON.stringify({ wa_checked: p.wa_checked, wa_has_whatsapp: p.wa_has_whatsapp, wa_is_business: p.wa_is_business, wa_display_name: p.wa_display_name, wa_verified_at: p.wa_verified_at }),
            signal: AbortSignal.timeout(5000),
          }).catch(() => null)
        ))
        console.log(`[wa-check] Persisted ${patches.length} results to Supabase`)
      }
    } catch (e: any) { console.warn('[wa-check] Supabase persist failed:', e.message?.slice(0, 80)) }

    return NextResponse.json({
      entry,
      stats: { total, business, personal, notFound, errors, baileysConfirmed, baileysNotFound, businessRate: total > 0 ? Math.round((business / total) * 100) : 0 },
      sampleBusiness: entry.sampleBusiness,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
