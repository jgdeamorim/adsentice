'use client'

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
  isPreflight: boolean
}

interface ContinueParams {
  categories: string[]; lat: number; lng: number
  radiusKm: number; offset: number; trackerId: string
}

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

interface RmMunicipio { nome: string; lat?: number | null; lng?: number | null }

interface CatInfo { id: string; label: string }

export default function DiscoverySessionLog({
  refreshTrigger, onContinue, onPreflightMissing, onPreflightWave,
  stateKey, rmMunicipios, allCategories,
}: {
  refreshTrigger?: number
  onContinue?: (p: ContinueParams) => void
  onPreflightMissing?: (municipios: { nome: string; lat: number; lng: number }[]) => void
  onPreflightWave?: (categories: string[]) => void
  stateKey?: string
  rmMunicipios?: RmMunicipio[]
  allCategories?: CatInfo[]
}) {
  const [batches, setBatches] = useState<BatchInfo[]>([])
  const [preflights, setPreflights] = useState<BatchInfo[]>([])
  const [orphans, setOrphans] = useState<MunEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [showHistory, setShowHistory] = useState(false)

  const fetchSessions = useCallback(async () => {
    setLoading(true)
    try {
      const url = stateKey ? `/api/discovery/sessions?uf=${stateKey}` : '/api/discovery/sessions'
      const res = await fetch(url)
      const data = await res.json()
      setBatches(data.batches || [])
      setPreflights(data.preflights || [])
      setOrphans(data.orphans || [])
    } catch {} finally { setLoading(false) }
  }, [stateKey])

  useEffect(() => { fetchSessions() }, [fetchSessions, refreshTrigger])

  if (loading) return <Card><CardContent><LinearProgress /></CardContent></Card>

  // ── State-aware mode: gerenciador ──
  if (stateKey && rmMunicipios) {
    const latestPf = preflights[0]  // Latest pre-flight for stats
    const pfMuns = new Set<string>()
    let totalLeads = 0; let totalPages = 0

    // Build COMBINED category set from ALL preflights for this state
    // (Onda 1 + Onda 2 + Onda 3 must merge, not overwrite)
    const allPfCats = new Set<string>()
    for (const pf of preflights) {
      for (const c of (pf.categories || [])) {
        allPfCats.add(c.toLowerCase().replace(/\s+/g, '_'))
      }
    }

    // Build preflight municipality map — match by nearest RM municipality
    if (latestPf) {
      for (const m of latestPf.municipalities) {
        let bestMatch: string | null = null; let bestD = Infinity
        for (const rm of rmMunicipios) {
          if (!rm.lat || !rm.lng) continue
          const d = Math.abs(m.lat - rm.lat) + Math.abs(m.lng - rm.lng)
          if (d < bestD && d < 0.5) { bestD = d; bestMatch = rm.nome }
        }
        if (bestMatch) {
          pfMuns.add(bestMatch)
          totalLeads += m.totalCount || 0
          totalPages += Math.ceil((m.totalCount || 0) / 100)
        }
      }
    }

    // Missing municipalities
    const missing = rmMunicipios.filter(m => m.lat && m.lng && !pfMuns.has(m.nome))
    const complete = pfMuns.size === rmMunicipios.length

    // Pre-flight cost
    const pfCost = latestPf?.totalCost || 0
    const batchCost = totalPages * 0.048 + (latestPf?.munCount || rmMunicipios.length) * 0.0054

    return (
      <Card sx={{ borderTop: '2px solid', borderColor: complete ? 'success.main' : 'warning.main' }}>
        <CardContent sx={{ pb: 1.5 }}>
          {/* Header */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Box>
              <Typography variant='subtitle1' fontWeight={700}>
                📋 Gerenciador {stateKey}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <Chip
                label={complete ? `🟢 ${pfMuns.size}/${rmMunicipios.length} completo` : `⚠️ ${pfMuns.size}/${rmMunicipios.length} pre-flight`}
                size='small' color={complete ? 'success' : 'warning'}
              />
              <Tooltip title='Atualizar'>
                <IconButton size='small' onClick={fetchSessions}><span style={{ fontSize: '1rem' }}>🔄</span></IconButton>
              </Tooltip>
            </Box>
          </Box>

          {/* Municipality checklist */}
          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 1.5 }}>
            {rmMunicipios.filter(m => m.lat && m.lng).map(m => {
              const hasPf = pfMuns.has(m.nome)
              // Find the matching preflight entry by nearest coordinate
              let leadCount = 0
              if (hasPf && latestPf) {
                let bestD = Infinity
                for (const pm of latestPf.municipalities) {
                  if (!m.lat || !m.lng) continue
                  const d = Math.abs(pm.lat - m.lat) + Math.abs(pm.lng - m.lng)
                  if (d < bestD && d < 0.5) { bestD = d; leadCount = pm.totalCount || 0 }
                }
              }
              return (
                <Tooltip key={m.nome} title={hasPf ? `${leadCount.toLocaleString('pt-BR')} leads` : 'Sem pre-flight'}>
                  <Chip
                    label={hasPf ? `✅ ${m.nome}` : `❌ ${m.nome}`}
                    size='small' variant='outlined'
                    color={hasPf ? 'success' : 'default'}
                    sx={{ fontSize: '0.6rem', opacity: hasPf ? 1 : 0.7 }}
                  />
                </Tooltip>
              )
            })}
          </Box>

          {/* ── Category coverage (ondas) ── */}
          {allCategories && allCategories.length > 0 && (() => {
            const covered = allCategories.filter(c => allPfCats.has(c.id))
            const missing = allCategories.filter(c => !allPfCats.has(c.id))
            const totalWaves = Math.ceil(allCategories.length / 10)
            const currentWave = Math.ceil(covered.length / 10) || 1
            const nextWaveCats = allCategories.slice(covered.length, covered.length + 10)

            return (
              <Box sx={{ mb: 1.5 }}>
                {/* Coverage chips */}
                <Typography variant='caption' color='text.secondary' fontWeight={600}>
                  📁 Categorias: {covered.length}/{allCategories.length}
                </Typography>
                <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 0.3 }}>
                  {allCategories.slice(0, 25).map(c => {
                    const hasCat = allPfCats.has(c.id)
                    return (
                      <Chip key={c.id}
                        label={hasCat ? `✅ ${c.label}` : `❌ ${c.label}`}
                        size='small' variant='outlined'
                        color={hasCat ? 'success' : 'default'}
                        sx={{ fontSize: '0.55rem', height: 20, opacity: hasCat ? 1 : 0.6 }} />
                    )
                  })}
                  {allCategories.length > 25 && (
                    <Chip label={`+${allCategories.length - 25}`} size='small' variant='outlined'
                      sx={{ fontSize: '0.55rem', height: 20 }} />
                  )}
                </Box>

                {/* Next wave button */}
                {missing.length > 0 && onPreflightWave && (
                  <Box sx={{ mt: 1, display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
                    <Typography variant='caption' color='text.secondary'>
                      ⚡ {totalWaves} ondas de 10 categorias (DataForSEO max 10/chamada)
                    </Typography>
                    <Button variant='contained' size='small' color='secondary'
                      onClick={() => onPreflightWave(nextWaveCats.map(c => c.id))}
                      sx={{ fontSize: '0.65rem', fontFamily: 'monospace', py: 0.2 }}>
                      🔬 Onda {currentWave + 1}/{totalWaves} · +{nextWaveCats.length} cats
                    </Button>
                    {missing.length > 10 && (
                      <Typography variant='caption' color='text.secondary'>
                        faltam {missing.length} categorias em {Math.ceil(missing.length/10)} ondas
                      </Typography>
                    )}
                  </Box>
                )}
              </Box>
            )
          })()}

          {/* Stats row */}
          {latestPf && (
            <Box sx={{ mb: 1.5, p: 1, bgcolor: 'grey.50', borderRadius: 1 }}>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
                <Chip label={`${latestPf.catLabels?.length || '?'} categorias`} size='small' variant='outlined' />
                <Typography variant='body2' fontWeight={600}>
                  {totalLeads.toLocaleString('pt-BR')} leads est.
                </Typography>
                <Typography variant='body2' color='text.secondary'>
                  · {totalPages} págs · ~${batchCost.toFixed(2)}
                </Typography>
                <Chip label={`🔬 $${pfCost.toFixed(4)}`} size='small' color='secondary' variant='tonal' />
                <Typography variant='caption' color='text.secondary' sx={{ ml: 'auto' }}>
                  {fmtRelative(latestPf.newestAt)}
                </Typography>
              </Box>
            </Box>
          )}

          {/* Actions */}
          <Box sx={{ display: 'flex', gap: 1 }}>
            {latestPf && (
              <Button variant='contained' color='primary' size='small'
                onClick={() => {
                  if (latestPf.categories?.length && latestPf.municipalities?.length) {
                    // Trigger batch via preflight dialog first
                    onContinue?.({
                      categories: latestPf.categories,
                      lat: latestPf.municipalities[0].lat,
                      lng: latestPf.municipalities[0].lng,
                      radiusKm: latestPf.radiusKm || 5,
                      offset: 0,
                      trackerId: '',
                    })
                  }
                }}>
                ▶ Executar Batch Completo
              </Button>
            )}
            <Button variant='outlined' size='small' color='secondary'
              onClick={() => {
                const munList = rmMunicipios
                  .filter(m => m.lat && m.lng)
                  .map(m => ({ nome: m.nome, lat: m.lat!, lng: m.lng! }))
                onPreflightMissing?.(munList)
              }}>
              🔬 Pre-flight {missing.length > 0 ? `faltantes (${missing.length})` : `atualizar`}
            </Button>
          </Box>

          {/* Missing warning */}
          {missing.length > 0 && (
            <Alert severity='warning' sx={{ mt: 1, py: 0 }}>
              <Typography variant='caption'>
                {missing.length} municípios sem pre-flight: {missing.map(m => m.nome).join(', ')}
              </Typography>
            </Alert>
          )}

          {/* History toggle */}
          {(batches.length > 0 || preflights.length > 1) && (
            <Box sx={{ mt: 1.5, borderTop: '1px solid', borderColor: 'divider', pt: 1 }}>
              <Button size='small' onClick={() => setShowHistory(!showHistory)}
                sx={{ fontSize: '0.7rem' }}>
                {showHistory ? '▲' : '▼'} 📜 Histórico {stateKey} ({batches.length + preflights.length})
              </Button>
              {showHistory && (
                <Box sx={{ mt: 0.5 }}>
                  {batches.map(b => (
                    <Box key={b.batchId} sx={{ display: 'flex', gap: 1, alignItems: 'center', py: 0.3 }}>
                      <Chip label='✅ Batch' size='small' color='success' variant='tonal' sx={{ height: 18, fontSize: '0.6rem' }} />
                      <Typography variant='caption'>{b.catLabels?.slice(0, 2).join(', ')} · {b.city}</Typography>
                      <Typography variant='caption' fontWeight={600}>{b.totalLeads.toLocaleString('pt-BR')} leads</Typography>
                      <Typography variant='caption' color='text.secondary'>${b.totalCost.toFixed(4)}</Typography>
                      <Typography variant='caption' color='text.secondary'>{fmtRelative(b.newestAt)}</Typography>
                    </Box>
                  ))}
                  {preflights.map(pf => (
                    <Box key={pf.batchId} sx={{ display: 'flex', gap: 1, alignItems: 'center', py: 0.3 }}>
                      <Chip label='🔬 Pre-flight' size='small' color='secondary' variant='tonal' sx={{ height: 18, fontSize: '0.6rem' }} />
                      <Typography variant='caption'>{pf.catLabels?.slice(0, 2).join(', ')} · {pf.city}</Typography>
                      <Typography variant='caption' fontWeight={600}>{pf.totalLeads.toLocaleString('pt-BR')} leads</Typography>
                      <Typography variant='caption' color='text.secondary'>${pf.totalCost.toFixed(4)}</Typography>
                      <Typography variant='caption' color='text.secondary'>{fmtRelative(pf.newestAt)}</Typography>
                    </Box>
                  ))}
                </Box>
              )}
            </Box>
          )}
        </CardContent>
      </Card>
    )
  }

  // ── Legacy mode (no stateKey) ──
  if (!preflights.length && !batches.length && !orphans.length) return null

  return (
    <Card sx={{ borderTop: '2px solid', borderColor: 'primary.main' }}>
      <CardContent sx={{ pb: 1.5 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Typography variant='subtitle1' fontWeight={700}>📋 Histórico de Discovery</Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Tooltip title='Atualizar'>
              <IconButton size='small' onClick={fetchSessions}><span style={{ fontSize: '1rem' }}>🔄</span></IconButton>
            </Tooltip>
          </Box>
        </Box>

        <Alert severity='info' sx={{ mb: 1, py: 0 }}>
          <Typography variant='caption'>⚡ Selecione um estado no mapa para ver o gerenciador por estado</Typography>
        </Alert>

        {preflights.slice(0, 2).map(pf => (
          <Box key={pf.batchId} sx={{ mb: 1, p: 1, bgcolor: 'secondary.50', borderRadius: 1, border: '1px solid', borderColor: 'secondary.main' }}>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
              <Chip label='🔬 Pre-flight' size='small' color='secondary' />
              <Typography variant='body2' fontWeight={600}>{pf.catLabels?.slice(0, 3).join(' · ')} · {pf.city} · {pf.uf}</Typography>
              <Chip label={`${pf.munCount} mun`} size='small' variant='outlined' />
              <Chip label={`${pf.totalLeads.toLocaleString('pt-BR')} leads`} size='small' color='secondary' variant='tonal' />
              <Chip label={`$${pf.totalCost.toFixed(4)}`} size='small' variant='tonal' color='warning' />
              <Typography variant='caption' color='text.secondary'>{fmtRelative(pf.newestAt)}</Typography>
            </Box>
          </Box>
        ))}
      </CardContent>
    </Card>
  )
}
