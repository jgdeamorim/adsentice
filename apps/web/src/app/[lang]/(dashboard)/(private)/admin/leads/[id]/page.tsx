
// adsentice · Admin / Lead Detail — ficha completa do lead com dados REAIS
// Supabase discovery_listings · scoring engine · GMB profile · L2 SEO
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
import TableRow from '@mui/material/TableRow'
import Alert from '@mui/material/Alert'

import CardStatVertical from '@components/card-statistics/Vertical'
import { getSessionUser } from '@/libs/supabase/server'
import { getAdminClient } from '@/lib/supabase-admin'
import { SCHWARTZ_LEVELS } from '@/lib/scoring'

export const dynamic = 'force-dynamic'

interface RealLead {
  id: string
  title: string | null; category: string | null; categories_arr: string[] | null
  address: string | null; city: string | null; district: string | null
  country_code: string | null; postal_code: string | null
  phone: string | null; website: string | null
  place_id: string | null; cid: string | null
  rating_value: number | null; rating_votes: number | null
  rating_distribution: Record<string, number> | null
  is_claimed: boolean | null; business_status: string | null
  main_image: string | null; total_photos: number | null
  description: string | null
  latitude: number | null; longitude: number | null
  price_level: number | null
  // Scoring
  score_compound: number; score_fit: number; score_engagement: number; score_intent: number
  schwartz_level: number; schwartz_label: string
  signals_detected: string[] | null
  enrichment_level: number
  contact_methods: string[] | null
  // L2
  l2_onpage_score: number | null; l2_meta_title: string | null
  l2_meta_description: string | null; l2_word_count: number | null
  l2_internal_links_count: number | null; l2_external_links_count: number | null
  l2_images_count: number | null; l2_cms: string | null
  l2_has_analytics: boolean | null; l2_domain_rank: number | null
  l2_enriched_at: string | null; l2_lighthouse_performance: number | null
  l2_lighthouse_accessibility: number | null; l2_lighthouse_best_practices: number | null
  l2_lighthouse_seo: number | null
  // L3
  l3_social_links: { platform: string; url: string }[] | null
  l3_whatsapp: string | null; l3_emails: string[] | null
  // Wa-Check
  wa_checked: boolean | null; wa_has_whatsapp: boolean | null
  wa_is_business: boolean | null; wa_display_name: string | null
  // L0 sleeping
  work_time: Record<string, unknown> | null
  attributes: Record<string, unknown> | null
  people_also_search: Array<{ title?: string; rating?: { value?: number; votes_count?: number } }> | null
  // Timestamps
  created_at: string | null
}

