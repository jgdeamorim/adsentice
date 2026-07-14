// ══════════════════════════════════════════════════════════════════
// ADSENTICE · SGA Health Score — saúde do grafo semântico (4 dimensões)
//
// Inspirado no k0_breath.rs (rsxt): edges confirmados por especificidade
// (output ∩ input entre schemas de capabilities).
// Determinístico · auditável · automático · ZERO founder signal.
//
// Formula: 0.35·edgeQuality + 0.25·graphCoverage + 0.25·resolutionSpeed + 0.15·dataFreshness
// ══════════════════════════════════════════════════════════════════

import "server-only"
import type { SemanticNode } from "./brain/semantic-registry"
import { ensureSeeded, getMutationId } from "./brain/semantic-registry"

// ── Types ─────────────────────────────────────────────────────

export interface SGAHealthResult {
  score: number                    // 0-100
  verdict: "HEALTHY" | "STABLE" | "NEEDS_ATTENTION" | "DEGRADED"
  computedAt: string
  formula: string
  dimensions: {
    edgeQuality: { score: number; weight: number; weighted: number; confirmedEdges: number; totalEdges: number; orphanEdges: number; avgEdgesPerNode: number }
    graphCoverage: { score: number; weight: number; weighted: number; nodesInGraph: number; estimatedFeatures: number; byLayer: Record<string, { count: number; expected: number }> }
    resolutionSpeed: { score: number; weight: number; weighted: number; avgResolveMs: number; cacheHitRate: number; totalQueries: number }
    dataFreshness: { score: number; weight: number; weighted: number; mutationGap: number; oldestMutationId: number; newestMutationId: number }
  }
}

// ── Query Tracker ─────────────────────────────────────────────

const _queryTimes: number[] = []
const _cacheHits: number = 0
let _cacheMisses: number = 0
let _totalQueries: number = 0

export function trackQuery(resolveMs: number, source: "cache" | "qdrant" | "composed"): void {
  _queryTimes.push(resolveMs)
  _totalQueries++
  if (source === "cache") { /* cacheHits tracked separately */ }
  else _cacheMisses++
  // Keep last 100 queries
  if (_queryTimes.length > 100) _queryTimes.shift()
}

export function getCacheHitRate(): number {
  if (_totalQueries === 0) return 0
  return Math.round(((_totalQueries - _cacheMisses) / _totalQueries) * 100) / 100
}

// ── Expected Features (o que DEVERIA estar no grafo) ─────────

const EXPECTED_FEATURES: Record<string, string[]> = {
  capability: [
    "gmb-search", "gmb-profile", "website-audit", "content-gap",
    "schema-validate", "architecture-analyze", "voc-extract",
    "competitive-intel", "social-detect", "marketplace-detect",
    "market-intel", "brain-ooda", "kg-recall", "grounding", "cache-pattern",
    "customer-loyalty", "whatsapp-hub", "email-automation",
    "payment-gateway", "landing-page",
  ],
  signal: [
    "fit", "engagement", "intent", "website", "content",
    "architecture", "schema", "competitive", "voc", "social",
    "channel", "market", "trust", "compound", "loyalty",
    "email-engagement", "social-commerce",
  ],
  hub: [
    "scoring", "cockpit", "gmb", "website", "reputation",
    "competitive", "social", "marketplaces", "qdrant", "customer",
    "email", "payment",
  ],
  product: [
    "raio-x", "sentinela", "dominio", "escala", "growth-os",
  ],
}

// ── Schema Registry (o que CADA capability produz/consome) ───

interface CapabilitySchema {
  produces: string[]  // fields produced
  consumes: string[]  // fields consumed
}

