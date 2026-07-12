'use client'

// adsentice · Admin / Discovery v0.2 — Score Composto + Schwartz + Benchmark
// Pain Criteria v1.2: Fit×0.40 + Engagement×0.35 + Intent×0.25
import { useState, useMemo, useCallback } from 'react'

import { useParams } from 'next/navigation'

import Grid from '@mui/material/Grid2'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import Chip from '@mui/material/Chip'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
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
import DialogActions from '@mui/material/DialogActions'
import IconButton from '@mui/material/IconButton'
import TablePagination from '@mui/material/TablePagination'
import TableSortLabel from '@mui/material/TableSortLabel'
import LinearProgress from '@mui/material/LinearProgress'
import Tooltip from '@mui/material/Tooltip'
import Alert from '@mui/material/Alert'
import Slider from '@mui/material/Slider'


// ── Scoring types (client-safe) ──
interface ScoreData {
  compound: number
  fit: { raw: number; maxRaw: number; normalized: number; signalsDetected: string[]; signalsMissing: string[] }
  engagement: { raw: number; maxRaw: number; normalized: number; signalsDetected: string[]; signalsMissing: string[] }
  intent: { raw: number; maxRaw: number; normalized: number; signalsDetected: string[]; signalsMissing: string[] }
  schwartz: { level: number; label: string; colorHex: string; action: string; messagingRule: string }
  confidence: number; signalsTotal: number; antiFpFlags: string[]
}
interface ScoreDistribution { unaware: number; problemAware: number; solutionAware: number; productAware: number; mostAware: number; total: number; avgScore: number }
interface CompetitiveData { lead_rank: number; lead_metrics: Record<string, number>; market_avg: Record<string, number>; top_competitors: { title: string | null; rating_value: number | null; rating_votes: number | null; score?: number; schwartz_label?: string; is_claimed?: boolean | null }[]; gaps: string[] }

// ── Schwartz chip config ──
const SCHWARTZ_CHIPS = [
  { level: 1, label: 'Unaware', color: '#9e9e9e' },
  { level: 2, label: 'Problem Aware', color: '#42a5f5' },
  { level: 3, label: 'Solution Aware', color: '#ffa726' },
  { level: 4, label: 'Product Aware', color: '#ef5350' },
  { level: 5, label: 'Most Aware', color: '#d32f2f' },
] as const

// ── Geo Data ──
const STATES: Record<string, { label: string; cities: Record<string, { lat: number; lng: number; label: string }> }> = {
  'SP': { label: 'SP', cities: {
    'sp-capital': { lat: -23.5505, lng: -46.6333, label: 'São Paulo (Capital)' },
    'sp-campinas': { lat: -22.9056, lng: -47.0608, label: 'Campinas' },
    'sp-santos': { lat: -23.9608, lng: -46.3336, label: 'Santos' },
    'sp-sjcampos': { lat: -23.1791, lng: -45.8872, label: 'São José dos Campos' },
    'sp-ribeirao': { lat: -21.1767, lng: -47.8202, label: 'Ribeirão Preto' },
    'sp-sorocaba': { lat: -23.5015, lng: -47.4526, label: 'Sorocaba' },
  }},
  'RJ': { label: 'RJ', cities: { 'rj-capital': { lat: -22.9068, lng: -43.1729, label: 'Rio de Janeiro (Capital)' }, 'rj-niteroi': { lat: -22.8832, lng: -43.1034, label: 'Niterói' } }},
  'MG': { label: 'MG', cities: { 'mg-bh': { lat: -19.9167, lng: -43.9345, label: 'Belo Horizonte' }, 'mg-uberlandia': { lat: -18.9186, lng: -48.2772, label: 'Uberlândia' } }},
  'PR': { label: 'PR', cities: { 'pr-curitiba': { lat: -25.4284, lng: -49.2733, label: 'Curitiba' }, 'pr-londrina': { lat: -23.3103, lng: -51.1628, label: 'Londrina' }, 'pr-maringa': { lat: -23.4253, lng: -51.9386, label: 'Maringá' } }},
  'RS': { label: 'RS', cities: { 'rs-poa': { lat: -30.0346, lng: -51.2177, label: 'Porto Alegre' }, 'rs-caxias': { lat: -29.1685, lng: -51.1794, label: 'Caxias do Sul' } }},
  'SC': { label: 'SC', cities: { 'sc-floripa': { lat: -27.5969, lng: -48.5495, label: 'Florianópolis' }, 'sc-joinville': { lat: -26.3045, lng: -48.8487, label: 'Joinville' } }},
  'BA': { label: 'BA', cities: { 'ba-salvador': { lat: -12.9714, lng: -38.5014, label: 'Salvador' } }},
  'PE': { label: 'PE', cities: { 'pe-recife': { lat: -8.0476, lng: -34.8770, label: 'Recife' } }},
  'CE': { label: 'CE', cities: { 'ce-fortaleza': { lat: -3.7172, lng: -38.5434, label: 'Fortaleza' } }},
  'DF': { label: 'DF', cities: { 'df-brasilia': { lat: -15.8267, lng: -47.9218, label: 'Brasília' } }},
  'GO': { label: 'GO', cities: { 'go-goiania': { lat: -16.6869, lng: -49.2648, label: 'Goiânia' } }},
  'AM': { label: 'AM', cities: { 'am-manaus': { lat: -3.1190, lng: -60.0217, label: 'Manaus' } }},
  'PA': { label: 'PA', cities: { 'pa-belem': { lat: -1.4550, lng: -48.5024, label: 'Belém' } }},
  'ES': { label: 'ES', cities: { 'es-vitoria': { lat: -20.3155, lng: -40.3128, label: 'Vitória' } }},
  'MT': { label: 'MT', cities: { 'mt-cuiaba': { lat: -15.6010, lng: -56.0974, label: 'Cuiabá' } }},
  'MS': { label: 'MS', cities: { 'ms-cg': { lat: -20.4697, lng: -54.6201, label: 'Campo Grande' } }},
  'RN': { label: 'RN', cities: { 'rn-natal': { lat: -5.7793, lng: -35.2009, label: 'Natal' } }},
  'PB': { label: 'PB', cities: { 'pb-joaopessoa': { lat: -7.1195, lng: -34.8450, label: 'João Pessoa' } }},
  'AL': { label: 'AL', cities: { 'al-maceio': { lat: -9.6658, lng: -35.7353, label: 'Maceió' } }},
  'SE': { label: 'SE', cities: { 'se-aracaju': { lat: -10.9472, lng: -37.0731, label: 'Aracaju' } }},
  'MA': { label: 'MA', cities: { 'ma-saoluis': { lat: -2.5307, lng: -44.3068, label: 'São Luís' } }},
  'PI': { label: 'PI', cities: { 'pi-teresina': { lat: -5.0892, lng: -42.8016, label: 'Teresina' } }},
}

