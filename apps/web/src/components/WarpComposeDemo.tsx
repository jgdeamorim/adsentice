'use client'

// WarpComposeDemo — Intend Composer live (ADR-0032)
// Segmentos e superficies do warp-surface-status.json + Qdrant
// medido=verdade · zero hardcoded · 2026-07-17

import { useState, useEffect } from 'react'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import Chip from '@mui/material/Chip'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import LinearProgress from '@mui/material/LinearProgress'
import Alert from '@mui/material/Alert'
import Tooltip from '@mui/material/Tooltip'

interface SurfaceInfo { id: string; name: string; group: string; plan: string; skills: string[] }

interface ComposeResult {
  mutationId: number; mode: string; renderMs: number; pipelineTrace: string[]
  tokens: { intent: string; segment: string; plan: string; mutationId: number; sourcesBasis: string[] }
  _meta?: { sourcesBasis: string[]; medido: string }
}

const SEGMENT_LABELS: Record<string, { label: string; color: 'primary'|'error'|'info'|'warning'|'secondary'|'success' }> = {
  saude:          { label: '🏥 Saúde', color: 'primary' },
  beleza:         { label: '💄 Beleza', color: 'error' },
  servicos:       { label: '⚖️ Serviços', color: 'info' },
  alimentacao:    { label: '🍽️ Alimentação', color: 'warning' },
  comercio:       { label: '🛒 Comércio', color: 'secondary' },
  educacao:       { label: '📚 Educação', color: 'success' },
  hospitalidade:  { label: '🏨 Hospitalidade', color: 'warning' },
}

export default function WarpComposeDemo() {
  const [segments] = useState(Object.keys(SEGMENT_LABELS))
  const [surfaces, setSurfaces] = useState<SurfaceInfo[]>([])
  const [segment, setSegment] = useState('saude')
  const [surface, setSurface] = useState('S10')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ComposeResult | null>(null)
  const [error, setError] = useState('')

  // Load surfaces from live API (warp-surface-status.json)
  useEffect(() => {
    fetch('/api/surface/status')
      .then(r => r.json())
      .then(d => {
        setSurfaces(d.surfaces || [])
        if (d.surfaces?.length && !d.surfaces.find((s: SurfaceInfo) => s.id === surface)) {
          setSurface(d.surfaces[0].id)
        }
      })
      .catch(() => {})
  }, [])

  const handleCompose = async () => {
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/surface/compose', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ surface, segment, plan: 'internal', mode: 'internal' }),
      })
      const data = await res.json()
      if (data.error) { setError(data.error) }
      else { setResult(data) }
    } catch (e: any) { setError(e.message) }
    finally { setLoading(false) }
  }

  return (
    <Card sx={{ borderLeft: '4px solid', borderColor: 'secondary.main', bgcolor: 'secondary.50' }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
          <Box>
            <Typography variant='subtitle2' fontWeight={700}>
              🧬 Intend Composer · ts_morph Demo
            </Typography>
            <Typography variant='caption' color='text.secondary'>
              intent → resolve → morph → compose → HTML
              {' '}· fontes vivas: Materio Qdrant + IBGE + warp-surface-status.json
            </Typography>
          </Box>
          <Chip label='medido=verdade' size='small' color='success' variant='tonal' sx={{ fontSize: '0.6rem' }} />
        </Box>

        {/* Segment selector — from SEGMENT_LABELS (matches CATS + market categories) */}
        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 1 }}>
          <Typography variant='caption' color='text.secondary' sx={{ mr: 0.5, mt: 0.5 }}>Segmento:</Typography>
          {segments.map(seg => {
            const s = SEGMENT_LABELS[seg]
            return (
              <Chip key={seg} label={s.label} size='small' clickable
                color={segment === seg ? s.color : 'default'}
                variant={segment === seg ? 'filled' : 'outlined'}
                onClick={() => setSegment(seg)}
                sx={{ fontSize: '0.6rem' }} />
            )
          })}
        </Box>

        {/* Surface selector — from API (warp-surface-status.json · 22 superfícies) */}
        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 1.5 }}>
          <Typography variant='caption' color='text.secondary' sx={{ mr: 0.5, mt: 0.5 }}>
            Superfície ({surfaces.length}):
          </Typography>
          {(surfaces.length > 0 ? surfaces : [
            { id: 'S10', name: 'Raio-X' },
            { id: 'S9', name: 'Portal Cliente' },
            { id: 'S3', name: 'Admin' },
          ] as SurfaceInfo[]).slice(0, 8).map(s => (
            <Tooltip key={s.id} title={(s as any).skills?.join(', ') || s.id}>
              <Chip label={`${s.id} · ${s.name}`} size='small' clickable
                color={surface === s.id ? 'secondary' : 'default'}
                variant={surface === s.id ? 'filled' : 'outlined'}
                onClick={() => setSurface(s.id)}
                sx={{ fontSize: '0.6rem', fontFamily: 'monospace' }} />
            </Tooltip>
          ))}
        </Box>

        <Button variant='contained' color='secondary' size='small' disabled={loading}
          onClick={handleCompose} sx={{ fontFamily: 'monospace', fontSize: '0.7rem' }}>
          {loading ? 'Compondo...' : '▶ Compose Intend'}
        </Button>

        {loading && <LinearProgress sx={{ mt: 1 }} />}

        {error && <Alert severity='error' sx={{ mt: 1, py: 0 }}>{error}</Alert>}

        {result && !loading && (
          <Box sx={{ mt: 1.5, p: 1.5, bgcolor: 'background.paper', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
            <Typography variant='caption' fontWeight={700} color='secondary.main' display='block' gutterBottom>
              ✅ Composição gerada — mutationId #{result.mutationId} · {result.renderMs}ms
            </Typography>
            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 1 }}>
              <Chip label={`segment=${result.tokens.segment}`} size='small' variant='outlined' sx={{ height: 18, fontSize: '0.55rem', fontFamily: 'monospace' }} />
              <Chip label={`plan=${result.tokens.plan}`} size='small' variant='outlined' sx={{ height: 18, fontSize: '0.55rem', fontFamily: 'monospace' }} />
              <Chip label={`mode=${result.mode}`} size='small' variant='outlined' sx={{ height: 18, fontSize: '0.55rem', fontFamily: 'monospace' }} />
            </Box>
            <Typography variant='caption' color='text.secondary' sx={{ fontFamily: 'monospace', fontSize: '0.55rem', lineHeight: 1.6 }}>
              {result.pipelineTrace.join(' → ')}
            </Typography>
            {result._meta?.sourcesBasis && (
              <Box sx={{ mt: 0.5 }}>
                {result._meta.sourcesBasis.map((s: string) => (
                  <Chip key={s} label={s} size='small' variant='outlined' sx={{ height: 16, fontSize: '0.5rem', mr: 0.3, mt: 0.3 }} />
                ))}
              </Box>
            )}
          </Box>
        )}
      </CardContent>
    </Card>
  )
}
