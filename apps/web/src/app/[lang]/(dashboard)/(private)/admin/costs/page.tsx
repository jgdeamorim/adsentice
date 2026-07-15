
// adsentice · Admin / Costs — centro de custos (medido=verdade)
// Fontes: cost-registry.yaml + Supabase REST + Redis + plans.ts canônico
// ZERO pg Pool. ZERO CardStatVertical (forca trend desnecessario).
import { redirect } from 'next/navigation'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { execSync } from 'child_process'

import Grid from '@mui/material/Grid2'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import Chip from '@mui/material/Chip'
import Box from '@mui/material/Box'
import Divider from '@mui/material/Divider'
import Alert from '@mui/material/Alert'

import { getSessionUser } from '@/libs/supabase/server'
import { STRATEGIC_PLANS, type StrategicPlan } from '@/lib/plans'

// ── Types ──

interface CostEntry { id: string; cost_usd: number; confidence: string; layer: string }

// ── Helpers (garantem nunca retornar undefined) ──

function ensure(v: unknown, fallback: number): number {
  const n = Number(v)
  return isNaN(n) || !isFinite(n) ? fallback : n
}

// ── Cost Registry (YAML → dynamic, multiple path attempts) ──

function readCostRegistry(): CostEntry[] {
  const candidates = [
    resolve(process.cwd(), '../../packages/provider-core/cost-registry.yaml'),
    resolve(process.cwd(), 'packages/provider-core/cost-registry.yaml'),
    resolve(process.cwd(), '../packages/provider-core/cost-registry.yaml'),
  ]
  let raw = ''
  for (const p of candidates) {
    try { raw = readFileSync(p, 'utf-8'); if (raw) break } catch { /* next */ }
  }
  if (!raw) return []
  const entries: CostEntry[] = []
  let inBlock = false
  for (const line of raw.split('\n')) {
    const t = line.trim()
    if (t === 'costs:') { inBlock = true; continue }
    if (!inBlock || !t || t.startsWith('#') || t.startsWith('provider:') || t.startsWith('updated:')) continue
    if (t.startsWith('pipeline.')) continue
    const m = t.match(/^(\S[\S.]*?):\s*\{\s*cost_usd:\s*"([\d.]+)"\s*,\s*confidence:\s*(\S+)/)
    if (m) entries.push({
      id: m[1], cost_usd: parseFloat(m[2]), confidence: m[3],
      layer: m[1].startsWith('business.listings') ? 'L0'
        : m[1].startsWith('business.profile') ? 'L1'
        : m[1].startsWith('on_page') || m[1].startsWith('domain.technologies') ? 'L2'
        : m[1].startsWith('backlinks') ? 'L3' : 'L4',
    })
  }
  return entries
}

// ── Redis ──

function redisRaw(key: string): string {
  try { return execSync(`redis-cli -p 6396 --no-auth-warning GET ${key}`, { timeout: 2000, stdio: ['ignore','pipe','ignore'] }).toString().trim() }
  catch { return '' }
}
function redisNum(key: string): number { return ensure(parseFloat(redisRaw(key)), 0) }
function redisInt(key: string): number { return ensure(parseInt(redisRaw(key), 10), 0) }

// ── Supabase REST ──

const SFX = 'https://tdigauruusdhnpvppixb.supabase.co'
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const SB_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

async function sbGet(path: string): Promise<any> {
  try {
    const key = SB_KEY || SB_ANON
    const res = await fetch(`${SFX}/rest/v1/${path}`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return res.json()
  } catch { return null }
}

async function sbCount(path: string): Promise<number> {
  try {
    const key = SB_KEY || SB_ANON
    const res = await fetch(`${SFX}/rest/v1/${path}`, {
      headers: { apikey: key, Authorization: `Bearer ${key}`, Prefer: 'count=exact' },
      signal: AbortSignal.timeout(8000),
    })
    const range = res.headers.get('content-range') || ''
    const m = range.match(/\/(\d+)/)
    return m ? parseInt(m[1], 10) : 0
  } catch { return 0 }
}

interface SearchRow { cost_usd: number }

async function querySupabase() {
  const [searches, l1Count, l2Count] = await Promise.all([
    sbGet('discovery_searches?select=cost_usd&order=created_at.desc&limit=50') as Promise<SearchRow[] | null>,
    sbCount('discovery_listings?select=place_id&enrichment_level=gte.1&limit=1'),
    sbCount('discovery_listings?select=place_id&enrichment_level=gte.2&limit=1'),
  ])
  const rows = searches || []
  return {
    totalCost: ensure(rows.reduce((s, r) => s + ensure(r.cost_usd, 0), 0), 0),
    totalSearches: rows.length,
    l1Calls: l1Count,
    l2Calls: l2Count,
  }
}

const fmt = (n: number, d: number): string => n.toFixed(d)

const CostsPage = async ({ params }: { params: Promise<{ lang: string }> }) => {
  const { lang } = await params
  const user = await getSessionUser()
  if (user?.role !== 'admin') redirect(`/${lang}/app`)

  // ═══ All dynamic data ═══
  const caps     = readCostRegistry()
  const sup      = await querySupabase()
  const dfsToday = redisNum('adsentice:discovery:cost:today')
  const dfsTotal = redisNum('adsentice:discovery:cost:total')
  const llmToday = redisNum('adsentice:llm:cost:today')
  const llmTotal = redisNum('adsentice:llm:cost:total')
  const llmCToday = redisInt('adsentice:llm:calls:today')
  const llmCTotal = redisInt('adsentice:llm:calls:total')
  const dfsMode   = process.env.DATAFORSEO_MODE || 'live'

  const totalToday = dfsToday + llmToday
  const totalAll   = dfsTotal + llmTotal
  const leads      = sup.l1Calls
  const cpl        = leads > 0 ? sup.totalCost / leads : 0
  const brl        = 5.5

  // ═══ DeepSeek Balance — fetch direto da API ═══
  let dsBal: any = null
  try {
    const key = process.env.DEEPSEEK_API_KEY
    if (key) {
      const balRes = await fetch("https://api.deepseek.com/user/balance", {
        headers: { Authorization: `Bearer ${key}` },
        signal: AbortSignal.timeout(10000),
      })
      if (balRes.ok) dsBal = await balRes.json()
    }
  } catch { /* API offline */ }

  // 21 tools implementadas — usadas como filtro sobre cost-registry.yaml
  const usedIds = new Set([
    'business.listings.search', 'business.profile.gmb',
    'on_page.instant_pages', 'domain.technologies', 'on_page.lighthouse',
    'backlinks.competitors', 'domain.competitors', 'domain.ranked_keywords',
    'domain.keyword_gap', 'domain.overview', 'keyword.research',
    'serp.organic', 'serp.local_finder', 'serp.maps',
    'business.reviews.google', 'business.qa',
    'keyword.volume', 'keyword.trends', 'keyword.related',
    'keyword.historical', 'content.sentiment.summary',
  ])
  const usedCaps = caps.filter(c => usedIds.has(c.id))
  const availCaps = caps.filter(c => !usedIds.has(c.id))

  // DeepSeek pricing
  const dsHit = 0.0028; const dsMiss = 0.14; const dsOut = 0.28; const llmEst = 0.000076

  // Pipeline cost
  const pipeCost = usedCaps.reduce((s, c) => s + c.cost_usd, 0) + llmEst

  // Plan margins (aligned with solutions page)
  const planMargins = STRATEGIC_PLANS.map(p => {
    const leadsCustoEstimado = p.costUsd * leads  // custo estimado total para X leads
    const custoMensalBRL = leadsCustoEstimado * brl // em reais
    const margemBRL = p.priceNum - custoMensalBRL
    const margemPct = p.priceNum > 0 ? Math.round((margemBRL / p.priceNum) * 100) : 0
    return { ...p, leadsCustoEstimado, custoMensalBRL, margemBRL, margemPct }
  })

  // ── Render ──

  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12 }}>
        <Typography variant='h4'>💰 Centro de Custos</Typography>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap', mt: 1 }}>
          <Typography variant='body2' color='text.secondary'>
            provider-core + DeepSeek · Supabase REST + Redis + cost-registry.yaml
          </Typography>
          <Chip label={dfsMode === 'sandbox' ? '🧪 Sandbox $0' : '🟢 Live'} size='small' color={dfsMode === 'sandbox' ? 'info' : 'success'} variant='tonal' />
          <Chip label={`provider-core v1.0`} size='small' color='primary' variant='tonal' />
        </Box>
      </Grid>

      {/* ── Stat cards (plain — no CardStatVertical +undefined bug) ── */}
      {[
        { label: 'DataForSEO Total', value: `$${fmt(sup.totalCost, 4)}`, sub: `${sup.totalSearches} buscas · R$${fmt(sup.totalCost * brl, 2)}`, color: 'var(--mui-palette-warning-main)' },
        { label: 'DFSEO Hoje (Redis)', value: `$${fmt(dfsToday, 4)}`, sub: `${sup.l1Calls} leads L1 · ${sup.l2Calls} L2`, color: 'var(--mui-palette-info-main)' },
        { label: 'DeepSeek Hoje', value: `$${fmt(llmToday, 6)}`, sub: `${llmCToday} hoje · ${llmCTotal} total`, color: 'var(--mui-palette-secondary-main)' },
        { label: 'Custo Total Hoje', value: `$${fmt(totalToday, 4)}`, sub: `DFSEO+LLM · R$${fmt(totalToday * brl, 2)}`, color: 'var(--mui-palette-success-main)' },
      ].map(s => (
        <Grid key={s.label} size={{ xs: 12, sm: 3 }}>
          <Card sx={{ borderTop: `3px solid ${s.color}` }}>
            <CardContent>
              <Typography variant='caption' color='text.secondary'>{s.label}</Typography>
              <Typography variant='h5' fontWeight={800}>{s.value}</Typography>
              <Typography variant='caption' color='text.secondary'>{s.sub}</Typography>
            </CardContent>
          </Card>
        </Grid>
      ))}

      {/* ── Pipeline cost ── */}
      <Grid size={{ xs: 12 }}>
        <Card sx={{ bgcolor: 'var(--pastel-sky)' }}>
          <CardContent>
            <Typography variant='h6' gutterBottom>📊 Pipeline de Custo por Lead (L0→L3 + Copy)</Typography>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              {[
                { label: 'L0 Discovery', cost: caps.find(c => c.id === 'business.listings.search')?.cost_usd ?? 0.015, calls: sup.totalSearches },
                { label: 'L1 Profile', cost: caps.find(c => c.id === 'business.profile.gmb')?.cost_usd ?? 0.0054, calls: sup.l1Calls },
                { label: 'L2 On+Tech', cost: (caps.find(c => c.id === 'on_page.instant_pages')?.cost_usd ?? 0.000125) + (caps.find(c => c.id === 'domain.technologies')?.cost_usd ?? 0.01), calls: sup.l2Calls },
                { label: 'L3 Backlinks', cost: caps.find(c => c.id === 'backlinks.competitors')?.cost_usd ?? 0.02, calls: 0 },
                { label: 'DeepSeek Copy', cost: llmEst, calls: llmCTotal },
              ].map(s => (
                <Box key={s.label} sx={{ textAlign: 'center', minWidth: 100 }}>
                  <Typography variant='caption' color='text.secondary'>{s.label}</Typography>
                  <Typography variant='h6' fontWeight={800}>${fmt(s.cost, 6)}</Typography>
                  <Chip label={`${s.calls} chamadas`} size='small' variant='outlined' sx={{ fontSize: '0.6rem' }} />
                </Box>
              ))}
              <Box sx={{ textAlign: 'center', minWidth: 100, borderLeft: '2px solid', borderColor: 'primary.main', pl: 2 }}>
                <Typography variant='caption' color='text.secondary'>TOTAL/lead</Typography>
                <Typography variant='h6' fontWeight={800} color='primary.main'>~${fmt(pipeCost, 4)}</Typography>
                <Chip label='L0→L3+Copy' size='small' color='primary' variant='tonal' sx={{ fontSize: '0.6rem' }} />
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Grid>

      {/* ── DeepSeek Pricing ── */}
      <Grid size={{ xs: 12, md: 6 }}>
        <Card>
          <CardContent>
            <Typography variant='h6' gutterBottom>🧠 DeepSeek V4 Flash Pricing</Typography>
            <Typography variant='caption' color='text.secondary' sx={{ mb: 2, display: 'block' }}>
              api-docs.deepseek.com/quick_start/pricing
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {[
                { label: 'Input (KV Cache HIT)', cost: dsHit, desc: 'system prompt fixo → 98% cheaper', color: 'success.main' },
                { label: 'Input (KV Cache MISS)', cost: dsMiss, desc: 'user prompt varia por lead', color: 'warning.main' },
                { label: 'Output', cost: dsOut, desc: 'headline + subtitle + cta', color: 'error.main' },
              ].map(p => (
                <Box key={p.label} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box>
                    <Typography variant='body2' fontWeight={600}>{p.label}</Typography>
                    <Typography variant='caption' color='text.secondary'>{p.desc}</Typography>
                  </Box>
                  <Typography variant='body2' fontWeight={700} color={p.color}>${fmt(p.cost, 4)}/1M</Typography>
                </Box>
              ))}
              <Divider />
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography variant='body2' fontWeight={700}>Estimativa por chamada</Typography>
                  <Typography variant='caption' color='text.secondary'>
                    ~2000 tokens input (80% KV Cache hit) + ~100 output
                  </Typography>
                </Box>
                <Typography variant='h6' fontWeight={800} color='primary.main'>~${fmt(llmEst, 6)}</Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Grid>

      {/* ── DeepSeek Balance ── */}
      <Grid size={{ xs: 12, md: 6 }}>
        <Card sx={{ bgcolor: 'var(--pastel-sky)' }}>
          <CardContent>
            <Typography variant='h6' gutterBottom>💳 DeepSeek Balance</Typography>
            <Typography variant='caption' color='text.secondary' sx={{ mb: 2, display: 'block' }}>
              GET /user/balance · <code>python3 tools/adsentice_deepseek_status.py</code>
            </Typography>
            {dsBal && dsBal.balance_infos?.length > 0 ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box sx={{ display: 'flex', gap: 3 }}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant='caption' color='text.secondary'>Total</Typography>
                    <Typography variant='h5' fontWeight={800} color={dsBal.is_available ? 'success.main' : 'error.main'}>
                      ${fmt(parseFloat(dsBal.balance_infos[0].total_balance || '0'), 2)}
                    </Typography>
                  </Box>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant='caption' color='text.secondary'>Topped Up</Typography>
                    <Typography variant='h6' fontWeight={700}>${fmt(parseFloat(dsBal.balance_infos[0].topped_up_balance || '0'), 2)}</Typography>
                  </Box>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant='caption' color='text.secondary'>Granted</Typography>
                    <Typography variant='h6' fontWeight={700}>${fmt(parseFloat(dsBal.balance_infos[0].granted_balance || '0'), 2)}</Typography>
                  </Box>
                </Box>
                <Chip label={dsBal.is_available ? '✅ Disponível p/ API' : '❌ Saldo insuficiente'} size='small'
                  color={dsBal.is_available ? 'success' : 'error'} variant='tonal' />
              </Box>
            ) : (
              <Chip label={process.env.DEEPSEEK_API_KEY ? '⏳ Buscando balance...' : '⚠️ DEEPSEEK_API_KEY ausente'} size='small' color='warning' />
            )}
          </CardContent>
        </Card>
      </Grid>

      {/* ── Capabilities ── */}
      <Grid size={{ xs: 12 }}>
        <Typography variant='h6' gutterBottom>
          📋 {usedCaps.length} em uso · {availCaps.length} disponíveis
          <Chip label='cost-registry.yaml' size='small' variant='outlined' sx={{ ml: 2 }} />
        </Typography>
        <Typography variant='subtitle2' sx={{ mt: 2, mb: 1 }} color='success.main'>✅ provider-core ativo</Typography>
        <Grid container spacing={2}>
          {usedCaps.map(c => (
            <Grid key={c.id} size={{ xs: 12, sm: 6, md: 3 }}>
              <Card sx={{ borderLeft: '3px solid', borderColor: 'success.main' }}>
                <CardContent>
                  <Typography variant='subtitle2' fontWeight={600} sx={{ fontFamily: 'monospace', fontSize: '0.7rem' }}>{c.id}</Typography>
                  <Box sx={{ display: 'flex', gap: 1, mt: 0.5, mb: 1 }}>
                    <Chip label={c.layer} size='small' color='primary' variant='tonal' />
                    <Chip label={c.confidence} size='small' variant='outlined' sx={{ fontSize: '0.6rem' }} />
                  </Box>
                  <Typography variant='h6' fontWeight={800}>${fmt(c.cost_usd, 6)}</Typography>
                  <Typography variant='caption' color='text.secondary'>por chamada</Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
        {availCaps.length > 0 && (
          <>
            <Typography variant='subtitle2' sx={{ mt: 3, mb: 1 }} color='text.secondary'>⬜ Disponíveis (não integrados)</Typography>
            <Grid container spacing={1}>
              {availCaps.map(c => (
                <Grid key={c.id} size={{ xs: 12, sm: 6, md: 4 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.5 }}>
                    <Chip label={c.layer} size='small' variant='outlined' sx={{ fontSize: '0.6rem', minWidth: 28 }} />
                    <Typography variant='caption' sx={{ fontFamily: 'monospace', fontSize: '0.65rem', flex: 1 }}>{c.id}</Typography>
                    <Typography variant='caption' fontWeight={600}>${fmt(c.cost_usd, 4)}</Typography>
                  </Box>
                </Grid>
              ))}
            </Grid>
          </>
        )}
      </Grid>

      {/* ── Margem por Plano (alinhado com /admin/solutions) ── */}
      <Grid size={{ xs: 12 }}>
        <Typography variant='h6' gutterBottom>💡 Margem por Plano
          <Chip label='alinhado com /admin/solutions' size='small' variant='outlined' sx={{ ml: 2 }} />
        </Typography>
        <Grid container spacing={2}>
          {planMargins.map(p => (
            <Grid key={p.tier} size={{ xs: 12, sm: 6, md: 4 }}>
              <Card sx={{ borderTop: '3px solid', borderColor: `${p.color}.main` }}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                    <Box>
                      <Typography variant='subtitle2' fontWeight={700}>{p.name}</Typography>
                      <Typography variant='h6' fontWeight={800}>{p.price}</Typography>
                    </Box>
                    <Chip
                      label={p.tier === 'free' ? p.margin : `${p.margemPct}% margem`}
                      size='small' color={p.tier === 'free' ? 'info' : 'success'} variant='tonal' />
                  </Box>
                  <Typography variant='caption' color='text.secondary'>
                    Custo estimado: {p.costLabel} · Leads no período: {leads}
                  </Typography>
                  {p.tier !== 'free' && (
                    <Box sx={{ mt: 1, display: 'flex', gap: 1 }}>
                      <Chip label={`R$${fmt(p.priceNum, 0)} receita`} size='small' color='primary' variant='tonal' sx={{ fontSize: '0.6rem' }} />
                      <Chip label={`R$${fmt(p.custoMensalBRL, 2)} custo`} size='small' color='warning' variant='tonal' sx={{ fontSize: '0.6rem' }} />
                      <Chip label={`R$${fmt(p.margemBRL, 0)} lucro`} size='small' color='success' variant='tonal' sx={{ fontSize: '0.6rem' }} />
                    </Box>
                  )}
                  <Typography variant='caption' color='text.secondary' sx={{ mt: 0.5, display: 'block' }}>
                    {p.persona}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Grid>

      {/* ── Balances ── */}
      <Grid size={{ xs: 12 }}>
        <Alert severity='info'>
          <Typography variant='body2'>
            💰 <strong>DataForSEO:</strong>{' '}
            <a href='https://app.dataforseo.com/billing' target='_blank' rel='noopener noreferrer' style={{ fontWeight: 600 }}>
              app.dataforseo.com/billing
            </a>{' · '}
            <strong>DeepSeek:</strong> <code>python3 tools/adsentice_deepseek_status.py</code>.
            Adsentice rastreia <strong>${fmt(sup.totalCost, 4)} (DFSEO)</strong> + <strong>${fmt(llmTotal, 6)} (LLM)</strong>{' '}
            = <strong>${fmt(totalAll, 4)} total</strong> em {sup.totalSearches} buscas + {llmCTotal} chamadas LLM.
          </Typography>
        </Alert>
      </Grid>

      {/* ── ROI ── */}
      <Grid size={{ xs: 12, md: 6 }}>
        <Card sx={{ bgcolor: 'var(--pastel-mint)' }}>
          <CardContent>
            <Typography variant='h6' gutterBottom>📊 ROI do Discovery Engine</Typography>
            <Typography variant='body2' sx={{ mb: 2 }}>
              Custo total: <strong>${fmt(sup.totalCost, 4)} (~R${fmt(sup.totalCost * brl, 2)})</strong> para ~{leads} leads.
            </Typography>
            <Typography variant='h3' fontWeight={800} color='success.main'>
              ${fmt(cpl, 5)}
            </Typography>
            <Typography variant='body2' sx={{ mt: 1 }}>
              Custo por lead com 27 campos + score + Schwartz + contato.
              Google Ads = R$28.40/lead.
              <strong> Adsentice é {(28.40 / brl / Math.max(cpl, 0.0001)).toFixed(0)}× mais barato.</strong>
            </Typography>
          </CardContent>
        </Card>
      </Grid>

      {/* ── Por que cada plano cobre o custo ── */}
      <Grid size={{ xs: 12, md: 6 }}>
        <Card>
          <CardContent>
            <Typography variant='h6' gutterBottom>📊 Eficiência Operacional</Typography>
            <Typography variant='body2' color='text.secondary' sx={{ mb: 2 }}>
              Com {leads} leads enriquecidos, o custo DataForSEO total é de R${fmt(sup.totalCost * brl, 2)}.
              Cada plano cobre múltiplos leads com margem alta.
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {planMargins.filter(p => p.tier !== 'free').map(p => (
                <Box key={p.tier} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Chip label={p.name} size='small' color={p.color} variant='tonal' />
                    <Typography variant='caption' color='text.secondary'>{p.pipeline}</Typography>
                  </Box>
                  <Typography variant='body2' fontWeight={700} color='success.main'>
                    {p.margemPct}% margem · R${fmt(p.margemBRL, 0)}/mês
                  </Typography>
                </Box>
              ))}
            </Box>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  )
}

export default CostsPage
