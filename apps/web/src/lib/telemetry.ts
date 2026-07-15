// ══════════════════════════════════════════════════════════════════
// ADSENTICE · Telemetry Sensor (padrão EVO-API k0_breath)
//
// Arquitetura:
//   Redis :6396 — adsentice:telemetry:* (TTL 7 dias)
//   Eventos: toda chamada de API → pushEvent()
//   Alertas: erro crítico → pushAlert() → aparece no topo de TODAS páginas admin
//
// Inspirado em:
//   EVO-API k0_breath.rs — edge quality sensor
//   Next.js ErrorBoundary — React error overlay
//   capital.RS capital-observability — Prometheus/OpenTelemetry
//
// medido=verdade · 2026-07-15 · adsentice
// ══════════════════════════════════════════════════════════════════

import "server-only"
import { execSync } from "child_process"

// ── Types ──

export interface TelemetryEvent {
  route: string                    // "/api/discovery-search"
  status: number                   // HTTP status (200, 500, etc)
  latency_ms: number               // tempo de resposta
  error?: string                   // mensagem de erro (se houver)
  provider?: string                // "DataForSEO" | "DeepSeek" | "Supabase" | "Redis"
  detail?: string                  // contexto adicional
  timestamp: string                // ISO 8601
}

export interface FindingAlert {
  id: string                       // UUID
  level: "critical" | "warning" | "info"
  route: string                    // onde ocorreu
  message: string                  // descrição
  detail?: string                  // stack trace / response body
  count: number                    // quantas vezes ocorreu
  first_seen: string               // primeira ocorrência
  last_seen: string                // última ocorrência
  acknowledged: boolean            // founder ou dev marcou como visto
}

// ── Redis helpers ──

function redisCli(cmd: string): string | null {
  try {
    return execSync(`redis-cli -p 6396 --no-auth-warning ${cmd}`, {
      timeout: 2000, stdio: ["ignore", "pipe", "ignore"],
    }).toString().trim()
  } catch { return null }
}

// ── Push Event ──

const TELEMETRY_KEY = "adsentice:telemetry:events"
const ALERTS_KEY = "adsentice:telemetry:alerts"
const MAX_EVENTS = 1000
const MAX_ALERTS = 50
const TTL_DAYS = 7

