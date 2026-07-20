// ══════════════════════════════════════════════════════════════════
// ADSENTICE · L2b Content Enrichment — Barrel export
// medido=verdade · $0 · 2026-07-19
// ══════════════════════════════════════════════════════════════════

export type * from "./types"
export { fetchSite, normalizeUrl, extractDomain } from "./site-fetcher"
export { parseHTML, SERVICE_SIGNALS, PRICE_RE, BOOKING_RE, PROFESSIONAL_ID_RE, INSURANCE_LIST } from "./parser"
export {
  detectFramework, detectFrameworkSignals, resolveFramework, noisyOr,
  detectSections, detectCMS, SECTION_PATTERNS,
} from "./strategy-resolver"
export { getCached, setCache, invalidateCache, hasCache, cacheTTL, listCachedDomains, clearAllCache, cacheKey } from "./cache"
export { extractContacts } from "./extractors/contact-extractor"
export type { ContactData } from "./extractors/contact-extractor"
export { extractServices } from "./extractors/services-extractor"
export type { ServicesData } from "./extractors/services-extractor"
export { extractSocial } from "./extractors/social-extractor"
export type { SocialData } from "./extractors/social-extractor"
export { extractBooking } from "./extractors/booking-extractor"
export type { BookingData } from "./extractors/booking-extractor"
