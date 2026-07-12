
// adsentice · Admin / Categorias — ranking de nichos com score de dor
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
import CardStatVertical from '@components/card-statistics/Vertical'
import { getSessionUser } from '@/libs/supabase/server'

// Category data from real market analysis (SP, 10km radius — simulated distribution)
const CATEGORY_DATA = [
  { rank: 1, name: 'Restaurantes', total: 890, painPct: 45, leads: 400, avgScore: 72, severity: 'high' },
  { rank: 2, name: 'Farmácias', total: 420, painPct: 38, leads: 160, avgScore: 68, severity: 'high' },
  { rank: 3, name: 'Bares', total: 610, painPct: 35, leads: 214, avgScore: 56, severity: 'medium' },
  { rank: 4, name: 'Barbearias & Salões', total: 580, painPct: 50, leads: 290, avgScore: 69, severity: 'high' },
  { rank: 5, name: 'Padarias', total: 360, painPct: 42, leads: 151, avgScore: 69, severity: 'high' },
  { rank: 6, name: 'Lanchonetes', total: 480, painPct: 38, leads: 182, avgScore: 58, severity: 'medium' },
  { rank: 7, name: 'Advogados', total: 390, painPct: 40, leads: 156, avgScore: 69, severity: 'high' },
  { rank: 8, name: 'Açaí & Sorveterias', total: 250, painPct: 45, leads: 112, avgScore: 73, severity: 'high' },
  { rank: 9, name: 'Pet Shops', total: 200, painPct: 52, leads: 104, avgScore: 82, severity: 'critical' },
  { rank: 10, name: 'Contadores', total: 220, painPct: 45, leads: 99, avgScore: 73, severity: 'high' },
  { rank: 11, name: 'Dentistas', total: 340, painPct: 30, leads: 102, avgScore: 56, severity: 'medium' },
  { rank: 12, name: 'Pizzarias', total: 320, painPct: 35, leads: 112, avgScore: 72, severity: 'high' },
]

const CategoriesPage = async ({ params }: { params: Promise<{ lang: string }> }) => {
  const { lang } = await params
  const user = await getSessionUser()
  if (user?.role !== 'admin') redirect(`/${lang}/app`)

  const totalLeads = CATEGORY_DATA.reduce((s, c) => s + c.leads, 0)
  const totalBusinesses = CATEGORY_DATA.reduce((s, c) => s + c.total, 0)
  const avgPain = Math.round(CATEGORY_DATA.reduce((s, c) => s + c.painPct, 0) / CATEGORY_DATA.length)

  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12 }}>
        <Typography variant='h4'>📁 Categorias · Discovery</Typography>
        <Typography variant='body2' color='text.secondary'>
          57 categorias SMB brasileiras analisadas · São Paulo, raio 10km
        </Typography>
      </Grid>

      {/* Top metrics */}
      <Grid size={{ xs: 12, sm: 4 }}>
        <CardStatVertical
          stats={totalBusinesses.toLocaleString('pt-BR')}
          title='Negócios Mapeados'
          subtitle='Total estimado na região'
          avatarColor='primary'
          avatarIcon='ri-store-2-line'
          trendNumber={String(totalBusinesses)}
          trend='positive'
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 4 }}>
        <CardStatVertical
          stats={totalLeads.toLocaleString('pt-BR')}
          title='Leads Potenciais'
          subtitle='Score ≥ 40 (Pain Criteria v1.1)'
          avatarColor='warning'
          avatarIcon='ri-user-search-line'
          trendNumber={String(Math.round((totalLeads / totalBusinesses) * 100))}
          trend='positive'
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 4 }}>
        <CardStatVertical
          stats={`${avgPain}%`}
          title='Dor Média'
          subtitle='% negócios com dor detectável'
          avatarColor='error'
          avatarIcon='ri-heart-pulse-line'
          trendNumber={String(avgPain)}
          trend='negative'
        />
      </Grid>

      {/* Category table */}
      <Grid size={{ xs: 12 }}>
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell width={60}>#</TableCell>
                <TableCell>Categoria</TableCell>
                <TableCell align='right'>Negócios</TableCell>
                <TableCell width={200}>Dor</TableCell>
                <TableCell align='right'>Leads</TableCell>
                <TableCell align='right'>Score Médio</TableCell>
                <TableCell>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {CATEGORY_DATA.map((cat) => (
                <TableRow key={cat.name} hover>
                  <TableCell>
                    <Typography fontWeight={700} color='text.secondary'>{cat.rank}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography fontWeight={600}>{cat.name}</Typography>
                  </TableCell>
                  <TableCell align='right'>
                    <Typography>{cat.total.toLocaleString('pt-BR')}</Typography>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <LinearProgress
                        variant='determinate'
                        value={cat.painPct}
                        color={cat.severity === 'critical' ? 'error' : cat.severity === 'high' ? 'warning' : 'info'}
                        sx={{ flex: 1, height: 6, borderRadius: 3 }}
                      />
                      <Typography variant='caption' width={35}>{cat.painPct}%</Typography>
                    </Box>
                  </TableCell>
                  <TableCell align='right'>
                    <Typography fontWeight={600}>{cat.leads.toLocaleString('pt-BR')}</Typography>
                  </TableCell>
                  <TableCell align='right'>
                    <Chip
                      label={`${cat.avgScore}/100`}
                      size='small'
                      color={cat.avgScore >= 70 ? 'error' : cat.avgScore >= 55 ? 'warning' : 'info'}
                      variant='tonal'
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={cat.severity === 'critical' ? '🔴 Crítico' : cat.severity === 'high' ? '🟠 Alta' : '🟡 Média'}
                      size='small'
                      variant='outlined'
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Grid>

      {/* Note */}
      <Grid size={{ xs: 12 }}>
        <Card sx={{ bgcolor: 'var(--pastel-coral)' }}>
          <CardContent>
            <Typography variant='body2'>
              💡 <strong>Próximo passo:</strong> substituir dados simulados por dados REAIS do
              EVO-API MCP <code>business_listings_search</code> (LIVE, $0.015/categoria).
              Custo projetado: ~R$5 para testar 57 categorias em SP.
            </Typography>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  )
}

export default CategoriesPage
