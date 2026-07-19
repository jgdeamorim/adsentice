'use client'

import { useState } from 'react'

import Grid from '@mui/material/Grid2'
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
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import Button from '@mui/material/Button'

interface LeadRow {
  id: string; title: string | null; category: string | null
  address: string | null; rating_value: number | null; rating_votes: number | null
  is_claimed: boolean | null; website: string | null; phone: string | null
  total_photos: number | null; description: string | null
  business_status?: string | null; city?: string | null; district?: string | null
  postal_code?: string | null; country_code?: string | null; price_level?: number | null
  categories_arr?: string[] | null; latitude?: number | null; longitude?: number | null
  score_compound: number; score_fit: number; score_engagement: number; score_intent: number
  schwartz_label: string; schwartz_level: number
  enrichment_level: number; contact_methods: string[] | null
  signals_detected?: string[] | null; created_at?: string
  l3_social_links?: { platform: string; url: string }[] | null; l3_whatsapp?: string | null
  place_id?: string | null

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

  // L2 fields (v0.3)
  l2_onpage_score?: number | null; l2_meta_title?: string | null
  l2_meta_description?: string | null; l2_word_count?: number | null
  l2_internal_links_count?: number | null; l2_external_links_count?: number | null
  l2_images_count?: number | null; l2_cms?: string | null
  l2_has_analytics?: boolean | null; l2_domain_rank?: number | null
  l2_country_iso_code?: string | null; l2_enriched_at?: string | null

  // Content Gap (v0.5)
  l2_content_maturity?: number | null; l2_content_gaps?: Record<string, unknown> | null
}

interface Props {
  leads: LeadRow[]
}

const SCHWARTZ_COLORS: Record<string, string> = { Unaware: '#9e9e9e', 'Problem Aware': '#42a5f5', 'Solution Aware': '#ffa726', 'Product Aware': '#ef5350', 'Most Aware': '#d32f2f' }

