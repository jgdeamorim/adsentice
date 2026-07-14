// ══════════════════════════════════════════════════════════════════
// ADSENTICE · POST /api/semantic-registry — SGA PoC
// Testa o Semantic Registry: intent → vector search → graph resolve
// ══════════════════════════════════════════════════════════════════

import { NextResponse } from "next/server"
import { registryResolve, incrementMutation, getMutationId, ensureSeeded, getAllNodes } from "@/lib/brain/semantic-registry"
import { computeSGAHealth, setResolutionStats } from "@/lib/sga-score"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(req: Request) {
  const body = await req.json()
  const { intent, tags, component, action } = body

  // ── Mutation: simula alteração de componente ──
  if (action === "mutate" && body.nodeIds) {
    ensureSeeded()
    const mid = incrementMutation(body.nodeIds)
    return NextResponse.json({ action: "mutated", mutationId: mid, affectedNodes: body.nodeIds })
  }

  // ── Seed: inicializa o registro ──
  if (action === "seed") {
    ensureSeeded()
    return NextResponse.json({ action: "seeded", registrySize: getAllNodes().length, mutationId: getMutationId() })
  }

  // ── Score: SGA Health (4 dimensões, determinístico) ──
  if (action === "score") {
    ensureSeeded()
    const allNodes = getAllNodes()
    const result = computeSGAHealth(allNodes)
    return NextResponse.json(result)
  }

  // ── Query: intent → nodes ──
  if (!intent && !component) {
    return NextResponse.json({ error: "intent or component required" }, { status: 400 })
  }

  ensureSeeded()
  const result = await registryResolve({
    intent: intent || undefined,
    component: component || undefined,
    tags: tags || undefined,
    maxResults: body.maxResults || 10,
  })

  // Format response: limit content for readability
  const nodes = result.nodes.map(n => ({
    id: n.id,
    type: n.type,
    name: n.name,
    description: n.description.slice(0, 100),
    intent: n.intent,
    edges: n.edges,
    mutationId: n.mutationId,
    version: n.version,
    tags: n.tags.slice(0, 5),
  }))

  return NextResponse.json({
    query: { intent, component, tags },
    ...result,
    nodes,
    graphSummary: {
      totalNodes: nodes.length,
      types: [...new Set(nodes.map(n => n.type))],
      edges: nodes.reduce((s, n) => s + n.edges.length, 0),
    },
  })
}
