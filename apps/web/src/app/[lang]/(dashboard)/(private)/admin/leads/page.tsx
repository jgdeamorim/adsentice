

// adsentice · Admin / Leads — dados REAIS do Supabase com paginação e filtros
import { redirect } from 'next/navigation'
import Link from 'next/link'

import Grid from '@mui/material/Grid2'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import Chip from '@mui/material/Chip'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'

import { getAdminClient } from '@/lib/supabase-admin'

import CardStatVertical from '@components/card-statistics/Vertical'
import { getSessionUser } from '@/libs/supabase/server'
import LeadTable from './LeadTable'

export const dynamic = 'force-dynamic'

interface LeadRow {
  id: string; title: string | null; category: string | null
  address: string | null; rating_value: number | null; rating_votes: number | null
  is_claimed: boolean | null; website: string | null; phone: string | null
  total_photos: number | null; description: string | null
  score_compound: number; score_fit: number; score_engagement: number; score_intent: number
  schwartz_label: string; schwartz_level: number
  enrichment_level: number; contact_methods: string[] | null
  signals_detected?: string[] | null; created_at?: string

  // L2 fields (v0.3)
  l2_onpage_score?: number | null; l2_meta_title?: string | null
  l2_meta_description?: string | null; l2_word_count?: number | null
  l2_internal_links_count?: number | null; l2_external_links_count?: number | null
  l2_images_count?: number | null; l2_cms?: string | null
  l2_has_analytics?: boolean | null; l2_domain_rank?: number | null
  l2_country_iso_code?: string | null; l2_enriched_at?: string | null
  l2_content_maturity?: number | null; l2_content_gaps?: Record<string, unknown> | null
  l3_social_links?: { platform: string; url: string }[] | null; l3_whatsapp?: string | null; l3_emails?: string[] | null
  place_id?: string | null
  business_status?: string | null; categories_arr?: string[] | null
  price_level?: number | null; city?: string | null; district?: string | null
  postal_code?: string | null; country_code?: string | null
  latitude?: number | null; longitude?: number | null
}

const PER_PAGE = 30

