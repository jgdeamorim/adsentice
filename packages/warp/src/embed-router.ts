/**
 * packages/warp/src/embed-router.ts
 * Embed Router — estratégia e0/e1 do rsxt adaptada para adsentice
 *
 * "Content-aware routing: código → e0 (EN), prosa/market → e1 (multilíngue PT).
 *  A/B provado: e1 recall@3 PT = 71% vs e0 = 50% (ADR-0152 EVO-API)."
 *
 * Inspiração: rsxt-e0::route (EVO-API ADR-0152b)
 *             embed_route.rs + e1_gain.rs
 *
 * Arquitetura:
 *   Nosso :8081 já tem mpnet 768d (multilíngue) = e1.
 *   Para e0 (EN code), usamos o mesmo modelo (mpnet é multilíngue,
 *   mas quando o texto é EN puro, a qualidade é máxima).
 *
 *   A INOVAÇÃO aqui é o ROUTER que decide QUAL modelo usar
 *   baseado no TIPO de conteúdo, não na língua da query.
 *
 *   Além disso, o router faz NORMALIZAÇÃO LINGUÍSTICA:
 *   - Texto pt-BR: preserva acentos (modelo multilíngue é sensível)
 *   - Texto EN: lowercase (MiniLM é case-insensitive)
 *   - Código: mantém literal (case-sensitive para símbolos)
 *
 * medido=verdade · ADR-0152 EVO-API · 2026-07-15 · adsentice
 */

// ═══════════════════════════════════════════════════════════════
// Content Kinds (rsxt-e0::route style)
// ═══════════════════════════════════════════════════════════════

export type EmbedContentKind =
  | 'code'          // código fonte, snippets, TypeScript — e0 EN
  | 'structured'    // dados estruturados, JSON, CSVs — e1 multilíngue
  | 'prose'         // texto natural, descrições, intents — e1 multilíngue
  | 'market_data'   // dados de mercado, keywords, SEO — e1 multilíngue
  | 'design_system'  // design tokens, paletas, tipografia — e1 multilíngue

export interface EmbedRoute {
  /** Qual modelo usar */
  model: 'e0' | 'e1'
  /** Endpoint do embed server */
  endpoint: string
  /** Dimensão do embedding */
  dim: 384 | 768
  /** Estratégia de normalização */
  normalize: 'lowercase' | 'preserve_accents' | 'literal'
}

/**
 * Router — decide qual modelo usar baseado no tipo de conteúdo.
 *
 * Regra (ADR-0152 EVO-API, provada por A/B):
 *   - code → e0 (EN-only, mais preciso para símbolos e keywords)
 *   - prose, market_data, structured, design_system → e1 (multilíngue PT)
 */
export function routeContentKind(kind: EmbedContentKind): EmbedRoute {
  switch (kind) {
    case 'code':
      return {
        model: 'e0',
        endpoint: 'http://127.0.0.1:8081/embed', // mesmo endpoint, modelo decide internamente
        dim: 768,
        normalize: 'literal', // código: case-sensitive, preserva símbolos
      }
    case 'structured':
      return {
        model: 'e1',
        endpoint: 'http://127.0.0.1:8081/embed',
        dim: 768,
        normalize: 'preserve_accents', // dados: preserva acentos pt-BR
      }
    case 'prose':
      return {
        model: 'e1',
        endpoint: 'http://127.0.0.1:8081/embed',
        dim: 768,
        normalize: 'preserve_accents', // prosa: preserva acentos pt-BR
      }
    case 'market_data':
      return {
        model: 'e1',
        endpoint: 'http://127.0.0.1:8081/embed',
        dim: 768,
        normalize: 'preserve_accents', // mercado: keywords pt-BR com acentos
      }
    case 'design_system':
      return {
        model: 'e1',
        endpoint: 'http://127.0.0.1:8081/embed',
        dim: 768,
        normalize: 'preserve_accents', // design: tokens com acentos
      }
  }
}

