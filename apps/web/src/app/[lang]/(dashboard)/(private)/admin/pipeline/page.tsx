
// adsentice · Admin / Pipeline — funil de leads com dados REAIS do Redis
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
import { getAdminDashboardData } from '@/lib/engine'

const PipelinePage = async ({ params }: { params: Promise<{ lang: string }> }) => {
  const { lang } = await params
  const user = await getSessionUser()

  if (user?.role !== 'admin') redirect(`/${lang}/app`)

  // ═══ Dados REAIS do engine (Redis :6396) ═══
  const e = await getAdminDashboardData()

  const hasData = e.leadsDiscovered > 0
  const totalEntered = hasData ? e.leadsDiscovered : 0

  // Schwartz distribution from last discovery
  const mostAware = e.schwartzDistribution?.[4]?.count ?? 0
  const productAware = e.schwartzDistribution?.[3]?.count ?? 0
  const solutionAware = e.schwartzDistribution?.[2]?.count ?? 0
  const problemAware = e.schwartzDistribution?.[1]?.count ?? 0
  const unaware = e.schwartzDistribution?.[0]?.count ?? 0

  // Pipeline stages mapped to Schwartz + business stages
  const pipeline = [
    { stage: 'S0', label: 'Discovery Engine', count: hasData ? totalEntered : 0, desc: 'negócios encontrados via GMB', color: 'primary' as const },
    { stage: 'S1', label: 'Unaware', count: unaware, desc: 'não sabem do problema — educar', color: 'success' as const },
    { stage: 'S2', label: 'Problem Aware', count: problemAware, desc: 'sentem a dor — agitar', color: 'info' as const },
    { stage: 'S3', label: 'Solution Aware', count: solutionAware, desc: 'sabem da solução — comparar', color: 'warning' as const },
    { stage: 'S4', label: 'Product Aware', count: productAware, desc: 'consideram adsentice — provar', color: 'error' as const },
    { stage: 'S5', label: 'Most Aware', count: mostAware, desc: 'prontos para fechar — agir', color: 'error' as const },
    { stage: 'S6', label: 'Proposta CRM', count: 0, desc: 'propostas enviadas — em desenvolvimento', color: 'error' as const },
    { stage: 'S7', label: 'Cliente', count: 0, desc: 'onboarded · MRR — em desenvolvimento', color: 'success' as const },
  ]

  const maxCount = Math.max(totalEntered, 1)

  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12 }}>
        <Typography variant='h4'>📈 Pipeline · Funil de Leads</Typography>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap', mt: 1 }}>
          <Typography variant='body2' color='text.secondary'>
            Stage 0→7 · Fonte: Redis adsentice:discovery:last_score_stats
          </Typography>
          {hasData ? (
            <Chip label='Dados REAIS' size='small' color='success' variant='tonal' />
          ) : (
            <Chip label='Sem dados — execute 1ª descoberta' size='small' color='warning' variant='tonal' />
          )}
        </Box>
      </Grid>

      {/* Top funnel metrics */}
      <Grid size={{ xs: 12, sm: 4 }}>
        <CardStatVertical
          stats={totalEntered.toLocaleString('pt-BR')}
          title='Entrada do Funil'
          subtitle={hasData ? `Score médio: ${e.avgScore}/100` : 'Aguardando 1ª descoberta'}
          avatarColor='primary'
          avatarIcon='ri-funnel-line'
          trendNumber={String(totalEntered)}
          trend='positive'
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 4 }}>
        <CardStatVertical
          stats={(solutionAware + productAware + mostAware).toLocaleString('pt-BR')}
          title='Leads Qualificados'
          subtitle={`Solution Aware+ · ${totalEntered > 0 ? Math.round(((solutionAware + productAware + mostAware) / totalEntered) * 100) : 0}% do topo`}
          avatarColor='warning'
          avatarIcon='ri-filter-3-line'
          trendNumber={String(solutionAware + productAware + mostAware)}
          trend='positive'
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 4 }}>
        <CardStatVertical
          stats="0"
          title='Clientes'
          subtitle='S7 · aguardando CRM wire'
          avatarColor='success'
          avatarIcon='ri-user-heart-line'
          trendNumber="0"
          trend='negative'
        />
      </Grid>

      {/* Stage cards */}
      <Grid size={{ xs: 12 }}>
        <Typography variant='h6' gutterBottom>Estágios do Funil</Typography>
        <Grid container spacing={3}>
          {pipeline.map((s) => {
            const pct = Math.round((s.count / maxCount) * 100)

            return (
              <Grid key={s.stage} size={{ xs: 12, sm: 6, md: 3 }}>
                <Card
                  sx={{
                    borderLeft: 4,
                    borderColor: `${s.color}.main`,
                    opacity: s.count === 0 ? 0.5 : 1,
                  }}
                >
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                      <Chip label={s.stage} color={s.color} size='small' />
                      <Typography variant='h5' fontWeight={700}>
                        {s.count.toLocaleString('pt-BR')}
                      </Typography>
                    </Box>
                    <Typography variant='subtitle2' fontWeight={600} gutterBottom>{s.label}</Typography>
                    <Typography variant='caption' color='text.secondary'>{s.desc}</Typography>
                    <LinearProgress
                      variant='determinate'
                      value={pct}
                      color={s.color}
                      sx={{ mt: 2, height: 6, borderRadius: 3 }}
                    />
                    <Typography variant='caption' color='text.secondary' sx={{ mt: 0.5, display: 'block' }}>
                      {pct}% do topo
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            )
          })}
        </Grid>
      </Grid>

      {/* Conversion metrics */}
      <Grid size={{ xs: 12, md: 6 }}>
        <Card>
          <CardContent>
            <Typography variant='h6' gutterBottom>📊 Taxas de Conversão</Typography>
            {[
              { from: 'S0→S3', rate: totalEntered > 0 ? Math.round(((solutionAware + productAware + mostAware) / totalEntered) * 100) : 0, label: 'descoberta → leads qualificados (Solution Aware+)' },
              { from: 'S3→S5', rate: (solutionAware + productAware) > 0 ? Math.round((mostAware / Math.max(solutionAware + productAware + mostAware, 1)) * 100) : 0, label: 'qualificados → Most Aware (prontos)' },
              { from: 'S5→S7', rate: 0, label: 'Most Aware → clientes (CRM em desenvolvimento)' },
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
            <Typography variant='body2' sx={{ mb: 1 }}>Para ativar os estágios S6-S7:</Typography>
            <ul style={{ marginTop: 0, paddingLeft: '1.2rem' }}>
              <li><Typography variant='body2'>Wire Supabase leads table (packages/db/)</Typography></li>
              <li><Typography variant='body2'>Criar template de proposta CRM (Stage 6)</Typography></li>
              <li><Typography variant='body2'>Implementar CRM tracking (contact status, notes)</Typography></li>
              <li><Typography variant='body2'>Wire Supabase Auth → tenant onboarding (Stage 7)</Typography></li>
            </ul>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  )
}

export default PipelinePage
