
// adsentice · Admin / Pipeline — funil de leads Stage 0→7
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

interface StageData {
  stage: string
  label: string
  count: number
  pct: number
  color: string
  description: string
}

const PIPELINE: StageData[] = [
  { stage: 'S0', label: 'Seleção de Segmento', count: 57, pct: 100, color: 'primary', description: 'categorias SMB analisadas' },
  { stage: 'S1', label: 'Descoberta', count: 10530, pct: 82, color: 'info', description: 'negócios mapeados via GMB' },
  { stage: 'S2', label: 'Pré-Filtro', count: 4212, pct: 64, color: 'info', description: 'passaram ANTI-ICP (~40%)' },
  { stage: 'S3', label: 'Análise ★', count: 3709, pct: 46, color: 'warning', description: 'quentes + urgentes' },
  { stage: 'S4', label: 'Lead Score', count: 2329, pct: 28, color: 'error', description: 'urgentes com dor detectável' },
  { stage: 'S5', label: 'Proposta CRM', count: 0, pct: 0, color: 'error', description: 'propostas enviadas' },
  { stage: 'S6', label: 'Negociação', count: 0, pct: 0, color: 'error', description: 'em contato com founder' },
  { stage: 'S7', label: 'Cliente', count: 0, pct: 0, color: 'success', description: 'onboarded · MRR' },
]

const PipelinePage = async ({ params }: { params: Promise<{ lang: string }> }) => {
  const { lang } = await params
  const user = await getSessionUser()
  if (user?.role !== 'admin') redirect(`/${lang}/app`)

  const totalEntered = PIPELINE[0].count
  const totalOutput = PIPELINE[PIPELINE.length - 1].count

  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12 }}>
        <Typography variant='h4'>📈 Pipeline · Funil de Leads</Typography>
        <Typography variant='body2' color='text.secondary'>
          Stage 0→7 · São Paulo, raio 10km · Dados do Category Ranker
        </Typography>
      </Grid>

      {/* Top funnel metrics */}
      <Grid size={{ xs: 12, sm: 4 }}>
        <CardStatVertical
          stats={totalEntered.toLocaleString('pt-BR')}
          title='Entrada do Funil'
          subtitle='Negócios no topo (S0)'
          avatarColor='primary'
          avatarIcon='ri-funnel-line'
          trendNumber={String(totalEntered)}
          trend='positive'
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 4 }}>
        <CardStatVertical
          stats={PIPELINE[3].count.toLocaleString('pt-BR')}
          title='Leads Qualificados'
          subtitle={`S3 · ${Math.round((PIPELINE[3].count / totalEntered) * 100)}% do topo`}
          avatarColor='warning'
          avatarIcon='ri-filter-3-line'
          trendNumber={String(Math.round((PIPELINE[3].count / totalEntered) * 100))}
          trend='positive'
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 4 }}>
        <CardStatVertical
          stats={totalOutput.toLocaleString('pt-BR')}
          title='Clientes'
          subtitle={'S7 · aguardando primeiro onboarding'}
          avatarColor='success'
          avatarIcon='ri-user-heart-line'
          trendNumber={String(totalOutput)}
          trend={totalOutput > 0 ? 'positive' : 'negative'}
        />
      </Grid>

      {/* Stage cards */}
      <Grid size={{ xs: 12 }}>
        <Typography variant='h6' gutterBottom>Estágios do Funil</Typography>
        <Grid container spacing={3}>
          {PIPELINE.map((s, i) => (
            <Grid key={s.stage} size={{ xs: 12, sm: 6, md: 3 }}>
              <Card
                sx={{
                  borderLeft: 4,
                  borderColor: `${s.color}.main`,
                  opacity: s.pct === 0 ? 0.5 : 1,
                }}
              >
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Chip label={s.stage} color={s.color as any} size='small' />
                    <Typography variant='h5' fontWeight={700}>
                      {typeof s.count === 'number' ? s.count.toLocaleString('pt-BR') : s.count}
                    </Typography>
                  </Box>
                  <Typography variant='subtitle2' fontWeight={600} gutterBottom>{s.label}</Typography>
                  <Typography variant='caption' color='text.secondary'>{s.description}</Typography>
                  <LinearProgress
                    variant='determinate'
                    value={s.pct}
                    color={s.color as any}
                    sx={{ mt: 2, height: 6, borderRadius: 3 }}
                  />
                  <Typography variant='caption' color='text.secondary' sx={{ mt: 0.5, display: 'block' }}>
                    {s.pct}% do topo
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Grid>

      {/* Conversion metrics */}
      <Grid size={{ xs: 12, md: 6 }}>
        <Card>
          <CardContent>
            <Typography variant='h6' gutterBottom>📊 Taxas de Conversão</Typography>
            {[
              { from: 'S0→S3', rate: Math.round((PIPELINE[3].count / totalEntered) * 100), label: 'categorias → leads qualificados' },
              { from: 'S3→S5', rate: Math.round((PIPELINE[5].count / Math.max(PIPELINE[3].count, 1)) * 100), label: 'qualificados → propostas' },
              { from: 'S5→S7', rate: Math.round((totalOutput / Math.max(PIPELINE[5].count, 1)) * 100), label: 'propostas → clientes' },
            ].map((conv) => (
              <Box key={conv.from} sx={{ mb: 3 }}>
                <div className='flex justify-between mb-1'>
                  <Typography variant='body2' fontWeight={600}>{conv.from}</Typography>
                  <Typography variant='body2'>{conv.rate}%</Typography>
                </div>
                <LinearProgress
                  variant='determinate'
                  value={conv.rate}
                  color={conv.rate >= 50 ? 'success' : conv.rate >= 25 ? 'warning' : 'error'}
                  sx={{ height: 8, borderRadius: 4 }}
                />
                <Typography variant='caption' color='text.secondary'>{conv.label}</Typography>
              </Box>
            ))}
          </CardContent>
        </Card>
      </Grid>

      {/* Next steps */}
      <Grid size={{ xs: 12, md: 6 }}>
        <Card sx={{ bgcolor: 'var(--pastel-amber)' }}>
          <CardContent>
            <Typography variant='h6' gutterBottom>⏭️ Próximos Passos</Typography>
            <Typography variant='body2' sx={{ mb: 1 }}>Para ativar os estágios S5-S7:</Typography>
            <ul style={{ marginTop: 0, paddingLeft: '1.2rem' }}>
              <li><Typography variant='body2'>Wire <code>@adsentice/db</code> → Supabase leads table</Typography></li>
              <li><Typography variant='body2'>Criar template de proposta CRM (Stage 5)</Typography></li>
              <li><Typography variant='body2'>Implementar CRM tracking (contact status, notes)</Typography></li>
              <li><Typography variant='body2'>Wire Supabase Auth → tenant provisioning (Stage 7)</Typography></li>
            </ul>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  )
}

export default PipelinePage