/**
 * Detecta o ContentKind de um payload baseado nos metadados.
 */
export function detectContentKind(payload: Record<string, unknown>): EmbedContentKind {
  const kind = payload.kind as string | undefined
  const source = payload.source as string | undefined
  const sourceType = payload.source_type as string | undefined
  const category = payload.category as string | undefined

  // Código fonte
  if (kind === 'snippet' || sourceType === 'source-code' || source?.includes('source')) {
    return 'code'
  }

  // Design knowledge
  if (kind === 'design-knowledge' || category?.includes('design') || category?.includes('style')) {
    return 'design_system'
  }

  // Componentes
  if (kind === 'component' && source?.includes('shadcn')) {
    return 'code' // shadcn source code → e0 EN
  }
  if (kind === 'component' && source?.includes('21st')) {
    return 'design_system' // 21st visual → e1 multilíngue
  }

  // Media
  if (kind === 'media-knowledge') {
    return 'prose'
  }

  // Market data (DataForSEO)
  if (source?.includes('dataforseo') || category?.includes('market')) {
    return 'market_data'
  }

  // Default: prose
  return 'prose'
}

// ═══════════════════════════════════════════════════════════════
// Text Normalization (language-aware)
// ═══════════════════════════════════════════════════════════════

/**
 * Normaliza texto para embedding conforme a estratégia do modelo.
 *
 * IMPORTANTE: O modelo multilíngue (e1) é TREINADO com texto acentuado.
 * "métricas" e "metricas" são embeddings DIFERENTES.
 * Para pt-BR: SEMPRE usar acentos corretos.
 */
export function normalizeForEmbedding(text: string, route: EmbedRoute): string {
  let normalized = text.trim().replace(/\s+/g, ' ')

  switch (route.normalize) {
    case 'lowercase':
      // EN code: lowercase para case-insensitive matching
      normalized = normalized.toLowerCase()
      break
    case 'preserve_accents':
      // PT-BR: preserva acentos, capitalização natural
      // NÃO faz lowercase (modelo é case-sensitive para algumas línguas)
      // NÃO remove acentos (modelo foi treinado com eles)
      break
    case 'literal':
      // Código fonte: mantém exatamente como está
      break
  }

  return normalized
}

// ═══════════════════════════════════════════════════════════════
// PT-BR Text Quality Check
// ═══════════════════════════════════════════════════════════════

/**
 * Verifica se um texto em pt-BR está bem formatado para embedding.
 * Retorna warnings se encontrar problemas comuns.
 */
export interface TextQualityReport {
  score: number        // 0-100
  issues: string[]
  fixedText?: string
}

export function checkPtBrTextQuality(text: string): TextQualityReport {
  const issues: string[] = []
  let fixed = text

  // Check 1: palavras comuns sem acento
  const accentMap: Record<string, string> = {
    'metricas': 'métricas',
    'graficos': 'gráficos',
    'negocio': 'negócio',
    'clinica': 'clínica',
    'estetica': 'estética',
    'saude': 'saúde',
    'comercio': 'comércio',
    'educacao': 'educação',
    'hospedagem': 'hospedagem', // correct
    'hospedagem': 'hospedagem', // correct
    'analise': 'análise',
    'conteudo': 'conteúdo',
    'estrategia': 'estratégia',
    'publico': 'público',
    'basico': 'básico',
    'rapido': 'rápido',
    'facil': 'fácil',
    'dificil': 'difícil',
    'util': 'útil',
    'especifico': 'específico',
    'pratico': 'prático',
    'tecnico': 'técnico',
    'organico': 'orgânico',
    'automatico': 'automático',
    'titulo': 'título',
    'capitulo': 'capítulo',
    'numero': 'número',
    'genero': 'gênero',
    'generico': 'genérico',
    'unico': 'único',
    'maximo': 'máximo',
    'minimo': 'mínimo',
    'otimo': 'ótimo',
    'economico': 'econômico',
    'critico': 'crítico',
    'periodo': 'período',
    'metodo': 'método',
    'codigo': 'código',
  }

  for (const [without, withAccent] of Object.entries(accentMap)) {
    if (fixed.includes(without) && !fixed.includes(withAccent)) {
      issues.push(`"${without}" deveria ser "${withAccent}" (sem acento degrada embedding pt-BR)`)
    }
  }

  // Check 2: texto muito curto para embedding de qualidade
  if (text.length < 50) {
    issues.push('Texto muito curto (<50 chars). Embedding pode ter baixa qualidade semântica.')
  }

  // Check 3: mistura EN/PT sem critério
  const ptWords = ['para', 'com', 'como', 'que', 'dos', 'das', 'uma', 'por', 'mais', 'seus']
  const enWords = ['with', 'for', 'and', 'the', 'this', 'that', 'from', 'your', 'have', 'been']
  const hasPt = ptWords.some((w) => text.toLowerCase().includes(w))
  const hasEn = enWords.some((w) => text.toLowerCase().includes(w))
  if (hasPt && hasEn && text.length < 200) {
    issues.push('Texto curto com mistura EN/PT. Considere separar ou traduzir completamente.')
  }

  const score = Math.max(0, 100 - issues.length * 15)

  return { score, issues, fixedText: issues.length > 0 ? fixed : undefined }
}