const CAPABILITY_SCHEMAS: Record<string, CapabilitySchema> = {
  "cap.gmb-search": { produces: ["place_id", "title", "category", "address", "rating_value", "rating_votes", "latitude", "longitude", "is_claimed"], consumes: ["categories", "location_coordinate", "radius_km"] },
  "cap.gmb-profile": { produces: ["phone", "website", "total_photos", "description", "business_status", "city", "district", "postal_code", "country_code", "price_level", "categories_arr"], consumes: ["place_id", "keyword"] },
  "cap.website-audit": { produces: ["onpage_score", "meta_title", "meta_description", "word_count", "internal_links", "external_links", "seo_checks"], consumes: ["website_url"] },
  "cap.content-gap": { produces: ["content_maturity", "content_gaps", "recommendations"], consumes: ["word_count", "meta_title", "meta_description", "internal_links", "cms", "analytics"] },
  "cap.schema-validate": { produces: ["schema_score", "generated_jsonld"], consumes: ["website_url", "seo_checks"] },
  "cap.architecture-analyze": { produces: ["architecture_score", "orphan_pages", "navigation_depth"], consumes: ["internal_links", "external_links", "word_count"] },
  "cap.voc-extract": { produces: ["sentiment_score", "pain_points", "praise_points", "customer_language"], consumes: ["place_id", "rating_value", "rating_votes"] },
  "cap.competitive-intel": { produces: ["competitor_domains", "keyword_gaps", "market_position"], consumes: ["website_url", "category", "city"] },
  "cap.social-detect": { produces: ["social_platforms", "social_engagement", "social_frequency"], consumes: ["website_url", "external_links"] },
  "cap.marketplace-detect": { produces: ["marketplace_presence", "channel_dependency", "commission_burden"], consumes: ["website_url", "category"] },
  "cap.market-intel": { produces: ["market_gaps", "tam", "density", "mrr_potential"], consumes: ["category", "city", "score_compound", "signals_detected"] },
  "cap.brain-ooda": { produces: ["grounded_reply", "certainty_score", "facts_used"], consumes: ["question_intent", "kg_facts", "git_commits"] },
  "cap.kg-recall": { produces: ["ranked_hits", "sources", "authority_scores"], consumes: ["query", "collection_filter"] },
  "cap.grounding": { produces: ["honest_reply", "pruned_count", "matched_terms"], consumes: ["reply", "facts"] },
  "cap.cache-pattern": { produces: ["cached_entry", "bypass_tier"], consumes: ["question", "intent", "corpus_watermark"] },
  "cap.customer-loyalty": { produces: ["rfm_score", "churn_risk", "ltv_estimate", "customer_segments"], consumes: ["place_id", "customer_transactions", "review_history"] },
}

// ── Resolution Stats (simulados — produção leria do registry real) ─

let _avgResolveMs = 150
let _cacheHitRate = 0.0

export function setResolutionStats(avgMs: number, hitRate: number): void {
  _avgResolveMs = avgMs
  _cacheHitRate = hitRate
}

// ── SGA Health Score ──────────────────────────────────────────

