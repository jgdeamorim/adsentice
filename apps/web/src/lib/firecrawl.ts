// ══════════════════════════════════════════════════════════════════
// ADSENTICE · Firecrawl REST Client
// API: https://api.firecrawl.dev/v2 · keyless free tier ($0)
// Rate-limit: ~10 req/min keyless · usar com moderação
// ══════════════════════════════════════════════════════════════════

const FIRECRAWL_BASE = "https://api.firecrawl.dev/v2"
const FIRECRAWL_KEY = process.env.FIRECRAWL_API_KEY || "" // opcional

function headers(): Record<string, string> {
  const h: Record<string, string> = { "Content-Type": "application/json" }
  if (FIRECRAWL_KEY) h["Authorization"] = `Bearer ${FIRECRAWL_KEY}`
  return h
}

// ── Scrape ────────────────────────────────────────────────────

interface ScrapeParams {
  url: string
  formats?: string[]
  onlyMainContent?: boolean
  waitFor?: number
  mobile?: boolean
}

interface ScrapeResult {
  success: boolean
  data?: {
    markdown?: string
    html?: string
    title?: string
    description?: string
    links?: string[]
    metadata?: Record<string, unknown>
  }
  error?: string
}

export async function firecrawlScrape(params: ScrapeParams): Promise<ScrapeResult> {
  const body = JSON.stringify({
    url: params.url,
    formats: params.formats || ["markdown"],
    onlyMainContent: params.onlyMainContent ?? true,
    waitFor: params.waitFor || 0,
    mobile: params.mobile || false,
  })

  const res = await fetch(`${FIRECRAWL_BASE}/scrape`, {
    method: "POST",
    headers: headers(),
    body,
    signal: AbortSignal.timeout(25000),
  })

  return res.json()
}

// ── Map ───────────────────────────────────────────────────────

interface MapParams {
  url: string
  search?: string
  sitemap?: "include" | "skip" | "only"
  includeSubdomains?: boolean
  limit?: number
  ignoreQueryParameters?: boolean
}

interface MapResult {
  success: boolean
  links?: string[]
  error?: string
}

export async function firecrawlMap(params: MapParams): Promise<MapResult> {
  const body = JSON.stringify({
    url: params.url,
    ...(params.search && { search: params.search }),
    ...(params.sitemap && { sitemap: params.sitemap }),
    includeSubdomains: params.includeSubdomains ?? false,
    limit: params.limit || 50,
    ignoreQueryParameters: params.ignoreQueryParameters ?? true,
  })

  const res = await fetch(`${FIRECRAWL_BASE}/map`, {
    method: "POST",
    headers: headers(),
    body,
    signal: AbortSignal.timeout(25000),
  })

  return res.json()
}

// ── Extract (structured) ──────────────────────────────────────

interface ExtractParams {
  urls: string[]
  prompt: string
  schema?: Record<string, unknown>
}

interface ExtractResult {
  success: boolean
  data?: Record<string, unknown>
  error?: string
}

export async function firecrawlExtract(params: ExtractParams): Promise<ExtractResult> {
  const body = JSON.stringify({
    urls: params.urls,
    prompt: params.prompt,
    ...(params.schema && { schema: params.schema }),
  })

  const res = await fetch(`${FIRECRAWL_BASE}/extract`, {
    method: "POST",
    headers: headers(),
    body,
    signal: AbortSignal.timeout(60000),
  })

  return res.json()
}

// ── Helper: descobrir páginas chave ───────────────────────────

export async function discoverSiteStructure(
  domain: string
): Promise<{
  totalPages: number
  keyPages: string[]
  blogPages: string[]
}> {
  const url = domain.startsWith("http") ? domain : `https://${domain}`

  try {
    const mapResult = await firecrawlMap({ url, limit: 50 })

    if (!mapResult.success || !mapResult.links) {
      return { totalPages: 0, keyPages: [], blogPages: [] }
    }

    const links = mapResult.links
    const blogPages = links.filter(
      (l) => l.includes("/blog/") || l.includes("/artigos/") || l.includes("/noticias/")
    )
    const keyPages = links.filter(
      (l) =>
        l.includes("/servicos") ||
        l.includes("/sobre") ||
        l.includes("/contato") ||
        l.includes("/precos") ||
        l.includes("/equipe")
    )

    return {
      totalPages: links.length,
      keyPages: [...new Set(keyPages)].slice(0, 10),
      blogPages: [...new Set(blogPages)].slice(0, 5),
    }
  } catch {
    return { totalPages: 0, keyPages: [], blogPages: [] }
  }
}
