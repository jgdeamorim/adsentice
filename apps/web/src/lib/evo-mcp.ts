// ══════════════════════════════════════════════════════════════════
// ADSENTICE · EVO-API MCP Client
// Protocolo: MCP 2024-11-05 · streamable HTTP · rmcp 0.7.0
// Servidor: http://127.0.0.1:7700/mcp
// ══════════════════════════════════════════════════════════════════

const MCP = "http://127.0.0.1:7700/mcp"

async function mcpRequest(
  method: string,
  params?: Record<string, unknown>,
  sessionId?: string
): Promise<{ result: unknown; sessionId: string | null | undefined }> {
  const body = JSON.stringify({
    jsonrpc: "2.0",
    id: Date.now(),
    method,
    params: params || {},
  })

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json, text/event-stream",
  }

  if (sessionId) headers["Mcp-Session-Id"] = sessionId

  const res = await fetch(MCP, {
    method: "POST",
    headers,
    body,
    signal: AbortSignal.timeout(25000),
  })

  const text = await res.text()
  const newSessionId = res.headers.get("mcp-session-id") || sessionId

  for (const line of text.split("\n")) {
    if (!line.startsWith("data: ")) continue
    const data = JSON.parse(line.slice(6))

    if (data.error) throw new Error(`MCP error: ${JSON.stringify(data.error)}`)
    
return { result: data.result, sessionId: newSessionId }
  }

  throw new Error(`MCP: no data (HTTP ${res.status})`)
}

export interface GMBListing {
  title: string | null
  category: string | null
  address: string | null
  rating_value: number | null
  rating_votes: number | null
  place_id: string | null
  cid: string | null
  latitude: number | null
  longitude: number | null
  is_claimed: boolean | null
}

export interface ListingsResult {
  total_count: number
  listings: GMBListing[]
  cost_usd: number
}

/** Full 27-field GMB profile from DataForSEO my_business_info/live ($0.0054/call). */
export interface GMBProfile {
  title: string
  category: string | null
  categories: string[] | null
  address: string | null
  city: string | null
  district: string | null
  country_code: string | null
  postal_code: string | null
  phone: string | null
  rating_value: number | null
  rating_votes: number | null
  is_claimed: boolean | null
  place_id: string | null
  cid: string | null
  website: string | null
  main_image: string | null
  total_photos: number | null
  description: string | null
  latitude: number | null
  longitude: number | null
  business_status: string | null
  price_level: number | null
  types: string[] | null
}

// ═══ L2 Website+SEO Interfaces (v0.3) ═══

/** OnPage Instant Audit — single-page SEO audit ($0.000125/call). */
export interface SEOInstantAudit {
  onpage_score: number            // 0-100 composite SEO score
  total_count: number             // number of SEO checks evaluated
  checks: Record<string, boolean | null>  // e.g. "no_h1_tag": true
  meta: {
    title: string | null
    description: string | null
    charset: string | null
  }
  content: {
    word_count: number
    internal_links_count: number
    external_links_count: number
    images_count: number
    plain_text_length: number
    ratio: Record<string, number>
  }
}

/** Domain Technologies — technology stack detection ($0.01/call). */
export interface DomainTechnologies {
  domain: string
  technologies: Record<string, Record<string, string[]>>
  phone_numbers: string[]
  emails: string[]
  domain_rank: number
  last_visited: string
  country_iso_code: string
}

/** Lighthouse category scores (0.0-1.0). Reserved for future batch. */
export interface LighthouseScores {
  performance: number
  accessibility: number
  best_practices: number
  seo: number
  pwa: number
}

/** Extract domain from URL (without protocol). */
export function extractDomain(url: string | null | undefined): string | null {
  if (!url) return null
  try {
    const u = new URL(url.startsWith("http") ? url : `https://${url}`)
    return u.hostname.replace(/^www\./, "")
  } catch { return null }
}

// ── L2 MCP Client Functions ──────────────────────────────────

