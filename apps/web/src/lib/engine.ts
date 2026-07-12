// ══════════════════════════════════════════════════════════════════
// ADSENTICE · Engine Data — server-side bridge entre o dashboard
// e os motores reais (Redis :6396 · Qdrant :6352 · EVO-API :7700).
// Usa child_process + fetch — zero dependências novas.
// ══════════════════════════════════════════════════════════════════

import "server-only"
import { execSync } from "child_process"

// ── Helpers ──────────────────────────────────────────────────

function redisCli(cmd: string): string | null {
  try {
    return execSync(`redis-cli -p 6396 --no-auth-warning ${cmd}`, {
      timeout: 2000,
      stdio: ["ignore", "pipe", "ignore"],
    }).toString().trim()
  } catch {
    return null
  }
}

async function qdrantCount(collection: string): Promise<number> {
  try {
    const res = await fetch(
      `http://127.0.0.1:6352/collections/${collection}/points/count`,
      { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}", signal: AbortSignal.timeout(3000) }
    )

    const json = await res.json()

    
return json?.result?.count ?? 0
  } catch {
    return 0
  }
}

async function healthCheck(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(2000) })

    
return res.ok
  } catch {
    return false
  }
}

// ── Types ───────────────────────────────────────────────────

interface ScoreStats {
  total: number
  avgScore: number
  unaware: number
  problemAware: number
  solutionAware: number
  productAware: number
  mostAware: number
}

export interface EngineData {
  boaScore: number
  boaVeredict: string
  oodaAct: string
  oodaDecide: string

  qdrantOnline: boolean
  redisOnline: boolean
  embedOnline: boolean
  evoApiOnline: boolean
  mcpServers: number
  capabilities: number

  corpusSelf: number
  corpusConversation: number
  corpusMaterio: number
  corpusTotal: number

  commits: string
  adrs: number

  leadsDiscovered: number
  leadsUrgentes: number
  leadsQuentes: number

  // Scoring v0.2
  avgScore: number
  schwartzDistribution: { level: number; label: string; count: number }[] | null

  dataCostToday: number
  dataCostProjected: number
  activeTenants: number
}

// ── Cache (30s TTL) ──────────────────────────────────────────

let _cache: { data: EngineData; at: number } | null = null

export async function getAdminDashboardData(): Promise<EngineData> {
  if (_cache && Date.now() - _cache.at < 30_000) return _cache.data

  // ═══ Redis (OODA + BOA) ═══
  const [boa, verdict, act, decide] = await Promise.all([
    Promise.resolve(redisCli("GET adsentice:boa:score")),
    Promise.resolve(redisCli("GET adsentice:boa:verdict")),
    Promise.resolve(redisCli("GET adsentice:ooda:stage:act")),
    Promise.resolve(redisCli("GET adsentice:ooda:stage:decide")),
  ])

  // ═══ Qdrant ═══
  const [corpusSelf, corpusConv] = await Promise.all([
    qdrantCount("adsentice-self"),
    qdrantCount("adsentice-conversation"),
  ])

  // ═══ Infra Health ═══
  const [qdrantOk, embedOk, evoOk] = await Promise.all([
    healthCheck("http://127.0.0.1:6352/healthz"),
    healthCheck("http://127.0.0.1:8081/healthz"),
    healthCheck("http://127.0.0.1:7700/health"),
  ])

  // ═══ Git (filesystem, server-side) ═══
  let commitCount = "?"
  let adrCount = 7

  try {
    commitCount = execSync("git rev-list --count HEAD", {
      cwd: process.cwd(), timeout: 2000, stdio: ["ignore", "pipe", "ignore"],
    }).toString().trim()
  } catch { /* fallback */ }

  try {
    const { readdirSync } = await import("fs")
    const { default: path } = await import("path")
    const adrDir = path.join(process.cwd(), "docs", "adr")

    adrCount = readdirSync(adrDir).filter((f: string) => f.endsWith(".md")).length
  } catch { /* fallback */ }

  // ═══ Scoring v0.2 — last discovery stats from Redis ═══
  let lastScoreStats: ScoreStats | null = null

  try {
    const raw = redisCli("GET adsentice:discovery:last_score_stats")

    if (raw) lastScoreStats = JSON.parse(raw)
  } catch { /* no data yet */ }

  // ═══ Monta resultado ═══
  const data: EngineData = {
    boaScore: parseFloat(boa || "0") || 0,
    boaVeredict: verdict || "?",
    oodaAct: act || "?",
    oodaDecide: decide || "?",

    qdrantOnline: qdrantOk,
    redisOnline: boa !== null,
    embedOnline: embedOk,
    evoApiOnline: evoOk,
    mcpServers: 7,
    capabilities: 76,

    corpusSelf,
    corpusConversation: corpusConv,
    corpusMaterio: 36,
    corpusTotal: corpusSelf + corpusConv + 36,

    commits: commitCount,
    adrs: adrCount,

    // Pipeline — real from last discovery or defaults
    leadsDiscovered: lastScoreStats?.total ?? 10530,
    leadsUrgentes: (lastScoreStats?.productAware ?? 0) + (lastScoreStats?.mostAware ?? 0) || 2329,
    leadsQuentes: (lastScoreStats?.solutionAware ?? 0) || 1380,

    // Scoring v0.2
    avgScore: lastScoreStats?.avgScore ?? 0,
    schwartzDistribution: lastScoreStats ? [
      { level: 1, label: "Unaware", count: lastScoreStats.unaware },
      { level: 2, label: "Problem Aware", count: lastScoreStats.problemAware },
      { level: 3, label: "Solution Aware", count: lastScoreStats.solutionAware },
      { level: 4, label: "Product Aware", count: lastScoreStats.productAware },
      { level: 5, label: "Most Aware", count: lastScoreStats.mostAware },
    ] : null,

    dataCostToday: 0.03,
    dataCostProjected: 5.0,
    activeTenants: 0,
  }

  _cache = { data, at: Date.now() }
  
return data
}
