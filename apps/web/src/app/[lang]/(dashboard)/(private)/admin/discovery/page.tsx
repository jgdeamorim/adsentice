
'use client'

// adsentice · Admin / Discovery — motor de descoberta com filtros geo
// País → Estado → Cidade → Bairro → Raio + categorias → dados REAIS EVO-API MCP
// Features: modal detail, paginação, ordenação A-Z, contagem por categoria

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
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
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import Divider from '@mui/material/Divider'
import Badge from '@mui/material/Badge'
import LinearProgress from '@mui/material/LinearProgress'
import Tooltip from '@mui/material/Tooltip'

const GEO_PRESETS: Record<string, { lat: number; lng: number; label: string }> = {
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

const GMB_CATEGORIES = [
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

interface GMBListing {
  title: string | null
  category: string | null
  address: string | null
  rating_value: number | null
  rating_votes: number | null
  place_id: string | null
  cid: string | null
  latitude: number | null
  longitude: number | null
  is_claimed: boolean | null
}

type SortField = 'title' | 'category' | 'rating_value' | 'rating_votes'
type SortDir = 'asc' | 'desc'

const DiscoveryPage = () => {
  const { lang } = useParams() as { lang: string }
  const router = useRouter()
  const searchParams = useSearchParams()

  // Filters
  const [geo, setGeo] = useState(searchParams.get('geo') || 'SP')
  const [radius, setRadius] = useState(parseInt(searchParams.get('radius') || '10'))
  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    searchParams.get('categories')?.split(',').filter(Boolean) || []
  )

  // Results
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<GMBListing[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [costUsd, setCostUsd] = useState(0)
  const [error, setError] = useState('')
  const [catCounts, setCatCounts] = useState<Record<string, number>>({})

  // UI state
  const [selectedLead, setSelectedLead] = useState<GMBListing | null>(null)
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [sortField, setSortField] = useState<SortField>('title')
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  const search = useCallback(async () => {
    if (selectedCategories.length === 0) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/discovery-search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categories: selectedCategories,
          lat: GEO_PRESETS[geo].lat,
          lng: GEO_PRESETS[geo].lng,
          radiusKm: radius,
          limit: 50,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Search failed')
      setResults(data.listings || [])
      setTotalCount(data.total_count || 0)
      setCostUsd(data.cost_usd || 0)
      setCatCounts(data.cat_counts || {})
      setPage(0)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [selectedCategories, geo, radius])

  const toggleCategory = (catId: string) => {
    setSelectedCategories(prev =>
      prev.includes(catId) ? prev.filter(c => c !== catId) : [...prev, catId]
    )
  }

  // Sort + paginate
  const sorted = useMemo(() => {
    const arr = [...results]
    arr.sort((a, b) => {
      const va = a[sortField]
      const vb = b[sortField]
      if (va == null && vb == null) return 0
      if (va == null) return 1
      if (vb == null) return -1
      if (typeof va === 'string' && typeof vb === 'string') return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va)
      const diff = (Number(va) || 0) - (Number(vb) || 0)
      return sortDir === 'asc' ? diff : -diff
    })
    return arr
  }, [results, sortField, sortDir])

  const paged = useMemo(() =>
    sorted.slice(page * rowsPerPage, (page + 1) * rowsPerPage),
  [sorted, page, rowsPerPage])

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortDir('asc') }
  }

  const notClaimed = results.filter(l => !l.is_claimed).length
  const inCity = results.filter(l => {
    if (!l.latitude || !l.longitude) return false
    const g = GEO_PRESETS[geo]
    return Math.abs(l.latitude - g.lat) < 2 && Math.abs(l.longitude - g.lng) < 2
  }).length

  return (
    <Grid container spacing={6}>
      {/* Header */}
      <Grid size={{ xs: 12 }}>
        <Typography variant='h4'>🔍 Discovery Engine</Typography>
        <Typography variant='body2' color='text.secondary'>
          Dados REAIS via EVO-API MCP · DataForSEO LIVE
          {costUsd > 0 && <Chip label={`$${costUsd.toFixed(4)}`} size='small' color='warning' sx={{ ml: 1 }} />}
          {loading && <LinearProgress sx={{ mt: 1, borderRadius: 2 }} />}
        </Typography>
      </Grid>

      {/* ═══ GEO FILTERS ═══ */}
      <Grid size={{ xs: 12 }}>
        <Card>
          <CardContent>
            <Typography variant='subtitle2' fontWeight={600} gutterBottom>🌎 Localização</Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
              {Object.entries(GEO_PRESETS).map(([key, g]) => (
                <Chip
                  key={key} label={g.label} clickable
                  color={geo === key ? 'primary' : 'default'}
                  variant={geo === key ? 'filled' : 'outlined'}
                  onClick={() => setGeo(key)}
                />
              ))}
            </Box>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <Typography variant='caption' sx={{ mr: 1 }}>Raio:</Typography>
              {[3, 5, 10, 15, 25].map(r => (
                <Chip key={r} label={`${r}km`} clickable size='small'
                  color={radius === r ? 'primary' : 'default'}
                  variant={radius === r ? 'filled' : 'outlined'}
                  onClick={() => setRadius(r)}
                />
              ))}
            </Box>
          </CardContent>
        </Card>
      </Grid>

      {/* ═══ CATEGORIES ═══ */}
      <Grid size={{ xs: 12 }}>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant='subtitle2' fontWeight={600}>📁 Categorias ({selectedCategories.length} selecionadas)</Typography>
              <Button size='small' variant='contained' color='primary'
                disabled={selectedCategories.length === 0 || loading}
                onClick={search}
                startIcon={loading ? undefined : <i className='ri-search-line' />}
              >
                {loading ? 'Buscando...' : `Buscar (${selectedCategories.length})`}
              </Button>
            </Box>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {GMB_CATEGORIES.map(cat => {
                const active = selectedCategories.includes(cat.id)
                const count = catCounts[cat.id]
                return (
                  <Badge key={cat.id} badgeContent={count || 0} color='primary' invisible={!count}
                    sx={{ '& .MuiBadge-badge': { fontSize: '0.65rem', height: 16, minWidth: 16 } }}>
                    <Chip label={cat.label} clickable
                      color={active ? 'primary' : 'default'}
                      variant={active ? 'filled' : 'outlined'}
                      onClick={() => toggleCategory(cat.id)}
                      sx={active ? {} : { opacity: 0.6 }}
                    />
                  </Badge>
                )
              })}
            </Box>
          </CardContent>
        </Card>
      </Grid>

      {/* ═══ RESULTS ═══ */}
      {results.length > 0 && (
        <>
          {/* Top metrics */}
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

          {/* Error */}
          {error && (
            <Grid size={{ xs: 12 }}>
              <Card sx={{ bgcolor: 'error.50' }}><CardContent><Typography color='error'>{error}</Typography></CardContent></Card>
            </Grid>
          )}

          {/* Table */}
          <Grid size={{ xs: 12 }}>
            <TableContainer component={Paper}>
              <Table size='small'>
                <TableHead>
                  <TableRow>
                    <TableCell>
                      <TableSortLabel active={sortField === 'title'} direction={sortField === 'title' ? sortDir : 'asc'}
                        onClick={() => handleSort('title')}>Nome</TableSortLabel>
                    </TableCell>
                    <TableCell>
                      <TableSortLabel active={sortField === 'category'} direction={sortField === 'category' ? sortDir : 'asc'}
                        onClick={() => handleSort('category')}>Categoria</TableSortLabel>
                    </TableCell>
                    <TableCell align='right'>
                      <TableSortLabel active={sortField === 'rating_value'} direction={sortField === 'rating_value' ? sortDir : 'asc'}
                        onClick={() => handleSort('rating_value')}>⭐</TableSortLabel>
                    </TableCell>
                    <TableCell align='right'>
                      <TableSortLabel active={sortField === 'rating_votes'} direction={sortField === 'rating_votes' ? sortDir : 'asc'}
                        onClick={() => handleSort('rating_votes')}>Reviews</TableSortLabel>
                    </TableCell>
                    <TableCell>Reivindicado?</TableCell>
                    <TableCell align='right'></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {paged.map((l, i) => (
                    <TableRow key={i} hover sx={{ cursor: 'pointer' }} onClick={() => setSelectedLead(l)}>
                      <TableCell>
                        <Typography fontWeight={600} fontSize='0.85rem'>{l.title || '—'}</Typography>
                        <Typography variant='caption' color='text.secondary'>{l.address?.slice(0, 40)}</Typography>
                      </TableCell>
                      <TableCell><Chip label={l.category || '?'} size='small' variant='outlined' /></TableCell>
                      <TableCell align='right'>
                        <Chip label={l.rating_value ? `${l.rating_value}★` : '—'} size='small'
                          color={l.rating_value && l.rating_value < 4 ? 'warning' : 'success'} variant='tonal' />
                      </TableCell>
                      <TableCell align='right'>{l.rating_votes || 0}</TableCell>
                      <TableCell>
                        <Chip label={l.is_claimed ? 'Sim' : '⚠️ Não'} size='small'
                          color={l.is_claimed ? 'success' : 'error'} variant='tonal' />
                      </TableCell>
                      <TableCell align='right'>
                        <Tooltip title="Ver detalhes">
                          <IconButton size='small' onClick={e => { e.stopPropagation(); setSelectedLead(l); }}>
                            <i className='ri-arrow-right-line' />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <TablePagination
                component='div' count={results.length} page={page}
                onPageChange={(_, p) => setPage(p)} rowsPerPage={rowsPerPage}
                onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value)); setPage(0); }}
                rowsPerPageOptions={[10, 20, 30, 50, 100]}
                labelRowsPerPage='Por página:'
                labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`}
              />
            </TableContainer>
          </Grid>
        </>
      )}

      {/* Empty state */}
      {!loading && results.length === 0 && !error && (
        <Grid size={{ xs: 12 }}>
          <Card sx={{ bgcolor: 'var(--pastel-coral)', textAlign: 'center', py: 4 }}>
            <CardContent>
              <Typography variant='h5' gutterBottom>👆 Selecione categorias e clique em Buscar</Typography>
              <Typography variant='body2' color='text.secondary'>
                Dados REAIS do Google Meu Negócio via DataForSEO LIVE. ~$0.015 por chamada.
              </Typography>
            </CardContent>
          </Card>
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
                  ['📝 Reviews', selectedLead.rating_votes ? String(selectedLead.rating_votes) : '0'],
                  ['🔑 Place ID', selectedLead.place_id?.slice(0, 20) + '...'],
                  ['🆔 CID', selectedLead.cid],
                  ['✅ Reivindicado', selectedLead.is_claimed ? 'Sim' : '⚠️ Não'],
                  ['📐 Coordenadas', selectedLead.latitude && selectedLead.longitude ? `${selectedLead.latitude.toFixed(4)}, ${selectedLead.longitude.toFixed(4)}` : '—'],
                ].map(([label, value], i) => (
                  <Grid key={i} size={{ xs: 12, sm: 6 }}>
                    <Typography variant='caption' color='text.secondary'>{label}</Typography>
                    <Typography variant='body2' fontWeight={600}>{value || '—'}</Typography>
                  </Grid>
                ))}
              </Grid>
              <Divider sx={{ my: 2 }} />
              <Typography variant='subtitle2' gutterBottom>⚡ Ações Rápidas</Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button variant='outlined' size='small' startIcon={<i className='ri-search-line' />}
                  onClick={() => {
                    if (selectedLead.place_id) {
                      window.open(`https://www.google.com/maps/place/?q=place_id:${selectedLead.place_id}`, '_blank')
                    }
                  }}>
                  Abrir no Google Maps
                </Button>
                <Button variant='outlined' size='small' color='warning' startIcon={<i className='ri-file-chart-line' />}>
                  Diagnóstico Completo
                </Button>
              </Box>
            </DialogContent>
          </>
        )}
      </Dialog>
    </Grid>
  )
}

export default DiscoveryPage
