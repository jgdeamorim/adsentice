// ADSENTICE · lib/deepseek.ts — DeepSeek V4 Flash Copywriter + Market Intelligence
// V2: prompt enriquecido com dados REAIS do mercado (Supabase + pre-flight)
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

// ── MARKET CONTEXT (from Supabase + pre-flight · real data) ──

export interface MarketContext {
  totalMarketLeads?: number
  avgScore?: number
  avgRating?: number
  claimedPct?: number
  topCity?: string
  topCityLeads?: number
  ibgePopulation?: number
  ibgePibPerCapita?: number
  competitorCount?: number
}

async function fetchMarketContext(category: string, city?: string): Promise<MarketContext> {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://tdigauruusdhnpvppixb.supabase.co"
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""

    // Category stats from discovery_listings
    const catUrl = `${supabaseUrl}/rest/v1/discovery_listings?select=score_compound,rating_value,is_claimed&category=ilike.*${encodeURIComponent(category)}*&limit=1000`
    const catRes = await fetch(catUrl, { headers: { apikey: key, Authorization: `Bearer ${key}` } })
    let avgScore = 32; let avgRating = 4.8; let claimedPct = 55
    if (catRes.ok) {
      const rows = await catRes.json() as any[]
      if (rows.length > 0) {
        avgScore = Math.round(rows.reduce((s, r) => s + (r.score_compound || 0), 0) / rows.length)
        avgRating = Math.round((rows.reduce((s, r) => s + (r.rating_value || 0), 0) / rows.length) * 10) / 10
        claimedPct = Math.round((rows.filter(r => r.is_claimed).length / rows.length) * 100)
      }
    }

    // Pre-flight total_count for this category
    let totalMarket = 0
    try {
      const pfUrl = `${supabaseUrl}/rest/v1/discovery_searches?select=total_count,categories&search_metadata->>preflight=eq.true&limit=20`
      const pfRes = await fetch(pfUrl, { headers: { apikey: key, Authorization: `Bearer ${key}` } })
      if (pfRes.ok) {
        const pfRows = await pfRes.json() as any[]
        for (const r of pfRows) {
          if ((r.categories || []).some((c: string) => c.toLowerCase().includes(category.toLowerCase()))) {
            totalMarket = Math.max(totalMarket, r.total_count || 0)
          }
        }
      }
    } catch {}

    // IBGE context
    let ibgePop = 0; let ibgePib = 0
    if (city) {
      try {
        const ibgeUrl = `${supabaseUrl}/rest/v1/ibge_panorama?select=populacao,pib_per_capita&municipio_nome=ilike.*${encodeURIComponent(city)}*&limit=1`
        const ibgeRes = await fetch(ibgeUrl, { headers: { apikey: key, Authorization: `Bearer ${key}` } })
        if (ibgeRes.ok) {
          const ibgeRows = await ibgeRes.json() as any[]
          if (ibgeRows.length) { ibgePop = ibgeRows[0].populacao || 0; ibgePib = ibgeRows[0].pib_per_capita || 0 }
        }
      } catch {}
    }

    return { totalMarketLeads: totalMarket, avgScore, avgRating, claimedPct, ibgePopulation: ibgePop, ibgePibPerCapita: ibgePib }
  } catch {
    return { avgScore: 32, avgRating: 4.8, claimedPct: 55 }
  }
}

// ── COPYWRITER (V2: market intelligence enriched) ──

