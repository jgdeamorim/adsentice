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
export { domainCompetitors } from "./tools/domain-competitors"
export { rankedKeywords } from "./tools/ranked-keywords"
export { keywordGap } from "./tools/keyword-gap"
export { domainOverview } from "./tools/domain-overview"

// L4 — Keywords, SERP, Reviews
export { keywordResearch } from "./tools/keyword-research"
export { keywordVolume } from "./tools/keyword-volume"
export { keywordTrends } from "./tools/keyword-trends"
export { relatedKeywords } from "./tools/keyword-related"
export { serpOrganic } from "./tools/serp-organic"
export { serpLocalFinder } from "./tools/serp-local-finder"
export { googleReviews } from "./tools/reviews-google"
export { contentSentiment } from "./tools/content-sentiment"
export { keywordHistorical } from "./tools/keyword-historical"
export { businessQA } from "./tools/business-qa"
export { serpMaps } from "./tools/serp-maps"

// Market holds: use provider-core-adapter.ts (apps/web) — precisa de process.env Next.js
// export { appendMarketHold, ... } from "./market-holds"

// Types
export type * from "./types"
export type { LighthouseScores, LighthouseAudit } from "./tools/lighthouse"
export type { GoogleReview, GoogleReviewsResult } from "./tools/reviews-google"
export type { SerpOrganicItem, SerpOrganicResult } from "./tools/serp-organic"
export type { DomainCompetitor } from "./tools/domain-competitors"
export type { RankedKeyword } from "./tools/ranked-keywords"
export type { KeywordGapItem } from "./tools/keyword-gap"
export type { DomainOverview } from "./tools/domain-overview"
export type { KeywordResearch } from "./tools/keyword-research"
export type { LocalFinderItem } from "./tools/serp-local-finder"
