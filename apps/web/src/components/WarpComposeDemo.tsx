'use client'

// WarpComposeDemo — Intend Composer (ADR-0032)
// Seleciona segmento + superfície → POST /api/surface/compose → preview
// medido=verdade · 2026-07-17

import { useState } from 'react'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import Chip from '@mui/material/Chip'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import LinearProgress from '@mui/material/LinearProgress'
import Alert from '@mui/material/Alert'

const SEGMENTS = [
  { id: 'saude', label: '🏥 Saúde', color: 'primary' as const },
  { id: 'beleza', label: '💄 Beleza', color: 'error' as const },
  { id: 'servicos', label: '⚖️ Serviços', color: 'info' as const },
  { id: 'alimentacao', label: '🍽️ Alimentação', color: 'warning' as const },
  { id: 'comercio', label: '🛒 Comércio', color: 'secondary' as const },
  { id: 'educacao', label: '📚 Educação', color: 'success' as const },
  { id: 'hospitalidade', label: '🏨 Hospitalidade', color: 'warning' as const },
]

const SURFACES = [
  { id: 'S3', label: 'Dashboard Admin' },
  { id: 'S9', label: 'Portal do Cliente' },
  { id: 'S10', label: 'Raio-X' },
  { id: 'S11', label: 'Landing Page' },
  { id: 'S4', label: 'Checkout' },
  { id: 'S2', label: 'Blog' },
]

interface ComposeResult {
  mutationId: number; mode: string; renderMs: number
  pipelineTrace: string[]
  tokens: { intent: string; segment: string; plan: string; mutationId: number }
}

export default function WarpComposeDemo() {
  const [segment, setSegment] = useState('saude')
  const [surface, setSurface] = useState('S10')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ComposeResult | null>(null)
  const [error, setError] = useState('')

  const handleCompose = async () => {
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/surface/compose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
              intent → resolve → morph → compose → HTML (ADR-0020 + ADR-0032)
            </Typography>
          </Box>
          <Chip label='OD v0.9.0 + EVO-API compose.rs' size='small' variant='outlined' sx={{ fontSize: '0.6rem' }} />
        </Box>

        {/* Segment selector */}
        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 1 }}>
          <Typography variant='caption' color='text.secondary' sx={{ mr: 0.5, mt: 0.5 }}>Segmento:</Typography>
          {SEGMENTS.map(s => (
            <Chip key={s.id} label={s.label} size='small' clickable
              color={segment === s.id ? s.color : 'default'}
              variant={segment === s.id ? 'filled' : 'outlined'}
              onClick={() => setSegment(s.id)}
              sx={{ fontSize: '0.6rem' }} />
          ))}
        </Box>

        {/* Surface selector */}
        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 1.5 }}>
          <Typography variant='caption' color='text.secondary' sx={{ mr: 0.5, mt: 0.5 }}>Superfície:</Typography>
          {SURFACES.map(s => (
            <Chip key={s.id} label={`${s.id} · ${s.label}`} size='small' clickable
              color={surface === s.id ? 'secondary' : 'default'}
              variant={surface === s.id ? 'filled' : 'outlined'}
              onClick={() => setSurface(s.id)}
              sx={{ fontSize: '0.6rem', fontFamily: 'monospace' }} />
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
          </Box>
        )}
      </CardContent>
    </Card>
  )
}