export default function LeadTable({ leads }: Props) {
  const [selected, setSelected] = useState<LeadRow | null>(null)

  if (leads.length === 0) {
    return (
      <Paper>
        <Typography variant='body2' color='text.secondary' sx={{ textAlign: 'center', py: 4 }}>
          Nenhum lead encontrado. Execute a 1ª busca no Discovery Engine.
        </Typography>
      </Paper>
    )
  }

  return (
    <>
      <TableContainer component={Paper}>
        <Table size='small'>
          <TableHead>
            <TableRow>
              <TableCell width={80}>Score</TableCell>
              <TableCell>Nome</TableCell>
              <TableCell>Categoria</TableCell>
              <TableCell align='right'>⭐</TableCell>
              <TableCell align='right'>📝</TableCell>
              <TableCell>Telefone</TableCell>
              <TableCell>Site</TableCell>
              <TableCell>Social</TableCell>
              <TableCell width={50}>Level</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {leads.map((l) => (
              <TableRow key={l.id} hover sx={{ cursor: 'pointer' }} onClick={() => setSelected(l)}>
                <TableCell>
                  <Chip label={`${l.schwartz_label} · L${l.schwartz_level}`} size='small'
                    sx={{ bgcolor: SCHWARTZ_COLORS[l.schwartz_label] || '#999', color: '#fff', fontWeight: 700, minWidth: 80 }} />
                  <Typography variant='caption' sx={{ display: 'block', mt: 0.3, textAlign: 'center' }}>{l.score_compound}/100</Typography>
                </TableCell>
                <TableCell>
                  <Typography fontWeight={600} fontSize='0.85rem' noWrap sx={{ maxWidth: 250 }}>{l.title || '—'}</Typography>
                  <Typography variant='caption' color='text.secondary' noWrap sx={{ maxWidth: 250 }}>{l.address?.substring(0, 50)}</Typography>
                </TableCell>
                <TableCell><Chip label={l.category || '?'} size='small' variant='outlined' /></TableCell>
                <TableCell align='right'><Typography variant='body2' fontWeight={600}>{l.rating_value?.toFixed(1) || '—'}★</Typography></TableCell>
                <TableCell align='right'><Typography variant='body2'>{l.rating_votes || 0}</Typography></TableCell>
                <TableCell>
                  {l.phone
                    ? <Chip {...waChip4(l)} size='small' variant='tonal' />
                    : <Chip label='—' size='small' variant='outlined' sx={{ opacity: 0.5 }} />}
                </TableCell>
                <TableCell>
                  {l.website ? <Chip label='🌐' size='small' color='success' variant='tonal' /> : <Chip label='—' size='small' variant='outlined' sx={{ opacity: 0.5 }} />}
                </TableCell>
                <TableCell>
                  {l.l3_social_links && Array.isArray(l.l3_social_links) && l.l3_social_links.length > 0
                    ? <Chip label={socialAbbrev(l.l3_social_links)} size='small' color='info' variant='tonal' sx={{ fontFamily: 'monospace', fontSize: '0.6rem' }} />
                    : <Chip label='—' size='small' variant='outlined' sx={{ opacity: 0.5 }} />}
                </TableCell>
                <TableCell>
                  <Chip label={`L${l.enrichment_level || 0}`} size='small'
                    color={l.enrichment_level >= 2 ? 'info' : l.enrichment_level >= 1 ? 'success' : 'default'} variant='tonal' />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* ═══ LEAD DETAIL MODAL ═══ */}
      <Dialog open={!!selected} onClose={() => setSelected(null)} maxWidth='md' fullWidth>
        {selected && (
          <>
            <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box>
                <Typography variant='h6'>{selected.title || 'Sem nome'}</Typography>
                <Box sx={{ display: 'flex', gap: 1, mt: 0.5, flexWrap: 'wrap' }}>
                  <Chip label={`${selected.schwartz_label} · Score ${selected.score_compound}/100`} size='small'
                    sx={{ bgcolor: SCHWARTZ_COLORS[selected.schwartz_label] || '#999', color: '#fff', fontWeight: 700 }} />
                  {(selected.enrichment_level ?? 0) >= 2 ? (
                    <Chip label='🌐 L2 Website+SEO' size='small' color='info' variant='tonal' />
                  ) : selected.enrichment_level > 0 ? (
                    <Chip label='🔬 L1 Enriquecido (27 campos)' size='small' color='success' variant='tonal' />
                  ) : (
                    <Chip label='📡 L0 Básico (11 campos)' size='small' color='default' variant='tonal' />
                  )}
                </Box>
              </Box>
              <Button onClick={() => setSelected(null)} size='small' sx={{ minWidth: 32 }}><i className='ri-close-line' /></Button>
            </DialogTitle>
            <DialogContent dividers>
              {/* ═══ IDENTIDADE ═══ */}
              <Typography variant='overline' fontWeight={700} color='primary.main'>🏢 Identidade</Typography>
              <Grid container spacing={1} sx={{ mb: 2 }}>
                {[
                  ['Nome', selected.title], ['Categoria GMB', selected.category],
                  ['Categorias', selected.categories_arr?.join(', ') || null],
                  ['Status', selected.business_status],
                  ['Place ID', selected.place_id],
                  ['Descrição', selected.description ? (selected.description.length > 200 ? selected.description.substring(0, 200) + '...' : selected.description) : null],
                  ['Snippet', (selected as any).snippet],
                  ['Fotos', (selected as any).total_photos ? `${selected.total_photos} fotos` : null],
                  ['Horários', parseWorkTimeLabel((selected as any).work_time)],
                  ['Desde', (selected as any).first_seen ? new Date((selected as any).first_seen).toLocaleDateString('pt-BR') : null],
                  ['Atualizado', (selected as any).last_updated_time ? new Date((selected as any).last_updated_time).toLocaleDateString('pt-BR') : null],
                ].filter(([, v]) => v).map(([label, value]) => (
                  <Grid key={label} size={{ xs: 12, sm: 6 }}>
                    <Typography variant='caption' color='text.secondary'>{label}</Typography>
                    <Typography variant='body2' fontWeight={600} sx={{ wordBreak: 'break-all' }}>{value}</Typography>
                  </Grid>
                ))}
              </Grid>

              {/* ═══ LOCALIZAÇÃO ═══ */}
              <Typography variant='overline' fontWeight={700} color='primary.main'>📍 Localização</Typography>
              <Grid container spacing={1} sx={{ mb: 2 }}>
                {[
                  ['Endereço', selected.address], ['Cidade', selected.city],
                  ['Bairro', selected.district], ['CEP', selected.postal_code],
                  ['País', selected.country_code],
                  ['Coordenadas', selected.latitude ? `${selected.latitude.toFixed(4)}, ${selected.longitude?.toFixed(4)}` : null],
                ].filter(([, v]) => v).map(([label, value]) => (
                  <Grid key={label} size={{ xs: 12, sm: 6 }}>
                    <Typography variant='caption' color='text.secondary'>{label}</Typography>
                    <Typography variant='body2' fontWeight={600} sx={{ wordBreak: 'break-all' }}>{value}</Typography>
                  </Grid>
                ))}
              </Grid>

              {/* ═══ CONTATO (L1) ═══ */}
              {selected.enrichment_level > 0 && (
                <>
                  <Typography variant='overline' fontWeight={700} color='success.main'>📞 Contato (L1)</Typography>
                  <Grid container spacing={1} sx={{ mb: 2 }}>
                    {[
                      ['Telefone', selected.phone],
                      ['WhatsApp', waPopupLabel(selected)],
                      ['Website', selected.website],
                      ['Tipo de Site', siteKind(selected.website)],
                    ].filter(([, v]) => v).map(([label, value]) => (
                      <Grid key={label} size={{ xs: 12, sm: 6 }}>
                        <Typography variant='caption' color='text.secondary'>{label}</Typography>
                        <Box sx={{ mt: 0.3 }}>
                          {typeof value === 'string' && value.startsWith('✅') ? <Chip label={value} size='small' color='success' variant='tonal' /> :
                           typeof value === 'string' && value.startsWith('❌') ? <Chip label={value} size='small' color='error' variant='tonal' /> :
                           <Typography variant='body2' fontWeight={600} sx={{ wordBreak: 'break-all' }}>{value}</Typography>}
                        </Box>
                      </Grid>
                    ))}
                  </Grid>
                </>
              )}

              {/* ═══ CONTENT GAP (v0.5) ═══ */}
              {selected.l2_content_maturity != null && (
                <>
                  <Typography variant='overline' fontWeight={700} color='secondary.main'>
                    📝 Content Gap · Maturidade {selected.l2_content_maturity}/4
                  </Typography>
                  <Grid container spacing={1} sx={{ mb: 2 }}>
                    <Grid size={{ xs: 12, sm: 4 }}>
                      <Typography variant='caption' color='text.secondary'>Maturidade</Typography>
                      <Box sx={{ mt: 0.3 }}>
                        <Chip label={(selected.l2_content_gaps as any)?.label || 'Desconhecido'} size='small'
                          sx={{ bgcolor: ['#9e9e9e', '#42a5f5', '#ffa726', '#ef5350', '#4caf50'][selected.l2_content_maturity] || '#9e9e9e', color: '#fff', fontWeight: 700 }} />
                      </Box>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 4 }}>
                      <Typography variant='caption' color='text.secondary'>Score</Typography>
                      <Typography variant='body2' fontWeight={700}>{(selected.l2_content_gaps as any)?.maturity_score ?? '?'}/100</Typography>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 4 }}>
                      <Typography variant='caption' color='text.secondary'>Gaps</Typography>
                      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 0.3 }}>
                        {((selected.l2_content_gaps as any)?.gaps || []).map((g: string) => (
                          <Chip key={g} label={g} size='small' color='error' variant='tonal' sx={{ fontSize: '0.65rem', height: 20 }} />
                        ))}
                      </Box>
                    </Grid>
                  </Grid>
                </>
              )}

              {/* ═══ WEBSITE & SEO (L2) ═══ */}
              {(selected.enrichment_level ?? 0) >= 2 && (
                <>
                  <Typography variant='overline' fontWeight={700} color='info.main'>🌐 Website & SEO (L2 Enriquecido · v0.3)</Typography>
                  <Grid container spacing={1} sx={{ mb: 2 }}>
                    {[
                      ['📊 OnPage Score', selected.l2_onpage_score != null ? `${selected.l2_onpage_score}/100` : null],
                      ['🏷️ Meta Title', selected.l2_meta_title],
                      ['📝 Meta Description', selected.l2_meta_description],
                      ['📖 Palavras', selected.l2_word_count != null ? selected.l2_word_count.toLocaleString('pt-BR') : null],
                      ['🔗 Links Internos', selected.l2_internal_links_count != null ? String(selected.l2_internal_links_count) : null],
                      ['🔗 Links Externos', selected.l2_external_links_count != null ? String(selected.l2_external_links_count) : null],
                      ['🖼️ Imagens', selected.l2_images_count != null ? String(selected.l2_images_count) : null],
                      ['🏗️ CMS', selected.l2_cms],
                      ['📊 Analytics', selected.l2_has_analytics === true ? '✅ Detectado' : selected.l2_has_analytics === false ? '❌ Ausente' : null],
                      ['📈 Domain Rank', selected.l2_domain_rank != null ? String(selected.l2_domain_rank) : null],
                      ['🌍 País', selected.l2_country_iso_code],
                    ].filter(([, v]) => v).map(([label, value]) => (
                      <Grid key={label} size={{ xs: 12, sm: 6 }}>
                        <Typography variant='caption' color='text.secondary'>{label}</Typography>
                        <Box sx={{ mt: 0.3 }}>
                          {typeof value === 'string' && value.startsWith('✅') ? <Chip label={value} size='small' color='success' variant='tonal' /> :
                           typeof value === 'string' && value.startsWith('❌') ? <Chip label={value} size='small' color='error' variant='tonal' /> :
                           typeof value === 'string' && value.includes('/100') ? <Chip label={value} size='small' color={selected.l2_onpage_score! >= 80 ? 'success' : selected.l2_onpage_score! >= 50 ? 'warning' : 'error'} variant='tonal' /> :
                           <Typography variant='body2' fontWeight={600}>{value}</Typography>}
                        </Box>
                      </Grid>
                    ))}
                  </Grid>
                </>
              )}

              {/* ═══ REPUTAÇÃO ═══ */}
              <Typography variant='overline' fontWeight={700} color='warning.main'>⭐ Reputação</Typography>
              <Grid container spacing={1} sx={{ mb: 2 }}>
                {[
                  ['Rating', selected.rating_value ? `${selected.rating_value}★` : null],
                  ['Reviews', String(selected.rating_votes || 0)],
                  ['Distribuição ★', parseRatingDistLabel(selected.rating_distribution)],
                  ['Reivindicado', selected.is_claimed ? '✅ Sim' : '⚠️ Não — não controla o próprio perfil!'],
                  ['Fotos', selected.total_photos != null ? String(selected.total_photos) : null],
                  ['Nível Preço', selected.price_level != null ? '💰'.repeat(Math.max(1, selected.price_level)) + ` (${selected.price_level}/4)` : null],
                  ['Atributos', parseAttrsLabel(selected.attributes)],
                  ['Canal de Contato', selected.contact_methods?.join(', ') || null],
                ].filter(([, v]) => v).map(([label, value]) => (
                  <Grid key={label} size={{ xs: 12, sm: 6 }}>
                    <Typography variant='caption' color='text.secondary'>{label}</Typography>
                    <Typography variant='body2' fontWeight={600} sx={{ wordBreak: 'break-all' }}>{value}</Typography>
                  </Grid>
                ))}
              </Grid>

              {/* ═══ CONCORRENTES (people_also_search) ═══ */}
              {selected.people_also_search && Array.isArray(selected.people_also_search) && selected.people_also_search.length > 0 && (
                <>
                  <Typography variant='overline' fontWeight={700} color='secondary.main'>🏪 Concorrentes Próximos</Typography>
                  <Grid container spacing={1} sx={{ mb: 2 }}>
                    {selected.people_also_search.map((p: any, i: number) => (
                      <Grid key={i} size={{ xs: 12, sm: 6 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Typography variant='body2' fontWeight={600} noWrap sx={{ flex: 1 }}>
                            {p.title || `Concorrente ${i+1}`}
                          </Typography>
                          {p.rating?.value != null && (
                            <Chip label={`${p.rating.value}★`} size='small'
                              color={p.rating.value >= 4 ? 'success' : p.rating.value >= 3 ? 'warning' : 'error'} variant='tonal' />
                          )}
                        </Box>
                      </Grid>
                    ))}
                  </Grid>
                </>
              )}

              {/* ═══ SCORE BREAKDOWN ═══ */}
              <Typography variant='overline' fontWeight={700} color='error.main'>📐 Score Composto</Typography>
              <Grid container spacing={2} sx={{ mb: 2 }}>
                {([
                  ['🎯 Fit (×0.40)', selected.score_fit],
                  ['📊 Engagement (×0.35)', selected.score_engagement],
                  ['🔥 Intent (×0.25)', selected.score_intent],
                ] as const).map(([label, val]) => (
                  <Grid key={label} size={{ xs: 12, sm: 4 }}>
                    <Typography variant='caption' color='text.secondary'>{label}</Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant='h6' fontWeight={800}>{val}</Typography>
                      <LinearProgress variant='determinate' value={val}
                        sx={{ flex: 1, height: 8, borderRadius: 4 }}
                        color={val >= 60 ? 'success' : val >= 40 ? 'warning' : 'error'} />
                    </Box>
                  </Grid>
                ))}
              </Grid>

              {/* ═══ SINAIS DETECTADOS ═══ */}
              {selected.signals_detected && selected.signals_detected.length > 0 && (
                <>
                  <Typography variant='overline' fontWeight={700} color='info.main'>🔬 Sinais Detectados ({selected.signals_detected.length})</Typography>
                  <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 2 }}>
                    {selected.signals_detected.map((s) => (
                      <Chip key={s} label={s} size='small' variant='tonal'
                        color={s.startsWith('I') ? 'error' : s.startsWith('E') ? 'warning' : 'primary'}
                        sx={{ fontSize: '0.65rem' }} />
                    ))}
                  </Box>
                </>
              )}

              {/* ═══ AÇÕES ═══ */}
              <Box sx={{ display: 'flex', gap: 1, mt: 2, flexWrap: 'wrap' }}>
                {selected.place_id && (
                  <Button variant='outlined' size='small' component='a'
                    href={`https://www.google.com/maps/place/?q=place_id:${selected.place_id}`} target='_blank' rel='noopener'
                    startIcon={<i className='ri-map-pin-line' />}>Google Maps</Button>
                )}
                {selected.place_id && (
                  <Button variant='outlined' size='small' component='a' color='secondary'
                    href={`https://www.google.com/maps/search/?api=1&query=Google&query_place_id=${selected.place_id}`} target='_blank' rel='noopener'
                    startIcon={<i className='ri-google-line' />}>Abrir GMB</Button>
                )}
                {selected.website && (
                  <Button variant='outlined' size='small' color='info' component='a'
                    href={selected.website} target='_blank' rel='noopener'
                    startIcon={<i className='ri-global-line' />}>Visitar Site</Button>
                )}
              </Box>
            </DialogContent>
          </>
        )}
      </Dialog>
    </>
  )
}

