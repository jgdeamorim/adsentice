
// adsentice · Dashboard ADMIN — control plane do ecossistema
// Compõe widgets Materio existentes com dados REAIS do motor
//
// Rota: /admin  (só role=admin)
// Stack: Next.js 15 + MUI Grid2 + CardStatistics + server-side engine

import { redirect } from 'next/navigation'

// MUI Imports
import Grid from '@mui/material/Grid2'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import Chip from '@mui/material/Chip'
import Button from '@mui/material/Button'
import Box from '@mui/material/Box'
import LinearProgress from '@mui/material/LinearProgress'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Paper from '@mui/material/Paper'

// Components Imports
import CardStatVertical from '@components/card-statistics/Vertical'

// Supabase + Engine
import { getSessionUser } from '@/libs/supabase/server'
import { getAdminDashboardData } from '@/lib/engine'

const RECENT_ACTIVITY = [
  { action: 'Dashboard v0.2 deployed', detail: 'Score Composto (Fit×0.40+Eng×0.35+Int×0.25) + Schwartz + Benchmark', time: 'hoje', chip: 'v0.2' },
  { action: 'Pain Criteria v1.2', detail: 'Schwartz awareness levels substituem thresholds. Scoring engine em scoring.ts', time: 'hoje', chip: 'v1.2' },
  { action: 'EVO-API MCP LIVE testado', detail: 'Dados REAIS: 5.761 dentistas em SP ($0.0149)', time: 'hoje 02:32', chip: 'LIVE' },
  { action: 'Category Ranker calibrado', detail: 'Pain Criteria v1.1 — 20 sinais, 3 tiers', time: 'hoje 01:15', chip: 'v1.1' },
  { action: 'business_listings_search fix', detail: 'Adicionado location_coordinate ao translator', time: 'hoje 00:45', chip: 'fix' },
  { action: 'business.profile.gmb estendido', detail: '10 → 27 campos canônicos (place_id, website, lat/lng, ...)', time: 'ontem 19:30', chip: 'feat' },
  { action: 'Marketing Council executado', detail: '12 advisors avaliaram estratégia. Hormozi: parar de construir, falar com clientes', time: 'ontem 18:00', chip: 'council' },
]

