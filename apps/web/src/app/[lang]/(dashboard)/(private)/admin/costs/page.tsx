
// adsentice · Admin / Costs — centro de custos DataForSEO com dados REAIS do Supabase
import { redirect } from 'next/navigation'

import Grid from '@mui/material/Grid2'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import Chip from '@mui/material/Chip'
import Box from '@mui/material/Box'
import Alert from '@mui/material/Alert'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Paper from '@mui/material/Paper'

import { Pool } from 'pg'

import CardStatVertical from '@components/card-statistics/Vertical'
import { getSessionUser } from '@/libs/supabase/server'

// Preços REAIS DataForSEO (fonte: api.dataforseo.com/pricing — 2026)
const CAPABILITIES = [
  { capability: 'business_listings_search', costPerCall: 0.015, endpoint: 'business_data/business_listings/search/live', used: true },
  { capability: 'business_profile_gmb', costPerCall: 0.0054, endpoint: 'business_data/google/my_business_info/live', used: true },
  { capability: 'keyword_research', costPerCall: 0.02, endpoint: 'dataforseo_labs/google/keyword_overview/live', used: false },
  { capability: 'on_page_lighthouse', costPerCall: 0.0001, endpoint: 'on_page/lighthouse/live', used: false },
  { capability: 'domain_competitors', costPerCall: 0.02, endpoint: 'dataforseo_labs/google/competitors_domain/live', used: false },
  { capability: 'serp_organic', costPerCall: 0.01, endpoint: 'serp/google/organic/live/advanced', used: false },
  { capability: 'backlinks_summary', costPerCall: 0.02, endpoint: 'backlinks/summary/live', used: false },
]

