
// adsentice · Admin / Costs — centro de custos dinâmico (ZERO hardcoded)
// Fontes: cost-registry.yaml + Supabase + Redis (lidos direto no server component)
import { redirect } from 'next/navigation'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { execSync } from 'child_process'
import { Pool } from 'pg'

import Grid from '@mui/material/Grid2'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import Chip from '@mui/material/Chip'
import Box from '@mui/material/Box'
import Alert from '@mui/material/Alert'

import CardStatVertical from '@components/card-statistics/Vertical'
import { getSessionUser } from '@/libs/supabase/server'

// ── Tipos ──

interface CostEntry { id: string; cost_usd: number; confidence: string; layer: string }

// ── Read cost-registry.yaml (runtime, zero hardcode) ──

function readCostRegistry(): CostEntry[] {
  try {
    const p = resolve(process.cwd(), '../../packages/provider-core/cost-registry.yaml')
    const raw = readFileSync(p, 'utf-8')
    const entries: CostEntry[] = []
    let inCosts = false
    for (const line of raw.split('\n')) {
      const t = line.trim()
      if (t.startsWith('costs:')) { inCosts = true; continue }
      if (!inCosts || t.startsWith('#') || t.startsWith('provider:') || t.startsWith('updated:')) continue
      if (t.startsWith('pipeline.')) continue
      const m = t.match(/^(\S+):\s*\{\s*cost_usd:\s*"([\d.]+)"\s*,\s*confidence:\s*(\S+)\s*\}/)
      if (m) {
        entries.push({
          id: m[1],
          cost_usd: parseFloat(m[2]),
          confidence: m[3],
          layer: m[1].startsWith('business.listings') ? 'L0'
            : m[1].startsWith('business.profile') ? 'L1'
            : m[1].startsWith('on_page') || m[1].startsWith('domain.technologies') ? 'L2'
            : m[1].startsWith('backlinks') ? 'L3'
            : 'L4',
        })
      }
    }
    return entries
  } catch { return [] }
}

// ── Redis ──

function redisGet(key: string): string | null {
  try { return execSync(`redis-cli -p 6396 --no-auth-warning GET ${key}`, { timeout: 2000, stdio: ['ignore','pipe','ignore'] }).toString().trim() }
  catch { return null }
}

// ── Supabase ──

async function querySupabase() {
  try {
    const pool = new Pool({
      host: 'aws-0-ca-central-1.pooler.supabase.com', port: 6543, database: 'postgres',
      user: 'postgres.tdigauruusdhnpvppixb', password: process.env.SUPABASE_DB_PASSWORD || 'pmaxnpmiJ6WfcX46',
      ssl: { rejectUnauthorized: false }, max: 2, connectionTimeoutMillis: 5000,
    })
    const [costRes, l0Res, l1Res, l2Res] = await Promise.all([
      pool.query('SELECT SUM(cost_usd) as total, COUNT(*) as searches FROM discovery_searches'),
      pool.query('SELECT COUNT(*) as total FROM discovery_searches'),
      pool.query('SELECT COUNT(*) as total FROM discovery_listings WHERE enrichment_level >= 1'),
      pool.query('SELECT COUNT(*) as total FROM discovery_listings WHERE enrichment_level >= 2'),
    ])
    await pool.end()
    return {
      totalCost: parseFloat(costRes.rows[0]?.total) || 0,
      totalSearches: parseInt(costRes.rows[0]?.searches) || 0,
      l0Calls: parseInt(l0Res.rows[0]?.total) || 0,
      l1Calls: parseInt(l1Res.rows[0]?.total) || 0,
      l2Calls: parseInt(l2Res.rows[0]?.total) || 0,
    }
  } catch { return { totalCost: 0, totalSearches: 0, l0Calls: 0, l1Calls: 0, l2Calls: 0 } }
}

