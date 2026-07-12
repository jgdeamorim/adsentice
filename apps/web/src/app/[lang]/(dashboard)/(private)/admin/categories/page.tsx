
// adsentice · Admin / Categorias — ranking de nichos alinhado ao Discovery Engine
// 12 categorias do Discovery · métricas mapeadas aos campos canônicos GMB
// Dados: simulados até wire do business_listings_search por categoria
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

// ═══ 12 categorias — MESMA lista do Discovery Engine ═══
// Cada métrica é mapeada para campos canônicos do perfil GMB (27 campos).
// Dados simulados (SP, raio 10km) até o wire do business_listings_search.
// Fonte real: EVO-API MCP :7700 → DataForSEO business_data/business_listings/search/live

interface CategoryAnalysis {
  id: string            // mesmo ID do Discovery CATS
  label: string         // label emoji + nome
  gmbCategoryCode: string // categoria Google My Business (canonical)
  totalEst: number      // total_count do business_listings_search
  painPct: number       // % com score composto ≥ 30 (Problem Aware+)
  leads: number         // % com score ≥ 50 (Solution Aware+)
  avgScore: number      // média do score composto
  // Campos GMB que mais contribuem para o score desta categoria
  topSignals: string[]  // IDs dos sinais (F1-F10, E1-E7, I1-I3)
}

const CATEGORIES: CategoryAnalysis[] = [
  {
    id: 'dentist', label: '🦷 Dentistas', gmbCategoryCode: 'dentist',
    totalEst: 5761, painPct: 52, leads: 1728, avgScore: 48,
    topSignals: ['I1:nao_reivindicado', 'E1:rating_4+', 'E3:fotos_min', 'F3:tem_site'],
  },
  {
    id: 'medical_aesthetic_clinic', label: '💉 Clínicas Estéticas', gmbCategoryCode: 'medical_aesthetic_clinic',
    totalEst: 3800, painPct: 63, leads: 2394, avgScore: 56,
    topSignals: ['E3:fotos_min', 'I1:nao_reivindicado', 'I2:rating_baixo', 'F3:tem_site'],
  },
  {
    id: 'medical_clinic', label: '🏥 Clínicas Médicas', gmbCategoryCode: 'medical_clinic',
    totalEst: 4200, painPct: 45, leads: 1890, avgScore: 42,
    topSignals: ['I1:nao_reivindicado', 'E1:rating_4+', 'F2:porte', 'E5:whatsapp'],
  },
  {
    id: 'restaurant', label: '🍽️ Restaurantes', gmbCategoryCode: 'restaurant',
    totalEst: 8900, painPct: 38, leads: 3382, avgScore: 36,
    topSignals: ['E3:fotos_min', 'I1:nao_reivindicado', 'E1:rating_4+', 'E5:whatsapp'],
  },
  {
    id: 'gym', label: '🏋️ Academias', gmbCategoryCode: 'gym',
    totalEst: 2200, painPct: 48, leads: 1056, avgScore: 44,
    topSignals: ['E3:fotos_min', 'I1:nao_reivindicado', 'F3:tem_site', 'E5:whatsapp'],
  },
  {
    id: 'lawyer', label: '⚖️ Advogados', gmbCategoryCode: 'lawyer',
    totalEst: 3500, painPct: 55, leads: 1925, avgScore: 50,
    topSignals: ['I1:nao_reivindicado', 'F3:tem_site', 'E1:rating_4+', 'F9:dominio_proprio'],
  },
  {
    id: 'barber_shop', label: '💈 Barbearias', gmbCategoryCode: 'barber_shop',
    totalEst: 4800, painPct: 58, leads: 2784, avgScore: 52,
    topSignals: ['E3:fotos_min', 'I1:nao_reivindicado', 'E5:whatsapp', 'E1:rating_4+'],
  },
  {
    id: 'pharmacy', label: '💊 Farmácias', gmbCategoryCode: 'pharmacy',
    totalEst: 2800, painPct: 30, leads: 840, avgScore: 32,
    topSignals: ['F2:porte', 'F3:tem_site', 'E5:whatsapp', 'I1:nao_reivindicado'],
  },
  {
    id: 'veterinarian', label: '🐾 Veterinários', gmbCategoryCode: 'veterinarian',
    totalEst: 1500, painPct: 60, leads: 900, avgScore: 55,
    topSignals: ['I1:nao_reivindicado', 'E3:fotos_min', 'E1:rating_4+', 'F3:tem_site'],
  },
  {
    id: 'real_estate_agency', label: '🏠 Imobiliárias', gmbCategoryCode: 'real_estate_agency',
    totalEst: 1900, painPct: 42, leads: 798, avgScore: 38,
    topSignals: ['I1:nao_reivindicado', 'F3:tem_site', 'F9:dominio_proprio', 'E3:fotos_min'],
  },
  {
    id: 'accountant', label: '📊 Contadores', gmbCategoryCode: 'accountant',
    totalEst: 1200, painPct: 40, leads: 480, avgScore: 35,
    topSignals: ['I1:nao_reivindicado', 'F3:tem_site', 'F2:porte', 'E5:whatsapp'],
  },
  {
    id: 'car_repair', label: '🔧 Oficinas', gmbCategoryCode: 'car_repair',
    totalEst: 3200, painPct: 56, leads: 1792, avgScore: 50,
    topSignals: ['I1:nao_reivindicado', 'E3:fotos_min', 'E5:whatsapp', 'E1:rating_4+'],
  },
]