/** OnPage Instant Audit: single-page SEO audit via EVO-API ($0.000125/call). */
export async function onPageInstantAudit(url: string): Promise<SEOInstantAudit | null> {
  const init = await mcpRequest("initialize", {
    protocolVersion: "2024-11-05",
    capabilities: {},
    clientInfo: { name: "adsentice-engine", version: "1.0" },
  })

  const sid = init.sessionId

  await fetch(MCP, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
      "Mcp-Session-Id": sid!,
    },
    body: JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }),
    signal: AbortSignal.timeout(5000),
  })

  const call = await mcpRequest(
    "tools/call",
    {
      name: "on_page_instant_pages",
      arguments: {
        url,
        mode: "live",
        tenancy_id: "adsentice-dev",
        spend_cap_usd: 0.05,
      },
    },
    sid || undefined
  )

  const content = (call.result as any)?.content?.[0]?.text
  if (!content) return null

  const data = JSON.parse(content)
  const output = data.canonical_output || {}

  return {
    onpage_score: output.onpage_score ?? 0,
    total_count: output.total_count ?? 0,
    checks: output.checks || {},
    meta: {
      title: output.meta?.title || output.title || null,
      description: output.meta?.description || output.description || null,
      charset: output.meta?.charset || null,
    },
    content: {
      word_count: output.content?.word_count || output.word_count || output.plain_text_word_count || 0,
      internal_links_count: output.content?.internal_links_count || output.internal_links_count || 0,
      external_links_count: output.content?.external_links_count || output.external_links_count || 0,
      images_count: output.content?.images_count || output.images_count || 0,
      plain_text_length: output.content?.plain_text_length || 0,
      ratio: output.content?.ratio || {},
    },
  }
}

/** Domain Technologies: detect CMS, analytics, CDN, JS frameworks ($0.01/call). */
export async function domainTechnologies(domain: string): Promise<DomainTechnologies | null> {
  const init = await mcpRequest("initialize", {
    protocolVersion: "2024-11-05",
    capabilities: {},
    clientInfo: { name: "adsentice-engine", version: "1.0" },
  })

  const sid = init.sessionId

  await fetch(MCP, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
      "Mcp-Session-Id": sid!,
    },
    body: JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }),
    signal: AbortSignal.timeout(5000),
  })

  const call = await mcpRequest(
    "tools/call",
    {
      name: "domain_analytics_technologies_domain_technologies",
      arguments: {
        target: domain,
        mode: "live",
        tenancy_id: "adsentice-dev",
        spend_cap_usd: 0.05,
      },
    },
    sid || undefined
  )

  const content = (call.result as any)?.content?.[0]?.text
  if (!content) return null

  const data = JSON.parse(content)
  const output = data.canonical_output || {}

  return {
    domain: output.domain || domain,
    technologies: output.technologies || {},
    phone_numbers: output.phone_numbers || [],
    emails: output.emails || [],
    domain_rank: output.domain_rank ?? 0,
    last_visited: output.last_visited || "",
    country_iso_code: output.country_iso_code || "",
  }
}

// ── L3 Competitive + VOC Functions ─────────────────────────────

/** Domain Competitors: TOP 20 competing domains ($0.02/call). */
export async function domainCompetitors(target: string): Promise<{ domain: string; rank: number; intersections: number }[]> {
  const init = await mcpRequest("initialize", {
    protocolVersion: "2024-11-05", capabilities: {},
    clientInfo: { name: "adsentice-engine", version: "1.0" },
  })
  const sid = init.sessionId
  await fetch(MCP, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json, text/event-stream", "Mcp-Session-Id": sid! },
    body: JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }),
    signal: AbortSignal.timeout(5000),
  })
  const call = await mcpRequest("tools/call", {
    name: "backlinks_competitors",
    arguments: { target, mode: "live", tenancy_id: "adsentice-dev", spend_cap_usd: 0.05 },
  }, sid || undefined)
  const content = (call.result as any)?.content?.[0]?.text
  if (!content) return []
  const data = JSON.parse(content)
  const output = data.canonical_output || {}
  return (output.competitors || output.items || []).map((c: any) => ({
    domain: c.domain || c.target || "?",
    rank: c.rank ?? c.domain_rank ?? 0,
    intersections: c.intersections ?? c.backlinks ?? 0,
  }))
}

/** Google Reviews via business_reviews_google ($0.005/call). */
export async function businessReviewsGoogle(placeId: string): Promise<{ reviews: { rating: number; text: string; time: string }[]; totalCount: number; avgRating: number }> {
  const init = await mcpRequest("initialize", {
    protocolVersion: "2024-11-05", capabilities: {},
    clientInfo: { name: "adsentice-engine", version: "1.0" },
  })
  const sid = init.sessionId
  await fetch(MCP, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json, text/event-stream", "Mcp-Session-Id": sid! },
    body: JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }),
    signal: AbortSignal.timeout(5000),
  })
  const call = await mcpRequest("tools/call", {
    name: "business_reviews_google",
    arguments: { place_id: placeId, mode: "live", tenancy_id: "adsentice-dev", spend_cap_usd: 0.05 },
  }, sid || undefined)
  const content = (call.result as any)?.content?.[0]?.text
  if (!content) return { reviews: [], totalCount: 0, avgRating: 0 }
  const data = JSON.parse(content)
  const output = data.canonical_output || {}
  return {
    reviews: (output.reviews || output.items || []).map((r: any) => ({
      rating: r.rating ?? r.rating_value ?? 0,
      text: r.text || r.review_text || "",
      time: r.time || r.date || "",
    })),
    totalCount: output.total_count ?? output.reviews_count ?? 0,
    avgRating: output.avg_rating ?? output.average_rating ?? 0,
  }
}

