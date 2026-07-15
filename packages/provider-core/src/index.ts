// ══════════════════════════════════════════════════════════════════
// ADSENTICE · provider-core — barrel export
// DataForSEO direto. Zero intermediários. medido=verdade.
//
// Uso:
//   import { businessListingsSearch, getDFSEOClient } from "@adsentice/provider-core"
//
//   const result = await businessListingsSearch({
//     categories: ["dentist"],
//     location_coordinate: "-22.8698,-43.3406,3",
//   })
//
// Inspirado no DataForSEO MCP Server oficial (Apache 2.0):
//   EVO-API/self-essentials/mcp-server-typescript-master/
//
// ══════════════════════════════════════════════════════════════════

// Client
export { DataForSEOClient, getDFSEOClient, setDFSEOClient } from "./client"

// L0 — Discovery
export { businessListingsSearch, parseListingExtra } from "./tools/business-listings-search"
export type { ListingExtra } from "./tools/business-listings-search"

// L1 — Profile (custom — not in official MCP server)
export { businessProfileGmb } from "./tools/business-profile-gmb"

// L2 — Website+SEO
export { onPageInstantPages } from "./tools/instant-pages"
export { domainTechnologies } from "./tools/domain-technologies"
export { onPageLighthouse } from "./tools/lighthouse"

// L3 — Competitive
export { backlinksCompetitors, extractDomain } from "./tools/backlinks-competitors"

// L4 — Keywords, SERP, Reviews
export { serpOrganic } from "./tools/serp-organic"
export { googleReviews } from "./tools/reviews-google"

// Types
export type * from "./types"
export type { LighthouseScores, LighthouseAudit } from "./tools/lighthouse"
export type { GoogleReview, GoogleReviewsResult } from "./tools/reviews-google"
export type { SerpOrganicItem, SerpOrganicResult } from "./tools/serp-organic"