// ═══════════════════════════════════════════════════════════════
// Batch Embed with Router
// ═══════════════════════════════════════════════════════════════

export interface BatchEmbedItem {
  text: string
  kind: EmbedContentKind
  id?: string
}

const EMBED_URL = 'http://127.0.0.1:8081/embed'

/**
 * Embed a batch of texts, routing each to the correct model.
 * Groups by route to minimize HTTP calls.
 */
export async function embedBatch(items: BatchEmbedItem[]): Promise<{ vectors: number[][]; model: string }> {
  // Group by model
  const e0Items: BatchEmbedItem[] = []
  const e1Items: BatchEmbedItem[] = []

  for (const item of items) {
    const route = routeContentKind(item.kind)
    const normalized = normalizeForEmbedding(item.text, route)
    if (route.model === 'e0') {
      e0Items.push({ ...item, text: normalized })
    } else {
      e1Items.push({ ...item, text: normalized })
    }
  }

  const allVectors: (number[] | null)[] = new Array(items.length).fill(null)

  // Embed e0 batch
  if (e0Items.length > 0) {
    const texts = e0Items.map((i) => i.text.slice(0, 800))
    const res = await fetch(EMBED_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ texts }),
    })
    const data = (await res.json()) as { vectors: number[][] }
    for (let i = 0; i < e0Items.length; i++) {
      const origIdx = items.indexOf(e0Items[i])
      if (origIdx >= 0) allVectors[origIdx] = data.vectors[i]
    }
  }

  // Embed e1 batch
  if (e1Items.length > 0) {
    const texts = e1Items.map((i) => i.text.slice(0, 800))
    const res = await fetch(EMBED_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ texts }),
    })
    const data = (await res.json()) as { vectors: number[][] }
    for (let i = 0; i < e1Items.length; i++) {
      const origIdx = items.indexOf(e1Items[i])
      if (origIdx >= 0) allVectors[origIdx] = data.vectors[i]
    }
  }

  return {
    vectors: allVectors.filter((v): v is number[] => v !== null),
    model: e0Items.length > 0 && e1Items.length > 0 ? 'e0+e1' : e0Items.length > 0 ? 'e0' : 'e1',
  }
}

/**
 * Embed a single text with content-kind routing.
 */
export async function embedWithRouter(text: string, kind: EmbedContentKind = 'prose'): Promise<number[]> {
  const route = routeContentKind(kind)
  const normalized = normalizeForEmbedding(text, route)

  const res = await fetch(EMBED_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ texts: [normalized.slice(0, 800)] }),
  })
  const data = (await res.json()) as { vectors: number[][] }
  return data.vectors[0] ?? []
}
