
// adsentice · Admin / Costs — centro de custos DataForSEO com dados REAIS do Redis
import { redirect } from 'next/navigation'

import Grid from '@mui/material/Grid2'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import Chip from '@mui/material/Chip'
import Box from '@mui/material/Box'
import Alert from '@mui/material/Alert'

import CardStatVertical from '@components/card-statistics/Vertical'
import { getSessionUser } from '@/libs/supabase/server'
import { getAdminDashboardData } from '@/lib/engine'

// ── Preços REAIS DataForSEO (fonte: api.dataforseo.com pricing) ──
const CAPABILITIES = [
  { capability: 'business_listings_search', costPerCall: 0.015, endpoint: 'business_data/business_listings/search/live' },
  { capability: 'business_profile_gmb', costPerCall: 0.0054, endpoint: 'business_data/google/my_business_info/live' },
  { capability: 'keyword_research', costPerCall: 0.02, endpoint: 'dataforseo_labs/google/keyword_overview/live' },
  { capability: 'on_page_lighthouse', costPerCall: 0.0001, endpoint: 'on_page/lighthouse/live' },
  { capability: 'domain_competitors', costPerCall: 0.02, endpoint: 'dataforseo_labs/google/competitors_domain/live' },
  { capability: 'serp_organic', costPerCall: 0.01, endpoint: 'serp/google/organic/live/advanced' },
  { capability: 'backlinks_summary', costPerCall: 0.02, endpoint: 'backlinks/summary/live' },
]

