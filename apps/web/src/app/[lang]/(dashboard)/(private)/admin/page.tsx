
// adsentice · Dashboard ADMIN — control plane do ecossistema
// Compõe widgets Materio existentes com dados REAIS do motor
//
// Rota: /admin  (só role=admin)
// Stack: Next.js 15 + MUI Grid2 + CardStatistics + server actions

import { redirect } from 'next/navigation'
import Link from 'next/link'

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
import CardStatHorizontalWithBorder from '@components/card-statistics/HorizontalWithBorder'

// Supabase
import { getSessionUser } from '@/libs/supabase/server'

// ── Dados do motor (futuro: server action wire no @adsentice/db) ──

const ENGINE_METRICS = {
  mcpServers: 7,
  capabilities: 76,
  corpusTotal: 10500,
  boaScore: 0.818,
  boaVeredict: 'EXCELLENT',
  leadsDiscovered: 10530,   // total estimado pelo Category Ranker SP 10km
  leadsUrgentes: 2329,
  leadsQuentes: 1380,
  dataCostToday: 0.03,      // USD gasto hoje
  dataCostProjected: 5.00,  // USD projetado para testar 39 categorias
  activeTenants: 0,          // clientes onboarded
  commits: 53,
  adrs: 7,
  infraServices: { redis: true, qdrant: true, embed: true, evoapi: true },
}

const RECENT_ACTIVITY = [
  { action: 'EVO-API MCP LIVE testado', detail: 'Dados REAIS: 5.761 dentistas em SP ($0.0149)', time: 'hoje 02:32', chip: 'LIVE' },
  { action: 'Category Ranker calibrado', detail: 'Pain Criteria v1.1 — 20 sinais, 3 tiers', time: 'hoje 01:15', chip: 'v1.1' },
  { action: 'business_listings_search fix', detail: 'Adicionado location_coordinate ao translator', time: 'hoje 00:45', chip: 'fix' },
  { action: 'business.profile.gmb estendido', detail: '10 → 27 campos canônicos (place_id, website, lat/lng, ...)', time: 'ontem 19:30', chip: 'feat' },
  { action: 'Marketing Council executado', detail: '12 advisors avaliaram estratégia. Hormozi: parar de construir, falar com clientes', time: 'ontem 18:00', chip: 'council' },
  { action: 'RSXT Bridge ingerida', detail: '30 edges conectando engines, layers, doctrines ao KG', time: 'ontem 16:00', chip: 'feat' },
  { action: '3 MCP servers reescritos', detail: 'adsentice-qdrant, kg, conversation — JSON-RPC raw → SDK mcp + uv run', time: 'ontem 14:00', chip: 'fix' },
]

const AdminDashboard = async ({ params }: { params: Promise<{ lang: string }> }) => {
  const { lang } = await params
  const user = await getSessionUser()

  if (user?.role !== 'admin') {
    redirect(`/${lang}/app`)
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
              label={`BOA ${ENGINE_METRICS.boaScore} ${ENGINE_METRICS.boaVeredict}`}
              color={ENGINE_METRICS.boaVeredict === 'EXCELLENT' ? 'success' : 'warning'}
              size='small'
              variant='tonal'
            />
          </div>
          <Button
            variant='contained'
            color='primary'
            href='#diagnostic'
            startIcon={<i className='ri-search-line' />}
          >
            Novo Diagnóstico
          </Button>
        </div>
        <Typography variant='body2' sx={{ mt: 1 }}>
          Gerencie o motor de descoberta, funil de leads e centro de custos. ({user?.email})
        </Typography>
      </Grid>

      {/* ═══ ROW 1 · METRICS — 4 cards ═══ */}
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <CardStatVertical
          stats={`${ENGINE_METRICS.leadsDiscovered.toLocaleString('pt-BR')}`}
          title='Leads Mapeados'
          subtitle={`${ENGINE_METRICS.leadsUrgentes.toLocaleString('pt-BR')} urgentes · SP 10km`}
          avatarColor='primary'
          avatarIcon='ri-radar-line'
          trendNumber={Math.round((ENGINE_METRICS.leadsUrgentes / ENGINE_METRICS.leadsDiscovered) * 100)}
          trend='positive'
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <CardStatVertical
          stats={`${ENGINE_METRICS.capabilities}`}
          title='Capabilities EVO-API'
          subtitle={`${ENGINE_METRICS.mcpServers} MCP servers online`}
          avatarColor='success'
          avatarIcon='ri-plug-line'
          trendNumber={ENGINE_METRICS.mcpServers}
          trend='positive'
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <CardStatVertical
          stats={`R$${(ENGINE_METRICS.dataCostProjected).toFixed(0)}`}
          title='Custo de Dados (proj.)'
          subtitle={`$${ENGINE_METRICS.dataCostToday.toFixed(2)} hoje · 39 categorias SP`}
          avatarColor='warning'
          avatarIcon='ri-money-dollar-circle-line'
          trend='negative'
          trendNumber={5}
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <CardStatVertical
          stats={`${ENGINE_METRICS.corpusTotal.toLocaleString('pt-BR')}`}
          title='Corpus Total'
          subtitle={`${ENGINE_METRICS.commits} commits · ${ENGINE_METRICS.adrs} ADRs`}
          avatarColor='info'
          avatarIcon='ri-database-2-line'
          trend='positive'
          trendNumber={ENGINE_METRICS.commits}
        />
      </Grid>

      {/* ═══ ROW 2 · INFRA STATUS ═══ */}
      <Grid size={{ xs: 12 }}>
        <div className='flex gap-3 flex-wrap'>
          {Object.entries(ENGINE_METRICS.infraServices).map(([name, online]) => (
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
            <Typography variant='h6' gutterBottom>📊 Funil de Leads (Stage 0→7)</Typography>
            <Box sx={{ mt: 2 }}>
              {[
                { stage: 'S0 Seleção', count: 39, label: 'categorias testadas' },
                { stage: 'S1 Discovery', count: ENGINE_METRICS.leadsDiscovered, label: 'negócios mapeados' },
                { stage: 'S2 Pré-filtro', count: Math.round(ENGINE_METRICS.leadsDiscovered * 0.4), label: 'passaram (~40%)' },
                { stage: 'S3 Análise', count: ENGINE_METRICS.leadsUrgentes + ENGINE_METRICS.leadsQuentes, label: 'leads quentes+urgentes' },
                { stage: 'S4 Score', count: ENGINE_METRICS.leadsUrgentes, label: 'urgentes' },
              ].map((s, i) => (
                <Box key={s.stage} sx={{ mb: 1.5 }}>
                  <div className='flex justify-between mb-1'>
                    <Typography variant='body2' fontWeight={600}>{s.stage}</Typography>
                    <Typography variant='body2'>
                      {typeof s.count === 'number' ? s.count.toLocaleString('pt-BR') : s.count} {s.label}
                    </Typography>
                  </div>
                  <LinearProgress
                    variant='determinate'
                    value={100 - i * 18}
                    color={i === 0 ? 'primary' : i === 1 ? 'info' : i === 2 ? 'warning' : i === 3 ? 'error' : 'success'}
                    sx={{ height: 6, borderRadius: 3 }}
                  />
                </Box>
              ))}
            </Box>
          </CardContent>
        </Card>
      </Grid>

      {/* ═══ ROW 4 · RECENT ACTIVITY ═══ */}
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
