// ══════════════════════════════════════════════════════════════════
// ADSENTICE · Secrets Manager — sem .env filesystem
//
// Estratégia Enterprise:
//   Dev: process.env (Next.js .env local, gitignored)
//   Prod: Cloudflare Workers Secrets + Supabase Vault
//
// NUNCA hardcoded. NUNCA em arquivo tracked. NUNCA em docs/secret/.
//
// Uso:
//   import { getSecret } from "@/lib/secrets"
//   const key = getSecret("DATAFORSEO_LOGIN")
//
// medido=verdade · 2026-07-15 · adsentice
// ══════════════════════════════════════════════════════════════════

/**
 * Get a secret. Priority:
 *   1. process.env (Next.js server-side, .env gitignored)
 *   2. Cloudflare Workers: context.env (injected at edge)
 *   3. Supabase Vault: pgsodium encrypted (future — requires RPC)
 */
export function getSecret(name: string): string {
  // Server-side: Next.js injects .env into process.env
  if (typeof process !== "undefined" && process.env) {
    const v = process.env[name]
    if (v) return v
  }

  // Cloudflare Workers: env bindings
  try {
    const ctx = (globalThis as any).__cf_env
    if (ctx?.[name]) return ctx[name]
  } catch { /* not in CF Workers */ }

  return ""
}

/** Check if a secret is configured (truthy, length > 0). */
export function hasSecret(name: string): boolean {
  return getSecret(name).length > 0
}

/** All secrets used by adsentice. Single source of truth. */
export const REQUIRED_SECRETS = {
  // Provider integrations
  DATAFORSEO_LOGIN:    { provider: "DataForSEO", required: true },
  DATAFORSEO_PASSWORD: { provider: "DataForSEO", required: true },
  DATAFORSEO_MODE:     { provider: "DataForSEO", required: false, default: "live" },
  DEEPSEEK_API_KEY:    { provider: "DeepSeek", required: false },
  FIRECRAWL_API_KEY:   { provider: "Firecrawl", required: false },

  // Supabase
  NEXT_PUBLIC_SUPABASE_URL:        { provider: "Supabase", required: true },
  NEXT_PUBLIC_SUPABASE_ANON_KEY:   { provider: "Supabase", required: true },
  SUPABASE_SERVICE_ROLE_KEY:       { provider: "Supabase", required: true },
  SUPABASE_DB_PASSWORD:            { provider: "Supabase", required: false },

  // Cloudflare
  CLOUDFLARE_R2_ACCOUNT_ID:   { provider: "Cloudflare", required: false },
  CLOUDFLARE_R2_ACCESS_KEY:   { provider: "Cloudflare", required: false },
  CLOUDFLARE_R2_SECRET_KEY:   { provider: "Cloudflare", required: false },
  CLOUDFLARE_R2_BUCKET:       { provider: "Cloudflare", required: false },
  CLOUDFLARE_API_TOKEN:       { provider: "Cloudflare", required: false },
  CLOUDFLARE_ACCOUNT_ID:      { provider: "Cloudflare", required: false },
} as const

/** Audit all secrets — returns which are set and which are missing. */
export function auditSecrets(): { set: string[]; missing: string[] } {
  const set: string[] = []
  const missing: string[] = []
  for (const [name, cfg] of Object.entries(REQUIRED_SECRETS)) {
    if (hasSecret(name)) set.push(name)
    else if (cfg.required) missing.push(name)
  }
  return { set, missing }
}
