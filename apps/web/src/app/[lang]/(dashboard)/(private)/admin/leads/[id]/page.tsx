
// adsentice · Admin / Lead Detail — ficha completa do lead
// 27 campos GMB + Pain Criteria aplicados + Canal de origem
import { redirect } from 'next/navigation'
import Grid from '@mui/material/Grid2'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import Chip from '@mui/material/Chip'
import Box from '@mui/material/Box'
import LinearProgress from '@mui/material/LinearProgress'
import Divider from '@mui/material/Divider'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableRow from '@mui/material/TableRow'
import CardStatVertical from '@components/card-statistics/Vertical'
import { getSessionUser } from '@/libs/supabase/server'

// Mock lead data — future: fetch from @adsentice/db + EVO-API MCP
interface LeadProfile {
  // ── GMB Profile (27 campos) ──
  gmb: {
    title: string; category: string; categories: string[]
    additional_categories: string[]; address: string; city: string
    district: string; country_code: string; postal_code: string
    phone: string; rating_value: number; rating_votes: number
    rating_distribution: Record<string, number>
    is_claimed: boolean; place_id: string; cid: string
    website: string; main_image: string; total_photos: number
    description: string; latitude: number; longitude: number
    business_status: string; price_level: number
    types: string[]
  }
  // ── Pain Score ──
  pain: {
    total: number; classification: string
    signals: Array<{ id: string; name: string; points: number; matched: boolean }>
  }
  // ── SEO ──
  seo: { score: number; keywords: number; avgPosition: number; topKeyword: string }
  // ── Channel ──
  channel: { source: string; discoveredAt: string; costUsd: number }
}

const MOCK_LEAD: LeadProfile = {
  gmb: {
    title: 'Clínica EstéticaXPTO', category: 'Clínica Estética',
    categories: ['Clínica Estética', 'Spa', 'Beleza'],
    additional_categories: ['Harmonização Facial'],
    address: 'Rua Augusta, 1500', city: 'São Paulo',
    district: 'Consolação', country_code: 'BR', postal_code: '01304-001',
    phone: '(11) 99999-1234', rating_value: 3.2, rating_votes: 8,
    rating_distribution: { '1': 2, '2': 1, '3': 2, '4': 2, '5': 1 },
    is_claimed: true, place_id: 'ChIJXX1234567890', cid: '9876543210',
    website: 'https://clinicaesteticaxpto.com.br', main_image: '',
    total_photos: 2, description: 'Especialistas em harmonização facial e tratamentos estéticos.',
    latitude: -23.5505, longitude: -46.6333, business_status: 'OPERATIONAL',
    price_level: 2,
    types: ['point_of_interest', 'establishment', 'health'],
  },
  pain: {
    total: 85, classification: '🔴 URGENTE',
    signals: [
      { id: 'T1.2', name: 'Reputação Tóxica', points: 35, matched: true },
      { id: 'T1.3', name: 'Negócio Estagnado', points: 20, matched: true },
      { id: 'T2.3', name: 'Perfil Abandonado', points: 20, matched: true },
      { id: 'T3.1', name: 'Sem Analytics', points: 10, matched: true },
      { id: 'T1.1', name: 'Website Invisível', points: 35, matched: false },
      { id: 'T1.4', name: 'Owner Ausente', points: 30, matched: false },
      { id: 'T1.5', name: 'Sem Presença Web', points: 25, matched: false },
    ],
  },
  seo: { score: 34, keywords: 6, avgPosition: 28, topKeyword: 'harmonização facial sp' },
  channel: { source: 'GMB (business_listings_search)', discoveredAt: '2026-07-12T02:32:00Z', costUsd: 0.015 },
}

