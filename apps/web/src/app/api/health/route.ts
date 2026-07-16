// ══════════════════════════════════════════════════════════════════
// ADSENTICE · GET /api/health — System Health Check
// Igual EVO-API :7700/health — status de todos os serviços + telemetria
// medido=verdade · 2026-07-15
// ══════════════════════════════════════════════════════════════════

import { NextResponse } from "next/server"
import { getAlerts, getRouteStats, getEvents } from "@/lib/telemetry"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

async function checkUrl(url: string, timeout = 3000): Promise<boolean> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(timeout) })
    return res.ok
  } catch { return false }
}

export async function GET() {
  const [qdrantOk, embedOk] = await Promise.all([
    checkUrl("http://127.0.0.1:6352/healthz"),
    checkUrl("http://127.0.0.1:8081/healthz"),
  ])

  // Redis check via redis-cli (TCP fetch não funciona para Redis)
  let redisOk = false
  try {
    const { execSync } = await import("child_process")
    const result = execSync("redis-cli -p 6396 --no-auth-warning PING", { timeout: 2000, stdio: ["ignore", "pipe", "ignore"] }).toString().trim()
    redisOk = result === "PONG"
  } catch { /* Redis offline */ }

  const dfOk = !!(process.env.DATAFORSEO_LOGIN && process.env.DATAFORSEO_PASSWORD)
  const dsOk = !!process.env.DEEPSEEK_API_KEY

  const alerts = getAlerts()
  const activeAlerts = alerts.filter(a => !a.acknowledged)
  const stats = getRouteStats()
  const recentEvents = getEvents(10)

  // Conta erros nas últimas 24h
  const recentErrors = recentEvents.filter(e => e.status >= 400)
  const healthStatus = activeAlerts.length > 0 ? "degraded" : "healthy"

  return NextResponse.json({
    status: healthStatus,
    timestamp: new Date().toISOString(),
    alerts: {
      active: activeAlerts.length,
      total: alerts.length,
      critical: activeAlerts.filter(a => a.level === "critical").length,
      warning: activeAlerts.filter(a => a.level === "warning").length,
      info: activeAlerts.filter(a => a.level === "info").length,
      items: activeAlerts.slice(0, 10),  // full alert objects for AlertContext
    },
    services: {
      qdrant: qdrantOk ? "online" : "offline",
      redis: redisOk ? "online" : "offline",
      embed: embedOk ? "online" : "offline",
      dataforseo: dfOk ? "online" : "offline",
      deepseek: dsOk ? "online" : "offline",
    },
    routes: stats,
    recent_errors: recentErrors.slice(0, 5),
  })
}
