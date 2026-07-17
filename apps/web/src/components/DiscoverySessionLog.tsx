'use client'

// ══════════════════════════════════════════════════════════════════
// ADSENTICE · DiscoverySessionLog v2
// Timeline visual · cards por município · agrupado por data
// Auto-refresh ao completar busca · contexto real da RM
// ADR-0029 v2 · 2026-07-17
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
import { keyframes } from '@mui/material/styles'

// ── Types ──
interface MunEntry {
  id: string; categories: string[]; catLabels: string[]
  lat: number; lng: number; radiusKm: number
  totalCount: number; costUsd: number
  city: string; uf: string; progressPct: number
  cacheTtl: number | null; cacheActive: boolean
  trackerId: string; isIncomplete: boolean
  fetchedCount: number; remaining: number
  pagesFetched: number; offsetsUsed: number[]
  createdAt: string; listingsSaved: number
  avgScore: number
}

interface BatchInfo {
  batchId: string
  municipalities: MunEntry[]
  totalCost: number; totalLeads: number
  munCount: number; completeCount: number
  hasIncomplete: boolean; hasActiveCache: boolean
  newestAt: string; dateGroup: string
  categories: string[]; catLabels: string[]
  uf: string; city: string; radiusKm: number
}

interface SessionSummary { totalSearches: number; totalCost: number; activeCaches: number; incompleteBatches: number }

export interface ContinueParams { categories: string[]; lat: number; lng: number; radiusKm: number; offset: number; trackerId: string }

// ── Helpers ──
function fmtRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.round(diff / 60000)
  if (mins < 1) return 'agora'
  if (mins < 60) return `há ${mins}min`
  const hours = Math.round(mins / 60)
  if (hours < 24) return `há ${hours}h`
  return `há ${Math.round(hours / 24)}d`
}

function fmtTtl(s: number): string {
  if (s <= 0) return 'expirado'
  if (s < 3600) return `${Math.round(s / 60)}min`
  return `${Math.round(s / 3600)}h`
}

const pulse = keyframes`
  0% { opacity: 1; }
  50% { opacity: 0.5; }
  100% { opacity: 1; }
`

