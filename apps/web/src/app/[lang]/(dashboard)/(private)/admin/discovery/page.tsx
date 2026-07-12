
// adsentice · Admin / Discovery — motor de descoberta com filtros geo
// País → Estado → Cidade → Bairro → Raio + categorias → dados REAIS EVO-API MCP
import { redirect } from 'next/navigation'
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
import CardStatVertical from '@components/card-statistics/Vertical'
import { getSessionUser } from '@/libs/supabase/server'
import { businessListingsSearch, type GMBListing } from '@/lib/evo-mcp'

// ── Brazilian geo hierarchy ──
const GEO_PRESETS = {
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
  { id: 'car_repair', label: '🔧 Oficinas Mecânicas' },
]

interface DiscoveryPageProps {
  params: Promise<{ lang: string }>
  searchParams: Promise<Record<string, string>>
}

const DiscoveryPage = async ({ params, searchParams }: DiscoveryPageProps) => {
  const { lang } = await params
  const sp = await searchParams
  const user = await getSessionUser()
  if (user?.role !== 'admin') redirect(`/${lang}/app`)

  // ── Parse filters from URL ──
  const catParam = sp.categories || ''
  const selectedCategories = catParam ? catParam.split(',') : []
  const geoPreset = sp.geo || 'SP'
  const geo = GEO_PRESETS[geoPreset as keyof typeof GEO_PRESETS] || GEO_PRESETS['SP']
  const radius = parseInt(sp.radius || '10')
  const shouldSearch = selectedCategories.length > 0

  // ── Search (REAL DATA via EVO-API MCP) ──
  let results: GMBListing[] = []
  let totalCount = 0
  let costUsd = 0
  let searchError = ''

  if (shouldSearch) {
    try {
      const r = await businessListingsSearch({
        categories: selectedCategories,
        lat: geo.lat,
        lng: geo.lng,
        radiusKm: radius,
        limit: 15,
      })
      results = r.listings
      totalCount = r.total_count
      costUsd = r.cost_usd
    } catch (e: any) {
      searchError = e.message || String(e)
    }
  }

  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12 }}>
        <Typography variant='h4'>🔍 Discovery Engine</Typography>
        <Typography variant='body2' color='text.secondary'>
          Dados REAIS via EVO-API MCP · DataForSEO LIVE
          {costUsd > 0 && <Chip label={`$${costUsd.toFixed(4)}`} size='small' color='warning' sx={{ ml: 1 }} />}
        </Typography>
      </Grid>

      {/* ═══ FILTERS ═══ */}
      <Grid size={{ xs: 12 }}>
        <Card>
          <CardContent>
            <Typography variant='h6' gutterBottom>🌎 Localização</Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
              {Object.entries(GEO_PRESETS).map(([key, g]) => (
                <Chip
                  key={key}
                  label={g.label}
                  component='a'
                  href={`/${lang}/admin/discovery?geo=${key}&radius=${radius}${catParam ? '&categories=' + catParam : ''}`}
                  clickable
                  color={geoPreset === key ? 'primary' : 'default'}
                  variant={geoPreset === key ? 'filled' : 'outlined'}
                />
              ))}
            </Box>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
              <Typography variant='body2'>Raio:</Typography>
              {[3, 5, 10, 15, 25].map(r => (
                <Chip
                  key={r}
                  label={`${r}km`}
                  component='a'
                  href={`/${lang}/admin/discovery?geo=${geoPreset}&radius=${r}${catParam ? '&categories=' + catParam : ''}`}
                  clickable
                  color={radius === r ? 'primary' : 'default'}
                  variant={radius === r ? 'filled' : 'outlined'}
                  size='small'
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
            <Typography variant='h6' gutterBottom>📁 Categorias GMB</Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {GMB_CATEGORIES.map(cat => {
                const active = selectedCategories.includes(cat.id)
                const toggle = active
                  ? selectedCategories.filter(c => c !== cat.id).join(',')
                  : [...selectedCategories, cat.id].join(',')
                return (
                  <Chip
                    key={cat.id}
                    label={cat.label}
                    component='a'
                    href={`/${lang}/admin/discovery?geo=${geoPreset}&radius=${radius}${toggle ? '&categories=' + toggle : ''}`}
                    clickable
                    color={active ? 'primary' : 'default'}
                    variant={active ? 'filled' : 'outlined'}
                  />
                )
              })}
            </Box>
          </CardContent>
        </Card>
      </Grid>

      {/* ═══ RESULTS ═══ */}
      {shouldSearch && (
        <>
          <Grid size={{ xs: 12, sm: 4 }}>
            <CardStatVertical
              stats={totalCount.toLocaleString('pt-BR')}
              title='Negócios na Região'
              subtitle={`${selectedCategories.length} categorias · raio ${radius}km`}
              avatarColor='primary'
              avatarIcon='ri-store-2-line'
              trendNumber={String(results.length)}
              trend='positive'
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <CardStatVertical
              stats={`$${costUsd.toFixed(4)}`}
              title='Custo da Consulta'
              subtitle={`R$${(costUsd * 5.5).toFixed(2)} · DataForSEO LIVE`}
              avatarColor='warning'
              avatarIcon='ri-money-dollar-circle-line'
              trendNumber={String(costUsd)}
              trend='negative'
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <CardStatVertical
              stats={`${results.filter(l => !l.is_claimed).length}`}
              title='Não Reivindicados'
              subtitle='Oportunidade: owner ausente'
              avatarColor='error'
              avatarIcon='ri-alert-line'
              trendNumber={String(results.filter(l => !l.is_claimed).length)}
              trend='negative'
            />
          </Grid>

          {searchError && (
            <Grid size={{ xs: 12 }}>
              <Card sx={{ bgcolor: 'error.50' }}>
                <CardContent>
                  <Typography color='error'>{searchError}</Typography>
                </CardContent>
              </Card>
            </Grid>
          )}

          <Grid size={{ xs: 12 }}>
            <TableContainer component={Paper}>
              <Table size='small'>
                <TableHead>
                  <TableRow>
                    <TableCell>Nome</TableCell>
                    <TableCell>Categoria</TableCell>
                    <TableCell align='right'>⭐</TableCell>
                    <TableCell align='right'>Reviews</TableCell>
                    <TableCell>Reivindicado?</TableCell>
                    <TableCell align='right'>📍</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {results.map((l, i) => {
                    const inRegion = l.latitude && l.longitude
                    return (
                      <TableRow key={i} hover>
                        <TableCell>
                          <Typography fontWeight={600} fontSize='0.85rem'>
                            {l.title || '—'}
                          </Typography>
                          <Typography variant='caption' color='text.secondary'>
                            {l.place_id?.slice(0, 16)}...
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip label={l.category || '?'} size='small' variant='outlined' />
                        </TableCell>
                        <TableCell align='right'>
                          <Chip
                            label={l.rating_value ? `${l.rating_value}★` : '—'}
                            size='small'
                            color={l.rating_value && l.rating_value < 4 ? 'warning' : 'success'}
                            variant='tonal'
                          />
                        </TableCell>
                        <TableCell align='right'>{l.rating_votes || 0}</TableCell>
                        <TableCell>
                          <Chip
                            label={l.is_claimed ? 'Sim' : '⚠️ Não'}
                            size='small'
                            color={l.is_claimed ? 'success' : 'error'}
                            variant='tonal'
                          />
                        </TableCell>
                        <TableCell align='right'>
                          {inRegion ? (
                            <Chip label='📍' size='small' color='primary' variant='tonal' />
                          ) : (
                            <Chip label='🌍' size='small' variant='outlined' />
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </Grid>
        </>
      )}

      {!shouldSearch && (
        <Grid size={{ xs: 12 }}>
          <Card sx={{ bgcolor: 'var(--pastel-coral)', textAlign: 'center', py: 4 }}>
            <CardContent>
              <Typography variant='h5' gutterBottom>👆 Selecione uma ou mais categorias acima</Typography>
              <Typography variant='body2' color='text.secondary'>
                O motor vai consultar o Google Meu Negócio via DataForSEO AO VIVO.
                Custo: ~$0.015 por categoria. Dados REAIS de mercado.
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      )}
    </Grid>
  )
}

export default DiscoveryPage