const CATS = [
  { id: 'dentist', label: '🦷 Dentistas' },
  { id: 'medical_aesthetic_clinic', label: '💉 Clínicas Estéticas' },
  { id: 'medical_clinic', label: '🏥 Clínicas Médicas' },
  { id: 'restaurant', label: '🍽️ Restaurantes' },
  { id: 'gym', label: '🏋️ Academias' },
  { id: 'lawyer', label: '⚖️ Advogados' },
  { id: 'barber_shop', label: '💈 Barbearias' },
  { id: 'pharmacy', label: '💊 Farmácias' },
  { id: 'veterinarian', label: '🐾 Veterinários' },
  { id: 'real_estate_agency', label: '🏠 Imobiliárias' },
  { id: 'accountant', label: '📊 Contadores' },
  { id: 'car_repair', label: '🔧 Oficinas' },
]

interface Listing {
  title: string | null; category: string | null; address: string | null
  rating_value: number | null; rating_votes: number | null; place_id: string | null
  cid: string | null; latitude: number | null; longitude: number | null; is_claimed: boolean | null
}

type SortField = 'score' | 'title' | 'category' | 'rating_value' | 'rating_votes'

const DiscoveryPage = () => {
  useParams() // locale handling

  // ── Geo ──
  const [stateKey, setStateKey] = useState('SP')
  const [cityKey, setCityKey] = useState('sp-capital')
  const [radius, setRadius] = useState(10)
  const [selected, setSelected] = useState<string[]>([])

  // ── Score Filters (v0.2) ──
  const [minScore, setMinScore] = useState(0)
  const [schwartzFilter, setSchwartzFilter] = useState<number[]>([])
  const [sortBy, setSortBy] = useState<SortField>('score')

  // ── Results ──
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<Listing[]>([])
  const [scores, setScores] = useState<ScoreData[]>([])
  const [distribution, setDistribution] = useState<ScoreDistribution | null>(null)
  const [totalCount, setTotalCount] = useState(0)
  const [costUsd, setCostUsd] = useState(0)
  const [error, setError] = useState('')
  const [fromCache, setFromCache] = useState(false)
  const [costToday, setCostToday] = useState(0)
  const [costTotal, setCostTotal] = useState(0)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [selectedLead, setSelectedLead] = useState<Listing | null>(null)
  const [selectedScore, setSelectedScore] = useState<ScoreData | null>(null)
  const [competitorData, setCompetitorData] = useState<CompetitiveData | null>(null)
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(20)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  const estimatedCost = selected.length * 0.015

  // ═══ Search ═══
  const doSearch = useCallback(async (force = false) => {
    if (!selected.length) return
    setLoading(true); setError('')

    try {
      const city = STATES[stateKey]?.cities[cityKey]

      if (!city) return

      const res = await fetch('/api/discovery-search', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categories: selected, lat: city.lat, lng: city.lng, radiusKm: radius,
          limit: 50, force,
        }),
      })

      const data = await res.json()

      if (!res.ok) throw new Error(data.error)
      setResults(data.listings || [])
      setScores(data.scores || [])
      setDistribution(data.distribution || null)
      setTotalCount(data.total_count || 0)
      setCostUsd(data.cost_usd || 0)
      setFromCache(data.fromCache || false)
      setCostToday(data.costToday || 0)
      setCostTotal(data.costTotal || 0)
      setPage(0)
      setSortBy('score')
      setSortDir('desc')
    } catch (e: any) { setError(e.message) }
    finally { setLoading(false) }
  }, [selected, stateKey, cityKey, radius])

  const toggle = (catId: string) => {
    setSelected(prev => prev.includes(catId) ? prev.filter(c => c !== catId) : [...prev, catId])
  }

  const changeState = (s: string) => {
    setStateKey(s)
    const firstCity = Object.keys(STATES[s].cities)[0]

    setCityKey(firstCity)
  }

  const changeCity = (c: string) => { setCityKey(c) }
  const changeRadius = (r: number) => { setRadius(r) }

  // ═══ Score-based sorting + filtering ═══
  const enriched = useMemo(() => {
    return results.map((l, i) => ({ ...l, score: scores[i] }))
  }, [results, scores])

  const filtered = useMemo(() => {
    let arr = [...enriched]

    if (minScore > 0) arr = arr.filter(l => (l.score?.compound ?? 0) >= minScore)
    if (schwartzFilter.length > 0) arr = arr.filter(l => schwartzFilter.includes(l.score?.schwartz.level ?? 1))
    
return arr
  }, [enriched, minScore, schwartzFilter])

  const sorted = useMemo(() => {
    const arr = [...filtered]

    if (sortBy === 'score') {
      arr.sort((a, b) => {
        const diff = (b.score?.compound ?? 0) - (a.score?.compound ?? 0)

        
return sortDir === 'asc' ? -diff : diff
      })
    } else {
      arr.sort((a, b) => {
        const va = a[sortBy]; const vb = b[sortBy]

        if (va == null && vb == null) return 0
        if (va == null) return 1; if (vb == null) return -1
        
return sortDir === 'asc'
          ? String(va).localeCompare(String(vb), undefined, { numeric: true })
          : String(vb).localeCompare(String(va), undefined, { numeric: true })
      })
    }

    
return arr
  }, [filtered, sortBy, sortDir])

  const paged = sorted.slice(page * rowsPerPage, (page + 1) * rowsPerPage)

  const handleSort = (field: SortField) => {
    if (sortBy === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortBy(field); setSortDir(field === 'score' ? 'desc' : 'asc') }
  }

  // ═══ Lead Detail (open modal + fetch benchmark) ═══
  const openLeadDetail = useCallback((listing: Listing, score?: ScoreData) => {
    setSelectedLead(listing)
    setSelectedScore(score || null)
    setCompetitorData(null)

    if (listing.latitude && listing.longitude) {
      fetch('/api/competitive-benchmark', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lat: listing.latitude, lng: listing.longitude, radiusKm: radius,
          categories: selected, lead_place_id: listing.place_id,
        }),
      })
        .then(r => r.json())
        .then(data => setCompetitorData(data.error ? null : data))
        .catch(() => setCompetitorData(null))
    }
  }, [radius, selected])

  const scoreColor = (level: number) => {
    const colors: Record<number, string> = { 1: '#9e9e9e', 2: '#42a5f5', 3: '#ffa726', 4: '#ef5350', 5: '#d32f2f' }

    
return colors[level] || '#9e9e9e'
  }

  return (
    <Grid container spacing={6}>
      {/* Header */}
      <Grid size={{ xs: 12 }}>
        <Typography variant='h4'>🔍 Discovery Engine</Typography>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap', mt: 1 }}>
          <Typography variant='body2' color='text.secondary'>
            Dados REAIS via EVO-API MCP · Pain Criteria v1.2 · Score Composto (Fit×0.40 + Eng×0.35 + Int×0.25)
          </Typography>
          {costTotal > 0 && (
            <Chip label={`💰 Hoje: $${costToday.toFixed(4)} · Total: $${costTotal.toFixed(4)}`}
              size='small' color='warning' variant='tonal' />
          )}
          {fromCache && <Chip label='📦 Cache' size='small' color='info' variant='tonal' />}
        </Box>
      </Grid>

      {/* ═══ GEO ═══ */}
      <Grid size={{ xs: 12 }}>
        <Card><CardContent>
          <Typography variant='subtitle2' fontWeight={600} gutterBottom>🌎 Localização</Typography>
          <Typography variant='caption' color='text.secondary' gutterBottom component='div' sx={{ mb: 0.5 }}>Estado:</Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1.5 }}>
            {Object.keys(STATES).map(k => (
              <Chip key={k} label={STATES[k].label} clickable size='small'
                color={stateKey === k ? 'primary' : 'default'}
                variant={stateKey === k ? 'filled' : 'outlined'} onClick={() => changeState(k)} />
            ))}
          </Box>
          <Typography variant='caption' color='text.secondary' gutterBottom component='div' sx={{ mb: 0.5 }}>Cidade:</Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1.5 }}>
            {Object.entries(STATES[stateKey]?.cities || {}).map(([k, v]) => (
              <Chip key={k} label={v.label} clickable size='small'
                color={cityKey === k ? 'primary' : 'default'}
                variant={cityKey === k ? 'filled' : 'outlined'} onClick={() => changeCity(k)} />
            ))}
          </Box>
          <Typography variant='caption' color='text.secondary' gutterBottom component='div' sx={{ mb: 0.5 }}>Raio (km):</Typography>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            {[1, 3, 5, 10, 15, 25].map(r => (
              <Chip key={r} label={`${r}km`} clickable size='small'
                color={radius === r ? 'primary' : 'default'}
                variant={radius === r ? 'filled' : 'outlined'} onClick={() => changeRadius(r)} />
            ))}
          </Box>
        </CardContent></Card>
      </Grid>

      {/* ═══ CATEGORIES + SEARCH ═══ */}
      <Grid size={{ xs: 12 }}>
        <Card><CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
            <Typography variant='subtitle2' fontWeight={600}>
              📁 Categorias ({selected.length} selecionadas)
              {selected.length > 0 && (
                <Chip label={`~$${estimatedCost.toFixed(4)}`} size='small' color='warning' variant='tonal' sx={{ ml: 1 }} />
              )}
            </Typography>
            <Button variant='contained' color='primary' disabled={selected.length === 0 || loading}
              onClick={() => setConfirmOpen(true)}
              startIcon={loading ? undefined : <i className='ri-search-line' />} size='large'>
              {loading ? 'Buscando...' : `Buscar Agora ($${estimatedCost.toFixed(4)})`}
            </Button>
          </Box>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {CATS.map(cat => {
              const active = selected.includes(cat.id)

              
return (
                <Chip key={cat.id} label={cat.label} clickable color={active ? 'primary' : 'default'}
                  variant={active ? 'filled' : 'outlined'} onClick={() => toggle(cat.id)}
                  sx={active ? {} : { opacity: 0.7 }} />
              )
            })}
          </Box>
        </CardContent></Card>
      </Grid>

      {/* ═══ SCORE FILTER BAR (v0.2) ═══ */}
      <Grid size={{ xs: 12 }}>
        <Card><CardContent>
          <Typography variant='subtitle2' fontWeight={600} gutterBottom>
            🎯 Score Composto (Pain Criteria v1.2)
          </Typography>
          <Grid container spacing={3} alignItems='center'>
            {/* Minimum Score Slider */}
            <Grid size={{ xs: 12, md: 4 }}>
              <Typography variant='caption' fontWeight={600} gutterBottom component='div'>
                Score mínimo: {minScore || 'Todos'}
              </Typography>
              <Slider value={minScore} onChange={(_, v) => setMinScore(v as number)}
                min={0} max={100} step={5} valueLabelDisplay='auto'
                marks={[
                  { value: 0, label: '0' }, { value: 30, label: '30' },
                  { value: 50, label: '50' }, { value: 70, label: '70' }, { value: 85, label: '85' },
                ]}
              />
            </Grid>
            {/* Schwartz Level Filter Chips */}
            <Grid size={{ xs: 12, md: 5 }}>
              <Typography variant='caption' fontWeight={600} gutterBottom component='div'>
                Nível de Consciência:
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {SCHWARTZ_CHIPS.map(s => {
                  const active = schwartzFilter.includes(s.level)

                  
return (
                    <Chip key={s.level} label={s.label} clickable size='small'
                      color={active ? 'primary' : 'default'}
                      variant={active ? 'filled' : 'outlined'}
                      onClick={() => setSchwartzFilter(prev =>
                        prev.includes(s.level) ? prev.filter(x => x !== s.level) : [...prev, s.level]
                      )}
                      sx={active ? {} : { opacity: 0.7 }}
                    />
                  )
                })}
              </Box>
            </Grid>
            {/* Sort Toggle */}
            <Grid size={{ xs: 12, md: 3 }}>
              <Typography variant='caption' fontWeight={600} gutterBottom component='div'>
                Ordenar por:
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Chip label='⭐ Score' clickable size='small'
                  color={sortBy === 'score' ? 'primary' : 'default'}
                  variant={sortBy === 'score' ? 'filled' : 'outlined'}
                  onClick={() => { setSortBy('score'); setSortDir('desc') }} />
                <Chip label='🔤 Nome' clickable size='small'
                  color={sortBy === 'title' ? 'primary' : 'default'}
                  variant={sortBy === 'title' ? 'filled' : 'outlined'}
                  onClick={() => { setSortBy('title'); setSortDir('asc') }} />
                <Chip label='⭐ Rating' clickable size='small'
                  color={sortBy === 'rating_value' ? 'primary' : 'default'}
                  variant={sortBy === 'rating_value' ? 'filled' : 'outlined'}
                  onClick={() => { setSortBy('rating_value'); setSortDir('desc') }} />
              </Box>
            </Grid>
          </Grid>
          {/* Filter status */}
          {(minScore > 0 || schwartzFilter.length > 0) && (
            <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
              <Typography variant='caption' color='text.secondary'>
                {filtered.length} de {results.length} leads passam
              </Typography>
              {minScore > 0 && <Chip label={`Score ≥ ${minScore}`} size='small' onDelete={() => setMinScore(0)} color='primary' variant='tonal' />}
              {schwartzFilter.map(lvl => {
                const s = SCHWARTZ_CHIPS.find(x => x.level === lvl)

                
return <Chip key={lvl} label={s?.label} size='small' onDelete={() => setSchwartzFilter(prev => prev.filter(x => x !== lvl))} color='primary' variant='tonal' />
              })}
            </Box>
          )}
        </CardContent></Card>
      </Grid>

      {/* ═══ CONFIRMATION DIALOG ═══ */}
      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)} maxWidth='xs' fullWidth>
        <DialogTitle>⚠️ Confirmar gasto?</DialogTitle>
        <DialogContent>
          <Typography variant='body1' gutterBottom>
            Você está prestes a fazer uma chamada <strong>LIVE</strong> ao DataForSEO.
          </Typography>
          <Box sx={{ bgcolor: 'grey.50', p: 2, borderRadius: 1, my: 2 }}>
            <Typography variant='body2'>📍 <strong>{STATES[stateKey]?.cities[cityKey]?.label || stateKey}</strong> · {radius}km raio</Typography>
            <Typography variant='body2'>📁 <strong>{selected.length}</strong> categorias: {selected.join(', ')}</Typography>
            <Typography variant='body2' color='warning.main' fontWeight={600} sx={{ mt: 1 }}>
              💰 Custo estimado: <strong>${estimatedCost.toFixed(4)}</strong> (R${(estimatedCost * 5.5).toFixed(2)})
            </Typography>
          </Box>
          <Typography variant='caption' color='text.secondary'>
            Resultados em cache por 30min e persistidos no Redis por 24h. A mesma busca não gasta de novo.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)}>Cancelar</Button>
          <Button variant='contained' color='primary' onClick={() => { setConfirmOpen(false); doSearch(true); }}>
            Sim, buscar (${estimatedCost.toFixed(4)})
          </Button>
        </DialogActions>
      </Dialog>

      {/* ═══ DISTRIBUTION BAR ═══ */}
      {distribution && (
        <Grid size={{ xs: 12 }}>
          <Card><CardContent>
            <Typography variant='subtitle2' fontWeight={600} gutterBottom>
              📊 Distribuição Schwartz · Score Médio: {distribution.avgScore}/100
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              {SCHWARTZ_CHIPS.map(s => {
                const count = [distribution.unaware, distribution.problemAware, distribution.solutionAware, distribution.productAware, distribution.mostAware][s.level - 1]
                const pct = distribution.total > 0 ? Math.round((count / distribution.total) * 100) : 0

                
return (
                  <Box key={s.level} sx={{ flex: 1, minWidth: 100, textAlign: 'center' }}>
                    <Typography variant='h6' fontWeight={800} sx={{ color: s.color }}>{count}</Typography>
                    <Typography variant='caption' color='text.secondary'>{s.label}</Typography>
                    <LinearProgress variant='determinate' value={pct} sx={{ height: 6, borderRadius: 3, mt: 0.5, bgcolor: `${s.color}22`, '& .MuiLinearProgress-bar': { bgcolor: s.color } }} />
                    <Typography variant='caption'>{pct}%</Typography>
                  </Box>
                )
              })}
            </Box>
          </CardContent></Card>
        </Grid>
      )}

      {/* ═══ METRICS ═══ */}
      {results.length > 0 && (
        <>
          <Grid size={{ xs: 6, sm: 2.4 }}>
            <Card><CardContent sx={{ textAlign: 'center' }}>
              <Typography variant='h5' fontWeight={800}>{totalCount.toLocaleString('pt-BR')}</Typography>
              <Typography variant='caption' color='text.secondary'>Total na Região</Typography>
            </CardContent></Card>
          </Grid>
          <Grid size={{ xs: 6, sm: 2.4 }}>
            <Card><CardContent sx={{ textAlign: 'center' }}>
              <Typography variant='h5' fontWeight={800} color='primary.main'>
                {distribution ? `${distribution.productAware + distribution.mostAware}` : '—'}
              </Typography>
              <Typography variant='caption' color='text.secondary'>Product + Most Aware</Typography>
            </CardContent></Card>
          </Grid>
          <Grid size={{ xs: 6, sm: 2.4 }}>
            <Card><CardContent sx={{ textAlign: 'center' }}>
              <Typography variant='h5' fontWeight={800} color='warning.main'>${costUsd.toFixed(4)}</Typography>
              <Typography variant='caption' color='text.secondary'>Custo da Chamada</Typography>
            </CardContent></Card>
          </Grid>
          <Grid size={{ xs: 6, sm: 2.4 }}>
            <Card><CardContent sx={{ textAlign: 'center' }}>
              <Typography variant='h5' fontWeight={800}>{fromCache ? '📦' : '🆕'}</Typography>
              <Typography variant='caption' color='text.secondary'>{fromCache ? 'Do Cache' : 'Ao Vivo'}</Typography>
            </CardContent></Card>
          </Grid>
          <Grid size={{ xs: 6, sm: 2.4 }}>
            <Card><CardContent sx={{ textAlign: 'center' }}>
              <Typography variant='h5' fontWeight={800} color='secondary.main'>
                {distribution?.avgScore ?? '—'}
              </Typography>
              <Typography variant='caption' color='text.secondary'>Score Médio</Typography>
            </CardContent></Card>
          </Grid>
        </>
      )}

      {/* ═══ LOADING ═══ */}
      {loading && (
        <Grid size={{ xs: 12 }}>
          <Card sx={{ textAlign: 'center', py: 4 }}><CardContent>
            <LinearProgress sx={{ mb: 2, borderRadius: 2 }} />
            <Typography>🔍 Buscando dados reais do Google Meu Negócio...</Typography>
            <Typography variant='caption' color='text.secondary'>Computando Score Composto · Custo: ${estimatedCost.toFixed(4)}</Typography>
          </CardContent></Card>
        </Grid>
      )}

      {/* ═══ ERROR ═══ */}
      {error && (
        <Grid size={{ xs: 12 }}><Alert severity='error' onClose={() => setError('')}>{error}</Alert></Grid>
      )}

      {/* ═══ RESULTS TABLE ═══ */}
      {results.length > 0 && (
        <Grid size={{ xs: 12 }}>
          <TableContainer component={Paper}>
            <Table size='small'>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ width: 70 }}>
                    <TableSortLabel active={sortBy === 'score'} direction={sortDir} onClick={() => handleSort('score')}>
                      Score
                    </TableSortLabel>
                  </TableCell>
                  <TableCell><TableSortLabel active={sortBy === 'title'} direction={sortDir} onClick={() => handleSort('title')}>Nome</TableSortLabel></TableCell>
                  <TableCell><TableSortLabel active={sortBy === 'category'} direction={sortDir} onClick={() => handleSort('category')}>Categoria</TableSortLabel></TableCell>
                  <TableCell align='right'><TableSortLabel active={sortBy === 'rating_value'} direction={sortDir} onClick={() => handleSort('rating_value')}>⭐</TableSortLabel></TableCell>
                  <TableCell align='right'><TableSortLabel active={sortBy === 'rating_votes'} direction={sortDir} onClick={() => handleSort('rating_votes')}>Reviews</TableSortLabel></TableCell>
                  <TableCell>Reivindicado?</TableCell>
                  <TableCell align='right'></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {paged.map((l, i) => {
                  const sc = l.score

                  
return (
                    <TableRow key={i} hover sx={{ cursor: 'pointer' }} onClick={() => openLeadDetail(l, sc)}>
                      <TableCell>
                        <Tooltip title={sc ? `${sc.schwartz.label} — ${sc.schwartz.action}` : ''}>
                          <Chip
                            label={sc?.compound ?? '—'}
                            size='small'
                            sx={{
                              bgcolor: sc ? scoreColor(sc.schwartz.level) : '#e0e0e0',
                              color: sc ? '#fff' : 'text.secondary',
                              fontWeight: 800, minWidth: 42,
                            }}
                          />
                        </Tooltip>
                      </TableCell>
                      <TableCell>
                        <Typography fontWeight={600} fontSize='0.85rem' noWrap sx={{ maxWidth: 200 }}>{l.title || '—'}</Typography>
                        <Typography variant='caption' color='text.secondary' noWrap sx={{ maxWidth: 200 }}>{l.address?.slice(0, 40)}</Typography>
                      </TableCell>
                      <TableCell><Chip label={l.category || '?'} size='small' variant='outlined' /></TableCell>
                      <TableCell align='right'>
                        <Chip label={l.rating_value ? `${l.rating_value}★` : '—'} size='small'
                          color={(l.rating_value ?? 0) >= 4 ? 'success' : (l.rating_value ?? 0) > 0 ? 'warning' : 'default'} variant='tonal' />
                      </TableCell>
                      <TableCell align='right'>{l.rating_votes || 0}</TableCell>
                      <TableCell><Chip label={l.is_claimed ? 'Sim' : '⚠️ Não'} size='small'
                        color={l.is_claimed ? 'success' : 'error'} variant='tonal' /></TableCell>
                      <TableCell align='right'>
                        <Tooltip title="Ver score detalhado"><IconButton size='small' onClick={e => { e.stopPropagation(); openLeadDetail(l, sc); }}><i className='ri-arrow-right-line' /></IconButton></Tooltip>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
            <TablePagination component='div' count={sorted.length} page={page}
              onPageChange={(_, p) => setPage(p)} rowsPerPage={rowsPerPage}
              onRowsPerPageChange={e => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0) }}
              rowsPerPageOptions={[10, 20, 30, 50, 100]}
              labelRowsPerPage='Por página:' labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`} />
          </TableContainer>
        </Grid>
      )}

      {/* ═══ LEAD DETAIL MODAL (v0.2 — Score + Benchmark) ═══ */}
      <Dialog open={!!selectedLead} onClose={() => { setSelectedLead(null); setSelectedScore(null); setCompetitorData(null); }} maxWidth='md' fullWidth>
        {selectedLead && (
          <>
            <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box>
                <Typography variant='h6'>{selectedLead.title || 'Sem nome'}</Typography>
                {selectedScore && (
                  <Chip
                    label={`${selectedScore.schwartz.label} · Score ${selectedScore.compound}/100`}
                    size='small'
                    sx={{ bgcolor: scoreColor(selectedScore.schwartz.level), color: '#fff', fontWeight: 700, mt: 0.5 }}
                  />
                )}
              </Box>
              <IconButton onClick={() => { setSelectedLead(null); setSelectedScore(null); setCompetitorData(null); }} size='small'><i className='ri-close-line' /></IconButton>
            </DialogTitle>
            <DialogContent dividers>
              {/* ── GMB Fields ── */}
              <Grid container spacing={2}>
                {[
                  ['🏢 Nome', selectedLead.title],
                  ['📂 Categoria', selectedLead.category],
                  ['📍 Endereço', selectedLead.address],
                  ['⭐ Rating', selectedLead.rating_value ? `${selectedLead.rating_value}★` : '—'],
                  ['📝 Reviews', String(selectedLead.rating_votes || 0)],
                  ['🔑 Place ID', selectedLead.place_id],
                  ['✅ Reivindicado', selectedLead.is_claimed ? 'Sim' : '⚠️ Não'],
                  ['📐 Coordenadas', selectedLead.latitude ? `${selectedLead.latitude.toFixed(4)}, ${selectedLead.longitude?.toFixed(4)}` : '—'],
                ].map(([label, value], i) => (
                  <Grid key={i} size={{ xs: 12, sm: 6 }}>
                    <Typography variant='caption' color='text.secondary'>{label}</Typography>
                    <Typography variant='body2' fontWeight={600} sx={{ wordBreak: 'break-all' }}>{value || '—'}</Typography>
                  </Grid>
                ))}
              </Grid>

              {/* ── Score Breakdown ── */}
              {selectedScore && (
                <Box sx={{ mt: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                  <Typography variant='subtitle2' fontWeight={700} gutterBottom>
                    📐 Score Composto: {selectedScore.compound}/100
                    <Chip label={`Confiança: ${Math.round(selectedScore.confidence * 100)}%`} size='small' variant='tonal' sx={{ ml: 1 }} />
                  </Typography>
                  <Typography variant='caption' color='text.secondary' sx={{ mb: 2, display: 'block' }}>
                    {selectedScore.schwartz.messagingRule}
                  </Typography>
                  {(['fit', 'engagement', 'intent'] as const).map(dim => {
                    const d = selectedScore[dim]
                    const dimLabel = dim === 'fit' ? '🎯 Fit' : dim === 'engagement' ? '📊 Engagement' : '🔥 Intent'
                    const weight = dim === 'fit' ? '0.40' : dim === 'engagement' ? '0.35' : '0.25'
                    const dimColor = dim === 'fit' ? 'primary' : dim === 'engagement' ? 'warning' : 'error'

                    
return (
                      <Box key={dim} sx={{ mb: 1.5 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                          <Typography variant='caption' fontWeight={600}>
                            {dimLabel} (×{weight})
                          </Typography>
                          <Typography variant='caption'>
                            {d.normalized}/100 ({d.raw}/{d.maxRaw}pts raw · {d.signalsDetected.length} sinais)
                          </Typography>
                        </Box>
                        <LinearProgress variant='determinate' value={d.normalized}
                          color={dimColor} sx={{ height: 8, borderRadius: 4 }} />
                        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 0.5 }}>
                          {d.signalsDetected.slice(0, 6).map(sig => (
                            <Chip key={sig} label={sig} size='small' color={dimColor} variant='tonal' sx={{ fontSize: '0.65rem' }} />
                          ))}
                          {d.signalsMissing.slice(0, 4).map(sig => (
                            <Chip key={sig} label={sig} size='small' variant='outlined' sx={{ fontSize: '0.65rem', opacity: 0.5 }} />
                          ))}
                        </Box>
                      </Box>
                    )
                  })}
                  {selectedScore.antiFpFlags.length > 0 && (
                    <Box sx={{ mt: 1 }}>
                      {selectedScore.antiFpFlags.map(f => (
                        <Chip key={f} label={`🛡️ ${f}`} size='small' color='default' variant='outlined' sx={{ mr: 0.5, mb: 0.5 }} />
                      ))}
                    </Box>
                  )}
                </Box>
              )}

              {/* ── Competitive Benchmarking ── */}
              {competitorData && (
                <Box sx={{ mt: 3, p: 2, bgcolor: 'warning.50', borderRadius: 1, border: '1px solid', borderColor: 'warning.200' }}>
                  <Typography variant='subtitle2' fontWeight={700} gutterBottom>
                    🏆 Benchmark Competitivo · Raio {radius}km
                  </Typography>
                  <Chip
                    label={`${competitorData.lead_rank}º de ${competitorData.top_competitors.length + 1} no raio`}
                    color={competitorData.lead_rank <= 2 ? 'success' : competitorData.lead_rank <= 4 ? 'warning' : 'error'}
                    size='small' sx={{ mb: 2 }}
                  />
                  <TableContainer component={Paper} variant='outlined' sx={{ mb: 2 }}>
                    <Table size='small'>
                      <TableHead>
                        <TableRow>
                          <TableCell>Métrica</TableCell>
                          <TableCell align='right'>Seu Lead</TableCell>
                          <TableCell align='right'>Média Mercado</TableCell>
                          <TableCell align='right'>Top 1</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {[
                          ['⭐ Rating', selectedLead.rating_value?.toFixed(1), competitorData.market_avg.rating?.toFixed(1), competitorData.top_competitors[0]?.rating_value?.toFixed(1)],
                          ['📝 Reviews', String(selectedLead.rating_votes || 0), String(Math.round(competitorData.market_avg.reviews || 0)), String(competitorData.top_competitors[0]?.rating_votes || 0)],
                          ['✅ Reivindicado', selectedLead.is_claimed ? 'Sim' : 'Não', `${Math.round(competitorData.market_avg.claimed_pct || 0)}%`, competitorData.top_competitors[0]?.is_claimed ? 'Sim' : 'Não'],
                        ].map(([label, lead, avg, top1]) => (
                          <TableRow key={label as string}>
                            <TableCell><Typography variant='caption'>{label}</Typography></TableCell>
                            <TableCell align='right'><Chip label={String(lead)} size='small' color={typeof lead === 'string' && lead === 'Não' ? 'error' : 'default'} variant='tonal' /></TableCell>
                            <TableCell align='right'><Typography variant='caption'>{String(avg)}</Typography></TableCell>
                            <TableCell align='right'><Chip label={String(top1)} size='small' variant='outlined' /></TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                  {competitorData.gaps.slice(0, 3).map((gap, i) => (
                    <Alert key={i} severity='warning' sx={{ mb: 1 }}>
                      <Typography variant='caption'>{gap}</Typography>
                    </Alert>
                  ))}
                </Box>
              )}

              {/* ── Actions ── */}
              <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                <Button variant='outlined' size='small' onClick={() => {
                  if (selectedLead.place_id) window.open(`https://www.google.com/maps/place/?q=place_id:${selectedLead.place_id}`, '_blank')
                }} startIcon={<i className='ri-map-pin-line' />}>Google Maps</Button>
                <Button variant='outlined' size='small' color='warning' startIcon={<i className='ri-file-chart-line' />}
                  onClick={() => { setSelectedLead(null); setSelectedScore(null); }}>Diagnóstico</Button>
              </Box>
            </DialogContent>
          </>
        )}
      </Dialog>
    </Grid>
  )
}

export default DiscoveryPage