// ── Helpers ──
function contactLabel(methods: string[] | null): string {
  if (!methods || methods.length === 0) return 'Não detectado'
  if (methods.includes('whatsapp')) return '💬 WhatsApp'
  if (methods.includes('phone_fixo')) return '📞 Telefone'
  if (methods.includes('website_proprio')) return '🌐 Site'
  if (methods.includes('apenas_gmb')) return '📍 Apenas GMB'
  
return methods.join(', ')
}

function detectWA(phone: string | null | undefined): boolean {
  if (!phone) return false
  // Strip all non-digits
  let digits = phone.replace(/\D/g, '')
  // Remove country code 55 if present
  if (digits.startsWith('55') && digits.length >= 12) digits = digits.slice(2)
  // Brazilian cell: 11 digits, 3rd char is '9' (XX 9XXXX-XXXX)
  return digits.length === 11 && digits.charAt(2) === '9'
}

function siteKind(url: string | null | undefined): string | null {
  if (!url) return null
  const u = url.toLowerCase()

  if (u.includes('wixsite.com') || u.includes('wix.com')) return 'Wix'
  if (u.includes('linktr.ee') || u.includes('linktree')) return 'Linktree'
  if (u.includes('facebook.com') || u.includes('instagram.com')) return 'Rede Social'
  if (u.includes('sites.google.com')) return 'Google Sites'

return 'Domínio Próprio'
}

