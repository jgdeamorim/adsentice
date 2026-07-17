'use client'

// ══════════════════════════════════════════════════════════════════
// ADSENTICE · DiscoverySessionLog — Histórico de sessão Discovery
// Agrupa buscas por batch_id. Expansível para ver detalhes por município.
// ADR-0029 · 2026-07-17
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
import Collapse from '@mui/material/Collapse'

interface SessionEntry {
  id: string
  categories: string[]
  lat: number; lng: number; radiusKm: number
  totalCount: number; costUsd: number; avgScore: number
  listingsSaved: number
  cacheTtl: number | null; cacheActive: boolean
  trackerId: string; batchId: string | null
  fetchedCount: number; remaining: number
  pagesFetched: number; offsetsUsed: number[]
  isIncomplete: boolean
  createdAt: string
}

interface BatchGroup {
  batchId: string
  sessions: SessionEntry[]
  totalCost: number
  totalLeads: number
  municipalityCount: number
  hasActiveCache: boolean
  hasIncomplete: boolean
  newestAt: string
  categories: string[]
}

interface ContinueParams {
  categories: string[]; lat: number; lng: number
  radiusKm: number; offset: number; trackerId: string
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
  return `${Math.round(seconds / 3600)}h`
}

function fmtTime(iso: string): string {
  try { return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) }
  catch { return iso?.slice(0, 16) || '' }
}

