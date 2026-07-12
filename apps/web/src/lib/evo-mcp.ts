// ══════════════════════════════════════════════════════════════════
// ADSENTICE · EVO-API MCP Client
// Protocolo: MCP 2024-11-05 · streamable HTTP · rmcp 0.7.0
// Servidor: http://127.0.0.1:7700/mcp
// ══════════════════════════════════════════════════════════════════

const MCP = "http://127.0.0.1:7700/mcp"

async function mcpRequest(
  method: string,
  params?: Record<string, unknown>,
  sessionId?: string
): Promise<{ result: unknown; sessionId: string | null | undefined }> {
  const body = JSON.stringify({
    jsonrpc: "2.0",
    id: Date.now(),
    method,
    params: params || {},
  })

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json, text/event-stream",
  }

  if (sessionId) headers["Mcp-Session-Id"] = sessionId

  const res = await fetch(MCP, {
    method: "POST",
    headers,
    body,
    signal: AbortSignal.timeout(25000),
  })

  const text = await res.text()
  const newSessionId = res.headers.get("mcp-session-id") || sessionId

  for (const line of text.split("\n")) {
    if (!line.startsWith("data: ")) continue
    const data = JSON.parse(line.slice(6))

    if (data.error) throw new Error(`MCP error: ${JSON.stringify(data.error)}`)
    
return { result: data.result, sessionId: newSessionId }
  }

  throw new Error(`MCP: no data (HTTP ${res.status})`)
}

export interface GMBListing {
  title: string | null
  category: string | null
  address: string | null
  rating_value: number | null
  rating_votes: number | null
  place_id: string | null
  cid: string | null
  latitude: number | null
  longitude: number | null
  is_claimed: boolean | null
}

export interface ListingsResult {
  total_count: number
  listings: GMBListing[]
  cost_usd: number
}

export async function businessListingsSearch(params: {
  categories: string[]
  lat: number
  lng: number
  radiusKm: number
  limit?: number
}): Promise<ListingsResult> {
  // 1. Initialize
  const init = await mcpRequest("initialize", {
    protocolVersion: "2024-11-05",
    capabilities: {},
    clientInfo: { name: "adsentice-engine", version: "1.0" },
  })

  const sid = init.sessionId

  // 2. Send initialized notification
  await fetch(MCP, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
      "Mcp-Session-Id": sid!,
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      method: "notifications/initialized",
    }),
    signal: AbortSignal.timeout(5000),
  })

  // 3. Call business_listings_search
  const call = await mcpRequest(
    "tools/call",
    {
      name: "business_listings_search",
      arguments: {
        categories: params.categories,
        location_coordinate: `${params.lat},${params.lng},${params.radiusKm}`,
        language_code: "pt",
        limit: params.limit || 10,
        mode: "live",
        tenancy_id: "adsentice-dev",
        spend_cap_usd: 0.05,
      },
    },
    sid || undefined
  )

  // 4. Parse result
  const content = (call.result as any)?.content?.[0]?.text

  if (!content) throw new Error("MCP: no content in response")

  const data = JSON.parse(content)

  let cost_usd = 0
  const bill = data.billing_event

  if (typeof bill === "string") {
    const m = bill.match(/provider_cost_usd:\s*([\d.]+)/)

    if (m) cost_usd = parseFloat(m[1])
  }

  const output = data.canonical_output || {}

  
return {
    total_count: output.total_count || 0,
    listings: output.listings || [],
    cost_usd,
  }
}
