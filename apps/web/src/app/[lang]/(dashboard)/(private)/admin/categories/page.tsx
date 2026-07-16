
// adsentice · Admin / Categorias — dados REAIS do Supabase + Redis
// 29 categorias SMB Brasil · 7 segmentos de mercado
import { redirect } from 'next/navigation'

import Grid from '@mui/material/Grid2'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import Chip from '@mui/material/Chip'
import Box from '@mui/material/Box'
import LinearProgress from '@mui/material/LinearProgress'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Paper from '@mui/material/Paper'
import Alert from '@mui/material/Alert'

import CardStatVertical from '@components/card-statistics/Vertical'
import { getSessionUser } from '@/libs/supabase/server'
import { getAdminClient } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

// ═══ Mapeamento: código GMB → label Discovery ═══
const CATEGORY_INFO: Record<string, { label: string; market: string; tier: number; segment: string; why: string }> = {
  // Saúde — nicho primário adsentice
  dentist: { label: '🦷 Dentistas', market: '~400K', tier: 1, segment: 'Saúde', why: 'Alta rotatividade de pacientes. GMB é o principal canal de captação. Ticket R$150-500. Convênio + particular.' },
  orthodontist: { label: '🦷 Ortodontistas', market: '~25K', tier: 1, segment: 'Saúde', why: 'Nicho premium dentro de dentista. Ticket R$3K-15K. Aparelho/Invisalign. Altíssimo valor por paciente.' },
  medical_aesthetic_clinic: { label: '💉 Clínicas Estéticas', market: '~80K', tier: 1, segment: 'Saúde', why: 'Harmonização facial, botox, laser. Crescimento 40% ao ano. Dependem de Instagram + GMB. Ticket R$500-3K.' },
  medical_clinic: { label: '🏥 Clínicas Médicas', market: '~200K', tier: 1, segment: 'Saúde', why: 'Clínico geral + especialidades. Atendem convênio + particular. GMB essencial para agendamento.' },
  veterinarian: { label: '🐾 Veterinários', market: '~60K', tier: 1, segment: 'Saúde', why: 'Brasil: 2º maior mercado pet do mundo. Donos pesquisam no Google. Urgência = busca imediata. Ticket R$100-500.' },
  psychologist: { label: '🧠 Psicólogos', market: '~350K', tier: 1, segment: 'Saúde', why: 'Crescimento explosivo pós-pandemia. Atendimento online + presencial. Precisam de site + Instagram + GMB. Ticket R$100-300/sessão.' },
  physical_therapist: { label: '🦴 Fisioterapeutas', market: '~150K', tier: 1, segment: 'Saúde', why: 'Atendem convênio + particular. Pilates, RPG, reabilitação. GMB crítico para captação local. Ticket R$80-200.' },
  ophthalmologist: { label: '👁️ Oftalmologistas', market: '~30K', tier: 1, segment: 'Saúde', why: 'Cirurgia refrativa, lentes, exames. Ticket alto (R$2K-10K). Clínicas particulares competem por pacientes no Google.' },
  cardiologist: { label: '🫀 Cardiologistas', market: '~25K', tier: 1, segment: 'Saúde', why: 'Consultório particular. Check-up, exames. Público 40+. Ticket R$300-800. Google = principal fonte de agendamento.' },

  // Beleza & Bem-Estar
  beauty_salon: { label: '💇 Salões de Beleza', market: '~600K', tier: 1, segment: 'Beleza', why: 'MAIOR categoria SMB do Brasil. Manicure, cabeleireiro, estética. Altíssima rotatividade. Instagram + GMB = vitais. Ticket R$30-200.' },
  barber_shop: { label: '💈 Barbearias', market: '~400K', tier: 1, segment: 'Beleza', why: 'Crescimento acelerado. Público masculino. Agendamento via WhatsApp + GMB. Ticket R$40-80.' },
  gym: { label: '🏋️ Academias', market: '~35K', tier: 2, segment: 'Beleza', why: 'Mensalidade recorrente. GMB mostra horários, fotos, modalidades. Instagram para resultados de alunos. Ticket R$80-200/mês.' },

  // Serviços Profissionais
  lawyer: { label: '⚖️ Advogados', market: '~300K', tier: 1, segment: 'Serviços Profissionais', why: '1M+ advogados no Brasil (OAB). Escritórios competem por Google. Áreas: trabalhista, cível, família. Ticket R$1K-10K.' },
  accountant: { label: '📊 Contadores', market: '~300K', tier: 1, segment: 'Serviços Profissionais', why: 'MEI, LTDA, Simples Nacional. Todo negócio precisa. GMB + site com CNPJ/CRC. Ticket R$200-800/mês.' },
  architect: { label: '🏗️ Arquitetos', market: '~180K', tier: 2, segment: 'Serviços Profissionais', why: 'Portfólio visual. Instagram + site + GMB. Projetos residenciais e comerciais. Ticket R$3K-30K.' },
  interior_designer: { label: '🎨 Designers de Interiores', market: '~120K', tier: 2, segment: 'Serviços Profissionais', why: 'Mesmo perfil do arquiteto. Portfólio visual essencial. Instagram é canal #1. Ticket R$1K-15K.' },
  real_estate_agency: { label: '🏠 Imobiliárias', market: '~70K', tier: 2, segment: 'Serviços Profissionais', why: 'Cada venda paga comissão alta. GMB + portal + Google Ads. Fotos profissionais essenciais. Ticket R$5K-50K comissão.' },

  // Alimentação
  restaurant: { label: '🍽️ Restaurantes', market: '~1M', tier: 2, segment: 'Alimentação', why: 'Maior categoria absoluta. GMB com cardápio, fotos, horários. Reviews críticas. Ticket R$30-100.' },
  pizza_restaurant: { label: '🍕 Pizzarias', market: '~60K', tier: 2, segment: 'Alimentação', why: 'Delivery + presencial. GMB + iFood + Instagram. Fotos dos sabores = venda direta. Ticket R$40-80.' },
  bakery: { label: '🥖 Padarias', market: '~70K', tier: 3, segment: 'Alimentação', why: 'Negócio de bairro. Alta frequência, ticket baixo. GMB mostra horários, fotos, cardápio. Ticket R$5-30.' },

  // Comércio & Serviços Locais
  pet_store: { label: '🐶 Pet Shops', market: '~200K', tier: 1, segment: 'Comércio Local', why: 'SMB puro. Banho/tosa + venda de ração. GMB essencial. Donos pesquisam "pet shop perto de mim". Ticket R$50-200.' },
  car_repair: { label: '🔧 Oficinas Mecânicas', market: '~150K', tier: 2, segment: 'Comércio Local', why: 'Urgência = busca no Google. GMB com fotos, avaliações, telefone. Ticket R$100-2K.' },
  pharmacy: { label: '💊 Farmácias', market: '~90K', tier: 3, segment: 'Comércio Local', why: 'Redes dominam (Droga Raia, Drogasil). SMB independente compete por conveniência local. GMB com horários + telefone.' },
  electrician: { label: '🔌 Eletricistas', market: '~200K', tier: 2, segment: 'Comércio Local', why: 'Profissional liberal. Só GMB. Zero presença digital. Urgência = cliente liga pro primeiro que aparece. Ticket R$100-500.' },
  plumber: { label: '🔧 Encanadores', market: '~250K', tier: 2, segment: 'Comércio Local', why: 'Mesmo perfil do eletricista. Urgência máxima. Quem aparece no Google ganha o serviço. Ticket R$100-500.' },
  cleaning_service: { label: '🧹 Serviços de Limpeza', market: '~300K', tier: 2, segment: 'Comércio Local', why: 'Terceirização residencial + comercial. Google é principal canal de prospecção. Ticket R$200-800/mês.' },

  // Educação & Hospitalidade
  school: { label: '📚 Escolas Particulares', market: '~40K', tier: 3, segment: 'Educação', why: 'Ticket alto (mensalidade R$500-3K). Período de matrícula = pico de busca. GMB + site com proposta pedagógica. Decisão familiar.' },
  driving_school: { label: '🚗 Autoescolas', market: '~15K', tier: 3, segment: 'Educação', why: 'Pequeno, local, alta dor digital. Primeira CNH = busca no Google. Ticket R$1.5K-2.5K.' },
  hotel: { label: '🏨 Pousadas/Hotéis', market: '~30K', tier: 3, segment: 'Hospitalidade', why: 'Dependem de Google/Booking/Decolar. SEO local crítico. Fotos + reviews = decisão de reserva. Ticket R$150-500/diária.' },
}