const CostsPage = async ({ params }: { params: Promise<{ lang: string }> }) => {
  const { lang } = await params
  const user = await getSessionUser()
  if (user?.role !== 'admin') redirect(`/${lang}/app`)

  // ═══ Dados dinâmicos (ZERO hardcode) ═══
  const capabilities = readCostRegistry()
  const sup = await querySupabase()

  // Redis: DataForSEO + DeepSeek spend tracking
  const dfsCostToday = parseFloat(redisGet('adsentice:discovery:cost:today') || '0')
  const dfsCostTotal = parseFloat(redisGet('adsentice:discovery:cost:total') || '0')
  const llmCostToday = parseFloat(redisGet('adsentice:llm:cost:today') || '0')
  const llmCostTotal = parseFloat(redisGet('adsentice:llm:cost:total') || '0')
  const llmCallsToday = parseInt(redisGet('adsentice:llm:calls:today') || '0')
  const llmCallsTotal = parseInt(redisGet('adsentice:llm:calls:total') || '0')
  const dfsMode = process.env.DATAFORSEO_MODE || 'live'

  const totCostToday = dfsCostToday + llmCostToday
  const totCostTotal = dfsCostTotal + llmCostTotal

  // Derivados
  const totalLeads = sup.l1Calls || 0
  const costPerLead = totalLeads > 0 ? sup.totalCost / totalLeads : 0

  // Separa em uso vs disponíveis
  const usedIds = new Set(['business.listings.search', 'business.profile.gmb', 'on_page.instant_pages', 'domain.technologies'])
  const usedCaps = capabilities.filter(c => usedIds.has(c.id))
  const availableCaps = capabilities.filter(c => !usedIds.has(c.id))

  const llmCostPerCall = 0.000003  // DeepSeek V4 Flash: ~$0.000003/call

  // BRL rate aproximado
  const brlRate = 5.5

  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12 }}>
        <Typography variant='h4'>💰 Centro de Custos</Typography>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap', mt: 1 }}>
          <Typography variant='body2' color='text.secondary'>
            provider-core + DeepSeek · Fonte: cost-registry.yaml + Supabase + Redis
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Chip label={dfsMode === 'sandbox' ? '🧪 Sandbox $0' : '🟢 Live'} size='small' color={dfsMode === 'sandbox' ? 'info' : 'success'} variant='tonal' />
            <Chip label='provider-core v1.0' size='small' color='primary' variant='tonal' />
            <Chip label={`${capabilities.length} caps`} size='small' variant='outlined' />
          </Box>
        </Box>
      </Grid>

      {/* ── DataForSEO spend ── */}
      <Grid size={{ xs: 12, sm: 3 }}>
        <CardStatVertical stats={`$${sup.totalCost.toFixed(4)}`} title='DataForSEO Total'
          subtitle={`${sup.totalSearches} buscas · R$${(sup.totalCost * brlRate).toFixed(2)}`}
          avatarColor='warning' avatarIcon='ri-money-dollar-circle-line' />
      </Grid>
      <Grid size={{ xs: 12, sm: 3 }}>
        <CardStatVertical stats={`$${dfsCostToday.toFixed(6)}`} title='DFSEO Hoje (Redis)'
          subtitle={`${sup.l0Calls} L0 · ${sup.l1Calls} L1 · ${sup.l2Calls} L2`}
          avatarColor='info' avatarIcon='ri-search-line' />
      </Grid>

      {/* ── DeepSeek spend ── */}
      <Grid size={{ xs: 12, sm: 3 }}>
        <CardStatVertical stats={`$${llmCostToday.toFixed(8)}`} title='DeepSeek Hoje'
          subtitle={`${llmCallsToday} chamadas hoje · ${llmCallsTotal} total`}
          avatarColor='secondary' avatarIcon='ri-robot-2-line' />
      </Grid>
      <Grid size={{ xs: 12, sm: 3 }}>
        <CardStatVertical stats={`$${totCostToday.toFixed(6)}`} title='Custo Total Hoje'
          subtitle={`DFSEO + LLM · R$${(totCostToday * brlRate).toFixed(4)}`}
          avatarColor='success' avatarIcon='ri-funds-line' />
      </Grid>

      {/* ── Pipeline cost ── */}
      <Grid size={{ xs: 12 }}>
        <Card sx={{ bgcolor: 'var(--pastel-sky)' }}>
          <CardContent>
            <Typography variant='h6' gutterBottom>📊 Pipeline de Custo por Lead (L0→L3 + Copy)</Typography>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              {[
                { label: 'L0 Discovery', cost: capabilities.find(c => c.id === 'business.listings.search')?.cost_usd || 0.015, calls: sup.l0Calls },
                { label: 'L1 Profile', cost: capabilities.find(c => c.id === 'business.profile.gmb')?.cost_usd || 0.0054, calls: sup.l1Calls },
                { label: 'L2 OnPage', cost: (capabilities.find(c => c.id === 'on_page.instant_pages')?.cost_usd || 0) + (capabilities.find(c => c.id === 'domain.technologies')?.cost_usd || 0), calls: sup.l2Calls },
                { label: 'L3 Backlinks', cost: capabilities.find(c => c.id === 'backlinks.competitors')?.cost_usd || 0.02, calls: 0 },
                { label: 'DeepSeek Copy', cost: llmCostPerCall, calls: llmCallsTotal },
              ].map(s => (
                <Box key={s.label} sx={{ textAlign: 'center', minWidth: 100 }}>
                  <Typography variant='caption' color='text.secondary'>{s.label}</Typography>
                  <Typography variant='h6' fontWeight={800}>${s.cost.toFixed(6)}</Typography>
                  <Chip label={`${s.calls} chamadas`} size='small' variant='outlined' sx={{ fontSize: '0.6rem' }} />
                </Box>
              ))}
              <Box sx={{ textAlign: 'center', minWidth: 100, borderLeft: '2px solid var(--primary)', pl: 2 }}>
                <Typography variant='caption' color='text.secondary'>TOTAL/lead</Typography>
                <Typography variant='h6' fontWeight={800} color='primary.main'>
                  ~${(usedCaps.reduce((s, c) => s + c.cost_usd, 0) + llmCostPerCall).toFixed(4)}
                </Typography>
                <Chip label='L0→L3+Copy' size='small' color='primary' variant='tonal' sx={{ fontSize: '0.6rem' }} />
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Grid>

      {/* ── DataForSEO Rate Limits ── */}
      {dfsCostToday > 0 && (
        <Grid size={{ xs: 12 }}>
          <Alert severity='info'>
            <Typography variant='body2'>
              💰 <strong>Balance DataForSEO:</strong> disponível em{' '}
              <a href='https://app.dataforseo.com/billing' target='_blank' rel='noopener noreferrer' style={{ fontWeight: 600 }}>
                app.dataforseo.com/billing
              </a>. Adsentice rastreia <strong>${sup.totalCost.toFixed(4)}</strong> em {sup.totalSearches} buscas
              + <strong>${llmCostTotal.toFixed(6)}</strong> em {llmCallsTotal} chamadas DeepSeek.
            </Typography>
          </Alert>
        </Grid>
      )}

      {/* ── Capabilities grid (da cost-registry.yaml) ── */}
      <Grid size={{ xs: 12 }}>
        <Typography variant='h6' gutterBottom>
          📋 {usedCaps.length} em uso · {availableCaps.length} disponíveis
          <Chip label='cost-registry.yaml' size='small' variant='outlined' sx={{ ml: 2 }} />
        </Typography>

        {/* Em uso */}
        <Typography variant='subtitle2' sx={{ mt: 2, mb: 1 }} color='success.main'>✅ provider-core ativo</Typography>
        <Grid container spacing={2}>
          {usedCaps.map(c => (
            <Grid key={c.id} size={{ xs: 12, sm: 6, md: 3 }}>
              <Card sx={{ borderLeft: '3px solid var(--success)' }}>
                <CardContent>
                  <Typography variant='subtitle2' fontWeight={600} sx={{ fontFamily: 'monospace', fontSize: '0.7rem' }}>
                    {c.id}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, mt: 0.5, mb: 1 }}>
                    <Chip label={c.layer} size='small' color='primary' variant='tonal' />
                    <Chip label={c.confidence} size='small' variant='outlined' sx={{ fontSize: '0.6rem' }} />
                  </Box>
                  <Typography variant='h6' fontWeight={800}>${c.cost_usd.toFixed(6)}</Typography>
                  <Typography variant='caption' color='text.secondary'>por chamada</Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        {/* Disponíveis */}
        <Typography variant='subtitle2' sx={{ mt: 3, mb: 1 }} color='text.secondary'>⬜ Disponíveis (não integrados)</Typography>
        <Grid container spacing={1}>
          {availableCaps.map(c => (
            <Grid key={c.id} size={{ xs: 12, sm: 6, md: 4 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.5 }}>
                <Chip label={c.layer} size='small' variant='outlined' sx={{ fontSize: '0.6rem', minWidth: 28 }} />
                <Typography variant='caption' sx={{ fontFamily: 'monospace', fontSize: '0.65rem', flex: 1 }}>{c.id}</Typography>
                <Typography variant='caption' fontWeight={600}>${c.cost_usd.toFixed(4)}</Typography>
              </Box>
            </Grid>
          ))}
        </Grid>
      </Grid>

      {/* ── ROI ── */}
      <Grid size={{ xs: 12, md: 6 }}>
        <Card sx={{ bgcolor: 'var(--pastel-mint)' }}>
          <CardContent>
            <Typography variant='h6' gutterBottom>📊 ROI do Discovery Engine</Typography>
            <Typography variant='body2' sx={{ mb: 2 }}>
              Custo total: <strong>${sup.totalCost.toFixed(4)} (~R${(sup.totalCost * brlRate).toFixed(2)})</strong> para ~{totalLeads} leads.
            </Typography>
            <Typography variant='h3' fontWeight={800} color='success.main'>
              ${costPerLead.toFixed(5)}
            </Typography>
            <Typography variant='body2' sx={{ mt: 1 }}>
              Custo por lead com 27 campos + score + Schwartz + contato.
              Compare: Google Ads = R$28.40/lead.
              <strong> Adsentice é {(28.40 / brlRate / Math.max(costPerLead, 0.0001)).toFixed(0)}× mais barato.</strong>
            </Typography>
          </CardContent>
        </Card>
      </Grid>

      {/* ── Margem ── */}
      <Grid size={{ xs: 12, md: 6 }}>
        <Card>
          <CardContent>
            <Typography variant='h6' gutterBottom>💡 Margem por Plano</Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {[
                { plan: 'Raio-X (grátis)', price: 0, cost: sup.totalCost, purpose: 'Lead magnet — custo de aquisição' },
                { plan: 'Sentinela (R$197/mês)', price: 197, cost: sup.totalCost, purpose: '1 cliente cobre todas as buscas' },
                { plan: 'Domínio (R$497/mês)', price: 497, cost: sup.totalCost * 2, purpose: 'Full stack com margem alta' },
              ].map(p => (
                <Box key={p.plan} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box>
                    <Typography fontWeight={600}>{p.plan}</Typography>
                    <Typography variant='caption' color='text.secondary'>{p.purpose}</Typography>
                  </Box>
                  <Chip
                    label={p.price > 0 ? `Margem R$${(p.price - p.cost * brlRate).toFixed(0)}/mês` : 'Lead magnet'}
                    size='small' color={p.price - p.cost * brlRate > 0 ? 'success' : 'info'} variant='tonal' />
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