// ── Component ──
export default function DiscoverySessionLog({ refreshTrigger, onContinue }: {
  refreshTrigger?: number
  onContinue?: (p: ContinueParams) => void
}) {
  const [batches, setBatches] = useState<BatchInfo[]>([])
  const [orphans, setOrphans] = useState<MunEntry[]>([])
  const [summary, setSummary] = useState<SessionSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [expandedBatch, setExpandedBatch] = useState<string | null>(null)
  const [animBatch, setAnimBatch] = useState<string | null>(null)

  const fetchSessions = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/discovery/sessions')
      const data = await res.json()
      setBatches(data.batches || [])
      setOrphans(data.orphans || [])
      setSummary(data.summary || null)
      // Animate newest batch briefly
      if (data.batches?.length) {
        const newest = data.batches[0].batchId
        setAnimBatch(newest)
        setTimeout(() => setAnimBatch(null), 3000)
      }
    } catch {} finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchSessions() }, [fetchSessions, refreshTrigger])

  if (loading) return <Card><CardContent><LinearProgress /></CardContent></Card>
  if (!batches.length && !orphans.length) return null

  // Group by dateGroup (Hoje / Ontem / dd/mm)
  const dateGroups = new Map<string, BatchInfo[]>()
  for (const b of batches) {
    const g = dateGroups.get(b.dateGroup) || []
    g.push(b); dateGroups.set(b.dateGroup, g)
  }

  return (
    <Card sx={{ borderTop: '2px solid', borderColor: 'primary.main' }}>
      <CardContent sx={{ pb: 1.5 }}>
        {/* ── Header ── */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box>
            <Typography variant='subtitle1' fontWeight={700}>
              📋 Histórico de Discovery
            </Typography>
            <Typography variant='caption' color='text.secondary'>
              {summary ? `${summary.totalSearches} buscas · $${summary.totalCost.toFixed(4)} · ${summary.activeCaches} em cache` : ''}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            {summary && summary.incompleteBatches > 0 && (
              <Chip label={`⚠️ ${summary.incompleteBatches} incompletos`} size='small' color='warning' />
            )}
            <Tooltip title='Atualizar'>
              <IconButton size='small' onClick={fetchSessions}><span style={{ fontSize: '1rem' }}>🔄</span></IconButton>
            </Tooltip>
          </Box>
        </Box>

        {/* ── Rate limit info ── */}
        <Alert severity='info' sx={{ mb: 2, py: 0, '& .MuiAlert-message': { py: 0.3 } }}>
          <Typography variant='caption'>⚡ DataForSEO: 2000 req/min · 30 simultâneas · 150ms entre municípios</Typography>
        </Alert>

        {/* ── Timeline ── */}
        <Box sx={{ position: 'relative' }}>
          {[...dateGroups.entries()].map(([dateGroup, groupBatches]) => (
            <Box key={dateGroup} sx={{ mb: 3 }}>
              {/* Date header */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: 'primary.main', flexShrink: 0 }} />
                <Typography variant='overline' fontWeight={700} color='primary' sx={{ letterSpacing: 1 }}>
                  {dateGroup}
                </Typography>
                <Box sx={{ flex: 1, height: 1, bgcolor: 'divider' }} />
                <Typography variant='caption' color='text.secondary'>
                  {groupBatches.length} {groupBatches.length === 1 ? 'batch' : 'batches'}
                </Typography>
              </Box>

              {/* Batch cards */}
              {groupBatches.map((batch) => {
                const isExpanded = expandedBatch === batch.batchId
                const isNew = animBatch === batch.batchId
                const donePct = Math.round((batch.completeCount / batch.munCount) * 100)

                return (
                  <Box key={batch.batchId} sx={{ ml: 3, mb: 1.5, position: 'relative' }}>
                    {/* Vertical timeline connector */}
                    <Box sx={{
                      position: 'absolute', left: -18, top: 24, bottom: -24,
                      width: 2, bgcolor: 'divider',
                      display: groupBatches.indexOf(batch) === groupBatches.length - 1 ? 'none' : 'block',
                    }} />

                    {/* Batch card */}
                    <Box
                      onClick={() => setExpandedBatch(isExpanded ? null : batch.batchId)}
                      sx={{
                        border: '1px solid', borderRadius: 2,
                        borderColor: isNew ? 'primary.main' : batch.hasIncomplete ? 'warning.main' : 'divider',
                        bgcolor: isNew ? 'primary.50' : 'background.paper',
                        overflow: 'hidden',
                        cursor: 'pointer',
                        animation: isNew ? `${pulse} 1.5s ease-in-out` : 'none',
                        transition: 'box-shadow 0.2s',
                        '&:hover': { boxShadow: 2 },
                      }}
                    >
                      {/* Top row: context + status */}
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 2, py: 1.5, flexWrap: 'wrap' }}>
                        {/* Status dot */}
                        <Box sx={{
                          width: 10, height: 10, borderRadius: '50%', flexShrink: 0,
                          bgcolor: batch.hasIncomplete ? 'warning.main' : batch.hasActiveCache ? 'success.main' : 'text.disabled',
                        }} />

                        {/* Categories */}
                        <Typography variant='body2' fontWeight={700} noWrap>
                          {batch.catLabels.join(' · ')}
                        </Typography>

                        {/* Context: RM + state */}
                        <Chip label={`${batch.city} · ${batch.uf}`} size='small' color='primary' variant='tonal' />

                        {/* Pipeline badge */}
                        <Chip label='L0+L4' size='small' variant='outlined' sx={{ fontFamily: 'monospace', fontSize: '0.65rem' }} />

                        {/* Municipality count */}
                        <Chip
                          icon={<span>{isExpanded ? '▼' : '▶'}</span>}
                          label={`${batch.munCount} municípios`}
                          size='small' variant='outlined'
                        />

                        {/* Progress */}
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, minWidth: 100 }}>
                          <LinearProgress
                            variant='determinate' value={donePct}
                            color={batch.hasIncomplete ? 'warning' : 'success'}
                            sx={{ flex: 1, height: 5, borderRadius: 3 }}
                          />
                          <Typography variant='caption' fontWeight={600}>
                            {batch.completeCount}/{batch.munCount}
                          </Typography>
                        </Box>

                        {/* Cost */}
                        <Chip label={`$${batch.totalCost.toFixed(4)}`} size='small' variant='tonal' color='warning' />

                        {/* Time */}
                        <Tooltip title={new Date(batch.newestAt).toLocaleString('pt-BR')}>
                          <Typography variant='caption' color='text.secondary' sx={{ ml: 'auto' }}>
                            {fmtRelative(batch.newestAt)}
                          </Typography>
                        </Tooltip>
                      </Box>

                      {/* Expanded: municipality cards */}
                      <Collapse in={isExpanded}>
                        <Box sx={{ borderTop: '1px solid', borderColor: 'divider', bgcolor: 'grey.50', px: 2, py: 1 }}>
                          {batch.municipalities.map((m) => (
                            <Box key={m.id} sx={{
                              display: 'flex', alignItems: 'center', gap: 1, py: 1,
                              borderBottom: '1px solid', borderColor: 'divider',
                              '&:last-child': { borderBottom: 'none' },
                              flexWrap: 'wrap',
                            }}>
                              {/* Mun status */}
                              <Box sx={{
                                width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                                bgcolor: m.isIncomplete ? 'warning.main' : m.cacheActive ? 'success.main' : 'text.disabled',
                              }} />

                              {/* Mun name */}
                              <Typography variant='body2' fontWeight={600} sx={{ minWidth: 80 }}>
                                {m.city}
                              </Typography>

                              {/* Radius */}
                              <Typography variant='caption' color='text.secondary'>{m.radiusKm}km</Typography>

                              {/* Progress */}
                              <Box sx={{ flex: 1, minWidth: 120, display: 'flex', alignItems: 'center', gap: 1 }}>
                                <LinearProgress
                                  variant='determinate' value={m.progressPct}
                                  color={m.isIncomplete ? 'warning' : 'success'}
                                  sx={{ flex: 1, height: 4, borderRadius: 2 }}
                                />
                                <Typography variant='caption' fontWeight={600} noWrap>
                                  {m.fetchedCount || m.listingsSaved}/{m.totalCount}
                                </Typography>
                              </Box>

                              {/* Leads count */}
                              <Chip label={`${m.listingsSaved} leads`} size='small' variant='outlined' sx={{ height: 20, fontSize: '0.65rem' }} />

                              {/* Cost */}
                              <Typography variant='caption' color='text.secondary' sx={{ fontFamily: 'monospace' }}>
                                ${m.costUsd.toFixed(4)}
                              </Typography>

                              {/* Cache TTL */}
                              {m.cacheActive && m.cacheTtl ? (
                                <Chip label={`🟢 ${fmtTtl(m.cacheTtl)}`} size='small' color='success' variant='tonal' sx={{ height: 20, fontSize: '0.6rem' }} />
                              ) : (
                                <Chip label='🔴 expirado' size='small' variant='tonal' sx={{ height: 20, fontSize: '0.6rem', opacity: 0.6 }} />
                              )}

                              {/* Continue button */}
                              {m.isIncomplete && m.remaining > 0 && onContinue && (
                                <Button
                                  size='small' variant='contained' color='warning'
                                  sx={{ fontSize: '0.6rem', py: 0, px: 1, ml: 'auto', minWidth: 0 }}
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    const nextOffset = (m.offsetsUsed?.[m.offsetsUsed.length - 1] || 0) + 100
                                    onContinue({ categories: m.categories, lat: m.lat, lng: m.lng, radiusKm: m.radiusKm, offset: nextOffset, trackerId: m.trackerId })
                                  }}
                                >
                                  ▶ +{m.remaining}
                                </Button>
                              )}
                            </Box>
                          ))}
                        </Box>
                      </Collapse>
                    </Box>
                  </Box>
                )
              })}
            </Box>
          ))}
        </Box>

        {/* ── Orphans (pré-batch_id) ── */}
        {orphans.length > 0 && (
          <Box sx={{ mt: 3, borderTop: '1px dashed', borderColor: 'divider', pt: 2 }}>
            <Typography variant='caption' color='text.secondary' sx={{ mb: 1, display: 'block' }}>
              🔹 Buscas avulsas (sem batch_id — sessões anteriores)
            </Typography>
            {orphans.slice(0, 3).map(m => (
              <Box key={m.id} sx={{ display: 'flex', gap: 1, alignItems: 'center', py: 0.5, opacity: 0.65 }}>
                <Chip label={m.cacheActive ? '🟢' : '🔴'} size='small' sx={{ minWidth: 38 }} />
                <Typography variant='caption'>{m.catLabels.join(', ')}</Typography>
                <Chip label={m.city} size='small' variant='outlined' />
                <Typography variant='caption'>{m.totalCount} leads</Typography>
                <Chip label={`$${m.costUsd.toFixed(4)}`} size='small' color='warning' variant='tonal' />
                <Typography variant='caption' color='text.secondary'>{fmtRelative(m.createdAt)}</Typography>
              </Box>
            ))}
          </Box>
        )}
      </CardContent>
    </Card>
  )
}
