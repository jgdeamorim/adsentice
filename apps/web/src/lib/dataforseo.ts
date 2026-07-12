// ══════════════════════════════════════════════════════════════════
// ADSENTICE · DataForSEO REST Client
// API: https://api.dataforseo.com/v3 · Basic auth (login:password)
// Custo: ~$0.01-0.10 por chamada (pricing por endpoint)
// ══════════════════════════════════════════════════════════════════

const DATAFORSEO_BASE = "https://api.dataforseo.com/v3"

function auth(): string {
  const login = process.env.DATAFORSEO_LOGIN || ""
  const password = process.env.DATAFORSEO_PASSWORD || ""

  
return `Basic ${Buffer.from(`${login}:${password}`).toString("base64")}`
}

async function dfPost(path: string, body: unknown[]): Promise<unknown> {
  const res = await fetch(`${DATAFORSEO_BASE}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: auth(),
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(30000),
  })

  if (!res.ok) {
    const err = await res.text().catch(() => res.statusText)

    throw new Error(`DataForSEO ${res.status}: ${err}`)
  }

  return res.json()
}

// ── Types ─────────────────────────────────────────────────────

interface DfTask {
  id: string
  status_code?: number
  status_message?: string
  result?: Array<{ items?: unknown[]; [k: string]: unknown }>
}

interface DfResponse {
  tasks?: DfTask[]
  status_code?: number
  status_message?: string
}

// ── On-Page Instant Pages (Lighthouse + auditoria) ────────────

export interface LighthouseData {
  performance: number
  seo: number
  accessibility: number
  bestPractices: number
  fcp?: number
  lcp?: number
  tbt?: number
  cls?: number
  url: string
  title: string
  description: string
  meta_keywords?: string
  h1?: string[]
  word_count?: number
  total_links?: number
  broken_links?: number
  images_without_alt?: number
}

export async function onPageInstantAudit(targetUrl: string): Promise<LighthouseData | null> {
  const body = [
    {
      url: targetUrl,
      enable_javascript: true,
      enable_browser_rendering: false,
      check_spell: false,
      calculate_keyword_density: false,
    },
  ]

  const raw = (await dfPost("/on_page/instant_pages", body)) as DfResponse
  const task = raw.tasks?.[0]

  if (task?.status_code !== 20000 || !task.result?.[0]?.items?.[0]) return null

  const item = task.result[0].items[0] as Record<string, unknown>
  const checks = (item.checks || item.onpage_score || {}) as Record<string, unknown>
  const meta = (item.meta || {}) as Record<string, unknown>

  return {
    performance: Math.round((checks.performance_score as number) || 0),
    seo: Math.round((checks.onpage_score as number) || 0),
    accessibility: Math.round((checks.accessibility_score as number) || 0),
    bestPractices: Math.round((checks.best_practices_score as number) || 0),
    fcp: checks.fcp as number,
    lcp: checks.lcp as number,
    tbt: checks.tbt as number,
    cls: checks.cls as number,
    url: (item.url as string) || targetUrl,
    title: (meta.title as string) || "",
    description: (meta.description as string) || "",
    meta_keywords: meta.keywords as string,
    h1: item.h1 as string[],
    word_count: item.word_count as number,
    total_links: item.total_links as number,
    broken_links: item.broken_links as number,
    images_without_alt: item.images_without_alt as number,
  }
}

// ── Domain Technologies ───────────────────────────────────────

export interface DomainTechnologies {
  domain: string
  cms: string
  ecommerce?: string
  analytics: string[]
  cdn: string
  hosting?: string
  javascript?: string[]
  security?: string[]
  plugins?: string[]
}

export async function domainTechnologies(target: string): Promise<DomainTechnologies | null> {
  const domain = target.replace(/^https?:\/\//, "").replace(/\/.*/, "")
  const body = [{ target: domain }]

  const raw = (await dfPost("/domain_analytics/technologies/domain_technologies/live", body)) as DfResponse
  const task = raw.tasks?.[0]

  if (task?.status_code !== 20000 || !task.result?.[0]?.items?.[0]) return null

  const item = task.result[0].items[0] as Record<string, unknown>
  const meta = (item.meta || item) as Record<string, unknown>

  return {
    domain: (meta.domain as string) || domain,
    cms: (meta.cms as string) || "desconhecido",
    ecommerce: meta.ecommerce as string,
    analytics: (meta.analytics as string[]) || [],
    cdn: (meta.cdn as string) || "não detectado",
    hosting: meta.hosting as string,
    javascript: meta.javascript as string[],
    security: meta.security as string[],
    plugins: meta.plugins as string[],
  }
}

// ── SERP Organic (keyword position check) ─────────────────────

export interface KeywordPosition {
  keyword: string
  volume: number
  position: number | null
  cpc: number
  competition: string
}

export async function serpOrganicCheck(
  domain: string,
  keywords: string[],
  location = "São Paulo,Brazil",
  lang = "pt"
): Promise<KeywordPosition[]> {
  const results: KeywordPosition[] = []

  for (const kw of keywords.slice(0, 5)) {
    const body = [
      {
        keyword: kw,
        location_name: location,
        language_code: lang,
        depth: 20,
      },
    ]

    try {
      const raw = (await dfPost("/serp/google/organic/live/advanced", body)) as DfResponse
      const task = raw.tasks?.[0]

      if (task?.status_code !== 20000 || !task.result?.[0]?.items) continue

      const items = task.result[0].items as Array<Record<string, unknown>>

      const pos = items.findIndex(
        (i) => typeof i.url === "string" && i.url.includes(domain)
      )

      results.push({
        keyword: kw,
        volume: 0, // será preenchido pelo keyword_data
        position: pos >= 0 ? pos + 1 : null,
        cpc: 0,
        competition: "LOW",
      })
    } catch {
      results.push({ keyword: kw, volume: 0, position: null, cpc: 0, competition: "LOW" })
    }
  }

  // Get search volume for keywords
  if (keywords.length > 0) {
    try {
      const body = [{ keywords, location_name: "Brazil", language_code: "pt" }]
      const raw = (await dfPost("/dataforseo_labs/google/keyword_overview/live", body)) as DfResponse
      const task = raw.tasks?.[0]

      if (task?.status_code === 20000 && task.result?.[0]?.items) {
        const items = task.result[0].items as Array<Record<string, unknown>>

        for (const item of items) {
          const kw = item.keyword as string
          const match = results.find((r) => r.keyword === kw)

          if (match) {
            match.volume = (item.search_volume as number) || 0
            match.cpc = (item.cpc as number) || 0
            match.competition = (item.competition_level as string) || "LOW"
          }
        }
      }
    } catch {
      // keyword volume é opcional
    }
  }

  return results
}

// ── Business Profile (GMB) ────────────────────────────────────

export interface GMBProfile {
  place_id: string
  title: string
  rating: number
  total_reviews: number
  address: string
  phone?: string
  website?: string
  category: string
  categories?: string[]
  latitude?: number
  longitude?: number
  work_time?: Record<string, string>
  main_image?: string
  is_claimed: boolean
}

export async function businessProfileSearch(
  businessName: string,
  location = "São Paulo,Brazil"
): Promise<GMBProfile | null> {
  // Search by business name + location
  const body = [
    {
      title: businessName,
      location_coordinate: location, // uses city name as fallback
      limit: 3,
      is_claimed: true,
    },
  ]

  try {
    const raw = (await dfPost(
      "/business_data/google/my_business_info/live",
      body
    )) as DfResponse

    const task = raw.tasks?.[0]

    if (task?.status_code !== 20000 || !task.result?.[0]?.items?.[0]) return null

    const item = task.result[0].items[0] as Record<string, unknown>

    
return {
      place_id: (item.place_id as string) || "",
      title: (item.title as string) || businessName,
      rating: (item.rating as number) || 0,
      total_reviews: (item.total_reviews as number) || 0,
      address: (item.address as string) || "",
      phone: item.phone as string,
      website: item.website as string,
      category: (item.category as string) || "",
      categories: item.categories as string[],
      latitude: item.latitude as number,
      longitude: item.longitude as number,
      work_time: item.work_time as Record<string, string>,
      main_image: item.main_image as string,
      is_claimed: (item.is_claimed as boolean) || false,
    }
  } catch {
    return null
  }
}

// ── Competitor Discovery ──────────────────────────────────────

export async function domainCompetitors(
  domain: string,
  location = "Brazil",
  lang = "pt"
): Promise<Array<{ domain: string; rank: number; etv: number }>> {
  const body = [{ target: domain, location_name: location, language_code: lang }]

  try {
    const raw = (await dfPost(
      "/dataforseo_labs/google/competitors_domain/live",
      body
    )) as DfResponse

    const task = raw.tasks?.[0]

    if (task?.status_code !== 20000 || !task.result?.[0]?.items) return []

    return (task.result[0].items as Array<Record<string, unknown>>)
      .slice(0, 5)
      .map((i) => ({
        domain: (i.domain as string) || "",
        rank: (i.rank as number) || 0,
        etv: (i.etv as number) || 0,
      }))
  } catch {
    return []
  }
}