/** 3 primeiras letras de cada rede social do L3 (ex: ins,x,you,lin) */
function socialAbbrev(links: { platform: string; url: string }[] | null): string {
  if (!links || !links.length) return '—'
  const PLATFORM_ABBREV: Record<string, string> = {
    instagram: 'ins', facebook: 'fb', twitter: 'x', youtube: 'you', linkedin: 'lin',
    tiktok: 'tik', pinterest: 'pin', whatsapp: 'w', telegram: 'tel', snapchat: 'snap',
    reddit: 'rdt', twitch: 'tw', spotify: 'sp', soundcloud: 'sc', vimeo: 'vim',
    github: 'git', medium: 'med', discord: 'dis',
  }
  return links.map(l => PLATFORM_ABBREV[l.platform?.toLowerCase()] || l.platform?.slice(0, 3) || '?').join(',')
}

/** Chip 4 estados (v129): 💼Business · 📱WhatsApp · 📱Celular · 📵Fixo · ⏳Pendente
 *
 *  Ordem correta (ADR-0041 + ADR-0042):
 *   1. wa_checked? → Camada 2 (wa.me) já executou
 *   2. wa_is_business → 💼 Business (QUALQUER formato: fixo, celular, URA)
 *   3. wa_has_whatsapp → 📱 WhatsApp
 *   4. detectWA() → 📱 Celular (sem WhatsApp) ou 📵 Fixo (sem WhatsApp)
 *   5. Não verificado → ⏳ Pendente (não assume nada — fixo pode ser Business!)
 */
