// ══════════════════════════════════════════════════════════════════
// ADSENTICE · L2b Content Enrichment — Social Extractor
// Extrai: Instagram, Facebook, TikTok, YouTube, LinkedIn dos links
// Multi-nicho: 29 categorias SMB
// medido=verdade · $0 · 2026-07-19
// ══════════════════════════════════════════════════════════════════

import type { ParsedSite } from "../types"

export interface SocialData {
  instagram: string | null
  facebook: string | null
  tiktok: string | null
  youtube: string | null
  linkedin: string | null
  twitter: string | null
  allLinks: { platform: string; url: string }[]
  socialCount: number
  hasAny: boolean
}

/**
 * Extrai links de redes sociais do ParsedSite.
 * Prioriza links explícitos do parser, fallback regex no body text.
 */
export function extractSocial(site: ParsedSite): SocialData {
  const result: SocialData = {
    instagram: null, facebook: null, tiktok: null,
    youtube: null, linkedin: null, twitter: null,
    allLinks: [], socialCount: 0, hasAny: false,
  }

  // ── Camada 1: Links já classificados pelo parser ──
  for (const link of site.links) {
    if (!link.isSocial || !link.platform) continue
    result.allLinks.push({ platform: link.platform, url: link.href })

    switch (link.platform) {
      case "instagram": if (!result.instagram) result.instagram = link.href; break
      case "facebook": if (!result.facebook) result.facebook = link.href; break
      case "tiktok": if (!result.tiktok) result.tiktok = link.href; break
      case "youtube": if (!result.youtube) result.youtube = link.href; break
      case "linkedin": if (!result.linkedin) result.linkedin = link.href; break
      case "twitter": if (!result.twitter) result.twitter = link.href; break
    }
  }

  // ── Camada 2: Fallback — busca no body text por @handles ──
  const body = site.bodyText

  if (!result.instagram) {
    const m = body.match(/instagram\.com\/([a-zA-Z0-9._]+)/i)
    if (m) result.instagram = `https://instagram.com/${m[1]}`
  }
  if (!result.facebook) {
    const m = body.match(/facebook\.com\/([a-zA-Z0-9.]+)/i)
    if (m) result.facebook = `https://facebook.com/${m[1]}`
  }
  if (!result.tiktok) {
    const m = body.match(/tiktok\.com\/@([a-zA-Z0-9._]+)/i)
    if (m) result.tiktok = `https://tiktok.com/@${m[1]}`
  }
  if (!result.youtube) {
    const m = body.match(/youtube\.com\/@([a-zA-Z0-9._]+)/i)
    if (m) result.youtube = `https://youtube.com/@${m[1]}`
    if (!result.youtube) {
      const m2 = body.match(/youtube\.com\/channel\/([a-zA-Z0-9_-]+)/i)
      if (m2) result.youtube = `https://youtube.com/channel/${m2[1]}`
    }
  }
  if (!result.linkedin) {
    const m = body.match(/linkedin\.com\/company\/([a-zA-Z0-9-]+)/i)
    if (m) result.linkedin = `https://linkedin.com/company/${m[1]}`
  }

  // ── Contagem ──
  result.allLinks = dedupeBy(result.allLinks, l => l.url)
  result.socialCount = [
    result.instagram, result.facebook, result.tiktok,
    result.youtube, result.linkedin, result.twitter,
  ].filter(Boolean).length
  result.hasAny = result.socialCount > 0

  return result
}

function dedupeBy<T>(arr: T[], fn: (item: T) => string): T[] {
  const seen = new Set<string>()
  return arr.filter(item => {
    const key = fn(item)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}
