// ══════════════════════════════════════════════════════════════════
// ADSENTICE · DB Search Store — Dev (in-memory) · Prod (Qdrant)
// ══════════════════════════════════════════════════════════════════

import type { SearchStore, SearchHit } from "./types"

// ── In-Memory (dev · cosine similarity via dot product) ────────

interface IndexedPoint {
  id: string
  vector: number[]
  payload: Record<string, unknown>
}

export class MemSearchStore implements SearchStore {
  private points: IndexedPoint[] = []

  async search(query: string, limit = 5): Promise<SearchHit[]> {
    // Simple keyword-based search for dev (no embed server needed)
    const terms = query.toLowerCase().split(/\s+/)

    return this.points
      .map((p) => {
        const text = String(p.payload.text || p.payload.content || "").toLowerCase()
        let score = 0
        for (const term of terms) {
          if (text.includes(term)) score += 1
          // Boost exact phrase match
          if (text.includes(query.toLowerCase())) score += 2
        }
        // Normalize by text length to avoid long docs dominating
        const normalized = text.length > 0 ? score / Math.log(text.length + 1) : 0
        return {
          source: String(p.payload.source || "memory"),
          kind: String(p.payload.kind || "unknown"),
          content: text.slice(0, 300),
          score: +normalized.toFixed(4),
        }
      })
      .filter((h) => h.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
  }

  async upsert(points: Array<{ id: string; vector: number[]; payload: Record<string, unknown> }>): Promise<void> {
    for (const p of points) {
      const idx = this.points.findIndex((x) => x.id === p.id)
      if (idx >= 0) {
        this.points[idx] = p
      } else {
        this.points.push(p)
      }
    }
  }

  async count(): Promise<number> {
    return this.points.length
  }

  // Dev-only: inject indexed content
  async indexTexts(texts: Array<{ id: string; text: string; source: string; kind: string }>): Promise<void> {
    for (const t of texts) {
      this.points.push({
        id: t.id,
        vector: [], // dev doesn't use vectors
        payload: { text: t.text, source: t.source, kind: t.kind },
      })
    }
  }
}

// ── Factory ──────────────────────────────────────────────────

export function createSearchStore(env: "dev" | "prod", _config?: Record<string, string>): SearchStore {
  return new MemSearchStore()
  // Future: Qdrant client for prod
}
