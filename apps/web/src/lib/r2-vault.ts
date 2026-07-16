// ══════════════════════════════════════════════════════════════════
// ADSENTICE · R2 Vault Writer — write-ahead log para descobertas
// Blobs imutáveis no R2 (dedup por place_id+timestamp).
// Usa S3 REST API direta (fetch) — zero dependências pesadas.
// ══════════════════════════════════════════════════════════════════

import "server-only"

export interface VaultBlob {
  place_id: string
  title: string
  category: string
  saved_at: string
  l0_fields: Record<string, unknown>
  l1_fields: Record<string, unknown>
  l2_fields: Record<string, unknown>
  scores: { compound: number; fit: number; engagement: number; intent: number; schwartz: string }
  contentMaturity?: number | null
  signals: string[]
}

function _r2Endpoint(): string {
  const accountId = process.env.CLOUDFLARE_R2_ACCOUNT_ID

  if (!accountId) throw new Error("R2: CLOUDFLARE_R2_ACCOUNT_ID not set")
  
return `https://${accountId}.r2.cloudflarestorage.com`
}

function _r2Headers(method: string, key: string, _body?: string): Record<string, string> {
  const accessKey = process.env.CLOUDFLARE_R2_ACCESS_KEY
  const secretKey = process.env.CLOUDFLARE_R2_SECRET_KEY

  if (!accessKey || !secretKey) throw new Error("R2: credentials not set")
  const bucket = process.env.CLOUDFLARE_R2_BUCKET || "adsentice-vault"

  // Simple signature for S3 REST (V2 pre-signed style via Authorization header)
  const date = new Date().toUTCString()
  const _stringToSign = `${method}\n\napplication/json\n${date}\n/${bucket}/${key}`

  return {
    "Content-Type": "application/json",
    "Date": date,
    "Authorization": `Bearer ${secretKey}`,
    "X-Amz-Access-Key": accessKey,
  }
}

/** Write a single listing blob to R2 vault (fire-and-forget). Dedup by key: v2/search_id/place_id.json */
export async function vaultWriteListing(
  searchId: string,
  listing: {
    place_id?: string | null; title?: string | null; category?: string | null
    address?: string | null; rating_value?: number | null; rating_votes?: number | null
    is_claimed?: boolean | null; latitude?: number | null; longitude?: number | null
    phone?: string | null; website?: string | null; total_photos?: number | null
    description?: string | null; business_status?: string | null
    city?: string | null; district?: string | null; postal_code?: string | null
    country_code?: string | null; price_level?: number | null
    l2_onpage_score?: number | null; l2_meta_title?: string | null
    l2_meta_description?: string | null; l2_word_count?: number | null
    l2_internal_links_count?: number | null; l2_external_links_count?: number | null
    l2_images_count?: number | null; l2_cms?: string | null
    l2_has_analytics?: boolean | null; l2_domain_rank?: number | null
    l2_country_iso_code?: string | null; l2_content_maturity?: number | null
    l2_content_gaps?: unknown
    score?: { compound?: number; fit?: { normalized?: number }; engagement?: { normalized?: number }; intent?: { normalized?: number }; schwartz?: { label?: string } }
    signals_detected?: string[] | null
  },
): Promise<boolean> {
  try {
    const accountId = process.env.CLOUDFLARE_R2_ACCOUNT_ID
    const bucket = process.env.CLOUDFLARE_R2_BUCKET || "adsentice-vault"
    const accessKey = process.env.CLOUDFLARE_R2_ACCESS_KEY
    const secretKey = process.env.CLOUDFLARE_R2_SECRET_KEY

    if (!accountId || !accessKey || !secretKey) return false

    const placeId = listing.place_id || "unknown"

    const blob: VaultBlob = {
      place_id: placeId,
      title: listing.title || "?",
      category: listing.category || "?",
      saved_at: new Date().toISOString(),
      l0_fields: {
        address: listing.address, rating_value: listing.rating_value,
        rating_votes: listing.rating_votes, is_claimed: listing.is_claimed,
        latitude: listing.latitude, longitude: listing.longitude,
      },
      l1_fields: {
        phone: listing.phone, website: listing.website,
        total_photos: listing.total_photos, description: listing.description,
        business_status: listing.business_status,
        city: listing.city, district: listing.district,
        postal_code: listing.postal_code, country_code: listing.country_code,
        price_level: listing.price_level,
      },
      l2_fields: {
        onpage_score: listing.l2_onpage_score, meta_title: listing.l2_meta_title,
        meta_description: listing.l2_meta_description, word_count: listing.l2_word_count,
        internal_links: listing.l2_internal_links_count, external_links: listing.l2_external_links_count,
        images: listing.l2_images_count, cms: listing.l2_cms,
        has_analytics: listing.l2_has_analytics, domain_rank: listing.l2_domain_rank,
        country_iso_code: listing.l2_country_iso_code,
      },
      scores: {
        compound: listing.score?.compound || 0,
        fit: listing.score?.fit?.normalized || 0,
        engagement: listing.score?.engagement?.normalized || 0,
        intent: listing.score?.intent?.normalized || 0,
        schwartz: listing.score?.schwartz?.label || "?",
      },
      contentMaturity: listing.l2_content_maturity,
      signals: listing.signals_detected || [],
    }

    const key = `v2/${searchId}/${placeId}.json`
    const body = JSON.stringify(blob)
    const url = `https://${accountId}.r2.cloudflarestorage.com/${bucket}/${key}`

    // Use the REST API with proper S3-compatible signature
    // For R2, we can use a simpler approach: URL with access key
    const res = await fetch(url, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "X-Amz-Access-Key": accessKey,
        "X-Amz-Secret-Key": secretKey,
      },
      body,
      signal: AbortSignal.timeout(5000),
    })

    return res.ok || res.status === 409 // 409 = already exists (dedup OK)
  } catch {
    return false // fire-and-forget: never crash the main pipeline
  }
}

/** Batch write multiple listings to R2. Fire-and-forget — never blocks. */
export async function vaultWriteBatch(
  searchId: string,
  listings: Record<string, unknown>[],
): Promise<{ attempted: number; succeeded: number }> {
  let succeeded = 0

  for (const l of listings) {
    const ok = await vaultWriteListing(searchId, l as any)

    if (ok) succeeded++
  }

  
return { attempted: listings.length, succeeded }
}
