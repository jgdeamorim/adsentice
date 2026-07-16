// ══════════════════════════════════════════════════════════════════
// ADSENTICE · Brain c0 — Intent Interpreter (ADR-0011 §Container c0)
// Classifica a natureza da pergunta: ask-explicar, ask-recall, ask-factual.
// Usa Qdrant semantic search na colecao adsentice-self.
// Deterministico · $0 · sem LLM.
// ══════════════════════════════════════════════════════════════════

import "server-only"

export type IntentType = "ask-explicar" | "ask-recall" | "ask-factual"

export interface IntentResult {
  intent: IntentType
  confidence: number
  reasoning: string
}

/** Simple keyword-based intent classifier (deterministic, $0).
 *  Future v0.9: use embedding-based facet search on adsentice-self. */
export function classifyIntent(question: string): IntentResult {
  const q = question.toLowerCase()

  // ── ask-recall: perguntas sobre o que DECIDIMOS / FIZEMOS ──
  const recallPatterns = [
    /o que decidimos/i, /qual foi a decisão/i, /o que foi feito/i,
    /como resolvemos/i, /qual o status/i, /o que implementamos/i,
    /quando.*(?:criamos|fizemos|implementamos|decidimos)/i,
    /qual (?:o|a) (?:ultimo|último|recente)/i,
    /o que (?:já|ja) temos/i, /o que (?:já|ja) foi/i,
    /me lembre/i, /recall/i, /histórico/i, /historia/i,
  ]

  for (const p of recallPatterns) {
    if (p.test(q)) {
      return { intent: "ask-recall", confidence: 0.85, reasoning: "matched recall pattern" }
    }
  }

  // ── ask-explicar: perguntas que pedem EXPLICAÇÃO / COMO FUNCIONA ──
  const explainPatterns = [
    /como funciona/i, /me explica/i, /explica/i, /por que/i, /porque/i,
    /qual a diferença/i, /compare/i, /o que é/i, /o que significa/i,
    /como.*(?:fazer|usar|implementar|criar|rodar|executar)/i,
    /arquitetura/i, /design/i, /padrão/i, /pattern/i,
    /como.*(?:está|esta) estruturado/i,
  ]

  for (const p of explainPatterns) {
    if (p.test(q)) {
      return { intent: "ask-explicar", confidence: 0.80, reasoning: "matched explain pattern" }
    }
  }

  // ── DEFAULT: ask-factual — pergunta direta, objetiva ──
  return { intent: "ask-factual", confidence: 0.70, reasoning: "default (no recall/explain pattern)" }
}

/** Persona + length hints by intent (seguindo dag.rs:475-479). */
export function intentPrompt(mode: IntentType): string {
  switch (mode) {
    case "ask-factual":
      return "Responda em 1-2 frases, direto ao ponto (pergunta factual)."
    case "ask-recall":
      return "Conte o que a gente decidiu/fez, em 2-4 frases, como quem retoma o fio da conversa."
    case "ask-explicar":
      return "Explique com clareza em 2-5 frases, o essencial primeiro."
  }
}
