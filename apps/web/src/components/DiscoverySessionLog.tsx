'use client'

// ══════════════════════════════════════════════════════════════════
// ADSENTICE · DiscoverySessionLog — Histórico de sessão Discovery
// Mostra buscas recentes com cache TTL, tracker_id, progresso.
// Permite continuar buscas incompletas (remaining > 0).
// $0 — Supabase + Redis local. ADR-0029 · 2026-07-17
// ══════════════════════════════════════════════════════════════════

import { useEffect, useState, useCallback } from 'react'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import Chip from '@mui/material/Chip'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import LinearProgress from '@mui/material/LinearProgress'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import Alert from '@mui/material/Alert'

interface SessionEntry {
  id: string
  categories: string[]
  lat: number
  lng: number
  radiusKm: number
  totalCount: number
  costUsd: number
  avgScore: number
  listingsSaved: number
  cacheTtl: number | null
  cacheActive: boolean
  trackerId: string
  fetchedCount: number
  remaining: number
  pagesFetched: number
  offsetsUsed: number[]
  isIncomplete: boolean
  createdAt: string
}

interface ContinueParams {
  categories: string[]
  lat: number
  lng: number
  radiusKm: number
  offset: number
  trackerId: string
}

interface SessionSummary {
  totalSearches: number
  totalCost: number
  activeCaches: number
  incompleteSearches: number
}

const CAT_LABELS: Record<string, string> = {
  dentist: '🦷 Dentista', medical_aesthetic_clinic: '💉 Estética',
  restaurant: '🍽️ Restaurante', gym: '🏋️ Academia', lawyer: '⚖️ Advogado',
  beauty_salon: '💇 Salão', pharmacy: '💊 Farmácia', veterinarian: '🐾 Veterinário',
  psychologist: '🧠 Psicólogo', physical_therapist: '🦴 Fisioterapeuta',
  barber_shop: '💈 Barbearia', accountant: '📊 Contador',
}

function catLabel(c: string): string { return CAT_LABELS[c] || c }

function fmtTtl(seconds: number): string {
  if (seconds <= 0) return 'expirado'
  if (seconds < 60) return `${seconds}s`
  if (seconds < 3600) return `${Math.round(seconds / 60)}min`
  return `${Math.round(seconds / 3600)}h ${Math.round((seconds % 3600) / 60)}min`
}

function fmtTime(iso: string): string {
  try {
    const d = new Date(iso)
    return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
  } catch { return iso?.slice(0, 16) || '' }
}

// ── 27 capitais ──
const CAPS: [string, number, number][] = [
  ['São Paulo', -23.55, -46.63], ['Rio de Janeiro', -22.91, -43.17],
  ['Vitória', -20.32, -40.34], ['Belo Horizonte', -19.92, -43.93],
  ['Brasília', -15.78, -47.93], ['Salvador', -12.97, -38.50],
  ['Fortaleza', -3.72, -38.53], ['Recife', -8.05, -34.88],
  ['Curitiba', -25.43, -49.27], ['Porto Alegre', -30.03, -51.23],
  ['Manaus', -3.12, -60.03], ['Belém', -1.46, -48.48],
  ['Goiânia', -16.68, -49.25], ['São Luís', -2.53, -44.30],
  ['Maceió', -9.67, -35.73], ['Natal', -5.80, -35.21],
  ['Teresina', -5.09, -42.80], ['João Pessoa', -7.12, -34.86],
  ['Cuiabá', -15.60, -56.10], ['Campo Grande', -20.44, -54.64],
  ['Aracaju', -10.95, -37.07], ['Florianópolis', -27.60, -48.55],
  ['Porto Velho', -8.76, -63.90], ['Macapá', 0.03, -51.07],
  ['Rio Branco', -9.97, -67.81], ['Boa Vista', 2.82, -60.67],
  ['Palmas', -10.18, -48.33],
]
function nearestCapital(lat: number, lng: number): string {
  let best = 'BR'; let bestD = Infinity
  for (const c of CAPS) {
    const d = Math.abs(lat - c[1]) + Math.abs(lng - c[2]) * 0.5
    if (d < bestD && d < 2) { bestD = d; best = c[0] }
  }
  return best
}

