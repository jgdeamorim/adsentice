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
// 5 níveis de consciência do comprador (Eugene Schwartz, 1966)
// Cada nível define COMO abordar o lead, não só o score
const SCHWARTZ_CHIPS = [
  {
    level: 1, label: 'Unaware', color: '#9e9e9e',
    description: 'Não sabe que tem problema digital. Ex: dentista que não sabe que aparece sem foto no Google.',
    action: 'Educar com conteúdo gratuito. NUNCA vender.',
    example: '"Você sabia que 70% dos pacientes pesquisam no Google antes de escolher um dentista?"',
  },
  {
    level: 2, label: 'Problem Aware', color: '#42a5f5',
    description: 'Sabe que tem dor mas não conhece solução. Ex: dentista que percebeu que tem poucos pacientes novos.',
    action: 'Agitar a dor. Mostrar que EXISTE solução.',
    example: '"Sua clínica recebe menos de 10 pacientes novos por mês? Isso tem solução."',
  },
  {
    level: 3, label: 'Solution Aware', color: '#ffa726',
    description: 'Sabe que existem soluções de marketing mas não conhece a adsentice. Ex: já ouviu falar de SEO/Google Ads.',
    action: 'Comparar. Mostrar por que adsentice é diferente e mais barato.',
    example: '"Agências de marketing custam R$2.000/mês. Nosso diagnóstico é gratuito e automatizado."',
  },
  {
    level: 4, label: 'Product Aware', color: '#ef5350',
    description: 'Conhece a adsentice ou produto similar. Ex: já fez o Raio-X gratuito, está considerando.',
    action: 'Prova social + Garantia + Oferta.',
    example: '"237 clínicas em SP já usam o Sentinela. Resultado em 7 dias ou devolvemos seu dinheiro."',
  },
  {
    level: 5, label: 'Most Aware', color: '#d32f2f',
    description: 'Já decidiu, só precisa fechar. Ex: pediu orçamento, perguntou preço, quer começar.',
    action: 'CTA direto. Urgência. Fechar.',
    example: '"Comece agora. Primeiro mês por R$47. Cancele quando quiser."',
  },
] as const

