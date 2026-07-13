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
  place_id?: string | null
  // L2 fields (v0.3)
  l2_onpage_score?: number | null; l2_meta_title?: string | null
  l2_meta_description?: string | null; l2_word_count?: number | null
  l2_internal_links_count?: number | null; l2_external_links_count?: number | null
  l2_images_count?: number | null; l2_cms?: string | null
  l2_has_analytics?: boolean | null; l2_domain_rank?: number | null
  l2_country_iso_code?: string | null; l2_enriched_at?: string | null
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
              <TableCell>Contato</TableCell>
              <TableCell>Site</TableCell>
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
                  <Chip label={contactLabel(l.contact_methods)} size='small'
                    color={l.contact_methods?.includes('whatsapp') ? 'success' : l.contact_methods?.includes('phone_fixo') ? 'warning' : 'default'} variant='tonal' />
                </TableCell>
                <TableCell>
                  {l.website ? <Chip label='🌐' size='small' color='success' variant='tonal' /> : <Chip label='—' size='small' variant='outlined' sx={{ opacity: 0.5 }} />}
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
                  ['Descrição', selected.description ? (selected.description.length > 150 ? selected.description.substring(0, 150) + '...' : selected.description) : null],
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
                      ['WhatsApp', detectWA(selected.phone)],
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
                  ['Reivindicado', selected.is_claimed ? '✅ Sim' : '⚠️ Não — não controla o próprio perfil!'],
                  ['Fotos', selected.total_photos != null ? String(selected.total_photos) : null],
                  ['Nível Preço', selected.price_level != null ? '💰'.repeat(Math.max(1, selected.price_level)) + ` (${selected.price_level}/4)` : null],
                  ['Canal de Contato', selected.contact_methods?.join(', ') || null],
                ].filter(([, v]) => v).map(([label, value]) => (
                  <Grid key={label} size={{ xs: 12, sm: 6 }}>
                    <Typography variant='caption' color='text.secondary'>{label}</Typography>
                    <Typography variant='body2' fontWeight={600} sx={{ wordBreak: 'break-all' }}>{value}</Typography>
                  </Grid>
                ))}
              </Grid>

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
              <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                {selected.place_id && (
                  <Button variant='outlined' size='small'
                    onClick={() => window.open(`https://www.google.com/maps/place/?q=place_id:${selected.place_id}`, '_blank')}
                    startIcon={<i className='ri-map-pin-line' />}>Google Maps</Button>
                )}
                {selected.website && (
                  <Button variant='outlined' size='small' color='info'
                    onClick={() => window.open(selected.website!, '_blank')}
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

function detectWA(phone: string | null | undefined): string | null {
  if (!phone) return null
  
return /(?:9\d{4}-\d{4}|9\d{8}|\(?\d{2}\)?\s*9\d{4}-?\d{4})/.test(phone) ? '✅ WhatsApp detectado' : '❌ Não é WhatsApp'
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
