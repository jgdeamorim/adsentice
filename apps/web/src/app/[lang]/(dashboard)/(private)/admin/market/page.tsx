
// adsentice · Admin / Market Intelligence — ADR-0009
// Agrega dados existentes por categoria × região (ZERO novas APIs)
import { Suspense } from 'react'
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
import { getAdminClient } from '@/lib/supabase-admin'
import { nicheIntelligence, listMarketCategories, listMarketCities, marketOverview } from '@/lib/market-intel'
import MarketCoverageMapWrapper from '@/components/MarketCoverageMapWrapper'

export const dynamic = 'force-dynamic'

// ── Shell (sync — SWC-safe) ──

export default async function MarketPage(props: { params: Promise<{ lang: string }>; searchParams: Promise<{ category?: string; city?: string }> }) {
  const { lang } = await props.params
  const user = await getSessionUser()
  if (user?.role !== 'admin') redirect(`/${lang}/app`)

  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12 }}>
        <Typography variant='h4'>📊 Market Intelligence</Typography>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap', mt: 1 }}>
          <Typography variant='body2' color='text.secondary'>
            Inteligencia de nicho por categoria × regiao · Dados 100% do Supabase (ZERO novas APIs)
          </Typography>
          <Chip label='ADR-0009' size='small' color='primary' variant='tonal' />
          <Chip label='v0.7' size='small' color='success' variant='tonal' />
        </Box>
      </Grid>
      <Suspense fallback={<Grid size={{ xs: 12 }}><LinearProgress /></Grid>}>
        <MarketContent lang={lang} searchParams={props.searchParams} />
      </Suspense>
    </Grid>
  )
}

// ── Inner async component (context7 pattern) ──