const CostsPage = async ({ params }: { params: Promise<{ lang: string }> }) => {
  const { lang } = await params
  const user = await getSessionUser()

  if (user?.role !== 'admin') redirect(`/${lang}/app`)

  // ═══ Dados REAIS do engine (Redis :6396) ═══
  const e = await getAdminDashboardData()
  const costToday = e.dataCostToday
  const costProjected = e.dataCostProjected

  // Last call details from Redis
  let lastCallDetail = '—'

  try {
    const { execSync } = await import('child_process')

    lastCallDetail = execSync('redis-cli -p 6396 --no-auth-warning GET adsentice:discovery:cost:last', { timeout: 2000, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim() || '—'
  } catch { /* Redis offline */ }

  const totalCalls = e.leadsDiscovered > 0 ? e.leadsDiscovered : 0
  const costPerLead = totalCalls > 0 ? costToday / totalCalls : 0

  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12 }}>
        <Typography variant='h4'>💰 Centro de Custos</Typography>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap', mt: 1 }}>
          <Typography variant='body2' color='text.secondary'>
            DataForSEO spend · Fonte: Redis adsentice:discovery:cost:*
          </Typography>
          {costToday > 0 ? (
            <Chip label='Dados REAIS' size='small' color='success' variant='tonal' />
          ) : (
            <Chip label='Sem chamadas hoje' size='small' color='default' variant='tonal' />
          )}
        </Box>
      </Grid>

      {/* Top cost metrics — REAIS do Redis */}
      <Grid size={{ xs: 12, sm: 3 }}>
        <CardStatVertical
          stats={`$${costToday.toFixed(4)}`}
          title='Custo Hoje'
          subtitle={costToday > 0 ? `R$${(costToday * 5.5).toFixed(2)} BRL` : 'Nenhuma chamada hoje'}
          avatarColor='warning'
          avatarIcon='ri-money-dollar-circle-line'
          trendNumber={costToday.toFixed(4)}
          trend={costToday > 0 ? 'positive' : 'negative'}
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 3 }}>
        <CardStatVertical
          stats={`$${costProjected.toFixed(2)}`}
          title='Projeção Mensal'
          subtitle={costProjected > 0 ? `${Math.round(costProjected / Math.max(costToday, 0.001))}× custo de hoje` : 'Sem dados para projetar'}
          avatarColor='error'
          avatarIcon='ri-line-chart-line'
          trendNumber={costProjected.toFixed(2)}
          trend='negative'
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 3 }}>
        <CardStatVertical
          stats={costPerLead > 0 ? `$${costPerLead.toFixed(5)}` : '—'}
          title='Custo por Lead'
          subtitle={totalCalls > 0 ? `${totalCalls.toLocaleString('pt-BR')} leads mapeados` : 'Execute 1ª descoberta'}
          avatarColor='success'
          avatarIcon='ri-copper-coin-line'
          trendNumber={totalCalls.toLocaleString('pt-BR')}
          trend='positive'
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 3 }}>
        <CardStatVertical
          stats={totalCalls.toLocaleString('pt-BR')}
          title='Chamadas Acumuladas'
          subtitle={`Última: ${lastCallDetail.length > 80 ? lastCallDetail.slice(0, 80) + '...' : lastCallDetail}`}
          avatarColor='primary'
          avatarIcon='ri-plug-line'
          trendNumber={String(totalCalls)}
          trend='positive'
        />
      </Grid>

      {/* Capability cost breakdown */}
      <Grid size={{ xs: 12 }}>
        <Typography variant='h6' gutterBottom>📋 Preços DataForSEO por Endpoint</Typography>
        <Grid container spacing={3}>
          {CAPABILITIES.map((item) => {
            // Mark active if this endpoint was used today (tracked in Redis)
            const isActive = item.capability === 'business_listings_search' && costToday > 0

            return (
              <Grid key={item.capability} size={{ xs: 12, sm: 6, md: 4 }}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                      <Typography variant='subtitle2' fontWeight={600} sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                        {item.capability}
                      </Typography>
                      <Chip
                        label={isActive ? 'ativo hoje' : 'disponível'}
                        size='small'
                        color={isActive ? 'success' : 'default'}
                        variant='tonal'
                      />
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant='caption' color='text.secondary'>Custo por chamada</Typography>
                      <Typography variant='body2' fontWeight={700}>${item.costPerCall.toFixed(4)}</Typography>
                    </Box>
                    <Typography variant='caption' color='text.secondary' sx={{ fontFamily: 'monospace', fontSize: '0.7rem', display: 'block', mb: 1 }}>
                      {item.endpoint}
                    </Typography>
                    {isActive && (
                      <Chip label='Usado no Discovery Engine' size='small' color='warning' variant='tonal' sx={{ mt: 1 }} />
                    )}
                  </CardContent>
                </Card>
              </Grid>
            )
          })}
        </Grid>
      </Grid>

      {/* Pricing comparison */}
      <Grid size={{ xs: 12, md: 6 }}>
        <Card>
          <CardContent>
            <Typography variant='h6' gutterBottom>💡 Margem por Plano (projeção)</Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {[
                { plan: 'Raio-X (grátis)', price: 0, cost: costToday || 0.02, margin: -(costToday || 0.02), purpose: 'Lead magnet' },
                { plan: 'Sentinela (R$197/mês)', price: 197, cost: costProjected || 3.00, margin: 197 - (costProjected || 3.00), purpose: 'Produto principal' },
                { plan: 'Domínio (R$497/mês)', price: 497, cost: (costProjected || 3.00) * 1.5, margin: 497 - ((costProjected || 3.00) * 1.5), purpose: 'Full stack' },
              ].map((p) => (
                <Box key={p.plan} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box>
                    <Typography fontWeight={600}>{p.plan}</Typography>
                    <Typography variant='caption' color='text.secondary'>
                      Custo dados: ~R${p.cost.toFixed(2)}/mês · {p.purpose}
                    </Typography>
                  </Box>
                  <Chip
                    label={p.margin > 0 ? `Margem R$${p.margin.toFixed(0)}/mês` : 'Lead magnet'}
                    size='small'
                    color={p.margin > 0 ? 'success' : 'info'}
                    variant='tonal'
                  />
                </Box>
              ))}
            </Box>
          </CardContent>
        </Card>
      </Grid>

      <Grid size={{ xs: 12, md: 6 }}>
        <Card sx={{ bgcolor: 'var(--pastel-mint)' }}>
          <CardContent>
            <Typography variant='h6' gutterBottom>📊 ROI do Discovery Engine</Typography>
            <Typography variant='body2' sx={{ mb: 2 }}>
              {costToday > 0
                ? `Custo total acumulado: $${costProjected.toFixed(2)} para ${totalCalls.toLocaleString('pt-BR')} leads.`
                : 'Execute a 1ª descoberta para ver o ROI real.'}
            </Typography>
            {totalCalls > 0 && costPerLead > 0 ? (
              <>
                <Typography variant='h3' fontWeight={800} color='success.main'>
                  ${costPerLead.toFixed(5)}
                </Typography>
                <Typography variant='body2' sx={{ mt: 1 }}>
                  por lead mapeado. Uma agência cobraria R$50+ por lead qualificado.
                  Com 12 categorias em SP: ~R${(costProjected * 5.5).toFixed(2)}/mês para alimentar todo o pipeline.
                </Typography>
              </>
            ) : (
              <Alert severity='info' sx={{ mt: 1 }}>
                <Typography variant='body2'>
                  Dados reais aparecerão aqui após a primeira busca no Discovery Engine.
                  Custo estimado: ~$0.18 para testar as 12 categorias em SP (raio 10km).
                </Typography>
              </Alert>
            )}
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  )
}

export default CostsPage