function waChip4(l: any): { label: string; color: 'primary' | 'success' | 'warning' | 'default' } {
  if (!l.phone) return { label: '—', color: 'default' }

  // Camada 2 já executou — wa.me consultou TODOS os formatos
  if (l.wa_checked) {
    // 💼 Business pode vir de fixo, celular, URA, 0800 — qualquer formato
    if (l.wa_is_business && l.wa_display_name) {
      const name = l.wa_display_name.length > 16 ? l.wa_display_name.slice(0, 16) + '…' : l.wa_display_name
      return { label: `💼 ${name}`, color: 'primary' }
    }
    // 📱 WhatsApp pessoal confirmado (provavelmente celular)
    if (l.wa_has_whatsapp) return { label: '📱 WhatsApp', color: 'success' }
    // Wa-check confirmou que NÃO tem WhatsApp → usa formato pra decidir label
    return detectWA(l.phone) ? { label: '📱 Celular', color: 'warning' } : { label: '📵 Fixo', color: 'default' }
  }

  // ⏳ Ainda não verificado — não assume nada sobre o formato
  return { label: '⏳ Pendente', color: 'default' }
}

/** 3 primeiras letras de cada rede social do L3 (ex: ins,x,you,lin) */

// ── L0 Sleeping Field Helpers (v121) ──

