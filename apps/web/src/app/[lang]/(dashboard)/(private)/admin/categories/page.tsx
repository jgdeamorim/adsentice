
// adsentice · Admin / Categorias — dados REAIS do Supabase + Redis
import { redirect } from 'next/navigation'

import Grid from '@mui/material/Grid2'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import Chip from '@mui/material/Chip'
import Box from '@mui/material/Box'
import LinearProgress from '@mui/material/LinearProgress'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Paper from '@mui/material/Paper'
import Alert from '@mui/material/Alert'

import CardStatVertical from '@components/card-statistics/Vertical'
import { getSessionUser } from '@/libs/supabase/server'

// ═══ Mapeamento: código GMB → label Discovery ═══
const CATEGORY_LABELS: Record<string, string> = {
  dentist: '🦷 Dentistas',
  medical_aesthetic_clinic: '💉 Clínicas Estéticas',
  medical_clinic: '🏥 Clínicas Médicas',
  restaurant: '🍽️ Restaurantes',
  gym: '🏋️ Academias',
  lawyer: '⚖️ Advogados',
  barber_shop: '💈 Barbearias',
  pharmacy: '💊 Farmácias',
  veterinarian: '🐾 Veterinários',
  real_estate_agency: '🏠 Imobiliárias',
  accountant: '📊 Contadores',
  car_repair: '🔧 Oficinas',
}

interface CategoryRow {
  category: string
  label: string
  total_listings: number
  unique_businesses: number
  avg_score: number
  pain_pct: number
  solution_aware_plus: number
  product_aware_plus: number
  most_aware: number
}

