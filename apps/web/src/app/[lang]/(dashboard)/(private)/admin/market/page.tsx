
export const dynamic = 'force-dynamic'

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
import Divider from '@mui/material/Divider'
import Alert from '@mui/material/Alert'

import CardStatVertical from '@components/card-statistics/Vertical'
import { getSessionUser } from '@/libs/supabase/server'
import { nicheIntelligence, listMarketCategories } from '@/lib/market-intel'

// ── Market Holds (rsxt-t0 time-series) ──

interface MarketHoldRow {
  metric: string; value: number; recorded_at: string; source: string
}

async function fetchMarketHolds(category: string, city: string, limit = 20): Promise<MarketHoldRow[]> {
  const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tdigauruusdhnpvppixb.supabase.co'}/rest/v1/market_holds`
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  try {
    const params = new URLSearchParams({ category: `eq.${category}`, city: `eq.${city}`, order: 'recorded_at.desc', limit: String(limit), select: 'metric,value,recorded_at,source' })
    const res = await fetch(`${url}?${params}`, { headers: { apikey: key, Authorization: `Bearer ${key}` }, signal: AbortSignal.timeout(8000) })
    if (!res.ok) return []
    const data = (await res.json()) as MarketHoldRow[]
    return data.reverse() // chronological
  } catch { return [] }
}

const MarketPage = async ({ params, searchParams }: {
  params: Promise<{ lang: string }>
  searchParams: Promise<{ category?: string; city?: string }>
}) => {
  const { lang } = await params
  const sp = await searchParams
  const user = await getSessionUser()
  if (user?.role !== 'admin') redirect(`/${lang}/app`)

  const categories = await listMarketCategories()
  const filterCategory = sp.category || (categories.length > 0 ? categories[0].category : '')
  const filterCity = sp.city || ''
  const intel = await nicheIntelligence(filterCategory, filterCity || null)
  const holds = await fetchMarketHolds(filterCategory, filterCity || 'Rio de Janeiro')

  // Agrupa holds por métrica para mini time-series
  const holdGroups = new Map<string, MarketHoldRow[]>()
  for (const h of holds) {
    const g = holdGroups.get(h.metric) || []
    g.push(h)
    holdGroups.set(h.metric, g)
  }
  const latestHolds = new Map<string, MarketHoldRow>()
  for (const h of holds) latestHolds.set(h.metric, h)

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

      {/* ═══ Market Holds · Time-Series (rsxt-t0) ═══ */}
      {holds.length > 0 && (
        <Grid size={{ xs: 12 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Box>
                  <Typography variant='h6'>⏱️ Market Holds · Time-Series</Typography>
                  <Typography variant='caption' color='text.secondary'>
                    Padrão rsxt-t0 — cada busca Discovery grava snapshot de mercado. Append-only, imutável.
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Chip label={`${holds.length} pontos`} size='small' color='primary' variant='tonal' />
                  <Chip label={filterCity || 'Rio de Janeiro'} size='small' variant='outlined' />
                </Box>
              </Box>

              <Grid container spacing={2}>
                {/* Latest metrics */}
                <Grid size={{ xs: 12, md: 6 }}>
                  <Typography variant='subtitle2' gutterBottom>📊 Últimas métricas</Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {['avg_score', 'total_businesses', 'claimed_pct'].map(metric => {
                      const h = latestHolds.get(metric)
                      return (
                        <Box key={metric} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 0.5 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant='caption' sx={{ fontFamily: 'monospace', fontSize: '0.7rem' }}>{metric}</Typography>
                            {h && <Chip label={h.source} size='small' variant='outlined' sx={{ fontSize: '0.55rem' }} />}
                          </Box>
                          <Box sx={{ textAlign: 'right' }}>
                            <Typography variant='body2' fontWeight={700}>
                              {h ? (metric === 'claimed_pct' ? `${h.value.toFixed(1)}%` : metric === 'total_businesses' ? h.value.toLocaleString('pt-BR') : h.value.toFixed(1)) : '—'}
                            </Typography>
                            {h && <Typography variant='caption' color='text.secondary' sx={{ fontSize: '0.6rem' }}>{h.recorded_at?.slice(0, 16).replace('T', ' ')}</Typography>}
                          </Box>
                        </Box>
                      )
                    })}
                  </Box>
                </Grid>

                {/* Mini time-series (sparkline) */}
                <Grid size={{ xs: 12, md: 6 }}>
                  <Typography variant='subtitle2' gutterBottom>📈 Tendência (avg_score)</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 0.5, height: 80, mt: 1 }}>
                    {(holdGroups.get('avg_score') || []).slice(-20).map((h, i) => {
                      const pct = Math.max(2, ((h.value || 0) / 100) * 100)
                      const color = i < 3 ? '#9e9e9e' : h.value > 60 ? '#4caf50' : h.value > 40 ? '#ffa726' : '#ef5350'
                      return (
                        <Box key={i} sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                          <Typography variant='caption' sx={{ fontSize: '0.5rem', color: 'text.secondary' }}>{h.value.toFixed(0)}</Typography>
                          <Box sx={{ width: '100%', height: `${pct}px`, bgcolor: color, borderRadius: '2px 2px 0 0', minWidth: 8, opacity: 0.8 }} />
                        </Box>
                      )
                    })}
                  </Box>
                  <Typography variant='caption' color='text.secondary' sx={{ mt: 0.5, display: 'block', fontSize: '0.6rem' }}>
                    Barras: score médio no tempo. Verde {'>'} 60, laranja {'>'} 40, vermelho {'<'} 40.
                  </Typography>
                </Grid>
              </Grid>

              <Divider sx={{ my: 2 }} />
              <Typography variant='caption' color='text.secondary'>
                💡 <strong>Market Holds</strong> acumulam inteligência de mercado a cada busca Discovery.
                Com 3+ meses de dados, é possível detectar tendências, sazonalidade e oportunidades
                antes dos concorrentes. Padrão absorvido do EVO-API rsxt-t0 e capital.RS.
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      )}

      {/* No holds yet */}
      {holds.length === 0 && (
        <Grid size={{ xs: 12 }}>
          <Alert severity='info'>
            <Typography variant='body2'>
              ⏱️ <strong>Market Holds ainda vazio.</strong> Execute uma busca no{' '}
              <a href={`/${lang}/admin/discovery`} style={{ fontWeight: 600 }}>Discovery Engine</a>{' '}
              para começar a acumular séries temporais de mercado. Cada busca grava um snapshot
              de avg_score, total_businesses e claimed_pct.
            </Typography>
          </Alert>
        </Grid>
      )}
    </Grid>
  )
}

export default MarketPage