// ── Geo Data ──
// Top 3-5 cities per Brazilian state by population (IBGE 2024 estimates).
// Real lat/lng coordinates for DataForSEO business_listings_search.
const STATES: Record<string, { label: string; cities: Record<string, { lat: number; lng: number; label: string }> }> = {
  'SP': { label: 'SP', cities: {
    'sp-capital': { lat: -23.5505, lng: -46.6333, label: 'São Paulo (Capital)' },
    'sp-guarulhos': { lat: -23.4538, lng: -46.5333, label: 'Guarulhos' },
    'sp-campinas': { lat: -22.9056, lng: -47.0608, label: 'Campinas' },
    'sp-sorocaba': { lat: -23.5015, lng: -47.4526, label: 'Sorocaba' },
    'sp-ribeirao': { lat: -21.1767, lng: -47.8202, label: 'Ribeirão Preto' },
    'sp-sjcampos': { lat: -23.1791, lng: -45.8872, label: 'São José dos Campos' },
  }},
  'RJ': { label: 'RJ', cities: {
    'rj-capital': { lat: -22.9068, lng: -43.1729, label: 'Rio de Janeiro (Capital)' },
    'rj-sgoncalo': { lat: -22.8269, lng: -43.0540, label: 'São Gonçalo' },
    'rj-duquecaxias': { lat: -22.7858, lng: -43.3119, label: 'Duque de Caxias' },
    'rj-novaiguacu': { lat: -22.7592, lng: -43.4509, label: 'Nova Iguaçu' },
    'rj-niteroi': { lat: -22.8832, lng: -43.1034, label: 'Niterói' },
  }},
  'MG': { label: 'MG', cities: {
    'mg-bh': { lat: -19.9167, lng: -43.9345, label: 'Belo Horizonte' },
    'mg-uberlandia': { lat: -18.9186, lng: -48.2772, label: 'Uberlândia' },
    'mg-contagem': { lat: -19.9317, lng: -44.0539, label: 'Contagem' },
    'mg-juizdefora': { lat: -21.7642, lng: -43.3501, label: 'Juiz de Fora' },
    'mg-montesclaros': { lat: -16.7350, lng: -43.8614, label: 'Montes Claros' },
  }},
  'PR': { label: 'PR', cities: {
    'pr-curitiba': { lat: -25.4284, lng: -49.2733, label: 'Curitiba' },
    'pr-londrina': { lat: -23.3103, lng: -51.1628, label: 'Londrina' },
    'pr-maringa': { lat: -23.4253, lng: -51.9386, label: 'Maringá' },
    'pr-pontagrossa': { lat: -25.0945, lng: -50.1633, label: 'Ponta Grossa' },
    'pr-cascavel': { lat: -24.9555, lng: -53.4553, label: 'Cascavel' },
  }},
  'RS': { label: 'RS', cities: {
    'rs-poa': { lat: -30.0346, lng: -51.2177, label: 'Porto Alegre' },
    'rs-caxias': { lat: -29.1685, lng: -51.1794, label: 'Caxias do Sul' },
    'rs-canoas': { lat: -29.9175, lng: -51.1833, label: 'Canoas' },
    'rs-pelotas': { lat: -31.7719, lng: -52.3422, label: 'Pelotas' },
    'rs-santamaria': { lat: -29.6842, lng: -53.8069, label: 'Santa Maria' },
  }},
  'SC': { label: 'SC', cities: {
    'sc-floripa': { lat: -27.5969, lng: -48.5495, label: 'Florianópolis' },
    'sc-joinville': { lat: -26.3045, lng: -48.8487, label: 'Joinville' },
    'sc-blumenau': { lat: -26.9194, lng: -49.0661, label: 'Blumenau' },
    'sc-chapeco': { lat: -27.0963, lng: -52.6186, label: 'Chapecó' },
    'sc-itajai': { lat: -26.9078, lng: -48.6619, label: 'Itajaí' },
  }},
  'BA': { label: 'BA', cities: {
    'ba-salvador': { lat: -12.9714, lng: -38.5014, label: 'Salvador' },
    'ba-feiradesantana': { lat: -12.2520, lng: -38.9500, label: 'Feira de Santana' },
    'ba-vitoriadaconquista': { lat: -14.8658, lng: -40.8391, label: 'Vitória da Conquista' },
    'ba-camacari': { lat: -12.6974, lng: -38.3237, label: 'Camaçari' },
    'ba-juazeiro': { lat: -9.4138, lng: -40.5031, label: 'Juazeiro' },
  }},
  'PE': { label: 'PE', cities: {
    'pe-recife': { lat: -8.0476, lng: -34.8770, label: 'Recife' },
    'pe-jaboatao': { lat: -8.1803, lng: -34.9814, label: 'Jaboatão dos Guararapes' },
    'pe-olinda': { lat: -7.9940, lng: -34.8553, label: 'Olinda' },
    'pe-caruaru': { lat: -8.2822, lng: -35.9759, label: 'Caruaru' },
    'pe-petrolina': { lat: -9.3938, lng: -40.5078, label: 'Petrolina' },
  }},
  'CE': { label: 'CE', cities: {
    'ce-fortaleza': { lat: -3.7172, lng: -38.5434, label: 'Fortaleza' },
    'ce-caucaia': { lat: -3.7364, lng: -38.6531, label: 'Caucaia' },
    'ce-juazeirodonorte': { lat: -7.2125, lng: -39.3150, label: 'Juazeiro do Norte' },
    'ce-maracanau': { lat: -3.8761, lng: -38.6257, label: 'Maracanaú' },
    'ce-sobral': { lat: -3.6875, lng: -40.3482, label: 'Sobral' },
  }},
  'DF': { label: 'DF', cities: {
    'df-brasilia': { lat: -15.8267, lng: -47.9218, label: 'Brasília (Plano Piloto)' },
    'df-taguatinga': { lat: -15.8333, lng: -48.0667, label: 'Taguatinga' },
    'df-ceilandia': { lat: -15.8167, lng: -48.1167, label: 'Ceilândia' },
    'df-samambaia': { lat: -15.8667, lng: -48.0833, label: 'Samambaia' },
    'df-aguasclaras': { lat: -15.8500, lng: -48.0500, label: 'Águas Claras' },
  }},
  'GO': { label: 'GO', cities: {
    'go-goiania': { lat: -16.6869, lng: -49.2648, label: 'Goiânia' },
    'go-aparecida': { lat: -16.8233, lng: -49.2442, label: 'Aparecida de Goiânia' },
    'go-anapolis': { lat: -16.3267, lng: -48.9528, label: 'Anápolis' },
    'go-rioverde': { lat: -17.7950, lng: -50.9192, label: 'Rio Verde' },
    'go-luziania': { lat: -16.2528, lng: -47.9500, label: 'Luziânia' },
  }},
  'AM': { label: 'AM', cities: {
    'am-manaus': { lat: -3.1190, lng: -60.0217, label: 'Manaus' },
    'am-parintins': { lat: -2.6278, lng: -56.7358, label: 'Parintins' },
    'am-itacoatiara': { lat: -3.1428, lng: -58.4439, label: 'Itacoatiara' },
    'am-manacapuru': { lat: -3.3000, lng: -60.6206, label: 'Manacapuru' },
  }},
  'PA': { label: 'PA', cities: {
    'pa-belem': { lat: -1.4550, lng: -48.5024, label: 'Belém' },
    'pa-ananindeua': { lat: -1.3661, lng: -48.3722, label: 'Ananindeua' },
    'pa-santarem': { lat: -2.4431, lng: -54.7083, label: 'Santarém' },
    'pa-maraba': { lat: -5.3686, lng: -49.1175, label: 'Marabá' },
  }},
  'ES': { label: 'ES', cities: {
    'es-vitoria': { lat: -20.3155, lng: -40.3128, label: 'Vitória' },
    'es-vilavelha': { lat: -20.3297, lng: -40.2925, label: 'Vila Velha' },
    'es-serra': { lat: -20.1286, lng: -40.3078, label: 'Serra' },
    'es-cariacica': { lat: -20.2642, lng: -40.4199, label: 'Cariacica' },
    'es-cachoeiro': { lat: -20.8475, lng: -41.1133, label: 'Cachoeiro de Itapemirim' },
  }},
  'MT': { label: 'MT', cities: {
    'mt-cuiaba': { lat: -15.6010, lng: -56.0974, label: 'Cuiabá' },
    'mt-varzeagrande': { lat: -15.6458, lng: -56.1325, label: 'Várzea Grande' },
    'mt-rondonopolis': { lat: -16.4692, lng: -54.6358, label: 'Rondonópolis' },
    'mt-sinop': { lat: -11.8603, lng: -55.5027, label: 'Sinop' },
  }},
  'MS': { label: 'MS', cities: {
    'ms-cg': { lat: -20.4697, lng: -54.6201, label: 'Campo Grande' },
    'ms-dourados': { lat: -22.2211, lng: -54.8056, label: 'Dourados' },
    'ms-treslagoas': { lat: -20.7511, lng: -51.6781, label: 'Três Lagoas' },
    'ms-corumba': { lat: -19.0092, lng: -57.6540, label: 'Corumbá' },
  }},
  'RN': { label: 'RN', cities: {
    'rn-natal': { lat: -5.7793, lng: -35.2009, label: 'Natal' },
    'rn-mossoro': { lat: -5.1875, lng: -37.3444, label: 'Mossoró' },
    'rn-parnamirim': { lat: -5.9158, lng: -35.2628, label: 'Parnamirim' },
    'rn-sgoncalo': { lat: -5.7922, lng: -35.3294, label: 'São Gonçalo do Amarante' },
  }},
  'PB': { label: 'PB', cities: {
    'pb-joaopessoa': { lat: -7.1195, lng: -34.8450, label: 'João Pessoa' },
    'pb-campinagrande': { lat: -7.2300, lng: -35.8811, label: 'Campina Grande' },
    'pb-santarita': { lat: -7.1322, lng: -34.9758, label: 'Santa Rita' },
    'pb-patos': { lat: -7.0236, lng: -37.2797, label: 'Patos' },
  }},
  'AL': { label: 'AL', cities: {
    'al-maceio': { lat: -9.6658, lng: -35.7353, label: 'Maceió' },
    'al-arapiraca': { lat: -9.7525, lng: -36.6611, label: 'Arapiraca' },
    'al-riolargo': { lat: -9.4826, lng: -35.8531, label: 'Rio Largo' },
    'al-palmeiradosindios': { lat: -9.4069, lng: -36.6281, label: 'Palmeira dos Índios' },
  }},
  'SE': { label: 'SE', cities: {
    'se-aracaju': { lat: -10.9472, lng: -37.0731, label: 'Aracaju' },
    'se-nossasenhora': { lat: -10.9333, lng: -37.1000, label: 'Nossa Senhora do Socorro' },
    'se-lagarto': { lat: -10.9133, lng: -37.6689, label: 'Lagarto' },
    'se-itabaiana': { lat: -10.6839, lng: -37.4306, label: 'Itabaiana' },
  }},
  'MA': { label: 'MA', cities: {
    'ma-saoluis': { lat: -2.5307, lng: -44.3068, label: 'São Luís' },
    'ma-imperatriz': { lat: -5.5264, lng: -47.4781, label: 'Imperatriz' },
    'ma-sjribamar': { lat: -2.5608, lng: -44.0603, label: 'São José de Ribamar' },
    'ma-timon': { lat: -5.0942, lng: -42.8375, label: 'Timon' },
    'ma-caxias': { lat: -4.8652, lng: -43.3560, label: 'Caxias' },
  }},
  'PI': { label: 'PI', cities: {
    'pi-teresina': { lat: -5.0892, lng: -42.8016, label: 'Teresina' },
    'pi-parnaiba': { lat: -2.9047, lng: -41.7767, label: 'Parnaíba' },
    'pi-picos': { lat: -7.0764, lng: -41.4667, label: 'Picos' },
    'pi-piripiri': { lat: -4.2733, lng: -41.7769, label: 'Piripiri' },
  }},
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

  // L1 enriched fields (from business_profile_gmb)
  phone?: string | null; website?: string | null; total_photos?: number | null
  description?: string | null; business_status?: string | null; main_image?: string | null
  city?: string | null; categories?: string[] | null; price_level?: number | null
  district?: string | null; postal_code?: string | null; country_code?: string | null; types?: string[] | null
}

