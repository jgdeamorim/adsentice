
// adsentice · Admin / Market Intelligence — ADR-0009
// Agrega dados existentes por categoria × região (ZERO novas APIs)
import { redirect } from 'next/navigation'

import Grid from '@mui/material/Grid2'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import Chip from '@mui/material/Chip'
import Box from '@mui/material/Box'
import LinearProgress from '@mui/material/LinearProgress'
import Alert from '@mui/material/Alert'

import CardStatVertical from '@components/card-statistics/Vertical'
import { getSessionUser } from '@/libs/supabase/server'
import { nicheIntelligence, listMarketCategories } from '@/lib/market-intel'

const MarketPage = async ({ params, searchParams }: {
  params: Promise<{ lang: string }>
  searchParams: Promise<{ category?: string; city?: string }>
}) => {
  const { lang } = await params
  const sp = await searchParams
  const filterCategory = sp.category || 'dentist'
  const filterCity = sp.city || ''

  const user = await getSessionUser()
  if (user?.role !== 'admin') redirect(`/${lang}/app`)

  const categories = await listMarketCategories()
  const intel = await nicheIntelligence(filterCategory, filterCity || null)

  const schwartzColors = ["#9e9e9e", "#42a5f5", "#ffa726", "#ef5350", "#d32f2f"]
  const maturityColors = ["#9e9e9e", "#42a5f5", "#ffa726", "#ef5350", "#4caf50"]
  const severityColors: Record<string, "error" | "warning" | "info" | "success"> = { critico: "error", alto: "warning", medio: "info", baixo: "success" }

  return (
    <Grid container spacing={6}>
      {/* Header */}
      <Grid size={{ xs: 12 }}>
        <Typography variant='h4'>📊 Market Intelligence</Typography>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap', mt: 1 }}>
          <Typography variant='body2' color='text.secondary'>
            Inteligencia de nicho por categoria × regiao · Dados 100% do Supabase (ZERO novas APIs)
          </Typography>
          <Chip label='ADR-0009' size='small' color='primary' variant='tonal' />
          <Chip label='v0.6 · MVP' size='small' color='success' variant='tonal' />
        </Box>
      </Grid>

      {/* Category Selector */}
      <Grid size={{ xs: 12 }}>
        <Card>
          <CardContent>
            <Grid container spacing={2} alignItems='center'>
              <Grid size={{ xs: 12, md: 8 }}>
                <Typography variant='caption' fontWeight={600} gutterBottom component='div'>
                  📁 Categoria:
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  {categories.slice(0, 15).map(c => (
                    <Chip key={c.category} label={`${c.label} (${c.count})`} size='small' clickable
                      color={filterCategory === c.category ? 'primary' : 'default'}
                      variant={filterCategory === c.category ? 'filled' : 'outlined'}
                      component='a' href={`/${lang}/admin/market?category=${c.category}${filterCity ? `&city=${filterCity}` : ''}`} />
                  ))}
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Grid>

      {!intel ? (
        <Grid size={{ xs: 12 }}>
          <Alert severity='info' sx={{ mt: 2 }}>
            Execute buscas no Discovery Engine primeiro para popular os dados de {filterCategory}.
            Va em <strong>Discovery</strong> → selecione {filterCategory} → buscar.
          </Alert>
        </Grid>
      ) : (
        <>
          {/* Top KPIs */}
          <Grid size={{ xs: 6, sm: 2.4 }}>
            <CardStatVertical stats={intel.overview.totalBusinesses.toLocaleString('pt-BR')} title='Total no Mercado'
              subtitle={`${intel.overview.enrichedBusinesses} enriquecidos`} avatarColor='primary' avatarIcon='ri-store-2-line'
              trendNumber={String(intel.overview.totalBusinesses)} trend='positive' />
          </Grid>
          <Grid size={{ xs: 6, sm: 2.4 }}>
            <CardStatVertical stats={`${intel.overview.avgScore}/100`} title='Score Medio do Mercado'
              subtitle={`${intel.overview.city}`} avatarColor='warning' avatarIcon='ri-bar-chart-line'
              trendNumber={String(intel.overview.avgScore)} trend='positive' />
          </Grid>
          <Grid size={{ xs: 6, sm: 2.4 }}>
            <CardStatVertical stats={`${intel.density.densityPerKm2}/km²`} title='Densidade Competitiva'
              subtitle={intel.density.saturation === 'baixa' ? '🟢 Baixa concorrencia' : intel.density.saturation === 'media' ? '🟡 Media' : '🔴 Alta'}
              avatarColor={intel.density.saturation === 'baixa' ? 'success' : 'error'} avatarIcon='ri-map-pin-line'
              trendNumber={String(intel.density.totalCompetitors)} trend='positive' />
          </Grid>
          <Grid size={{ xs: 6, sm: 2.4 }}>
            <CardStatVertical stats={`R$${(intel.opportunity.revenuePotentialMRR / 1000).toFixed(0)}K`} title='Potencial MRR'
              subtitle={`${intel.overview.categoryLabel} em ${intel.overview.city}`}
              avatarColor='success' avatarIcon='ri-money-dollar-circle-line'
              trendNumber={String(intel.opportunity.revenuePotentialMRR)} trend='positive' />
          </Grid>
          <Grid size={{ xs: 6, sm: 2.4 }}>
            <CardStatVertical stats={`${intel.overview.hasWebsitePct}%`} title='Com Website'
              subtitle={`${intel.overview.claimedPct}% reivindicado · ${intel.overview.avgRating}★`}
              avatarColor='info' avatarIcon='ri-global-line'
              trendNumber={String(intel.overview.hasWebsitePct)} trend='positive' />
          </Grid>

          {/* Schwartz Distribution */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Card>
              <CardContent>
                <Typography variant='h6' gutterBottom>🧠 Distribuicao Schwartz · {intel.overview.categoryLabel}</Typography>
                <Box sx={{ mt: 2 }}>
                  {intel.overview.schwartzDistribution.map(s => (
                    <Box key={s.level} sx={{ mb: 1.5 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography variant='body2' fontWeight={600}>{s.label}</Typography>
                        <Typography variant='body2'>{s.count} negocios · {s.pct}%</Typography>
                      </Box>
                      <LinearProgress variant='determinate' value={s.pct}
                        sx={{ height: 6, borderRadius: 3, bgcolor: `${schwartzColors[s.level - 1]}22`, '& .MuiLinearProgress-bar': { bgcolor: schwartzColors[s.level - 1] } }} />
                    </Box>
                  ))}
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Content Maturity Distribution */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Card>
              <CardContent>
                <Typography variant='h6' gutterBottom>📝 Maturidade de Conteudo · {intel.overview.categoryLabel}</Typography>
                <Box sx={{ mt: 2 }}>
                  {intel.overview.contentMaturity.map(m => (
                    <Box key={m.level} sx={{ mb: 1.5 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography variant='body2' fontWeight={600}>{m.label}</Typography>
                        <Typography variant='body2'>{m.count} negocios · {m.pct}%</Typography>
                      </Box>
                      <LinearProgress variant='determinate' value={m.pct}
                        sx={{ height: 6, borderRadius: 3, bgcolor: `${maturityColors[m.level]}22`, '& .MuiLinearProgress-bar': { bgcolor: maturityColors[m.level] } }} />
                    </Box>
                  ))}
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* TOP 10 Market Gaps */}
          <Grid size={{ xs: 12, md: 7 }}>
            <Card>
              <CardContent>
                <Typography variant='h6' gutterBottom>🔬 TOP Gaps do Mercado · {intel.overview.categoryLabel}</Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 2 }}>
                  {intel.gaps.slice(0, 8).map(g => (
                    <Box key={g.signal} sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 1.5, borderRadius: 1, bgcolor: 'var(--pastel-sky)' }}>
                      <Chip label={`#${g.rank}`} size='small' color='primary' variant='tonal' sx={{ fontWeight: 700, minWidth: 32 }} />
                      <Box sx={{ flex: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                          <Typography variant='body2' fontWeight={700}>{g.signalLabel}</Typography>
                          <Chip label={g.severity.toUpperCase()} size='small' color={severityColors[g.severity]} variant='tonal' sx={{ fontSize: '0.6rem', height: 18 }} />
                        </Box>
                        <Typography variant='caption' color='text.secondary'>{g.opportunity}</Typography>
                      </Box>
                      <Box sx={{ textAlign: 'right', minWidth: 80 }}>
                        <Typography variant='h6' fontWeight={800} color={g.severity === 'critico' ? 'error.main' : 'warning.main'}>{g.affectedPct}%</Typography>
                        <Typography variant='caption' color='text.secondary'>{g.affectedCount} negocios</Typography>
                      </Box>
                    </Box>
                  ))}
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Opportunity + Density */}
          <Grid size={{ xs: 12, md: 5 }}>
            <Card sx={{ mb: 3, bgcolor: 'var(--pastel-mint)' }}>
              <CardContent>
                <Typography variant='h6' gutterBottom>💰 Oportunidade de Mercado</Typography>
                <Typography variant='h3' fontWeight={800} color='success.main'>R${(intel.opportunity.revenuePotentialMRR / 1000).toFixed(0)}K</Typography>
                <Typography variant='body2' sx={{ mt: 1 }}>
                  MRR potencial em {intel.overview.categoryLabel} ({intel.overview.city}).
                  Base: {intel.opportunity.totalAddressableMarket.toLocaleString('pt-BR')} negocios ×
                  5% penetracao × ticket R${intel.opportunity.avgTicketEstimate}.
                </Typography>
                <Typography variant='caption' color='text.secondary' sx={{ mt: 1, display: 'block' }}>
                  {intel.opportunity.totalAddressableMarket} negocios × 5% = {Math.round(intel.opportunity.totalAddressableMarket * 0.05)} clientes
                  × {intel.opportunity.avgTicketEstimate >= 500 ? 'R$497/mes' : 'R$197/mes'}.
                </Typography>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <Typography variant='h6' gutterBottom>🗺️ Densidade Competitiva</Typography>
                <Box sx={{ mb: 2 }}>
                  <Typography variant='caption' color='text.secondary'>{intel.density.totalCompetitors} concorrentes em {intel.density.areaKm2} km²</Typography>
                  <Box sx={{ mt: 1 }}>
                    <Chip label={`${intel.density.densityPerKm2} negocios/km²`} size='medium' variant='tonal'
                      color={intel.density.saturation === 'saturada' ? 'error' : intel.density.saturation === 'alta' ? 'warning' : intel.density.saturation === 'media' ? 'info' : 'success'} />
                    <Chip label={`Rating medio: ${intel.density.avgRating}★`} size='medium' variant='outlined' sx={{ ml: 1 }} />
                  </Box>
                </Box>
                <Typography variant='caption' color='text.secondary'>
                  {intel.density.saturation === 'saturada'
                    ? '⚠️ Mercado saturado — diferencie-se com SEO local e site profissional.'
                    : intel.density.saturation === 'alta'
                    ? 'Concorrencia alta — destaque-se com Google Meu Negocio otimizado.'
                    : '🟢 Boa oportunidade — menos concorrencia que a media.'}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          {/* Recommended Actions */}
          <Grid size={{ xs: 12 }}>
            <Card>
              <CardContent>
                <Typography variant='h6' gutterBottom>🎯 Acoes Recomendadas para o Nicho</Typography>
                <Grid container spacing={2} sx={{ mt: 1 }}>
                  {intel.recommendedActions.map((a, i) => (
                    <Grid key={i} size={{ xs: 12, sm: 6, md: 4 }}>
                      <Box sx={{ p: 2, borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
                        <Chip label={a.impact} size='small' color={a.impact.includes('Crítico') ? 'error' : 'warning'} variant='tonal' sx={{ mb: 1 }} />
                        <Typography variant='body2' fontWeight={600}>{a.action}</Typography>
                        <LinearProgress variant='determinate' value={a.targetPct} sx={{ mt: 1, height: 4, borderRadius: 2 }} />
                        <Typography variant='caption' color='text.secondary'>Meta: {a.targetPct}% do mercado</Typography>
                      </Box>
                    </Grid>
                  ))}
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        </>
      )}
    </Grid>
  )
}

export default MarketPage
