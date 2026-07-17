'use client'

// ══════════════════════════════════════════════════════════════════
// ADSENTICE · DiscoverySessionLog — Histórico de sessão Discovery
// Mostra buscas recentes com cache TTL. $0 — Supabase + Redis local.
// ADR-0029 · 2026-07-17
// ══════════════════════════════════════════════════════════════════

import { useEffect, useState, useCallback } from 'react'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import Chip from '@mui/material/Chip'
import Box from '@mui/material/Box'
import LinearProgress from '@mui/material/LinearProgress'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'

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
  createdAt: string
}

interface SessionSummary {
  totalSearches: number
  totalCost: number
  activeCaches: number
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

// ── Simple city resolver: 27 capitais ──
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

export default function DiscoverySessionLog() {
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
              </>
            )}
            <Tooltip title='Atualizar'>
              <IconButton size='small' onClick={fetchSessions}>
                <span style={{ fontSize: '1rem' }}>🔄</span>
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {/* ── Session table ── */}
        <Box sx={{ overflowX: 'auto' }}>
          {sessions.slice(0, 15).map((s) => (
            <Box
              key={s.id}
              sx={{
                display: 'flex', gap: 1.5, alignItems: 'center', py: 1,
                borderBottom: '1px solid', borderColor: 'divider',
                flexWrap: 'wrap',
              }}
            >
              {/* Cache status */}
              <Chip
                label={s.cacheActive ? '🟢 Cache' : '🔴 Expirado'}
                size='small'
                variant='tonal'
                color={s.cacheActive ? 'success' : 'default'}
                sx={{ minWidth: 90 }}
              />

              {/* Categories */}
              <Typography variant='body2' noWrap sx={{ minWidth: 80 }}>
                {s.categories.slice(0, 2).map(catLabel).join(', ')}
                {s.categories.length > 2 ? ` +${s.categories.length - 2}` : ''}
              </Typography>

              {/* City */}
              <Chip label={nearestCapital(s.lat, s.lng)} size='small' variant='outlined' />

              {/* Radius */}
              <Typography variant='caption' color='text.secondary' sx={{ minWidth: 35 }}>
                {s.radiusKm}km
              </Typography>

              {/* Leads */}
              <Typography variant='body2' fontWeight={600} sx={{ minWidth: 60 }}>
                {s.totalCount.toLocaleString('pt-BR')} leads
              </Typography>

              {/* Cost */}
              <Chip label={`$${s.costUsd.toFixed(4)}`} size='small' variant='tonal' color='warning' />

              {/* Cache TTL */}
              {s.cacheTtl ? (
                <Typography variant='caption' color='success.main' sx={{ minWidth: 70 }}>
                  {fmtTtl(s.cacheTtl)}
                </Typography>
              ) : (
                <Typography variant='caption' color='text.disabled'>—</Typography>
              )}

              {/* Time */}
              <Typography variant='caption' color='text.secondary' sx={{ ml: 'auto' }}>
                {fmtTime(s.createdAt)}
              </Typography>
            </Box>
          ))}
        </Box>
      </CardContent>
    </Card>
  )
}
