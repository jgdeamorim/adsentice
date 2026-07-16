// ══════════════════════════════════════════════════════════════════
// ADSENTICE · Brain D1 + c3 — Grounding & Honesty (ADR-0011 §Containers D1+c3)
// D1: a resposta compartilha CONTEUDO com os fatos? (overlap >= 2 palavras)
// c3: poda frases SEM lastro nos fatos. Se 0 sobrevivem → "nao sei".
// Deterministico · $0 · inspirado no EVO-API dag.rs:400-421.
// ══════════════════════════════════════════════════════════════════

import "server-only"

export interface GroundingResult {
  grounded: boolean
  cleanReply: string
  prunedCount: number
  totalSentences: number
  matchedTerms: string[]
}

/** Palavras salientes de um texto (>3 chars, nao-stopword). */
function salientTerms(text: string): Set<string> {
  const STOP = new Set(["que", "qual", "quais", "como", "onde", "porque", "para", "sobre",
    "the", "and", "foi", "sao", "uma", "com", "dos", "das", "nos", "nas", "isso",
    "esse", "essa", "seu", "sua", "nao", "sim", "mais", "pra", "num", "seja", "ser",
    "tem", "seus", "suas", "este", "esta", "entao", "pois"])

  
return new Set(
    text.toLowerCase()
      .split(/[^a-záàâãéêíóôõúç0-9]/)
      .filter(w => w.length > 3 && !STOP.has(w))
  )
}

/** Quebra em frases (fim por . ! ? ou \n). Frases triviais <12 chars sao fundidas. */
function splitSentences(text: string): string[] {
  const out: string[] = []
  let cur = ""

  for (const ch of text) {
    cur += ch

    if (ch === "." || ch === "!" || ch === "?" || ch === "\n") {
      const t = cur.trim()

      if (t.length >= 12) { out.push(t); cur = "" }
    }
  }

  const tail = cur.trim()

  if (tail) out.push(tail)
  
return out
}

/** D1: grounding check — overlap de palavras salientes entre resposta e fatos >= 2. */
export function groundingCheck(reply: string, facts: string[]): { grounded: boolean; matchedTerms: string[] } {
  const r = salientTerms(reply)
  const f = new Set<string>()

  for (const fact of facts.slice(0, 5)) {
    for (const t of salientTerms(fact)) f.add(t)
  }

  const matched = [...r].filter(t => f.has(t))

  
return { grounded: matched.length >= 2, matchedTerms: matched }
}

/** c3: Honestidade — mantem so as frases ancoradas nos fatos.
 *  Frase ancorada = >=2 termos salientes com lastro E >=15% dos termos tem lastro.
 *  Se 0 frases sobrevivem → retorna "Nao encontrei isso no que sei do ecossistema."
 *  Inspirado no EVO-API dag.rs:402-410. */
export function c3Honesty(reply: string, facts: string[]): GroundingResult {
  const factsLow = facts.join(" ").toLowerCase()
  const sentences = splitSentences(reply)
  const total = sentences.length

  const kept = sentences.filter(s => sentenceGrounded(s, factsLow))
  const pruned = total - kept.length
  const clean = kept.join(" ").trim()

  if (!clean) {
    return {
      grounded: false, prunedCount: total, totalSentences: total,
      cleanReply: "Nao encontrei evidencia suficiente para confirmar essa resposta. Pode reformular a pergunta?",
      matchedTerms: [],
    }
  }

  const d1 = groundingCheck(reply, facts)

  
return { grounded: d1.grounded, cleanReply: clean, prunedCount: pruned, totalSentences: total, matchedTerms: d1.matchedTerms }
}

/** Uma frase esta ANCORADA? >=2 termos salientes com lastro E >=15% dos termos tem lastro. */
function sentenceGrounded(sentence: string, factsLow: string): boolean {
  const terms = [...salientTerms(sentence)]

  if (terms.length === 0) return true // conector puro ("a razao e que:") — mantem
  const matched = terms.filter(t => factsLow.includes(t)).length

  
return matched >= 2 && (matched / terms.length) >= 0.15
}
