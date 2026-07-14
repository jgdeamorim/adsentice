// ══════════════════════════════════════════════════════════════════
// ADSENTICE · Brain B2 — Self-Score / Certainty (ADR-0011 §Container B2)
// Calcula certainty (0-1) da resposta: >=0.80 = bypass ($0, sem LLM).
// Fatores: factsFound + commitsMatched + filesystemSources + lexicalMatch.
// Deterministico · $0 · O GATE do bypass.
// ══════════════════════════════════════════════════════════════════

import "server-only"
import type { RankedHit } from "./c1-retriever"

export interface CertaintyResult {
  certainty: number
  confident: boolean // certainty >= 0.80
  breakdown: {
    factsScore: number
    commitsScore: number
    filesystemScore: number
    lexicalScore: number
  }
  reasoning: string
}

/** Calcula self-score: quao confiavel e a resposta sem consultar LLM?
 *  Formula: 0.35·facts + 0.25·commits + 0.20·filesystem + 0.20·lexical */
export function computeCertainty(
  hits: RankedHit[],
  commitsFound: number,
  filesystemSources: number,
  question: string,
): CertaintyResult {
  // Facts: quantos hits de alta autoridade temos?
  const highAuthHits = hits.filter(h => h.authority >= 0.60).length
  const factsScore = Math.min(highAuthHits / 5, 1.0)

  // Commits: quantos commits relevantes foram encontrados?
  const commitsScore = Math.min(commitsFound / 3, 1.0)

  // Filesystem: quantos arquivos fonte foram lidos?
  const filesystemScore = Math.min(filesystemSources / 2, 1.0)

  // Lexical: qual a media do lexical match nos top hits?
  const top3Lexical = hits.slice(0, 3).reduce((s, h) => s + h.lexical, 0) / Math.max(hits.slice(0, 3).length, 1)
  const lexicalScore = top3Lexical

  const certainty = 0.35 * factsScore + 0.25 * commitsScore + 0.20 * filesystemScore + 0.20 * lexicalScore

  return {
    certainty: Math.round(certainty * 1000) / 1000,
    confident: certainty >= 0.80,
    breakdown: { factsScore, commitsScore, filesystemScore, lexicalScore },
    reasoning: certainty >= 0.80
      ? `Alta confianca (${Math.round(certainty*100)}%): ${highAuthHits} fatos autoritativos, ${commitsFound} commits, ${filesystemSources} arquivos fonte. Bypass — resposta sem LLM.`
      : certainty >= 0.50
        ? `Media confianca (${Math.round(certainty*100)}%): ${highAuthHits} fatos, ${commitsFound} commits. Consultar cache ou LLM.`
        : `Baixa confianca (${Math.round(certainty*100)}%): apenas ${highAuthHits} fatos relevantes. Necessario LLM.`,
  }
}
