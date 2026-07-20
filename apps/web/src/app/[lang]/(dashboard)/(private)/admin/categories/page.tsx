
// adsentice · Admin / Categorias — dados REAIS do Supabase + Category Intelligence Engine
// 29 categorias SMB Brasil · 7 segmentos · getCategoryIntelligence() (ADR-0050)
import { redirect } from 'next/navigation'
import Link from 'next/link'

import Grid from '@mui/material/Grid2'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import Chip from '@mui/material/Chip'
import Box from '@mui/material/Box'
import LinearProgress from '@mui/material/LinearProgress'
import Button from '@mui/material/Button'
import Alert from '@mui/material/Alert'

import CardStatVertical from '@components/card-statistics/Vertical'
import { getSessionUser } from '@/libs/supabase/server'
import { getAdminClient } from '@/lib/supabase-admin'
import { getPreflightMarketIntel } from '@/lib/market-intel'
import { getCategoryIntelligence } from '@/lib/category-intel'
import type { CategoryIntelligence } from '@/lib/category-intel'

export const dynamic = 'force-dynamic'

const SEGMENT_COLORS: Record<string, string> = {
  'Saúde': '#16a34a', 'Beleza': '#d97706', 'Serviços Profissionais': '#2563eb',
  'Alimentação': '#ef4444', 'Comércio Local': '#8b5cf6', 'Educação': '#ec4899',
  'Hospitalidade': '#0891b2', 'servicos': '#2563eb', 'saude': '#16a34a',
  'beleza': '#d97706', 'alimentacao': '#ef4444', 'comercio': '#8b5cf6',
  'educacao': '#ec4899', 'hospitalidade': '#0891b2',
}

function catBadge(ci: CategoryIntelligence) {
  if (ci.coverage.totalDiscovered === 0) return { label: 'Não prospectada', color: 'default' as const, icon: '🔴' }
  if (ci.opportunity.score >= 50) return { label: `${ci.opportunity.score}pts`, color: 'success' as const, icon: '🟢' }
  if (ci.opportunity.score >= 25) return { label: `${ci.opportunity.score}pts`, color: 'warning' as const, icon: '🟡' }
  return { label: `${ci.opportunity.score}pts`, color: 'error' as const, icon: '🟠' }
}