// ── Mapeamento: sinais canônicos → campos GMB ──
const SIGNAL_TO_GMB_FIELD: Record<string, string> = {
  'I1:nao_reivindicado': 'is_claimed (bool)',
  'E1:rating_4+': 'rating_value (f64)',
  'E3:fotos_min': 'total_photos (i64) + PHOTOS_BENCHMARKS',
  'F3:tem_site': 'website (string?)',
  'F2:porte': 'rating_votes (i64) ≥ 10',
  'E5:whatsapp': 'phone (string?) → detectWhatsApp()',
  'F9:dominio_proprio': 'website → detectDomainType()',
  'I2:rating_baixo': 'rating_value ≤ 3.5 + rating_votes ≥ 5',
}

const CategoriesPage = async ({ params }: { params: Promise<{ lang: string }> }) => {
  const { lang } = await params
  const user = await getSessionUser()

  if (user?.role !== 'admin') redirect(`/${lang}/app`)

  const totalBusinesses = CATEGORIES.reduce((s, c) => s + c.totalEst, 0)
  const totalLeads = CATEGORIES.reduce((s, c) => s + c.leads, 0)
  const avgPain = Math.round(totalLeads / totalBusinesses * 100)
  const bestCategory = CATEGORIES.reduce((best, c) => c.painPct > best.painPct ? c : best, CATEGORIES[0])
  const topScoreCategory = CATEGORIES.reduce((best, c) => c.avgScore > best.avgScore ? c : best, CATEGORIES[0])

  // Schwartz distribution agregada (simulada)
  const schwartzDist = [
    { label: 'Unaware', count: Math.round(totalBusinesses * 0.15), color: '#9e9e9e' },
    { label: 'Problem Aware', count: Math.round(totalBusinesses * 0.30), color: '#42a5f5' },
    { label: 'Solution Aware', count: Math.round(totalBusinesses * 0.35), color: '#ffa726' },
    { label: 'Product Aware', count: Math.round(totalBusinesses * 0.15), color: '#ef5350' },
    { label: 'Most Aware', count: Math.round(totalBusinesses * 0.05), color: '#d32f2f' },
  ]

  // Ordena por painPct (maior dor = prioridade de prospecção)
  const ranked = [...CATEGORIES].sort((a, b) => b.painPct - a.painPct)

  return (
    <Grid container spacing={6}>
      {/* ── Header ── */}
      <Grid size={{ xs: 12 }}>
        <Typography variant='h4'>📁 Categorias · Discovery Engine</Typography>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap', mt: 1 }}>
          <Typography variant='body2' color='text.secondary'>
            12 categorias alinhadas ao Discovery · Métricas mapeadas aos 27 campos canônicos GMB
          </Typography>
          <Chip label='Pain Criteria v1.2' size='small' color='primary' variant='tonal' />
          <Chip label='Score Composto' size='small' color='secondary' variant='tonal' />
        </Box>
      </Grid>

      {/* ── Top KPI Cards ── */}
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <CardStatVertical
          stats={totalBusinesses.toLocaleString('pt-BR')}
          title='Negócios Mapeados'
          subtitle='total_count · business_listings_search'
          avatarColor='primary'
          avatarIcon='ri-store-2-line'
          trendNumber={String(totalBusinesses)}
          trend='positive'
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <CardStatVertical
          stats={totalLeads.toLocaleString('pt-BR')}
          title='Solution Aware+ (Leads)'
          subtitle={`Score composto ≥ 50 · ${avgPain}% dos negócios`}
          avatarColor='warning'
          avatarIcon='ri-user-search-line'
          trendNumber={String(avgPain)}
          trend='positive'
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <CardStatVertical
          stats={`${bestCategory.painPct}%`}
          title={`Maior Dor: ${bestCategory.label.split(' ').pop()}`}
          subtitle={`${bestCategory.totalEst.toLocaleString('pt-BR')} negócios · ${bestCategory.leads.toLocaleString('pt-BR')} leads`}
          avatarColor='error'
          avatarIcon='ri-alert-line'
          trendNumber={String(bestCategory.painPct)}
          trend='negative'
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <CardStatVertical
          stats={`${topScoreCategory.avgScore}/100`}
          title={`Melhor Score: ${topScoreCategory.label.split(' ').pop()}`}
          subtitle={`Score médio · ${topScoreCategory.gmbCategoryCode}`}
          avatarColor='success'
          avatarIcon='ri-bar-chart-line'
          trendNumber={String(topScoreCategory.avgScore)}
          trend='positive'
        />
      </Grid>

      {/* ── Distribuição Schwartz Agregada ── */}
      <Grid size={{ xs: 12 }}>
        <Card>
          <CardContent>
            <Typography variant='h6' gutterBottom>📊 Distribuição Schwartz · Todas as Categorias (SP 10km)</Typography>
            <Typography variant='caption' color='text.secondary' sx={{ mb: 2, display: 'block' }}>
              Projeção baseada em dados simulados. Atualizada com dados REAIS ao executar busca por categoria.
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              {schwartzDist.map((s) => (
                <Box key={s.label} sx={{ flex: 1, minWidth: 100, textAlign: 'center' }}>
                  <Typography variant='h5' fontWeight={800} sx={{ color: s.color }}>
                    {s.count.toLocaleString('pt-BR')}
                  </Typography>
                  <Typography variant='caption' color='text.secondary'>{s.label}</Typography>
                  <LinearProgress variant='determinate' value={Math.round((s.count / totalBusinesses) * 100)}
                    sx={{ height: 6, borderRadius: 3, mt: 0.5, bgcolor: `${s.color}22`, '& .MuiLinearProgress-bar': { bgcolor: s.color } }} />
                </Box>
              ))}
            </Box>
          </CardContent>
        </Card>
      </Grid>

      {/* ── Category Ranking Table ── */}
      <Grid size={{ xs: 12 }}>
        <Typography variant='h6' gutterBottom>
          🏆 Ranking por Dor (Pain % · Problem Aware+)
          <Chip label='Prioridade de Prospecção' size='small' color='error' variant='tonal' sx={{ ml: 2 }} />
        </Typography>
        <TableContainer component={Paper}>
          <Table size='small'>
            <TableHead>
              <TableRow>
                <TableCell width={40}>#</TableCell>
                <TableCell>Categoria</TableCell>
                <TableCell>Código GMB</TableCell>
                <TableCell align='right'>Negócios</TableCell>
                <TableCell width={180}>% Dor</TableCell>
                <TableCell align='right'>Leads (Score≥50)</TableCell>
                <TableCell align='right'>Score Médio</TableCell>
                <TableCell>Top Sinais GMB</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {ranked.map((cat, idx) => {
                const severity = cat.painPct >= 55 ? 'error' : cat.painPct >= 40 ? 'warning' : 'info'
                const scoreSeverity = cat.avgScore >= 55 ? 'error' : cat.avgScore >= 40 ? 'warning' : 'info'

                return (
                  <TableRow key={cat.id} hover>
                    <TableCell>
                      <Typography fontWeight={700} color='text.secondary'>{idx + 1}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography fontWeight={600} fontSize='0.9rem'>{cat.label}</Typography>
                    </TableCell>
                    <TableCell>
                      <Chip label={cat.gmbCategoryCode} size='small' variant='outlined' sx={{ fontFamily: 'monospace', fontSize: '0.7rem' }} />
                    </TableCell>
                    <TableCell align='right'>
                      <Typography fontWeight={600}>{cat.totalEst.toLocaleString('pt-BR')}</Typography>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <LinearProgress
                          variant='determinate'
                          value={cat.painPct}
                          color={severity}
                          sx={{ flex: 1, height: 7, borderRadius: 3 }}
                        />
                        <Typography variant='caption' fontWeight={700} width={36}>
                          {cat.painPct}%
                        </Typography>
                        <Chip
                          label={cat.painPct >= 55 ? 'Alta' : cat.painPct >= 40 ? 'Média' : 'Baixa'}
                          size='small'
                          color={severity}
                          variant='tonal'
                          sx={{ minWidth: 55 }}
                        />
                      </Box>
                    </TableCell>
                    <TableCell align='right'>
                      <Typography fontWeight={600}>{cat.leads.toLocaleString('pt-BR')}</Typography>
                      <Typography variant='caption' color='text.secondary'>
                        {Math.round((cat.leads / cat.totalEst) * 100)}% conversão
                      </Typography>
                    </TableCell>
                    <TableCell align='right'>
                      <Chip label={`${cat.avgScore}/100`} size='small' color={scoreSeverity} variant='tonal' />
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                        {cat.topSignals.map((sig) => (
                          <TooltipWrapper key={sig} signal={sig} />
                        ))}
                      </Box>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Grid>

      {/* ── Signal ↔ GMB Field Mapping ── */}
      <Grid size={{ xs: 12, md: 7 }}>
        <Card>
          <CardContent>
            <Typography variant='h6' gutterBottom>🔗 Sinais de Score → Campos GMB Canônicos</Typography>
            <Typography variant='body2' color='text.secondary' sx={{ mb: 2 }}>
              Cada sinal do Pain Criteria v1.2 é calculado a partir de campos REAIS do perfil Google Meu Negócio
              (27 campos canônicos · EVO-API translator).
            </Typography>
            <Table size='small'>
              <TableHead>
                <TableRow>
                  <TableCell>Sinal</TableCell>
                  <TableCell>Dimensão</TableCell>
                  <TableCell>Campo GMB Canônico</TableCell>
                  <TableCell>Tipo</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {[
                  ['I1', 'Intent (25pts)', 'is_claimed', 'bool'],
                  ['E1', 'Engagement (15pts)', 'rating_value', 'f64'],
                  ['E3', 'Engagement (10pts)', 'total_photos + PHOTOS_BENCHMARKS', 'i64 + lookup'],
                  ['F3', 'Fit (10pts)', 'website', 'string?'],
                  ['F2', 'Fit (10pts)', 'rating_votes', 'i64'],
                  ['E5', 'Engagement (10pts)', 'phone → detectWhatsApp()', 'string? → bool'],
                  ['F9', 'Fit (5pts)', 'website → detectDomainType()', 'string? → enum'],
                  ['I2', 'Intent (20pts)', 'rating_value ≤ 3.5 + rating_votes ≥ 5', 'f64 + i64'],
                  ['F7', 'Fit (5pts)', 'description', 'string?'],
                  ['F10', 'Fit (5pts)', 'business_status', 'string?'],
                  ['F6', 'Fit (5pts)', 'work_hours', 'object?'],
                  ['F8', 'Fit (5pts)', 'categories[]', 'string[]?'],
                ].map(([sig, dim, field, type]) => (
                  <TableRow key={sig}>
                    <TableCell>
                      <Chip label={sig} size='small' color={dim.includes('Intent') ? 'error' : dim.includes('Engagement') ? 'warning' : 'primary'} variant='tonal' />
                    </TableCell>
                    <TableCell>
                      <Typography variant='caption'>{dim}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant='caption' sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>{field}</Typography>
                    </TableCell>
                    <TableCell>
                      <Chip label={type} size='small' variant='outlined' sx={{ fontFamily: 'monospace', fontSize: '0.65rem' }} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </Grid>

      {/* ── Data Pipeline ── */}
      <Grid size={{ xs: 12, md: 5 }}>
        <Card>
          <CardContent>
            <Typography variant='h6' gutterBottom>⚙️ Pipeline de Dados</Typography>
            <Typography variant='body2' color='text.secondary' sx={{ mb: 2 }}>
              Como os dados chegam do Google até esta página.
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {[
                { step: '1', label: 'Discovery', desc: 'Usuário seleciona categorias + cidade + raio no Discovery Engine', icon: 'ri-search-line' },
                { step: '2', label: 'EVO-API MCP :7700', desc: 'business_listings_search → DataForSEO LIVE ($0.015/busca)', icon: 'ri-plug-line' },
                { step: '3', label: '27 campos GMB', desc: 'title, category, rating, reviews, photos, is_claimed, website, phone, address, description...', icon: 'ri-database-2-line' },
                { step: '4', label: 'Scoring Engine', desc: 'scoring.ts: Fit × 0.40 + Engagement × 0.35 + Intent × 0.25 = Score Composto', icon: 'ri-brain-line' },
                { step: '5', label: 'Schwartz Classifier', desc: 'Score 0-100 → 5 níveis (Unaware → Most Aware) com regras de abordagem', icon: 'ri-bar-chart-line' },
                { step: '6', label: 'Categories Ranking', desc: 'Agregação por categoria GMB: total, pain%, leads, avgScore, topSignals', icon: 'ri-pie-chart-line' },
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

      {/* ── Data Source Warning ── */}
      <Grid size={{ xs: 12 }}>
        <Alert severity='info' variant='outlined'>
          <Typography variant='body2' fontWeight={600}>
            📊 Dados simulados — alinhados ao Discovery Engine
          </Typography>
          <Typography variant='caption'>
            Os números acima são projeções baseadas na distribuição esperada das 12 categorias do Discovery.
            Para dados REAIS: executar <code>business_listings_search</code> por categoria no EVO-API MCP :7700
            (custo: ~$0.18 para as 12 categorias em SP, raio 10km).
            Os percentuais de dor e scores médios serão calculados pelo Scoring Engine (scoring.ts) usando
            os 27 campos canônicos do perfil GMB.
          </Typography>
          <Box sx={{ mt: 1, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Chip label='Fonte: business_listings_search' size='small' variant='outlined' />
            <Chip label='Score: Fit×0.40+Eng×0.35+Int×0.25' size='small' variant='outlined' />
            <Chip label='27 campos GMB canônicos' size='small' variant='outlined' />
          </Box>
        </Alert>
      </Grid>
    </Grid>
  )
}

// ── Helper: Tooltip wrapper for signal chips ──
function TooltipWrapper({ signal }: { signal: string }) {
  const field = SIGNAL_TO_GMB_FIELD[signal] || 'campo GMB canônico'
  const dim = signal.startsWith('I') ? 'error' as const : signal.startsWith('E') ? 'warning' as const : 'primary' as const

  return (
    <Chip
      label={signal.split(':')[0]}
      size='small'
      color={dim}
      variant='tonal'
      title={`${signal} → ${field}`}
      sx={{ fontFamily: 'monospace', fontSize: '0.65rem', cursor: 'help' }}
    />
  )
}

export default CategoriesPage
