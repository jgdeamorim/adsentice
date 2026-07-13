
// adsentice · Admin / Leads — lista REAIS do Supabase (60 leads populados)
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

import { Pool } from 'pg'

import CardStatVertical from '@components/card-statistics/Vertical'
import { getSessionUser } from '@/libs/supabase/server'

interface LeadRow {
  id: string; title: string | null; category: string | null
  address: string | null; rating_value: number | null; rating_votes: number | null
  is_claimed: boolean | null; website: string | null; phone: string | null
  total_photos: number | null; description: string | null
  score_compound: number; score_fit: number; score_engagement: number; score_intent: number
  schwartz_label: string; schwartz_level: number
  enrichment_level: number; contact_methods: string[] | null
  created_at: string
}

const LeadsPage = async ({ params }: { params: Promise<{ lang: string }> }) => {
  const { lang } = await params
  const user = await getSessionUser()

  if (user?.role !== 'admin') redirect(`/${lang}/app`)

  // ═══ Dados REAIS do Supabase (pg Pool) ═══
  let leads: LeadRow[] = []
  let totalScore = 0
  let withWebsite = 0
  let withPhone = 0
  let withWhatsApp = 0

  try {
    const pool = new Pool({
      host: 'aws-0-ca-central-1.pooler.supabase.com', port: 6543, database: 'postgres',
      user: 'postgres.tdigauruusdhnpvppixb', password: 'pmaxnpmiJ6WfcX46',
      ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 5000,
    })

    const { rows } = await pool.query(
      `SELECT DISTINCT ON (place_id)
              id, title, category, address, rating_value, rating_votes, is_claimed,
              website, phone, total_photos, description,
              score_compound, score_fit, score_engagement, score_intent,
              schwartz_label, schwartz_level, enrichment_level, contact_methods, created_at
       FROM discovery_listings
       ORDER BY place_id, enrichment_level DESC, score_compound DESC, created_at DESC
       LIMIT 200`
    )

    leads = rows as LeadRow[]
    totalScore = leads.length > 0 ? Math.round(leads.reduce((s, l) => s + l.score_compound, 0) / leads.length) : 0
    withWebsite = leads.filter(l => l.website).length
    withPhone = leads.filter(l => l.phone).length
    withWhatsApp = leads.filter(l => l.phone && /(?:9\d{4}-\d{4}|9\d{8}|\(?\d{2}\)?\s*9\d{4}-?\d{4})/.test(l.phone)).length

    // Detect WhatsApp in phone
    await pool.end()
  } catch { /* Supabase offline */ }

  const schwartzCounts = { Unaware: 0, 'Problem Aware': 0, 'Solution Aware': 0, 'Product Aware': 0, 'Most Aware': 0 }

  leads.forEach(l => { const k = l.schwartz_label as keyof typeof schwartzCounts;

 if (k in schwartzCounts) schwartzCounts[k]++ })

  const contactLabel = (methods: string[] | null) => {
    if (!methods || methods.length === 0) return 'Não detectado'
    if (methods.includes('whatsapp')) return '💬 WhatsApp'
    if (methods.includes('phone_fixo')) return '📞 Telefone'
    if (methods.includes('website_proprio')) return '🌐 Site'
    if (methods.includes('apenas_gmb')) return '📍 Apenas GMB'
    
return methods.join(', ')
  }

  const scoreBadge = (level: number, label: string) => {
    const colors: Record<string, string> = { Unaware: '#9e9e9e', 'Problem Aware': '#42a5f5', 'Solution Aware': '#ffa726', 'Product Aware': '#ef5350', 'Most Aware': '#d32f2f' }

    
return <Chip label={`${label} · ${level}`} size='small' sx={{ bgcolor: colors[label] || '#999', color: '#fff', fontWeight: 700, minWidth: 70 }} />
  }

  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12 }}>
        <Typography variant='h4'>📋 Leads · Base Real</Typography>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap', mt: 1 }}>
          <Typography variant='body2' color='text.secondary'>
            {leads.length} leads do Supabase · discovery_listings · Score Composto (Pain Criteria v1.2)
          </Typography>
          <Chip label='Dados REAIS' size='small' color='success' variant='tonal' />
        </Box>
      </Grid>

      {/* Top KPIs */}
      <Grid size={{ xs: 6, sm: 2.4 }}>
        <CardStatVertical stats={leads.length.toString()} title='Total Leads'
          subtitle='Supabase discovery_listings' avatarColor='primary' avatarIcon='ri-database-2-line'
          trendNumber={String(leads.length)} trend='positive' />
      </Grid>
      <Grid size={{ xs: 6, sm: 2.4 }}>
        <CardStatVertical stats={`${totalScore}/100`} title='Score Médio'
          subtitle={`${leads.filter(l=>l.score_compound>=50).length} Solution Aware+`} avatarColor='warning' avatarIcon='ri-bar-chart-line'
          trendNumber={String(totalScore)} trend='positive' />
      </Grid>
      <Grid size={{ xs: 6, sm: 2.4 }}>
        <CardStatVertical stats={withPhone.toString()} title='Com Telefone'
          subtitle={`${withWhatsApp} WhatsApp · ${withPhone - withWhatsApp} fixo`} avatarColor='success' avatarIcon='ri-phone-line'
          trendNumber={String(withPhone)} trend='positive' />
      </Grid>
      <Grid size={{ xs: 6, sm: 2.4 }}>
        <CardStatVertical stats={withWebsite.toString()} title='Com Website'
          subtitle={`${leads.filter(l=>l.enrichment_level>0).length} enriquecidos L1`} avatarColor='info' avatarIcon='ri-global-line'
          trendNumber={String(withWebsite)} trend='positive' />
      </Grid>
      <Grid size={{ xs: 6, sm: 2.4 }}>
        <CardStatVertical stats={leads.filter(l=>l.enrichment_level>0).length.toString()} title='L1 Enriquecidos'
          subtitle='27 campos GMB canônicos' avatarColor='error' avatarIcon='ri-sparkling-line'
          trendNumber={String(leads.filter(l=>l.enrichment_level>0).length)} trend='positive' />
      </Grid>

      {/* Schwartz distribution */}
      <Grid size={{ xs: 12 }}>
        <Card><CardContent>
          <Typography variant='subtitle2' fontWeight={600} gutterBottom>📊 Distribuição Schwartz</Typography>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            {Object.entries(schwartzCounts).map(([label, count], i) => {
              const colors = ['#9e9e9e', '#42a5f5', '#ffa726', '#ef5350', '#d32f2f']
              const pct = leads.length > 0 ? Math.round((count / leads.length) * 100) : 0

              
return (
                <Box key={label} sx={{ flex: 1, minWidth: 100, textAlign: 'center' }}>
                  <Typography variant='h6' fontWeight={800} sx={{ color: colors[i] }}>{count}</Typography>
                  <Typography variant='caption' color='text.secondary'>{label}</Typography>
                  <LinearProgress variant='determinate' value={pct} sx={{ height: 4, borderRadius: 2, mt: 0.5, bgcolor: `${colors[i]}22`, '& .MuiLinearProgress-bar': { bgcolor: colors[i] } }} />
                </Box>
              )
            })}
          </Box>
        </CardContent></Card>
      </Grid>

      {/* Leads Table */}
      <Grid size={{ xs: 12 }}>
        <TableContainer component={Paper}>
          <Table size='small'>
            <TableHead>
              <TableRow>
                <TableCell width={70}>Score</TableCell>
                <TableCell>Nome</TableCell>
                <TableCell>Categoria</TableCell>
                <TableCell align='right'>⭐</TableCell>
                <TableCell align='right'>📝</TableCell>
                <TableCell>Contato</TableCell>
                <TableCell>Site</TableCell>
                <TableCell width={60}>L1</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {leads.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8}>
                    <Typography variant='body2' color='text.secondary' sx={{ textAlign: 'center', py: 4 }}>
                      Nenhum lead no Supabase. Execute a 1ª busca no Discovery Engine.
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                leads.map((l) => (
                  <TableRow key={l.id} hover>
                    <TableCell>
                      {scoreBadge(l.schwartz_level, l.schwartz_label)}
                      <Typography variant='caption' sx={{ display: 'block', mt: 0.3, textAlign: 'center' }}>
                        {l.score_compound}/100
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography fontWeight={600} fontSize='0.85rem' noWrap sx={{ maxWidth: 250 }}>{l.title || '—'}</Typography>
                      <Typography variant='caption' color='text.secondary' noWrap sx={{ maxWidth: 250 }}>
                        {l.address?.substring(0, 50)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip label={l.category || '?'} size='small' variant='outlined' />
                    </TableCell>
                    <TableCell align='right'>
                      <Typography variant='body2' fontWeight={600}>{l.rating_value?.toFixed(1) || '—'}★</Typography>
                    </TableCell>
                    <TableCell align='right'>
                      <Typography variant='body2'>{l.rating_votes || 0}</Typography>
                    </TableCell>
                    <TableCell>
                      <Chip label={contactLabel(l.contact_methods)} size='small'
                        color={l.contact_methods?.includes('whatsapp') ? 'success' : l.contact_methods?.includes('phone_fixo') ? 'warning' : 'default'}
                        variant='tonal' />
                    </TableCell>
                    <TableCell>
                      {l.website ? (
                        <Chip label='🌐 Sim' size='small' color='success' variant='tonal' />
                      ) : (
                        <Chip label='—' size='small' variant='outlined' sx={{ opacity: 0.5 }} />
                      )}
                    </TableCell>
                    <TableCell>
                      <Chip label={l.enrichment_level > 0 ? '✅' : '⬜'} size='small'
                        color={l.enrichment_level > 0 ? 'success' : 'default'} variant='tonal' />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Grid>
    </Grid>
  )
}

export default LeadsPage