const LeadDetail = async ({ params }: { params: Promise<{ lang: string; id: string }> }) => {
  const { lang } = await params

  const user = await getSessionUser()
  if (user?.role !== 'admin') redirect(`/${lang}/app`)

  const l = MOCK_LEAD
  const p = l.pain
  const g = l.gmb

  return (
    <Grid container spacing={6}>
      {/* Header */}
      <Grid size={{ xs: 12 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
          <Typography variant='h4'>{g.title}</Typography>
          <Chip label={p.classification} color='error' size='medium' variant='tonal' />
          <Chip label={`Score ${p.total}/100`} color='error' size='medium' />
        </Box>
        <Box sx={{ display: 'flex', gap: 2, mt: 1, flexWrap: 'wrap' }}>
          <Typography variant='body2' color='text.secondary'>
            📍 {g.address}, {g.district} · {g.city}/{g.country_code}
          </Typography>
          <Typography variant='body2' color='text.secondary'>
            📡 Canal: {l.channel.source} · ${l.channel.costUsd.toFixed(3)}
          </Typography>
          <Typography variant='body2' color='text.secondary'>
            🕐 {new Date(l.channel.discoveredAt).toLocaleDateString('pt-BR')}
          </Typography>
        </Box>
      </Grid>

      {/* ═══ ROW 1 · KEY METRICS ═══ */}
      <Grid size={{ xs: 6, sm: 3 }}>
        <CardStatVertical stats={`${g.rating_value}★`} title='Rating GMB' subtitle={`${g.rating_votes} votes · claimed=${g.is_claimed ? 'sim' : 'não'}`}
          avatarColor='warning' avatarIcon='ri-star-line' trendNumber={String(g.rating_votes)} trend='negative' />
      </Grid>
      <Grid size={{ xs: 6, sm: 3 }}>
        <CardStatVertical stats={`${l.seo.score}/100`} title='SEO Score' subtitle={`${l.seo.keywords} keywords · pos #${l.seo.avgPosition}`}
          avatarColor='error' avatarIcon='ri-search-line' trendNumber={String(l.seo.score)} trend='negative' />
      </Grid>
      <Grid size={{ xs: 6, sm: 3 }}>
        <CardStatVertical stats={`${g.total_photos}`} title='Fotos GMB' subtitle={g.total_photos < 3 ? '⚠️ Abaixo do ideal (≥3)' : '✅ OK'}
          avatarColor={g.total_photos < 3 ? 'warning' : 'success'} avatarIcon='ri-image-line' trendNumber={String(g.total_photos)} trend='negative' />
      </Grid>
      <Grid size={{ xs: 6, sm: 3 }}>
        <CardStatVertical stats={g.website ? '✅' : '❌'} title='Website' subtitle={g.website || 'Não detectado'}
          avatarColor={g.website ? 'success' : 'error'} avatarIcon='ri-global-line' trendNumber={g.website ? '1' : '0'} trend='positive' />
      </Grid>

      {/* ═══ ROW 2 · GMB PROFILE (27 campos) ═══ */}
      <Grid size={{ xs: 12, md: 7 }}>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant='h6'>📋 Perfil GMB (27 campos canônicos)</Typography>
              <Chip label='Fonte: DataForSEO' size='small' variant='outlined' />
            </Box>
            <Table size='small'>
              <TableBody>
                {[
                  ['Nome', g.title], ['Categoria Principal', g.category],
                  ['Categorias', g.categories.join(', ')],
                  ['Categorias Adicionais', g.additional_categories.join(', ') || '—'],
                  ['Endereço', g.address], ['Cidade', g.city],
                  ['Bairro', g.district], ['País', g.country_code],
                  ['CEP', g.postal_code], ['Telefone', g.phone],
                  ['É WhatsApp?', /9\d{4}/.test(g.phone) ? '✅ Sim' : '❌ Não'],
                  ['Rating', `${g.rating_value}★ (${g.rating_votes} votes)`],
                  ['Distribuição', Object.entries(g.rating_distribution).map(([k, v]) => `${k}★:${v}`).join(' ')],
                  ['Reivindicado', g.is_claimed ? '✅ Sim' : '⚠️ Não'],
                  ['Place ID', `${g.place_id.slice(0, 12)}...`],
                  ['CID', g.cid],
                  ['Website', g.website || '—'],
                  ['Foto Principal', g.main_image || '—'],
                  ['Total Fotos', String(g.total_photos)],
                  ['Descrição', g.description || '—'],
                  ['Coordenadas', `${g.latitude.toFixed(4)}, ${g.longitude.toFixed(4)}`],
                  ['Status', g.business_status],
                  ['Nível de Preço', '$'.repeat(g.price_level) || '—'],
                  ['Tipos Google', g.types.join(', ')],
                ].map(([label, value], i) => (
                  <TableRow key={i} sx={{ '&:nth-of-type(odd)': { bgcolor: 'action.hover' } }}>
                    <TableCell sx={{ fontWeight: 600, width: '40%', fontSize: '0.85rem' }}>{label}</TableCell>
                    <TableCell sx={{ fontSize: '0.85rem' }}>{value}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </Grid>

      {/* ═══ ROW 2B · PAIN SCORE BREAKDOWN ═══ */}
      <Grid size={{ xs: 12, md: 5 }}>
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant='h6' gutterBottom>🎯 Pain Criteria Aplicado</Typography>
            <Box sx={{ mb: 2 }}>
              <Typography variant='h2' fontWeight={800} color='error.main'>{p.total}</Typography>
              <Typography variant='body2'>de 100 pontos possíveis</Typography>
            </Box>
            <LinearProgress variant='determinate' value={p.total} color='error'
              sx={{ height: 8, borderRadius: 4, mb: 1 }} />
            <Typography variant='caption' color='text.secondary'>
              Classificação: <strong>{p.classification}</strong> (threshold ≥70)
            </Typography>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Typography variant='h6' gutterBottom>🔍 Sinais Detectados</Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {p.signals.map((sig) => (
                <Box key={sig.id}
                  sx={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    p: 1, borderRadius: 2,
                    bgcolor: sig.matched ? 'error.50' : 'grey.50',
                    border: '1px solid', borderColor: sig.matched ? 'error.200' : 'grey.200',
                  }}
                >
                  <Box>
                    <Typography variant='body2' fontWeight={600} color={sig.matched ? 'error.main' : 'text.disabled'}>
                      {sig.matched ? '✅' : '○'} {sig.id} {sig.name}
                    </Typography>
                  </Box>
                  <Chip
                    label={sig.matched ? `+${sig.points} pts` : '0 pts'}
                    size='small'
                    color={sig.matched ? 'error' : 'default'}
                    variant={sig.matched ? 'tonal' : 'outlined'}
                  />
                </Box>
              ))}
            </Box>
          </CardContent>
        </Card>

        {/* Recommended actions */}
        <Card sx={{ mt: 3, bgcolor: 'var(--pastel-coral)' }}>
          <CardContent>
            <Typography variant='h6' gutterBottom>🚀 Ações Recomendadas</Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {[
                { pri: 1, action: 'Responder reviews negativas', impact: 'Urgente — 3 reviews ≤2★ sem resposta', credit: 0 },
                { pri: 2, action: 'Adicionar +5 fotos no GMB', impact: 'Perfil com só 2 fotos — meta é ≥8', credit: 0 },
                { pri: 3, action: 'Otimizar SEO on-page', impact: `Score ${l.seo.score}/100 — meta >70`, credit: 10 },
                { pri: 4, action: 'Instalar Google Analytics', impact: 'Site sem medição de tráfego', credit: 0 },
              ].map((a) => (
                <Box key={a.pri} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box>
                    <Typography variant='body2' fontWeight={600}>
                      {a.pri}. {a.action}
                    </Typography>
                    <Typography variant='caption' color='text.secondary'>{a.impact}</Typography>
                  </Box>
                  <Chip label={a.credit === 0 ? 'grátis' : `${a.credit} créditos`} size='small'
                    color={a.credit === 0 ? 'success' : 'warning'} variant='tonal' />
                </Box>
              ))}
            </Box>
          </CardContent>
        </Card>
      </Grid>

      {/* ═══ ROW 3 · CANAL DE ORIGEM ═══ */}
      <Grid size={{ xs: 12 }}>
        <Card>
          <CardContent>
            <Typography variant='h6' gutterBottom>📡 Canal de Origem & Custos</Typography>
            <Grid container spacing={3}>
              <Grid size={{ xs: 12, sm: 4 }}>
                <Typography variant='caption' color='text.secondary'>Plataforma</Typography>
                <Typography variant='h6'>🏪 Google Meu Negócio</Typography>
                <Typography variant='body2'>business_listings_search → business_profile_gmb</Typography>
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <Typography variant='caption' color='text.secondary'>Custo de Aquisição</Typography>
                <Typography variant='h6'>$0.015 (R$0,08)</Typography>
                <Typography variant='body2'>1 chamada DataForSEO · enriquecimento pendente</Typography>
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <Typography variant='caption' color='text.secondary'>Pipeline Stage</Typography>
                <Typography variant='h6'>S3 · Análise</Typography>
                <Typography variant='body2'>Descoberto · aguardando scoring completo</Typography>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  )
}

export default LeadDetail
