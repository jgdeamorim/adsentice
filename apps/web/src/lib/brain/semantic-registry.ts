// ══════════════════════════════════════════════════════════════════
// ADSENTICE · Semantic Registry (SGA PoC)
// Camada unica de orquestracao entre Qdrant + Redis + Supabase.
// 4 camadas: Capabilities → Signals → Hubs → Products
// ══════════════════════════════════════════════════════════════════

import "server-only"
import { createHash } from "crypto"

export interface SemanticNode {
  id: string
  type: "capability" | "signal" | "hub" | "product"
  name: string
  description: string
  intent: string
  props: Record<string, unknown>
  edges: string[]
  mutationId: number
  version: number
  tags: string[]
}

export interface RegistryQuery {
  intent?: string
  component?: string
  tags?: string[]
  maxResults?: number
}

export interface RegistryResult {
  nodes: SemanticNode[]
  resolved: boolean
  mutationId: number
  traceMs: number
  source: "cache" | "qdrant" | "composed"
  graphSummary: { totalNodes: number; types: string[]; edges: number }
}

const NODE_DB: Map<string, SemanticNode> = new Map()
let _globalMutation = 0
let _seeded = false

function nextMutationId(): number { _globalMutation++; return _globalMutation }

export function getMutationId(): number { return _globalMutation }

export function incrementMutation(nodeIds: string[]): number {
  const mid = nextMutationId()
  for (const id of nodeIds) {
    const node = NODE_DB.get(id)
    if (node) { node.mutationId = mid; node.version++ }
  }
  return mid
}

