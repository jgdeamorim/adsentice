
'use client'
// adsentice · Admin / Discovery — DADOS REAIS, AUTO-LOAD, CONTAGEM NOS FILTROS
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
import IconButton from '@mui/material/IconButton'
import TablePagination from '@mui/material/TablePagination'
import TableSortLabel from '@mui/material/TableSortLabel'
import Badge from '@mui/material/Badge'
import LinearProgress from '@mui/material/LinearProgress'
import Tooltip from '@mui/material/Tooltip'

const GEO: Record<string, { lat: number; lng: number; label: string; count: number }> = {
  'SP': { lat: -23.5505, lng: -46.6333, label: 'São Paulo · SP', count: 0 },
  'RJ': { lat: -22.9068, lng: -43.1729, label: 'Rio de Janeiro · RJ', count: 0 },
  'BH': { lat: -19.9167, lng: -43.9345, label: 'Belo Horizonte · MG', count: 0 },
  'BSB': { lat: -15.8267, lng: -47.9218, label: 'Brasília · DF', count: 0 },
  'SSA': { lat: -12.9714, lng: -38.5014, label: 'Salvador · BA', count: 0 },
  'POA': { lat: -30.0346, lng: -51.2177, label: 'Porto Alegre · RS', count: 0 },
  'CWB': { lat: -25.4284, lng: -49.2733, label: 'Curitiba · PR', count: 0 },
  'REC': { lat: -8.0476, lng: -34.8770, label: 'Recife · PE', count: 0 },
  'FOR': { lat: -3.7172, lng: -38.5434, label: 'Fortaleza · CE', count: 0 },
}