/** Extrai status atual + resumo textual dos horários */
function parseWorkTimeLabel(wt: any): string | null {
  if (!wt) return null
  try {
    const wh = typeof wt === 'string' ? JSON.parse(wt) : wt
    const cs = wh?.work_hours?.current_status
    const tt = wh?.work_hours?.timetable
    if (!tt) return cs ? `🟢 ${cs}` : null
    const days = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday']
    const withHours = days.filter(d => tt[d] && Array.isArray(tt[d]) && tt[d].length > 0)
    const statusEmoji = cs === 'open' ? '🟢' : cs === 'close' ? '🔴' : ''
    if (withHours.length >= 5) return `${statusEmoji} ${withHours.length} dias · ${cs || '?'}`.trim()
    if (withHours.length >= 2) return `${statusEmoji} ${withHours.length} dias`.trim()
    return `${statusEmoji} ${withHours.length} dia(s)`.trim()
  } catch { return null }
}

/** Mini barras de distribuição de reviews 1★-5★ */
function parseRatingDistLabel(rd: any): string | null {
  if (!rd) return null
  try {
    const d = typeof rd === 'string' ? JSON.parse(rd) : rd
    const total = (d['1']||0)+(d['2']||0)+(d['3']||0)+(d['4']||0)+(d['5']||0)
    if (total === 0) return null
    const bars = [5,4,3,2,1].map(s => {
      const n = d[String(s)] || 0
      const pct = Math.round((n/total)*10)
      return `${'█'.repeat(pct)}${'░'.repeat(10-pct)} ${n}`
    }).join('\n')
    return `5★ ${d['5']||0} · 4★ ${d['4']||0} · 3★ ${d['3']||0} · 2★ ${d['2']||0} · 1★ ${d['1']||0}`
  } catch { return null }
}

