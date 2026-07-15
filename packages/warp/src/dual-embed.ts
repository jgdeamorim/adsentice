/**
 * packages/warp/src/dual-embed.ts
 * Dual Embed e0+e1 — TypeScript interface para Python fastembed
 *
 * "e0 (MiniLM 384d EN) + e1 (Multilingual MiniLM 384d PT)
 *  Cada payload gera 2 embeddings. Search consulta ambos."
 *
 * O motor real roda em Python (tools/adsentice_dual_embed_ingest.py)
 * porque fastembed é nativo Python (Qdrant). Este arquivo é a interface
 * TypeScript que define tipos, contratos e integração com Qdrant.
 *
 * ADR-0021 · medido=verdade · 2026-07-15 · adsentice
 */

// ═══════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════

export type EmbedModelId = 'e0' | 'e1'

export interface DualEmbedConfig {
  /** e0: EN code (all-MiniLM-L6-v2, 384d) */
  e0: {
    model: string
    dim: 384
    domain: 'code' | 'en-prose'
    normalize: 'lowercase'
    description: string
  }
  /** e1: PT prose/market/design (paraphrase-multilingual-MiniLM-L12-v2, 384d) */
  e1: {
    model: string
    dim: 384
    domain: 'prose' | 'market' | 'design' | 'multilingual'
    normalize: 'preserve_accents'
    description: string
  }
}

/** Configuração canônica (ADR-0021) */
export const DUAL_EMBED_CONFIG: DualEmbedConfig = {
  e0: {
    model: 'sentence-transformers/all-MiniLM-L6-v2',
    dim: 384,
    domain: 'code',
    normalize: 'lowercase',
    description: 'MiniLM 384d — EN code, snippets TypeScript, docs técnicas',
  },
  e1: {
    model: 'sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2',
    dim: 384,
    domain: 'multilingual',
    normalize: 'preserve_accents',
    description: 'Multilingual MiniLM 384d — PT prose, market data, design knowledge',
  },
}

export interface DualEmbedPayload {
  /** ID original do payload */
  id: string
  /** Texto para embedding EN (lowercase, inglês) */
  text_en: string
  /** Texto para embedding PT (com acentos, português) */
  text_pt: string
  /** Metadata original */
  payload: Record<string, unknown>
}

export interface DualSearchRequest {
  /** Query original em português */
  query_pt: string
  /** Query traduzida para inglês (via LLM translate) */
  query_en?: string
  /** Tipo de conteúdo buscado */
  kind?: string
  /** Limite de resultados por modelo */
  limit?: number
}

export interface DualSearchResult {
  /** Resultados mergeados e re-ranqueados */
  hits: DualSearchHit[]
  /** Metadata da busca */
  meta: {
    e0Count: number
    e1Count: number
    dualMatches: number
    model: string
  }
}

export interface DualSearchHit {
  id: string
  score: number
  /** Qual(is) modelo(s) encontraram este hit */
  matchedBy: EmbedModelId[]
  /** Boost por dual match */
  dualBoost: boolean
  payload: Record<string, unknown>
}

// ═══════════════════════════════════════════════════════════════
// Qdrant integration helpers (usados pelo script Python)
// ═══════════════════════════════════════════════════════════════

/** Nome da collection Qdrant */
export const WARP_COLLECTION = 'adsentice-self'

/** Tag que identifica payloads embedados com dual embed */
export const DUAL_EMBED_TAG = 'adsentice-warp'

/**
 * Monta o texto EN para embedding a partir do payload.
 * Estratégia: description + name + triggers (primeiros 10) em lowercase.
 */
export function buildEnEmbedText(payload: Record<string, unknown>): string {
  const parts: string[] = []

  const desc = payload.description as string
  if (desc) parts.push(desc.toLowerCase())

  const name = payload.name as string
  if (name) parts.push(name.toLowerCase())

  const triggers = payload.triggers as string[]
  if (triggers && triggers.length > 0) {
    parts.push(triggers.slice(0, 10).join(' ').toLowerCase())
  }

  const intent = payload.intent as string
  if (intent) parts.push(intent.toLowerCase())

  return parts.join(' ').slice(0, 800)
}

/**
 * Monta o texto PT para embedding a partir do payload.
 * Estratégia: description + name + triggers com ACENTOS preservados.
 */
export function buildPtEmbedText(payload: Record<string, unknown>): string {
  const parts: string[] = []

  const desc = payload.description as string
  if (desc) parts.push(desc)

  const name = payload.name as string
  if (name) parts.push(name)

  const triggers = payload.triggers as string[]
  if (triggers && triggers.length > 0) {
    parts.push(triggers.slice(0, 10).join(' '))
  }

  const intent = payload.intent as string
  if (intent) parts.push(intent)

  return parts.join(' ').slice(0, 800)
}
