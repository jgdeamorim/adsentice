
// adsentice · Admin / Pipeline — dados REAIS do Supabase (agregado de TODAS as buscas)
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

import { Pool } from 'pg'

import CardStatVertical from '@components/card-statistics/Vertical'
import { getSessionUser } from '@/libs/supabase/server'
import { getAdminDashboardData } from '@/lib/engine'

const PipelinePage = async ({ params }: { params: Promise<{ lang: string }> }) => {
  const { lang } = await params
  const user = await getSessionUser()

  if (user?.role !== 'admin') redirect(`/${lang}/app`)

  const e = await getAdminDashboardData()

  // ═══ Dados REAIS do Supabase (agregado de TODAS as buscas) ═══
  let supabaseTotal = 0
  let schwartzDist: { level: number; label: string; count: number }[] = []
  let categoryCounts: { category: string; count: number; label: string }[] = []
  let avgScoreAll = 0

  try {
    const pool = new Pool({
      host: 'aws-0-ca-central-1.pooler.supabase.com', port: 6543, database: 'postgres',
      user: 'postgres.tdigauruusdhnpvppixb', password: 'pmaxnpmiJ6WfcX46',
      ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 5000,
    })

    const [totalRes, distRes, catRes, scoreRes] = await Promise.all([
      pool.query('SELECT COUNT(*) as n FROM discovery_listings'),
      pool.query('SELECT schwartz_level, schwartz_label, COUNT(*) as n FROM discovery_listings GROUP BY schwartz_level, schwartz_label ORDER BY schwartz_level'),
      pool.query('SELECT category, COUNT(*) as n FROM discovery_listings WHERE category IS NOT NULL GROUP BY category ORDER BY n DESC LIMIT 10'),
      pool.query('SELECT ROUND(AVG(score_compound))::INTEGER as avg FROM discovery_listings'),
    ])

    supabaseTotal = parseInt(totalRes.rows[0].n) || 0
    avgScoreAll = parseInt(scoreRes.rows[0].avg) || 0

    schwartzDist = distRes.rows.map((r: any) => ({
      level: r.schwartz_level, label: r.schwartz_label, count: parseInt(r.n),
    }))
    categoryCounts = catRes.rows.map((r: any) => ({
      category: r.category, count: parseInt(r.n),
      label: CAT_SHORT[r.category] || r.category,
    }))

    await pool.end()
  } catch { /* Supabase offline — fallback to Redis */ }

  // Fallback: use Redis data if Supabase is empty
  const hasSupabase = supabaseTotal > 0
  const totalEntered = hasSupabase ? supabaseTotal : e.leadsDiscovered

  // Build Schwartz distribution (from Supabase or Redis fallback)
  const labelOrder = ['Unaware', 'Problem Aware', 'Solution Aware', 'Product Aware', 'Most Aware']
  const distMap = new Map(schwartzDist.map(d => [d.label, d.count]))
  const colors = ['success', 'info', 'warning', 'error', 'error'] as const

  const stages = [
    { stage: 'S0', label: 'Discovery Engine', count: totalEntered, desc: 'leads no Supabase (todas buscas)', color: 'primary' as const, filter: null },
    ...labelOrder.map((label, i) => ({
      stage: `S${i + 1}`, label,
      count: distMap.get(label) || e.schwartzDistribution?.[i]?.count || 0,
      desc: i === 0 ? 'não sabem do problema — educar' : i === 1 ? 'sentem a dor — agitar' : i === 2 ? 'sabem da solução — comparar' : i === 3 ? 'consideram adsentice — provar' : 'prontos para fechar — agir',
      color: colors[i], filter: `schwartz=${i + 1}`,
    })),
    { stage: 'S6', label: 'Proposta CRM', count: 0, desc: 'propostas enviadas — em desenvolvimento', color: 'error' as const, filter: null },
    { stage: 'S7', label: 'Cliente', count: 0, desc: 'onboarded · MRR — em desenvolvimento', color: 'success' as const, filter: null },
  ]

  const maxCount = Math.max(totalEntered, 1)

  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12 }}>
        <Typography variant='h4'>📈 Pipeline · Funil de Leads</Typography>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap', mt: 1 }}>
          <Typography variant='body2' color='text.secondary'>
            Dados REAIS do Supabase · {supabaseTotal} leads de todas as buscas
          </Typography>
          {hasSupabase ? (
            <Chip label={`Supabase · ${supabaseTotal} leads`} size='small' color='success' variant='tonal' />
          ) : (
            <Chip label='Redis (última busca)' size='small' color='warning' variant='tonal' />
          )}
          <Chip label={`Score médio: ${avgScoreAll}/100`} size='small' color='info' variant='tonal' />
        </Box>
      </Grid>

      {/* Top funnel metrics */}
      <Grid size={{ xs: 12, sm: 4 }}>
        <CardStatVertical stats={totalEntered.toLocaleString('pt-BR')} title='Total de Leads'
          subtitle={hasSupabase ? `${categoryCounts.length} categorias` : 'Última busca Redis'}
          avatarColor='primary' avatarIcon='ri-funnel-line'
          trendNumber={String(totalEntered)} trend='positive' />
      </Grid>
      <Grid size={{ xs: 12, sm: 4 }}>
        <CardStatVertical stats={(stages[3].count + stages[4].count + stages[5].count).toLocaleString('pt-BR')}
          title='Solution Aware+ (Qualificados)'
          subtitle={`${totalEntered > 0 ? Math.round(((stages[3].count + stages[4].count + stages[5].count) / totalEntered) * 100) : 0}% do total`}
          avatarColor='warning' avatarIcon='ri-filter-3-line'
          trendNumber={String(stages[3].count + stages[4].count + stages[5].count)} trend='positive' />
      </Grid>
      <Grid size={{ xs: 12, sm: 4 }}>
        <CardStatVertical stats="0" title='Clientes'
          subtitle='S7 · aguardando CRM wire'
          avatarColor='success' avatarIcon='ri-user-heart-line'
          trendNumber="0" trend='negative' />
      </Grid>

      {/* Stage cards — clicáveis, levam ao /admin/leads com filtro */}
      <Grid size={{ xs: 12 }}>
        <Typography variant='h6' gutterBottom>Estágios do Funil</Typography>
        <Grid container spacing={3}>
          {stages.map((s) => {
            const pct = Math.round((s.count / maxCount) * 100)
            const href = s.filter ? `/${lang}/admin/leads?${s.filter}` : `/${lang}/admin/leads`

            return (
              <Grid key={s.stage} size={{ xs: 12, sm: 6, md: 3 }}>
                <Card sx={{ borderLeft: 4, borderColor: `${s.color}.main`, opacity: s.count === 0 ? 0.5 : 1 }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                      <Chip label={s.stage} color={s.color} size='small' />
                      <Typography variant='h5' fontWeight={700}>{s.count.toLocaleString('pt-BR')}</Typography>
                    </Box>
                    <Typography variant='subtitle2' fontWeight={600} gutterBottom>{s.label}</Typography>
                    <Typography variant='caption' color='text.secondary'>{s.desc}</Typography>
                    <LinearProgress variant='determinate' value={pct} color={s.color}
                      sx={{ mt: 2, height: 6, borderRadius: 3 }} />
                    <Typography variant='caption' color='text.secondary' sx={{ mt: 0.5, display: 'block' }}>
                      {pct}% do topo
                    </Typography>
                    {s.count > 0 && s.filter && (
                      <Button component={Link} href={href} size='small' variant='text' sx={{ mt: 1, fontSize: '0.7rem' }}>
                        Ver leads →
                      </Button>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            )
          })}
        </Grid>
      </Grid>

      {/* Categories from Supabase — clicáveis */}
      <Grid size={{ xs: 12, md: 6 }}>
        <Card>
          <CardContent>
            <Typography variant='h6' gutterBottom>📊 Top Categorias (Supabase)</Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {categoryCounts.length === 0 ? (
                <Typography variant='body2' color='text.secondary'>Execute a 1ª descoberta para popular.</Typography>
              ) : (
                categoryCounts.map((c) => (
                  <Box key={c.category} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Button component={Link} href={`/${lang}/admin/leads?category=${c.category}`}
                      size='small' sx={{ textTransform: 'none', fontWeight: 600, fontSize: '0.85rem' }}>
                      {c.label}
                    </Button>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <LinearProgress variant='determinate'
                        value={Math.round((c.count / totalEntered) * 100)}
                        sx={{ width: 80, height: 6, borderRadius: 3 }} />
                      <Typography variant='body2' fontWeight={700}>{c.count}</Typography>
                    </Box>
                  </Box>
                ))
              )}
            </Box>
          </CardContent>
        </Card>
      </Grid>

      {/* Conversion metrics */}
      <Grid size={{ xs: 12, md: 6 }}>
        <Card>
          <CardContent>
            <Typography variant='h6' gutterBottom>📊 Taxas de Conversão</Typography>
            {[
              { from: 'S0→S3', rate: totalEntered > 0 ? Math.round(((stages[3].count + stages[4].count + stages[5].count) / totalEntered) * 100) : 0, label: 'total → Solution Aware+ (qualificados)' },
              { from: 'S3→S5', rate: (stages[3].count + stages[4].count) > 0 ? Math.round((stages[5].count / Math.max(stages[3].count + stages[4].count + stages[5].count, 1)) * 100) : 0, label: 'qualificados → Most Aware (prontos)' },
              { from: 'S5→S7', rate: 0, label: 'Most Aware → clientes (CRM em desenvolvimento)' },
            ].map((conv) => (
              <Box key={conv.from} sx={{ mb: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant='body2' fontWeight={600}>{conv.from}</Typography>
                  <Typography variant='body2'>{conv.rate}%</Typography>
                </Box>
                <LinearProgress variant='determinate' value={conv.rate}
                  color={conv.rate >= 50 ? 'success' : conv.rate >= 25 ? 'warning' : 'error'}
                  sx={{ height: 8, borderRadius: 4 }} />
                <Typography variant='caption' color='text.secondary'>{conv.label}</Typography>
              </Box>
            ))}
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  )
}

// Category short labels
const CAT_SHORT: Record<string, string> = {
  dentist: '🦷 Dentistas', medical_aesthetic_clinic: '💉 Clínicas Estéticas',
  medical_clinic: '🏥 Clínicas Médicas', restaurant: '🍽️ Restaurantes',
  gym: '🏋️ Academias', lawyer: '⚖️ Advogados', barber_shop: '💈 Barbearias',
  pharmacy: '💊 Farmácias', veterinarian: '🐾 Veterinários',
  real_estate_agency: '🏠 Imobiliárias', accountant: '📊 Contadores',
  car_repair: '🔧 Oficinas', beauty_salon: '💇 Salões',
  psychologist: '🧠 Psicólogos', physical_therapist: '🦴 Fisioterapeutas',
  orthodontist: '🦷 Ortodontistas', pet_store: '🐶 Pet Shops',
  electrician: '🔌 Eletricistas', plumber: '🔧 Encanadores',
  cleaning_service: '🧹 Limpeza', ophthalmologist: '👁️ Oftalmologistas',
  cardiologist: '🫀 Cardiologistas', architect: '🏗️ Arquitetos',
  interior_designer: '🎨 Designers', pizza_restaurant: '🍕 Pizzarias',
  bakery: '🥖 Padarias', school: '📚 Escolas', driving_school: '🚗 Autoescolas',
  hotel: '🏨 Pousadas', 'Dental clinic': '🏥 Dental Clinic', 'Dentist': '🦷 Dentista',
  Endodontist: '🦷 Endodontista', Orthodontist: '🦷 Ortodontista',
}

export default PipelinePage