/** Chips de atributos: pagamento, acessibilidade, amenities */
function parseAttrsLabel(attr: any): string | null {
  if (!attr) return null
  try {
    const a = typeof attr === 'string' ? JSON.parse(attr) : attr
    const av = a?.available_attributes
    if (!av) return null
    const chips: string[] = []
    const payments = av.payments
    if (payments && Array.isArray(payments)) {
      if (payments.some((p: string) => p.includes('credit'))) chips.push('💳 Crédito')
      if (payments.some((p: string) => p.includes('debit'))) chips.push('💳 Débito')
      if (payments.some((p: string) => p.includes('nfc') || p.includes('mobile'))) chips.push('📱 NFC')
    }
    const access = av.accessibility
    if (access && Array.isArray(access) && access.length > 0) chips.push('♿ Acessível')
    const planning = av.planning
    if (planning && Array.isArray(planning) && planning.some((p: string) => p.includes('appointment'))) chips.push('📅 Agendamento')
    const amenities = av.amenities
    if (amenities && Array.isArray(amenities) && amenities.length > 0) {
      if (amenities.some((a: string) => a.includes('restroom'))) chips.push('🚻 Banheiro')
      if (amenities.some((a: string) => a.includes('wifi'))) chips.push('📶 Wi-Fi')
    }
    return chips.length > 0 ? chips.join(' · ') : null
  } catch { return null }
}

/** Label WhatsApp para o popup (v132) — usa dados reais do wa-check */
function waPopupLabel(l: any): string | null {
  if (!l.phone) return null
  if (l.wa_checked) {
    if (l.wa_is_business && l.wa_display_name) return `✅ WhatsApp Business: ${l.wa_display_name}`
    if (l.wa_has_whatsapp) return '✅ WhatsApp pessoal (confirmado via Evolution API)'
    return `❌ Não tem WhatsApp (verificado em ${new Date(l.wa_verified_at || '').toLocaleDateString('pt-BR')})`
  }
  // Fallback: ainda não verificado
  return detectWA(l.phone) ? '⏳ Celular — aguardando verificação wa-check' : '📵 Fixo — aguardando verificação wa-check'
}