interface CategoryRow {
  category: string; label: string; total_listings: number; unique_businesses: number
  avg_score: number; pain_pct: number; solution_aware_plus: number
  product_aware_plus: number; most_aware: number
}

const SEGMENT_COLORS: Record<string, string> = {
  Saúde: '#16a34a', Beleza: '#d97706', 'Serviços Profissionais': '#2563eb',
  Alimentação: '#ef4444', 'Comércio Local': '#8b5cf6', Educação: '#ec4899', Hospitalidade: '#0891b2',
}

const CategoriesPage = async ({ params }: { params: Promise<{ lang: string }> }) => {
  const { lang } = await params
  const user = await getSessionUser()

  if (user?.role !== 'admin') redirect(`/${lang}/app`)

  // ═══ Dados REAIS do Supabase ═══
  let categories: CategoryRow[] = []
  let dataSource: 'supabase' | 'redis' | 'none' = 'none'

  try {
    const supabase = getAdminClient()
    const { data: listings, error } = await supabase.from("discovery_listings").select("place_id,category,score_compound,enrichment_level,schwartz_level").limit(3000)

    if (!error && listings?.length) {
      dataSource = 'supabase'

      // Aggregar por categoria (dedup por place_id)
      const byCategory: Record<string, { places: Set<string>; scores: number[]; pains: number; qual: number; prod: number; most: number }> = {}
      const deduped = new Map<string, { category: string; score: number; el: number; sl: number }>()

      for (const r of listings as any[]) {
        const pid = r.place_id

        if (!pid) continue
        const existing = deduped.get(pid)

        if (!existing || (r.enrichment_level || 0) > existing.el) {
          deduped.set(pid, { category: r.category || "?", score: r.score_compound || 0, el: r.enrichment_level || 0, sl: r.schwartz_level || 1 })
        }
      }

      for (const [pid, info] of deduped) {
        const c = info.category

        if (!byCategory[c]) byCategory[c] = { places: new Set(), scores: [], pains: 0, qual: 0, prod: 0, most: 0 }
        byCategory[c].places.add(pid)
        byCategory[c].scores.push(info.score)
        if (info.sl >= 3) byCategory[c].pains++
        if (info.sl >= 4) byCategory[c].prod++
        if (info.sl >= 5) byCategory[c].most++
      }

      const catList = Object.entries(byCategory)
        .map(([cat, data]) => ({
          category: cat,
          label: CATEGORY_INFO[cat]?.label || cat,
          total_listings: 0,
          unique_businesses: data.places.size,
          avg_score: Math.round(data.scores.reduce((a: number,b: number)=>a+b,0)/Math.max(data.scores.length,1)),
          pain_pct: Math.round((data.pains/Math.max(data.places.size,1))*100),
          solution_aware_plus: data.pains,
          product_aware_plus: data.prod,
          most_aware: data.most,
        }))
        .sort((a, b) => b.pain_pct - a.pain_pct)

      categories = catList
    }
  } catch { /* Supabase offline */ }

  const hasData = categories.length > 0
  const totalBusinesses = hasData ? categories.reduce((s, c) => s + c.total_listings, 0) : 0
  const totalLeads = hasData ? categories.reduce((s, c) => s + c.solution_aware_plus, 0) : 0

  // ═══ Mercado total BR (estimado) ═══
  const totalMarketBR = Object.values(CATEGORY_INFO).reduce((s, info) => {
    const match = info.market.match(/~(\d+)/)

    
return s + (match ? parseInt(match[1]) * 1000 : 0)
  }, 0)

  // Segment metrics
  const segments = Object.entries(
    Object.values(CATEGORY_INFO).reduce((acc, info) => {
      acc[info.segment] = (acc[info.segment] || 0) + 1
      
return acc
    }, {} as Record<string, number>)
  ).sort(([, a], [, b]) => b - a)

  return (
    <Grid container spacing={6}>
      {/* ── Header ── */}
      <Grid size={{ xs: 12 }}>
        <Typography variant='h4'>📁 Categorias · Discovery Engine</Typography>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap', mt: 1 }}>
          <Typography variant='body2' color='text.secondary'>
            29 categorias SMB Brasil · 7 segmentos · {(totalMarketBR / 1_000_000).toFixed(1)}M+ negócios mapeáveis
          </Typography>
          {dataSource === 'supabase' && <Chip label='Supabase' size='small' color='success' variant='tonal' />}
          {dataSource === 'none' && <Chip label='Execute 1ª descoberta' size='small' color='default' variant='tonal' />}
        </Box>
      </Grid>

      {/* ── Top KPI Cards ── */}
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <CardStatVertical stats="29" title='Categorias SMB'
          subtitle='7 segmentos de mercado' avatarColor='primary' avatarIcon='ri-store-2-line'
          trendNumber="29" trend='positive' />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <CardStatVertical stats={`${(totalMarketBR / 1_000_000).toFixed(1)}M`} title='Negócios Mapeáveis'
          subtitle='Mercado SMB Brasil · estimado' avatarColor='success' avatarIcon='ri-building-line'
          trendNumber={String(Math.round(totalMarketBR / 1_000_000))} trend='positive' />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <CardStatVertical stats={hasData ? totalBusinesses.toLocaleString('pt-BR') : '—'} title='Leads Encontrados'
          subtitle={hasData ? `${categories.length} categorias com dados` : 'Execute 1ª descoberta'} avatarColor='warning'
          avatarIcon='ri-radar-line' trendNumber={String(totalBusinesses)} trend='positive' />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <CardStatVertical stats={hasData ? totalLeads.toLocaleString('pt-BR') : '—'} title='Solution Aware+'
          subtitle='Score ≥ 50 · leads qualificados' avatarColor='error' avatarIcon='ri-user-search-line'
          trendNumber={String(totalLeads)} trend='positive' />
      </Grid>

      {/* ── Segment Distribution ── */}
      <Grid size={{ xs: 12 }}>
        <Card>
          <CardContent>
            <Typography variant='h6' gutterBottom>📊 Segmentos de Mercado</Typography>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              {segments.map(([seg, count]) => (
                <Box key={seg} sx={{ flex: 1, minWidth: 120, textAlign: 'center' }}>
                  <Typography variant='h5' fontWeight={800} sx={{ color: SEGMENT_COLORS[seg] || '#666' }}>
                    {count}
                  </Typography>
                  <Typography variant='caption' color='text.secondary'>{seg}</Typography>
                  <LinearProgress variant='determinate' value={Math.round((count / 29) * 100)}
                    sx={{ height: 4, borderRadius: 2, mt: 0.5, bgcolor: `${SEGMENT_COLORS[seg]}22`, '& .MuiLinearProgress-bar': { bgcolor: SEGMENT_COLORS[seg] } }} />
                </Box>
              ))}
            </Box>
          </CardContent>
        </Card>
      </Grid>

      {/* ── Category Table with Market Data ── */}
      <Grid size={{ xs: 12 }}>
        <Typography variant='h6' gutterBottom>
          🏆 Categorias por Prioridade de Prospecção
          <Chip label='29 categorias · 7 segmentos' size='small' variant='outlined' sx={{ ml: 2 }} />
        </Typography>
        <TableContainer component={Paper}>
          <Table size='small'>
            <TableHead>
              <TableRow>
                <TableCell width={40}>#</TableCell>
                <TableCell>Categoria</TableCell>
                <TableCell>Segmento</TableCell>
                <TableCell>Mercado BR</TableCell>
                <TableCell>Por que Importa?</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {Object.entries(CATEGORY_INFO)
                .sort(([, a], [, b]) => a.tier - b.tier)
                .map(([id, info], idx) => {
                  const segColor = SEGMENT_COLORS[info.segment] || '#666'

                  return (
                    <TableRow key={id} hover>
                      <TableCell>
                        <Typography fontWeight={700} color='text.secondary'>{idx + 1}</Typography>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography fontWeight={600} fontSize='0.9rem'>{info.label}</Typography>
                          <Chip label={`T${info.tier}`} size='small'
                            color={info.tier === 1 ? 'error' : info.tier === 2 ? 'warning' : 'info'} variant='tonal'
                            sx={{ minWidth: 32, fontFamily: 'monospace', fontSize: '0.65rem' }} />
                        </Box>
                        <Typography variant='caption' sx={{ fontFamily: 'monospace', fontSize: '0.65rem', color: 'text.secondary' }}>
                          {id}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip label={info.segment} size='small' variant='outlined'
                          sx={{ borderColor: segColor, color: segColor, fontSize: '0.7rem' }} />
                      </TableCell>
                      <TableCell>
                        <Typography fontWeight={600}>{info.market}</Typography>
                        <Typography variant='caption' color='text.secondary'>negócios</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant='caption' color='text.secondary' sx={{ lineHeight: 1.4 }}>
                          {info.why}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )
                })}
            </TableBody>
          </Table>
        </TableContainer>
      </Grid>

      {/* ── Tier explanation ── */}
      <Grid size={{ xs: 12 }}>
        <Card sx={{ bgcolor: 'var(--pastel-coral)' }}>
          <CardContent>
            <Typography variant='h6' gutterBottom>📊 Estratégia de Priorização (Tier 1 → 3)</Typography>
            <Grid container spacing={2}>
              {[
                { tier: 'T1', color: 'error', label: 'Nicho Primário', desc: '17 categorias · Maior dor digital · Maior ticket · Clientes que mais precisam de marketing. FOCO do adsentice.', cats: Object.entries(CATEGORY_INFO).filter(([, info]) => info.tier === 1).map(([, i]) => i.label).join(', ') },
                { tier: 'T2', color: 'warning', label: 'Expansão', desc: '9 categorias · Bom potencial · Abordar após consolidar T1.', cats: Object.entries(CATEGORY_INFO).filter(([, info]) => info.tier === 2).map(([, i]) => i.label).join(', ') },
                { tier: 'T3', color: 'info', label: 'Oportunidade', desc: '3 categorias · Nicho específico · Abordar sob demanda.', cats: Object.entries(CATEGORY_INFO).filter(([, info]) => info.tier === 3).map(([, i]) => i.label).join(', ') },
              ].map((t) => (
                <Grid key={t.tier} size={{ xs: 12, md: 4 }}>
                  <Card sx={{ borderLeft: 3, borderColor: `${t.color}.main` }}>
                    <CardContent>
                      <Chip label={`${t.tier} · ${t.label}`} size='small' color={t.color as any} variant='tonal' sx={{ mb: 1 }} />
                      <Typography variant='body2' sx={{ mb: 1 }}>{t.desc}</Typography>
                      <Typography variant='caption' color='text.secondary'>{t.cats}</Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </CardContent>
        </Card>
      </Grid>

      {/* ── Data Source ── */}
      <Grid size={{ xs: 12 }}>
        <Alert severity='info' variant='outlined'>
          <Typography variant='body2' fontWeight={600}>
            📊 Dados de mercado: IBGE + Google Meu Negócio + projeções adsentice
          </Typography>
          <Typography variant='caption'>
            Tamanho de mercado estimado com base em dados do IBGE (CEMPRE 2024), registros de GMB por categoria,
            e projeções de penetração digital. Dados de leads REAIS virão do Supabase após buscas no Discovery Engine.
            Custo para mapear todas as 29 categorias em SP: ~$0.44 (R$2.42).
          </Typography>
        </Alert>
      </Grid>
    </Grid>
  )
}

export default CategoriesPage
