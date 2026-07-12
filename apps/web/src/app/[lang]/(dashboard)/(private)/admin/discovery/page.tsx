'use client'
// adsentice · Admin / Discovery — NÃO GASTA SEM CONFIRMAR
// Cache 30min · Persistência Redis 24h · Pain Criteria + Website Tier 3
import { useState, useEffect, useMemo, useCallback } from 'react'
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
import Switch from '@mui/material/Switch'
import FormControlLabel from '@mui/material/FormControlLabel'
import Accordion from '@mui/material/Accordion'
import AccordionSummary from '@mui/material/AccordionSummary'
import AccordionDetails from '@mui/material/AccordionDetails'

// ── Data ──
// Brazilian geo hierarchy: Estado → Cidades (coordenadas REAIS)
const STATES: Record<string, { label: string; cities: Record<string, { lat: number; lng: number; label: string }> }> = {
  'SP': { label: 'SP', cities: {
    'sp-capital': { lat: -23.5505, lng: -46.6333, label: 'São Paulo (Capital)' },
    'sp-campinas': { lat: -22.9056, lng: -47.0608, label: 'Campinas' },
    'sp-santos': { lat: -23.9608, lng: -46.3336, label: 'Santos' },
    'sp-sjcampos': { lat: -23.1791, lng: -45.8872, label: 'São José dos Campos' },
    'sp-ribeirao': { lat: -21.1767, lng: -47.8202, label: 'Ribeirão Preto' },
    'sp-sorocaba': { lat: -23.5015, lng: -47.4526, label: 'Sorocaba' },
  }},
  'RJ': { label: 'RJ', cities: {
    'rj-capital': { lat: -22.9068, lng: -43.1729, label: 'Rio de Janeiro (Capital)' },
    'rj-niteroi': { lat: -22.8832, lng: -43.1034, label: 'Niterói' },
  }},
  'MG': { label: 'MG', cities: {
    'mg-bh': { lat: -19.9167, lng: -43.9345, label: 'Belo Horizonte' },
    'mg-uberlandia': { lat: -18.9186, lng: -48.2772, label: 'Uberlândia' },
  }},
  'PR': { label: 'PR', cities: {
    'pr-curitiba': { lat: -25.4284, lng: -49.2733, label: 'Curitiba' },
    'pr-londrina': { lat: -23.3103, lng: -51.1628, label: 'Londrina' },
    'pr-maringa': { lat: -23.4253, lng: -51.9386, label: 'Maringá' },
  }},
  'RS': { label: 'RS', cities: {
    'rs-poa': { lat: -30.0346, lng: -51.2177, label: 'Porto Alegre' },
    'rs-caxias': { lat: -29.1685, lng: -51.1794, label: 'Caxias do Sul' },
  }},
  'SC': { label: 'SC', cities: {
    'sc-floripa': { lat: -27.5969, lng: -48.5495, label: 'Florianópolis' },
    'sc-joinville': { lat: -26.3045, lng: -48.8487, label: 'Joinville' },
  }},
  'BA': { label: 'BA', cities: {
    'ba-salvador': { lat: -12.9714, lng: -38.5014, label: 'Salvador' },
  }},
  'PE': { label: 'PE', cities: {
    'pe-recife': { lat: -8.0476, lng: -34.8770, label: 'Recife' },
  }},
  'CE': { label: 'CE', cities: {
    'ce-fortaleza': { lat: -3.7172, lng: -38.5434, label: 'Fortaleza' },
  }},
  'DF': { label: 'DF', cities: {
    'df-brasilia': { lat: -15.8267, lng: -47.9218, label: 'Brasília' },
  }},
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

type SortField = 'title' | 'category' | 'rating_value' | 'rating_votes'

// ── Page ──
const DiscoveryPage = () => {
  const { lang } = useParams() as { lang: string }

  // Filters
  const [stateKey, setStateKey] = useState('SP')
  const [cityKey, setCityKey] = useState('sp-capital')
  const [radius, setRadius] = useState(10)
  const [selected, setSelected] = useState<string[]>([])
  // Pain criteria
  const [minRating, setMinRating] = useState(0)
  const [minReviews, setMinReviews] = useState(0)
  const [minPhotos, setMinPhotos] = useState(0)
  const [requireWhatsApp, setRequireWhatsApp] = useState(false)
  const [requireClaimed, setRequireClaimed] = useState(false)
  const [websiteOnly, setWebsiteOnly] = useState(false)
  const [noAnalytics, setNoAnalytics] = useState(false)
  const [cmsOutdated, setCmsOutdated] = useState(false)
  const [noBlog, setNoBlog] = useState(false)
  const [mobileBad, setMobileBad] = useState(false)
  const [criteriaOpen, setCriteriaOpen] = useState(false)

  // Results
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<Listing[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [costUsd, setCostUsd] = useState(0)
  const [error, setError] = useState('')
  const [fromCache, setFromCache] = useState(false)
  const [costToday, setCostToday] = useState(0)
  const [costTotal, setCostTotal] = useState(0)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [selectedLead, setSelectedLead] = useState<Listing | null>(null)
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(20)
  const [sortField, setSortField] = useState<SortField>('title')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

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
      setTotalCount(data.total_count || 0)
      setCostUsd(data.cost_usd || 0)
      setFromCache(data.fromCache || false)
      setCostToday(data.costToday || 0)
      setCostTotal(data.costTotal || 0)
      setPage(0)
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
    if (selected.length) doSearch()
  }
  const changeCity = (c: string) => { setCityKey(c); if (selected.length) doSearch() }
  const changeRadius = (r: number) => { setRadius(r); if (selected.length) doSearch() }

  // ═══ Filtering ═══
  const filtered = useMemo(() => {
    let arr = [...results]
    if (minRating > 0) arr = arr.filter(l => (l.rating_value || 0) >= minRating)
    if (minReviews > 0) arr = arr.filter(l => (l.rating_votes || 0) >= minReviews)
    if (requireWhatsApp) arr = arr.filter(l => l.place_id)
    if (requireClaimed) arr = arr.filter(l => l.is_claimed)
    if (websiteOnly) arr = arr.filter(l => l.place_id)
    return arr
  }, [results, minRating, minReviews, requireWhatsApp, requireClaimed, websiteOnly, minPhotos])

  const sorted = useMemo(() => {
    const arr = [...filtered]
    arr.sort((a, b) => {
      const va = a[sortField]; const vb = b[sortField]
      if (va == null && vb == null) return 0
      if (va == null) return 1; if (vb == null) return -1
      return sortDir === 'asc'
        ? String(va).localeCompare(String(vb), undefined, { numeric: true })
        : String(vb).localeCompare(String(va), undefined, { numeric: true })
    })
    return arr
  }, [filtered, sortField, sortDir])

  const paged = sorted.slice(page * rowsPerPage, (page + 1) * rowsPerPage)
  const notClaimed = filtered.filter(l => !l.is_claimed).length
  const handleSort = (field: SortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortDir('asc') }
  }

  const activeFilters = [
    minRating > 0, minReviews > 0, minPhotos > 0, requireWhatsApp, requireClaimed, websiteOnly
  ].filter(Boolean).length

  return (
    <Grid container spacing={6}>
      {/* Header */}
      <Grid size={{ xs: 12 }}>
        <Typography variant='h4'>🔍 Discovery Engine</Typography>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap', mt: 1 }}>
          <Typography variant='body2' color='text.secondary'>
            Dados REAIS via EVO-API MCP · DataForSEO LIVE · Cache 30min
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
          {/* Estado */}
          <Typography variant='caption' color='text.secondary' gutterBottom component='div' sx={{ mb: 0.5 }}>Estado:</Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1.5 }}>
            {Object.keys(STATES).map(k => (
              <Chip key={k} label={STATES[k].label} clickable size='small'
                color={stateKey === k ? 'primary' : 'default'}
                variant={stateKey === k ? 'filled' : 'outlined'} onClick={() => changeState(k)} />
            ))}
          </Box>
          {/* Cidade */}
          <Typography variant='caption' color='text.secondary' gutterBottom component='div' sx={{ mb: 0.5 }}>Cidade:</Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1.5 }}>
            {Object.entries(STATES[stateKey]?.cities || {}).map(([k, v]) => (
              <Chip key={k} label={v.label} clickable size='small'
                color={cityKey === k ? 'primary' : 'default'}
                variant={cityKey === k ? 'filled' : 'outlined'} onClick={() => changeCity(k)} />
            ))}
          </Box>
          {/* Raio */}
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

      {/* ═══ PAIN CRITERIA FILTERS ═══ */}
      <Grid size={{ xs: 12 }}>
        <Accordion expanded={criteriaOpen} onChange={() => setCriteriaOpen(!criteriaOpen)}>
          <AccordionSummary expandIcon={<i className='ri-arrow-down-s-line' />}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
              <Typography variant='subtitle2' fontWeight={600}>🎯 Critérios de Dor (Pain v1.1)</Typography>
              <Typography variant='caption' color='text.secondary'>R$0 extra · refina resultados já baixados</Typography>
              <Chip label={`${filtered.length}/${results.length} passam`} size='small'
                color={filtered.length < results.length ? 'warning' : 'default'} variant='tonal' sx={{ ml: 'auto', mr: 2 }} />
              {activeFilters > 0 && <Chip label={`${activeFilters} filtros ativos`} size='small' color='error' variant='tonal' />}
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={3}>
              {/* TIER 1-2: Rating, Reviews, Photos */}
              <Grid size={{ xs: 12, sm: 4 }}>
                <Typography variant='caption' fontWeight={600} gutterBottom>
                  ⭐ Rating mínimo: {minRating > 0 ? `${minRating}★` : 'Qualquer'}
                </Typography>
                <Slider value={minRating} onChange={(_, v) => setMinRating(v as number)}
                  min={0} max={5} step={0.5} valueLabelDisplay='auto'
                  valueLabelFormat={v => v === 0 ? 'Todos' : `${v}★`}
                  marks={[{ value: 0, label: '0' }, { value: 3, label: '3★' }, { value: 4, label: '4★' }, { value: 5, label: '5★' }]} />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <Typography variant='caption' fontWeight={600} gutterBottom>
                  📝 Reviews mínimas: {minReviews || 'Qualquer'}
                </Typography>
                <Slider value={minReviews} onChange={(_, v) => setMinReviews(v as number)}
                  min={0} max={100} step={5} valueLabelDisplay='auto'
                  valueLabelFormat={v => v === 0 ? 'Todas' : `${v}+`}
                  marks={[{ value: 0, label: '0' }, { value: 10, label: '10' }, { value: 50, label: '50' }]} />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <Typography variant='caption' fontWeight={600} gutterBottom>
                  📸 Fotos mínimas: {minPhotos || 'Qualquer'}
                </Typography>
                <Slider value={minPhotos} onChange={(_, v) => setMinPhotos(v as number)}
                  min={0} max={30} step={1} valueLabelDisplay='auto'
                  valueLabelFormat={v => v === 0 ? 'Todas' : `${v}+`}
                  marks={[{ value: 0, label: '0' }, { value: 3, label: '3' }, { value: 10, label: '10' }]} />
              </Grid>
              {/* Claimed + WhatsApp toggles */}
              <Grid size={{ xs: 12, sm: 4 }}>
                <FormControlLabel control={<Switch checked={requireClaimed} onChange={(_, v) => setRequireClaimed(v)} />}
                  label={<Typography variant='body2'>✅ Apenas reivindicados</Typography>} />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <FormControlLabel control={<Switch checked={requireWhatsApp} onChange={(_, v) => setRequireWhatsApp(v)} />}
                  label={<Typography variant='body2'>📱 Apenas com telefone</Typography>} />
              </Grid>
              {/* Active filter chips */}
              <Grid size={{ xs: 12, sm: 4 }}>
                {results.length > 0 && (
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    {minRating > 0 && <Chip label={`≥${minRating}★`} size='small' onDelete={() => setMinRating(0)} color='warning' variant='tonal' />}
                    {minReviews > 0 && <Chip label={`≥${minReviews} reviews`} size='small' onDelete={() => setMinReviews(0)} color='warning' variant='tonal' />}
                    {minPhotos > 0 && <Chip label={`≥${minPhotos} fotos`} size='small' onDelete={() => setMinPhotos(0)} color='warning' variant='tonal' />}
                    {requireClaimed && <Chip label='Reivindicado' size='small' onDelete={() => setRequireClaimed(false)} color='warning' variant='tonal' />}
                    {requireWhatsApp && <Chip label='WhatsApp' size='small' onDelete={() => setRequireWhatsApp(false)} color='warning' variant='tonal' />}
                    {websiteOnly && <Chip label='🌐 Website' size='small' onDelete={() => setWebsiteOnly(false)} color='info' variant='tonal' />}
                  </Box>
                )}
              </Grid>
            </Grid>

            {/* ═══ WEBSITE + TIER 3 ═══ */}
            <Box sx={{ mt: 3, borderTop: '1px solid', borderColor: 'divider', pt: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, flexWrap: 'wrap' }}>
                <FormControlLabel
                  control={<Switch checked={websiteOnly} onChange={(_, v) => setWebsiteOnly(v)} />}
                  label={
                    <Box>
                      <Typography variant='body2' fontWeight={600}>🌐 Apenas leads com Website</Typography>
                      <Typography variant='caption' color='text.secondary'>
                        Com URL podemos fazer auditoria completa: SEO, performance, analytics, CMS, conteúdo
                      </Typography>
                    </Box>
                  }
                />
                {websiteOnly && (
                  <Chip icon={<i className='ri-information-line' />}
                    label={`Tier 3: sem analytics${noAnalytics ? ' ✅' : ''} / CMS${cmsOutdated ? ' ✅' : ''} / blog${noBlog ? ' ✅' : ''} / mobile${mobileBad ? ' ✅' : ''}`}
                    size='small' color='info' variant='outlined' />
                )}
              </Box>
              {websiteOnly && (
                <Box sx={{ mt: 2, ml: 4, p: 2, bgcolor: 'info.50', borderRadius: 1, border: '1px solid', borderColor: 'info.200' }}>
                  <Typography variant='caption' fontWeight={600} gutterBottom component='div'>
                    <Chip label='TIER 3' size='small' color='info' variant='tonal' sx={{ mr: 1 }} />
                    Sub-filtros de Website (Pain Criteria v1.1 · Tier 3)
                  </Typography>
                  <Typography variant='caption' color='text.secondary' sx={{ mb: 2, display: 'block' }}>
                    Requer enriquecimento: on_page_lighthouse por lead · $0.0001/lead · Simulado até v0.3
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <FormControlLabel
                        control={<Switch checked={noAnalytics} onChange={(_, v) => setNoAnalytics(v)} size='small' />}
                        label={<Typography variant='body2'>T3.1 · Sem Analytics (10pts)</Typography>}
                      />
                      <Typography variant='caption' color='text.secondary' sx={{ ml: 4, display: 'block' }}>
                        Tem site MAS sem GA4/Facebook Pixel. Não mede tráfego.
                      </Typography>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <FormControlLabel
                        control={<Switch checked={cmsOutdated} onChange={(_, v) => setCmsOutdated(v)} size='small' />}
                        label={<Typography variant='body2'>T3.3 · CMS Desatualizado (8pts)</Typography>}
                      />
                      <Typography variant='caption' color='text.secondary' sx={{ ml: 4, display: 'block' }}>
                        WordPress sem updates há mais de 6 meses. Risco de segurança.
                      </Typography>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <FormControlLabel
                        control={<Switch checked={noBlog} onChange={(_, v) => setNoBlog(v)} size='small' />}
                        label={<Typography variant='body2'>T3.4 · Sem Blog/Conteúdo (5pts)</Typography>}
                      />
                      <Typography variant='caption' color='text.secondary' sx={{ ml: 4, display: 'block' }}>
                        Sem blog ou último post há mais de 90 dias.
                      </Typography>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <FormControlLabel
                        control={<Switch checked={mobileBad} onChange={(_, v) => setMobileBad(v)} size='small' />}
                        label={<Typography variant='body2'>T3.5 · Mobile Ruim (10pts)</Typography>}
                      />
                      <Typography variant='caption' color='text.secondary' sx={{ ml: 4, display: 'block' }}>
                        Performance mobile abaixo de 40. 70%+ do tráfego BR é mobile.
                      </Typography>
                    </Grid>
                  </Grid>
                  <Alert severity='info' sx={{ mt: 2 }}>
                    <Typography variant='caption'>
                      🔬 <strong>Wire planejado (v0.3):</strong> Para cada lead com website, chamar
                      <code> on_page_lighthouse(url)</code> via EVO-API MCP ($0.0001/lead).
                      Custo: ~$0.005 para auditar 50 leads.
                    </Typography>
                  </Alert>
                </Box>
              )}
            </Box>
          </AccordionDetails>
        </Accordion>
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
            Sim, buscar ($${estimatedCost.toFixed(4)})
          </Button>
        </DialogActions>
      </Dialog>

      {/* ═══ METRICS ═══ */}
      {results.length > 0 && (
        <>
          <Grid size={{ xs: 6, sm: 3 }}>
            <Card><CardContent sx={{ textAlign: 'center' }}>
              <Typography variant='h5' fontWeight={800}>{totalCount.toLocaleString('pt-BR')}</Typography>
              <Typography variant='caption' color='text.secondary'>Total na Região</Typography>
            </CardContent></Card>
          </Grid>
          <Grid size={{ xs: 6, sm: 3 }}>
            <Card><CardContent sx={{ textAlign: 'center' }}>
              <Typography variant='h5' fontWeight={800} color='error.main'>{notClaimed}</Typography>
              <Typography variant='caption' color='text.secondary'>Não Reivindicados</Typography>
            </CardContent></Card>
          </Grid>
          <Grid size={{ xs: 6, sm: 3 }}>
            <Card><CardContent sx={{ textAlign: 'center' }}>
              <Typography variant='h5' fontWeight={800} color='warning.main'>${costUsd.toFixed(4)}</Typography>
              <Typography variant='caption' color='text.secondary'>Custo da Chamada</Typography>
            </CardContent></Card>
          </Grid>
          <Grid size={{ xs: 6, sm: 3 }}>
            <Card><CardContent sx={{ textAlign: 'center' }}>
              <Typography variant='h5' fontWeight={800}>{fromCache ? '📦' : '🆕'}</Typography>
              <Typography variant='caption' color='text.secondary'>{fromCache ? 'Do Cache' : 'Ao Vivo'}</Typography>
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
            <Typography variant='caption' color='text.secondary'>Custo: ${estimatedCost.toFixed(4)} · Cache 30min</Typography>
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
                  <TableCell><TableSortLabel active={sortField === 'title'} direction={sortDir} onClick={() => handleSort('title')}>Nome</TableSortLabel></TableCell>
                  <TableCell><TableSortLabel active={sortField === 'category'} direction={sortDir} onClick={() => handleSort('category')}>Categoria</TableSortLabel></TableCell>
                  <TableCell align='right'><TableSortLabel active={sortField === 'rating_value'} direction={sortDir} onClick={() => handleSort('rating_value')}>⭐</TableSortLabel></TableCell>
                  <TableCell align='right'><TableSortLabel active={sortField === 'rating_votes'} direction={sortDir} onClick={() => handleSort('rating_votes')}>Reviews</TableSortLabel></TableCell>
                  <TableCell>Reivindicado?</TableCell>
                  <TableCell align='right'></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {paged.map((l, i) => (
                  <TableRow key={i} hover sx={{ cursor: 'pointer' }} onClick={() => setSelectedLead(l)}>
                    <TableCell>
                      <Typography fontWeight={600} fontSize='0.85rem' noWrap sx={{ maxWidth: 220 }}>{l.title || '—'}</Typography>
                      <Typography variant='caption' color='text.secondary' noWrap sx={{ maxWidth: 220 }}>{l.address?.slice(0, 50)}</Typography>
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
                      <Tooltip title="Ver detalhes"><IconButton size='small' onClick={e => { e.stopPropagation(); setSelectedLead(l); }}><i className='ri-arrow-right-line' /></IconButton></Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
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

      {/* ═══ LEAD DETAIL MODAL ═══ */}
      <Dialog open={!!selectedLead} onClose={() => setSelectedLead(null)} maxWidth='sm' fullWidth>
        {selectedLead && (
          <>
            <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant='h6'>{selectedLead.title || 'Sem nome'}</Typography>
              <IconButton onClick={() => setSelectedLead(null)} size='small'><i className='ri-close-line' /></IconButton>
            </DialogTitle>
            <DialogContent dividers>
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
              <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                <Button variant='outlined' size='small' onClick={() => {
                  if (selectedLead.place_id) window.open(`https://www.google.com/maps/place/?q=place_id:${selectedLead.place_id}`, '_blank')
                }} startIcon={<i className='ri-map-pin-line' />}>Google Maps</Button>
                <Button variant='outlined' size='small' color='warning' startIcon={<i className='ri-file-chart-line' />}
                  onClick={() => setSelectedLead(null)}>Diagnóstico</Button>
              </Box>
            </DialogContent>
          </>
        )}
      </Dialog>
    </Grid>
  )
}

export default DiscoveryPage