export default function DiscoverySessionLog({ onContinue }: { onContinue?: (params: ContinueParams) => void }) {
  const [sessions, setSessions] = useState<SessionEntry[]>([])
  const [summary, setSummary] = useState<SessionSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchSessions = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/discovery/sessions')
      const data = await res.json()
      setSessions(data.sessions || [])
      setSummary(data.summary || null)
      setError('')
    } catch {
      setError('API offline')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchSessions() }, [fetchSessions])

  if (loading) return (
    <Card><CardContent><LinearProgress /></CardContent></Card>
  )

  if (error || sessions.length === 0) return null

  return (
    <Card>
      <CardContent sx={{ pb: 1.5 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
          <Typography variant='subtitle2' fontWeight={600}>
            📋 Histórico de Sessão
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            {summary && (
              <>
                <Chip label={`${summary.totalSearches} buscas`} size='small' variant='tonal' color='primary' />
                <Chip label={`$${summary.totalCost.toFixed(4)}`} size='small' variant='tonal' color='warning' />
                <Chip label={`${summary.activeCaches}/${summary.totalSearches} em cache`} size='small' variant='tonal' color={summary.activeCaches > 0 ? 'success' : 'default'} />
                {summary.incompleteSearches > 0 && (
                  <Chip label={`⚠️ ${summary.incompleteSearches} incompletas`} size='small' color='warning' />
                )}
              </>
            )}
            <Tooltip title='Atualizar'>
              <IconButton size='small' onClick={fetchSessions}>
                <span style={{ fontSize: '1rem' }}>🔄</span>
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {/* ⚠️ DataForSEO rate limit info */}
        <Alert severity='info' sx={{ mb: 1.5, py: 0 }}>
          <Typography variant='caption'>
            ⚡ DataForSEO: 2000 req/min · 30 simultâneas · 150ms entre municípios no batch
          </Typography>
        </Alert>

        {/* ── Session rows ── */}
        <Box sx={{ overflowX: 'auto' }}>
          {sessions.slice(0, 20).map((s) => {
            const fetched = s.fetchedCount || s.listingsSaved || 0
            const progressPct = s.totalCount > 0 ? Math.round((fetched / s.totalCount) * 100) : 100

            return (
              <Box
                key={s.id}
                sx={{
                  display: 'flex', flexDirection: 'column', gap: 0.5, py: 1.5,
                  borderBottom: '1px solid', borderColor: 'divider',
                  bgcolor: s.isIncomplete ? 'warning.50' : 'transparent',
                  px: 0.5, borderRadius: 1,
                }}
              >
                {/* Row 1: main info */}
                <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
                  {/* Status */}
                  {s.isIncomplete ? (
                    <Chip label='⚠️ Incompleto' size='small' color='warning' sx={{ minWidth: 95 }} />
                  ) : (
                    <Chip
                      label={s.cacheActive ? '🟢 Cache' : '🔴 Expirado'}
                      size='small' variant='tonal'
                      color={s.cacheActive ? 'success' : 'default'}
                      sx={{ minWidth: 90 }}
                    />
                  )}

                  {/* Categories */}
                  <Typography variant='body2' noWrap sx={{ minWidth: 70, fontWeight: 600 }}>
                    {s.categories.slice(0, 2).map(catLabel).join(', ')}
                    {s.categories.length > 2 ? ` +${s.categories.length - 2}` : ''}
                  </Typography>

                  {/* City + radius */}
                  <Chip label={`${nearestCapital(s.lat, s.lng)} · ${s.radiusKm}km`} size='small' variant='outlined' />

                  {/* Progress bar */}
                  <Box sx={{ flex: 1, minWidth: 120, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <LinearProgress
                      variant='determinate'
                      value={progressPct}
                      color={s.isIncomplete ? 'warning' : 'success'}
                      sx={{ flex: 1, height: 6, borderRadius: 3 }}
                    />
                    <Typography variant='caption' fontWeight={600} noWrap>
                      {fetched}/{s.totalCount}
                    </Typography>
                  </Box>

                  {/* Cost */}
                  <Chip label={`$${s.costUsd.toFixed(4)}`} size='small' variant='tonal' color='warning' />

                  {/* Cache TTL */}
                  {s.cacheTtl && s.cacheTtl > 0 ? (
                    <Chip label={fmtTtl(s.cacheTtl)} size='small' color='success' variant='tonal' />
                  ) : (
                    <Typography variant='caption' color='text.disabled'>—</Typography>
                  )}

                  {/* Time */}
                  <Typography variant='caption' color='text.secondary' sx={{ ml: 'auto' }}>
                    {fmtTime(s.createdAt)}
                  </Typography>
                </Box>

                {/* Row 2: tracker + actions */}
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                  {/* Tracker ID */}
                  <Tooltip title={`offsets: [${s.offsetsUsed?.join(', ')}] · ${s.pagesFetched} páginas`}>
                    <Typography variant='caption' sx={{ fontFamily: 'monospace', color: 'text.secondary', fontSize: '0.65rem' }}>
                      🔑 {s.trackerId || 'N/A'}
                      {s.remaining > 0 && (
                        <span style={{ color: '#ed6c02', marginLeft: 8 }}>
                          +{s.remaining} restantes · {s.pagesFetched} pág · próximo offset={s.offsetsUsed?.length ? s.offsetsUsed[s.offsetsUsed.length - 1] + 100 : 100}
                        </span>
                      )}
                    </Typography>
                  </Tooltip>

                  {/* Continue button (only for incomplete searches) */}
                  {s.isIncomplete && onContinue && (
                    <Button
                      size='small'
                      variant='contained'
                      color='warning'
                      sx={{ ml: 'auto', fontSize: '0.7rem', py: 0.2 }}
                      onClick={() => {
                        const nextOffset = s.offsetsUsed?.length
                          ? s.offsetsUsed[s.offsetsUsed.length - 1] + 100
                          : 100
                        onContinue({
                          categories: s.categories,
                          lat: s.lat,
                          lng: s.lng,
                          radiusKm: s.radiusKm,
                          offset: nextOffset,
                          trackerId: s.trackerId,
                        })
                      }}
                    >
                      ▶ Continuar (offset {s.offsetsUsed?.length ? s.offsetsUsed[s.offsetsUsed.length - 1] + 100 : 100})
                    </Button>
                  )}
                </Box>
              </Box>
            )
          })}
        </Box>
      </CardContent>
    </Card>
  )
}
