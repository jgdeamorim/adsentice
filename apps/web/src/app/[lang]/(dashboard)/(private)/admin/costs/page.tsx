
// adsentice · Admin / Costs — centro de custos DataForSEO
import { redirect } from 'next/navigation'

import Grid from '@mui/material/Grid2'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import Chip from '@mui/material/Chip'
import Box from '@mui/material/Box'
import LinearProgress from '@mui/material/LinearProgress'

import CardStatVertical from '@components/card-statistics/Vertical'
import { getSessionUser } from '@/libs/supabase/server'

interface CostItem {
  capability: string
  costPerCall: number
  callsToday: number
  costToday: number
  costProjected: number
}

const COST_DATA: CostItem[] = [
  { capability: 'business_listings_search', costPerCall: 0.015, callsToday: 3, costToday: 0.045, costProjected: 0.86 },
  { capability: 'keyword_research', costPerCall: 0.02, callsToday: 2, costToday: 0.04, costProjected: 0.40 },
  { capability: 'business_profile_gmb', costPerCall: 0.0054, callsToday: 0, costToday: 0, costProjected: 2.70 },
  { capability: 'on_page_lighthouse', costPerCall: 0.0001, callsToday: 0, costToday: 0, costProjected: 0.005 },
  { capability: 'domain_competitors', costPerCall: 0.02, callsToday: 0, costToday: 0, costProjected: 0.60 },
  { capability: 'serp_organic', costPerCall: 0.01, callsToday: 0, costToday: 0, costProjected: 0.30 },
  { capability: 'business_reviews_google', costPerCall: 0.00075, callsToday: 0, costToday: 0, costProjected: 0.037 },
]

const CostsPage = async ({ params }: { params: Promise<{ lang: string }> }) => {
  const { lang } = await params
  const user = await getSessionUser()

  if (user?.role !== 'admin') redirect(`/${lang}/app`)

  const totalToday = COST_DATA.reduce((s, c) => s + c.costToday, 0)
  const totalProjected = COST_DATA.reduce((s, c) => s + c.costProjected, 0)

  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12 }}>
        <Typography variant='h4'>💰 Centro de Custos</Typography>
        <Typography variant='body2' color='text.secondary'>
          DataForSEO spend · custo por capability · projeção mensal
        </Typography>
      </Grid>

      {/* Top cost metrics */}
      <Grid size={{ xs: 12, sm: 4 }}>
        <CardStatVertical
          stats={`$${totalToday.toFixed(3)}`}
          title='Custo Hoje'
          subtitle={`R$${(totalToday * 5.5).toFixed(2)} · ${COST_DATA.filter(c => c.callsToday > 0).length} endpoints usados`}
          avatarColor='warning'
          avatarIcon='ri-money-dollar-circle-line'
          trendNumber={String(COST_DATA.filter(c => c.callsToday > 0).length)}
          trend='positive'
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 4 }}>
        <CardStatVertical
          stats={`$${totalProjected.toFixed(2)}`}
          title='Projeção Mensal'
          subtitle='57 categorias SP · full enrichment'
          avatarColor='error'
          avatarIcon='ri-line-chart-line'
          trendNumber={String(Math.round(totalProjected / totalToday))}
          trend='negative'
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 4 }}>
        <CardStatVertical
          stats={'~R$0.00'}
          title='Custo por Lead'
          subtitle='projeção: ~R$0.02/lead após enrichment'
          avatarColor='success'
          avatarIcon='ri-copper-coin-line'
          trendNumber={String(2)}
          trend='negative'
        />
      </Grid>

      {/* Capability cost breakdown */}
      <Grid size={{ xs: 12 }}>
        <Typography variant='h6' gutterBottom>📋 Breakdown por Capability</Typography>
        <Grid container spacing={3}>
          {COST_DATA.map((item) => (
            <Grid key={item.capability} size={{ xs: 12, sm: 6, md: 4 }}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                    <Typography variant='subtitle2' fontWeight={600} sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                      {item.capability}
                    </Typography>
                    <Chip
                      label={item.callsToday > 0 ? 'ativo' : 'ocioso'}
                      size='small'
                      color={item.callsToday > 0 ? 'success' : 'default'}
                      variant='tonal'
                    />
                  </Box>
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 6 }}>
                      <Typography variant='caption' color='text.secondary'>Custo por chamada</Typography>
                      <Typography variant='h6'>${item.costPerCall.toFixed(4)}</Typography>
                    </Grid>
                    <Grid size={{ xs: 6 }}>
                      <Typography variant='caption' color='text.secondary'>Chamadas hoje</Typography>
                      <Typography variant='h6'>{item.callsToday}</Typography>
                    </Grid>
                    <Grid size={{ xs: 6 }}>
                      <Typography variant='caption' color='text.secondary'>Custo hoje</Typography>
                      <Typography variant='h6'>${item.costToday.toFixed(4)}</Typography>
                    </Grid>
                    <Grid size={{ xs: 6 }}>
                      <Typography variant='caption' color='text.secondary'>Projeção/mês</Typography>
                      <Typography variant='h6'>${item.costProjected.toFixed(2)}</Typography>
                    </Grid>
                  </Grid>
                  <LinearProgress
                    variant='determinate'
                    value={(item.costProjected / totalProjected) * 100}
                    color={item.costProjected > 0.50 ? 'error' : 'warning'}
                    sx={{ mt: 2, height: 4, borderRadius: 2 }}
                  />
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Grid>

      {/* Pricing comparison */}
      <Grid size={{ xs: 12, md: 6 }}>
        <Card>
          <CardContent>
            <Typography variant='h6' gutterBottom>💡 Margem por Plano</Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {[
                { plan: 'Raio-X (grátis)', price: 0, cost: 0.02, margin: -0.02 },
                { plan: 'Sentinela (R$197)', price: 197, cost: 3.00, margin: 194 },
                { plan: 'Domínio (R$497)', price: 497, cost: 5.00, margin: 492 },
              ].map((p) => (
                <Box key={p.plan} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box>
                    <Typography fontWeight={600}>{p.plan}</Typography>
                    <Typography variant='caption' color='text.secondary'>
                      Custo dados: R${p.cost.toFixed(2)}/mês
                    </Typography>
                  </Box>
                  <Chip
                    label={p.margin > 0 ? `Margem R$${p.margin}/mês` : 'Lead magnet'}
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
              Custo total para analisar 57 categorias em SP com dados REAIS:
            </Typography>
            <Typography variant='h3' fontWeight={800} color='success.main'>
              ~R$5,00
            </Typography>
            <Typography variant='body2' sx={{ mt: 1 }}>
              Retorno: ~2.300 leads urgentes mapeados automaticamente.
              Custo por lead qualificado: menos de R$0.01.
              Uma agência cobraria R$500+ por esse levantamento.
            </Typography>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  )
}

export default CostsPage