export function computeSGAHealth(allNodes: SemanticNode[]): SGAHealthResult {
  ensureSeeded()
  const now = new Date().toISOString()

  // ── 1. EDGE QUALITY (0.35) ──
  // AreStas confirmadas = se o nó de origem PRODUZ algo que o nó destino CONSOME
  // Ex: cap.gmb-search produz "place_id", cap.gmb-profile consome "place_id" → confirmada
  let totalEdges = 0
  let confirmedEdges = 0
  let orphanEdges = 0

  const nodeMap = new Map<string, SemanticNode>()
  for (const n of allNodes) nodeMap.set(n.id, n)

  for (const node of allNodes) {
    totalEdges += node.edges.length
    const sourceSchema = CAPABILITY_SCHEMAS[node.id]
    if (!sourceSchema || !sourceSchema.produces) {
      // Non-capability nodes (signals, hubs, products) — arestas sempre contam como estruturais
      confirmedEdges += node.edges.length
      continue
    }

    for (const edgeId of node.edges) {
      const target = nodeMap.get(edgeId)
      if (!target) { orphanEdges++; continue }
      const targetSchema = CAPABILITY_SCHEMAS[target.id]
      if (!targetSchema || !targetSchema.consumes) {
        // Target is signal/hub/product — count as structural edge
        confirmedEdges++
        continue
      }
      // k0_breath check: output ∩ input ≠ ∅
      const overlap = sourceSchema.produces.filter(f => targetSchema.consumes.includes(f))
      if (overlap.length > 0) {
        confirmedEdges++
      } else {
        orphanEdges++ // edge exists but no data overlap — weak edge
      }
    }
  }

  const edgeConfirmationRate = totalEdges > 0 ? confirmedEdges / totalEdges : 0
  const avgEdgesPerNode = allNodes.length > 0 ? Math.round((totalEdges / allNodes.length) * 10) / 10 : 0

  // Penalização por órfãos: cada órfão reduz o score
  const orphanPenalty = totalEdges > 0 ? orphanEdges / totalEdges : 0
  const edgeQualityScore = Math.max(0, edgeConfirmationRate * (1 - orphanPenalty * 0.5))

  // ── 2. GRAPH COVERAGE (0.25) ──
  // % de features esperadas que têm nó no grafo
  const coverageByLayer: Record<string, { count: number; expected: number }> = {}
  let totalExpected = 0
  let totalPresent = 0

  for (const [layer, expectedIds] of Object.entries(EXPECTED_FEATURES)) {
    const present = expectedIds.filter(id => nodeMap.has(`${layer === "capability" ? "cap" : layer === "signal" ? "signal" : layer === "hub" ? "hub" : "product"}.${id}`) || [...nodeMap.keys()].some(k => k.includes(id))).length
    coverageByLayer[layer] = { count: present, expected: expectedIds.length }
    totalExpected += expectedIds.length
    totalPresent += present
  }

  const coverageScore = totalExpected > 0 ? totalPresent / totalExpected : 0

  // ── 3. RESOLUTION SPEED (0.25) ──
  // Latência normalizada (ideal < 50ms) + cache hit rate
  const maxAcceptableMs = 500
  const speedScore = Math.max(0, 1 - (_avgResolveMs / maxAcceptableMs))
  const resolutionScore = 0.60 * speedScore + 0.40 * _cacheHitRate

  // ── 4. DATA FRESHNESS (0.15) ──
  // MutationId gap: quão dispersos estão os mutationIds
  const mutationIds = allNodes.map(n => n.mutationId).filter(m => m > 0)
  const minMut = mutationIds.length > 0 ? Math.min(...mutationIds) : 0
  const maxMut = mutationIds.length > 0 ? Math.max(...mutationIds) : 0
  const mutationGap = maxMut - minMut
  // Gap normalizado: ideal é tudo no mesmo mutationId (gap ~0)
  const freshnessScore = mutationGap <= 1 ? 1.0 : mutationGap <= 3 ? 0.8 : mutationGap <= 6 ? 0.6 : mutationGap <= 10 ? 0.4 : 0.2

  // ── Compound ──
  const dims = {
    edgeQuality: {
      score: Math.round(edgeQualityScore * 1000) / 1000,
      weight: 0.35,
      weighted: Math.round(edgeQualityScore * 0.35 * 1000) / 1000,
      confirmedEdges, totalEdges, orphanEdges, avgEdgesPerNode,
    },
    graphCoverage: {
      score: Math.round(coverageScore * 1000) / 1000,
      weight: 0.25,
      weighted: Math.round(coverageScore * 0.25 * 1000) / 1000,
      nodesInGraph: allNodes.length,
      estimatedFeatures: totalExpected,
      byLayer: coverageByLayer,
    },
    resolutionSpeed: {
      score: Math.round(resolutionScore * 1000) / 1000,
      weight: 0.25,
      weighted: Math.round(resolutionScore * 0.25 * 1000) / 1000,
      avgResolveMs: _avgResolveMs,
      cacheHitRate: Math.round(_cacheHitRate * 1000) / 1000,
      totalQueries: _totalQueries,
    },
    dataFreshness: {
      score: Math.round(freshnessScore * 1000) / 1000,
      weight: 0.15,
      weighted: Math.round(freshnessScore * 0.15 * 1000) / 1000,
      mutationGap,
      oldestMutationId: minMut,
      newestMutationId: maxMut,
    },
  }

  const total = dims.edgeQuality.weighted + dims.graphCoverage.weighted + dims.resolutionSpeed.weighted + dims.dataFreshness.weighted
  const score = Math.round(total * 100)
  const verdict: SGAHealthResult["verdict"] = score >= 80 ? "HEALTHY" : score >= 60 ? "STABLE" : score >= 40 ? "NEEDS_ATTENTION" : "DEGRADED"

  return {
    score,
    verdict,
    computedAt: now,
    formula: "0.35·edgeQuality + 0.25·graphCoverage + 0.25·resolutionSpeed + 0.15·dataFreshness",
    dimensions: dims,
  }
}
