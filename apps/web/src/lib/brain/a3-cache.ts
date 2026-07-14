// ══════════════════════════════════════════════════════════════════
// ADSENTICE · Brain A3 — Pattern Cache (ADR-0011 §Container A3)
// Redis via child_process (redis-cli) — mesmo padrao do scoring.ts
// ══════════════════════════════════════════════════════════════════

import "server-only"
import { createHash } from "crypto"

const CACHE_PREFIX = "adsentice:brain:cache:"
const CACHE_TTL = 86400 * 30

function situationKey(intent: string, question: string): string {
  return createHash("sha256").update(`${intent}\n${question.trim().toLowerCase()}`).digest("hex").slice(0, 16)
}

function corpusWatermark(): string {
  try {
    const fs = require("fs")
    const head = fs.readFileSync("var/self-ingest.head", "utf-8").trim()
    return head.split(/\s+/)[0] || "none"
  } catch { return "none" }
}

export interface CacheEntry {
  reply: string; tier: string; intent: string
  facts: { source: string; excerpt: string; score: number }[]; certainty: number
  watermark: string; created_at: string
}

function redisRaw(cmd: string): string | null {
  try {
    const { execSync } = require("child_process")
    const result = execSync(`redis-cli -p 6396 --no-auth-warning ${cmd}`, { timeout: 2000, encoding: "utf-8", stdio: ["ignore", "pipe", "ignore"] })
    return result.trim() || null
  } catch { return null }
}

export async function cacheGet(question: string, intent: string): Promise<CacheEntry | null> {
  const key = CACHE_PREFIX + situationKey(intent, question)
  const raw = redisRaw(`GET ${key}`)
  if (!raw) return null
  try {
    const entry: CacheEntry = JSON.parse(raw)
    if (entry.watermark !== corpusWatermark()) return null
    return entry
  } catch { return null }
}

export async function cachePut(
  question: string, intent: string, reply: string, tier: string,
  facts: { source: string; excerpt: string; score: number }[], certainty: number,
): Promise<void> {
  const entry: CacheEntry = { reply, tier, intent, facts, certainty, watermark: corpusWatermark(), created_at: new Date().toISOString() }
  const key = CACHE_PREFIX + situationKey(intent, question)
  const json = JSON.stringify(entry).replace(/'/g, "'\\''")
  redisRaw(`SETEX ${key} ${CACHE_TTL} '${json}'`)
}

export async function cacheInvalidateAll(): Promise<void> {
  const keys = redisRaw(`KEYS ${CACHE_PREFIX}*`)
  if (keys) {
    for (const k of keys.split("\n")) {
      if (k.trim()) redisRaw(`DEL ${k.trim()}`)
    }
  }
}

export async function cacheStats(): Promise<{ entries: number }> {
  const keys = redisRaw(`KEYS ${CACHE_PREFIX}*`)
  return { entries: keys ? keys.split("\n").filter(Boolean).length : 0 }
}