function seedRegistry() {
  const nodes: SemanticNode[] = [
    // ═══ L1: CAPABILITIES (o que FAZ) ═══
    { id: "cap.gmb-search", type: "capability", name: "GMB Search", description: "Busca negocios no Google Maps por categoria, localizacao e raio.", intent: "descobrir negocios locais no Google Maps", props: { layer: "L0", cost: "$0.015" }, edges: ["cap.gmb-profile", "signal.fit", "signal.engagement", "signal.intent"], mutationId: 1, version: 1, tags: ["L0", "gmb", "discovery"] },
    { id: "cap.gmb-profile", type: "capability", name: "GMB Profile Enrichment", description: "Extrai 27 campos canonicos do Google Meu Negocio.", intent: "enriquecer perfil completo do GMB", props: { layer: "L1", cost: "$0.0054", fields: 27 }, edges: ["cap.website-audit", "cap.voc-extract", "signal.fit", "signal.engagement"], mutationId: 1, version: 1, tags: ["L1", "gmb", "profile"] },
    { id: "cap.website-audit", type: "capability", name: "Website SEO Audit", description: "Auditoria tecnica: onpage score, meta tags, word count, 60+ checks SEO.", intent: "auditar qualidade tecnica do website", props: { layer: "L2", cost: "$0.010125", fields: 20 }, edges: ["cap.content-gap", "cap.schema-validate", "cap.architecture-analyze", "signal.website"], mutationId: 1, version: 1, tags: ["L2", "website", "seo"] },
    { id: "cap.content-gap", type: "capability", name: "Content Gap Analyzer", description: "Classifica maturidade de conteudo em 5 niveis. 8 sinais C1-C8.", intent: "analisar maturidade de conteudo do site", props: { layer: "L2.5", cost: "$0", signals: 8 }, edges: ["signal.content", "cap.market-intel"], mutationId: 1, version: 1, tags: ["L2.5", "content", "maturity"] },
    { id: "cap.schema-validate", type: "capability", name: "Schema Validator", description: "Valida JSON-LD. Auto-gera schema LocalBusiness faltante.", intent: "validar e auto-gerar dados estruturados", props: { layer: "L2", cost: "$0", signals: 3 }, edges: ["signal.schema", "hub.website"], mutationId: 1, version: 1, tags: ["L2", "schema", "jsonld"] },
    { id: "cap.architecture-analyze", type: "capability", name: "Site Architecture Analyzer", description: "Analisa estrutura: flat vs hierarchical, orphan pages, navigation depth.", intent: "analisar arquitetura de navegacao", props: { layer: "L2", cost: "$0", signals: 4 }, edges: ["signal.architecture", "hub.website"], mutationId: 1, version: 1, tags: ["L2", "architecture", "navigation"] },
    { id: "cap.voc-extract", type: "capability", name: "Voice of Customer Extractor", description: "Minera avaliacoes Google. Extrai sentimento, keywords, pontos de dor.", intent: "extrair voz do cliente das avaliacoes", props: { layer: "L3", cost: "~$0.005" }, edges: ["signal.voc", "hub.reputation", "cap.gmb-profile"], mutationId: 1, version: 1, tags: ["L3", "voc", "reviews"] },
    { id: "cap.competitive-intel", type: "capability", name: "Competitive Intelligence", description: "TOP 5 concorrentes + keyword gap + backlinks. Detecta gaps competitivos.", intent: "analisar concorrencia local e gaps", props: { layer: "L3", cost: "~$0.08" }, edges: ["signal.competitive", "hub.competitive", "cap.market-intel"], mutationId: 1, version: 1, tags: ["L3", "competitive", "concorrentes"] },
    { id: "cap.social-detect", type: "capability", name: "Social Media Detection", description: "Detecta Instagram, Facebook, TikTok, YouTube, LinkedIn no site/GMB.", intent: "detectar presenca em redes sociais", props: { layer: "L2", cost: "$0", platforms: 5 }, edges: ["signal.social", "hub.social"], mutationId: 2, version: 1, tags: ["L2", "social", "detection"] },
    { id: "cap.marketplace-detect", type: "capability", name: "Marketplace Detection", description: "Detecta iFood, Rappi, Booking, Mercado Livre, GetNinjas, Doctoralia.", intent: "detectar presenca em marketplaces", props: { layer: "L2", cost: "$0", platforms: 8 }, edges: ["signal.channel", "hub.marketplaces"], mutationId: 2, version: 1, tags: ["L2", "marketplaces", "detection"] },
    { id: "cap.market-intel", type: "capability", name: "Market Intelligence Engine", description: "Agrega dados por categoria x regiao. TOP 10 gaps, TAM, densidade, MRR.", intent: "gerar inteligencia de mercado agregada", props: { layer: "v0.6", cost: "$0", functions: 6 }, edges: ["signal.market", "hub.gmb", "cap.competitive-intel"], mutationId: 1, version: 1, tags: ["v0.6", "market", "aggregate"] },
    { id: "cap.brain-ooda", type: "capability", name: "Brain OODA Loop", description: "12 containers. c0→c1→B2→B3 (bypass/cache/Claude).", intent: "processar perguntas com inteligencia cognitiva", props: { layer: "v0.7", modules: 6, containers: 12 }, edges: ["cap.kg-recall", "cap.cache-pattern", "cap.grounding"], mutationId: 3, version: 1, tags: ["v0.7", "brain", "ooda"] },
    { id: "cap.kg-recall", type: "capability", name: "KG-First Recall (DAG)", description: "Busca cross-KG + git log + filesystem + sintese. medido=verdade.", intent: "recuperar conhecimento com fontes auditaveis", props: { layer: "v0.5", cost: "$0", steps: 5 }, edges: ["cap.brain-ooda", "hub.qdrant"], mutationId: 1, version: 1, tags: ["v0.5", "dag", "kg"] },
    { id: "cap.grounding", type: "capability", name: "Grounding & Honesty (c3+D1)", description: "Overlap palavras resposta↔fatos. Poda frases sem lastro.", intent: "garantir respostas ancoradas em fatos", props: { layer: "v0.7", cost: "$0" }, edges: ["cap.brain-ooda", "signal.trust"], mutationId: 3, version: 1, tags: ["v0.7", "grounding", "honesty"] },
    { id: "cap.cache-pattern", type: "capability", name: "Pattern Cache (A3)", description: "Redis cache blake3 + watermark corpus. Aprende sozinho.", intent: "cachear respostas para bypass futuro", props: { layer: "v0.7", ttl: "30d", backend: "Redis :6396" }, edges: ["cap.brain-ooda"], mutationId: 3, version: 1, tags: ["v0.7", "cache", "a3"] },
    { id: "cap.customer-loyalty", type: "capability", name: "Customer Loyalty Engine", description: "Mede recorrencia, RFM (Recency/Frequency/Monetary), segmentacao de clientes, churn prediction.", intent: "fidelizar clientes e medir recorrencia de compra", props: { layer: "v0.8", cost: "$0", metrics: ["RFM", "churn", "LTV"] }, edges: ["signal.loyalty", "hub.customer", "product.sentinela"], mutationId: 4, version: 1, tags: ["v0.8", "loyalty", "fidelizacao", "retencao", "RFM", "recorrencia"] },

    // ═══ L2: SIGNALS (o que MEDE) ═══
    { id: "signal.fit", type: "signal", name: "Fit (ICP Match)", description: "10 sinais F1-F10. Avalia encaixe no perfil ideal.", intent: "avaliar encaixe no perfil de cliente ideal", props: { count: 10, maxRaw: 75, weight: 0.40 }, edges: ["signal.compound", "cap.gmb-search"], mutationId: 1, version: 1, tags: ["fit", "icp"] },
    { id: "signal.engagement", type: "signal", name: "Engagement", description: "19 sinais E+W. Mede atividade digital.", intent: "medir atividade digital", props: { count: 19, maxRaw: 88, weight: 0.35 }, edges: ["signal.compound", "cap.website-audit"], mutationId: 1, version: 1, tags: ["engagement", "digital"] },
    { id: "signal.intent", type: "signal", name: "Intent (Urgency)", description: "9 sinais I+S+R. Detecta urgencia de compra.", intent: "detectar urgencia e prontidao para compra", props: { count: 9, maxRaw: 80, weight: 0.25 }, edges: ["signal.compound", "cap.gmb-search", "cap.voc-extract"], mutationId: 1, version: 1, tags: ["intent", "urgencia"] },
    { id: "signal.website", type: "signal", name: "Website Health", description: "12 sinais W1-W12. HTTPS, CWV, meta, analytics, CMS, backlinks.", intent: "medir saude tecnica do website", props: { count: 12, maxRaw: 88 }, edges: ["signal.engagement", "cap.website-audit"], mutationId: 1, version: 1, tags: ["website", "W1-W12"] },
    { id: "signal.content", type: "signal", name: "Content Maturity", description: "8 sinais C1-C8. Conteudo raso, metadata, arquitetura, buyer gap.", intent: "medir maturidade da estrategia de conteudo", props: { count: 8, maxRaw: 55 }, edges: ["signal.engagement", "cap.content-gap"], mutationId: 1, version: 1, tags: ["content", "C1-C8"] },
    { id: "signal.architecture", type: "signal", name: "Site Architecture", description: "4 sinais A1-A4. Estrutura plana, orfa, sem nav, so-texto.", intent: "medir qualidade da navegacao", props: { count: 4, maxRaw: 25 }, edges: ["signal.fit", "cap.architecture-analyze"], mutationId: 1, version: 1, tags: ["architecture", "A1-A4"] },
    { id: "signal.schema", type: "signal", name: "Schema Quality", description: "3 sinais S1-S3. Sem LocalBusiness/Organization, schema invalido.", intent: "medir qualidade de dados estruturados", props: { count: 3, maxRaw: 33 }, edges: ["signal.intent", "cap.schema-validate"], mutationId: 1, version: 1, tags: ["schema", "S1-S3"] },
    { id: "signal.competitive", type: "signal", name: "Competitive Position", description: "4 sinais K1-K4. Gap (+20), leader (+10), cannibalization (+8), uncontested (+5).", intent: "medir posicao competitiva no mercado", props: { count: 4, maxRaw: 43 }, edges: ["signal.intent", "cap.competitive-intel"], mutationId: 1, version: 1, tags: ["competitive", "K1-K4"] },
    { id: "signal.voc", type: "signal", name: "Voice of Customer", description: "3 sinais R1-R3. Sentimento negativo (+15), response gap (+10), language mismatch (+8).", intent: "medir sentimento do cliente", props: { count: 3, maxRaw: 33 }, edges: ["signal.intent", "cap.voc-extract"], mutationId: 1, version: 1, tags: ["voc", "R1-R3"] },
    { id: "signal.social", type: "signal", name: "Social Presence", description: "4 sinais. Presence +10, Engagement +15, Consistency +10, Commerce +5.", intent: "medir maturidade em redes sociais", props: { count: 4, maxRaw: 40 }, edges: ["signal.engagement", "cap.social-detect"], mutationId: 2, version: 1, tags: ["social"] },
    { id: "signal.channel", type: "signal", name: "Channel Health", description: "Independence + Channel Health + Commission + Marketplace Reputation.", intent: "medir saude dos canais de venda", props: { count: 4, maxRaw: 40 }, edges: ["signal.intent", "cap.marketplace-detect"], mutationId: 2, version: 1, tags: ["channel", "ifood"] },
    { id: "signal.market", type: "signal", name: "Market Position", description: "TOP 10 gaps, TAM, densidade, MRR. Agregado por categoria x regiao.", intent: "medir posicao no mercado local", props: { cost: "$0", source: "Supabase" }, edges: ["signal.competitive", "cap.market-intel"], mutationId: 1, version: 1, tags: ["market", "TAM"] },
    { id: "signal.loyalty", type: "signal", name: "Customer Loyalty", description: "RFM (Recency/Frequency/Monetary), taxa de recompra, LTV, churn risk.", intent: "medir fidelizacao e recorrencia de clientes", props: { count: 4, maxRaw: 40, dimension: "Engagement" }, edges: ["signal.engagement", "cap.customer-loyalty"], mutationId: 4, version: 1, tags: ["loyalty", "RFM", "fidelizacao", "recorrencia"] },
    { id: "signal.trust", type: "signal", name: "Trust & Quality", description: "Grounding check + Honesty filter. Resposta sempre cita fonte.", intent: "garantir confiabilidade", props: { cost: "$0" }, edges: ["signal.compound", "cap.grounding"], mutationId: 3, version: 1, tags: ["trust", "grounding"] },
    { id: "signal.compound", type: "signal", name: "Compound Score", description: "Fitx0.40 + Engx0.35 + Intx0.25. Schwartz 5 niveis.", intent: "calcular score composto", props: { formula: "0.40F+0.35E+0.25I", levels: 5 }, edges: ["hub.scoring", "hub.cockpit"], mutationId: 1, version: 1, tags: ["compound", "scoring"] },

    // ═══ L3: HUBS (onde ENTREGA) ═══
    { id: "hub.scoring", type: "hub", name: "Scoring Engine", description: "37 sinais em 9 dimensoes. Pipeline completo.", intent: "entregar pontuacao de maturidade digital", props: { signals: 37, dimensions: 9 }, edges: ["hub.cockpit", "product.raio-x", "product.sentinela"], mutationId: 1, version: 1, tags: ["hub", "scoring"] },
    { id: "hub.cockpit", type: "hub", name: "Cockpit TOP-K", description: "Dashboard diario. NarrativeCard+AlertLane+Copilot+PatchCard.", intent: "entregar dashboard executivo diario", props: { components: 4 }, edges: ["hub.gmb", "hub.website", "hub.reputation", "hub.social", "hub.competitive", "product.sentinela", "product.dominio"], mutationId: 2, version: 1, tags: ["hub", "cockpit"] },
    { id: "hub.gmb", type: "hub", name: "Local Presence Hub", description: "Google Meu Negocio. 27 campos.", intent: "gerenciar presenca no Google", props: { layer: "L0+L1", fields: 27 }, edges: ["cap.gmb-search", "cap.gmb-profile", "hub.cockpit", "product.sentinela"], mutationId: 1, version: 1, tags: ["hub", "gmb"] },
    { id: "hub.website", type: "hub", name: "Website Hub", description: "OnPage+Technologies+Schema+Architecture. 20 colunas L2.", intent: "auditar website", props: { layer: "L2", columns: 20 }, edges: ["cap.website-audit", "cap.schema-validate", "hub.cockpit", "product.sentinela"], mutationId: 1, version: 1, tags: ["hub", "website"] },
    { id: "hub.reputation", type: "hub", name: "Reputation Hub", description: "Avaliacoes Google + sentimento + keywords dos clientes.", intent: "monitorar reputacao online", props: { sources: ["Google", "iFood", "Booking"] }, edges: ["cap.voc-extract", "hub.cockpit", "product.dominio"], mutationId: 1, version: 1, tags: ["hub", "reputation"] },
    { id: "hub.competitive", type: "hub", name: "Competitive Intelligence Hub", description: "TOP 5 concorrentes + keyword gap + Radar de Mercado.", intent: "entregar inteligencia competitiva", props: { layer: "L3", cost: "~$0.08" }, edges: ["cap.competitive-intel", "hub.cockpit", "product.dominio"], mutationId: 1, version: 1, tags: ["hub", "competitive"] },
    { id: "hub.social", type: "hub", name: "Social Media Hub", description: "Instagram, Facebook, TikTok, YouTube, LinkedIn.", intent: "monitorar redes sociais", props: { platforms: 5 }, edges: ["cap.social-detect", "hub.cockpit", "product.escala"], mutationId: 2, version: 1, tags: ["hub", "social"] },
    { id: "hub.marketplaces", type: "hub", name: "Marketplaces Hub", description: "iFood, Rappi, Booking, Mercado Livre. Customer Independence.", intent: "unificar dados de marketplaces", props: { platforms: 8 }, edges: ["cap.marketplace-detect", "hub.cockpit", "product.dominio"], mutationId: 2, version: 1, tags: ["hub", "marketplaces"] },
    { id: "hub.customer", type: "hub", name: "Customer Hub", description: "RFM, segmentacao, datas especiais, preferencias. Visao unica do cliente.", intent: "unificar visao do cliente em todos os canais", props: { metrics: ["RFM", "LTV", "churn", "segmentos"] }, edges: ["cap.customer-loyalty", "signal.loyalty", "hub.cockpit", "product.sentinela"], mutationId: 4, version: 1, tags: ["hub", "customer", "fidelizacao"] },
    { id: "hub.qdrant", type: "hub", name: "Knowledge Graph (Qdrant)", description: "4 colecoes, 32K+ pontos. Embed mpnet 768d.", intent: "armazenar conhecimento semantico", props: { collections: 4, points: "32K+" }, edges: ["cap.kg-recall", "cap.brain-ooda"], mutationId: 1, version: 1, tags: ["hub", "qdrant"] },

    // ═══ L4: PRODUCTS (como EMPACOTA) ═══
    { id: "product.raio-x", type: "product", name: "Raio-X (Lead Magnet)", description: "Diagnostico gratuito. Score+Schwartz+TOP 3 gaps. Porta do funil.", intent: "converter leads com diagnostico gratuito", props: { price: "R$0", layers: "L0+L1+L2" }, edges: ["hub.scoring", "hub.gmb", "hub.website", "product.sentinela"], mutationId: 1, version: 1, tags: ["free", "lead-magnet", "produto"] },
    { id: "product.sentinela", type: "product", name: "Sentinela (R$197/mes)", description: "Monitoramento mensal + Cockpit TOP-K diario + Customer Loyalty. SEO Local continuo.", intent: "monitorar saude digital e fidelizar clientes", props: { price: "R$197/mes", margin: "95%" }, edges: ["hub.cockpit", "hub.gmb", "hub.website", "hub.scoring", "hub.customer", "product.raio-x", "product.dominio"], mutationId: 1, version: 1, tags: ["starter", "R$197", "produto"] },
    { id: "product.dominio", type: "product", name: "Dominio (R$497/mes)", description: "Sentinela + Competitive Intelligence + Radar de Mercado.", intent: "dominar mercado local com inteligencia competitiva", props: { price: "R$497/mes", margin: "95%" }, edges: ["hub.competitive", "hub.marketplaces", "hub.reputation", "product.sentinela", "product.escala"], mutationId: 1, version: 1, tags: ["pro", "R$497", "produto"] },
    { id: "product.escala", type: "product", name: "Escala (R$997/mes)", description: "Dominio + AI Daily Briefing + Copilot IA + Social Strategy.", intent: "escalar presenca digital com IA", props: { price: "R$997/mes", margin: "95%" }, edges: ["hub.social", "cap.brain-ooda", "product.dominio", "product.growth-os"], mutationId: 1, version: 1, tags: ["scale", "R$997", "produto"] },
    { id: "product.growth-os", type: "product", name: "Growth OS (R$1.497/mes)", description: "Para agencias. Multi-user, white-label, client portal, API access.", intent: "gerenciar multiplos clientes com equipe", props: { price: "R$1.497/mes", tiers: 4 }, edges: ["product.escala", "hub.cockpit"], mutationId: 1, version: 1, tags: ["enterprise", "agencia", "produto"] },
  ]

  for (const n of nodes) NODE_DB.set(n.id, n)
}

