// adsentice · Admin / Leads — dados REAIS do Supabase com paginação e filtros (UF/cidade/categoria/Schwartz)
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

  // L0 sleeping fields (v121)
  attributes?: Record<string, unknown> | null
  work_time?: Record<string, unknown> | null
  rating_distribution?: Record<string, number> | null
  people_also_search?: Array<{ title?: string; rating?: { value?: number; votes_count?: number } }> | null

  // Wa-Check (v127)
  wa_checked?: boolean | null
  wa_has_whatsapp?: boolean | null
  wa_is_business?: boolean | null
  wa_display_name?: string | null
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

  // ═══ STATS (1 query leve — COUNT DISTINCT por cidade) ═══
  let totalCount = 0; let totalScore = 0
  let withWebsite = 0; let withPhone = 0; let withSocial = 0; let withWhatsApp = 0
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
  } catch { /* IBGE offline */ }

  // ── STATS: agregação via REST (1 query, colunas mínimas) ──
  try {
    const supabase = getAdminClient()
    // Fetch ALL place_ids + cols mínimas para stats (sem range cap)
    let statRows: any[] = []
    for (let off = 0; off < 10000; off += 1000) {
      const { data: chunk, error } = await supabase.from("discovery_listings")
        .select("place_id,city,category,website,phone,l3_social_links,l3_whatsapp,score_compound,schwartz_level")
        .order("place_id", { ascending: true }).range(off, off + 999)
      if (error || !chunk?.length) break
      statRows.push(...chunk)
      if (chunk.length < 1000) break
    }

    if (statRows.length) {
      // Dedup
      const deduped = new Map<string, any>()
      for (const r of statRows) { if (!deduped.has(r.place_id)) deduped.set(r.place_id, r) }
      const list = Array.from(deduped.values())

      totalCount = list.length
      const scores = list.map((r: any) => r.score_compound || 0).filter((v: number) => v > 0)
      totalScore = scores.length > 0 ? Math.round(scores.reduce((s: number, v: number) => s + v, 0) / scores.length) : 0
      withWebsite = list.filter((r: any) => r.website).length
      withPhone = list.filter((r: any) => r.phone).length
      withSocial = list.filter((r: any) => r.l3_social_links && Array.isArray(r.l3_social_links) && r.l3_social_links.length > 0).length
      withWhatsApp = list.filter((r: any) => r.l3_whatsapp).length

      const catCounts: Record<string, number> = {}
      const cityCounts: Record<string, number> = {}
      const ufCounts: Record<string, number> = {}
      for (const r of list) {
        if (r.category) catCounts[r.category] = (catCounts[r.category] || 0) + 1
        if (r.city) { cityCounts[r.city] = (cityCounts[r.city] || 0) + 1; const uf = CITY_UF[r.city]; if (uf) ufCounts[uf] = (ufCounts[uf] || 0) + 1 }
      }
      const schwartzLabels = ["", "Unaware", "Problem Aware", "Solution Aware", "Product Aware", "Most Aware"]
      schwartzDist = [1, 2, 3, 4, 5].map(l => ({ level: l, label: schwartzLabels[l], count: list.filter((r: any) => r.schwartz_level === l).length }))

      categories = Object.entries(catCounts).sort((a, b) => b[1] - a[1]).slice(0, 15).map(([c, n]) => ({ category: c, count: n }))
      cities = Object.entries(cityCounts).sort((a, b) => b[1] - a[1]).slice(0, 20).map(([c, n]) => ({ city: c, count: n }))
      estados = Object.entries(ufCounts).sort((a, b) => b[1] - a[1]).map(([u, n]) => ({ uf: u, count: n }))
    }
  } catch { /* Supabase offline */ }

  // ═══ TABLE DATA (1 range paginado — só a página atual) ═══
  let leads: LeadRow[] = []
  let filteredTotal = totalCount
  try {
    const supabase = getAdminClient()
    let q = supabase.from("discovery_listings").select("*").order("score_compound", { ascending: false }).range(offset, offset + PER_PAGE - 1)
    if (filterCategory) q = q.eq("category", filterCategory)
    if (filterSchwartz > 0) q = q.eq("schwartz_level", filterSchwartz)
    if (filterSearch) q = q.ilike("title", `%${filterSearch}%`)
    if (filterCity) q = q.eq("city", filterCity)
    // UF: converte para cidades conhecidas
    if (filterUf) {
      const ufCities = Object.entries(CITY_UF).filter(([, u]) => u === filterUf).map(([c]) => c)
      if (ufCities.length) q = q.in("city", ufCities.slice(0, 50))
    }
    const { data, error } = await q
    if (!error && data) {
      // Dedup por place_id
      const deduped = new Map<string, any>()
      for (const r of data) { if (!deduped.has(r.place_id)) deduped.set(r.place_id, r) }
      leads = Array.from(deduped.values()) as LeadRow[]
    }
    // filtered total: usa stats se sem filtros ativos, senão recalcula
    if (filterCategory || filterSchwartz > 0 || filterSearch || filterCity || filterUf) {
      filteredTotal = 0 // será recalculado abaixo
    }
  } catch { /* Supabase offline */ }

  const totalPages = Math.max(1, Math.ceil((filterCategory || filterSchwartz > 0 || filterSearch || filterCity || filterUf ? leads.length : totalCount) / PER_PAGE))
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
            {totalCount.toLocaleString('pt-BR')} leads únicos · Supabase discovery_listings · Score Composto (Pain Criteria v1.2)
          </Typography>
          <Chip label={`${totalCount.toLocaleString('pt-BR')} únicos`} size='small' color='success' variant='tonal' />
          {hasFilters && <Chip label='Filtros ativos' size='small' color='warning' variant='tonal' />}
        </Box>
      </Grid>

      {/* Top KPIs */}
      <Grid size={{ xs: 6, sm: 2.4 }}>
        <CardStatVertical stats={totalCount.toLocaleString('pt-BR')} title='Leads Únicos'
          subtitle={`${categories.length} categorias`} avatarColor='primary' avatarIcon='ri-database-2-line'
          trendNumber={String(totalCount)} trend='positive' />
      </Grid>
      <Grid size={{ xs: 6, sm: 2.4 }}>
        <CardStatVertical stats={`${totalScore}/100`} title='Score Médio'
          subtitle='Pain Criteria v1.2' avatarColor='warning' avatarIcon='ri-bar-chart-line'
          trendNumber={String(totalScore)} trend='positive' />
      </Grid>
      <Grid size={{ xs: 6, sm: 2.4 }}>
        <CardStatVertical stats={withPhone.toLocaleString('pt-BR')} title='Com Telefone'
          subtitle='Contato direto' avatarColor='success' avatarIcon='ri-phone-line'
          trendNumber={String(withPhone)} trend='positive' />
      </Grid>
      <Grid size={{ xs: 6, sm: 2.4 }}>
        <CardStatVertical stats={withWebsite.toLocaleString('pt-BR')} title='Com Website'
          subtitle='Auditoria possível' avatarColor='info' avatarIcon='ri-global-line'
          trendNumber={String(withWebsite)} trend='positive' />
      </Grid>
      <Grid size={{ xs: 6, sm: 2.4 }}>
        <CardStatVertical stats={withSocial.toLocaleString('pt-BR')} title='Rede Social'
          subtitle={`${withWhatsApp.toLocaleString('pt-BR')} c/ WhatsApp`} avatarColor='info' avatarIcon='ri-share-line'
          trendNumber={String(withSocial)} trend='positive' />
      </Grid>

      {/* Filter Bar */}
      <Grid size={{ xs: 12 }}>
        <Card>
          <CardContent>
            <Grid container spacing={2} alignItems='center'>
              {/* Schwartz */}
              <Grid size={{ xs: 12, md: 6 }}>
                <Typography variant='caption' fontWeight={600} gutterBottom component='div'>🧠 Nível Schwartz:</Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  <Chip label='Todos' size='small' clickable component={Link}
                    color={!filterSchwartz ? 'primary' : 'default'} variant={!filterSchwartz ? 'filled' : 'outlined'}
                    href={`/${lang}/admin/leads${qs({ schwartz: '' })}`} />
                  {schwartzDist.map((d) => (
                    <Chip key={d.level} size='small' clickable component={Link}
                      label={`${d.label} (${d.count})`}
                      color={filterSchwartz === d.level ? 'primary' : 'default'} variant={filterSchwartz === d.level ? 'filled' : 'outlined'}
                      href={`/${lang}/admin/leads${qs({ schwartz: String(d.level) })}`}
                      sx={{ borderColor: schwartzColors[d.level - 1], '&:hover': { borderColor: schwartzColors[d.level - 1] } }} />
                  ))}
                </Box>
              </Grid>

              {/* UF / Estado */}
              <Grid size={{ xs: 12, md: 1 }}>
                <Typography variant='caption' fontWeight={600} gutterBottom component='div'>🗺️ UF:</Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  <Chip label='Todos' size='small' clickable component={Link}
                    color={!filterUf ? 'primary' : 'default'} variant={!filterUf ? 'filled' : 'outlined'}
                    href={`/${lang}/admin/leads${qs({ uf: '' })}`} />
                  {estados.map((e) => (
                    <Chip key={e.uf} size='small' clickable component={Link}
                      label={`${e.uf} (${e.count})`}
                      color={filterUf === e.uf ? 'primary' : 'default'} variant={filterUf === e.uf ? 'filled' : 'outlined'}
                      href={`/${lang}/admin/leads${qs({ uf: e.uf })}`} />
                  ))}
                </Box>
              </Grid>

              {/* Categoria */}
              <Grid size={{ xs: 12, md: 3 }}>
                <Typography variant='caption' fontWeight={600} gutterBottom component='div'>📁 Categoria:</Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  <Chip label='Todas' size='small' clickable component={Link}
                    color={!filterCategory ? 'primary' : 'default'} variant={!filterCategory ? 'filled' : 'outlined'}
                    href={`/${lang}/admin/leads${qs({ category: '' })}`} />
                  {categories.map((c) => (
                    <Chip key={c.category} size='small' clickable component={Link}
                      label={`${c.category} (${c.count})`}
                      color={filterCategory === c.category ? 'primary' : 'default'} variant={filterCategory === c.category ? 'filled' : 'outlined'}
                      href={`/${lang}/admin/leads${qs({ category: c.category })}`} />
                  ))}
                </Box>
              </Grid>

              {/* Cidade */}
              <Grid size={{ xs: 12, md: 2 }}>
                <Typography variant='caption' fontWeight={600} gutterBottom component='div'>📍 Cidade:</Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  <Chip label='Todas' size='small' clickable component={Link}
                    color={!filterCity ? 'primary' : 'default'} variant={!filterCity ? 'filled' : 'outlined'}
                    href={`/${lang}/admin/leads${qs({ city: '' })}`} />
                  {cities.map((c) => (
                    <Chip key={c.city} size='small' clickable component={Link}
                      label={`${c.city} (${c.count})`}
                      color={filterCity === c.city ? 'primary' : 'default'} variant={filterCity === c.city ? 'filled' : 'outlined'}
                      href={`/${lang}/admin/leads${qs({ city: c.city })}`} />
                  ))}
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Grid>

      {/* Leads Table */}
      <Grid size={{ xs: 12 }}>
        <LeadTable leads={leads} />

        {/* Pagination */}
        {totalPages > 1 && (
          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1, mt: 2, flexWrap: 'wrap', alignItems: 'center' }}>
            {currentPage > 1 && (
              <Button component={Link} size='small' variant='outlined'
                href={`/${lang}/admin/leads${qs({ page: String(currentPage - 1) })}`}>← Anterior</Button>
            )}
            <Typography variant='body2' color='text.secondary' sx={{ mx: 2 }}>
              Página {currentPage} de {totalPages} ({totalCount.toLocaleString('pt-BR')} leads)
            </Typography>
            {currentPage < totalPages && (
              <Button component={Link} size='small' variant='outlined'
                href={`/${lang}/admin/leads${qs({ page: String(currentPage + 1) })}`}>Próxima →</Button>
            )}
          </Box>
        )}
      </Grid>
    </Grid>
  )
}

export default LeadsPage
