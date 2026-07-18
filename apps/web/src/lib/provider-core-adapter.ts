// ══════════════════════════════════════════════════════════════════
// ADSENTICE · provider-core adapter — substitui evo-mcp.ts
// Importa direto do source (Next.js bundler resolve .ts nativo)
// medido=verdade · 2026-07-15
// ══════════════════════════════════════════════════════════════════

// ═══ Client (singleton com credenciais do .env) ═══

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
    const url = `${this.baseUrl}${endpoint}`  // SEM .ai — respostas flatten quebram tasks[0].result[0]

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
  const login = process.env.DATAFORSEO_LOGIN || ""
  const password = process.env.DATAFORSEO_PASSWORD || ""
  const mode = (process.env.DATAFORSEO_MODE as "sandbox" | "live") || "live"

  if (!login || !password) throw new Error("DATAFORSEO_LOGIN + DATAFORSEO_PASSWORD required")
  
return new DataForSEOClient(login, password, mode)
}

// _client is created fresh on every call in getClient() — no singleton cache needed

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

  console.log(`[adapter:L0] mode=${c.mode}, hasAuth=${!!c.authHeader}, coord=${toCoord(params.lat, params.lng, params.radiusKm)}`)

  const body = [{
    categories: params.categories,
    location_coordinate: toCoord(params.lat, params.lng, params.radiusKm),
    limit: params.limit || 100,  // DataForSEO default=100, max=1000
    offset: params.offset || 0,
    order_by: params.order_by || undefined,
    filters: params.filters || undefined,
  }]

  const data = await c.post<{ tasks?: Array<{ status_code?: number; status_message?: string; cost?: number; result?: Array<{ total_count?: number; items?: Record<string, unknown>[] }> }> }>("/v3/business_data/business_listings/search/live", body)
  const result = data.tasks?.[0]?.result?.[0]
  const items = result?.items || []
  const totalCount = result?.total_count ?? items.length  // total_count=mercado real, items=retornados nesta página

  const listings: BusinessListing[] = items.map(item => {
    const rating = (item.rating || {}) as Record<string, unknown>
    const addrInfo = (item.address_info || {}) as Record<string, unknown>

    
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

      // Extra fields from address_info (L0 — needed for L4 IBGE matching)
      city: (addrInfo.city as string) || null,
      district: (addrInfo.borough as string) || null,
      website: (item.url as string) || null,
    } as any
  })

  // Check API-level status — 40501 = invalid params (e.g. too many categories)
  const apiStatus = data.tasks?.[0]?.status_code
  const apiCost = data.tasks?.[0]?.cost ?? 0

  if (apiStatus && apiStatus !== 20000) {
    const msg = data.tasks?.[0]?.status_message || "Unknown API error"
    console.warn(`[provider-core] L0 API error: status=${apiStatus} · ${msg}`)
    return { total_count: 0, listings: [], cost_usd: apiCost }  // cost=0 for errors
  }


return { total_count: totalCount, listings, cost_usd: apiCost || 0.048 }
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

/** L1 BATCH: Google Business Profile — até 100 keywords em 1 POST. */
export async function businessProfileGmbBatch(keywords: string[]): Promise<{
  profiles: (GMBProfile | null)[]
  cost_usd: number                       // custo REAL retornado pela API
}> {
  const c = getClient()

  // Doc: max 100 tasks per POST
  const batchSize = 100
  const profiles: (GMBProfile | null)[] = []
  let totalCost = 0

  for (let i = 0; i < keywords.length; i += batchSize) {
    const chunk = keywords.slice(i, i + batchSize)

    const body = chunk.map(kw => ({
      keyword: kw,
      location_code: 2076,
      language_code: "pt",
    }))

    const data = await c.post<{ cost?: number; items: Record<string, unknown>[] }>(
      "/v3/business_data/google/my_business_info/live", body)

    // Custo REAL da API (não hardcoded)
    totalCost += data.cost || 0

    // Response items are in same order as body tasks
    const items = data.items || []

    for (let j = 0; j < chunk.length; j++) {
      const item = items[j]

      if (!item || !item.place_id) {
        profiles.push(null)
        continue
      }

      const rating = (item.rating || {}) as Record<string, unknown>
      const addrInfo = (item.address_info || {}) as Record<string, unknown>

      profiles.push({
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
      })
    }
  }


return { profiles, cost_usd: totalCost }
}

