'use client'

// adsentice · Admin / Discovery v0.4 — Mapa Brasil + Auto-Pilot + Tracker + L0→L4
// ADR-0022 + ADR-0023 · Pain Criteria v1.2 · medido=verdade
import { useState, useMemo, useCallback, useEffect } from 'react'

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

import DiscoveryAutoPilot from '@/components/DiscoveryAutoPilot'
import BrazilDiscoveryMap from '@/components/BrazilDiscoveryMap'

import { BR_CAPITALS, suggestRadius } from '@/lib/geo-data'

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

const CATS = [
  // ═══ Saúde (nicho primário adsentice) ═══
  { id: 'dentist', label: '🦷 Dentistas', market: '~400K', tier: 1 },
  { id: 'orthodontist', label: '🦷 Ortodontistas', market: '~25K', tier: 1 },
  { id: 'medical_aesthetic_clinic', label: '💉 Clínicas Estéticas', market: '~80K', tier: 1 },
  { id: 'medical_clinic', label: '🏥 Clínicas Médicas', market: '~200K', tier: 1 },
  { id: 'veterinarian', label: '🐾 Veterinários', market: '~60K', tier: 1 },
  { id: 'psychologist', label: '🧠 Psicólogos', market: '~350K', tier: 1 },
  { id: 'physical_therapist', label: '🦴 Fisioterapeutas', market: '~150K', tier: 1 },
  { id: 'ophthalmologist', label: '👁️ Oftalmologistas', market: '~30K', tier: 1 },
  { id: 'cardiologist', label: '🫀 Cardiologistas', market: '~25K', tier: 1 },

  // ═══ Beleza & Bem-Estar ═══
  { id: 'beauty_salon', label: '💇 Salões de Beleza', market: '~600K', tier: 1 },
  { id: 'barber_shop', label: '💈 Barbearias', market: '~400K', tier: 1 },
  { id: 'gym', label: '🏋️ Academias', market: '~35K', tier: 2 },

  // ═══ Serviços Profissionais ═══
  { id: 'lawyer', label: '⚖️ Advogados', market: '~300K', tier: 1 },
  { id: 'accountant', label: '📊 Contadores', market: '~300K', tier: 1 },
  { id: 'architect', label: '🏗️ Arquitetos', market: '~180K', tier: 2 },
  { id: 'interior_designer', label: '🎨 Designers de Interiores', market: '~120K', tier: 2 },
  { id: 'real_estate_agency', label: '🏠 Imobiliárias', market: '~70K', tier: 2 },

  // ═══ Alimentação ═══
  { id: 'restaurant', label: '🍽️ Restaurantes', market: '~1M', tier: 2 },
  { id: 'pizza_restaurant', label: '🍕 Pizzarias', market: '~60K', tier: 2 },
  { id: 'bakery', label: '🥖 Padarias', market: '~70K', tier: 3 },

  // ═══ Comércio & Serviços Locais ═══
  { id: 'pet_store', label: '🐶 Pet Shops', market: '~200K', tier: 1 },
  { id: 'car_repair', label: '🔧 Oficinas Mecânicas', market: '~150K', tier: 2 },
  { id: 'pharmacy', label: '💊 Farmácias', market: '~90K', tier: 3 },
  { id: 'electrician', label: '🔌 Eletricistas', market: '~200K', tier: 2 },
  { id: 'plumber', label: '🔧 Encanadores', market: '~250K', tier: 2 },
  { id: 'cleaning_service', label: '🧹 Serviços de Limpeza', market: '~300K', tier: 2 },

  // ═══ Educação & Hospitalidade ═══
  { id: 'school', label: '📚 Escolas Particulares', market: '~40K', tier: 3 },
  { id: 'driving_school', label: '🚗 Autoescolas', market: '~15K', tier: 3 },
  { id: 'hotel', label: '🏨 Pousadas/Hotéis', market: '~30K', tier: 3 },
]

// ── Category Market Reference (estimativas de mercado — IBGE/CEMPRE 2024) ──
const CAT_INFO: Record<string, { market: string; tier: number; segment: string; why: string }> = {
  dentist: { market: '~400K', tier: 1, segment: 'Saúde', why: 'Alta rotatividade de pacientes. Ticket R\$150-500. Convênio + particular.' },
  orthodontist: { market: '~25K', tier: 1, segment: 'Saúde', why: 'Nicho premium. Ticket R\$3K-15K. Aparelho/Invisalign.' },
  medical_aesthetic_clinic: { market: '~80K', tier: 1, segment: 'Saúde', why: 'Harmonização facial, botox. Crescimento 40\%/ano. Ticket R\$500-3K.' },
  medical_clinic: { market: '~200K', tier: 1, segment: 'Saúde', why: 'Clínico geral. Convênio + particular. Ticket R\$100-300.' },
  veterinarian: { market: '~60K', tier: 1, segment: 'Saúde', why: '2º mercado pet mundial. Urgência = busca imediata. Ticket R\$100-500.' },
  psychologist: { market: '~350K', tier: 1, segment: 'Saúde', why: 'Crescimento pós-pandemia. Online + presencial. R\$100-300/sessão.' },
  physical_therapist: { market: '~150K', tier: 1, segment: 'Saúde', why: 'Pilates, RPG, reabilitação. Convênio + particular. Ticket R\$80-200.' },
  ophthalmologist: { market: '~30K', tier: 1, segment: 'Saúde', why: 'Cirurgia refrativa. Ticket alto (R\$2K-10K). Google = pacientes.' },
  cardiologist: { market: '~25K', tier: 1, segment: 'Saúde', why: 'Check-up, exames. Público 40+. R\$300-800. Google = agendamento.' },
  beauty_salon: { market: '~600K', tier: 1, segment: 'Beleza', why: 'MAIOR categoria SMB BR. Manicure, cabeleireiro. Instagram + GMB vitais.' },
  barber_shop: { market: '~400K', tier: 1, segment: 'Beleza', why: 'Público masculino. WhatsApp + GMB. Ticket R\$40-80.' },
  gym: { market: '~35K', tier: 2, segment: 'Beleza', why: 'Mensalidade recorrente. GMB + Instagram. R\$80-200/mês.' },
  lawyer: { market: '~300K', tier: 1, segment: 'Serviços', why: '1M+ advogados no BR. Competem por Google. Ticket R\$1K-10K.' },
  accountant: { market: '~300K', tier: 1, segment: 'Serviços', why: 'MEI, LTDA. Todo negócio precisa. Ticket R\$200-800/mês.' },
  architect: { market: '~180K', tier: 2, segment: 'Serviços', why: 'Portfólio visual. Instagram + site. Ticket R\$3K-30K.' },
  interior_designer: { market: '~120K', tier: 2, segment: 'Serviços', why: 'Portfólio visual. Instagram #1. Ticket R\$1K-15K.' },
  real_estate_agency: { market: '~70K', tier: 2, segment: 'Serviços', why: 'Comissão alta. GMB + portal + Ads. R\$5K-50K comissão.' },
  restaurant: { market: '~1M', tier: 2, segment: 'Alimentação', why: 'Maior categoria. Cardápio, fotos, reviews. R\$30-100.' },
  pizza_restaurant: { market: '~60K', tier: 2, segment: 'Alimentação', why: 'Delivery + presencial. GMB + iFood + Instagram. R\$40-80.' },
  bakery: { market: '~70K', tier: 3, segment: 'Alimentação', why: 'Negócio de bairro. Alta frequência. Ticket R\$5-30.' },
  pet_store: { market: '~200K', tier: 1, segment: 'Comércio', why: 'SMB puro. Banho/tosa. GMB essencial. R\$50-200.' },
  car_repair: { market: '~150K', tier: 2, segment: 'Comércio', why: 'Urgência = Google. GMB com fotos, avaliações. R\$100-2K.' },
  pharmacy: { market: '~90K', tier: 3, segment: 'Comércio', why: 'Redes dominam. SMB compete por conveniência local.' },
  electrician: { market: '~200K', tier: 2, segment: 'Comércio', why: 'Profissional liberal. Só GMB. Urgência = 1º do Google ganha.' },
  plumber: { market: '~250K', tier: 2, segment: 'Comércio', why: 'Urgência máxima. Google = ganha o serviço. R\$100-500.' },
  cleaning_service: { market: '~300K', tier: 2, segment: 'Comércio', why: 'Terceirização. Google = principal canal. R\$200-800/mês.' },
  school: { market: '~40K', tier: 3, segment: 'Educação', why: 'Ticket alto (R\$500-3K/mês). Matrícula = pico de busca.' },
  driving_school: { market: '~15K', tier: 3, segment: 'Educação', why: '1ª CNH = Google. Ticket R\$1.5K-2.5K.' },
  hotel: { market: '~30K', tier: 3, segment: 'Hospitalidade', why: 'Booking/Decolar. Fotos + reviews = reserva. R\$150-500/diária.' },
};

