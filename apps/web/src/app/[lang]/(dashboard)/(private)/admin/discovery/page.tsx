
'use client'
// adsentice · Admin / Discovery — NÃO GASTA SEM CONFIRMAR
// Cache 30min TTL · Persistência Redis 24h · Cost tracking
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

const GEO: Record<string, { lat: number; lng: number; label: string }> = {
  'SP': { lat: -23.5505, lng: -46.6333, label: 'São Paulo · SP' },
  'RJ': { lat: -22.9068, lng: -43.1729, label: 'Rio de Janeiro · RJ' },
  'BH': { lat: -19.9167, lng: -43.9345, label: 'Belo Horizonte · MG' },
  'BSB': { lat: -15.8267, lng: -47.9218, label: 'Brasília · DF' },
  'SSA': { lat: -12.9714, lng: -38.5014, label: 'Salvador · BA' },
  'POA': { lat: -30.0346, lng: -51.2177, label: 'Porto Alegre · RS' },
  'CWB': { lat: -25.4284, lng: -49.2733, label: 'Curitiba · PR' },
  'REC': { lat: -8.0476, lng: -34.8770, label: 'Recife · PE' },
  'FOR': { lat: -3.7172, lng: -38.5434, label: 'Fortaleza · CE' },
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

const DiscoveryPage = () => {
  const { lang } = useParams() as { lang: string }

  const [geoKey, setGeoKey] = useState('SP')
  const [radius, setRadius] = useState(10)
  const [selected, setSelected] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<Listing[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [costUsd, setCostUsd] = useState(0)
  const [error, setError] = useState('')
  const [fromCache, setFromCache] = useState(false)
  const [costToday, setCostToday] = useState(0)
  const [costTotal, setCostTotal] = useState(0)
  const [costLast, setCostLast] = useState('—')
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [selectedLead, setSelectedLead] = useState<Listing | null>(null)
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(20)
  const [sortField, setSortField] = useState<SortField>('title')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  const estimatedCost = selected.length * 0.015

  const doSearch = useCallback(async (force = false) => {
    if (!selected.length) return
    setLoading(true); setError('')
    try {
      const g = GEO[geoKey]
      const res = await fetch('/api/discovery-search', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categories: selected, lat: g.lat, lng: g.lng, radiusKm: radius,
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
      setCostLast(data.costLast || '—')
      setPage(0)
    } catch (e: any) { setError(e.message) }
    finally { setLoading(false) }
  }, [selected, geoKey, radius])

  const handleConfirmSearch = () => {
    setConfirmOpen(false)
    doSearch(true) // force fresh search (skip cache)
  }

  const toggle = (catId: string) => {
    setSelected(prev => {
      const next = prev.includes(catId) ? prev.filter(c => c !== catId) : [...prev, catId]
      if (results.length > 0 && next.length) doSearch() // auto-refresh if already have results
      return next
    })
  }

  const changeGeo = (g: string) => {
    setGeoKey(g)
    if (selected.length) doSearch()
  }
  const changeRadius = (r: number) => {
    setRadius(r)
    if (selected.length) doSearch()
  }

  const sorted = useMemo(() => {
    const arr = [...results]
    arr.sort((a, b) => {
      const va = a[sortField]; const vb = b[sortField]
      if (va == null && vb == null) return 0
      if (va == null) return 1; if (vb == null) return -1
      return sortDir === 'asc'
        ? String(va).localeCompare(String(vb), undefined, { numeric: true })
        : String(vb).localeCompare(String(va), undefined, { numeric: true })
    })
    return arr
  }, [results, sortField, sortDir])

  const paged = sorted.slice(page * rowsPerPage, (page + 1) * rowsPerPage)

  const notClaimed = results.filter(l => !l.is_claimed).length

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortDir('asc') }
  }

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
          {fromCache && (
            <Chip label='📦 Cache' size='small' color='info' variant='tonal' />
          )}
        </Box>
      </Grid>

      {/* ═══ COST + CACHE INFO ═══ */}
      {costLast !== '—' && (
        <Grid size={{ xs: 12 }}>
          <Alert severity='info' sx={{ '& .MuiAlert-message': { flex: 1 } }}>
            <Typography variant='body2'>
              Última busca: {costLast} &nbsp;|&nbsp;
              Resultados persistidos por 24h (Redis :6396). Mesma busca = não gasta de novo.
            </Typography>
          </Alert>
        </Grid>
      )}

      {/* ═══ GEO ═══ */}
      <Grid size={{ xs: 12 }}>
        <Card>
          <CardContent>
            <Typography variant='subtitle2' fontWeight={600} gutterBottom>🌎 Localização</Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1.5 }}>
              {Object.entries(GEO).map(([k, v]) => (
                <Chip key={k} label={v.label} clickable
                  color={geoKey === k ? 'primary' : 'default'}
                  variant={geoKey === k ? 'filled' : 'outlined'}
                  onClick={() => changeGeo(k)} />
              ))}
            </Box>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <Typography variant='caption' sx={{ mr: 1 }}>Raio:</Typography>
              {[3, 5, 10, 15, 25].map(r => (
                <Chip key={r} label={`${r}km`} clickable size='small'
                  color={radius === r ? 'primary' : 'default'}
                  variant={radius === r ? 'filled' : 'outlined'}
                  onClick={() => changeRadius(r)} />
              ))}
            </Box>
          </CardContent>
        </Card>
      </Grid>

      {/* ═══ CATEGORIES + SEARCH BUTTON ═══ */}
      <Grid size={{ xs: 12 }}>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
              <Typography variant='subtitle2' fontWeight={600}>
                📁 Categorias ({selected.length} selecionadas)
                {selected.length > 0 && (
                  <Chip label={`~$${estimatedCost.toFixed(4)}`} size='small' color='warning'
                    variant='tonal' sx={{ ml: 1 }} />
                )}
              </Typography>
              <Button
                variant='contained' color='primary'
                disabled={selected.length === 0 || loading}
                onClick={() => setConfirmOpen(true)}
                startIcon={loading ? undefined : <i className='ri-search-line' />}
                size='large'
              >
                {loading ? 'Buscando...' : `Buscar Agora ($${estimatedCost.toFixed(4)})`}
              </Button>
            </Box>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {CATS.map(cat => {
                const active = selected.includes(cat.id)
                return (
                  <Chip key={cat.id} label={cat.label} clickable
                    color={active ? 'primary' : 'default'}
                    variant={active ? 'filled' : 'outlined'}
                    onClick={() => toggle(cat.id)}
                    sx={active ? {} : { opacity: 0.7 }} />
                )
              })}
            </Box>
          </CardContent>
        </Card>
      </Grid>

      {/* ═══ CONFIRMATION DIALOG ═══ */}
      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)} maxWidth='xs' fullWidth>
        <DialogTitle>⚠️ Confirmar gasto?</DialogTitle>
        <DialogContent>
          <Typography variant='body1' gutterBottom>
            Você está prestes a fazer uma chamada <strong>LIVE</strong> ao DataForSEO.
          </Typography>
          <Box sx={{ bgcolor: 'grey.50', p: 2, borderRadius: 1, my: 2 }}>
            <Typography variant='body2'>
              📍 <strong>{GEO[geoKey].label}</strong> · {radius}km raio
            </Typography>
            <Typography variant='body2'>
              📁 <strong>{selected.length}</strong> categorias: {selected.join(', ')}
            </Typography>
            <Typography variant='body2' color='warning.main' fontWeight={600} sx={{ mt: 1 }}>
              💰 Custo estimado: <strong>${estimatedCost.toFixed(4)}</strong> (R${(estimatedCost * 5.5).toFixed(2)})
            </Typography>
          </Box>
          <Typography variant='caption' color='text.secondary'>
            Resultados ficam em cache por 30 minutos e persistidos no Redis por 24h.
            A mesma busca não gasta de novo.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)}>Cancelar</Button>
          <Button variant='contained' color='primary' onClick={handleConfirmSearch}>
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
          <Card sx={{ textAlign: 'center', py: 4 }}>
            <CardContent>
              <LinearProgress sx={{ mb: 2, borderRadius: 2 }} />
              <Typography>🔍 Buscando dados reais do Google Meu Negócio...</Typography>
              <Typography variant='caption' color='text.secondary'>Custo: ${estimatedCost.toFixed(4)} · Cache 30min</Typography>
            </CardContent>
          </Card>
        </Grid>
      )}

      {/* ═══ ERROR ═══ */}
      {error && (
        <Grid size={{ xs: 12 }}>
          <Alert severity='error' onClose={() => setError('')}>{error}</Alert>
        </Grid>
      )}

      {/* ═══ RESULTS TABLE ═══ */}
      {results.length > 0 && (
        <Grid size={{ xs: 12 }}>
          <TableContainer component={Paper}>
            <Table size='small'>
              <TableHead>
                <TableRow>
                  <TableCell><TableSortLabel active={sortField === 'title'} direction={sortDir}
                    onClick={() => handleSort('title')}>Nome</TableSortLabel></TableCell>
                  <TableCell><TableSortLabel active={sortField === 'category'} direction={sortDir}
                    onClick={() => handleSort('category')}>Categoria</TableSortLabel></TableCell>
                  <TableCell align='right'><TableSortLabel active={sortField === 'rating_value'} direction={sortDir}
                    onClick={() => handleSort('rating_value')}>⭐</TableSortLabel></TableCell>
                  <TableCell align='right'><TableSortLabel active={sortField === 'rating_votes'} direction={sortDir}
                    onClick={() => handleSort('rating_votes')}>Reviews</TableSortLabel></TableCell>
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
                      <Tooltip title="Ver detalhes"><IconButton size='small' onClick={e => { e.stopPropagation(); setSelectedLead(l) }}>
                        <i className='ri-arrow-right-line' /></IconButton></Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <TablePagination component='div' count={results.length} page={page}
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
