// ══════════════════════════════════════════════════════════════════
// ADSENTICE · provider-core adapter — substitui evo-mcp.ts
// Importa direto do source (Next.js bundler resolve .ts nativo)
// medido=verdade · 2026-07-15
// ══════════════════════════════════════════════════════════════════

// ═══ Client (singleton com credenciais do .env) ═══

let _client: DataForSEOClient | null = null

class DataForSEOClient {
  authHeader: string
  mode: "sandbox" | "live"

  constructor(login: string, password: string, mode: "sandbox" | "live" = "live") {
    const encoded = Buffer.from(`${login}:${password}`).toString("base64")
    this.authHeader = `Basic ${encoded}`
    this.mode = mode
  }

  get baseUrl() { return this.mode === "sandbox" ? "https://sandbox.dataforseo.com" : "https://api.dataforseo.com" }

  async post<T>(endpoint: string, body: unknown[]): Promise<T> {
    const url = `${this.baseUrl}${endpoint}.ai`
    const res = await fetch(url, {
      method: "POST",
      headers: { Authorization: this.authHeader, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
    if (!res.ok) {
      const text = await res.text().catch(() => "")
      throw new Error(`DataForSEO HTTP ${res.status}: ${text.slice(0, 300)}`)
    }
    return res.json() as Promise<T>
  }
}

function getClient(): DataForSEOClient {
  if (!_client) {
    const login = process.env.DATAFORSEO_LOGIN || ""
    const password = process.env.DATAFORSEO_PASSWORD || ""
    const mode = (process.env.DATAFORSEO_MODE as "sandbox" | "live") || "live"
    if (!login || !password) throw new Error("DATAFORSEO_LOGIN + DATAFORSEO_PASSWORD required")
    _client = new DataForSEOClient(login, password, mode)
  }
  return _client
}

// ═══ Types ═══

export interface BusinessListing {
  title: string | null; category: string | null; address: string | null
  rating_value: number | null; rating_votes: number | null
  place_id: string | null; cid: string | null
  latitude: number | null; longitude: number | null; is_claimed: boolean | null
}
export type GMBListing = BusinessListing

export interface GMBProfile {
  title: string; category: string | null; categories: string[] | null
  address: string | null; city: string | null; district: string | null
  country_code: string | null; postal_code: string | null; phone: string | null
  rating_value: number | null; rating_votes: number | null
  is_claimed: boolean | null; place_id: string | null; cid: string | null
  website: string | null; main_image: string | null; total_photos: number | null
  description: string | null; latitude: number | null; longitude: number | null
  business_status: string | null; price_level: number | null; types: string[] | null
}

export interface SEOInstantAudit {
  onpage_score: number; total_count: number
  checks: Record<string, boolean | null>
  meta: { title: string | null; description: string | null; charset: string | null }
  content: { word_count: number; internal_links_count: number; external_links_count: number; images_count: number; plain_text_length: number; ratio: Record<string, number> }
}

export interface DomainTechnologies {
  domain: string; technologies: Record<string, Record<string, string[]>>
  phone_numbers: string[]; emails: string[]
  domain_rank: number; last_visited: string; country_iso_code: string
}

export interface CompetitorDomain { domain: string; rank: number; intersections: number }

// ═══ Helpers ═══

export function extractDomain(url: string | null | undefined): string | null {
  if (!url) return null
  try {
    const u = new URL(url.startsWith("http") ? url : `https://${url}`)
    return u.hostname.replace(/^www\./, "")
  } catch { return null }
}

function toCoord(lat: number, lng: number, radiusKm: number): string {
  return `${lat.toFixed(7)},${lng.toFixed(7)},${radiusKm}`
}

// ═══ API Functions (direct DataForSEO, 1 hop) ═══

/** L0: Business Listings Search — $0.015/busca */
export async function businessListingsSearch(params: {
  categories: string[]; lat: number; lng: number; radiusKm: number
  limit?: number; offset?: number; order_by?: string[]; filters?: unknown[]
}) {
  const c = getClient()
  const body = [{
    categories: params.categories,
    location_coordinate: toCoord(params.lat, params.lng, params.radiusKm),
    language_code: "pt",
    limit: params.limit || 50,
    offset: params.offset || 0,
    order_by: params.order_by || undefined,
    filters: params.filters || undefined,
  }]
  const data = await c.post<{ items: Record<string, unknown>[] }>("/v3/business_data/business_listings/search/live", body)
  const items = data.items || []
  const listings: BusinessListing[] = items.map(item => {
    const rating = (item.rating || {}) as Record<string, unknown>
    return {
      title: (item.title as string) || null,
      category: (item.category as string) || null,
      address: (item.address as string) || null,
      rating_value: (rating.value as number) ?? null,
      rating_votes: (rating.votes_count as number) ?? null,
      place_id: (item.place_id as string) || null,
      cid: (item.cid as string) || null,
      latitude: (item.latitude as number) ?? null,
      longitude: (item.longitude as number) ?? null,
      is_claimed: (item.is_claimed as boolean) ?? null,
    }
  })
  return { total_count: items.length, listings, cost_usd: items.length * 0.0003 }
}

/** L1: Google Business Profile — $0.0054/lead */
export async function businessProfileGmb(params: {
  keyword: string; location_code?: number; language_code?: string
}): Promise<GMBProfile | null> {
  const c = getClient()
  const body = [{
    keyword: params.keyword,
    location_code: params.location_code || 2076,
    language_code: params.language_code || "pt",
  }]
  const data = await c.post<{ items: Record<string, unknown>[] }>("/v3/business_data/google/my_business_info/live", body)
  const item = data.items?.[0]
  if (!item) return null
  const rating = (item.rating || {}) as Record<string, unknown>
  const addrInfo = (item.address_info || {}) as Record<string, unknown>
  return {
    title: (item.title as string) || "?",
    category: (item.category as string) || null,
    categories: (item.category_ids as string[]) || null,
    address: (item.address as string) || null,
    city: (addrInfo.city as string) || null,
    district: (addrInfo.borough as string) || null,
    country_code: (addrInfo.country_code as string) || null,
    postal_code: (addrInfo.zip as string) || null,
    phone: (item.phone as string) || null,
    rating_value: (rating.value as number) ?? null,
    rating_votes: (rating.votes_count as number) ?? null,
    is_claimed: (item.is_claimed as boolean) ?? null,
    place_id: (item.place_id as string) || null,
    cid: (item.cid as string) || null,
    website: (item.url as string) || null,
    main_image: (item.main_image as string) || null,
    total_photos: (item.total_photos as number) ?? null,
    description: (item.description as string) || null,
    latitude: (item.latitude as number) ?? null,
    longitude: (item.longitude as number) ?? null,
    business_status: (item.business_status as string) || null,
    price_level: (item.price_level as number) ?? null,
    types: (item.types as string[]) || null,
  }
}

/** L2: OnPage Instant Pages — $0.000125/call */
export async function onPageInstantAudit(url: string): Promise<SEOInstantAudit | null> {
  const c = getClient()
  const body = [{ url, enable_javascript: false, accept_language: "pt-BR" }]
  const data = await c.post<{ items: Record<string, unknown>[] }>("/v3/on_page/instant_pages", body)
  const item = data.items?.[0]
  if (!item) return null
  const resource = (item.resource || item) as Record<string, unknown>
  const meta = (resource.meta || {}) as Record<string, unknown>
  const content = (resource.content || {}) as Record<string, unknown>
  const checks = (resource.checks || resource.onpage_score_checks || {}) as Record<string, boolean | null>
  return {
    onpage_score: (resource.onpage_score as number) ?? 0,
    total_count: (resource.total_count as number) ?? 0,
    checks,
    meta: { title: (meta.title as string) || null, description: (meta.description as string) || null, charset: (meta.charset as string) || null },
    content: {
      word_count: (content.word_count as number) || 0,
      internal_links_count: (content.internal_links_count as number) || 0,
      external_links_count: (content.external_links_count as number) || 0,
      images_count: (content.images_count as number) || 0,
      plain_text_length: (content.plain_text_length as number) || 0,
      ratio: (content.ratio as Record<string, number>) || {},
    },
  }
}

/** L2: Domain Technologies — $0.01/call */
export async function domainTechnologies(domain: string): Promise<DomainTechnologies | null> {
  const c = getClient()
  const body = [{ target: domain }]
  const data = await c.post<{ items: Record<string, unknown>[] }>("/v3/domain_analytics/technologies/domain_technologies/live", body)
  const item = data.items?.[0]
  if (!item) return null
  return {
    domain: (item.domain as string) || domain,
    technologies: (item.technologies as Record<string, Record<string, string[]>>) || {},
    phone_numbers: (item.phone_numbers as string[]) || [],
    emails: (item.emails as string[]) || [],
    domain_rank: (item.domain_rank as number) ?? 0,
    last_visited: (item.last_visited as string) || "",
    country_iso_code: (item.country_iso_code as string) || "",
  }
}
