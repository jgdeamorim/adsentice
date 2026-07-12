// ══════════════════════════════════════════════════════════════════
// ADSENTICE · RSXT L0→L5 Decision Pipeline
// Doutrina: LLM = ÁRBITRO NUNCA EXTRATOR · SEMPRE L0→L5 primeiro
// ══════════════════════════════════════════════════════════════════

import type {
  DiscoveryResult,
  DiscoveryCard,
  Tip,
  LayerTrace,
} from "./types"
import {
  onPageInstantAudit,
  domainTechnologies,
  serpOrganicCheck,
  domainCompetitors,
  businessProfileSearch,
} from "./dataforseo"

// ── L0 · ESTRUTURAL (µs) ─────────────────────────────────────

interface L0Result {
  domain: string
  url: string
  valid: boolean
  protocol: string
  tld: string
  isBrasil: boolean
}

export function layer0_structural(input: string): L0Result {
  let url = input.trim()

  if (!url.startsWith("http")) url = `https://${url}`

  try {
    const u = new URL(url)
    const domain = u.hostname

    
return {
      domain,
      url: u.toString(),
      valid: domain.includes(".") && !domain.startsWith("."),
      protocol: u.protocol,
      tld: domain.split(".").pop() || "",
      isBrasil: domain.endsWith(".br") || domain.endsWith(".com.br"),
    }
  } catch {
    const parts = input.split(".")
    const domain = parts.length >= 2 ? input.replace(/^https?:\/\//, "") : input

    
return {
      domain,
      url: `https://${domain}`,
      valid: parts.length >= 2,
      protocol: "https:",
      tld: parts[parts.length - 1] || "",
      isBrasil: input.endsWith(".br"),
    }
  }
}

// ── L1 · ESTATÍSTICO (µs-ms) ──────────────────────────────────

interface L1Result {
  previouslyAnalyzed: boolean
  analysisCount: number
  lastAnalyzedAt: string | null
  avgScore: number | null
  cacheHit: boolean
}

// Simple in-memory cache for MVP (future: Redis/Vault)
const DIAGNOSTIC_CACHE = new Map<string, { score: number; at: string }>()

export function layer1_statistical(domain: string): L1Result {
  const key = domain.toLowerCase()
  const cached = DIAGNOSTIC_CACHE.get(key)

  return {
    previouslyAnalyzed: !!cached,
    analysisCount: cached ? 1 : 0,
    lastAnalyzedAt: cached?.at || null,
    avgScore: cached?.score || null,
    cacheHit: !!cached,
  }
}

export function layer1_cache_store(domain: string, score: number): void {
  DIAGNOSTIC_CACHE.set(domain.toLowerCase(), {
    score,
    at: new Date().toISOString(),
  })
}

// ── L2 · DETERMINÍSTICO (µs) ──────────────────────────────────

interface L2Result {
  passed: boolean
  checks: { rule: string; passed: boolean; detail: string }[]
  creditCost: number
  priority: "normal" | "low" | "high"
}

export function layer2_deterministic(
  domain: string,
  l0: L0Result,
  l1: L1Result
): L2Result {
  const checks: { rule: string; passed: boolean; detail: string }[] = []

  // Rule 1: Valid URL
  checks.push({
    rule: "valid_url",
    passed: l0.valid,
    detail: l0.valid ? "URL válida" : "URL inválida",
  })

  // Rule 2: Not localhost/test
  const blocked = ["localhost", "127.0.0.1", "example.com", "test.com"]
  const isBlocked = blocked.some((b) => domain.includes(b))

  checks.push({
    rule: "not_blocked",
    passed: !isBlocked,
    detail: isBlocked ? "Domínio bloqueado (teste/localhost)" : "Domínio permitido",
  })

  // Rule 3: Cache recency (analyzed in last 24h? skip DataForSEO)
  const recentCache =
    l1.cacheHit &&
    l1.lastAnalyzedAt &&
    Date.now() - new Date(l1.lastAnalyzedAt).getTime() < 86400000

  checks.push({
    rule: "cache_recency",
    passed: true,
    detail: recentCache ? "Cache hit (<24h) — reutilizando resultado" : "Cache miss — nova análise",
  })

  // Rule 4: TLD heuristic
  const validTlds = ["com", "br", "com.br", "net", "org", "io", "app", "dev"]

  checks.push({
    rule: "valid_tld",
    passed: validTlds.includes(l0.tld),
    detail: `TLD: .${l0.tld} — ${validTlds.includes(l0.tld) ? "válido" : "atípico"}`,
  })

  const allPassed = checks.filter((c) => !c.passed).length === 0

  return {
    passed: allPassed,
    checks,
    creditCost: recentCache ? 0 : 1, // 1 "credit" = ~$0.10 DataForSEO
    priority: recentCache ? "low" : l0.isBrasil ? "high" : "normal",
  }
}

// ── L3 · SENSOR — Embedding busca similares (ms) ─────────────

interface L3Result {
  candidates: Array<{
    domain: string
    score: number
    similarity: number
    source: string
  }>
  searchQuery: string
  tookMs: number
}

export async function layer3_sensor(
  domain: string,
  searchFn?: (query: string) => Promise<Array<{ domain: string; score: number; source: string }>>
): Promise<L3Result> {
  const t0 = Date.now()
  const query = `${domain} diagnóstico SEO GMB concorrentes`

  let candidates: L3Result["candidates"] = []

  if (searchFn) {
    try {
      const results = await searchFn(query)

      candidates = results.slice(0, 5).map((r) => ({
        domain: r.domain,
        score: r.score,
        similarity: 0, // computed by embed
        source: r.source,
      }))
    } catch {
      // sensor offline — não bloqueia pipeline
    }
  }

  return {
    candidates,
    searchQuery: query,
    tookMs: Date.now() - t0,
  }
}

// ── L4 · GRAPH — KG traversal decide pipelines (ms) ───────────

interface L4Result {
  pipelines: string[]
  reason: string
}

export function layer4_graph(
  l0: L0Result,
  l3: L3Result
): L4Result {
  const pipelines: string[] = []

  // Base: always audit the site
  pipelines.push("site_audit")

  // SEO: always run for BR domains
  if (l0.isBrasil) {
    pipelines.push("seo_discovery")
  }

  // GMB: run if not a dev/tech domain
  if (!l0.domain.includes(".dev") && !l0.domain.includes(".app")) {
    pipelines.push("gmb_reputation")
  }

  // Competitors: run if has similar businesses found
  if (l3.candidates.length > 0) {
    pipelines.push("competitor_intel")
  }

  // Limit: max 4 pipelines for MVP (ads deferred)
  const selected = pipelines.slice(0, 4)

  return {
    pipelines: selected,
    reason: `Domain BR=${l0.isBrasil}, similars=${l3.candidates.length} → ${selected.join(", ")}`,
  }
}

// ── L5 · BOA — Cost/benefit consensus (ms) ────────────────────

interface L5Result {
  shouldProceed: boolean
  boaScore: number
  fixability: number
  potential: number
  valueFit: number
  reasoning: string
}

export function layer5_boa(
  l1: L1Result,
  l2: L2Result,
  l3: L3Result,
  l4: L4Result
): L5Result {
  // FIXABILITY: cache hit = already fixed, fresh analysis = fixable
  const fixability = l1.cacheHit ? 0.85 : 0.55

  // POTENTIAL: more pipelines = more potential value
  const potential = Math.min(0.95, 0.3 + l4.pipelines.length * 0.15)

  // VALUE-FIT: BR domain + has similars = high market value
  const valueFit = l3.candidates.length >= 2 ? 0.75 : l3.candidates.length >= 1 ? 0.55 : 0.35

  // BOA = 0.30·fixability + 0.35·potential + 0.35·valueFit
  const boa = +(0.3 * fixability + 0.35 * potential + 0.35 * valueFit).toFixed(2)

  return {
    shouldProceed: boa >= 0.40,
    boaScore: boa,
    fixability: +fixability.toFixed(2),
    potential: +potential.toFixed(2),
    valueFit: +valueFit.toFixed(2),
    reasoning:
      boa >= 0.70
        ? "EXCELLENT — alto potencial, executar pipelines"
        : boa >= 0.50
          ? "GOOD — executar pipelines principais"
          : boa >= 0.40
            ? "ACCEPTABLE — executar com custo reduzido"
            : "LOW — análise de baixo retorno, pular DataForSEO caro",
  }
}

// ── L6 (delegado ao caller) · LLM ÁRBITRO ────────────────────

// L6 NÃO está aqui. O caller (route.ts) chama DeepSeek SÓ se L5
// aprovar. A doutrina: LLM é LAST RESORT, nunca primeiro.
// L0→L5 rodam SEMPRE. L6 só se shouldProceed = true.

// ── Pipeline Runner (L0→L5 + DataForSEO + mount cards) ───────

interface PipelineOutput {
  trace: LayerTrace[]
  result: DiscoveryResult
}

export async function runL0L5Pipeline(
  url: string,
  searchSimilar?: (q: string) => Promise<Array<{ domain: string; score: number; source: string }>>
): Promise<PipelineOutput> {
  const startedAt = Date.now()
  const trace: LayerTrace[] = []

  // ═══ L0 · ESTRUTURAL ═══
  const tL0 = Date.now()
  const l0 = layer0_structural(url)

  trace.push({ layer: "L0", status: "ok", detail: `domain=${l0.domain}`, tookMs: Date.now() - tL0 })

  if (!l0.valid) {
    trace.push({ layer: "L2", status: "error", detail: "URL inválida", tookMs: 0 })
    
return {
      trace,
      result: { business: { name: l0.domain, url: l0.url, domain: l0.domain }, score: { overall: 0, breakdown: {} }, cards: [], tips: [t("URL inválida. Verifique o endereço.")], deep_dives: [], diagnostics: { took_ms: Date.now() - startedAt, pipelines: [], layers: trace } },
    }
  }

  // ═══ L1 · ESTATÍSTICO ═══
  const tL1 = Date.now()
  const l1 = layer1_statistical(l0.domain)

  trace.push({ layer: "L1", status: "ok", detail: l1.cacheHit ? "cache hit" : "cache miss", tookMs: Date.now() - tL1 })

  // ═══ L2 · DETERMINÍSTICO ═══
  const tL2 = Date.now()
  const l2 = layer2_deterministic(l0.domain, l0, l1)

  trace.push({ layer: "L2", status: l2.passed ? "ok" : "warn", detail: `${l2.priority} priority · ${l2.creditCost} credits`, tookMs: Date.now() - tL2 })

  // ═══ L3 · SENSOR ═══
  const l3 = await layer3_sensor(l0.domain, searchSimilar)

  trace.push({ layer: "L3", status: "ok", detail: `${l3.candidates.length} candidates`, tookMs: l3.tookMs })

  // ═══ L4 · GRAPH ═══
  const tL4 = Date.now()
  const l4 = layer4_graph(l0, l3)

  trace.push({ layer: "L4", status: "ok", detail: `${l4.pipelines.length} pipelines: ${l4.pipelines.join(", ")}`, tookMs: Date.now() - tL4 })

  // ═══ L5 · BOA ═══
  const tL5 = Date.now()
  const l5 = layer5_boa(l1, l2, l3, l4)

  trace.push({ layer: "L5", status: l5.shouldProceed ? "ok" : "warn", detail: `BOA ${l5.boaScore} · ${l5.reasoning}`, tookMs: Date.now() - tL5 })

  // ═══ Cache hit (<24h)? Retorna resultado anterior ═══
  if (l1.cacheHit && l1.avgScore) {
    trace.push({ layer: "L6", status: "skipped", detail: "cache hit — LLM não chamado", tookMs: 0 })
    
return {
      trace,
      result: {
        business: { name: l0.domain, url: l0.url, domain: l0.domain },
        score: { overall: l1.avgScore, breakdown: { site: l1.avgScore } },
        cards: [{ id: "cached", title: "Análise Recente", icon: "Clock", score: l1.avgScore, severity: l1.avgScore >= 60 ? "good" : "warning", highlights: [`Analisado em ${l1.lastAnalyzedAt}`, "Resultado em cache (<24h) — nova análise disponível amanhã"], deepDiveAvailable: false }],
        tips: [t("Análise recente detectada. Novo diagnóstico disponível em 24h.")],
        deep_dives: [],
        diagnostics: { took_ms: Date.now() - startedAt, pipelines: ["cached"], layers: trace },
      },
    }
  }

  // ═══ BOA < 0.40? Skip DataForSEO ═══
  if (!l5.shouldProceed) {
    trace.push({ layer: "L6", status: "skipped", detail: `BOA ${l5.boaScore} < 0.40 — análise não justifica custo`, tookMs: 0 })
    
return {
      trace,
      result: {
        business: { name: l0.domain, url: l0.url, domain: l0.domain },
        score: { overall: Math.round(l5.boaScore * 100), breakdown: { fixability: l5.fixability, potential: l5.potential, valueFit: l5.valueFit } },
        cards: [{ id: "boa", title: "Análise de Viabilidade", icon: "AlertTriangle", score: Math.round(l5.boaScore * 100), severity: "warning", highlights: [`BOA: ${l5.boaScore} — ${l5.reasoning}`, `Fixability: ${l5.fixability} · Potential: ${l5.potential} · Value-Fit: ${l5.valueFit}`, "Tente um domínio .com.br com presença digital ativa"], deepDiveAvailable: false }],
        tips: [t("Este domínio não passa no filtro de viabilidade.")],
        deep_dives: [],
        diagnostics: { took_ms: Date.now() - startedAt, pipelines: [], layers: trace },
      },
    }
  }

  // ═══ RUN PIPELINES (DataForSEO — $0.10~$0.50) ═══
  const pipelinedStarted = Date.now()
  const pipelineResults = await runSelectedPipelines(l0.url, l0.domain, l4.pipelines)

  trace.push({ layer: "PIPELINES", status: "ok", detail: `${l4.pipelines.length} pipelines · ${Date.now() - pipelinedStarted}ms`, tookMs: Date.now() - pipelinedStarted })

  // ═══ MOUNT CARDS + TIPS (determinístico, L2-level) ═══
  const result = buildResult(l0, pipelineResults, l5, l4.pipelines)

  trace.push({ layer: "SYNTHESIS", status: "ok", detail: `${result.cards.length} cards · ${result.tips.length} tips`, tookMs: 0 })

  // ═══ Cache store (L1 feedback) ═══
  layer1_cache_store(l0.domain, result.score.overall)

  result.diagnostics = {
    took_ms: Date.now() - startedAt,
    pipelines: l4.pipelines,
    layers: trace,
  }

  return { trace, result }
}

// ── Pipeline Executor ─────────────────────────────────────────

interface PipelineData {
  site: Awaited<ReturnType<typeof onPageInstantAudit>> | null
  seo: Awaited<ReturnType<typeof serpOrganicCheck>> | null
  gmb: Awaited<ReturnType<typeof businessProfileSearch>> | null
  competitors: Awaited<ReturnType<typeof domainCompetitors>> | null
  tech: Awaited<ReturnType<typeof domainTechnologies>> | null
}

async function runSelectedPipelines(
  url: string,
  domain: string,
  pipelines: string[]
): Promise<PipelineData> {
  const data: PipelineData = { site: null, seo: null, gmb: null, competitors: null, tech: null }

  const tasks: Promise<void>[] = []

  if (pipelines.includes("site_audit")) {
    tasks.push(
      (async () => {
        const [lh, t] = await Promise.allSettled([
          onPageInstantAudit(url),
          domainTechnologies(domain),
        ])

        data.site = lh.status === "fulfilled" ? lh.value : null
        data.tech = t.status === "fulfilled" ? t.value : null
      })()
    )
  }

  if (pipelines.includes("seo_discovery")) {
    tasks.push(
      (async () => {
        const kw = deriveSEOKw(domain)
        const s = await serpOrganicCheck(domain, kw).catch(() => null)

        data.seo = s
      })()
    )
  }

  if (pipelines.includes("gmb_reputation")) {
    tasks.push(
      (async () => {
        const g = await businessProfileSearch(domain).catch(() => null)

        data.gmb = g
      })()
    )
  }

  if (pipelines.includes("competitor_intel")) {
    tasks.push(
      (async () => {
        const c = await domainCompetitors(domain).catch(() => [])

        data.competitors = c
      })()
    )
  }

  await Promise.all(tasks)
  
return data
}

// ── Result Builder (L2 deterministic, NO LLM) ─────────────────

function buildResult(
  l0: L0Result,
  data: PipelineData,
  l5: L5Result,
  pipelines: string[]
): DiscoveryResult {
  const cards: DiscoveryCard[] = []
  const tips: string[] = []

  // Site card
  if (data.site) {
    cards.push({
      id: "site",
      title: "Site & Tecnologia",
      icon: "Monitor",
      score: scoreSite(data.site, data.tech),
      severity: severity(scoreSite(data.site, data.tech)),
      highlights: [
        `Performance ${data.site.performance}/100 · SEO ${data.site.seo}/100`,
        data.tech?.cms ? `CMS: ${data.tech.cms}` : "CMS não detectado",
        data.tech?.analytics?.length
          ? `Analytics: ${data.tech.analytics.join(", ")}`
          : "Sem analytics detectado",
      ],
      deepDiveAvailable: true,
      deepDiveCreditCost: 8,
    })

    if (data.site.performance < 60)
      tips.push(`Performance ${data.site.performance}/100 — otimize imagens e scripts`)
    if (data.site.seo < 70)
      tips.push(`SEO técnico ${data.site.seo}/100 — revise meta tags`)
  }

  // SEO card
  if (data.seo && data.seo.length > 0) {
    const avgPos = avgPosition(data.seo)

    const topKw = data.seo
      .filter((k) => k.volume > 0)
      .sort((a, b) => b.volume - a.volume)[0]

    cards.push({
      id: "seo",
      title: "SEO & Descoberta",
      icon: "Search",
      score: scoreSEO(data.seo),
      severity: severity(scoreSEO(data.seo)),
      highlights: [
        `${data.seo.length} keywords analisadas`,
        avgPos > 0 ? `Posição média #${avgPos}` : "Não ranqueia",
        topKw ? `"${topKw.keyword}" = ${topKw.volume.toLocaleString("pt-BR")}/mês` : "",
      ].filter(Boolean),
      deepDiveAvailable: true,
      deepDiveCreditCost: 10,
    })

    if (topKw && (!topKw.position || topKw.position > 10)) {
      tips.push(
        `"${topKw.keyword}" = ${topKw.volume.toLocaleString("pt-BR")}/mês — ${topKw.position ? `pos #${topKw.position}` : "você não aparece"}`
      )
    }
  }

  // GMB card
  if (data.gmb) {
    cards.push({
      id: "gmb",
      title: "Google Meu Negócio",
      icon: "MapPin",
      score: scoreGMB(data.gmb),
      severity: severity(scoreGMB(data.gmb)),
      highlights: [
        `${data.gmb.rating}★ · ${data.gmb.total_reviews} reviews`,
        data.gmb.category || "",
      ],
      deepDiveAvailable: true,
      deepDiveCreditCost: 3,
    })

    if (data.gmb.total_reviews < 20)
      tips.push(`Apenas ${data.gmb.total_reviews} reviews — incentive avaliações`)
  }

  // Reputation
  if (data.gmb && data.gmb.total_reviews > 0) {
    cards.push({
      id: "reputation",
      title: "Reputação Online",
      icon: "Star",
      score: data.gmb.rating >= 4 ? 70 : data.gmb.rating >= 3 ? 45 : 20,
      severity: severity(data.gmb.rating >= 4 ? 70 : 40),
      highlights: [
        `${data.gmb.rating}★ em ${data.gmb.total_reviews} avaliações`,
        data.gmb.rating >= 4 ? "✅ Boa" : "⚠️ Precisa melhorar",
      ],
      deepDiveAvailable: true,
      deepDiveCreditCost: 3,
    })
  }

  // Competitors
  if (data.competitors && data.competitors.length > 0) {
    cards.push({
      id: "competitors",
      title: "Concorrência",
      icon: "Users",
      score: Math.max(20, 80 - (data.competitors[0]?.etv || 0) / 100),
      severity: "good",
      highlights: [
        `${data.competitors.length} concorrentes`,
        data.competitors[0] ? `#1: ${data.competitors[0].domain}` : "",
      ],
      deepDiveAvailable: true,
      deepDiveCreditCost: 5,
    })
  }

  // Fill tips to 3
  if (tips.length < 3) {
    tips.push(
      `Pipeline L0→L5 executado em ${pipelines.length} camadas — BOA score: ${l5.boaScore}`,
      "Doutrina RSXT: LLM só é chamado se L0-L5 não bastarem"
    )
  }

  const overall =
    cards.length > 0
      ? Math.round(cards.reduce((s, c) => s + (c.score || 0), 0) / cards.length)
      : Math.round(l5.boaScore * 100)

  return {
    business: {
      name: data.gmb?.title || l0.domain,
      url: l0.url,
      domain: l0.domain,
    },
    score: {
      overall,
      breakdown: Object.fromEntries(cards.map((c) => [c.id, c.score || 0])),
    },
    cards,
    tips: tips.map((title, i): Tip => ({ priority: i + 1, urgency: i === 0 ? "high" : "medium", title, detail: "", action: "Ver mais", credit_cost: 0 })).slice(0, 5),
    deep_dives: [
      { id: "seo_strategy", title: "Estratégia SEO", description: "Plano de keywords e ranqueamento", credit_cost: 10 },
      { id: "competitor_analysis", title: "Análise Concorrência", description: "Posicionamento competitivo", credit_cost: 5 },
      { id: "gmb_optimization", title: "Otimização GMB", description: "Checklist Google Meu Negócio", credit_cost: 3 },
      { id: "site_audit_full", title: "Auditoria Técnica", description: "Performance e correções", credit_cost: 8 },
      { id: "review_management", title: "Gestão de Reviews", description: "Estratégia de reputação", credit_cost: 3 },
    ],
  }
}

// ── Helpers ───────────────────────────────────────────────────

function t(title: string): Tip {
  return { priority: 1, urgency: "medium", title, detail: "", action: "Ver mais", credit_cost: 0 }
}

function deriveSEOKw(domain: string): string[] {
  const name = domain.split(".")[0]

  
return [name, `${name} são paulo`, `${name} avaliação`, `${name} preço`, "perto de mim"].slice(0, 4)
}

function avgPosition(kw: Array<{ position: number | null }>): number {
  const ranked = kw.filter((k) => k.position !== null)

  
return ranked.length > 0
    ? Math.round(ranked.reduce((s, k) => s + (k.position || 0), 0) / ranked.length)
    : 0
}

function severity(s: number): "excellent" | "good" | "warning" | "critical" {
  if (s >= 80) return "excellent"
  if (s >= 60) return "good"
  if (s >= 40) return "warning"
  
return "critical"
}

function scoreSite(
  lh: { performance: number; seo: number; accessibility: number } | null,
  tech: { cms: string; analytics: string[] } | null
): number {
  if (!lh) return 30
  let s = 45

  if (lh.performance >= 80) s += 15
  else if (lh.performance >= 50) s += 8
  if (lh.seo >= 80) s += 15
  else if (lh.seo >= 50) s += 8
  if (lh.accessibility >= 80) s += 7
  if (tech?.cms && tech.cms !== "desconhecido") s += 10
  if (tech?.analytics?.length) s += 5
  
return Math.min(100, s)
}

function scoreSEO(
  kw: Array<{ position: number | null; volume: number }>
): number {
  if (!kw?.length) return 20
  let s = 25
  const ranked = kw.filter((k) => k.position !== null && k.position <= 20)

  if (ranked.length > 0) s += Math.min(30, ranked.length * 5)
  const withVol = kw.filter((k) => k.volume > 100)

  if (withVol.length > 0) s += Math.min(35, withVol.length * 7)
  
return Math.min(100, s)
}

function scoreGMB(gmb: {
  rating: number
  total_reviews: number
  is_claimed: boolean
}): number {
  let s = 30

  if (gmb.rating >= 4.5) s += 25
  else if (gmb.rating >= 4.0) s += 15
  if (gmb.total_reviews > 50) s += 20
  else if (gmb.total_reviews > 10) s += 8
  if (gmb.is_claimed) s += 20
  
return Math.min(100, s)
}