interface Listing {
  title: string | null; category: string | null; address: string | null
  rating_value: number | null; rating_votes: number | null; place_id: string | null
  cid: string | null; latitude: number | null; longitude: number | null; is_claimed: boolean | null

  // L1 enriched fields (from business_profile_gmb)
  phone?: string | null; website?: string | null; total_photos?: number | null
  description?: string | null; business_status?: string | null; main_image?: string | null
  city?: string | null; categories?: string[] | null; price_level?: number | null
  district?: string | null; postal_code?: string | null; country_code?: string | null; types?: string[] | null

  // L2 enriched fields (from on_page_instant_audit + domain_technologies — v0.3)
  l2_onpage_score?: number | null; l2_meta_title?: string | null
  l2_meta_description?: string | null; l2_word_count?: number | null
  l2_internal_links_count?: number | null; l2_external_links_count?: number | null
  l2_images_count?: number | null; l2_cms?: string | null
  l2_has_analytics?: boolean | null; l2_domain_rank?: number | null
  l2_country_iso_code?: string | null; l2_enriched_at?: string | null
  enrichment_level?: number | null

  // Content Gap (v0.5)
  l2_content_maturity?: number | null; l2_content_gaps?: Record<string, unknown> | null
}

type SortField = 'score' | 'title' | 'category' | 'rating_value' | 'rating_votes'