export async function businessProfileGmb(params: {
  keyword: string
  location_code?: number
  language_code?: string
}): Promise<GMBProfile | null> {
  const init = await mcpRequest("initialize", {
    protocolVersion: "2024-11-05",
    capabilities: {},
    clientInfo: { name: "adsentice-engine", version: "1.0" },
  })

  const sid = init.sessionId

  await fetch(MCP, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
      "Mcp-Session-Id": sid!,
    },
    body: JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }),
    signal: AbortSignal.timeout(5000),
  })

  const call = await mcpRequest(
    "tools/call",
    {
      name: "business_profile_gmb",
      arguments: {
        keyword: params.keyword,
        location_code: params.location_code || 2076, // Brazil
        language_code: params.language_code || "pt",
        mode: "live",
        tenancy_id: "adsentice-dev",
        spend_cap_usd: 0.05,
      },
    },
    sid || undefined
  )

  const content = (call.result as any)?.content?.[0]?.text

  if (!content) return null

  const data = JSON.parse(content)
  const output = data.canonical_output || {}

  return {
    title: output.title || "?",
    category: output.category || null,
    categories: output.categories || null,
    address: output.address || null,
    city: output.city || null,
    district: output.district || null,
    country_code: output.country_code || null,
    postal_code: output.postal_code || null,
    phone: output.phone || null,
    rating_value: output.rating_value ?? null,
    rating_votes: output.rating_votes ?? null,
    is_claimed: output.is_claimed ?? null,
    place_id: output.place_id || null,
    cid: output.cid || null,
    website: output.website || null,
    main_image: output.main_image || null,
    total_photos: output.total_photos ?? null,
    description: output.description || null,
    latitude: output.latitude ?? null,
    longitude: output.longitude ?? null,
    business_status: output.business_status || null,
    price_level: output.price_level ?? null,
    types: output.types || null,
  }
}

export async function businessListingsSearch(params: {
  categories: string[]
  lat: number
  lng: number
  radiusKm: number
  limit?: number
  offset?: number
  order_by?: string[]
  filters?: any[]
}): Promise<ListingsResult> {
  // 1. Initialize
  const init = await mcpRequest("initialize", {
    protocolVersion: "2024-11-05",
    capabilities: {},
    clientInfo: { name: "adsentice-engine", version: "1.0" },
  })

  const sid = init.sessionId

  // 2. Send initialized notification
  await fetch(MCP, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
      "Mcp-Session-Id": sid!,
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      method: "notifications/initialized",
    }),
    signal: AbortSignal.timeout(5000),
  })

  // 3. Build arguments with optional order_by, offset, filters
  const args: Record<string, unknown> = {
    categories: params.categories,
    location_coordinate: `${params.lat},${params.lng},${params.radiusKm}`,
    language_code: "pt",
    limit: params.limit || 10,
    mode: "live",
    tenancy_id: "adsentice-dev",
    spend_cap_usd: 0.05,
  }

  if (params.offset && params.offset > 0) {
    args.offset = params.offset
  }

  if (params.order_by && params.order_by.length > 0) {
    args.order_by = params.order_by
  }

  if (params.filters && params.filters.length > 0) {
    args.filters = params.filters
  }

  // 3. Call business_listings_search
  const call = await mcpRequest(
    "tools/call",
    {
      name: "business_listings_search",
      arguments: args,
    },
    sid || undefined
  )

  // 4. Parse result
  const content = (call.result as any)?.content?.[0]?.text

  if (!content) throw new Error("MCP: no content in response")

  const data = JSON.parse(content)

  let cost_usd = 0
  const bill = data.billing_event

  if (typeof bill === "string") {
    const m = bill.match(/provider_cost_usd:\s*([\d.]+)/)

    if (m) cost_usd = parseFloat(m[1])
  }

  const output = data.canonical_output || {}

  
return {
    total_count: output.total_count || 0,
    listings: output.listings || [],
    cost_usd,
  }
}