// ── Vector Search (PoC: fuzzy match nos intents/tags/nomes) ─
function vectorSearch(intent: string, maxResults: number = 10): SemanticNode[] {
  const query = intent.toLowerCase()
  const scored: { node: SemanticNode; score: number }[] = []
  for (const node of NODE_DB.values()) {
    let score = 0
    const nameLow = node.name.toLowerCase()
    const descLow = node.description.toLowerCase()
    const intentLow = node.intent.toLowerCase()
    const tagsLow = node.tags.join(" ").toLowerCase()
    for (const w of query.split(/\s+/)) {
      if (intentLow.includes(w)) score += 4
      if (nameLow.includes(w)) score += 3
      if (descLow.includes(w)) score += 2
      if (tagsLow.includes(w)) score += 1
    }
    if (score > 0) scored.push({ node, score })
  }
  scored.sort((a, b) => b.score - a.score)
  return scored.slice(0, maxResults).map(s => s.node)
}

// ── Graph Resolver: BFS 1 nivel ──
function resolveEdges(node: SemanticNode): SemanticNode[] {
  const resolved: SemanticNode[] = [node]
  const seen = new Set<string>([node.id])
  for (const edgeId of node.edges) {
    if (seen.has(edgeId)) continue
    const edgeNode = NODE_DB.get(edgeId)
    if (!edgeNode) continue
    seen.add(edgeId)
    resolved.push(edgeNode)
  }
  return resolved
}

