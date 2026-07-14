// ══════════════════════════════════════════════════════════════════
// ADSENTICE · Brain B3 — Decision Router (ADR-0011 §Container B3)
// O BYPASS: certainty>=0.80 → glass-box $0 · cache-hit → $0 · miss → Claude
// Inspirado no EVO-API chat_ooda.rs Tiers: BypassScore, BypassCache, B3Claude.
// ══════════════════════════════════════════════════════════════════

import "server-only"
import { cacheGet, cachePut } from "./a3-cache"
import { classifyIntent, type IntentResult } from "./c0-interpreter"
import { c1Rerank, type RankedHit } from "./c1-retriever"
import { computeCertainty, type CertaintyResult } from "./b2-self-score"
import { groundingCheck, c3Honesty, type GroundingResult } from "./d1-grounding"

export type BrainTier = "bypass-score" | "bypass-cache" | "b3-claude"

export interface BrainResult {
  reply: string
  tier: BrainTier
  intent: IntentResult
  facts: { source: string; excerpt: string; score: number }[]
  certainty: CertaintyResult
  grounding: GroundingResult
  cached: boolean
  learned: boolean // A3: este turno gerou cache novo?
}

/** Helper: extrai fatos formatados dos hits rankeados. */
function extractFacts(hits: RankedHit[], limit = 5): { source: string; excerpt: string; score: number }[] {
  return hits.slice(0, limit).map(h => ({
    source: h.source,
    excerpt: h.content.length > 300 ? h.content.slice(0, 300) + "..." : h.content,
    score: Math.round(h.finalScore * 1000) / 1000,
  }))
}

/** Brain OODA Turn: KG-first → certainty → bypass/cache/Claude → grounding → cache.
 *  Este e o loop completo de 12 containers condensado em 1 funcao.
 *
 *  @param question - pergunta do founder
 *  @param searchResults - resultados BRUTOS das 3 colecoes Qdrant (conversation, self, memory)
 *  @param commitsFound - quantos commits relevantes o git log retornou
 *  @param filesystemSources - quantos arquivos fonte foram lidos
 *  @param claudeRespond - funcao que chama Claude (injetada — o caller decide como)
 */
export async function brainTurn(
  question: string,
  searchResults: { source: string; content: string; score: number; kind?: string }[],
  commitsFound: number,
  filesystemSources: number,
  claudeRespond: (facts: { source: string; excerpt: string; score: number }[], question: string) => Promise<string>,
): Promise<BrainResult> {
  // ── c0: Classificar intencao ──
  const intent = classifyIntent(question)

  // ── c1: Re-rank hibrido ──
  const hits = c1Rerank(searchResults, question, intent.intent, 6)

  // ── B2: Self-score ──
  const certainty = computeCertainty(hits, commitsFound, filesystemSources, question)
  const facts = extractFacts(hits)

  // ── A3: Cache check ──
  const cached = await cacheGet(question, intent.intent)
  if (cached && cached.watermark === cached.watermark) {
    return {
      reply: cached.reply, tier: "bypass-cache", intent, facts,
      certainty, grounding: { grounded: true, cleanReply: cached.reply, prunedCount: 0, totalSentences: 1, matchedTerms: [] },
      cached: true, learned: false,
    }
  }

  // ── B3: BYPASS ou Claude ──
  let reply: string
  let tier: BrainTier
  let learned = false

  if (certainty.confident) {
    // BypassScore: glass-box — responde DIRETO dos fatos, sem LLM
    reply = facts.length > 0
      ? facts.map(f => `[${f.source}] ${f.excerpt.slice(0, 200)}`).join("\n\n")
      : "Nao encontrei informacao suficiente no Knowledge Graph."
    tier = "bypass-score"
  } else {
    // B3Claude: LLM responde ANCORADO nos fatos
    reply = await claudeRespond(facts, question)
    tier = "b3-claude"

    // A3: Cacheia a resposta boa para o proximo turno
    if (reply && reply.length > 20) {
      await cachePut(question, intent.intent, reply, tier, facts, certainty.certainty)
      learned = true
    }
  }

  // ── D1 + c3: Grounding + Honestidade ──
  const grounding = c3Honesty(reply, facts.map(f => f.excerpt))

  return { reply: grounding.cleanReply || reply, tier, intent, facts, certainty, grounding, cached: false, learned }
}

/** Extractive voice (glass-box, $0) — so cita fatos, sem sintese.
 *  Piso honesto para quando nada funciona. Inspirado no EVO-API dag.rs:438-447. */
export function extractiveReply(facts: { source: string; excerpt: string }[]): string {
  if (facts.length === 0) return "Nao encontrei isso no que sei do ecossistema (KG · corpus-A). Pode reformular ou dar mais contexto?"
  return "Segundo o Knowledge Graph do adsentice:\n\n" + facts.slice(0, 4).map(f => `• [${f.source}] ${f.excerpt.slice(0, 300)}`).join("\n\n")
}