const LeadsPage = async ({ params, searchParams }: {
  params: Promise<{ lang: string }>
  searchParams: Promise<{ category?: string; schwartz?: string; page?: string; search?: string; city?: string; uf?: string }>
}) => {
  const { lang } = await params
  const sp = await searchParams
  const filterCategory = sp.category || ''
  const filterSchwartz = parseInt(sp.schwartz || '0') || 0
  const filterSearch = sp.search || ''
  const filterCity = sp.city || ''
  const filterUf = sp.uf || ''
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
  let withSocial = 0
  let withWhatsApp = 0
  let categories: { category: string; count: number }[] = []
  let schwartzDist: { level: number; label: string; count: number }[] = []
  let cities: { city: string; count: number }[] = []
  let estados: { uf: string; count: number }[] = []

  // city→UF via ibge_panorama (419 municípios BR)
  const CITY_UF: Record<string, string> = {}
  try {
    const supabase = getAdminClient()
    const { data: ibgeRows } = await supabase.from("ibge_panorama").select("municipio_nome,uf").limit(500)
    if (ibgeRows) for (const r of ibgeRows) { CITY_UF[r.municipio_nome] = r.uf }
  } catch { /* IBGE offline — sem filtro UF */ }

  try {
    const supabase = getAdminClient()

    // Build query
    let q = supabase.from("discovery_listings").select("*").order("enrichment_level", { ascending: false }).limit(2000)

    if (filterCategory) q = q.eq("category", filterCategory)
    if (filterSchwartz > 0) q = q.eq("schwartz_level", filterSchwartz)
    if (filterSearch) q = q.ilike("title", `%${filterSearch}%`)
    if (filterCity) q = q.eq("city", filterCity)

    const { data, error } = await q

    if (!error && data) {
      // Dedup by place_id (keep highest enrichment_level)
      const deduped = new Map<string, any>()

      for (const r of data as any[]) { const e = deduped.get(r.place_id);

 if (!e) deduped.set(r.place_id, r) }

      let list = Array.from(deduped.values()).sort((a: any, b: any) => (b.score_compound || 0) - (a.score_compound || 0))

      // UF filter (post-query — city→UF via IBGE panorama)
      if (filterUf) {
        list = list.filter((r: any) => CITY_UF[r.city] === filterUf)
      }

      totalCount = list.length
      leads = list.slice(offset, offset + PER_PAGE) as LeadRow[]

      // Stats + aggregations (city + UF from IBGE)
      const scores = list.map((r: any) => r.score_compound || 0).filter((v: number) => v > 0)
      totalScore = scores.length > 0 ? Math.round(scores.reduce((s: number, v: number) => s + v, 0) / scores.length) : 0
      withWebsite = list.filter((r: any) => r.website).length
      withPhone = list.filter((r: any) => r.phone).length
      withSocial = list.filter((r: any) => r.l3_social_links && (Array.isArray(r.l3_social_links) ? r.l3_social_links.length > 0 : false)).length
      withWhatsApp = list.filter((r: any) => r.l3_whatsapp).length
      const catCounts: Record<string, number> = {}
      const cityCounts: Record<string, number> = {}
      const ufCounts: Record<string, number> = {}

      for (const r of list) {
        if (r.category) { const k = r.category; catCounts[k] = (catCounts[k] || 0) + 1 }
        if (r.city) { const c = r.city; cityCounts[c] = (cityCounts[c] || 0) + 1; const uf = CITY_UF[c]; if (uf) ufCounts[uf] = (ufCounts[uf] || 0) + 1 }
      }

      categories = Object.entries(catCounts).sort((a, b) => b[1] - a[1]).slice(0, 15).map(([c, n]) => ({ category: c, count: n }))
      cities = Object.entries(cityCounts).sort((a, b) => b[1] - a[1]).slice(0, 20).map(([c, n]) => ({ city: c, count: n }))
      estados = Object.entries(ufCounts).sort((a, b) => b[1] - a[1]).map(([u, n]) => ({ uf: u, count: n }))
      const schwartzLabels = ["", "Unaware", "Problem Aware", "Solution Aware", "Product Aware", "Most Aware"]

      schwartzDist = [1, 2, 3, 4, 5].map(l => { const n = list.filter((r: any) => r.schwartz_level === l).length;

 

return { level: l, label: schwartzLabels[l], count: n } })
    }
  } catch { /* Supabase offline */ }

  const totalPages = Math.ceil(totalCount / PER_PAGE)
  const hasFilters = !!(filterCategory || filterSchwartz > 0 || filterSearch || filterCity || filterUf)

  const schwartzColors = ["#9e9e9e", "#42a5f5", "#ffa726", "#ef5350", "#d32f2f"]

  // ── Helper: build query string preserving all filters ──
  const qs = (overrides: Record<string, string>) => {
    const p = new URLSearchParams()
    const f: Record<string, string> = { page: '', ...overrides }
    if (filterCategory) f.category = filterCategory
    if (filterSchwartz) f.schwartz = String(filterSchwartz)
    if (filterCity) f.city = filterCity
    if (filterUf) f.uf = filterUf
    if (filterSearch) f.search = filterSearch
    for (const [k, v] of Object.entries(f)) { if (v) p.set(k, v) }
    const s = p.toString()
    return s ? `?${s}` : ''
  }

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
        <CardStatVertical stats={withSocial.toString()} title='Rede Social'
          subtitle={`${withWhatsApp} c/ WhatsApp`} avatarColor='info' avatarIcon='ri-share-line'
          trendNumber={String(withSocial)} trend='positive' />
      </Grid>

      {/* Filter Bar — Schwartz + Categories */}
      <Grid size={{ xs: 12 }}>
        <Card>
          <CardContent>
            <Grid container spacing={2} alignItems='center'>
              {/* Schwartz filter chips */}
              <Grid size={{ xs: 12, md: 6 }}>
                <Typography variant='caption' fontWeight={600} gutterBottom component='div'>
                  🧠 Filtrar por Nível Schwartz:
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  <Chip label='Todos' size='small' clickable component={Link}
                    color={!filterSchwartz ? 'primary' : 'default'}
                    variant={!filterSchwartz ? 'filled' : 'outlined'}
                    href={`/${lang}/admin/leads${qs({ schwartz: '' })}`} />
                  {schwartzDist.map((d) => (
                    <Chip key={d.level} size='small' clickable component={Link}
                      label={`${d.label} (${d.count})`}
                      color={filterSchwartz === d.level ? 'primary' : 'default'}
                      variant={filterSchwartz === d.level ? 'filled' : 'outlined'}
                      href={`/${lang}/admin/leads${qs({ schwartz: String(d.level) })}`}
                      sx={{ borderColor: schwartzColors[d.level - 1], '&:hover': { borderColor: schwartzColors[d.level - 1] } }} />
                  ))}
                </Box>
              </Grid>

              {/* Category dropdown */}
              <Grid size={{ xs: 12, md: 3 }}>
                <Typography variant='caption' fontWeight={600} gutterBottom component='div'>
                  📁 Categoria:
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  <Chip label='Todas' size='small' clickable component={Link}
                    color={!filterCategory ? 'primary' : 'default'}
                    variant={!filterCategory ? 'filled' : 'outlined'}
                    href={`/${lang}/admin/leads${qs({ category: '' })}`} />
                  {categories.map((c) => (
                    <Chip key={c.category} size='small' clickable component={Link}
                      label={`${c.category} (${c.count})`}
                      color={filterCategory === c.category ? 'primary' : 'default'}
                      variant={filterCategory === c.category ? 'filled' : 'outlined'}
                      href={`/${lang}/admin/leads${qs({ category: c.category })}`} />
                  ))}
                </Box>
              </Grid>

              {/* UF / Estado filter */}
              <Grid size={{ xs: 12, md: 2 }}>
                <Typography variant='caption' fontWeight={600} gutterBottom component='div'>
                  🗺️ Estado:
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  <Chip label='Todos' size='small' clickable component={Link}
                    color={!filterUf ? 'primary' : 'default'}
                    variant={!filterUf ? 'filled' : 'outlined'}
                    href={`/${lang}/admin/leads${qs({ uf: '' })}`} />
                  {estados.map((e) => (
                    <Chip key={e.uf} size='small' clickable component={Link}
                      label={`${e.uf} (${e.count})`}
                      color={filterUf === e.uf ? 'primary' : 'default'}
                      variant={filterUf === e.uf ? 'filled' : 'outlined'}
                      href={`/${lang}/admin/leads${qs({ uf: e.uf })}`} />
                  ))}
                </Box>
              </Grid>

              {/* City filter */}
              <Grid size={{ xs: 12, md: 3 }}>
                <Typography variant='caption' fontWeight={600} gutterBottom component='div'>
                  📍 Cidade:
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  <Chip label='Todas' size='small' clickable component={Link}
                    color={!filterCity ? 'primary' : 'default'}
                    variant={!filterCity ? 'filled' : 'outlined'}
                    href={`/${lang}/admin/leads${qs({ city: '' })}`} />
                  {cities.map((c) => (
                    <Chip key={c.city} size='small' clickable component={Link}
                      label={`${c.city} (${c.count})`}
                      color={filterCity === c.city ? 'primary' : 'default'}
                      variant={filterCity === c.city ? 'filled' : 'outlined'}
                      href={`/${lang}/admin/leads${qs({ city: c.city })}`} />
                  ))}
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Grid>

      {/* Leads Table with Modal */}
      <Grid size={{ xs: 12 }}>
        <LeadTable leads={leads} />

        {/* Pagination */}
        {totalPages > 1 && (
          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1, mt: 2, flexWrap: 'wrap', alignItems: 'center' }}>
            {currentPage > 1 && (
              <Button component={Link} size='small' variant='outlined'
                href={`/${lang}/admin/leads${qs({ page: String(currentPage - 1) })}`}>
                ← Anterior
              </Button>
            )}
            <Typography variant='body2' color='text.secondary' sx={{ mx: 2 }}>
              Página {currentPage} de {totalPages} ({totalCount} leads)
            </Typography>
            {currentPage < totalPages && (
              <Button component={Link} size='small' variant='outlined'
                href={`/${lang}/admin/leads${qs({ page: String(currentPage + 1) })}`}>
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