// ── Cache ──
const RESOLVE_CACHE = new Map<string, { nodes: SemanticNode[]; mutationId: number; ts: number }>()

function cacheKey(query: RegistryQuery): string {
  return createHash("sha256").update(JSON.stringify(query)).digest("hex").slice(0, 12)
}

// ── Registry Resolve ──
export async function registryResolve(query: RegistryQuery): Promise<RegistryResult> {
  const t0 = Date.now()
  if (!_seeded) { seedRegistry(); _seeded = true }

  const key = cacheKey(query)
  const cached = RESOLVE_CACHE.get(key)
  if (cached && cached.mutationId === _globalMutation) {
    return { nodes: cached.nodes, resolved: true, mutationId: _globalMutation, traceMs: Date.now() - t0, source: "cache", graphSummary: { totalNodes: cached.nodes.length, types: [...new Set(cached.nodes.map(n => n.type))], edges: cached.nodes.reduce((s, n) => s + n.edges.length, 0) } }
  }

  let nodes = vectorSearch(query.intent || "", query.maxResults || 10)
  if (query.tags && query.tags.length > 0) {
    nodes = nodes.filter(n => query.tags!.some(t => n.tags.includes(t)))
  }

  const resolvedIds = new Set<string>()
  const graphNodes: SemanticNode[] = []
  for (const node of nodes) {
    for (const n of resolveEdges(node)) {
      if (!resolvedIds.has(n.id)) { resolvedIds.add(n.id); graphNodes.push(n) }
    }
  }

  RESOLVE_CACHE.set(key, { nodes: graphNodes, mutationId: _globalMutation, ts: Date.now() })
  return { nodes: graphNodes, resolved: true, mutationId: _globalMutation, traceMs: Date.now() - t0, source: "composed", graphSummary: { totalNodes: graphNodes.length, types: [...new Set(graphNodes.map(n => n.type))], edges: graphNodes.reduce((s, n) => s + n.edges.length, 0) } }
}

export function ensureSeeded() { if (!_seeded) { seedRegistry(); _seeded = true } }