const LeadDetail = async ({ params }: { params: Promise<{ lang: string; id: string }> }) => {
  const { lang, id } = await params
  const user = await getSessionUser()

  if (user?.role !== 'admin') redirect(`/${lang}/app`)

  // ═══ Fetch lead real do Supabase ═══
  let lead: RealLead | null = null
  let errorMsg = ''
  try {
    const supabase = getAdminClient()
    const { data, error } = await supabase.from("discovery_listings").select("*").eq("id", id).single()

    if (error) { errorMsg = error.message }
    else if (!data) { errorMsg = "Lead não encontrado" }
    else { lead = data as unknown as RealLead }
  } catch (e: unknown) {
    errorMsg = (e as Error).message?.slice(0, 200) || "Erro ao buscar lead"
  }

  if (!lead) {
    return (
      <Grid container spacing={6}>
        <Grid size={{ xs: 12 }}>
          <Alert severity="error">
            <Typography variant="h6">❌ Lead não encontrado</Typography>
            <Typography variant="body2">ID: {id} · {errorMsg || 'Verifique se o ID existe na tabela discovery_listings'}</Typography>
          </Alert>
        </Grid>
      </Grid>
    )
  }

  // ═══ Derivados ═══
  const l = lead
  const score = l.score_compound || 0
  const schwartz = SCHWARTZ_LEVELS.find(s => s.level === l.schwartz_level) || SCHWARTZ_LEVELS[0]
  const signals = (l.signals_detected || []) as string[]
  const hasL2 = l.l2_enriched_at != null
  const hasL3 = l.l3_social_links != null || l.l3_whatsapp != null
  const enrichmentLabel = ['L0 · Descoberto', 'L1 · Perfilado', 'L2 · SEO', 'L3 · Social/Contatos', 'L4 · IBGE', 'L5 · CNPJ'][Math.min(l.enrichment_level || 0, 5)]

  return (
    <Grid container spacing={6}>
      {/* Header */}
      <Grid size={{ xs: 12 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
          <Typography variant='h4'>{l.title || 'Sem nome'}</Typography>
          <Chip label={schwartz.label} sx={{ bgcolor: schwartz.colorHex, color: '#fff' }} size='medium' />
          <Chip label={`Score ${score}/100`} color={score >= 70 ? 'error' : score >= 50 ? 'warning' : score >= 30 ? 'info' : 'default'} size='medium' />
          <Chip label={enrichmentLabel} size='small' variant='outlined' />
        </Box>
        <Box sx={{ display: 'flex', gap: 2, mt: 1, flexWrap: 'wrap' }}>
          {l.city && (
            <Typography variant='body2' color='text.secondary'>
              📍 {[l.address, l.district, l.city, l.country_code].filter(Boolean).join(', ')}
            </Typography>
          )}
          {l.place_id && (
            <Typography variant='body2' color='text.secondary'>
              🆔 {l.place_id.slice(0, 16)}...
            </Typography>
          )}
          {l.created_at && (
            <Typography variant='body2' color='text.secondary'>
              🕐 {new Date(l.created_at).toLocaleDateString('pt-BR')}
            </Typography>
          )}
        </Box>
      </Grid>

      {/* ═══ ROW 1 · KEY METRICS ═══ */}
      <Grid size={{ xs: 6, sm: 3 }}>
        <CardStatVertical
          stats={l.rating_value != null ? `${l.rating_value}★` : '—'}
          title='Rating GMB'
          subtitle={l.rating_votes != null ? `${l.rating_votes} votes · ${l.is_claimed ? 'reivindicado' : 'não reivindicado'}` : 'Sem dados'}
          avatarColor={l.rating_value != null && l.rating_value < 4.0 ? 'warning' : 'success'}
          avatarIcon='ri-star-line'
          trendNumber={String(l.rating_votes || 0)}
          trend={l.rating_value != null && l.rating_value >= 4.0 ? 'positive' : 'negative'}
        />
      </Grid>
      <Grid size={{ xs: 6, sm: 3 }}>
        <CardStatVertical
          stats={hasL2 ? `${l.l2_onpage_score || 0}/100` : '—'}
          title='SEO Score'
          subtitle={hasL2 ? `${l.l2_word_count || 0} palavras · rank ${l.l2_domain_rank || '?'}` : 'L2 pendente'}
          avatarColor={hasL2 ? (l.l2_onpage_score != null && l.l2_onpage_score >= 50 ? 'success' : 'warning') : 'default'}
          avatarIcon='ri-search-line'
          trendNumber={String(l.l2_onpage_score || 0)}
          trend={hasL2 ? 'positive' : 'negative'}
        />
      </Grid>
      <Grid size={{ xs: 6, sm: 3 }}>
        <CardStatVertical
          stats={String(l.total_photos || 0)}
          title='Fotos GMB'
          subtitle={(l.total_photos || 0) < 3 ? '⚠️ Abaixo do ideal (≥3)' : '✅ OK'}
          avatarColor={(l.total_photos || 0) < 3 ? 'warning' : 'success'}
          avatarIcon='ri-image-line'
          trendNumber={String(l.total_photos || 0)}
          trend='positive'
        />
      </Grid>
      <Grid size={{ xs: 6, sm: 3 }}>
        <CardStatVertical
          stats={l.website ? '✅' : '❌'}
          title='Website'
          subtitle={l.website || 'Não detectado'}
          avatarColor={l.website ? 'success' : 'error'}
          avatarIcon='ri-global-line'
          trendNumber={l.website ? '1' : '0'}
          trend='positive'
        />
      </Grid>

      {/* ═══ ROW 2 · GMB PROFILE ═══ */}
      <Grid size={{ xs: 12, md: 7 }}>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant='h6'>📋 Perfil GMB</Typography>
              <Chip label={l.business_status || '?'} size='small' color={l.business_status === 'OPERATIONAL' ? 'success' : 'default'} variant='tonal' />
            </Box>
            <Table size='small'>
              <TableBody>
                {[
                  ['Nome', l.title || '—'],
                  ['Categoria', l.category || '—'],
                  ['Categorias', (l.categories_arr || []).join(', ') || '—'],
                  ['Endereço', l.address || '—'],
                  ['Cidade', l.city || '—'],
                  ['Bairro', l.district || '—'],
                  ['País', l.country_code || '—'],
                  ['CEP', l.postal_code || '—'],
                  ['Telefone', l.phone || '—'],
                  ['WhatsApp', l.wa_checked
                    ? (l.wa_is_business ? '✅ Business' : l.wa_has_whatsapp ? '✅ Pessoal' : '❌ Sem WA')
                    : '⚠ Não verificado'],
                  ['Rating', l.rating_value != null ? `${l.rating_value}★ (${l.rating_votes || 0} votes)` : '—'],
                  ['Distribuição', l.rating_distribution ? Object.entries(l.rating_distribution).map(([k, v]) => `${k}★:${v}`).join(' ') : '—'],
                  ['Reivindicado', l.is_claimed ? '✅ Sim' : '⚠️ Não'],
                  ['Place ID', l.place_id || '—'],
                  ['CID', l.cid || '—'],
                  ['Website', l.website || '—'],
                  ['Total Fotos', String(l.total_photos || 0)],
                  ['Descrição', l.description || '—'],
                  ['Coordenadas', l.latitude != null ? `${l.latitude.toFixed(4)}, ${l.longitude?.toFixed(4)}` : '—'],
                  ['Status', l.business_status || '—'],
                  ['Nível de Preço', l.price_level ? '$'.repeat(Math.min(l.price_level, 4)) : '—'],
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

        {/* L2 SEO Details */}
        {hasL2 && (
          <Card sx={{ mt: 3 }}>
            <CardContent>
              <Typography variant='h6' gutterBottom>🔍 L2 · Website & SEO</Typography>
              <Table size='small'>
                <TableBody>
                  {[
                    ['OnPage Score', `${l.l2_onpage_score || 0}/100`],
                    ['Meta Title', l.l2_meta_title || '—'],
                    ['Meta Description', l.l2_meta_description || '—'],
                    ['Word Count', String(l.l2_word_count || 0)],
                    ['Internal Links', String(l.l2_internal_links_count || 0)],
                    ['External Links', String(l.l2_external_links_count || 0)],
                    ['Images', String(l.l2_images_count || 0)],
                    ['CMS Detectado', l.l2_cms || '—'],
                    ['Google Analytics', l.l2_has_analytics ? '✅ Sim' : '❌ Não'],
                    ['Domain Rank', l.l2_domain_rank ? `#${l.l2_domain_rank}` : '—'],
                    ['Lighthouse Perf', l.l2_lighthouse_performance != null ? `${Math.round(l.l2_lighthouse_performance * 100)}/100` : '—'],
                    ['Lighthouse A11y', l.l2_lighthouse_accessibility != null ? `${Math.round(l.l2_lighthouse_accessibility * 100)}/100` : '—'],
                    ['Lighthouse SEO', l.l2_lighthouse_seo != null ? `${Math.round(l.l2_lighthouse_seo * 100)}/100` : '—'],
                    ['Enriquecido em', l.l2_enriched_at ? new Date(l.l2_enriched_at).toLocaleDateString('pt-BR') : '—'],
                  ].map(([label, value], i) => (
                    <TableRow key={i} sx={{ '&:nth-of-type(odd)': { bgcolor: 'action.hover' } }}>
                      <TableCell sx={{ fontWeight: 600, width: '45%', fontSize: '0.85rem' }}>{label}</TableCell>
                      <TableCell sx={{ fontSize: '0.85rem' }}>{value}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </Grid>

      {/* ═══ ROW 2B · SCORE BREAKDOWN ═══ */}
      <Grid size={{ xs: 12, md: 5 }}>
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant='h6' gutterBottom>🎯 Score Composto</Typography>
            <Box sx={{ mb: 2 }}>
              <Typography variant='h2' fontWeight={800} color={score >= 70 ? 'error.main' : score >= 50 ? 'warning.main' : 'info.main'}>
                {score}
              </Typography>
              <Typography variant='body2'>de 100 pontos (Fit×0.40 + Eng×0.35 + Intent×0.25)</Typography>
            </Box>

            {/* Dimension bars */}
            {[
              { label: 'Fit', value: l.score_fit || 0, color: 'primary' as const },
              { label: 'Engagement', value: l.score_engagement || 0, color: 'success' as const },
              { label: 'Intent', value: l.score_intent || 0, color: 'error' as const },
            ].map(dim => (
              <Box key={dim.label} sx={{ mb: 1.5 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography variant='body2' fontWeight={600}>{dim.label}</Typography>
                  <Typography variant='body2'>{dim.value} pts</Typography>
                </Box>
                <LinearProgress variant='determinate' value={dim.value} color={dim.color}
                  sx={{ height: 6, borderRadius: 3 }} />
              </Box>
            ))}

            <Box sx={{ mt: 2 }}>
              <Typography variant='caption' color='text.secondary'>
                Schwartz: <strong>{schwartz.label}</strong> · {schwartz.description}
              </Typography>
            </Box>
          </CardContent>
        </Card>

        {/* Signals detected */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant='h6' gutterBottom>
              🔍 Sinais Detectados
              <Chip label={`${signals.length} sinais`} size='small' variant='outlined' sx={{ ml: 1 }} />
            </Typography>
            {signals.length > 0 ? (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {signals.map((sig: string) => (
                  <Chip key={sig} label={sig} size='small' color='primary' variant='tonal' />
                ))}
              </Box>
            ) : (
              <Typography variant='body2' color='text.secondary'>Nenhum sinal detectado — lead com score baixo ou sem dados suficientes.</Typography>
            )}
          </CardContent>
        </Card>

        {/* Contact Methods */}
        {l.contact_methods && l.contact_methods.length > 0 && (
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant='h6' gutterBottom>📞 Métodos de Contato</Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {l.contact_methods.map((m: string) => (
                  <Chip key={m} label={m} size='small' color='info' variant='tonal' />
                ))}
              </Box>
            </CardContent>
          </Card>
        )}

        {/* L3 Social */}
        {hasL3 && (
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant='h6' gutterBottom>🌐 L3 · Redes Sociais & Contatos</Typography>
              {l.l3_social_links && l.l3_social_links.length > 0 && (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1 }}>
                  {l.l3_social_links.map((s, i) => (
                    <Chip key={i} label={`${s.platform}: ${s.url?.slice(0, 30)}`} size='small' variant='outlined' />
                  ))}
                </Box>
              )}
              {l.l3_whatsapp && <Typography variant='body2'>📱 WhatsApp: {l.l3_whatsapp}</Typography>}
              {l.l3_emails && l.l3_emails.length > 0 && <Typography variant='body2'>📧 {l.l3_emails.join(', ')}</Typography>}
            </CardContent>
          </Card>
        )}

        {/* Wa-Check detail */}
        {l.wa_checked && (
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant='h6' gutterBottom>✅ Wa-Check</Typography>
              <Table size='small'>
                <TableBody>
                  {[
                    ['Tem WhatsApp', l.wa_has_whatsapp ? '✅ Sim' : '❌ Não'],
                    ['É Business', l.wa_is_business ? '✅ Sim' : '❌ Não'],
                    ['Display Name', l.wa_display_name || '—'],
                  ].map(([label, value], i) => (
                    <TableRow key={i}>
                      <TableCell sx={{ fontWeight: 600, fontSize: '0.85rem' }}>{label}</TableCell>
                      <TableCell sx={{ fontSize: '0.85rem' }}>{value}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </Grid>

      {/* ═══ ROW 3 · DATA SOURCE ═══ */}
      <Grid size={{ xs: 12 }}>
        <Alert severity='info' variant='outlined'>
          <Typography variant='body2' fontWeight={600}>
            📊 Fonte: Supabase · discovery_listings · id={id}
          </Typography>
          <Typography variant='caption'>
            Enrichment L{lead.enrichment_level || 0} · Score composto {score}/100 · Schwartz {l.schwartz_label}
            {l.created_at && ` · Descoberto ${new Date(l.created_at).toLocaleDateString('pt-BR')}`}
          </Typography>
        </Alert>
      </Grid>
    </Grid>
  )
}

export default LeadDetail