/** L2: OnPage Instant Pages — $0.000125/call */
export async function onPageInstantAudit(url: string): Promise<SEOInstantAudit | null> {
  const c = getClient()
  const body = [{ url, enable_javascript: false, accept_language: "pt-BR" }]
  const data = await c.post<{ tasks?: Array<{ result?: Array<{ items?: Record<string, unknown>[] }> }>; items?: Record<string, unknown>[] }>("/v3/on_page/instant_pages", body)
  // shape cru DataForSEO: tasks[0].result[0].items[0] (fix v088 — {items} direto nunca existiu; L2 retornava null silencioso)
  const item = data.tasks?.[0]?.result?.[0]?.items?.[0] ?? data.items?.[0]

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
  const data = await c.post<{ tasks?: Array<{ result?: Array<Record<string, unknown>> }>; items?: Record<string, unknown>[] }>("/v3/domain_analytics/technologies/domain_technologies/live", body)
  // shape real technologies/live: tasks[0].result[0] É o item (sem .items — medido curl 2026-07-18)
  const r0 = data.tasks?.[0]?.result?.[0] as Record<string, unknown> | undefined
  const item = (r0 as any)?.items?.[0] ?? r0 ?? data.items?.[0]

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

// ── FASE 1 · L2-L4 (medido=verdade) ──

/** L2: Lighthouse Audit — $0.00425/call */
export async function onPageLighthouse(url: string): Promise<{ performance: number; accessibility: number; best_practices: number; seo: number } | null> {
  const c = getClient()
  const body = JSON.stringify([{ url }])

  const res = await fetch(`${c.baseUrl}/v3/on_page/lighthouse/live/json`, {
    method: "POST",
    headers: { Authorization: c.authHeader, "Content-Type": "application/json" },
    body,
  })

  if (!res.ok) return null
  const data = await res.json() as { tasks?: Array<{ result?: Array<{ categories?: Record<string, { score: number }> }> }> }
  const result = data.tasks?.[0]?.result?.[0]

  if (!result?.categories) return null
  const cats = result.categories

  
return {
    performance: cats.performance?.score ?? 0,
    accessibility: cats.accessibility?.score ?? 0,
    best_practices: cats["best-practices"]?.score ?? 0,
    seo: cats.seo?.score ?? 0,
  }
}

/** L4: SERP Organic — $0.002/call */
export async function serpOrganic(keyword: string, depth = 10): Promise<{ domain: string; position: number; title: string }[]> {
  const c = getClient()
  const body = JSON.stringify([{ keyword, location_code: 2076, language_code: "pt", depth }])

  const res = await fetch(`${c.baseUrl}/v3/serp/google/organic/live/regular`, {
    method: "POST",
    headers: { Authorization: c.authHeader, "Content-Type": "application/json" },
    body,
  })

  if (!res.ok) return []
  const data = await res.json() as { tasks?: Array<{ result?: Array<{ items?: Record<string, unknown>[] }> }> }
  const items = data.tasks?.[0]?.result?.[0]?.items || []

  
return items
    .filter(item => (item.type as string) === "organic")
    .map(item => {
      const url = (item.url as string) || ""

      
return {
        domain: extractDomain(url) || "",
        position: (item.rank_absolute as number) ?? (item.rank_group as number) ?? 0,
        title: (item.title as string) || "",
      }
    })
}

/** L4: Google Reviews — $0.00075/call (task-based) */
export async function googleReviews(params: {
  keyword: string; location_code?: number; language_code?: string; depth?: number
}): Promise<{ rating_value: number | null; reviews_count: number; reviews: { rating: number; review_text: string; reviewer_name: string | null }[] } | null> {
  const c = getClient()
  const postBody = JSON.stringify([{ keyword: params.keyword, location_code: params.location_code || 2076, language_code: params.language_code || "pt", depth: params.depth || 10 }])

  const postRes = await fetch(`${c.baseUrl}/v3/business_data/google/reviews/task_post`, {
    method: "POST", headers: { Authorization: c.authHeader, "Content-Type": "application/json" }, body: postBody,
  })

  if (!postRes.ok) return null
  const postData = await postRes.json() as { tasks?: Array<{ id?: string }> }
  const taskId = postData.tasks?.[0]?.id

  if (!taskId) return null

  for (let i = 0; i < 8; i++) {
    await new Promise(r => setTimeout(r, 3000))
    const pollRes = await fetch(`${c.baseUrl}/v3/business_data/google/reviews/task_get/${taskId}`, { headers: { Authorization: c.authHeader } })

    if (!pollRes.ok) continue
    const pollData = await pollRes.json() as { tasks?: Array<{ status_code?: number; result?: Array<Record<string, unknown>> }> }
    const task = pollData.tasks?.[0]

    if (task?.status_code === 20000 && task.result) {
      const block = task.result[0]
      const items = (block?.items || []) as Record<string, unknown>[]

      
return {
        rating_value: (block?.rating_value as number) ?? null,
        reviews_count: (block?.reviews_count as number) ?? items.length,
        reviews: items.map(r => {
          const rObj = (r.rating || {}) as Record<string, unknown>

          
return { rating: (rObj.value as number) ?? 0, review_text: (r.review_text as string) || "", reviewer_name: (r.profile_name as string) || null }
        }),
      }
    }

    if (task?.status_code === 40601) break
  }

  
return null
}

// ── Market Holds (rsxt-t0 append) ──

export interface MarketHoldInput {
  tenant?: string; category: string; city: string
  metric: string; value: number; source?: string; searchId?: string
  metadata?: Record<string, unknown>
}

export async function appendMarketHolds(holds: MarketHoldInput[]): Promise<void> {
  try {
    const { getAdminClient } = await import("./supabase-admin")
    const supabase = getAdminClient()

    const rows = holds.map(hold => ({
      tenant: hold.tenant || 'adsentice',
      category: hold.category,
      city: hold.city,
      metric: hold.metric,
      value: hold.value,
      source: hold.source || 'supabase_aggregate',
      search_id: hold.searchId || null,
      metadata: hold.metadata || {},
    }))

    // UPSERT: mesmo (search_id, category, city, metric) = atualiza value.
    // Diferentes search_id = novo snapshot (time-series preservada).
    // Migration 013 garante UNIQUE constraint como safety net.
    const { error } = await supabase
      .from("market_holds")
      .upsert(rows, {
        onConflict: "search_id, category, city, metric",
        ignoreDuplicates: false,  // update value + metadata on conflict
      })

    if (error) console.error("[appendMarketHolds] upsert error:", error.message)
  } catch (e: any) {
    console.error("[appendMarketHolds] supabase offline:", e.message)
  }
}

// ── L2 Content Parsing (social media + contacts from website) ──

export interface WebsiteContacts {
  social_links: { platform: string; url: string }[]
  emails: string[]
  phones: string[]
  whatsapp_numbers: string[]
  extracted_at: string
}

/** Extract social links, emails, phones from website HTML via DataForSEO content parsing. $0.0005/call */
export async function parseWebsiteContacts(url: string): Promise<WebsiteContacts | null> {
  const c = getClient()

  try {
    const body = JSON.stringify([{ url, enable_javascript: false }])

    const res = await fetch(`${c.baseUrl}/v3/on_page/content_parsing/live`, {
      method: "POST",
      headers: { Authorization: c.authHeader, "Content-Type": "application/json" },
      body,
    })

    if (!res.ok) return null
    const data = await res.json() as { tasks?: Array<{ result?: Array<{ items?: Array<{ type: string; url?: string; text?: string }> }> }> }
    const items = data.tasks?.[0]?.result?.[0]?.items || []

    const social_links: { platform: string; url: string }[] = []
    const emails: string[] = []
    const phones: string[] = []
    const whatsapp_numbers: string[] = []

    const SOCIAL_DOMAINS: Record<string, string> = {
      "facebook.com": "Facebook", "instagram.com": "Instagram",
      "twitter.com": "Twitter", "x.com": "Twitter/X",
      "linkedin.com": "LinkedIn", "youtube.com": "YouTube",
      "tiktok.com": "TikTok", "pinterest.com": "Pinterest",
      "wa.me": "WhatsApp", "api.whatsapp.com": "WhatsApp",
    }

    const EMAIL_RE = /[\w.-]+@[\w.-]+\.\w+/g
    const PHONE_BR_RE = /(?:\(?\d{2}\)?\s?)?(?:\d{4,5}-?\d{4}|9\d{4}-?\d{4})/g

    for (const item of items) {
      const urlStr = item.url || ""
      const text = item.text || ""

      // Social links
      for (const [domain, platform] of Object.entries(SOCIAL_DOMAINS)) {
        if (urlStr.includes(domain)) {
          social_links.push({ platform, url: urlStr })
        }
      }

      // Emails
      for (const match of text.matchAll(EMAIL_RE)) {
        if (!emails.includes(match[0])) emails.push(match[0])
      }

      // Phones (Brazil pattern)
      for (const match of text.matchAll(PHONE_BR_RE)) {
        const phone = match[0].replace(/[^0-9]/g, "")

        if (phone.length >= 10) {
          if (phone.length === 11 && (phone.startsWith("9") || phone[2] === "9")) {
            if (!whatsapp_numbers.includes(phone)) whatsapp_numbers.push(phone)
          } else if (!phones.includes(phone)) {
            phones.push(phone)
          }
        }
      }
    }

    return {
      social_links: social_links.slice(0, 20),
      emails: emails.slice(0, 10),
      phones: phones.slice(0, 10),
      whatsapp_numbers: whatsapp_numbers.slice(0, 10),
      extracted_at: new Date().toISOString(),
    }
  } catch { return null }
}
