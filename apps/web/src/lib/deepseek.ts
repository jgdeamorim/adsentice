// ADSENTICE · lib/deepseek.ts — DeepSeek V4 Flash Copywriter
// Port do tools/adsentice_llm_copywriter.py + tools/adsentice_s10_generator.py
// Cost: ~$0.001/query · ~3s · medido=verdade · 2026-07-17

const DEEPSEEK_API = "https://api.deepseek.com/v1/chat/completions"
const DEEPSEEK_MODEL = "deepseek-v4-flash"

let _keyCache: string | null = null
function getKey(): string {
  if (_keyCache) return _keyCache
  _keyCache = process.env.DEEPSEEK_API_KEY || ""
  return _keyCache
}

export interface CopyOutput { headline: string; subtitle: string; cta: string }

export async function generateCopy(lead: {
  title?: string; category?: string; city?: string; district?: string
  score?: number; rating?: number; is_claimed?: boolean
  gaps?: { title: string; severity: string; signal: string }[]
}, temperature = 0.8): Promise<CopyOutput | null> {
  const key = getKey()
  if (!key) return null

  const name = lead.title || "Empreendedor"
  const cat = lead.category || "negócio local"
  const loc = lead.district || lead.city || "sua região"
  const score = lead.score || 50
  const rating = lead.rating || 0
  const gapLabels = (lead.gaps || []).slice(0, 3).map(g => g.title).join("; ")

  const prompt = `Você é um copywriter especialista em marketing local para SMB Brasil.
Gere uma headline, subtitle e CTA para uma landing page de diagnóstico gratuito (Raio-X).

DADOS DO LEAD:
- Nome: ${name}
- Categoria: ${cat}
- Local: ${loc}
- Score: ${score}/100
- Rating Google: ${rating} estrelas
- Gaps detectados: ${gapLabels || "N/A"}

FORMATO (JSON válido, sem markdown):
{"headline":"...","subtitle":"...","cta":"..."}

REGRAS:
- Headline: máx 100 chars, mencione o nome ou categoria, use gatilho de urgência ou escassez
- Subtitle: máx 150 chars, conecte o gap com a solução
- CTA: máx 50 chars, ação direta (ex: "Quero meu diagnóstico grátis")
- Português brasileiro natural, tom profissional mas próximo
- NÃO invente dados que não foram fornecidos
- NÃO use preços ou promessas impossíveis`

  try {
    const res = await fetch(DEEPSEEK_API, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: DEEPSEEK_MODEL,
        messages: [{ role: "user", content: prompt }],
        temperature,
        max_tokens: 800,
        response_format: { type: "json_object" },
      }),
      signal: AbortSignal.timeout(15000),
    })
    if (!res.ok) return null
    const data = await res.json()
    const text = data.choices?.[0]?.message?.content || ""
    const json = JSON.parse(text)
    return { headline: json.headline || "", subtitle: json.subtitle || "", cta: json.cta || "" }
  } catch {
    return null
  }
}

// Track LLM cost to Redis
export async function trackLLMCost(costUsd = 0.001): Promise<void> {
  try {
    const { execSync } = await import("child_process")
    execSync(`redis-cli -p 6396 INCRBYFLOAT adsentice:llm:cost:today ${costUsd}`, { timeout: 1000 })
    execSync(`redis-cli -p 6396 INCRBYFLOAT adsentice:llm:cost:total ${costUsd}`, { timeout: 1000 })
    execSync("redis-cli -p 6396 INCR adsentice:llm:calls:today", { timeout: 1000 })
    execSync("redis-cli -p 6396 INCR adsentice:llm:calls:total", { timeout: 1000 })
  } catch { /* Redis offline */ }
}