const DiscoveryPage = () => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { lang: _lang } = useParams() as { lang: string }

  // ── Geo (dinâmico: 27 capitais BR + raio adaptável por população + busca livre) ──
  const [stateKey, setStateKey] = useState('SP')
  const [cityLat, setCityLat] = useState(-23.5505)
  const [cityLng, setCityLng] = useState(-46.6333)
  const [cityLabel, setCityLabel] = useState('São Paulo (SP)')
  const [radius, setRadius] = useState(25)
  const [_geoQuery, setGeoQuery] = useState('')      // input de busca livre
  const [_geoSuggestions, setGeoSuggestions] = useState<{ lat: number; lng: number; displayName: string }[]>([])
  const [_geoSearching, setGeoSearching] = useState(false)
  const [selected, setSelected] = useState<string[]>([])

  // ── RM Municipalities (ADR-0025) ──
  const [rmMunicipios, setRmMunicipios] = useState<{ nome: string; cidade: string; lat?: number | null; lng?: number | null }[]>([])
  const [rmLoading, setRmLoading] = useState(false)
  const [selectedMunicipio, setSelectedMunicipio] = useState<string | null>(null)
  const [rmCoverage, setRmCoverage] = useState<{ mapped: number; total: number } | null>(null)

  // ── Auto-Pilot (ADR-0023 Layer 2) ──
  const [autoMode, setAutoMode] = useState(false)
  const [autoModeType, setAutoModeType] = useState<'coverage' | 'intelligence'>('coverage')

  const [autoQueue, setAutoQueue] = useState<{
    targets: { city: string; district: string; category: string; categoryLabel: string; score: number; breakdown: { painScore: number; ticketScore: number; densityScore: number; fixabilityScore: number; coverageScore: number }; estimatedLeads: number; suggestedRadius: number; avgTicket: number; action: string; strategy: string }[]
    meta: { totalGaps: number; priorityTargets: number; estimatedCost: number; estimatedMRR: number }
  } | null>(null)

  const [autoLoading, setAutoLoading] = useState(false)
  const [stateRanking, setStateRanking] = useState<any>(null)  // State Scorer ranking
  const [autoSuggestion, setAutoSuggestion] = useState<{ state: string; city: string; reason: string; action: string } | null>(null)

  // ── Map Pins (ADR-0022 Layer 1) ──
  const [mapPins, setMapPins] = useState<any[]>([])
  const [pinsLoaded, setPinsLoaded] = useState(false)
  const [pinsVersion, setPinsVersion] = useState(0)

  useEffect(() => {
    fetch('/api/coverage/pins')
      .then(r => r.json())
      .then(d => { setMapPins(d.pins || []); setPinsLoaded(true) })
      .catch(() => {})
  }, [pinsVersion])

  // Fetch auto-pilot queue when category or city changes
  const activeCategory = selected.length === 1 ? selected[0] : null

  useEffect(() => {
    if (!autoMode || !activeCategory) return
    const cityName = cityLabel.split('(')[0].trim()
    const isCapital = BR_CAPITALS.some(c => c.label === cityName)

    setAutoLoading(true)

    // State ranking quando não tem capital clara OU quando queremos visão Brasil
    const url = isCapital
      ? `/api/coverage/queue?category=${encodeURIComponent(activeCategory)}&city=${encodeURIComponent(cityName)}`
      : `/api/coverage/queue?category=${encodeURIComponent(activeCategory)}`

    fetch(url)
      .then(r => r.json())
      .then(d => {
        if (d.mode === "state-ranking") {
          setStateRanking(d.ranking)
          setAutoSuggestion(d.suggestion)
          if (d.queue?.targets) setAutoQueue(d.queue)

          // Auto-select best state on map
          const best = d.ranking?.topPick

          if (best && best.capitalLat) {
            setCityLat(best.capitalLat)
            setCityLng(best.capitalLng)
            setCityLabel(`${best.capital} (${best.uf})`)
            setStateKey(best.uf)
            setRadius(best.suggestedRadius || 10)
          }
        } else if (d.queue?.targets) {
          setAutoQueue(d.queue)
          setStateRanking(null)
          setAutoSuggestion(null)
        }
      })
      .catch(() => {})
      .finally(() => setAutoLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoMode, activeCategory, cityLabel])

  // ── Sort (apenas visualização) ──
  const [sortBy, setSortBy] = useState<SortField>('score')
  const [regionalTotal, setRegionalTotal] = useState(0)
  const [extractedTotal, setExtractedTotal] = useState(0)

  // ── Results ──
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<Listing[]>([])
  const [scores, setScores] = useState<ScoreData[]>([])
  const [distribution, setDistribution] = useState<ScoreDistribution | null>(null)
  const [totalCount, setTotalCount] = useState(0)
  const [costUsd, setCostUsd] = useState(0)
  const [error, setError] = useState('')
  const [fromCache, setFromCache] = useState(false)
  const [searchMeta, setSearchMeta] = useState<{tracker_id:string;total_in_region:number;fetched_count:number;remaining:number;offsets_used:number[]}|null>(null)
  const [costToday, setCostToday] = useState(0)
  const [costTotal, setCostTotal] = useState(0)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [selectedLead, setSelectedLead] = useState<Listing | null>(null)
  const [selectedScore, setSelectedScore] = useState<ScoreData | null>(null)
  const [competitorData, setCompetitorData] = useState<CompetitiveData | null>(null)
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(20)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [forceRefresh, setForceRefresh] = useState(false)

  // ── Pipeline Config (ADR-0026) ──
  const [selectedLayers, setSelectedLayers] = useState<{ l0: true; l1: boolean; l4: true }>({
    l0: true, l1: true, l4: true,
  })
  const [batchMode, setBatchMode] = useState<'single' | 'rm' | 'state'>('single')
  const [selectedMunicipios, setSelectedMunicipios] = useState<string[]>([]) // RM multi-select
  const [pipelinePhase, setPipelinePhase] = useState<'idle' | 'l0' | 'l1' | 'l4' | 'persist' | 'done'>('idle')

  // ── Dynamic costs (baseados em dados REAIS) ──
  // Modo Estado: todos os municipios da RM. Modo RM: só os selecionados.
  // Modo Single: só o municipio clicado.
  const stateMuniCount = rmMunicipios.length || 0
  const rmSelectedCount = selectedMunicipios.length || 0

  const realMunicipioCount = batchMode === 'single' ? 1
    : batchMode === 'rm' ? (rmSelectedCount || rmMunicipios.length)  // selected ou todos da RM
    : batchMode === 'state' ? stateMuniCount
    : 1

  const batchEffective = realMunicipioCount || 1

  const l0Cost = selected.length * 0.015 * batchEffective
  const l1Cost = (selectedLayers.l1 ? 50 : 0) * 0.0054 * batchEffective
  const totalCost = l0Cost + l1Cost  // L0 sempre + L1 condicional + L4 ($0) + (selectedLayers.l4 ? l4Cost : 0)

  // ═══ Search ═══
  const doSearch = useCallback(async (force = forceRefresh, offsetOverride?: number) => {
    if (!selected.length) return
    setLoading(true); setError('')
    setPipelinePhase('l0')

    try {
      const isContinue = offsetOverride !== undefined  // botão Continuar → só L0

      const res = await fetch('/api/discovery-search', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categories: selected, lat: cityLat, lng: cityLng, radiusKm: radius,
          limit: 100, force: force,
          // Continuar: só L0 (L1 já foi executado na 1ª chamada)
          enrich: isContinue ? 0 : (selectedLayers.l1 ? 50 : 0),
          paginate: false,
          ...(isContinue ? { offset: offsetOverride } : {}),
        }),
      })

      setPipelinePhase('l1')
      const data = await res.json()

      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)

      if (!Array.isArray(data.listings)) {
        console.error('[discovery] data.listings is not an array', data)
        throw new Error(`API returned invalid listings: ${typeof data.listings}`)
      }

      console.log(`[discovery] Received ${data.listings.length} listings, ${data.scores?.length || 0} scores, distribution: ${data.distribution?.avgScore ?? 'null'}/100`)
      setResults(data.listings)
      setScores(data.scores || [])
      setDistribution(data.distribution || null)
      setTotalCount(data.total_count || 0)
      setPinsVersion(v => v + 1) // recarrega pins do mapa
      setCostUsd(data.cost_usd || 0)
      setFromCache(data.fromCache || false)
      setCostToday(data.costToday || 0)
      setCostTotal(data.costTotal || 0)
      setRegionalTotal(data.total_count || 0)
      setExtractedTotal((prev: number) => offsetOverride ? prev + data.listings.length : (data.fetchedCount || data.listings?.length || 0))


      // Search Tracker metadata (paginação)
      if (data.search_metadata) {
        setSearchMeta(data.search_metadata)

        if (data.search_metadata.remaining > 0) {
          setRegionalTotal(data.search_metadata.total_in_region)
        }
      }

      setPage(0)
      setSortBy('score')
      setSortDir('desc')
    } catch (e: any) { setError(e.message) }
    finally { setLoading(false); setPipelinePhase('done');
setTimeout(() => setPipelinePhase('idle'), 2000) }
  }, [selected, cityLat, cityLng, radius, forceRefresh, selectedLayers])

  const toggle = (catId: string) => {
    setSelected(prev => prev.includes(catId) ? prev.filter(c => c !== catId) : [...prev, catId])
  }

  // ── Load RM municipalities (ADR-0025) ──
  const loadMunicipios = async (cityName: string) => {
    setRmLoading(true)
    setSelectedMunicipio(null)
    setRmCoverage(null)

    try {
      const res = await fetch(`/api/geo/municipios?city=${encodeURIComponent(cityName)}`)
      const data = await res.json()

      if (data.municipios?.length) {
        setRmMunicipios(data.municipios)
      } else {
        setRmMunicipios([])
      }
    } catch { setRmMunicipios([]) }
    finally { setRmLoading(false) }
  }

  // ── Select municipality → use IBGE coordinates (ADR-0025) ──
  const selectMunicipio = (municipio: string, uf: string, lat?: number | null, lng?: number | null) => {
    setSelectedMunicipio(municipio)

    if (lat && lng) {
      setCityLat(lat)
      setCityLng(lng)
      setCityLabel(`${municipio} (${uf})`)
      setRadius(5)
    }
    // Fallback: Nominatim geocoding
    else {
      setRmLoading(true)

      fetch(`/api/geo/search?q=${encodeURIComponent(municipio)},${encodeURIComponent(uf)},Brasil`)
        .then(r => r.json())
        .then(r => {
          if (r.lat && r.lng) {
            setCityLat(r.lat)
            setCityLng(r.lng)
            setCityLabel(`${municipio} (${uf})`)
            setRadius(5)
          }
        })
        .catch(() => {})
        .finally(() => setRmLoading(false))
    }
  }

  const changeCapital = (c: typeof BR_CAPITALS[0]) => {
    setStateKey(c.uf)
    setCityLat(c.lat)
    setCityLng(c.lng)
    setCityLabel(`${c.label} (${c.uf})`)
    const r = suggestRadius(c.areaKm2, c.densidade)

    setRadius(r.radiusKm)

    // Load RM municipalities
    loadMunicipios(c.label)
  }

  const changeRadius = (r: number) => { setRadius(r) }

  // ═══ Geo search (busca livre: bairro, cidade, zona) ═══
  const handleGeoSearch = async (query: string) => {
    setGeoQuery(query)

    if (query.length < 3) { setGeoSuggestions([]); 

return }

    setGeoSearching(true)

    try {
      const q = query.includes('São Paulo') || query.includes('SP') ? query
        : query.includes('Rio') || query.includes('RJ') ? query
        : `${query}, Brasil`

      const res = await fetch(`/api/geo/search?q=${encodeURIComponent(q)}`)

      if (!res.ok) { setGeoSuggestions([]); 

return }

      const data = await res.json()

      setGeoSuggestions(data.lat ? [data] : [])
    } catch { setGeoSuggestions([]) }
    finally { setGeoSearching(false) }
  }

  const _selectGeoResult = (r: { lat: number; lng: number; displayName: string }) => {
    setCityLat(r.lat)
    setCityLng(r.lng)
    setCityLabel(r.displayName)
    setStateKey('')          // custom — não é capital
    setGeoQuery(r.displayName)
    setGeoSuggestions([])
  }

  // ═══ Score-based sorting + filtering ═══
  const enriched = useMemo(() => {
    return results.map((l, i) => ({ ...l, score: scores[i] }))
  }, [results, scores])

  // (filtering removed — Auto-Pilot handles strategy)

  const sorted = useMemo(() => {
    const arr = [...enriched]

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
  }, [enriched, sortBy, sortDir])

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
  const isL2Enriched = (l: Listing) => !!(l.l2_onpage_score != null)

  const contentMaturityColor = (level: number | null | undefined) => {
    const colors = ["#9e9e9e", "#42a5f5", "#ffa726", "#ef5350", "#4caf50"]

    
return colors[level ?? 0] || colors[0]
  }

  const detectWApp = (ph: string | null | undefined) => ph ? /(?:9\d{4}-\d{4}|9\d{8}|\(?\d{2}\)?\s*9\d{4}-?\d{4})/.test(ph) : null

  const photosRef = (cat: string | null) => {
    const bm: Record<string, { min: number; good: number }> = {
      dentist: { min: 15, good: 30 }, orthodontist: { min: 15, good: 30 },
      medical_aesthetic_clinic: { min: 20, good: 40 }, medical_clinic: { min: 15, good: 30 },
      restaurant: { min: 25, good: 50 }, pizza_restaurant: { min: 25, good: 50 },
      bakery: { min: 15, good: 30 }, gym: { min: 20, good: 40 },
      lawyer: { min: 5, good: 15 }, barber_shop: { min: 15, good: 30 },
      beauty_salon: { min: 15, good: 30 }, pharmacy: { min: 10, good: 20 },
      veterinarian: { min: 15, good: 30 }, pet_store: { min: 10, good: 20 },
      real_estate_agency: { min: 20, good: 50 }, accountant: { min: 5, good: 10 },
      car_repair: { min: 10, good: 20 },
      psychologist: { min: 5, good: 15 }, physical_therapist: { min: 10, good: 20 },
      ophthalmologist: { min: 10, good: 20 }, cardiologist: { min: 10, good: 20 },
      architect: { min: 15, good: 30 }, interior_designer: { min: 15, good: 30 },
      electrician: { min: 5, good: 12 }, plumber: { min: 5, good: 12 },
      cleaning_service: { min: 5, good: 12 },
      school: { min: 10, good: 20 }, driving_school: { min: 5, good: 12 },
      hotel: { min: 20, good: 40 },
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
            Dados REAIS via provider-core · Pipeline L0+L1+L4 · Score Composto · ADR-0024
          </Typography>
          {costTotal > 0 && (
            <Chip label={`💰 Hoje: $${costToday.toFixed(4)} · Total: $${costTotal.toFixed(4)}`}
              size='small' color='warning' variant='tonal' />
          )}
          {fromCache && <Chip label='📦 Cache' size='small' color='info' variant='tonal' />}
        </Box>
      </Grid>

      {/* ═══ MAPA DO BRASIL (ADR-0022) ═══ */}
      <Grid size={{ xs: 12 }}>
        <Card>
          <CardContent sx={{ p: '0 !important' }}>
            {/* ── Top bar: localização + controles ── */}
            <Box sx={{ px: 3, pt: 2, pb: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
              <Box>
                <Typography variant='h6' fontWeight={700}>🗺️ Discovery Map</Typography>
                <Typography variant='caption' color='text.secondary'>
                  {pinsLoaded && mapPins.length > 0
                    ? `${mapPins.length} buscas · ${new Set(mapPins.map((p: any) => p.city)).size} cidades · clique no mapa para selecionar`
                    : 'Clique no mapa para selecionar a região de busca'}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                <Chip label={`📍 ${cityLabel}`} size='small' color='primary' variant='tonal' />
                <Chip label={`${radius}km`} size='small' color='warning' variant='tonal' />
              </Box>
            </Box>
            {/* ── Mapa ── */}
            <BrazilDiscoveryMap
              pins={mapPins}
              selectedLat={cityLat}
              selectedLng={cityLng}
              selectedRadius={radius}
              onLocationSelect={(lat, lng, label) => {
                setCityLat(lat); setCityLng(lng); setCityLabel(label); setStateKey('')

                // Sugere raio automático baseado na capital mais próxima
                let closest = BR_CAPITALS[0]; let minDist = Infinity

                for (const c of BR_CAPITALS) {
                  const d = Math.abs(c.lat - lat) + Math.abs(c.lng - lng)

                  if (d < minDist) { minDist = d; closest = c }
                }

                if (minDist < 0.5) { setStateKey(closest.uf); setRadius(suggestRadius(closest.areaKm2, closest.densidade).radiusKm) }
              }}
              loading={loading}
            />

            {/* ── Abaixo do mapa: controles de raio + capitais quick-select ── */}
            <Box sx={{ px: 3, pb: 2, pt: 1 }}>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                <Typography variant='caption' color='text.secondary' sx={{ mr: 1 }}>Raio:</Typography>
                {[5, 10, 15, 20, 25, 30].map(r => (
                  <Chip key={r} label={`${r}km`} clickable size='small'
                    color={radius === r ? 'primary' : 'default'}
                    variant={radius === r ? 'filled' : 'outlined'} onClick={() => changeRadius(r)} />
                ))}
                <Box sx={{ flex: 1 }} />
                <Typography variant='caption' color='text.secondary'>Capitais:</Typography>
                {BR_CAPITALS.map(c => (
                  <Chip key={c.uf} label={c.uf} clickable size='small'
                    color={stateKey === c.uf ? 'primary' : 'default'}
                    variant={stateKey === c.uf ? 'filled' : 'outlined'}
                    onClick={() => { changeCapital(c); setGeoQuery(''); setGeoSuggestions([]) }}
                    sx={{ fontFamily: 'monospace', fontWeight: stateKey === c.uf ? 700 : 400, fontSize: '0.65rem' }} />
                ))}
              </Box>

              {/* ═══ RM MUNICÍPIOS (ADR-0025) ═══ */}
              {rmMunicipios.length > 0 && (
                <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center', flexWrap: 'wrap', mt: 0.5 }}>
                  <Typography variant='caption' color='text.secondary' sx={{ mr: 0.5 }}>
                    🏙️ RM ({rmMunicipios.length}):
                  </Typography>
                  {rmLoading && <Chip label='⏳' size='small' variant='outlined' />}
                  {rmMunicipios.slice(0, 12).map(m => {
                    const isSelected = batchMode === 'single'
                      ? selectedMunicipio === m.nome
                      : batchMode === 'rm'
                        ? selectedMunicipios.includes(m.nome)
                        : true  // state mode: all selected

                    const handleClick = () => {
                      if (batchMode === 'single') {
                        // Single: seleciona 1 e seta como centro
                        setSelectedMunicipios([m.nome])
                        selectMunicipio(m.nome, stateKey, m.lat, m.lng)
                      } else if (batchMode === 'rm') {
                        // RM: toggle multi-select
                        setSelectedMunicipios(prev =>
                          prev.includes(m.nome)
                            ? prev.filter(n => n !== m.nome)
                            : [...prev, m.nome]
                        )
                        // Se primeiro selecionado, seta como centro
                        if (!selectedMunicipio) selectMunicipio(m.nome, stateKey, m.lat, m.lng)
                      }
                      // Estado: ignora (auto-all)
                    }

                    return (
                      <Chip key={m.nome}
                        label={m.nome}
                        clickable
                        size='small'
                        color={isSelected ? 'warning' : 'default'}
                        variant={isSelected ? 'filled' : 'outlined'}
                        onClick={handleClick}
                        sx={{ fontSize: '0.6rem', opacity: isSelected || batchMode === 'state' ? 1 : 0.5 }}
                      />
                    )
                  })}
                  {rmMunicipios.length > 12 && (
                    <Chip label={`+${rmMunicipios.length - 12}`} size='small' variant='outlined'
                      sx={{ fontSize: '0.6rem' }} />
                  )}
                  {batchMode === 'rm' && (
                    <Chip label={`${rmSelectedCount} selecionados`}
                      size='small' color='warning' variant='tonal'
                      sx={{ fontSize: '0.6rem', ml: 0.5 }} />
                  )}
                </Box>
              )}
            </Box>
          </CardContent>
        </Card>
      </Grid>

      {/* ═══ AUTO-PILOT STATE SUGGESTION (sem cidade manual) ═══ */}
      {autoMode && autoSuggestion && (
        <Grid size={{ xs: 12 }}>
          <Card sx={{ bgcolor: 'success.50', border: '1px solid', borderColor: 'success.main' }}>
            <CardContent sx={{ py: 1.5 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                <Box>
                  <Typography variant='subtitle2' fontWeight={700} color='success.main'>
                    🎯 Auto-Pilot: Melhor Estado para Prospectar
                  </Typography>
                  <Typography variant='body2' fontWeight={600}>
                    {autoSuggestion.state} · {autoSuggestion.city}
                  </Typography>
                  <Typography variant='caption' color='text.secondary'>
                    {autoSuggestion.reason}
                  </Typography>
                </Box>
                <Chip label='🤖 Seleção automática ativa' size='small' color='success' variant='tonal' />
              </Box>
              {stateRanking && (
                <Box sx={{ mt: 1, display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                  {stateRanking.states.slice(0, 6).map((s: any) => (
                    <Chip key={s.uf}
                      label={`${s.uf} ${s.score}`}
                      size='small'
                      color={s.uf === stateRanking.topPick.uf ? 'success' : 'default'}
                      variant={s.uf === stateRanking.topPick.uf ? 'filled' : 'outlined'}
                      sx={{ fontFamily: 'monospace', fontSize: '0.65rem' }}
                    />
                  ))}
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      )}

      {/* ═══ AUTO-PILOT TARGETS TABLE ═══ */}
      {selected.length === 1 && (
        <Grid size={{ xs: 12 }}>
          <DiscoveryAutoPilot
            autoMode={autoMode}
            autoModeType={autoModeType}
            autoLoading={autoLoading}
            autoQueue={autoQueue}
            onToggleAuto={() => { setAutoMode(!autoMode); if (!autoMode) setAutoQueue(null); setAutoSuggestion(null); setStateRanking(null) }}
            onToggleType={(t: string) => setAutoModeType(t as 'coverage' | 'intelligence')}
            onMapDistrict={(district, city, radius) => {
              setGeoQuery(`${district}, ${city}`)
              handleGeoSearch(`${district}, ${city}`)
              setRadius(radius)
            }}
          />
        </Grid>
      )}

      {/* ═══ CATEGORIES + SEARCH ═══ */}
      <Grid size={{ xs: 12 }}>
        <Card><CardContent>
          {/* ── Pipeline Config (ADR-0026) ── */}
          <Box sx={{ mb: 2, p: 1.5, bgcolor: 'grey.50', borderRadius: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
              <Typography variant='caption' fontWeight={700} color='text.secondary' sx={{ mr: 1 }}>
                ⚙️ Pipeline:
              </Typography>
              {/* Layer toggles — L0+L4 obrigatórios, L1 toggleable */}
              <Typography variant='caption' color='text.secondary'>Camadas:</Typography>
              {/* L0: obrigatório */}
              <Chip label='🟢 L0 · Search' size='small' color='primary' variant='filled'
                sx={{ fontSize: '0.65rem', fontFamily: 'monospace' }} />
              {/* L1: toggleável */}
              <Chip
                label={`${selectedLayers.l1 ? '🟢' : '🔴'} L1 · Profile ${selectedLayers.l1 ? `$${(50 * 0.0054 * batchEffective).toFixed(4)}` : ''}`}
                clickable size='small'
                color={selectedLayers.l1 ? 'primary' : 'default'}
                variant={selectedLayers.l1 ? 'filled' : 'outlined'}
                onClick={() => setSelectedLayers(prev => ({ ...prev, l1: !prev.l1 }))}
                sx={{ fontSize: '0.65rem', fontFamily: 'monospace' }}
              />
              {/* L4: obrigatório */}
              <Chip label='🟢 L4 · IBGE $0' size='small' color='primary' variant='filled'
                sx={{ fontSize: '0.65rem', fontFamily: 'monospace' }} />
              <Box sx={{ flex: 1 }} />
              {/* Batch mode */}
              <Typography variant='caption' color='text.secondary'>
                Modo:
              </Typography>
              {(['single', 'rm', 'state'] as const).map(mode => {
                const labels = { single: '📍 1', rm: '🏙️ RM', state: '🗺️ Estado' }
                const needsMunicipios = mode !== 'single'
                const disabled = needsMunicipios && rmMunicipios.length === 0
                const extraInfo = mode === 'single' ? (selectedMunicipio || 'auto')
                  : mode === 'rm' ? (rmSelectedCount || rmMunicipios.length)
                  : (rmMunicipios.length || 0)

                return (
                  <Chip key={mode}
                    label={`${labels[mode]} (${extraInfo})`}
                    clickable size='small'
                    color={batchMode === mode ? 'error' : 'default'}
                    variant={batchMode === mode ? 'filled' : 'outlined'}
                    onClick={() => !disabled && setBatchMode(mode)}
                    disabled={disabled}
                    sx={{ fontSize: '0.6rem', opacity: disabled ? 0.5 : 1 }}
                  />
                )
              })}
            </Box>
            {/* Pipeline progress bar */}
            {loading && (
              <Box sx={{ mt: 1.5 }}>
                <Box sx={{ display: 'flex', gap: 0.5, mb: 0.5 }}>
                  {[
                    { key: 'l0', label: 'L0 Search', pct: pipelinePhase === 'l0' ? 50 : pipelinePhase !== 'idle' ? 100 : 0 },
                    { key: 'l1', label: 'L1 Profile', pct: pipelinePhase === 'l1' ? 50 : pipelinePhase === 'l4' || pipelinePhase === 'persist' || pipelinePhase === 'done' ? 100 : 0 },
                    { key: 'l4', label: 'L4 IBGE', pct: pipelinePhase === 'l4' ? 50 : pipelinePhase === 'persist' || pipelinePhase === 'done' ? 100 : 0 },
                    { key: 'persist', label: 'Persistência', pct: pipelinePhase === 'persist' ? 50 : pipelinePhase === 'done' ? 100 : 0 },
                  ].map(step => (
                    <Box key={step.key} sx={{ flex: 1 }}>
                      <Typography variant='caption' sx={{ fontSize: '0.55rem', color: 'text.secondary' }}>
                        {step.label}
                      </Typography>
                      <LinearProgress variant='determinate' value={step.pct}
                        color={step.pct === 100 ? 'success' : step.pct > 0 ? 'primary' : 'inherit'}
                        sx={{ height: 4, borderRadius: 2, mt: 0.3 }} />
                    </Box>
                  ))}
                </Box>
                <Typography variant='caption' color='text.secondary' sx={{ fontSize: '0.6rem' }}>
                  {pipelinePhase === 'l0' && '🔄 Buscando negócios no Google Maps...'}
                  {pipelinePhase === 'l1' && '📋 Enriqueçendo perfis GMB (2 ondas de 30)...'}
                  {pipelinePhase === 'l4' && '📊 Cruzando com IBGE (população, PIB, densidade)...'}
                  {pipelinePhase === 'done' && '✅ Pipeline completo — dados persistidos no Supabase'}
                </Typography>
              </Box>
            )}
          </Box>

          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
            <Typography variant='subtitle2' fontWeight={600}>
              📁 Categorias ({selected.length} selecionadas)
              {selected.length > 0 && (
                <Chip label={`~$${(totalCost).toFixed(4)}`} size='small' color='warning' variant='tonal' sx={{ ml: 1 }} />
              )}
              {batchMode !== 'single' && (
                <Chip label={`${batchEffective} municípios`} size='small' color='error' variant='tonal' sx={{ ml: 0.5 }} />
              )}
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <Chip label={forceRefresh ? '🔄 Force (Live API)' : '📦 Cache (Redis)'} size='small'
                color={forceRefresh ? 'warning' : 'default'} variant='tonal'
                onClick={() => setForceRefresh(!forceRefresh)}
                sx={{ cursor: 'pointer' }} />
              <Button variant='contained' color='primary' disabled={selected.length === 0 || loading}
                onClick={() => setConfirmOpen(true)}>
                {loading ? 'Buscando...' : `Buscar Agora ($${(totalCost).toFixed(3)})`}
              </Button>
            </Box>
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

      {/* ═══ RESULTS TOOLBAR (simplified: Auto-Pilot status + Ordenação) ═══ */}
      {results.length > 0 && (
        <Grid size={{ xs: 12 }}>
          <Card><CardContent sx={{ py: 1.5 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
              {/* Auto-Pilot Status */}
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                <Typography variant='body2' fontWeight={600}>
                  🧠 Auto-Pilot
                </Typography>
                <Chip label={`${(autoQueue as any)?.meta?.priorityTargets || 0} alvos`} size='small' color='warning' variant='tonal' />
                <Chip label={`${results.length} leads`} size='small' variant='outlined' />
                {distribution && (
                  <Chip label={`S1 ${distribution.unaware} · S2 ${distribution.problemAware} · S3 ${distribution.solutionAware}`}
                    size='small' variant='outlined' sx={{ fontFamily: 'monospace', fontSize: '0.6rem' }} />
                )}
              </Box>
              {/* Sort Toggle (único filtro mantido — controle de visualizacao) */}
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                <Typography variant='caption' color='text.secondary'>Ordenar:</Typography>
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
            </Box>
          </CardContent></Card>
        </Grid>
      )}

      {/* ═══ CONFIRMATION DIALOG (checkout style) ═══ */}
      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)} maxWidth='sm' fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          🚀 Confirmar Discovery
          <Chip label={batchMode === 'single' ? '1 Município' : batchMode === 'rm' ? `${batchEffective} Municípios (RM)` : `${batchEffective} Municípios (Estado)`}
            size='small' color='error' variant='tonal' />
        </DialogTitle>
        <DialogContent>
          {/* ── Resumo ── */}
          <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
            <Chip label={`📍 ${cityLabel.split('(')[0].trim()}`} size='small' color='primary' variant='outlined' />
            <Chip label={`${radius}km`} size='small' color='warning' variant='outlined' />
            {batchMode === 'rm' && selectedMunicipios.length > 0 && selectedMunicipios.slice(0, 5).map(m => (
              <Chip key={m} label={m} size='small' variant='outlined' sx={{ fontSize: '0.6rem' }} />
            ))}
            {batchMode === 'rm' && selectedMunicipios.length > 5 && (
              <Chip label={`+${selectedMunicipios.length - 5}`} size='small' variant='outlined' />
            )}
            {batchMode === 'state' && rmMunicipios.slice(0, 5).map(m => (
              <Chip key={m.nome} label={m.nome} size='small' variant='outlined' sx={{ fontSize: '0.6rem' }} />
            ))}
            {batchMode === 'state' && rmMunicipios.length > 5 && (
              <Chip label={`+${rmMunicipios.length - 5}`} size='small' variant='outlined' />
            )}
          </Box>

          {/* ── Pipeline Breakdown (checkout) ── */}
          <Box sx={{ bgcolor: 'grey.50', borderRadius: 1, p: 2 }}>
            <Typography variant='subtitle2' gutterBottom>📊 Pipeline selecionado</Typography>
            {[
              { label: 'L0 · Google Maps Search', cost: l0Cost, detail: `100 listings × ${batchEffective} municípios`, always: true },
              { label: 'L1 · GMB Profile', cost: l1Cost, detail: `~${Math.round(50 * 0.36)} perfis por município (36% hit rate real) · 2 ondas de 30`, optional: true, selected: selectedLayers.l1 },
              { label: 'L4 · IBGE Context', cost: 0, detail: 'população, PIB, densidade — ibge_panorama (419 municípios)', always: true, free: true },
            ].filter(s => s.always || s.selected).map((s, i, arr) => (
              <Box key={i} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 0.8, borderBottom: i < arr.length - 1 ? '1px solid' : 'none', borderColor: 'divider' }}>
                <Box>
                  <Typography variant='body2' fontWeight={600}>{s.label}</Typography>
                  <Typography variant='caption' color='text.secondary'>{s.detail}</Typography>
                </Box>
                <Typography variant='body2' fontWeight={700} color={s.cost > 0 ? 'warning.main' : 'success.main'}>
                  {s.cost > 0 ? `$${s.cost.toFixed(4)}` : 'GRÁTIS'}
                </Typography>
              </Box>
            ))}
            {/* Total */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pt: 1.5, mt: 0.5 }}>
              <Typography variant='subtitle2'>💰 Total</Typography>
              <Box sx={{ textAlign: 'right' }}>
                <Typography variant='h6' color='warning.main' fontWeight={800}>
                  ${totalCost.toFixed(4)}
                </Typography>
                <Typography variant='caption' color='text.secondary'>
                  R${(totalCost * 5.5).toFixed(2)} · {batchEffective} municípios · {selected.length} categorias
                </Typography>
              </Box>
            </Box>
          </Box>

          {/* ── Info ── */}
          <Alert severity='info' sx={{ mt: 2 }}>
            <Typography variant='caption'>
              Camada L1 usa <strong>2 ondas de 30 chamadas simultâneas</strong> à API DataForSEO.
              Custo real pode variar conforme disponibilidade de perfil GMB.
              {batchMode !== 'single' && ` Cada município é uma busca independente com seu próprio tracker.`}
            </Typography>
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)}>Cancelar</Button>
          <Button variant='contained' color='primary'
            onClick={() => { setConfirmOpen(false); doSearch(forceRefresh); }}
            startIcon={<i className='ri-send-plane-line' />}>
            Confirmar · ${totalCost.toFixed(3)}
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
              <Typography variant='h5' fontWeight={800} color={regionalTotal > 0 ? 'success.main' : 'text.secondary'}>
                {searchMeta ? `${((searchMeta.fetched_count / searchMeta.total_in_region) * 100).toFixed(1)}%`
                  : regionalTotal > 0 ? `${((extractedTotal / regionalTotal) * 100).toFixed(1)}%` : '—'}
              </Typography>
              <Typography variant='caption' color='text.secondary'>Mercado Coberto</Typography>
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
              <Typography variant='h5' fontWeight={800} color='info.main'>
                {searchMeta ? `${searchMeta.fetched_count}/${searchMeta.total_in_region}` : `${extractedTotal}/${regionalTotal}`}
              </Typography>
              <Typography variant='caption' color='text.secondary'>Extraídos/Total{searchMeta?.remaining ? ` · faltam ${searchMeta.remaining}` : ''}</Typography>
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

      {/* ═══ PAGINATION BANNER (Tracker) ═══ */}
      {searchMeta && searchMeta.remaining > 0 && (
        <Grid size={{ xs: 12 }}>
          <Alert severity='info' variant='outlined'
            action={
              <Button variant='contained' size='small' color='info'
                onClick={() => {
                  const nextOffset = searchMeta.offsets_used[searchMeta.offsets_used.length - 1] + 50

                  doSearch(false, nextOffset)
                }}>
                📄 Continuar ({searchMeta.remaining} restantes)
              </Button>
            }>
            <Typography variant='body2' fontWeight={600}>
              📊 {searchMeta.fetched_count}/{searchMeta.total_in_region} capturados
              · {(searchMeta.fetched_count/searchMeta.total_in_region*100).toFixed(1)}% do mercado
            </Typography>
            <Typography variant='caption' color='text.secondary'>
              Tracker: {searchMeta.tracker_id}
            </Typography>
          </Alert>
        </Grid>
      )}

      {/* ═══ LOADING ═══ */}
      {loading && (
        <Grid size={{ xs: 12 }}>
          <Card sx={{ textAlign: 'center', py: 4 }}><CardContent>
            <LinearProgress sx={{ mb: 2, borderRadius: 2 }} />
            <Typography>🔍 Buscando dados reais do Google Meu Negócio...</Typography>
            <Typography variant='caption' color='text.secondary'>Pipeline L0{selectedLayers.l1 ? '+L1' : ''}+L4 em execução · Custo: ~${totalCost.toFixed(3)}</Typography>
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
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Typography fontWeight={600} fontSize='0.85rem' noWrap sx={{ maxWidth: 180 }}>{l.title || '—'}</Typography>
                          {(l as any).enrichment_level >= 2 ? (
                            <Chip label='L2' size='small' color='info' variant='tonal' sx={{ height: 18, fontSize: '0.6rem', fontFamily: 'monospace' }} />
                          ) : (l as any).enrichment_level >= 1 ? (
                            <Chip label='L1' size='small' color='success' variant='tonal' sx={{ height: 18, fontSize: '0.6rem', fontFamily: 'monospace' }} />
                          ) : null}
                        </Box>
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
                  {isL2Enriched(selectedLead) ? (
                    <Chip label='🌐 L2 Website+SEO' size='small' color='info' variant='tonal' />
                  ) : isEnriched(selectedLead) ? (
                    <Chip label='🔬 L1 Enriquecido (27 campos)' size='small' color='success' variant='tonal' />
                  ) : (
                    <Chip label='📡 L0 Básico (11 campos)' size='small' color='default' variant='tonal' />
                  )}
                </Box>
              </Box>
              <IconButton onClick={() => { setSelectedLead(null); setSelectedScore(null); setCompetitorData(null); }} size='small'><i className='ri-close-line' /></IconButton>
            </DialogTitle>
            <DialogContent dividers>
              {/* ═══ MARKET CONTEXT ═══ */}
              {selectedLead.category && CAT_INFO[selectedLead.category] && (
                <Box sx={{ mb: 2, p: 2, bgcolor: '#f0fdf4', borderRadius: 1, border: '1px solid', borderColor: '#bbf7d0' }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Typography variant='subtitle2' fontWeight={700} color='#16a34a'>
                      📊 Mercado: {CAT_INFO[selectedLead.category].market} negócios · {CAT_INFO[selectedLead.category].segment}
                    </Typography>
                    <Chip label={'Tier ' + CAT_INFO[selectedLead.category].tier} size='small'
                      color={CAT_INFO[selectedLead.category].tier === 1 ? 'error' : CAT_INFO[selectedLead.category].tier === 2 ? 'warning' : 'info'} variant='tonal' />
                  </Box>
                  <Typography variant='caption' color='text.secondary'>
                    {CAT_INFO[selectedLead.category].why}
                  </Typography>
                </Box>
              )}

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
                      ['💬 WhatsApp', (selectedLead as any).l3_whatsapp
                        ? `✅ ${(selectedLead as any).l3_whatsapp}`
                        : detectWApp(selectedLead.phone) === true ? '✅ WhatsApp detectado (via regex)' : detectWApp(selectedLead.phone) === false ? '❌ Não é WhatsApp' : null],
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

              {/* ═══ L2 WEBSITE+SEO (v0.3) ═══ */}
              {isL2Enriched(selectedLead) && (
                <>
                  <Typography variant='overline' fontWeight={700} color='info.main'>🌐 Website & SEO (L2 Enriquecido · v0.3)</Typography>
                  <Grid container spacing={1.5} sx={{ mb: 2 }}>
                    {[
                      ['📊 OnPage Score', selectedLead.l2_onpage_score != null ? `${selectedLead.l2_onpage_score}/100` : null],
                      ['🏷️ Meta Title', selectedLead.l2_meta_title],
                      ['📝 Meta Description', selectedLead.l2_meta_description],
                      ['📖 Palavras', selectedLead.l2_word_count != null ? selectedLead.l2_word_count.toLocaleString('pt-BR') : null],
                      ['🔗 Links Internos', selectedLead.l2_internal_links_count != null ? String(selectedLead.l2_internal_links_count) : null],
                      ['🔗 Links Externos', selectedLead.l2_external_links_count != null ? String(selectedLead.l2_external_links_count) : null],
                      ['🖼️ Imagens', selectedLead.l2_images_count != null ? String(selectedLead.l2_images_count) : null],
                      ['🏗️ CMS', selectedLead.l2_cms],
                      ['📊 Analytics', selectedLead.l2_has_analytics === true ? '✅ Detectado' : selectedLead.l2_has_analytics === false ? '❌ Não detectado' : null],
                      ['📈 Domain Rank', selectedLead.l2_domain_rank != null ? String(selectedLead.l2_domain_rank) : null],
                      ['🌍 País', selectedLead.l2_country_iso_code],
                      ['🕐 Enriquecido em', selectedLead.l2_enriched_at ? new Date(selectedLead.l2_enriched_at).toLocaleString('pt-BR') : null],
                    ].filter(([, v]) => v).map(([label, value]) => (
                      <Grid key={label} size={{ xs: 12, sm: 6 }}>
                        <Typography variant='caption' color='text.secondary'>{label}</Typography>
                        <Box sx={{ mt: 0.3 }}>
                          {typeof value === 'string' && value.startsWith('✅') ? <Chip label={value} size='small' color='success' variant='tonal' /> :
                           typeof value === 'string' && value.startsWith('❌') ? <Chip label={value} size='small' color='error' variant='tonal' /> :
                           typeof value === 'string' && value.includes('/100') ? <Chip label={value} size='small' color={selectedLead.l2_onpage_score! >= 80 ? 'success' : selectedLead.l2_onpage_score! >= 50 ? 'warning' : 'error'} variant='tonal' /> :
                           <Typography variant='body2' fontWeight={600} sx={{ wordBreak: 'break-all' }}>{value}</Typography>}
                        </Box>
                      </Grid>
                    ))}
                  </Grid>
                </>
              )}

              {/* ═══ L3 REDES SOCIAIS + CONTATOS (ADR-0024) ═══ */}
              {(isL2Enriched(selectedLead) || isEnriched(selectedLead)) && (
                ((selectedLead as any).l3_social_links?.length > 0 ||
                 (selectedLead as any).l3_emails?.length > 0 ||
                 (selectedLead as any).l3_whatsapp ||
                 (selectedLead as any).l2_social_links?.length > 0 ||  // fallback: dados antigos pré-ADR
                 (selectedLead as any).l2_emails?.length > 0)
              ) && (
                <>
                  <Typography variant='overline' fontWeight={700} color='#e91e63'>📱 Redes Sociais & Contatos (L3 · ADR-0024)</Typography>
                  <Grid container spacing={1.5} sx={{ mb: 2 }}>
                    {/* ── WhatsApp (L3, campo dedicado) ── */}
                    {(selectedLead as any).l3_whatsapp && (
                      <Grid size={{ xs: 12 }}>
                        <Box sx={{ p: 1.5, bgcolor: '#f0fdf4', borderRadius: 1, border: '1px solid #bbf7d0', display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Chip label='💬 WhatsApp' size='small' color='success' variant='filled' />
                          <Typography variant='body2' fontWeight={700} sx={{ fontFamily: 'monospace' }}>
                            {(selectedLead as any).l3_whatsapp}
                          </Typography>
                          <Typography variant='caption' color='text.secondary'>extraído do site</Typography>
                        </Box>
                      </Grid>
                    )}
                    {/* ── Redes Sociais (L3 prefer, L2 fallback) ── */}
                    {(((selectedLead as any).l3_social_links || (selectedLead as any).l2_social_links)?.length > 0) && (
                      <Grid size={{ xs: 12 }}>
                        <Typography variant='caption' color='text.secondary'>Redes Sociais</Typography>
                        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 0.5 }}>
                          {((selectedLead as any).l3_social_links || (selectedLead as any).l2_social_links || []).map((s: any) => (
                            <Chip key={s.url} label={s.platform} size='small' color='info' variant='tonal'
                              component='a' href={s.url} target='_blank' clickable
                              sx={{ fontSize: '0.7rem' }} />
                          ))}
                        </Box>
                      </Grid>
                    )}
                    {/* ── Emails (L3 prefer, L2 fallback) ── */}
                    {(((selectedLead as any).l3_emails || (selectedLead as any).l2_emails)?.length > 0) && (
                      <Grid size={{ xs: 12 }}>
                        <Typography variant='caption' color='text.secondary'>Emails</Typography>
                        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 0.5 }}>
                          {((selectedLead as any).l3_emails || (selectedLead as any).l2_emails || []).map((e: string) => (
                            <Chip key={e} label={e} size='small' variant='outlined' sx={{ fontSize: '0.7rem', fontFamily: 'monospace' }} />
                          ))}
                        </Box>
                      </Grid>
                    )}
                  </Grid>
                </>
              )}

              {/* ═══ CONTENT GAP (v0.5) ═══ */}
              {selectedLead.l2_content_maturity != null && (
                <>
                  <Typography variant='overline' fontWeight={700} color='secondary.main'>📝 Content Gap · Maturidade {selectedLead.l2_content_maturity}/4</Typography>
                  <Grid container spacing={1.5} sx={{ mb: 2 }}>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <Typography variant='caption' color='text.secondary'>Nivel de Maturidade de Conteudo</Typography>
                      <Box sx={{ mt: 0.3 }}>
                        <Chip label={(selectedLead.l2_content_gaps as any)?.label || 'Desconhecido'} size='small'
                          sx={{ bgcolor: contentMaturityColor(selectedLead.l2_content_maturity), color: '#fff', fontWeight: 700 }} />
                      </Box>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <Typography variant='caption' color='text.secondary'>Maturity Score</Typography>
                      <Typography variant='h6' fontWeight={800}>{(selectedLead.l2_content_gaps as any)?.maturity_score ?? '?'}/100</Typography>
                    </Grid>
                    {(selectedLead.l2_content_gaps as any)?.gaps?.length > 0 && (
                      <Grid size={{ xs: 12 }}>
                        <Typography variant='caption' color='text.secondary' gutterBottom component='div'>Gaps Detectados</Typography>
                        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                          {(selectedLead.l2_content_gaps as any).gaps.map((g: string) => (
                            <Chip key={g} label={g} size='small' color='error' variant='tonal' sx={{ fontSize: '0.7rem' }} />
                          ))}
                        </Box>
                      </Grid>
                    )}
                    {(selectedLead.l2_content_gaps as any)?.recommendations?.length > 0 && (
                      <Grid size={{ xs: 12 }}>
                        <Typography variant='caption' color='text.secondary' gutterBottom component='div'>
                          Recomendacoes ({(selectedLead.l2_content_gaps as any).recommendations.length})
                        </Typography>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                          {(selectedLead.l2_content_gaps as any).recommendations.slice(0, 3).map((r: any, ri: number) => (
                            <Box key={ri} sx={{ p: 1.5, bgcolor: '#faf5ff', borderRadius: 1, borderLeft: 3, borderColor: r.priority === 'alta' ? '#ef5350' : r.priority === 'media' ? '#ffa726' : '#42a5f5' }}>
                              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 0.5 }}>
                                <Chip label={r.priority.toUpperCase()} size='small' color={r.priority === 'alta' ? 'error' : r.priority === 'media' ? 'warning' : 'info'} variant='tonal' sx={{ fontSize: '0.6rem', height: 18 }} />
                                <Typography variant='body2' fontWeight={700}>{r.title}</Typography>
                              </Box>
                              <Typography variant='caption' color='text.secondary'>{r.description}</Typography>
                              <Box sx={{ mt: 0.5, display: 'flex', gap: 1 }}>
                                <Chip label={`Esforco: ${r.effort}`} size='small' variant='outlined' sx={{ fontSize: '0.6rem', height: 18 }} />
                                <Chip label={r.category} size='small' variant='outlined' sx={{ fontSize: '0.6rem', height: 18 }} />
                              </Box>
                            </Box>
                          ))}
                        </Box>
                      </Grid>
                    )}
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
