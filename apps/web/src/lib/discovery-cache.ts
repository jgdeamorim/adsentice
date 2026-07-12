// ══════════════════════════════════════════════════════════════════
// ADSENTICE · Discovery Cache — persistência + cache + cost tracking
// Redis :6396 para tracking de custo + cache TTL em memória
// ══════════════════════════════════════════════════════════════════

import "server-only"
import { execSync } from "child_process"

// Cache in-memory (TTL 30min por query)
const cache = new Map<string, { data: unknown; at: number }>()
const CACHE_TTL = 30 * 60 * 1000 // 30 minutos

function redisCli(cmd: string): string | null {
  try {
    return execSync(`redis-cli -p 6396 --no-auth-warning ${cmd}`, {
      timeout: 2000, stdio: ["ignore", "pipe", "ignore"],
    }).toString().trim()
  } catch { return null }
}

function cacheKey(params: Record<string, unknown>): string {
  const sorted = Object.keys(params).sort().map(k => `${k}=${params[k]}`).join("&")
  return `discovery:cache:${sorted}`
}

export function getCached(key: string): unknown | null {
  const entry = cache.get(key)
  if (entry && Date.now() - entry.at < CACHE_TTL) return entry.data
  cache.delete(key)
  return null
}

export function setCache(key: string, data: unknown): void {
  cache.set(key, { data, at: Date.now() })
}

// ── Cost Tracking (Redis) ──

export function trackCost(params: {
  categories: string[]; lat: number; lng: number; radiusKm: number
  costUsd: number; totalCount: number
}): void {
  const today = new Date().toISOString().split("T")[0]
  redisCli(`INCRBYFLOAT adsentice:discovery:cost:today ${params.costUsd}`)
  redisCli(`INCRBYFLOAT adsentice:discovery:cost:total ${params.costUsd}`)
  redisCli(`SETEX adsentice:discovery:cost:last ${86400} "${params.costUsd.toFixed(4)} | ${params.categories.join(',')} | ${params.lat},${params.lng},${params.radiusKm}km | ${params.totalCount} leads"`)
}

export function getCostToday(): number {
  const v = redisCli("GET adsentice:discovery:cost:today")
  return v ? parseFloat(v) : 0
}

export function getCostTotal(): number {
  const v = redisCli("GET adsentice:discovery:cost:total")
  return v ? parseFloat(v) : 0
}

export function getCostLast(): string {
  return redisCli("GET adsentice:discovery:cost:last") || "—"
}

// ── Persisted Results (Redis, TTL 24h) ──

export function persistResults(key: string, data: unknown): void {
  try {
    const json = JSON.stringify(data)
    redisCli(`SETEX ${key} 86400 '${json.replace(/'/g, "'\\''")}'`)
  } catch { /* Redis offline — degrade gracefully */ }
}

export function getPersistedResults(key: string): unknown | null {
  const json = redisCli(`GET ${key}`)
  if (!json) return null
  try { return JSON.parse(json) } catch { return null }
}

export function estimateCost(categories: string[], limit: number): { perCall: number; total: number } {
  const perCall = 0.015 // ~$0.015 per business_listings_search call
  return {
    perCall,
    total: categories.length * perCall,
  }
}
