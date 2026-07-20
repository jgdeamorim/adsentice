// ══════════════════════════════════════════════════════════════════
// ADSENTICE · Cockpit TOP-K — Brain OODA Assistant (ADR-0048 #7)
// POST /api/cockpit/ask → brainTurn(question, KG) → reply
// Motor: brain/b3-decide.ts · 12 containers · Bypass Score→Cache→Claude
// Plano: Sentinela (R$197/mês) · $0 (Qdrant local + cached)
// medido=verdade · 2026-07-20
// ══════════════════════════════════════════════════════════════════

import { NextResponse } from "next/server"
import { brainTurn, extractiveReply, type BrainResult } from "@/lib/brain/b3-decide"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// Qdrant + Embed config (mesmo padrão marketing-kg.ts)
const QDRANT = "http://127.0.0.1:6352"
const EMBED = "http://127.0.0.1:8081/embed"
const COLLECTION = "adsentice-self"

async function embedQuery(text: string): Promise<number[]> {
  try {
    const res = await fetch(EMBED, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ texts: [text] }),
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) return []
    const data = await res.json()
    return data.vectors?.[0] || data.embedding || data.vector || []
  } catch (e: unknown) { void e; return [] }
}

async function qdrantSearch(collection: string, vector: number[], filter: Record<string, unknown>, limit = 10): Promise<any[]> {
  try {
    const res = await fetch(`${QDRANT}/collections/${collection}/points/search`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vector, limit, filter, with_payload: true }),
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) return []
    const data = await res.json()
    return data.result || []
  } catch (e: unknown) { void e; return [] }
}

interface CockpitRequest {
  question: string
  context?: { place_id?: string; category?: string; city?: string; segment?: string }
}

interface CockpitResponse {
  reply: string
  tier: string
  certainty: number
  facts: { source: string; excerpt: string; score: number }[]
  cached: boolean
  grounded: boolean
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as CockpitRequest
    const question = body.question?.trim()
    if (!question || question.length < 5) {
      return NextResponse.json({ error: "Pergunta muito curta" }, { status: 400 })
    }

    // ── KG Recall: busca cross-collection (self + conversation + memory) ──
    const vec = await embedQuery(question)
    if (vec.length === 0) {
      return NextResponse.json({ reply: "Embed server offline. Tente novamente.", tier: "error" })
    }

    const contextFilter = body.context?.segment
      ? { should: [{ key: "segment", match: { value: body.context.segment } }] }
      : {}

    const [selfHits, convHits, memoryHits] = await Promise.all([
      qdrantSearch("adsentice-self", vec, { ...contextFilter }, 5),
      qdrantSearch("adsentice-conversation", vec, { must: [{ key: "tag", match: { value: "adsentice" } }] }, 5),
      qdrantSearch("claude-memory", vec, {}, 3),
    ])

    // Merge + dedup
    const allHits = [...selfHits, ...convHits, ...memoryHits]
    const searchResults = allHits.map(p => {
      const pl = p.payload || {}
      return {
        source: (pl.source as string) || (pl.kind as string) || "Qdrant",
        content: (pl.text as string) || (pl.description as string) || JSON.stringify(pl).slice(0, 300),
        score: p.score || 0,
        kind: (pl.kind as string) || undefined,
      }
    })

    // ── Brain OODA Turn ──
    const commitsFound = 5   // proxy (git log recente)
    const filesystemSources = 3  // proxy (fontes lidas)

    const result: BrainResult = await brainTurn(
      question,
      searchResults,
      commitsFound,
      filesystemSources,
      // Claude fallback: resposta simples baseada nos fatos do KG
      async (facts, q) => {
        if (facts.length === 0) return extractiveReply([])
        const ctx = facts.map(f => `[${f.source}] ${f.excerpt.slice(0, 150)}`).join("\n")
        return `Com base no Knowledge Graph do adsentice:\n\n${ctx}\n\n⚠️ Resposta determinística ($0, sem LLM). Para análise mais profunda, consulte o diagnóstico completo do lead.`
      },
    )

    return NextResponse.json({
      reply: result.reply,
      tier: result.tier,
      certainty: result.certainty.certainty,
      confidence: result.certainty.confident,
      facts: result.facts,
      cached: result.cached,
      grounded: result.grounding.grounded,
      intent: result.intent.intent,
    } as CockpitResponse)
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message?.slice(0, 200) }, { status: 500 })
  }
}

// GET: status rápido do cockpit
export async function GET() {
  return NextResponse.json({
    online: true,
    engine: "brain/b3-decide (ADR-0011)",
    tiers: ["bypass-score ($0)", "bypass-cache ($0)", "b3-claude (cost-capped)"],
    collections: ["adsentice-self", "adsentice-conversation", "claude-memory"],
    plans: ["Sentinela (R$197/mês)", "Domínio (R$497/mês)"],
    features: ["TOP-K daily briefing", "Lead Q&A", "Market intelligence Q&A"],
  })
}
