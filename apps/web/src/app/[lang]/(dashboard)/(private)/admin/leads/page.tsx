
// adsentice · Admin / Leads — dados REAIS do Supabase com paginação e filtros
import { redirect } from 'next/navigation'
import Link from 'next/link'

import Grid from '@mui/material/Grid2'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import Chip from '@mui/material/Chip'
import Box from '@mui/material/Box'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Paper from '@mui/material/Paper'
import Button from '@mui/material/Button'

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

const PER_PAGE = 30

const LeadsPage = async ({ params, searchParams }: {
  params: Promise<{ lang: string }>
  searchParams: Promise<{ category?: string; schwartz?: string; page?: string; search?: string }>
}) => {
  const { lang } = await params
  const sp = await searchParams
  const filterCategory = sp.category || ''
  const filterSchwartz = parseInt(sp.schwartz || '0') || 0
  const filterSearch = sp.search || ''
  const currentPage = Math.max(1, parseInt(sp.page || '1') || 1)
  const offset = (currentPage - 1) * PER_PAGE

  const user = await getSessionUser()

  if (user?.role !== 'admin') redirect(`/${lang}/app`)

  // ═══ Dados REAIS do Supabase ═══
  let leads: LeadRow[] = []
  let totalCount = 0
  let totalScore = 0
  let withWebsite = 0
  let withPhone = 0
  let categories: { category: string; count: number }[] = []
  let schwartzDist: { level: number; label: string; count: number }[] = []

  try {
    const pool = new Pool({
      host: 'aws-0-ca-central-1.pooler.supabase.com', port: 6543, database: 'postgres',
      user: 'postgres.tdigauruusdhnpvppixb', password: 'pmaxnpmiJ6WfcX46',
      ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 5000,
    })

    const conditions: string[] = []
    const vals: any[] = []
    let idx = 1

    if (filterCategory) { conditions.push(`dl.category = $${idx++}`); vals.push(filterCategory) }
    if (filterSchwartz > 0) { conditions.push(`dl.schwartz_level = $${idx++}`); vals.push(filterSchwartz) }
    if (filterSearch) { conditions.push(`dl.title ILIKE $${idx++}`); vals.push(`%${filterSearch}%`) }
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

    // Paginated query with DISTINCT ON
    const { rows } = await pool.query(
      `SELECT * FROM (
        SELECT DISTINCT ON (dl.place_id)
          dl.id, dl.title, dl.category, dl.address, dl.rating_value, dl.rating_votes, dl.is_claimed,
          dl.website, dl.phone, dl.total_photos, dl.description,
          dl.score_compound, dl.score_fit, dl.score_engagement, dl.score_intent,
          dl.schwartz_label, dl.schwartz_level, dl.enrichment_level, dl.contact_methods, dl.created_at
        FROM discovery_listings dl
        ${whereClause}
        ORDER BY dl.place_id, dl.enrichment_level DESC, dl.score_compound DESC
      ) sub
      ORDER BY sub.score_compound DESC, sub.created_at DESC
      LIMIT ${PER_PAGE} OFFSET ${offset}`,
      vals
    )

    leads = rows as LeadRow[]

    // Count with DISTINCT ON
    const countRes = await pool.query(
      `SELECT COUNT(*) as n FROM (
        SELECT DISTINCT ON (dl.place_id) dl.id FROM discovery_listings dl ${whereClause}
      ) sub`,
      vals
    )

    totalCount = parseInt(countRes.rows[0].n) || 0

    // Stats (sem filtro — todas as buscas)
    const [scoreRes, webRes, phoneRes, catRes, distRes] = await Promise.all([
      pool.query('SELECT ROUND(AVG(score_compound))::INTEGER as avg FROM (SELECT DISTINCT ON (place_id) score_compound FROM discovery_listings) sub'),
      pool.query('SELECT COUNT(*) as n FROM (SELECT DISTINCT ON (place_id) website FROM discovery_listings WHERE website IS NOT NULL) sub'),
      pool.query("SELECT COUNT(*) as n FROM (SELECT DISTINCT ON (place_id) phone FROM discovery_listings WHERE phone IS NOT NULL) sub"),
      pool.query('SELECT category, COUNT(*) as n FROM (SELECT DISTINCT ON (place_id) category FROM discovery_listings WHERE category IS NOT NULL) sub GROUP BY category ORDER BY n DESC LIMIT 10'),
      pool.query('SELECT schwartz_level, schwartz_label, COUNT(*) as n FROM (SELECT DISTINCT ON (place_id) schwartz_level, schwartz_label FROM discovery_listings) sub GROUP BY schwartz_level, schwartz_label ORDER BY schwartz_level'),
    ])

    totalScore = parseInt(scoreRes.rows[0].avg) || 0
    withWebsite = parseInt(webRes.rows[0].n) || 0
    withPhone = parseInt(phoneRes.rows[0].n) || 0
    categories = catRes.rows.map((r: any) => ({ category: r.category, count: parseInt(r.n) }))
    schwartzDist = distRes.rows.map((r: any) => ({ level: r.schwartz_level, label: r.schwartz_label, count: parseInt(r.n) }))

    // WhatsApp detection
      await pool.end()
  } catch { /* Supabase offline */ }

  const totalPages = Math.ceil(totalCount / PER_PAGE)
  const hasFilters = !!(filterCategory || filterSchwartz > 0 || filterSearch)

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

    
return <Chip label={`${label} · L${level}`} size='small' sx={{ bgcolor: colors[label] || '#999', color: '#fff', fontWeight: 700, minWidth: 80 }} />
  }

  const schwartzColors = ['#9e9e9e', '#42a5f5', '#ffa726', '#ef5350', '#d32f2f']

  return (
    <Grid container spacing={6}>
      {/* Header */}
      <Grid size={{ xs: 12 }}>
        <Typography variant='h4'>📋 Leads · Base Real</Typography>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap', mt: 1 }}>
          <Typography variant='body2' color='text.secondary'>
            {totalCount} leads únicos · Supabase discovery_listings · Score Composto (Pain Criteria v1.2)
          </Typography>
          <Chip label={`${totalCount} únicos`} size='small' color='success' variant='tonal' />
          {hasFilters && (
            <Chip label={`Filtros ativos`} size='small' color='warning' variant='tonal' />
          )}
        </Box>
      </Grid>

      {/* Top KPIs */}
      <Grid size={{ xs: 6, sm: 2.4 }}>
        <CardStatVertical stats={totalCount.toString()} title='Leads Únicos'
          subtitle={`${categories.length} categorias`} avatarColor='primary' avatarIcon='ri-database-2-line'
          trendNumber={String(totalCount)} trend='positive' />
      </Grid>
      <Grid size={{ xs: 6, sm: 2.4 }}>
        <CardStatVertical stats={`${totalScore}/100`} title='Score Médio'
          subtitle='Pain Criteria v1.2' avatarColor='warning' avatarIcon='ri-bar-chart-line'
          trendNumber={String(totalScore)} trend='positive' />
      </Grid>
      <Grid size={{ xs: 6, sm: 2.4 }}>
        <CardStatVertical stats={withPhone.toString()} title='Com Telefone'
          subtitle='Contato direto' avatarColor='success' avatarIcon='ri-phone-line'
          trendNumber={String(withPhone)} trend='positive' />
      </Grid>
      <Grid size={{ xs: 6, sm: 2.4 }}>
        <CardStatVertical stats={withWebsite.toString()} title='Com Website'
          subtitle='Auditoria possível' avatarColor='info' avatarIcon='ri-global-line'
          trendNumber={String(withWebsite)} trend='positive' />
      </Grid>
      <Grid size={{ xs: 6, sm: 2.4 }}>
        <CardStatVertical stats="50" title='Places Únicos'
          subtitle='Deduplicado' avatarColor='secondary' avatarIcon='ri-fingerprint-line'
          trendNumber="50" trend='positive' />
      </Grid>

      {/* Filter Bar — Schwartz + Categories */}
      <Grid size={{ xs: 12 }}>
        <Card>
          <CardContent>
            <Grid container spacing={2} alignItems='center'>
              {/* Schwartz filter chips */}
              <Grid size={{ xs: 12, md: 7 }}>
                <Typography variant='caption' fontWeight={600} gutterBottom component='div'>
                  🧠 Filtrar por Nível Schwartz:
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  <Chip label='Todos' size='small' clickable component={Link}
                    color={!filterSchwartz ? 'primary' : 'default'}
                    variant={!filterSchwartz ? 'filled' : 'outlined'}
                    href={`/${lang}/admin/leads${filterCategory ? `?category=${filterCategory}` : ''}${filterSearch ? `&search=${filterSearch}` : ''}`} />
                  {schwartzDist.map((d) => (
                    <Chip key={d.level} size='small' clickable component={Link}
                      label={`${d.label} (${d.count})`}
                      color={filterSchwartz === d.level ? 'primary' : 'default'}
                      variant={filterSchwartz === d.level ? 'filled' : 'outlined'}
                      href={`/${lang}/admin/leads?schwartz=${d.level}${filterCategory ? `&category=${filterCategory}` : ''}${filterSearch ? `&search=${filterSearch}` : ''}`}
                      sx={{ borderColor: schwartzColors[d.level - 1], '&:hover': { borderColor: schwartzColors[d.level - 1] } }} />
                  ))}
                </Box>
              </Grid>

              {/* Category dropdown */}
              <Grid size={{ xs: 12, md: 5 }}>
                <Typography variant='caption' fontWeight={600} gutterBottom component='div'>
                  📁 Filtrar por Categoria:
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  <Chip label='Todas' size='small' clickable component={Link}
                    color={!filterCategory ? 'primary' : 'default'}
                    variant={!filterCategory ? 'filled' : 'outlined'}
                    href={`/${lang}/admin/leads${filterSchwartz ? `?schwartz=${filterSchwartz}` : ''}`} />
                  {categories.map((c) => (
                    <Chip key={c.category} size='small' clickable component={Link}
                      label={`${c.category} (${c.count})`}
                      color={filterCategory === c.category ? 'primary' : 'default'}
                      variant={filterCategory === c.category ? 'filled' : 'outlined'}
                      href={`/${lang}/admin/leads?category=${c.category}${filterSchwartz ? `&schwartz=${filterSchwartz}` : ''}`} />
                  ))}
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Grid>

      {/* Leads Table */}
      <Grid size={{ xs: 12 }}>
        <TableContainer component={Paper}>
          <Table size='small'>
            <TableHead>
              <TableRow>
                <TableCell width={80}>Score</TableCell>
                <TableCell>Nome</TableCell>
                <TableCell>Categoria</TableCell>
                <TableCell align='right'>⭐</TableCell>
                <TableCell align='right'>📝</TableCell>
                <TableCell>Contato</TableCell>
                <TableCell>Site</TableCell>
                <TableCell width={50}>L1</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {leads.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8}>
                    <Typography variant='body2' color='text.secondary' sx={{ textAlign: 'center', py: 4 }}>
                      {hasFilters ? 'Nenhum lead com esses filtros. Tente outra combinação.' : 'Nenhum lead no Supabase. Execute a 1ª busca no Discovery Engine.'}
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
                      {l.website ? <Chip label='🌐' size='small' color='success' variant='tonal' /> : <Chip label='—' size='small' variant='outlined' sx={{ opacity: 0.5 }} />}
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

        {/* Pagination */}
        {totalPages > 1 && (
          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1, mt: 2, flexWrap: 'wrap', alignItems: 'center' }}>
            {currentPage > 1 && (
              <Button component={Link} size='small' variant='outlined'
                href={`/${lang}/admin/leads?page=${currentPage - 1}${filterCategory ? `&category=${filterCategory}` : ''}${filterSchwartz ? `&schwartz=${filterSchwartz}` : ''}`}>
                ← Anterior
              </Button>
            )}
            <Typography variant='body2' color='text.secondary' sx={{ mx: 2 }}>
              Página {currentPage} de {totalPages} ({totalCount} leads)
            </Typography>
            {currentPage < totalPages && (
              <Button component={Link} size='small' variant='outlined'
                href={`/${lang}/admin/leads?page=${currentPage + 1}${filterCategory ? `&category=${filterCategory}` : ''}${filterSchwartz ? `&schwartz=${filterSchwartz}` : ''}`}>
                Próxima →
              </Button>
            )}
          </Box>
        )}
      </Grid>
    </Grid>
  )
}

export default LeadsPage