const AdminDashboard = async ({ params }: { params: Promise<{ lang: string }> }) => {
  const { lang } = await params
  const user = await getSessionUser()

  if (user?.role !== 'admin') {
    redirect(`/${lang}/app`)
  }

  // ═══ DADOS REAIS do motor (Redis · Qdrant · EVO-API) ═══
  const e = await getAdminDashboardData()

  const infraServices = {
    qdrant: e.qdrantOnline,
    redis: e.redisOnline,
    embed: e.embedOnline,
    evoapi: e.evoApiOnline,
  }

  return (
    <Grid container spacing={6}>
      {/* ═══ HEADER ═══ */}
      <Grid size={{ xs: 12 }}>
        <div className='flex items-center gap-3 flex-wrap justify-between'>
          <div className='flex items-center gap-3 flex-wrap'>
            <Typography variant='h4'>adsentice · Control Plane</Typography>
            <Chip label='ADMIN' color='primary' size='small' variant='tonal' />
            <Chip
              label={`BOA ${e.boaScore} ${e.boaVeredict}`}
              color={e.boaVeredict === 'EXCELLENT' ? 'success' : 'warning'}
              size='small'
              variant='tonal'
            />
            <Chip label={`${e.commits} commits`} size='small' variant='outlined' />
          </div>
          <Button
            variant='contained'
            color='primary'
            href={`/${lang}/admin/diagnostic`}
            startIcon={<i className='ri-search-line' />}
          >
            Novo Diagnóstico
          </Button>
        </div>
        <Typography variant='body2' sx={{ mt: 1 }}>
          Gerencie o motor de descoberta, funil de leads e centro de custos. ({user?.email})
        </Typography>
      </Grid>

      {/* ═══ ROW 1 · METRICS (dados REAIS do engine) ═══ */}
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <CardStatVertical
          stats={`${e.leadsDiscovered.toLocaleString('pt-BR')}`}
          title='Leads Mapeados'
          subtitle={`${e.leadsUrgentes.toLocaleString('pt-BR')} urgentes · SP 10km`}
          avatarColor='primary'
          avatarIcon='ri-radar-line'
          trendNumber={String(Math.round((e.leadsUrgentes / Math.max(e.leadsDiscovered, 1)) * 100))}
          trend='positive'
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <CardStatVertical
          stats={`${e.capabilities}`}
          title='Capabilities EVO-API'
          subtitle={`${e.mcpServers} MCP servers online`}
          avatarColor='success'
          avatarIcon='ri-plug-line'
          trendNumber={String(e.mcpServers)}
          trend='positive'
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <CardStatVertical
          stats={`R$${e.dataCostProjected.toFixed(0)}`}
          title='Custo de Dados (proj.)'
          subtitle={`$${e.dataCostToday.toFixed(2)} hoje · 39 categorias SP`}
          avatarColor='warning'
          avatarIcon='ri-money-dollar-circle-line'
          trend='negative'
          trendNumber={String(5)}
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
        <CardStatVertical
          stats={`${e.corpusTotal.toLocaleString('pt-BR')}`}
          title='Corpus Total'
          subtitle={`${e.commits} commits · ${e.adrs} ADRs`}
          avatarColor='info'
          avatarIcon='ri-database-2-line'
          trend='positive'
          trendNumber={String(parseInt(e.commits) || 53)}
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
        <CardStatVertical
          stats={e.avgScore > 0 ? `${e.avgScore}/100` : '—'}
          title='Score Médio Leads'
          subtitle={e.schwartzDistribution ? `${e.schwartzDistribution[4].count + e.schwartzDistribution[3].count} Product+Most Aware` : 'Execute 1ª descoberta'}
          avatarColor='secondary'
          avatarIcon='ri-bar-chart-line'
          trend='positive'
          trendNumber={String(e.avgScore || 0)}
        />
      </Grid>

      {/* ═══ ROW 2 · INFRA STATUS (live health checks) ═══ */}
      <Grid size={{ xs: 12 }}>
        <div className='flex gap-3 flex-wrap'>
          {Object.entries(infraServices).map(([name, online]) => (
            <Chip
              key={name}
              label={`${name} ${online ? '✅' : '❌'}`}
              color={online ? 'success' : 'error'}
              variant='tonal'
              size='small'
              icon={<i className={online ? 'ri-checkbox-circle-line' : 'ri-error-warning-line'} />}
            />
          ))}
        </div>
      </Grid>

      {/* ═══ ROW 3 · DIAGNOSTIC INPUT ═══ */}
      <Grid size={{ xs: 12, md: 6 }}>
        <Card>
          <CardContent>
            <Typography variant='h6' gutterBottom>🔍 Diagnóstico Rápido</Typography>
            <Typography variant='body2' sx={{ mb: 3 }}>
              Cole a URL de um negócio e receba o full-score em 10 segundos.
            </Typography>
            <Box
              component='form'
              action={`/${lang}/admin/diagnostic`}
              method='GET'
              sx={{ display: 'flex', gap: 2 }}
            >
              <input
                name='url'
                type='text'
                placeholder='minhaclinica.com.br'
                required
                style={{
                  flex: 1,
                  padding: '10px 16px',
                  borderRadius: 'var(--r-pill)',
                  border: '1px solid var(--border)',
                  fontFamily: 'inherit',
                  fontSize: '0.95rem',
                }}
              />
              <Button variant='contained' color='primary' type='submit'>
                Analisar
              </Button>
            </Box>
          </CardContent>
        </Card>
      </Grid>

      {/* ═══ ROW 3B · PIPELINE FUNIL ═══ */}
      <Grid size={{ xs: 12, md: 6 }}>
        <Card>
          <CardContent>
            <Typography variant='h6' gutterBottom>📊 Funil de Leads (Schwartz Awareness)</Typography>
            <Box sx={{ mt: 2 }}>
              {[
                { stage: 'Most Aware', count: e.schwartzDistribution?.[4]?.count ?? e.leadsUrgentes, label: 'prontos para fechar', pct: Math.round(((e.schwartzDistribution?.[4]?.count ?? e.leadsUrgentes) / Math.max(e.leadsDiscovered, 1)) * 100), color: 'error' as const },
                { stage: 'Product Aware', count: e.schwartzDistribution?.[3]?.count ?? 0, label: 'consideram adsentice', pct: Math.round(((e.schwartzDistribution?.[3]?.count ?? 0) / Math.max(e.leadsDiscovered, 1)) * 100), color: 'warning' as const },
                { stage: 'Solution Aware', count: e.schwartzDistribution?.[2]?.count ?? e.leadsQuentes, label: 'sabem que existe solução', pct: Math.round(((e.schwartzDistribution?.[2]?.count ?? e.leadsQuentes) / Math.max(e.leadsDiscovered, 1)) * 100), color: 'info' as const },
                { stage: 'Problem Aware', count: e.schwartzDistribution?.[1]?.count ?? 0, label: 'sentem a dor', pct: Math.round(((e.schwartzDistribution?.[1]?.count ?? 0) / Math.max(e.leadsDiscovered, 1)) * 100), color: 'primary' as const },
                { stage: 'Unaware', count: e.schwartzDistribution?.[0]?.count ?? 0, label: 'não sabem do problema', pct: Math.round(((e.schwartzDistribution?.[0]?.count ?? 0) / Math.max(e.leadsDiscovered, 1)) * 100), color: 'success' as const },
              ].map((s) => (
                <Box key={s.stage} sx={{ mb: 1.5 }}>
                  <div className='flex justify-between mb-1'>
                    <Typography variant='body2' fontWeight={600}>{s.stage}</Typography>
                    <Typography variant='body2'>
                      {typeof s.count === 'number' ? s.count.toLocaleString('pt-BR') : s.count} {s.label}
                    </Typography>
                  </div>
                  <LinearProgress
                    variant='determinate'
                    value={Math.min(s.pct, 100)}
                    color={s.color}
                    sx={{ height: 6, borderRadius: 3 }}
                  />
                </Box>
              ))}
            </Box>
          </CardContent>
        </Card>
      </Grid>

      {/* ═══ ROW 4 · SCHWARTZ DISTRIBUTION ═══ */}
      {e.schwartzDistribution && (
        <Grid size={{ xs: 12 }}>
          <Card>
            <CardContent>
              <Typography variant='h6' gutterBottom>
                📊 Distribuição Schwartz · Score Médio: {e.avgScore}/100
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                {e.schwartzDistribution.map((s) => {
                  const pct = e.leadsDiscovered > 0 ? Math.round((s.count / e.leadsDiscovered) * 100) : 0
                  const colors = ['#9e9e9e', '#42a5f5', '#ffa726', '#ef5350', '#d32f2f']

                  
return (
                    <Box key={s.level} sx={{ flex: 1, minWidth: 120, textAlign: 'center' }}>
                      <Typography variant='h5' fontWeight={800} sx={{ color: colors[s.level - 1] }}>
                        {s.count.toLocaleString('pt-BR')}
                      </Typography>
                      <Typography variant='caption' color='text.secondary'>{s.label}</Typography>
                      <LinearProgress variant='determinate' value={pct}
                        sx={{ height: 6, borderRadius: 3, mt: 0.5, bgcolor: `${colors[s.level - 1]}22`, '& .MuiLinearProgress-bar': { bgcolor: colors[s.level - 1] } }} />
                      <Typography variant='caption'>{pct}%</Typography>
                    </Box>
                  )
                })}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      )}

      {/* ═══ ROW 5 · RECENT ACTIVITY ═══ */}
      <Grid size={{ xs: 12 }}>
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Ação</TableCell>
                <TableCell>Detalhe</TableCell>
                <TableCell width={120}>Quando</TableCell>
                <TableCell width={80}></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {RECENT_ACTIVITY.map((item) => (
                <TableRow key={item.action} hover>
                  <TableCell>
                    <Typography fontWeight={600}>{item.action}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant='body2' color='text.secondary'>{item.detail}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant='caption'>{item.time}</Typography>
                  </TableCell>
                  <TableCell>
                    <Chip label={item.chip} size='small' variant='outlined' />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Grid>

      {/* ═══ ROW 5 · QUICK LINKS ═══ */}
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <Card>
          <CardContent className='flex flex-col gap-2'>
            <i className='ri-folder-open-line text-[24px] text-primary' />
            <Typography variant='h6'>Categorias</Typography>
            <Typography variant='body2'>Rankear nichos e descobrir melhores leads</Typography>
            <Button size='small' variant='outlined' href={`/${lang}/admin/categories`} sx={{ mt: 1 }}>Ver ranking</Button>
          </CardContent>
        </Card>
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <Card>
          <CardContent className='flex flex-col gap-2'>
            <i className='ri-pie-chart-line text-[24px] text-success' />
            <Typography variant='h6'>Centro de Custos</Typography>
            <Typography variant='body2'>DataForSEO spend, ROI, margem</Typography>
            <Button size='small' variant='outlined' href={`/${lang}/admin/costs`} sx={{ mt: 1 }}>Ver custos</Button>
          </CardContent>
        </Card>
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <Card>
          <CardContent className='flex flex-col gap-2'>
            <i className='ri-user-settings-line text-[24px] text-info' />
            <Typography variant='h6'>Tenants</Typography>
            <Typography variant='body2'>Clientes, spend-cap, planos</Typography>
            <Button size='small' variant='outlined' href={`/${lang}/admin/tenants`} sx={{ mt: 1 }}>Gerenciar</Button>
          </CardContent>
        </Card>
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <Card>
          <CardContent className='flex flex-col gap-2'>
            <i className='ri-settings-3-line text-[24px] text-warning' />
            <Typography variant='h6'>Infra & MCP</Typography>
            <Typography variant='body2'>Servidores, health, configuração</Typography>
            <Button size='small' variant='outlined' href={`/${lang}/admin/infra`} sx={{ mt: 1 }}>Monitorar</Button>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  )
}

export default AdminDashboard