const CAPS: [string, number, number][] = [
  ['São Paulo', -23.55, -46.63], ['Rio de Janeiro', -22.91, -43.17],
  ['Vitória', -20.32, -40.34], ['Belo Horizonte', -19.92, -43.93],
  ['Brasília', -15.78, -47.93], ['Salvador', -12.97, -38.50],
  ['Fortaleza', -3.72, -38.53], ['Recife', -8.05, -34.88],
  ['Curitiba', -25.43, -49.27], ['Porto Alegre', -30.03, -51.23],
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
  const [loading, setLoading] = useState(true)
  const [expandedBatch, setExpandedBatch] = useState<string | null>(null)

  const fetchSessions = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/discovery/sessions')
      const data = await res.json()
      setSessions(data.sessions || [])
    } catch { /* offline */ }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchSessions() }, [fetchSessions])

  if (loading) return <Card><CardContent><LinearProgress /></CardContent></Card>
  if (sessions.length === 0) return null

  // ── Group by batch_id ──
  const grouped = new Map<string, SessionEntry[]>()
  const orphans: SessionEntry[] = []

  for (const s of sessions) {
    if (s.batchId) {
      const g = grouped.get(s.batchId) || []
      g.push(s)
      grouped.set(s.batchId, g)
    } else {
      orphans.push(s)
    }
  }

  const batches: BatchGroup[] = [...grouped.entries()].map(([batchId, batchSessions]) => ({
    batchId,
    sessions: batchSessions,
    totalCost: batchSessions.reduce((sum, s) => sum + (s.costUsd || 0), 0),
    totalLeads: batchSessions.reduce((sum, s) => sum + (s.fetchedCount || 0), 0),
    municipalityCount: batchSessions.length,
    hasActiveCache: batchSessions.some(s => s.cacheActive),
    hasIncomplete: batchSessions.some(s => s.isIncomplete),
    newestAt: batchSessions[0]?.createdAt || '',
    categories: [...new Set(batchSessions.flatMap(s => s.categories))],
  }))

  const totalBatches = batches.length + (orphans.length > 0 ? 1 : 0)

  return (
    <Card>
      <CardContent sx={{ pb: 1.5 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Typography variant='subtitle2' fontWeight={600}>
            📋 Histórico de Sessão · {totalBatches} {totalBatches === 1 ? 'batch' : 'batches'}
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Chip label={`${sessions.length} buscas`} size='small' variant='tonal' color='primary' />
            {batches.filter(b => b.hasIncomplete).length > 0 && (
              <Chip label={`⚠️ ${batches.filter(b => b.hasIncomplete).length} incompletos`} size='small' color='warning' />
            )}
            <Tooltip title='Atualizar'>
              <IconButton size='small' onClick={fetchSessions}>
                <span style={{ fontSize: '1rem' }}>🔄</span>
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        <Alert severity='info' sx={{ mb: 1.5, py: 0 }}>
          <Typography variant='caption'>
            ⚡ DataForSEO: 2000 req/min · Cada batch = 1 linha · Clique para expandir municípios
          </Typography>
        </Alert>

        {/* ── BATCH GROUPS ── */}
        {batches.map((batch) => {
          const isExpanded = expandedBatch === batch.batchId
          const completePct = batch.sessions.length > 0
            ? Math.round((batch.sessions.filter(s => !s.isIncomplete).length / batch.sessions.length) * 100)
            : 100

          return (
            <Box key={batch.batchId} sx={{ mb: 1 }}>
              {/* Batch header row */}
              <Box
                onClick={() => setExpandedBatch(isExpanded ? null : batch.batchId)}
                sx={{
                  display: 'flex', gap: 1.5, alignItems: 'center', py: 1.5, px: 1,
                  bgcolor: batch.hasIncomplete ? 'warning.50' : 'grey.50',
                  borderRadius: 1, cursor: 'pointer',
                  border: '1px solid', borderColor: 'divider',
                  '&:hover': { bgcolor: 'action.hover' },
                  flexWrap: 'wrap',
                }}
              >
                <Chip label={isExpanded ? '▼' : '▶'} size='small' variant='outlined' sx={{ minWidth: 32 }} />

                {/* Status */}
                {batch.hasIncomplete ? (
                  <Chip label={`⚠️ ${completePct}%`} size='small' color='warning' />
                ) : batch.hasActiveCache ? (
                  <Chip label='🟢 Completo' size='small' color='success' variant='tonal' />
                ) : (
                  <Chip label='🔴 Expirado' size='small' color='default' variant='tonal' />
                )}

                {/* Categories */}
                <Typography variant='body2' fontWeight={600} noWrap sx={{ minWidth: 80 }}>
                  {batch.categories.slice(0, 2).map(catLabel).join(', ')}
                  {batch.categories.length > 2 ? ` +${batch.categories.length - 2}` : ''}
                </Typography>

                {/* Municipality count */}
                <Chip label={`${batch.municipalityCount} municípios`} size='small' variant='outlined' />

                {/* Total leads */}
                <Typography variant='body2' fontWeight={600}>
                  {batch.totalLeads.toLocaleString('pt-BR')} leads
                </Typography>

                {/* Cost */}
                <Chip label={`$${batch.totalCost.toFixed(4)}`} size='small' variant='tonal' color='warning' />

                {/* Batch ID */}
                <Typography variant='caption' sx={{ fontFamily: 'monospace', color: 'text.secondary', fontSize: '0.6rem' }}>
                  🔑 {batch.batchId.slice(0, 14)}
                </Typography>

                {/* Time */}
                <Typography variant='caption' color='text.secondary' sx={{ ml: 'auto' }}>
                  {fmtTime(batch.newestAt)}
                </Typography>
              </Box>

              {/* Expanded: municipality details */}
              <Collapse in={isExpanded}>
                <Box sx={{ pl: 4, pr: 1, py: 1 }}>
                  {batch.sessions.map((s) => {
                    const pct = s.totalCount > 0 ? Math.round(((s.fetchedCount || 0) / s.totalCount) * 100) : 100
                    return (
                      <Box key={s.id} sx={{ display: 'flex', gap: 1, alignItems: 'center', py: 0.5, borderBottom: '1px solid', borderColor: 'divider', flexWrap: 'wrap' }}>
                        <Chip
                          label={s.isIncomplete ? '⚠️' : s.cacheActive ? '🟢' : '🔴'}
                          size='small' variant='tonal'
                          color={s.isIncomplete ? 'warning' : s.cacheActive ? 'success' : 'default'}
                          sx={{ minWidth: 38 }}
                        />
                        <Chip label={nearestCapital(s.lat, s.lng)} size='small' variant='outlined' />
                        <Typography variant='caption'>{s.radiusKm}km</Typography>
                        <Box sx={{ flex: 1, minWidth: 100, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <LinearProgress variant='determinate' value={pct} color={s.isIncomplete ? 'warning' : 'success'} sx={{ flex: 1, height: 4, borderRadius: 2 }} />
                          <Typography variant='caption' fontWeight={600}>{s.fetchedCount || 0}/{s.totalCount}</Typography>
                        </Box>
                        <Chip label={`$${s.costUsd.toFixed(4)}`} size='small' variant='tonal' color='warning' />
                        {s.cacheTtl && s.cacheTtl > 0 ? (
                          <Chip label={fmtTtl(s.cacheTtl)} size='small' color='success' variant='tonal' />
                        ) : <Typography variant='caption' color='text.disabled'>—</Typography>}
                        <Typography variant='caption' sx={{ fontFamily: 'monospace', fontSize: '0.55rem', color: 'text.secondary' }}>
                          {s.trackerId.slice(0, 14)}
                        </Typography>
                        {s.isIncomplete && s.remaining > 0 && onContinue && (
                          <Button size='small' variant='outlined' color='warning' sx={{ fontSize: '0.6rem', py: 0, ml: 'auto' }}
                            onClick={(e) => { e.stopPropagation(); onContinue({ categories: s.categories, lat: s.lat, lng: s.lng, radiusKm: s.radiusKm, offset: (s.offsetsUsed?.[s.offsetsUsed.length - 1] || 0) + 100, trackerId: s.trackerId }) }}>
                            ▶ +{s.remaining}
                          </Button>
                        )}
                      </Box>
                    )
                  })}
                </Box>
              </Collapse>
            </Box>
          )
        })}

        {/* ── Ungrouped (pré-batch_id) ── */}
        {orphans.length > 0 && (
          <Box sx={{ mt: 2 }}>
            <Typography variant='caption' color='text.secondary' sx={{ mb: 0.5, display: 'block' }}>
              🔹 Buscas avulsas (sem batch_id — anteriores a 2026-07-17)
            </Typography>
            {orphans.slice(0, 5).map((s) => (
              <Box key={s.id} sx={{ display: 'flex', gap: 1, alignItems: 'center', py: 0.5, borderBottom: '1px solid', borderColor: 'divider', flexWrap: 'wrap', opacity: 0.7 }}>
                <Chip label={s.cacheActive ? '🟢' : '🔴'} size='small' variant='tonal' color={s.cacheActive ? 'success' : 'default'} sx={{ minWidth: 38 }} />
                <Typography variant='body2'>{s.categories.slice(0, 2).map(catLabel).join(', ')}</Typography>
                <Chip label={nearestCapital(s.lat, s.lng)} size='small' variant='outlined' />
                <Typography variant='caption'>{s.totalCount} leads</Typography>
                <Chip label={`$${s.costUsd.toFixed(4)}`} size='small' variant='tonal' color='warning' />
                <Typography variant='caption' color='text.secondary'>{fmtTime(s.createdAt)}</Typography>
              </Box>
            ))}
            {orphans.length > 5 && (
              <Typography variant='caption' color='text.secondary'>+{orphans.length - 5} buscas antigas</Typography>
            )}
          </Box>
        )}
      </CardContent>
    </Card>
  )
}