const CostsPage = async ({ params }: { params: Promise<{ lang: string }> }) => {
  const { lang } = await params
  const user = await getSessionUser()

  if (user?.role !== 'admin') redirect(`/${lang}/app`)

  // ═══ DataForSEO Rate Limits (API real-time) ═══
  let dfsLogin = ''
  let dfsRateLimits: { capability: string; dailyUsed: number; dailyLimit: number; monthlyUsed: number }[] = []

  try {
    const auth = Buffer.from(`${process.env.DATAFORSEO_LOGIN}:${process.env.DATAFORSEO_PASSWORD}`).toString('base64')

    const res = await fetch('https://api.dataforseo.com/v3/appendix/user_data', {
      method: 'POST', headers: { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/json' },
      body: JSON.stringify([{}]), signal: AbortSignal.timeout(5000),
    })

    if (res.ok) {
      const data = await res.json()
      const result = (data?.tasks?.[0]?.result || [{}])[0]

      dfsLogin = result.login || ''
      const limits = result?.rates?.limits
      const monthly = result?.rates?.month || result?.rates?.limits_month || {}

      if (limits) {
        const businessDay = limits?.day?.business_data || {}
        const businessMonth = monthly?.business_data || {}
        const profileDay = businessDay?.my_business_info || {}
        const profileMonth = businessMonth?.my_business_info || {}

        dfsRateLimits = [
          {
            capability: 'business_listings_search',
            dailyUsed: (businessDay?.business_listings_search || businessDay?.business_listings || {}).task_post || 0,
            dailyLimit: (businessDay?.business_listings_search || businessDay?.business_listings || {}).task_post_limit || 2000,
            monthlyUsed: (businessMonth?.business_listings_search || businessMonth?.business_listings || {}).task_post || 0,
          },
          {
            capability: 'business_profile_gmb',
            dailyUsed: profileDay?.task_post || 0,
            dailyLimit: profileDay?.task_post_limit || 2000,
            monthlyUsed: profileMonth?.task_post || 0,
          },
        ]
      }
    }
  } catch { /* API offline */ }

  // ═══ Dados REAIS do Supabase ═══
  let totalCost = 0
  let totalSearches = 0
  let totalLeads = 0
  let totalL1 = 0
  let avgCost = 0
  let l0Calls = 0
  let l1Calls = 0
  let searches: { id: string; cats: string; lat: number; total: number; cost: number; at: string; listings: number; l1: number }[] = []

  try {
    const pool = new Pool({
      host: 'aws-0-ca-central-1.pooler.supabase.com', port: 6543, database: 'postgres',
      user: 'postgres.tdigauruusdhnpvppixb', password: 'pmaxnpmiJ6WfcX46',
      ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 5000,
    })

    const [costRes, detailRes, listingsRes] = await Promise.all([
      pool.query('SELECT SUM(cost_usd) as total, COUNT(*) as n, AVG(cost_usd) as avg FROM discovery_searches'),
      pool.query('SELECT ds.id, ds.categories, ds.lat, ds.total_count, ds.cost_usd, ds.created_at, COUNT(dl.id) as listings, SUM(CASE WHEN dl.enrichment_level>0 THEN 1 ELSE 0 END) as l1 FROM discovery_searches ds LEFT JOIN discovery_listings dl ON dl.search_id=ds.id GROUP BY ds.id ORDER BY ds.created_at DESC'),
      pool.query('SELECT COUNT(DISTINCT place_id) as uniq, COUNT(*) FILTER (WHERE enrichment_level>0) as l1 FROM (SELECT DISTINCT ON (place_id) place_id, enrichment_level FROM discovery_listings ORDER BY place_id, enrichment_level DESC) sub'),
    ])

    totalCost = parseFloat(costRes.rows[0].total) || 0
    totalSearches = parseInt(costRes.rows[0].n) || 0
    avgCost = parseFloat(costRes.rows[0].avg) || 0
    totalLeads = parseInt(listingsRes.rows[0].uniq) || 0
    totalL1 = parseInt(listingsRes.rows[0].l1) || 0

    searches = detailRes.rows.map((r: any) => ({
      id: r.id.substring(0, 8),
      cats: (r.categories || []).join(', '),
      lat: r.lat,
      total: parseInt(r.total_count) || 0,
      cost: parseFloat(r.cost_usd) || 0,
      at: r.created_at ? new Date(r.created_at).toISOString().substring(0, 16) : '?',
      listings: parseInt(r.listings) || 0,
      l1: parseInt(r.l1) || 0,
    }))

    // Count L0 vs L1 calls
    l0Calls = totalSearches
    l1Calls = searches.reduce((s, r) => s + r.l1, 0)

    await pool.end()
  } catch { /* Supabase offline */ }

  const costPerLead = totalLeads > 0 ? totalCost / totalLeads : 0

  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12 }}>
        <Typography variant='h4'>💰 Centro de Custos</Typography>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap', mt: 1 }}>
          <Typography variant='body2' color='text.secondary'>
            DataForSEO spend · Dados REAIS do Supabase (discovery_searches)
          </Typography>
          <Chip label='Dados REAIS' size='small' color='success' variant='tonal' />
        </Box>
      </Grid>

      {/* Top cost metrics — REAIS do Supabase */}
      <Grid size={{ xs: 12, sm: 3 }}>
        <CardStatVertical stats={`$${totalCost.toFixed(4)}`} title='Custo Total'
          subtitle={`${totalSearches} buscas · R$${(totalCost * 5.5).toFixed(2)}`}
          avatarColor='warning' avatarIcon='ri-money-dollar-circle-line'
          trendNumber={totalCost.toFixed(4)} trend='positive' />
      </Grid>
      <Grid size={{ xs: 12, sm: 3 }}>
        <CardStatVertical stats={`$${avgCost.toFixed(4)}`} title='Custo Médio/Busca'
          subtitle={`L0: $${totalSearches * 0.015} + L1: ${l1Calls} × $0.0054`}
          avatarColor='error' avatarIcon='ri-line-chart-line'
          trendNumber={avgCost.toFixed(4)} trend='negative' />
      </Grid>
      <Grid size={{ xs: 12, sm: 3 }}>
        <CardStatVertical stats={`$${costPerLead.toFixed(5)}`} title='Custo por Lead'
          subtitle={`${totalLeads} leads únicos · R$${(costPerLead * 5.5).toFixed(4)}`}
          avatarColor='success' avatarIcon='ri-copper-coin-line'
          trendNumber={totalLeads.toString()} trend='positive' />
      </Grid>
      <Grid size={{ xs: 12, sm: 3 }}>
        <CardStatVertical stats={`${l1Calls}`} title='Chamadas L1'
          subtitle={`${totalL1} leads enriquecidos (27 campos)`}
          avatarColor='primary' avatarIcon='ri-sparkling-line'
          trendNumber={String(l1Calls)} trend='positive' />
      </Grid>

      {/* Rate Limits (API real-time) */}
      {dfsRateLimits.length > 0 && (
        <Grid size={{ xs: 12 }}>
          <Card sx={{ bgcolor: 'var(--pastel-sky)' }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant='h6'>📊 Rate Limits DataForSEO (tempo real)</Typography>
                <Chip label={`Conta: ${dfsLogin}`} size='small' variant='outlined' />
              </Box>
              <Grid container spacing={3}>
                {dfsRateLimits.map((rl) => (
                  <Grid key={rl.capability} size={{ xs: 12, sm: 6 }}>
                    <Typography variant='subtitle2' fontWeight={600} sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }} gutterBottom>
                      {rl.capability}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 3 }}>
                      <Box>
                        <Typography variant='caption' color='text.secondary'>Diário</Typography>
                        <Typography variant='h6' fontWeight={800} color={rl.dailyUsed > rl.dailyLimit * 0.8 ? 'error.main' : 'success.main'}>
                          {rl.dailyUsed.toLocaleString('pt-BR')}/{rl.dailyLimit.toLocaleString('pt-BR')}
                        </Typography>
                        <Typography variant='caption' color='text.secondary'>
                          {((rl.dailyUsed / Math.max(rl.dailyLimit, 1)) * 100).toFixed(1)}% usado
                        </Typography>
                      </Box>
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      )}

      {/* Balance Note */}
      <Grid size={{ xs: 12 }}>
        <Alert severity='info'>
          <Typography variant='body2'>
            💰 <strong>Balance financeiro:</strong> disponível apenas no{' '}
            <a href='https://app.dataforseo.com/billing' target='_blank' rel='noopener noreferrer' style={{ fontWeight: 600 }}>
              Dashboard DataForSEO → Billing
            </a>. A API REST não expõe saldo em dólar.
            O adsentice rastreia o gasto real via Supabase (<strong>${totalCost.toFixed(4)} total</strong> em {totalSearches} buscas).
          </Typography>
        </Alert>
      </Grid>

      {/* Preços DataForSEO */}
      <Grid size={{ xs: 12 }}>
        <Typography variant='h6' gutterBottom>📋 Preços DataForSEO por Endpoint</Typography>
        <Grid container spacing={3}>
          {CAPABILITIES.map((item) => (
            <Grid key={item.capability} size={{ xs: 12, sm: 6, md: 4 }}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                    <Typography variant='subtitle2' fontWeight={600} sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                      {item.capability}
                    </Typography>
                    <Chip label={item.used ? '✅ Em uso' : '⬜ Disponível'} size='small'
                      color={item.used ? 'success' : 'default'} variant='tonal' />
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant='caption' color='text.secondary'>Preço por chamada</Typography>
                    <Typography variant='body2' fontWeight={700}>${item.costPerCall.toFixed(4)}</Typography>
                  </Box>
                  <Typography variant='caption' color='text.secondary' sx={{ fontFamily: 'monospace', fontSize: '0.65rem', display: 'block', mb: 1 }}>
                    {item.endpoint}
                  </Typography>
                  {item.used && (
                    <Box sx={{ mt: 1 }}>
                      {item.capability === 'business_listings_search' && (
                        <Chip label={`${l0Calls} chamadas · $${(l0Calls * 0.015).toFixed(2)}`} size='small' color='warning' variant='tonal' />
                      )}
                      {item.capability === 'business_profile_gmb' && (
                        <Chip label={`${l1Calls} chamadas · $${(l1Calls * 0.0054).toFixed(4)}`} size='small' color='warning' variant='tonal' />
                      )}
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Grid>

      {/* Search History */}
      <Grid size={{ xs: 12 }}>
        <Typography variant='h6' gutterBottom>📊 Histórico de Buscas (Supabase)</Typography>
        <TableContainer component={Paper}>
          <Table size='small'>
            <TableHead>
              <TableRow>
                <TableCell>ID</TableCell>
                <TableCell>Categorias</TableCell>
                <TableCell>Região</TableCell>
                <TableCell align='right'>DataForSEO</TableCell>
                <TableCell align='right'>Listings</TableCell>
                <TableCell align='right'>L1</TableCell>
                <TableCell align='right'>Custo</TableCell>
                <TableCell>Data</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {searches.map((s) => (
                <TableRow key={s.id} hover>
                  <TableCell><Chip label={s.id} size='small' variant='outlined' sx={{ fontFamily: 'monospace', fontSize: '0.65rem' }} /></TableCell>
                  <TableCell><Typography variant='body2'>{s.cats}</Typography></TableCell>
                  <TableCell>
                    <Chip label={s.lat < -22 ? 'RJ' : 'SP'} size='small'
                      color={s.lat < -22 ? 'info' : 'warning'} variant='tonal' />
                  </TableCell>
                  <TableCell align='right'><Typography variant='body2'>{s.total.toLocaleString('pt-BR')}</Typography></TableCell>
                  <TableCell align='right'><Typography variant='body2' fontWeight={600}>{s.listings}</Typography></TableCell>
                  <TableCell align='right'>
                    <Chip label={s.l1 > 0 ? `${s.l1} ✅` : '0'} size='small'
                      color={s.l1 > 20 ? 'success' : s.l1 > 0 ? 'warning' : 'default'} variant='tonal' />
                  </TableCell>
                  <TableCell align='right'><Typography variant='body2' fontWeight={700} color='warning.main'>${s.cost.toFixed(4)}</Typography></TableCell>
                  <TableCell><Typography variant='caption'>{s.at}</Typography></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Grid>

      {/* ROI */}
      <Grid size={{ xs: 12, md: 6 }}>
        <Card sx={{ bgcolor: 'var(--pastel-mint)' }}>
          <CardContent>
            <Typography variant='h6' gutterBottom>📊 ROI do Discovery Engine</Typography>
            <Typography variant='body2' sx={{ mb: 2 }}>
              Custo total: <strong>${totalCost.toFixed(4)} (~R${(totalCost * 5.5).toFixed(2)})</strong> para {totalLeads} leads únicos em 2 cidades.
            </Typography>
            <Typography variant='h3' fontWeight={800} color='success.main'>
              ${costPerLead.toFixed(5)}
            </Typography>
            <Typography variant='body2' sx={{ mt: 1 }}>
              Custo por lead com dados completos (27 campos, score, Schwartz, contato).
              Compare: Google Ads = R$28.40/lead (só nome e telefone, sem contexto).
              <strong> O adsentice é {(28.40 / 5.5 / Math.max(costPerLead, 0.0001)).toFixed(0)}× mais barato.</strong>
            </Typography>
          </CardContent>
        </Card>
      </Grid>

      {/* Margem */}
      <Grid size={{ xs: 12, md: 6 }}>
        <Card>
          <CardContent>
            <Typography variant='h6' gutterBottom>💡 Margem por Plano</Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {[
                { plan: 'Raio-X (grátis)', price: 0, cost: totalCost, margin: -totalCost, purpose: 'Lead magnet — custo de aquisição' },
                { plan: 'Sentinela (R$197/mês)', price: 197, cost: totalCost, margin: 197 - totalCost, purpose: '1 cliente paga todas as buscas' },
                { plan: 'Domínio (R$497/mês)', price: 497, cost: totalCost * 2, margin: 497 - (totalCost * 2), purpose: 'Full stack: SEO + Social + Brand' },
              ].map((p) => (
                <Box key={p.plan} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box>
                    <Typography fontWeight={600}>{p.plan}</Typography>
                    <Typography variant='caption' color='text.secondary'>{p.purpose}</Typography>
                  </Box>
                  <Chip label={p.margin > 0 ? `Margem R$${p.margin.toFixed(0)}/mês` : 'Lead magnet'}
                    size='small' color={p.margin > 0 ? 'success' : 'info'} variant='tonal' />
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
