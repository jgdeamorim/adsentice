// ══════════════════════════════════════════════════════════════════
// ADSENTICE · provider-core — DataForSEO HTTP Client
// 30 linhas. Zero kill-switch. Zero cost-registry. Zero Rust.
// Chamada direta → DataForSEO REST API (Basic Auth).
//
// Inspirado no oficial: EVO-API/self-essentials/mcp-server-typescript-master
//  → src/core/client/dataforseo.client.ts
//
// medido=verdade · 2026-07-15 · adsentice
// ══════════════════════════════════════════════════════════════════

import type { DataForSEOConfig } from "./types"

const DEFAULT_BASE_URL = "https://api.dataforseo.com"

/** Cliente HTTP direto para DataForSEO REST API.
 *  Usa Basic Auth (login:password) e sufixo .ai para respostas compactas.
 *
 *  Mode canônico (inspirado no EVO-API gate de 3 estágios):
 *   - sandbox: $0, real shapes, dados fake (https://sandbox.dataforseo.com)
 *   - live: custo real, dados reais (https://api.dataforseo.com)
 */
export class DataForSEOClient {
  public authHeader: string
  public activeUrl: string
  public mode: "sandbox" | "live"

  constructor(config: DataForSEOConfig) {
    const encoded = Buffer.from(`${config.login}:${config.password}`).toString("base64")
    this.authHeader = `Basic ${encoded}`
    this.mode = config.mode || "live"
    this.activeUrl = this.mode === "sandbox"
      ? "https://sandbox.dataforseo.com"
      : (config.baseUrl || DEFAULT_BASE_URL)
  }

  /**
   * POST para endpoint DataForSEO.
   * @param endpoint — ex: "/v3/business_data/business_listings/search/live"
   * @param body — array de tasks DataForSEO
   * @param compact — se true, usa sufixo .ai (resposta compacta, sem metadata)
   */
  async post<T>(endpoint: string, body: unknown[], compact = true): Promise<T> {
    const url = compact
      ? `${this.activeUrl}${endpoint}.ai`
      : `${this.activeUrl}${endpoint}`

    if (this.mode === "sandbox") {
      console.log(`[provider-core] sandbox $0 → ${endpoint}`)
    }

    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: this.authHeader,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const text = await res.text().catch(() => "")
      throw new Error(
        `DataForSEO HTTP ${res.status}: ${text.slice(0, 300)} [${endpoint}]`
      )
    }

    const data = await res.json()
    return data as T
  }
}

/** Singleton instance — inicializado com credenciais do ambiente. */
let _client: DataForSEOClient | null = null

export function getDFSEOClient(): DataForSEOClient {
  if (_client) return _client

  const login = process.env.DATAFORSEO_LOGIN || ""
  const password = process.env.DATAFORSEO_PASSWORD || ""
  const mode = (process.env.DATAFORSEO_MODE as "sandbox" | "live") || "live"

  if (!login || !password) {
    throw new Error(
      "provider-core: DATAFORSEO_LOGIN and DATAFORSEO_PASSWORD required in env"
    )
  }

  _client = new DataForSEOClient({ login, password, mode })
  return _client
}

/** Override singleton (tests, custom config). */
export function setDFSEOClient(client: DataForSEOClient): void {
  _client = client
}