const CategoriesPage = async ({ params }: { params: Promise<{ lang: string }> }) => {
  const { lang } = await params
  const user = await getSessionUser()

  if (user?.role !== 'admin') redirect(`/${lang}/app`)

  // ═══ Dados DINÂMICOS: Category Intelligence Engine (ADR-0050) ═══
  let catIntel: CategoryIntelligence[] = []
  let catIntelError = ''
  try {
    catIntel = await getCategoryIntelligence()
  } catch (e: unknown) {
    catIntelError = (e as Error).message?.slice(0, 120) || 'unknown'
  }

  // ═══ Dados do Supabase (KPIs + enrichment) ═══
  let enrichmentStats = { l0: 0, l1: 0, l4: 0, l5: 0 }
  try {
    const supabase = getAdminClient()
    const { data: listings } = await supabase.from("discovery_listings")
      .select("place_id,enrichment_level")
      .limit(10000)

    if (listings?.length) {
      const deduped = new Map<string, number>()
      for (const r of listings as any[]) {
        if (!r.place_id) continue
        const existing = deduped.get(r.place_id)
        if (!existing || (r.enrichment_level || 0) > existing) {
          deduped.set(r.place_id, r.enrichment_level || 0)
        }
      }
      enrichmentStats.l0 = deduped.size
      enrichmentStats.l1 = [...deduped.values()].filter(v => v >= 1).length

      const { count: l4Count } = await supabase.from("discovery_listings")
        .select("place_id", { count: "exact", head: true })
        .not("l4_ibge_populacao", "is", null)
      enrichmentStats.l4 = l4Count || 0

      const { count: l5Count } = await supabase.from("discovery_listings")
        .select("place_id", { count: "exact", head: true })
        .eq("cnpj_enriched", true)
      enrichmentStats.l5 = l5Count || 0
    }
  } catch { /* supabase offline */ }

  // ═══ Pre-flight market intel ═══
  let pfSummary: { stateCount: number; totalLeads: number; states: string[] } | null = null
  try {
    const pfIntel = await getPreflightMarketIntel()
    if (pfIntel.length) {
      pfSummary = {
        stateCount: pfIntel.length,
        totalLeads: pfIntel.reduce((s, pf) => s + pf.totalLeads, 0),
        states: pfIntel.map(pf => pf.stateUf).filter(Boolean),
      }
    }
  } catch { /* no preflight */ }

  const hasIntel = catIntel.length > 0
  const totalDiscovered = hasIntel ? catIntel.reduce((s, ci) => s + ci.coverage.totalDiscovered, 0) : 0
  const totalUnique = hasIntel ? catIntel.reduce((s, ci) => s + ci.coverage.uniquePlaceIds, 0) : 0
  const avgOppScore = hasIntel
    ? Math.round(catIntel.reduce((s, ci) => s + ci.opportunity.score, 0) / catIntel.length)
    : 0
  const withData = catIntel.filter(ci => ci.coverage.totalDiscovered > 0).length
  const withoutData = catIntel.filter(ci => ci.coverage.totalDiscovered === 0).length

  // Segment aggregation
  const segments = Object.entries(
    catIntel.reduce((acc, ci) => {
      acc[ci.segment] = (acc[ci.segment] || 0) + 1
      return acc
    }, {} as Record<string, number>)
  ).sort(([, a], [, b]) => b - a)

  return (
    <Grid container spacing={6}>
      {/* ── Header ── */}
      <Grid size={{ xs: 12 }}>
        <Typography variant='h4'>📁 Categorias · Category Intelligence</Typography>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap', mt: 1 }}>
          <Typography variant='body2' color='text.secondary'>
            29 categorias SMB Brasil · 7 segmentos · {totalDiscovered.toLocaleString('pt-BR')} leads descobertos
          </Typography>
          {hasIntel && <Chip label='Category Intel API' size='small' color='success' variant='tonal' />}
          {catIntelError && <Chip label={`Erro: ${catIntelError}`} size='small' color='error' variant='tonal' />}
          {!hasIntel && !catIntelError && <Chip label='Execute 1ª descoberta' size='small' color='default' variant='tonal' />}
        </Box>
      </Grid>

      {/* ── Top KPI Cards ── */}
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <CardStatVertical stats="29" title='Categorias SMB'
          subtitle='7 segmentos de mercado' avatarColor='primary' avatarIcon='ri-store-2-line'
          trendNumber="29" trend='positive' />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <CardStatVertical stats={totalDiscovered.toLocaleString('pt-BR')} title='Leads Descobertos'
          subtitle={`${totalUnique.toLocaleString('pt-BR')} unique place_ids`} avatarColor='success' avatarIcon='ri-building-line'
          trendNumber={String(totalDiscovered)} trend='positive' />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <CardStatVertical stats={`${avgOppScore}/100`} title='Score Médio Oportunidade'
          subtitle={`${withData}/29 categorias com dados`} avatarColor='warning'
          avatarIcon='ri-radar-line' trendNumber={String(avgOppScore)} trend='positive' />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <CardStatVertical stats={String(withoutData)} title='Não Prospectadas'
          subtitle='Categorias com 0 leads' avatarColor='error' avatarIcon='ri-alert-line'
          trendNumber={String(withoutData)} trend='negative' />
      </Grid>

      {/* ── Enrichment Pipeline ── */}
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <CardStatVertical stats={`${enrichmentStats.l0}`} title='L0 · Descobertos'
          subtitle='Total de leads encontrados no GMB' avatarColor='success' avatarIcon='ri-radar-line'
          trendNumber={String(enrichmentStats.l0)} trend='positive' />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <CardStatVertical stats={`${enrichmentStats.l1}`} title='L1 · Perfilados'
          subtitle={`${enrichmentStats.l0 > 0 ? Math.round((enrichmentStats.l1 / enrichmentStats.l0) * 100) : 0}% — GMB completo`} avatarColor='info' avatarIcon='ri-profile-line'
          trendNumber={String(enrichmentStats.l1)} trend='positive' />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <CardStatVertical stats={`${enrichmentStats.l4}`} title='L4 · IBGE Context'
          subtitle={`${enrichmentStats.l0 > 0 ? Math.round((enrichmentStats.l4 / Math.max(enrichmentStats.l0, 1)) * 100) : 0}% — pop+PIB+densidade`} avatarColor='warning' avatarIcon='ri-government-line'
          trendNumber={String(enrichmentStats.l4)} trend='positive' />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <CardStatVertical stats={`${enrichmentStats.l5}`} title='L5 · CNPJ Validados'
          subtitle={`${enrichmentStats.l0 > 0 ? Math.round((enrichmentStats.l5 / Math.max(enrichmentStats.l0, 1)) * 100) : 0}% — CNAE+regime+sócios`} avatarColor='error' avatarIcon='ri-file-search-line'
          trendNumber={String(enrichmentStats.l5)} trend='positive' />
      </Grid>

      {/* ── Pre-flight KPI ── */}
      {pfSummary && (
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <CardStatVertical
            stats={pfSummary.totalLeads.toLocaleString('pt-BR')}
            title='🔬 Pre-flight Mercado'
            subtitle={`${pfSummary.stateCount} estado(s): ${pfSummary.states.join(', ')}`}
            avatarColor='secondary' avatarIcon='ri-radar-line'
            trendNumber={String(pfSummary.stateCount)} trend='positive' />
        </Grid>
      )}

      {/* ── Segment Distribution ── */}
      <Grid size={{ xs: 12 }}>
        <Card>
          <CardContent>
            <Typography variant='h6' gutterBottom>📊 Segmentos de Mercado</Typography>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              {segments.map(([seg, count]) => (
                <Box key={seg} sx={{ flex: 1, minWidth: 120, textAlign: 'center' }}>
                  <Typography variant='h5' fontWeight={800} sx={{ color: SEGMENT_COLORS[seg] || '#666' }}>
                    {count}
                  </Typography>
                  <Typography variant='caption' color='text.secondary'>{seg}</Typography>
                  <LinearProgress variant='determinate' value={Math.round((count / 29) * 100)}
                    sx={{ height: 4, borderRadius: 2, mt: 0.5, bgcolor: `${SEGMENT_COLORS[seg] || '#666'}22`, '& .MuiLinearProgress-bar': { bgcolor: SEGMENT_COLORS[seg] || '#666' } }} />
                </Box>
              ))}
            </Box>
          </CardContent>
        </Card>
      </Grid>

      {/* ═══ CATEGORY CARDS · DINÂMICOS (getCategoryIntelligence) ═══ */}
      <Grid size={{ xs: 12 }}>
        <Typography variant='h6' gutterBottom>
          🏆 Categorias por Oportunidade de Prospecção
          <Chip label={`${withData}/29 com dados · ${withoutData} não prospectadas`} size='small' variant='outlined' sx={{ ml: 2 }} />
        </Typography>
      </Grid>

      {hasIntel ? (
        catIntel.map((ci) => {
          const badge = catBadge(ci)
          const segColor = SEGMENT_COLORS[ci.segment] || '#666'
          const hasData = ci.coverage.totalDiscovered > 0

          return (
            <Grid key={ci.category} size={{ xs: 12, sm: 6, md: 4 }}>
              <Card sx={{
                height: '100%',
                borderLeft: 4,
                borderColor: hasData ? `${badge.color}.main` : 'divider',
                opacity: hasData ? 1 : 0.7,
              }}>
                <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, height: '100%' }}>
                  {/* Header */}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Box>
                      <Typography variant='subtitle1' fontWeight={700}>
                        {ci.label}
                      </Typography>
                      <Typography variant='caption' sx={{ fontFamily: 'monospace', color: 'text.secondary' }}>
                        {ci.category}
                      </Typography>
                    </Box>
                    <Chip label={badge.label} size='small' color={badge.color} variant='tonal' />
                  </Box>

                  {/* Segment + Opportunity */}
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    <Chip label={ci.segment} size='small' variant='outlined'
                      sx={{ borderColor: segColor, color: segColor, fontSize: '0.7rem' }} />
                    {hasData && (
                      <Chip label={`Score ${ci.opportunity.score}/100`} size='small'
                        color={ci.opportunity.score >= 50 ? 'success' : ci.opportunity.score >= 25 ? 'warning' : 'error'}
                        variant='tonal' />
                    )}
                  </Box>

                  {/* Metrics */}
                  {hasData ? (
                    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                      <Box>
                        <Typography variant='h6' fontWeight={700}>{ci.coverage.totalDiscovered}</Typography>
                        <Typography variant='caption' color='text.secondary'>leads</Typography>
                      </Box>
                      <Box>
                        <Typography variant='h6' fontWeight={700}>{ci.coverage.uniquePlaceIds}</Typography>
                        <Typography variant='caption' color='text.secondary'>únicos</Typography>
                      </Box>
                      <Box>
                        <Typography variant='h6' fontWeight={700}>{ci.coverage.coveragePctBR}%</Typography>
                        <Typography variant='caption' color='text.secondary'>cobertura</Typography>
                      </Box>
                      <Box>
                        <Typography variant='h6' fontWeight={700}>{ci.quality.avgScore}</Typography>
                        <Typography variant='caption' color='text.secondary'>score médio</Typography>
                      </Box>
                    </Box>
                  ) : (
                    <Typography variant='body2' color='text.secondary' sx={{ fontStyle: 'italic' }}>
                      Nenhum lead descoberto. Execute o primeiro discovery nesta categoria.
                    </Typography>
                  )}

                  {/* Gaps */}
                  {ci.coverage.gaps.length > 0 && (
                    <Box>
                      <Typography variant='caption' fontWeight={600} color='warning.main'>
                        🔴 {ci.coverage.gaps.length} gaps · {ci.coverage.gaps.slice(0, 2).map(g => g.city).join(', ')}
                      </Typography>
                    </Box>
                  )}

                  {/* Opportunity next action */}
                  {hasData && ci.opportunity.nextAction && (
                    <Typography variant='caption' color='text.secondary' sx={{ lineHeight: 1.3 }}>
                      💡 {ci.opportunity.nextAction.length > 120
                        ? ci.opportunity.nextAction.slice(0, 120) + '...'
                        : ci.opportunity.nextAction}
                    </Typography>
                  )}

                  {/* Marketing Intel */}
                  {ci.marketingIntel.enriched && ci.marketingIntel.topSkills.length > 0 && (
                    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                      {ci.marketingIntel.topSkills.slice(0, 3).map(skill => (
                        <Chip key={skill} label={skill} size='small' variant='outlined'
                          sx={{ fontSize: '0.6rem', height: 18 }} />
                      ))}
                    </Box>
                  )}

                  {/* Actions */}
                  <Box sx={{ display: 'flex', gap: 1, mt: 'auto', pt: 1 }}>
                    <Button
                      size='small'
                      variant='contained'
                      color='primary'
                      href={`/${lang}/admin/discovery?cat=${ci.category}`}
                      startIcon={<i className='ri-radar-line' />}
                    >
                      Prospectar
                    </Button>
                    {hasData && (
                      <Button
                        size='small'
                        variant='outlined'
                        href={`/${lang}/admin/leads?category=${ci.category}`}
                      >
                        Ver Leads
                      </Button>
                    )}
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          )
        })
      ) : (
        <Grid size={{ xs: 12 }}>
          <Alert severity='warning'>
            <Typography variant='body2' fontWeight={600}>
              ⚠️ Category Intelligence não disponível
            </Typography>
            <Typography variant='caption'>
              {catIntelError
                ? `Erro: ${catIntelError}`
                : 'Execute o primeiro discovery para popular dados de categoria.'}
            </Typography>
          </Alert>
        </Grid>
      )}

      {/* ── Data Source ── */}
      <Grid size={{ xs: 12 }}>
        <Alert severity='info' variant='outlined'>
          <Typography variant='body2' fontWeight={600}>
            📊 Fonte: Category Intelligence Engine (ADR-0050) · Supabase · Qdrant · IBGE
          </Typography>
          <Typography variant='caption'>
            Dados em tempo real do Supabase ({totalDiscovered.toLocaleString('pt-BR')} leads em {withData}/29 categorias).
            Categorias com 0 leads precisam de prospecção via Discovery Engine.
            Marketing Intelligence via Qdrant semantic search (832 pts). Custo de dados: $0.
          </Typography>
        </Alert>
      </Grid>
    </Grid>
  )
}

export default CategoriesPage