async function MarketContent({ lang, searchParams }: { lang: string; searchParams: Promise<{ category?: string; city?: string }> }) {
  const sp = await searchParams
  const filterCategory = sp.category || ''
  const filterCity = sp.city || ''

  const [categories, overview, mapPins] = await Promise.all([
    listMarketCategories(),
    marketOverview(),
    getMapPins(),
  ])

  const intel = filterCategory ? await nicheIntelligence(filterCategory, filterCity || null) : null
  const holds = filterCity && filterCategory ? await fetchMarketHolds(filterCategory, filterCity) : []

  const holdGroups = new Map<string, { metric: string; value: number; recorded_at: string; source: string }[]>()
  const latestHolds = new Map<string, { metric: string; value: number; recorded_at: string; source: string }>()
  for (const h of holds) {
    const g = holdGroups.get(h.metric) || []
    g.push(h)
    holdGroups.set(h.metric, g)
    latestHolds.set(h.metric, h)
  }

  const schwartzColors = ["#9e9e9e", "#42a5f5", "#ffa726", "#ef5350", "#d32f2f"]
  const maturityColors = ["#9e9e9e", "#42a5f5", "#ffa726", "#ef5350", "#4caf50"]
  const sev: Record<string, "error" | "warning" | "info" | "success"> = { critico: "error", alto: "warning", medio: "info", baixo: "success" }

  return (
    <>
      {/* ═══ MAPA ═══ */}
      <Grid size={{ xs: 12 }}>
        <Card>
          <CardContent sx={{ pb: 1 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant='subtitle2' fontWeight={600}>
                🗺️ Cobertura · {mapPins.length} buscas em {new Set(mapPins.map((p: any) => p.city)).size} cidades
              </Typography>
              {filterCategory && (
                <Chip label='Limpar filtro' size='small' clickable component='a' href={`/${lang}/admin/market`} variant='outlined' />
              )}
            </Box>
            <MarketCoverageMapWrapper pins={mapPins} />
            {categories.length > 0 && (
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1.5 }}>
                <Chip label={filterCategory ? '📊 Visão Geral' : '📊 Visão Geral (ativa)'} size='small' clickable
                  color={!filterCategory ? 'primary' : 'default'} variant={!filterCategory ? 'filled' : 'outlined'}
                  component='a' href={`/${lang}/admin/market`} />
                {categories.slice(0, 10).map((c: any) => (
                  <Chip key={c.category} label={`${c.label} (${c.count})`} size='small' clickable
                    color={filterCategory === c.category ? 'primary' : 'default'}
                    variant={filterCategory === c.category ? 'filled' : 'outlined'}
                    component='a' href={`/${lang}/admin/market?category=${c.category}`} />
                ))}
              </Box>
            )}
          </CardContent>
        </Card>
      </Grid>

      {!overview ? (
        <Grid size={{ xs: 12 }}>
          <Alert severity='info'>Execute buscas no <strong>Discovery Engine</strong> primeiro. Va em <a href={`/${lang}/admin/discovery`}>Discovery</a>.</Alert>
        </Grid>
      ) : (
        <>
          {/* Top KPIs */}
          <Grid size={{ xs: 6, sm: 2.4 }}>
            <CardStatVertical stats={overview.totalBusinesses.toLocaleString('pt-BR')} title='Total no Mercado'
              subtitle={filterCategory ? `${overview.categoryLabel}` : `${(overview as any).categoryCount} categorias · ${(overview as any).cityCount} cidades`}
              avatarColor='primary' avatarIcon='ri-store-2-line' trendNumber={String(overview.totalBusinesses)} trend='positive' />
          </Grid>
          <Grid size={{ xs: 6, sm: 2.4 }}>
            <CardStatVertical stats={`${overview.avgScore}/100`} title='Score Medio'
              subtitle={`${overview.enrichedBusinesses} enriquecidos`} avatarColor='warning' avatarIcon='ri-bar-chart-line'
              trendNumber={String(overview.avgScore)} trend='positive' />
          </Grid>
          <Grid size={{ xs: 6, sm: 2.4 }}>
            <CardStatVertical stats={`${overview.claimedPct}%`} title='Reivindicados'
              subtitle={`${overview.hasWebsitePct}% com website`} avatarColor='info' avatarIcon='ri-shield-check-line'
              trendNumber={String(overview.claimedPct)} trend='positive' />
          </Grid>
          <Grid size={{ xs: 6, sm: 2.4 }}>
            <CardStatVertical stats={`${overview.avgRating}★`} title='Rating Medio'
              subtitle={`Score medio ${overview.avgScore}/100`} avatarColor='success' avatarIcon='ri-star-line'
              trendNumber={String(overview.avgRating)} trend='positive' />
          </Grid>
          <Grid size={{ xs: 6, sm: 2.4 }}>
            <CardStatVertical stats={`${overview.hasWebsitePct}%`} title='Com Website'
              subtitle={`${overview.hasAnalyticsPct}% com analytics`} avatarColor='error' avatarIcon='ri-global-line'
              trendNumber={String(overview.hasWebsitePct)} trend='positive' />
          </Grid>

          {/* Schwartz */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Card><CardContent>
              <Typography variant='h6' gutterBottom>🧠 Schwartz · {overview.categoryLabel}</Typography>
              <Box sx={{ mt: 2 }}>
                {overview.schwartzDistribution.map((s: any) => (
                  <Box key={s.level} sx={{ mb: 1.5 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography variant='body2' fontWeight={600}>{s.label}</Typography>
                      <Typography variant='body2'>{s.count} · {s.pct}%</Typography>
                    </Box>
                    <LinearProgress variant='determinate' value={s.pct}
                      sx={{ height: 6, borderRadius: 3, bgcolor: `${schwartzColors[s.level - 1]}22`, '& .MuiLinearProgress-bar': { bgcolor: schwartzColors[s.level - 1] } }} />
                  </Box>
                ))}
              </Box>
            </CardContent></Card>
          </Grid>

          {/* Content Maturity */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Card><CardContent>
              <Typography variant='h6' gutterBottom>📝 Maturidade · {overview.categoryLabel}</Typography>
              {overview.contentMaturity.every((m: any) => m.count === 0) ? (
                <Alert severity='info' sx={{ mt: 1 }}>
                  Nenhum lead tem L2 enrichment.{' '}
                  <a href={`/${lang}/admin/discovery`} style={{ fontWeight: 600 }}>Execute o Discovery</a>.
                </Alert>
              ) : (
                <Box sx={{ mt: 2 }}>
                  {overview.contentMaturity.map((m: any) => (
                    <Box key={m.level} sx={{ mb: 1.5 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography variant='body2' fontWeight={600}>{m.label}</Typography>
                        <Typography variant='body2'>{m.count} · {m.pct}%</Typography>
                      </Box>
                      <LinearProgress variant='determinate' value={m.pct}
                        sx={{ height: 6, borderRadius: 3, bgcolor: `${maturityColors[m.level]}22`, '& .MuiLinearProgress-bar': { bgcolor: maturityColors[m.level] } }} />
                    </Box>
                  ))}
                </Box>
              )}
            </CardContent></Card>
          </Grid>

          {/* TOP Gaps + Opportunity (drill-down com intel) */}
          {intel && (
            <>
              <Grid size={{ xs: 12, md: 7 }}>
                <Card><CardContent>
                  <Typography variant='h6' gutterBottom>🔬 TOP Gaps · {intel.overview.categoryLabel}</Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 2 }}>
                    {intel.gaps.slice(0, 8).map((g: any) => (
                      <Box key={g.signal} sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 1.5, borderRadius: 1, bgcolor: 'var(--pastel-sky)' }}>
                        <Chip label={`#${g.rank}`} size='small' color='primary' variant='tonal' sx={{ fontWeight: 700, minWidth: 32 }} />
                        <Box sx={{ flex: 1 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                            <Typography variant='body2' fontWeight={700}>{g.signalLabel}</Typography>
                            <Chip label={g.severity.toUpperCase()} size='small' color={sev[g.severity]} variant='tonal' sx={{ fontSize: '0.6rem', height: 18 }} />
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
                </CardContent></Card>
              </Grid>

              <Grid size={{ xs: 12, md: 5 }}>
                <Card sx={{ mb: 3, bgcolor: 'var(--pastel-mint)' }}>
                  <CardContent>
                    <Typography variant='h6' gutterBottom>💰 Oportunidade</Typography>
                    <Typography variant='h3' fontWeight={800} color='success.main'>R${(intel.opportunity.revenuePotentialMRR / 1000).toFixed(0)}K</Typography>
                    <Typography variant='body2' sx={{ mt: 1 }}>
                      MRR potencial em {intel.overview.categoryLabel} ({intel.overview.city}).
                      Base: {intel.opportunity.totalAddressableMarket.toLocaleString('pt-BR')} negocios ×
                      5% penetracao × ticket R${intel.opportunity.avgTicketEstimate}.
                    </Typography>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent>
                    <Typography variant='h6' gutterBottom>🗺️ Densidade</Typography>
                    <Typography variant='caption' color='text.secondary'>{intel.density.totalCompetitors} concorrentes em {intel.density.areaKm2} km²</Typography>
                    <Chip label={`${intel.density.densityPerKm2}/km²`} size='medium' variant='tonal'
                      color={intel.density.saturation === 'saturada' ? 'error' : intel.density.saturation === 'alta' ? 'warning' : 'info'} />
                  </CardContent>
                </Card>
              </Grid>

              <Grid size={{ xs: 12 }}>
                <Card><CardContent>
                  <Typography variant='h6' gutterBottom>🎯 Acoes Recomendadas</Typography>
                  <Grid container spacing={2} sx={{ mt: 1 }}>
                    {intel.recommendedActions.map((a: any, i: number) => (
                      <Grid key={i} size={{ xs: 12, sm: 6, md: 4 }}>
                        <Box sx={{ p: 2, borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
                          <Chip label={a.impact} size='small' color={a.impact.includes('Crítico') ? 'error' : 'warning'} variant='tonal' sx={{ mb: 1 }} />
                          <Typography variant='body2' fontWeight={600}>{a.action}</Typography>
                          <LinearProgress variant='determinate' value={a.targetPct} sx={{ mt: 1, height: 4, borderRadius: 2 }} />
                          <Typography variant='caption' color='text.secondary'>Meta: {a.targetPct}%</Typography>
                        </Box>
                      </Grid>
                    ))}
                  </Grid>
                </CardContent></Card>
              </Grid>
            </>
          )}
        </>
      )}

      {/* Market Holds */}
      {holds.length > 0 && (
        <Grid size={{ xs: 12 }}>
          <Card><CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Box>
                <Typography variant='h6'>⏱️ Market Holds</Typography>
                <Typography variant='caption' color='text.secondary'>Snapshot a cada Discovery. Append-only.</Typography>
              </Box>
              <Chip label={`${holds.length} pontos`} size='small' color='primary' variant='tonal' />
            </Box>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, md: 6 }}>
                <Typography variant='subtitle2' gutterBottom>📊 Métricas</Typography>
                {['avg_score', 'total_businesses', 'claimed_pct'].map(metric => {
                  const h = latestHolds.get(metric)
                  return (
                    <Box key={metric} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5 }}>
                      <Typography variant='caption' sx={{ fontFamily: 'monospace' }}>{metric}</Typography>
                      <Typography variant='body2' fontWeight={700}>
                        {h ? (metric === 'claimed_pct' ? `${h.value.toFixed(1)}%` : metric === 'total_businesses' ? h.value.toLocaleString('pt-BR') : h.value.toFixed(1)) : '—'}
                      </Typography>
                    </Box>
                  )
                })}
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <Typography variant='subtitle2' gutterBottom>📈 Tendência</Typography>
                <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 0.5, height: 80 }}>
                  {(holdGroups.get('avg_score') || []).slice(-20).map((h, i) => {
                    const pct = Math.max(2, ((h.value || 0) / 100) * 100)
                    const color = h.value > 60 ? '#4caf50' : h.value > 40 ? '#ffa726' : '#ef5350'
                    return <Box key={i} sx={{ flex: 1, height: `${pct}px`, bgcolor: color, borderRadius: '2px 2px 0 0', minWidth: 8, opacity: 0.8 }} />
                  })}
                </Box>
              </Grid>
            </Grid>
          </CardContent></Card>
        </Grid>
      )}

      {holds.length === 0 && (
        <Grid size={{ xs: 12 }}>
          <Alert severity='info'>
            ⏱️ <strong>Market Holds vazio.</strong>{' '}
            <a href={`/${lang}/admin/discovery`} style={{ fontWeight: 600 }}>Execute uma Discovery</a>.
          </Alert>
        </Grid>
      )}
    </>
  )
}

// ── Helpers ──

async function getMapPins() {
  try {
    const supabase = getAdminClient()
    const { data } = await supabase
      .from("discovery_searches")
      .select("id,categories,lat,lng,radius_km,total_count,avg_score")
      .not("total_count", "eq", 0)
      .order("created_at", { ascending: false })
      .limit(50)
    if (!data) return []
    return data.map((s: any) => {
      const lat = parseFloat(s.lat)
      return {
        id: s.id, lat, lng: parseFloat(s.lng), radiusKm: s.radius_km || 10,
        categories: s.categories || [], city: Math.abs(lat + 22.9) < 1 ? 'RJ' : 'BR',
        totalCount: s.total_count || 0, avgScore: s.avg_score || 0,
      }
    })
  } catch (e: any) { return [] }
}

async function fetchMarketHolds(category: string, city: string, limit = 20) {
  const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tdigauruusdhnpvppixb.supabase.co'}/rest/v1/market_holds`
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  try {
    const params = new URLSearchParams({ category: `eq.${category}`, city: `eq.${city}`, order: 'recorded_at.desc', limit: String(limit), select: 'metric,value,recorded_at,source' })
    const res = await fetch(`${url}?${params}`, { headers: { apikey: key, Authorization: `Bearer ${key}` }, signal: AbortSignal.timeout(8000) })
    if (!res.ok) return []
    const data = (await res.json()) as { metric: string; value: number; recorded_at: string; source: string }[]
    return data.reverse()
  } catch { return [] }
}
