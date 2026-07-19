// Proxy: QR code da Evolution API → Next.js (evita CORS, serve imagem)
export async function GET() {
  try {
    const r = await fetch("http://localhost:3100/instance/connect/adsentice", {
      headers: { apikey: "adsentice-wa-check-2026" },
      signal: AbortSignal.timeout(5000),
    })
    const data = await r.json() as { base64?: string; pairingCode?: string }

    // Se tem pairing code, retorna texto simples (modo WhatsApp → Vincular com número)
    if (data.pairingCode) {
      return new Response(`Pairing code: ${data.pairingCode}`, {
        headers: { "content-type": "text/plain" },
      })
    }

    // QR code como imagem PNG
    if (data.base64) {
      // Remove data URI prefix if present
      const b64 = data.base64.replace(/^data:image\/\w+;base64,/, "")
      const buf = Buffer.from(b64, "base64")
      return new Response(buf, {
        headers: { "content-type": "image/png", "cache-control": "no-cache" },
      })
    }

    return Response.json({ error: "no QR code" }, { status: 404 })
  } catch {
    return Response.json({ error: "Evolution API offline" }, { status: 502 })
  }
}
