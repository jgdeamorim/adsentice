// Proxy para Evolution API (:3100) — evita CORS no browser
export async function GET() {
  try {
    const r = await fetch("http://localhost:3100/instance/fetchInstances", {
      headers: { apikey: "adsentice-wa-check-2026" },
      signal: AbortSignal.timeout(5000),
    })
    const data = await r.json()
    return Response.json(data)
  } catch { return Response.json({ offline: true }) }
}
