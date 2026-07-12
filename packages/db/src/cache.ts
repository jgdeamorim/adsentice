// ══════════════════════════════════════════════════════════════════
// ADSENTICE · DB Cache Store — L1 in-memory · L2 Redis (future)
// ══════════════════════════════════════════════════════════════════

import type { CacheStore } from "./types"

interface CacheItem {
  value: unknown
  storedAt: number
  ttlMs: number
}

const DEFAULT_TTL = 86400000 // 24h

// ── In-Memory (dev + prod L1) ─────────────────────────────────

export class MemCacheStore implements CacheStore {
  private store = new Map<string, CacheItem>()
  private hits = 0
  private misses = 0

  async get<T>(key: string): Promise<T | null> {
    const item = this.store.get(key)
    if (!item) {
      this.misses++
      return null
    }
    if (Date.now() - item.storedAt > item.ttlMs) {
      this.store.delete(key)
      this.misses++
      return null
    }
    this.hits++
    return item.value as T
  }

  async set<T>(key: string, value: T, ttlMs?: number): Promise<void> {
    this.store.set(key, {
      value,
      storedAt: Date.now(),
      ttlMs: ttlMs ?? DEFAULT_TTL,
    })
  }

  async has(key: string): Promise<boolean> {
    const item = this.store.get(key)
    if (!item) return false
    if (Date.now() - item.storedAt > item.ttlMs) {
      this.store.delete(key)
      return false
    }
    return true
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key)
  }

  async stats(): Promise<{ size: number; hitRate: number }> {
    const total = this.hits + this.misses
    return {
      size: this.store.size,
      hitRate: total > 0 ? +(this.hits / total).toFixed(2) : 0,
    }
  }
}

// ── Factory ──────────────────────────────────────────────────

export function createCacheStore(): CacheStore {
  return new MemCacheStore()
}
