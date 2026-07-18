'use client'

// WarpComposeDemo v2 — Intend Composer COCKPIT REAL (ADR-0032 + ADR-0037 F6)
// Modo Real: lead Supabase × surface c/ specialist → BLUE L0-L6 → estratégias
//            A/B → GREEN → preview inline + trace das decisões + QG.
// Modo Genérico: compose() ts_morph (esqueleto p/ surfaces sem specialist).
// medido=verdade · zero hardcoded · 2026-07-18

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
import MenuItem from '@mui/material/MenuItem'
import TextField from '@mui/material/TextField'

interface SurfaceInfo { id: string; name: string; group: string; plan: string; skills: string[]; routeLive?: boolean }

interface LeadInfo {
  place_id: string; title: string; category: string
  city: string | null; district: string | null
  score_compound: number; rating_value: number | null; rating_votes: number | null
}

interface ComposeResult {
  mutationId: number; mode: string; renderMs: number; pipelineTrace: string[]
  tokens: { intent: string; segment: string; plan: string; mutationId: number; sourcesBasis: string[] }
  _meta?: { sourcesBasis: string[]; medido: string }
}

interface S11Variant {
  ab: 'A' | 'B'; strategyFacet: string; hypothesis: string
  copyModel: string; headline: string; html: string
  qualityGate: { passed: boolean; score: number }
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

// Surfaces com specialist registrado no Router (g0) — cockpit real
const REAL_SURFACES = [
  { id: 'S10', name: 'Raio-X', route: (pid: string) => `/s10-raio-x/${pid}` },
  { id: 'S11', name: 'Landing do Cliente', route: (pid: string) => `/s11-landing/${pid}` },
]

export default function WarpComposeDemo() {
  const [cockpitMode, setCockpitMode] = useState<'real' | 'generic'>('real')
  const [segments] = useState(Object.keys(SEGMENT_LABELS))
  const [surfaces, setSurfaces] = useState<SurfaceInfo[]>([])
  const [leads, setLeads] = useState<LeadInfo[]>([])
  const [leadId, setLeadId] = useState('')
  const [segment, setSegment] = useState('saude')
  const [surface, setSurface] = useState('S10')
  const [realSurface, setRealSurface] = useState('S11')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ComposeResult | null>(null)
  const [realS10, setRealS10] = useState<{ html: string; meta: any } | null>(null)
  const [realS11, setRealS11] = useState<{ variants: S11Variant[]; meta: any } | null>(null)
  const [variantTab, setVariantTab] = useState<'A' | 'B'>('A')
  const [elapsed, setElapsed] = useState(0)
  const [error, setError] = useState('')

  // Fontes vivas: surfaces (status API) + leads reais (Supabase via compose GET)
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
    fetch('/api/surface/compose')
      .then(r => r.json())
      .then(d => {
        setLeads(d.leads || [])
        if (d.leads?.length) setLeadId(d.leads[0].place_id)
      })
      .catch(() => {})
  }, [])

  // ── COCKPIT REAL: lead × surface → pipeline completo ──
  const handleComposeReal = async () => {
    if (!leadId) { setError('Selecione um lead'); return }
    setLoading(true); setError(''); setRealS10(null); setRealS11(null)
    const t0 = Date.now()
    try {
      const res = await fetch('/api/surface/compose', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ place_id: leadId, surface: realSurface }),
      })
      const data = await res.json()
      setElapsed(Math.round((Date.now() - t0) / 100) / 10)
      if (data.error) { setError(data.error) }
      else if (realSurface === 'S11') { setRealS11(data); setVariantTab('A') }
      else { setRealS10(data) }
    } catch (e: any) { setError(e.message) }
    finally { setLoading(false) }
  }

  // ── GENÉRICO: esqueleto ts_morph (surfaces sem specialist) ──
  const handleComposeGeneric = async () => {
    setLoading(true); setError(''); setResult(null)
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

  const selectedLead = leads.find(l => l.place_id === leadId)
  const activeVariant = realS11?.variants.find(v => v.ab === variantTab)
  const realRoute = REAL_SURFACES.find(s => s.id === realSurface)

  return (
    <Card sx={{ borderLeft: '4px solid', borderColor: 'secondary.main', bgcolor: 'secondary.50' }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5, flexWrap: 'wrap', gap: 1 }}>
          <Box>
            <Typography variant='subtitle2' fontWeight={700}>
              🧬 Intend Composer v2 · Cockpit Real
            </Typography>
            <Typography variant='caption' color='text.secondary'>
              {cockpitMode === 'real'
                ? 'lead real → BLUE L0-L6 (M9 + Qdrant + estratégias) → GREEN → artefato'
                : 'intent → resolve → morph → compose (esqueleto ts_morph · surfaces sem specialist)'}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            <Chip label='⚡ Real' size='small' clickable
              color={cockpitMode === 'real' ? 'secondary' : 'default'}
              variant={cockpitMode === 'real' ? 'filled' : 'outlined'}
              onClick={() => setCockpitMode('real')} sx={{ fontSize: '0.6rem' }} />
            <Chip label='🧪 Genérico' size='small' clickable
              color={cockpitMode === 'generic' ? 'secondary' : 'default'}
              variant={cockpitMode === 'generic' ? 'filled' : 'outlined'}
              onClick={() => setCockpitMode('generic')} sx={{ fontSize: '0.6rem' }} />
            <Chip label='medido=verdade' size='small' color='success' variant='tonal' sx={{ fontSize: '0.6rem' }} />
          </Box>
        </Box>

        {cockpitMode === 'real' ? (
          <>
            {/* ═══ LEAD REAL (Supabase · enriquecido pelo pipeline admin) ═══ */}
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center', mb: 1.5 }}>
              <TextField select size='small' label={`Lead (${leads.length})`} value={leadId}
                onChange={e => setLeadId(e.target.value)} sx={{ minWidth: 320 }}>
                {leads.map(l => (
                  <MenuItem key={l.place_id} value={l.place_id}>
                    <Typography variant='caption' sx={{ fontFamily: 'monospace' }}>
                      {l.title} · {l.category} · {l.district || l.city} · score {l.score_compound}
                      {l.rating_value ? ` · ${l.rating_value}★(${l.rating_votes})` : ''}
                    </Typography>
                  </MenuItem>
                ))}
              </TextField>
              {REAL_SURFACES.map(s => (
                <Chip key={s.id} label={`${s.id} · ${s.name}`} size='small' clickable
                  color={realSurface === s.id ? 'secondary' : 'default'}
                  variant={realSurface === s.id ? 'filled' : 'outlined'}
                  onClick={() => setRealSurface(s.id)}
                  sx={{ fontSize: '0.6rem', fontFamily: 'monospace' }} />
              ))}
              <Button variant='contained' color='secondary' size='small' disabled={loading || !leadId}
                onClick={handleComposeReal} sx={{ fontFamily: 'monospace', fontSize: '0.7rem' }}>
                {loading ? 'Compondo pipeline real…' : '▶ Compor de verdade'}
              </Button>
              {realRoute && leadId && (
                <Button size='small' variant='outlined' color='secondary' component='a' target='_blank'
                  href={realRoute.route(leadId)} sx={{ fontSize: '0.65rem' }}>
                  ↗ rota pública
                </Button>
              )}
            </Box>

            {loading && (
              <Box sx={{ mb: 1 }}>
                <LinearProgress color='secondary' />
                <Typography variant='caption' color='text.secondary'>
                  {realSurface === 'S11'
                    ? 'BLUE 1× → estratégias → 2× (layout + copy DeepSeek + render)… ~20-40s'
                    : 'BLUE L0-L6 (9 queries + DeepSeek) → GREEN… ~10-15s'}
                </Typography>
              </Box>
            )}

            {error && <Alert severity='error' sx={{ mb: 1, py: 0 }}>{error}</Alert>}

            {/* ═══ RESULTADO S11: 2 estratégias lado a lado ═══ */}
            {realS11 && !loading && (
              <Box sx={{ p: 1.5, bgcolor: 'background.paper', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap', mb: 1 }}>
                  <Typography variant='caption' fontWeight={700} color='secondary.main'>
                    ✅ Par A/B composto em {elapsed}s · {selectedLead?.title}
                  </Typography>
                  {realS11.variants.map(v => (
                    <Chip key={v.ab} clickable size='small'
                      label={`${v.ab} · ${v.strategyFacet} · QG ${v.qualityGate.score}/5`}
                      color={variantTab === v.ab ? 'secondary' : 'default'}
                      variant={variantTab === v.ab ? 'filled' : 'outlined'}
                      onClick={() => setVariantTab(v.ab)}
                      sx={{ fontFamily: 'monospace', fontSize: '0.6rem' }} />
                  ))}
                  <Chip label={`copy: ${activeVariant?.copyModel}`} size='small' variant='outlined' sx={{ height: 18, fontSize: '0.55rem' }} />
                </Box>
                {activeVariant && (
                  <>
                    <Typography variant='caption' sx={{ display: 'block', fontStyle: 'italic', mb: 0.5 }} color='text.secondary'>
                      hipótese: {activeVariant.hypothesis}
                    </Typography>
                    <Typography variant='caption' sx={{ display: 'block', fontWeight: 700, mb: 1 }}>
                      "{activeVariant.headline}"
                    </Typography>
                    <Box component='iframe' sandbox='' srcDoc={activeVariant.html}
                      sx={{ width: '100%', height: 460, border: '1px solid', borderColor: 'divider', borderRadius: 1, bgcolor: '#fff' }}
                      title={`S11 variante ${activeVariant.ab}`} />
                  </>
                )}
                {realS11.meta?.strategies?.reasoning && (
                  <Typography variant='caption' color='text.secondary'
                    sx={{ fontFamily: 'monospace', fontSize: '0.55rem', lineHeight: 1.6, display: 'block', mt: 1 }}>
                    {realS11.meta.strategies.reasoning.slice(0, 5).join(' · ')}
                  </Typography>
                )}
              </Box>
            )}

            {/* ═══ RESULTADO S10 ═══ */}
            {realS10 && !loading && (
              <Box sx={{ p: 1.5, bgcolor: 'background.paper', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap', mb: 1 }}>
                  <Typography variant='caption' fontWeight={700} color='secondary.main'>
                    ✅ Raio-X composto em {elapsed}s · {selectedLead?.title}
                  </Typography>
                  <Chip label={`QG ${realS10.meta?.qualityGate?.score ?? '?'}/5`} size='small'
                    color={realS10.meta?.qualityGate?.passed ? 'success' : 'warning'} variant='tonal'
                    sx={{ fontFamily: 'monospace', fontSize: '0.6rem' }} />
                  <Chip label={`copy: ${realS10.meta?.copy_model}`} size='small' variant='outlined' sx={{ height: 18, fontSize: '0.55rem' }} />
                  <Chip label={`score ${realS10.meta?.score}`} size='small' variant='outlined' sx={{ height: 18, fontSize: '0.55rem' }} />
                </Box>
                <Typography variant='caption' sx={{ display: 'block', fontWeight: 700, mb: 1 }}>
                  "{realS10.meta?.headline}"
                </Typography>
                <Box component='iframe' sandbox='' srcDoc={realS10.html}
                  sx={{ width: '100%', height: 460, border: '1px solid', borderColor: 'divider', borderRadius: 1, bgcolor: '#fff' }}
                  title='S10 Raio-X' />
              </Box>
            )}
          </>
        ) : (
          <>
            {/* ═══ MODO GENÉRICO (preservado — esqueleto p/ surfaces planned) ═══ */}
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
              onClick={handleComposeGeneric} sx={{ fontFamily: 'monospace', fontSize: '0.7rem' }}>
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
          </>
        )}
      </CardContent>
    </Card>
  )
}