const CategoriesPage = async ({ params }: { params: Promise<{ lang: string }> }) => {
  const { lang } = await params
  const user = await getSessionUser()

  if (user?.role !== 'admin') redirect(`/${lang}/app`)

  // ═══ Fetch real data from discovery-data API ═══
  let categories: CategoryRow[] = []
  let dataSource: 'supabase' | 'redis' | 'none' = 'none'
  let redisStats: { total: number; avgScore: number } | null = null

  try {
    // Internal fetch to our own API route (same process, no network cost)
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const res = await fetch(`${baseUrl}/api/discovery-data`, { cache: 'no-store' })
    const json = await res.json()

    dataSource = json.source

    if (json.source === 'supabase' && json.categories) {
      categories = json.categories.map((c: any) => ({
        category: c.category,
        label: CATEGORY_LABELS[c.category] || c.category,
        total_listings: Number(c.total_listings) || 0,
        unique_businesses: Number(c.unique_businesses) || 0,
        avg_score: Number(c.avg_score) || 0,
        pain_pct: Number(c.pain_pct) || 0,
        solution_aware_plus: Number(c.solution_aware_plus) || 0,
        product_aware_plus: Number(c.product_aware_plus) || 0,
        most_aware: Number(c.most_aware) || 0,
      }))
    } else if (json.source === 'redis' && json.scoreStats) {
      redisStats = json.scoreStats
    }
  } catch {
    dataSource = 'none'
  }

  const hasData = categories.length > 0
  const totalBusinesses = hasData ? categories.reduce((s, c) => s + c.total_listings, 0) : (redisStats?.total ?? 0)
  const totalLeads = hasData ? categories.reduce((s, c) => s + c.solution_aware_plus, 0) : 0

  const avgScore = hasData
    ? Math.round(categories.reduce((s, c) => s + c.avg_score, 0) / categories.length)
    : (redisStats?.avgScore ?? 0)

  const bestCategory = hasData ? categories.reduce((best, c) => c.pain_pct > best.pain_pct ? c : best, categories[0]) : null
  const topScoreCategory = hasData ? categories.reduce((best, c) => c.avg_score > best.avg_score ? c : best, categories[0]) : null

  // Schwartz distribution from Redis (if no Supabase yet)
  const schwartzData = redisStats ? [
    { level: 1, label: 'Unaware', count: 0, color: '#9e9e9e' },
    { level: 2, label: 'Problem Aware', count: 0, color: '#42a5f5' },
    { level: 3, label: 'Solution Aware', count: 0, color: '#ffa726' },
    { level: 4, label: 'Product Aware', count: 0, color: '#ef5350' },
    { level: 5, label: 'Most Aware', count: 0, color: '#d32f2f' },
  ] : null

  return (
    <Grid container spacing={6}>
      {/* ── Header ── */}
      <Grid size={{ xs: 12 }}>
        <Typography variant='h4'>📁 Categorias · Discovery Engine</Typography>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap', mt: 1 }}>
          <Typography variant='body2' color='text.secondary'>
            Dados REAIS agregados por categoria GMB · Score Composto (Pain Criteria v1.2)
          </Typography>
          {dataSource === 'supabase' && <Chip label='Supabase' size='small' color='success' variant='tonal' />}
          {dataSource === 'redis' && <Chip label='Redis (cache 24h)' size='small' color='warning' variant='tonal' />}
          {dataSource === 'none' && <Chip label='Sem dados' size='small' color='default' variant='tonal' />}
        </Box>
      </Grid>

      {/* ── Top KPI Cards ── */}
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <CardStatVertical
          stats={totalBusinesses > 0 ? totalBusinesses.toLocaleString('pt-BR') : '—'}
          title='Negócios Mapeados'
          subtitle={dataSource === 'supabase' ? `${categories.length} categorias` : 'Execute 1ª descoberta'}
          avatarColor='primary'
          avatarIcon='ri-store-2-line'
          trendNumber={String(totalBusinesses)}
          trend='positive'
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <CardStatVertical
          stats={hasData ? totalLeads.toLocaleString('pt-BR') : '—'}
          title='Solution Aware+ (Leads)'
          subtitle={hasData ? `${Math.round((totalLeads / Math.max(totalBusinesses, 1)) * 100)}% dos negócios` : 'Score composto ≥ 50'}
          avatarColor='warning'
          avatarIcon='ri-user-search-line'
          trendNumber={String(totalLeads)}
          trend='positive'
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <CardStatVertical
          stats={bestCategory ? `${bestCategory.pain_pct}%` : '—'}
          title={bestCategory ? `Maior Dor: ${bestCategory.label.split(' ').pop()}` : 'Maior Dor'}
          subtitle={bestCategory ? `${bestCategory.total_listings.toLocaleString('pt-BR')} negócios` : 'Sem dados'}
          avatarColor='error'
          avatarIcon='ri-alert-line'
          trendNumber={String(bestCategory?.pain_pct ?? 0)}
          trend='negative'
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <CardStatVertical
          stats={avgScore > 0 ? `${avgScore}/100` : '—'}
          title={topScoreCategory ? `Melhor Score: ${topScoreCategory.label.split(' ').pop()}` : 'Score Médio'}
          subtitle={topScoreCategory ? `Média ${topScoreCategory.category}` : 'Pain Criteria v1.2'}
          avatarColor='success'
          avatarIcon='ri-bar-chart-line'
          trendNumber={String(avgScore)}
          trend='positive'
        />
      </Grid>

      {/* ── Category Ranking Table ── */}
      {hasData ? (
        <Grid size={{ xs: 12 }}>
          <Typography variant='h6' gutterBottom>
            🏆 Ranking por Dor · Score Composto (Fit×0.40+Engagement×0.35+Intent×0.25)
          </Typography>
          <TableContainer component={Paper}>
            <Table size='small'>
              <TableHead>
                <TableRow>
                  <TableCell width={40}>#</TableCell>
                  <TableCell>Categoria</TableCell>
                  <TableCell>Código GMB</TableCell>
                  <TableCell align='right'>Negócios</TableCell>
                  <TableCell width={180}>% Dor (Problem Aware+)</TableCell>
                  <TableCell align='right'>Leads (Score≥50)</TableCell>
                  <TableCell align='right'>Score Médio</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {categories.map((cat, idx) => {
                  const severity = cat.pain_pct >= 55 ? 'error' : cat.pain_pct >= 40 ? 'warning' : 'info'
                  const scoreSeverity = cat.avg_score >= 55 ? 'error' : cat.avg_score >= 40 ? 'warning' : 'info'

                  return (
                    <TableRow key={cat.category} hover>
                      <TableCell>
                        <Typography fontWeight={700} color='text.secondary'>{idx + 1}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography fontWeight={600} fontSize='0.9rem'>{cat.label}</Typography>
                      </TableCell>
                      <TableCell>
                        <Chip label={cat.category} size='small' variant='outlined' sx={{ fontFamily: 'monospace', fontSize: '0.7rem' }} />
                      </TableCell>
                      <TableCell align='right'>
                        <Typography fontWeight={600}>{cat.total_listings.toLocaleString('pt-BR')}</Typography>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <LinearProgress
                            variant='determinate'
                            value={Math.min(cat.pain_pct, 100)}
                            color={severity}
                            sx={{ flex: 1, height: 7, borderRadius: 3 }}
                          />
                          <Typography variant='caption' fontWeight={700} width={36}>
                            {cat.pain_pct}%
                          </Typography>
                          <Chip
                            label={cat.pain_pct >= 55 ? 'Alta' : cat.pain_pct >= 40 ? 'Média' : 'Baixa'}
                            size='small'
                            color={severity}
                            variant='tonal'
                            sx={{ minWidth: 55 }}
                          />
                        </Box>
                      </TableCell>
                      <TableCell align='right'>
                        <Typography fontWeight={600}>{cat.solution_aware_plus.toLocaleString('pt-BR')}</Typography>
                        <Typography variant='caption' color='text.secondary'>
                          {cat.total_listings > 0 ? Math.round((cat.solution_aware_plus / cat.total_listings) * 100) : 0}% conversão
                        </Typography>
                      </TableCell>
                      <TableCell align='right'>
                        <Chip label={`${cat.avg_score}/100`} size='small' color={scoreSeverity} variant='tonal' />
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </Grid>
      ) : (

        /* ── No data state ── */
        <Grid size={{ xs: 12 }}>
          <Alert severity='info' variant='outlined'>
            <Typography variant='h6' gutterBottom>📊 Nenhum dado de descoberta ainda</Typography>
            <Typography variant='body2' sx={{ mb: 2 }}>
              Os dados aparecerão aqui após a primeira busca no Discovery Engine.
              Cada busca persiste no Supabase (durável) e Redis (cache 24h).
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Chip label='Vá para Discovery' size='small' color='primary' variant='tonal' component='a' href={`/${lang}/admin/discovery`} clickable />
              <Chip label='Supabase: aguardando 1ª busca' size='small' variant='outlined' />
              <Chip label='Redis: sem cache' size='small' variant='outlined' />
            </Box>
          </Alert>
        </Grid>
      )}

      {/* ── Data Pipeline ── */}
      <Grid size={{ xs: 12, md: 6 }}>
        <Card>
          <CardContent>
            <Typography variant='h6' gutterBottom>⚙️ Pipeline de Persistência</Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {[
                { step: '1', label: 'Discovery Engine', desc: 'Usuário busca no /admin/discovery → EVO-API MCP :7700 → DataForSEO LIVE', icon: 'ri-search-line' },
                { step: '2', label: 'Scoring Engine', desc: 'scoring.ts: 20 sinais → Score Composto (Fit×0.40+Eng×0.35+Int×0.25)', icon: 'ri-brain-line' },
                { step: '3', label: 'Supabase (DURÁVEL)', desc: `discovery_searches + discovery_listings — dados PAGOS preservados permanentemente ${dataSource === 'supabase' ? '✅' : '⬜'}`, icon: 'ri-database-2-line' },
                { step: '4', label: 'Redis (cache 24h)', desc: `adsentice:discovery:last_score_stats — acesso rápido para dashboards ${dataSource !== 'none' ? '✅' : '⬜'}`, icon: 'ri-flashlight-line' },
                { step: '5', label: 'Categories Page', desc: 'GET /api/discovery-data → agregação por categoria GMB com score composto', icon: 'ri-pie-chart-line' },
              ].map((s) => (
                <Box key={s.step} sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                  <Chip label={s.step} size='small' color='primary' variant='tonal' sx={{ mt: 0.2 }} />
                  <Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <i className={s.icon} style={{ fontSize: '0.9rem', color: 'var(--mui-palette-primary-main)' }} />
                      <Typography variant='body2' fontWeight={700}>{s.label}</Typography>
                    </Box>
                    <Typography variant='caption' color='text.secondary'>{s.desc}</Typography>
                  </Box>
                </Box>
              ))}
            </Box>
          </CardContent>
        </Card>
      </Grid>

      {/* ── Setup Required ── */}
      <Grid size={{ xs: 12, md: 6 }}>
        <Card sx={{ bgcolor: 'var(--pastel-amber)' }}>
          <CardContent>
            <Typography variant='h6' gutterBottom>🔧 Setup Necessário (1×)</Typography>
            <Typography variant='body2' sx={{ mb: 2 }}>
              Para dados duráveis no Supabase:
            </Typography>
            <ol style={{ margin: 0, paddingLeft: '1.2rem' }}>
              <li>
                <Typography variant='body2' sx={{ mb: 1 }}>
                  <strong>Adicionar ao .env:</strong> <code>SUPABASE_SERVICE_ROLE_KEY=</code>
                  (Supabase Dashboard → Project Settings → API → service_role)
                </Typography>
              </li>
              <li>
                <Typography variant='body2' sx={{ mb: 1 }}>
                  <strong>Executar SQL migration:</strong>{' '}
                  <code>packages/db/supabase/migrations/001_discovery_tables.sql</code>
                  (Supabase SQL Editor → colar e executar)
                </Typography>
              </li>
              <li>
                <Typography variant='body2'>
                  <strong>Reiniciar</strong> o dev server após configurar.
                </Typography>
              </li>
            </ol>
          </CardContent>
        </Card>
      </Grid>

      {/* ── Redis-only state ── */}
      {dataSource === 'redis' && schwartzData && (
        <Grid size={{ xs: 12 }}>
          <Alert severity='warning' variant='outlined'>
            <Typography variant='body2' fontWeight={600}>
              ⚠️ Dados do Redis (cache 24h) — sem Supabase configurado
            </Typography>
            <Typography variant='caption'>
              Os dados acima são do cache Redis (últimas 24h). Configure o Supabase (service_role key + SQL migration)
              para preservar permanentemente os dados pagos do DataForSEO.
              Total em cache: {redisStats?.total?.toLocaleString('pt-BR') ?? 0} leads · Score médio: {redisStats?.avgScore ?? 0}/100.
            </Typography>
          </Alert>
        </Grid>
      )}
    </Grid>
  )
}

export default CategoriesPage
