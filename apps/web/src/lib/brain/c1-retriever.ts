// ══════════════════════════════════════════════════════════════════
// ADSENTICE · Brain c1 — Hybrid Re-ranker (ADR-0011 §Container c1)
// Re-rank hibrido: 0.45·sim + 0.20·autoridade + 0.15·recencia + 0.20·lexical
// Inspirado no EVO-API dag.rs:340-371 (c1_rerank).
// Deterministico · $0 · override dos resultados crus do Qdrant.
// ══════════════════════════════════════════════════════════════════

import "server-only"

export interface RankedHit {
  source: string
  content: string
  originalScore: number
  finalScore: number
  authority: number
  recency: number
  lexical: number
  kind: string
}

/** Autoridade pela fonte (igual EVO-API dag.rs:286-294). */
function authority(source: string): number {
  if (source.includes("base-matriz") || source.includes("CLAUDE.md") || source.includes("README")) return 1.00
  if (source.includes("/adr/") || source.includes("/spec/")) return 0.80
  if (source.includes("/handoff/") || source.includes("HANDOFF-")) return 0.60
  if (source.endsWith(".ts") || source.endsWith(".tsx") || source.endsWith(".rs")) return 0.45
  
return 0.35
}

/** Recencia como chave sortavel (YYYYMMDD do path). */
function recencyKey(source: string): number {
  if (source.includes("base-matriz")) return 20_261_231 // o mapa VIVO (sempre o mais novo)
  const m = source.match(/HANDOFF-(\d{4})-(\d{2})-(\d{2})/)

  if (m) return parseInt(m[1] + m[2] + m[3])
  const base = source.split("/").pop() || source
  const num = base.replace(/\D/g, "").slice(0, 4)

  if (num.length === 4) return 20_250_000 + parseInt(num)
  
return 20_240_101 // outro · antigo por default
}

/** Termos salientes da pergunta (o "grep" lexical). */
function salientTerms(query: string): string[] {
  const STOP = new Set(["que", "qual", "quais", "como", "onde", "porque", "para", "sobre",
    "the", "and", "foi", "sao", "uma", "com", "dos", "das", "nos", "nas", "isso",
    "esse", "essa", "seu", "sua", "nao", "sim", "mais", "pra", "num", "seja", "ser", "tem"])

  
return query.toLowerCase()
    .split(/[^a-záàâãéêíóôõúç0-9]/)
    .filter(w => w.length > 2 && !STOP.has(w))
}

/** Re-rank hibrido: floor por corpus → re-rank → top-k.
 *  Inspirado no EVO-API dag.rs:340-371. */
export function c1Rerank(
  hits: { source: string; content: string; score: number; kind?: string }[],
  query: string,
  mode: "ask-recall" | "ask-explicar" | "ask-factual",
  k: number = 6,
): RankedHit[] {
  if (hits.length === 0) return []

  // Floor: descarta ruido tangencial
  const filtered = hits.filter(h => {
    const floor = h.source.endsWith(".rs") || h.source.endsWith(".ts") ? 0.42 : 0.24

    
return h.score >= floor
  })

  if (filtered.length === 0) return []

  const terms = salientTerms(query)
  const proseMax = filtered.filter(h => !h.source.endsWith(".ts") && !h.source.endsWith(".rs")).map(h => h.score).reduce((a, b) => Math.max(a, b), 0) || 1e-6
  const codeMax = filtered.filter(h => h.source.endsWith(".ts") || h.source.endsWith(".rs")).map(h => h.score).reduce((a, b) => Math.max(a, b), 0) || 1e-6
  const rmin = Math.min(...filtered.map(h => recencyKey(h.source)))
  const rmax = Math.max(...filtered.map(h => recencyKey(h.source)))
  const rspan = Math.max(rmax - rmin, 1)

  const ranked: RankedHit[] = filtered.map(h => {
    const cmax = (h.source.endsWith(".ts") || h.source.endsWith(".rs")) ? codeMax : proseMax
    const simNorm = h.score / cmax
    const recNorm = (recencyKey(h.source) - rmin) / rspan

    const lex = terms.length === 0 ? 0
      : terms.filter(t => h.content.toLowerCase().includes(t)).length / terms.length

    const isThread = h.source.includes("/handoff/") || h.source.includes("HANDOFF-") || h.source.includes("base-matriz")
    const recallBoost = (mode === "ask-recall" && isThread) ? 0.06 + 0.16 * recNorm : 0

    const finalScore = 0.45 * simNorm + 0.20 * authority(h.source) + 0.15 * recNorm + 0.20 * lex + recallBoost

    return {
      source: h.source, content: h.content, originalScore: h.score, finalScore,
      authority: authority(h.source), recency: recNorm, lexical: lex, kind: h.kind || "?",
    }
  })

  ranked.sort((a, b) => b.finalScore - a.finalScore)
  
return ranked.slice(0, k)
}
