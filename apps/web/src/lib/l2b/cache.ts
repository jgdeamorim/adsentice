// ══════════════════════════════════════════════════════════════════
// ADSENTICE · L2b Content Enrichment — Cache (Redis cross-lead)
// Chave: adsentice:l2:content:{domain} · TTL 24h
// Múltiplos leads no mesmo domínio (franquias) batem cache
// ESTENDE: a3-cache.ts (redisRaw compartilhado)
// medido=verdade · $0 · 2026-07-19
// ══════════════════════════════════════════════════════════════════

import { redisRaw } from "@/lib/brain/a3-cache"
import type { EnrichResult } from "./types"

const CACHE_PREFIX = "adsentice:l2:content"
const DEFAULT_TTL = 86400 // 24 horas

/** Gera chave de cache para um domínio. */
export function cacheKey(domain: string): string {
  return `${CACHE_PREFIX}:${domain}`
}

/** Busca resultado cached para o domínio. */
export async function getCached(domain: string): Promise<EnrichResult | null> {
  try {
    const raw = redisRaw(`GET ${cacheKey(domain)}`)
    if (!raw) return null
    return JSON.parse(raw) as EnrichResult
  } catch (e: unknown) { void e; return null }
}

/** Salva resultado no cache com TTL de 24h. */
export async function setCache(
  domain: string,
  result: EnrichResult,
  ttl = DEFAULT_TTL,
): Promise<void> {
  try {
    const safe = JSON.stringify(result).replace(/'/g, "'\\''")
    redisRaw(`SETEX ${cacheKey(domain)} ${ttl} '${safe}'`)
  } catch (e: unknown) { void e /* fail-soft */ }
}

/** Invalida cache para um domínio (ex: após re-discovery). */
export async function invalidateCache(domain: string): Promise<void> {
  try { redisRaw(`DEL ${cacheKey(domain)}`) } catch (e: unknown) { void e /* fail-soft */ }
}

/** Verifica se um domínio está cached. */
export async function hasCache(domain: string): Promise<boolean> {
  return (await redisRaw(`EXISTS ${cacheKey(domain)}`)) === "1"
}

/** Retorna TTL restante em segundos para um domínio cached. */
export async function cacheTTL(domain: string): Promise<number> {
  try {
    return parseInt(redisRaw(`TTL ${cacheKey(domain)}`) || "0", 10) || 0
  } catch (e: unknown) { void e; return 0 }
}

/** Lista todos os domínios em cache. */
export async function listCachedDomains(): Promise<string[]> {
  try {
    const keys = redisRaw(`KEYS ${CACHE_PREFIX}:*`)
    if (!keys) return []
    return keys.split("\n").map(k => k.replace(`${CACHE_PREFIX}:`, "")).filter(Boolean)
  } catch (e: unknown) { void e; return [] }
}

/** Limpa todo o cache L2b (uso administrativo). */
export async function clearAllCache(): Promise<number> {
  try {
    const keys = redisRaw(`KEYS ${CACHE_PREFIX}:*`)
    if (!keys) return 0
    const count = keys.split("\n").filter(Boolean).length
    for (const key of keys.split("\n").filter(Boolean)) {
      redisRaw(`DEL ${key}`)
    }
    return count
  } catch (e: unknown) { void e; return 0 }
}