const CATS = [
  { id: 'dentist', label: '🦷 Dentistas', count: 0 },
  { id: 'medical_aesthetic_clinic', label: '💉 Clínicas Estéticas', count: 0 },
  { id: 'medical_clinic', label: '🏥 Clínicas Médicas', count: 0 },
  { id: 'restaurant', label: '🍽️ Restaurantes', count: 0 },
  { id: 'gym', label: '🏋️ Academias', count: 0 },
  { id: 'lawyer', label: '⚖️ Advogados', count: 0 },
  { id: 'barber_shop', label: '💈 Barbearias', count: 0 },
  { id: 'pharmacy', label: '💊 Farmácias', count: 0 },
  { id: 'veterinarian', label: '🐾 Veterinários', count: 0 },
  { id: 'real_estate_agency', label: '🏠 Imobiliárias', count: 0 },
  { id: 'accountant', label: '📊 Contadores', count: 0 },
  { id: 'car_repair', label: '🔧 Oficinas', count: 0 },
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
  const [selected, setSelected] = useState<string[]>(['dentist'])
  const [loading, setLoading] = useState(true)
  const [results, setResults] = useState<Listing[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [costUsd, setCostUsd] = useState(0)
  const [error, setError] = useState('')
  const [geoCounts, setGeoCounts] = useState<Record<string, number>>({})
  const [catCounts, setCatCounts] = useState<Record<string, number>>({})
  const [selectedLead, setSelectedLead] = useState<Listing | null>(null)
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(20)
  const [sortField, setSortField] = useState<SortField>('title')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  const search = useCallback(async (cats: string[], geo: string, rad: number) => {
    if (!cats.length) { setResults([]); setTotalCount(0); return }
    setLoading(true); setError('')
    try {
      const g = GEO[geo]
      const res = await fetch('/api/discovery-search', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categories: cats, lat: g.lat, lng: g.lng, radiusKm: rad, limit: 50 }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      const listings: Listing[] = data.listings || []
      setResults(listings)
      setTotalCount(data.total_count || 0)
      setCostUsd(data.cost_usd || 0)
      // Update counts in geo and categories
      const tc = data.total_count || 0
      setGeoCounts(prev => ({ ...prev, [geo]: tc }))
      setCatCounts(prev => {
        const next = { ...prev }
        cats.forEach(c => { next[c] = tc })
        return next
      })
      setPage(0)
    } catch (e: any) { setError(e.message) }
    finally { setLoading(false) }
  }, [])

  // Auto-load on mount
  useEffect(() => { search(selected, geoKey, radius) }, [])

  const toggle = (catId: string) => {
    setSelected(prev => {
      const next = prev.includes(catId) ? prev.filter(c => c !== catId) : [...prev, catId]
      if (next.length) search(next, geoKey, radius)
      else { setResults([]); setTotalCount(0) }
      return next
    })
  }

  const changeGeo = (g: string) => { setGeoKey(g); search(selected, g, radius) }
  const changeRadius = (r: number) => { setRadius(r); search(selected, geoKey, r) }

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
  const inCity = results.filter(l => {
    if (!l.latitude || !l.longitude) return false
    const g = GEO[geoKey]
    return Math.abs(l.latitude - g.lat) < 2 && Math.abs(l.longitude - g.lng) < 2
  }).length

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortDir('asc') }
  }

  // Compute display labels with counts
  const geoLabels = Object.entries(GEO).map(([k, v]) => ({
    key: k, label: `${v.label}${geoCounts[k] ? ` (${geoCounts[k].toLocaleString('pt-BR')})` : ''}`
  }))
  const catLabels = CATS.map(c => ({
    ...c,
    label: catCounts[c.id] ? `${c.label} (${catCounts[c.id].toLocaleString('pt-BR')})` : c.label
  }))

  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12 }}>
        <Typography variant='h4'>🔍 Discovery Engine</Typography>
        <Typography variant='body2' color='text.secondary'>
          Dados REAIS via EVO-API MCP · DataForSEO LIVE
          {costUsd > 0 && <Chip label={`$${costUsd.toFixed(4)}`} size='small' color='warning' sx={{ ml: 1 }} />}
        </Typography>
      </Grid>

      {/* ═══ GEO ═══ */}
      <Grid size={{ xs: 12 }}>
        <Card>
          <CardContent>
            <Typography variant='subtitle2' fontWeight={600} gutterBottom>🌎 Localização</Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1.5 }}>
              {geoLabels.map(g => (
                <Chip key={g.key} label={g.label} clickable
                  color={geoKey === g.key ? 'primary' : 'default'}
                  variant={geoKey === g.key ? 'filled' : 'outlined'}
                  onClick={() => changeGeo(g.key)} />
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

      {/* ═══ CATEGORIES ═══ */}
      <Grid size={{ xs: 12 }}>
        <Card>
          <CardContent>
            <Typography variant='subtitle2' fontWeight={600} gutterBottom>
              📁 Categorias ({selected.length} selecionadas)
            </Typography>
            {loading && <LinearProgress sx={{ mb: 1, borderRadius: 2 }} />}
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {catLabels.map(cat => {
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
              <Typography variant='h5' fontWeight={800}>{inCity}</Typography>
              <Typography variant='caption' color='text.secondary'>📍 Na Cidade</Typography>
            </CardContent></Card>
          </Grid>
          <Grid size={{ xs: 6, sm: 3 }}>
            <Card><CardContent sx={{ textAlign: 'center' }}>
              <Typography variant='h5' fontWeight={800} color='warning.main'>${costUsd.toFixed(4)}</Typography>
              <Typography variant='caption' color='text.secondary'>Custo</Typography>
            </CardContent></Card>
          </Grid>
        </>
      )}

      {/* ═══ ERROR ═══ */}
      {error && (
        <Grid size={{ xs: 12 }}>
          <Card sx={{ bgcolor: 'error.50' }}><CardContent><Typography color='error'>{error}</Typography></CardContent></Card>
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

      {/* ═══ INITIAL LOADING ═══ */}
      {loading && results.length === 0 && (
        <Grid size={{ xs: 12 }}>
          <Card sx={{ textAlign: 'center', py: 4 }}>
            <CardContent>
              <LinearProgress sx={{ mb: 2, borderRadius: 2 }} />
              <Typography>🔍 Buscando dados reais do Google Meu Negócio...</Typography>
            </CardContent>
          </Card>
        </Grid>
      )}

      {/* ═══ MODAL · LEAD DETAIL ═══ */}
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
                  ['📐 Lat/Lng', selectedLead.latitude ? `${selectedLead.latitude.toFixed(4)}, ${selectedLead.longitude?.toFixed(4)}` : '—'],
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