type SortField = 'score' | 'title' | 'category' | 'rating_value' | 'rating_votes'

const DiscoveryPage = () => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { lang: _lang } = useParams() as { lang: string }

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
          limit: 50, force, enrich: force ? 5 : 0,
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

  const isEnriched = (l: Listing) => !!(l.phone || l.website || l.total_photos != null || l.description)

  const detectWApp = (ph: string | null | undefined) => ph ? /(?:9\d{4}-\d{4}|9\d{8}|\(?\d{2}\)?\s*9\d{4}-?\d{4})/.test(ph) : null

  const photosRef = (cat: string | null) => {
    const bm: Record<string, { min: number; good: number }> = {
      dentist: { min: 15, good: 30 }, medical_aesthetic_clinic: { min: 20, good: 40 },
      medical_clinic: { min: 15, good: 30 }, restaurant: { min: 25, good: 50 },
      gym: { min: 20, good: 40 }, lawyer: { min: 5, good: 15 },
      barber_shop: { min: 15, good: 30 }, pharmacy: { min: 10, good: 20 },
      veterinarian: { min: 15, good: 30 }, real_estate_agency: { min: 20, good: 50 },
      accountant: { min: 5, good: 10 }, car_repair: { min: 10, good: 20 },
    }

    return bm[(cat || '').toLowerCase().replace(/\s+/g, '_')] || { min: 10, good: 20 }
  }

  const siteKind = (url: string | null | undefined) => {
    if (!url) return null
    const u = url.toLowerCase()

    if (u.includes('wixsite.com') || u.includes('wix.com')) return 'Wix'
    if (u.includes('linktr.ee') || u.includes('linktree')) return 'Linktree'
    if (u.includes('facebook.com') || u.includes('instagram.com')) return 'Rede Social'
    if (u.includes('sites.google.com')) return 'Google Sites'

    return 'Domínio Próprio'
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
                    <Tooltip key={s.level} title={`${s.description}\n\n🚫 Regra: ${s.action}`} arrow>
                      <Chip label={s.label} clickable size='small'
                        color={active ? 'primary' : 'default'}
                        variant={active ? 'filled' : 'outlined'}
                        onClick={() => setSchwartzFilter(prev =>
                          prev.includes(s.level) ? prev.filter(x => x !== s.level) : [...prev, s.level]
                        )}
                        sx={active ? {} : { opacity: 0.7 }}
                      />
                    </Tooltip>
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

      {/* ═══ SCHWARTZ EXPLAINER ═══ */}
      {results.length > 0 && (
        <Grid size={{ xs: 12 }}>
          <Card sx={{ bgcolor: 'var(--pastel-sky)' }}>
            <CardContent>
              <Typography variant='subtitle2' fontWeight={600} gutterBottom>
                🧠 O que cada nível significa?
              </Typography>
              <Grid container spacing={2}>
                {SCHWARTZ_CHIPS.map((s) => (
                  <Grid key={s.level} size={{ xs: 12, sm: 6, md: 2.4 }}>
                    <Box sx={{ borderLeft: 3, borderColor: s.color, pl: 1.5 }}>
                      <Typography variant='caption' fontWeight={700} sx={{ color: s.color }}>
                        {s.label} ({s.level === 1 ? '0-29' : s.level === 2 ? '30-49' : s.level === 3 ? '50-69' : s.level === 4 ? '70-84' : '85-100'})
                      </Typography>
                      <Typography variant='caption' color='text.secondary' sx={{ display: 'block' }}>
                        {s.description}
                      </Typography>
                      <Typography variant='caption' color='error.main' fontWeight={600} sx={{ display: 'block', mt: 0.5 }}>
                        🎯 Ação: {s.action}
                      </Typography>
                      <Typography variant='caption' sx={{ fontStyle: 'italic', display: 'block', mt: 0.3 }}>
                        💬 {s.example}
                      </Typography>
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      )}

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
              💰 Custo estimado: <strong>${(estimatedCost + 0.027).toFixed(4)}</strong> (R${((estimatedCost + 0.027) * 5.5).toFixed(2)})
            </Typography>
            <Typography variant='caption' color='text.secondary'>
              L0 Search: ${estimatedCost.toFixed(4)} + L1 Enrichment (5 leads × $0.0054): $0.027
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
            <Typography variant='caption' color='text.secondary'>Computando Score + Enriquecendo top 5 leads (L1) · Custo: ${estimatedCost.toFixed(4)}</Typography>
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
      <Dialog open={!!selectedLead} onClose={() => { setSelectedLead(null); setSelectedScore(null); setCompetitorData(null); }} maxWidth='lg' fullWidth>
        {selectedLead && (
          <>
            <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box>
                <Typography variant='h6'>{selectedLead.title || 'Sem nome'}</Typography>
                <Box sx={{ display: 'flex', gap: 1, mt: 0.5, flexWrap: 'wrap' }}>
                  {selectedScore && (
                    <Chip label={`${selectedScore.schwartz.label} · Score ${selectedScore.compound}/100`}
                      size='small' sx={{ bgcolor: scoreColor(selectedScore.schwartz.level), color: '#fff', fontWeight: 700 }} />
                  )}
                  {isEnriched(selectedLead) ? (
                    <Chip label='🔬 L1 Enriquecido (27 campos)' size='small' color='success' variant='tonal' />
                  ) : (
                    <Chip label='📡 L0 Básico (11 campos)' size='small' color='default' variant='tonal' />
                  )}
                </Box>
              </Box>
              <IconButton onClick={() => { setSelectedLead(null); setSelectedScore(null); setCompetitorData(null); }} size='small'><i className='ri-close-line' /></IconButton>
            </DialogTitle>
            <DialogContent dividers>
              {/* ═══ IDENTITY + LOCATION ═══ */}
              <Typography variant='overline' fontWeight={700} color='primary.main'>🏢 Perfil GMB</Typography>
              <Grid container spacing={1.5} sx={{ mb: 2 }}>
                {[
                  ['Nome', selectedLead.title], ['Categoria', selectedLead.category],
                  ['Categorias', selectedLead.categories?.join(', ') || null],
                  ['Status', selectedLead.business_status], ['Tipos', selectedLead.types?.join(', ') || null],
                  ['Endereço', selectedLead.address], ['Cidade', selectedLead.city],
                  ['Bairro', selectedLead.district], ['CEP', selectedLead.postal_code],
                  ['Coordenadas', selectedLead.latitude ? `${selectedLead.latitude.toFixed(4)}, ${selectedLead.longitude?.toFixed(4)}` : null],
                ].filter(([, v]) => v).map(([label, value]) => (
                  <Grid key={label} size={{ xs: 12, sm: 6 }}>
                    <Typography variant='caption' color='text.secondary'>{label}</Typography>
                    <Typography variant='body2' fontWeight={600} sx={{ wordBreak: 'break-all' }}>{value}</Typography>
                  </Grid>
                ))}
              </Grid>

              {/* ═══ L1 ENRICHED CONTACT + WEBSITE ═══ */}
              {isEnriched(selectedLead) && (
                <>
                  <Typography variant='overline' fontWeight={700} color='success.main'>📞 Contato & Website (L1 Enriquecido)</Typography>
                  <Grid container spacing={1.5} sx={{ mb: 2 }}>
                    {[
                      ['📱 Telefone', selectedLead.phone],
                      ['💬 WhatsApp', detectWApp(selectedLead.phone) === true ? '✅ WhatsApp detectado' : detectWApp(selectedLead.phone) === false ? '❌ Não é WhatsApp' : null],
                      ['🌐 Website', selectedLead.website],
                      ['🏗️ Tipo de Site', siteKind(selectedLead.website)],
                    ].filter(([, v]) => v).map(([label, value]) => (
                      <Grid key={label} size={{ xs: 12, sm: 6 }}>
                        <Typography variant='caption' color='text.secondary'>{label}</Typography>
                        <Box sx={{ mt: 0.3 }}>
                          {typeof value === 'string' && value.startsWith('✅') ? <Chip label={value} size='small' color='success' variant='tonal' /> :
                           typeof value === 'string' && value.startsWith('❌') ? <Chip label={value} size='small' color='error' variant='tonal' /> :
                           <Typography variant='body2' fontWeight={600} sx={{ wordBreak: 'break-all' }}>{value}</Typography>}
                        </Box>
                      </Grid>
                    ))}
                  </Grid>
                </>
              )}

              {/* ═══ REPUTATION + PHOTOS ═══ */}
              <Typography variant='overline' fontWeight={700} color='warning.main'>⭐ Reputação & Engajamento</Typography>
              <Grid container spacing={1.5} sx={{ mb: 2 }}>
                {[
                  ['Rating', selectedLead.rating_value ? `${selectedLead.rating_value}★` : null],
                  ['Reviews', String(selectedLead.rating_votes || 0)],
                  ['Reivindicado', selectedLead.is_claimed ? '✅ Sim' : '⚠️ Não — maior sinal de urgência!'],
                  ['Place ID', selectedLead.place_id], ['CID', selectedLead.cid],
                  ['Nível Preço', selectedLead.price_level != null ? '💰'.repeat(Math.max(1, selectedLead.price_level)) + ` (${selectedLead.price_level}/4)` : null],
                  ['Descrição', selectedLead.description ? (selectedLead.description.length > 120 ? selectedLead.description.substring(0, 120) + '...' : selectedLead.description) : null],
                ].filter(([, v]) => v).map(([label, value]) => (
                  <Grid key={label} size={{ xs: 12, sm: 6 }}>
                    <Typography variant='caption' color='text.secondary'>{label}</Typography>
                    <Typography variant='body2' fontWeight={600} sx={{ wordBreak: 'break-all' }}>{value}</Typography>
                  </Grid>
                ))}
                {selectedLead.total_photos != null && (
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Typography variant='caption' color='text.secondary'>📸 Fotos no GMB</Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.3 }}>
                      <Typography variant='body2' fontWeight={700}>{selectedLead.total_photos}</Typography>
                      <Chip label={selectedLead.total_photos >= photosRef(selectedLead.category).good ? `${selectedLead.total_photos} — acima do ideal` : selectedLead.total_photos >= photosRef(selectedLead.category).min ? `${selectedLead.total_photos}/${photosRef(selectedLead.category).min} — dentro do mínimo` : `${selectedLead.total_photos}/${photosRef(selectedLead.category).min} — abaixo do mínimo`} size='small'
                        color={selectedLead.total_photos >= photosRef(selectedLead.category).good ? 'success' : selectedLead.total_photos >= photosRef(selectedLead.category).min ? 'warning' : 'error'} variant='tonal' />
                    </Box>
                  </Grid>
                )}
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
              <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Button variant='outlined' size='small' onClick={() => {
                  if (selectedLead.place_id) window.open(`https://www.google.com/maps/place/?q=place_id:${selectedLead.place_id}`, '_blank')
                }} startIcon={<i className='ri-map-pin-line' />}>Google Maps</Button>
                {selectedLead.website && (
                  <Button variant='outlined' size='small' color='info' onClick={() => { window.open(selectedLead.website!, '_blank') }} startIcon={<i className='ri-global-line' />}>Visitar Site</Button>
                )}
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
