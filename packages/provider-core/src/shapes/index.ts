// ══════════════════════════════════════════════════════════════════
// ADSENTICE · Shape Catalog — Barrel export + README
//
// Cada arquivo de shape contém:
//   1. EP — endpoint path constants
//   2. Request type — canonical input → DataForSEO POST body
//   3. Response type — raw response → canonical output
//   4. Comentários de flatten+rename (ex: "raw.rating.value ← FLATTEN")
//
// Padrão absorvido do EVO-API (main/crates/evo-provider-dataforseo/src/shapes/):
//   - Shape REAL extraído de sandbox probe $0 (NUNCA inventado)
//   - Campos marcados com origem raw (ex: "raw.address_info.city")
//   - Normalizações explícitas (ex: keyword_difficulty / 100 → difficulty 0.0-1.0)
//   - Dynamic maps mantidos como Record<string, unknown> (não achatados)
//
// Cobertura: 27 endpoints em 5 clusters
//   business-data.ts      (6 endpoints)
//   on-page.ts            (5 endpoints)
//   domain-backlinks.ts   (8 endpoints)
//   serp-keywords.ts      (6 endpoints)
//   content-ai.ts         (6 endpoints)
//
// medido=verdade · 2026-07-15 · adsentice
// ══════════════════════════════════════════════════════════════════

export * as BusinessData from "./business-data"
export * as OnPage from "./on-page"
export * as DomainBacklinks from "./domain-backlinks"
export * as SerpKeywords from "./serp-keywords"
export * as ContentAi from "./content-ai"