/** Registra evento de telemetria a cada chamada de API/rota. */
export function pushEvent(event: Omit<TelemetryEvent, "timestamp">): void {
  try {
    const e: TelemetryEvent = {
      ...event,
      timestamp: new Date().toISOString(),
    }
    const json = JSON.stringify(e).replace(/'/g, "'\\''")

    // LPUSH + LTRIM = circular buffer (últimos 1000 eventos)
    redisCli(`LPUSH ${TELEMETRY_KEY} '${json}'`)
    redisCli(`LTRIM ${TELEMETRY_KEY} 0 ${MAX_EVENTS - 1}`)

    // Atualiza contador de status por rota
    const statusKey = `adsentice:telemetry:status:${event.route}`
    redisCli(`HINCRBY ${statusKey} total 1`)
    if (event.status >= 400) {
      redisCli(`HINCRBY ${statusKey} errors 1`)
    }
    redisCli(`HINCRBY ${statusKey} latency_ms ${event.latency_ms}`)
    redisCli(`EXPIRE ${statusKey} ${TTL_DAYS * 86400}`)

    // Se for erro crítico, dispara alerta automaticamente
    if (event.status >= 500 || (event.status === 40501)) {
      pushAlert({
        level: event.status >= 500 ? "critical" : "warning",
        route: event.route,
        message: `${event.provider || "HTTP"} error ${event.status}${event.error ? `: ${event.error}` : ""}`,
        detail: event.detail,
      })
      // Dispara árbitro em background (fire-and-forget)
      try {
        execSync("python3 tools/adsentice_finding_arbiter.py", {
          timeout: 30000, stdio: "ignore",
        })
      } catch { /* arbiter offline — alerts stay in Redis */ }
    }

    // Expira o evento mais antigo além do TTL
    const count = redisCli(`LLEN ${TELEMETRY_KEY}`)
    if (count && parseInt(count) > MAX_EVENTS) {
      redisCli(`EXPIRE ${TELEMETRY_KEY} ${TTL_DAYS * 86400}`)
    }
  } catch { /* Redis offline — degrade gracefully */ }
}

// ── Push Alert ──

/** Emite alerta de finding. Deduplica — incrementa count se mesmo alerta já existe. */
export function pushAlert(alert: Omit<FindingAlert, "id" | "count" | "first_seen" | "last_seen" | "acknowledged">): void {
  try {
    // Check if same alert already exists (same route + message prefix)
    const existing = getAlerts()
    const dup = existing.find(a => a.route === alert.route && a.message === alert.message && !a.acknowledged)

    if (dup) {
      // Incrementa contador
      const idx = existing.indexOf(dup)
      redisCli(`LSET ${ALERTS_KEY} ${idx} '${JSON.stringify({
        ...dup,
        count: dup.count + 1,
        last_seen: new Date().toISOString(),
      }).replace(/'/g, "'\\''")}'`)
      return
    }

    const a: FindingAlert = {
      ...alert,
      id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      count: 1,
      first_seen: new Date().toISOString(),
      last_seen: new Date().toISOString(),
      acknowledged: false,
    }
    const json = JSON.stringify(a).replace(/'/g, "'\\''")
    redisCli(`LPUSH ${ALERTS_KEY} '${json}'`)
    redisCli(`LTRIM ${ALERTS_KEY} 0 ${MAX_ALERTS - 1}`)
    redisCli(`EXPIRE ${ALERTS_KEY} ${TTL_DAYS * 86400}`)
  } catch { /* Redis offline */ }
}

// ── Read Events ──

/** Lê últimos N eventos de telemetria. */
export function getEvents(limit = 50): TelemetryEvent[] {
  try {
    const raw = redisCli(`LRANGE ${TELEMETRY_KEY} 0 ${limit - 1}`)
    if (!raw) return []
    // Redis returns each element on a new line
    return raw.split("\n").map(line => {
      try { return JSON.parse(line) } catch { return null }
    }).filter(Boolean) as TelemetryEvent[]
  } catch { return [] }
}

/** Lê alertas ativos (não acknowledged). */
export function getAlerts(): FindingAlert[] {
  try {
    const raw = redisCli(`LRANGE ${ALERTS_KEY} 0 ${MAX_ALERTS - 1}`)
    if (!raw) return []
    return raw.split("\n").map(line => {
      try { return JSON.parse(line) } catch { return null }
    }).filter(Boolean) as FindingAlert[]
  } catch { return [] }
}

/** Marca alerta como acknowledged. */
export function ackAlert(id: string): void {
  try {
    const alerts = getAlerts()
    const idx = alerts.findIndex(a => a.id === id)
    if (idx >= 0) {
      alerts[idx].acknowledged = true
      redisCli(`LSET ${ALERTS_KEY} ${idx} '${JSON.stringify(alerts[idx]).replace(/'/g, "'\\''")}'`)
    }
  } catch { /* Redis offline */ }
}

/** Estatísticas de telemetria por rota. */
export function getRouteStats(): Record<string, { total: number; errors: number; avg_latency_ms: number }> {
  try {
    const keys = redisCli("KEYS adsentice:telemetry:status:*")
    if (!keys) return {}
    const stats: Record<string, { total: number; errors: number; avg_latency_ms: number }> = {}
    for (const key of keys.split("\n")) {
      if (!key.trim()) continue
      const route = key.replace("adsentice:telemetry:status:", "")
      const total = parseInt(redisCli(`HGET ${key} total`) || "0")
      const errors = parseInt(redisCli(`HGET ${key} errors`) || "0")
      const latency = parseInt(redisCli(`HGET ${key} latency_ms`) || "0")
      stats[route] = { total, errors, avg_latency_ms: total > 0 ? Math.round(latency / total) : 0 }
    }
    return stats
  } catch { return {} }
}