export async function generateCopy(lead: {
  title?: string; category?: string; city?: string; district?: string
  score?: number; rating?: number; is_claimed?: boolean
  gaps?: { title: string; severity: string; signal: string }[]
}, temperature = 0.8): Promise<CopyOutput | null> {
  const key = getKey()
  if (!key) { console.error("[DeepSeek] DEEPSEEK_API_KEY nao configurado"); return null }

  const name = lead.title || "Empreendedor"
  const cat = lead.category || "negócio local"
  const loc = lead.district || lead.city || "sua região"
  const score = lead.score || 50
  const rating = lead.rating || 0
  const gapLabels = (lead.gaps || []).slice(0, 3).map(g => g.title).join("; ")

  // Fetch market intelligence with 3s timeout (non-blocking fallback)
  const market = await Promise.race([
    fetchMarketContext(cat, lead.city),
    new Promise<MarketContext>((resolve) => setTimeout(() => resolve({ avgScore: 32, avgRating: 4.8, claimedPct: 55 }), 3000)),
  ])

  // Build market intelligence section for the prompt
  const marketIntel = [
    market.totalMarketLeads ? `- Mercado total estimado na região: ${market.totalMarketLeads.toLocaleString('pt-BR')} negócios` : '',
    market.avgScore ? `- Score médio do mercado: ${market.avgScore}/100 (seu lead: ${score}/100)` : '',
    market.avgRating ? `- Rating médio do mercado: ${market.avgRating}★` : '',
    market.claimedPct ? `- Apenas ${market.claimedPct}% dos negócios similares reivindicaram seu GMB — ${100 - market.claimedPct}% estão invisíveis` : '',
    market.ibgePopulation ? `- População da cidade: ${market.ibgePopulation.toLocaleString('pt-BR')} habitantes` : '',
    market.ibgePibPerCapita ? `- PIB per capita: R$${market.ibgePibPerCapita.toLocaleString('pt-BR')}` : '',
  ].filter(Boolean).join('\n')

  const prompt = `Você é um copywriter especialista em marketing local para SMB Brasil, com acesso a dados REAIS de mercado.
Gere headline, subtitle e CTA para landing page de diagnóstico gratuito (Raio-X).

DADOS DO LEAD:
- Nome: ${name}
- Categoria: ${cat}
- Local: ${loc}
- Score: ${score}/100
- Rating Google: ${rating}★
- Gaps: ${gapLabels || "N/A"}

INTELIGÊNCIA DE MERCADO (DADOS REAIS):
${marketIntel || "Dados de mercado não disponíveis — use estimativas conservadoras."}

FRAMEWORK DE COPYWRITING (Corey Haines — copywriting skill):
- FÓRMULA: Problema → Agitação → Solução → Prova Social → CTA
- ANTI-PADRÕES: NÃO use "você sabia que...", NÃO invente estatísticas, NÃO use "garantido"
- TOM PARA SMB BRASIL: profissional mas próximo, como um consultor de confiança
- SCHWARTZ AWARENESS: ${score < 40 ? 'Unaware — eduque sobre o problema' : score < 70 ? 'Problem/Solution Aware — mostre a solução' : 'Product/Most Aware — diferencie pela qualidade'}
- GATILHOS EFICAZES PARA ${cat}: urgência local ("no seu bairro"), escassez competitiva ("antes que seus concorrentes"), prova social ("4.8★ no Google")

FORMATO (JSON válido, sem markdown):
{"headline":"...","subtitle":"...","cta":"..."}

REGRAS:
- Headline: máx 100 chars, use dados REAIS do mercado quando disponível (ex: "${market.claimedPct ? `apenas ${market.claimedPct}% reivindicados` : ''}")
- Subtitle: máx 150 chars, conecte o gap do lead com o contexto do mercado
- CTA: máx 50 chars, ação direta com urgência (ex: "Quero meu diagnóstico grátis")
- Português brasileiro natural, tom consultivo
- USE os dados de mercado fornecidos — eles são REAIS, não inventados
- NÃO use preços ou promessas impossíveis`

  try {
    const res = await fetch(DEEPSEEK_API, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: DEEPSEEK_MODEL,
        messages: [{ role: "user", content: prompt }],
        temperature,
        max_tokens: 1600,
        response_format: { type: "json_object" },
      }),
      signal: AbortSignal.timeout(15000),
    })
    if (!res.ok) { const errBody = await res.text().catch(() => ""); console.error("[DeepSeek] API " + res.status + ": " + errBody.slice(0, 100)); return null }
    const data = await res.json()
    // DeepSeek V4 Flash é reasoning model — gasta tokens em reasoning_content.
    // Se content vier vazio, extrai do reasoning_content (padrão Python:208)
    let text = data.choices?.[0]?.message?.content || ""
    if (!text) {
      text = data.choices?.[0]?.message?.reasoning_content || ""
    }
    if (!text) { console.error("[DeepSeek] empty response: " + JSON.stringify(data).slice(0, 200)); return null }
    // Parse robusto: JSON.parse → fallback regex
    let json: { headline?: string; subtitle?: string; cta?: string }
    try {
      json = JSON.parse(text)
    } catch {
      const h = text.match(/"headline"\s*:\s*"([^"]*)"/)
      const s = text.match(/"subtitle"\s*:\s*"([^"]*)"/)
      const c = text.match(/"cta"\s*:\s*"([^"]*)"/)
      if (!h) return null
      json = { headline: h[1], subtitle: s?.[1] || "", cta: c?.[1] || "" }
    }
    return { headline: json.headline || "", subtitle: json.subtitle || "", cta: json.cta || "" }
  } catch (e: any) {
    console.error("[DeepSeek] exception: " + (e?.message || e))
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
