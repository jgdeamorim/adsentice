// adsentice · Admin / Solutions — Planos Estrategicos v2.0
// Pipeline L0-L4 → Produtos → Personas → Projecao · Surface Health (C1 fix)
// medido=verdade · 2026-07-20
import { redirect } from 'next/navigation'
import { readFileSync } from 'fs'
import { join } from 'path'

import Grid from '@mui/material/Grid2'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import Chip from '@mui/material/Chip'
import Box from '@mui/material/Box'
import LinearProgress from '@mui/material/LinearProgress'
import Alert from '@mui/material/Alert'
import Divider from '@mui/material/Divider'

import CardStatVertical from '@components/card-statistics/Vertical'
import { getSessionUser } from '@/libs/supabase/server'

// ═══ Surface Status (do warp-surface-status.json) ═══
interface SurfaceDef {
  id: string; name: string; group: string; plan: string
  segment: string; skills: string[]; tokens: string[]
  status: string; route: string | null; warpModule: string | null
  previews: number
}

interface SurfaceData {
  version: string; updated: string
  surfaces: SurfaceDef[]
  summary: {
    total: number; live: number; partial: number; planned: number
    groups: Record<string, { total: number; live: number; partial: number; planned: number }>
  }
}

function getSurfaces(): SurfaceData | null {
  try {
    const jsonPath = join(process.cwd(), "..", "..", "docs", "spec", "warp-surface-status.json")
    const raw = readFileSync(jsonPath, "utf-8")
    return JSON.parse(raw) as SurfaceData
  } catch (e: unknown) { void e; return null }
}

function surfaceStatusChip(status: string) {
  if (status === 'live') return { label: '✅ live', color: 'success' as const }
  if (status === 'partial') return { label: '⚠️ partial', color: 'warning' as const }
  return { label: '📋 planned', color: 'default' as const }
}

// ═══ Planos (atualizados com status real das superfícies) ═══
// S10 (Raio-X) live ✅ · S11 (Landing Page Cliente) live ✅
// 2/22 live · 2/22 partial · 18/22 planned
const PLANS = [
  {
    tier: 'free', name: 'Raio-X', price: 'R$0', priceLabel: 'Gratuito',
    cost: '$0.048/lead', margin: 'Lead magnet',
    pipeline: 'L0 + L2a (SEO Técnico) · S10 · ADR-0038', signals: 37,
    description: 'Diagnóstico de 1 página com score composto, nível Schwartz, TOP 3 gaps detectados. Dados reais do Google Meu Negócio + Lighthouse + CMS detection.',
    delivers: ['Score composto (Fit/Engagement/Intent)', 'Nível Schwartz com explicação', 'TOP 3 gaps detectados', 'Detecção de redes sociais', '1 recomendação gratuita'],
    channels: ['Google Maps (buscar <4.0★)', 'WhatsApp (script 3 linhas)', 'Blog SEO orgânico'],
    persona: '100% do mercado — lead magnet universal',
    color: 'success' as const, icon: 'ri-search-eye-line',
    surfaceIds: ['S10'],  // S10 Raio-X live
  },
  {
    tier: 'starter', name: 'Sentinela', price: 'R$197/mes', priceLabel: 'Starter',
    cost: '~$0.10/mes', margin: '95%',
    pipeline: 'Raio-X + L2b (Conteúdo+DNA) + L3 (Competitive) · S11', signals: 57,
    description: 'Landing Page com dados REAIS da clínica. Brand DNA (cores+fontes), SEO real, copy personalizada. Monitoramento mensal do score. Geração de LP única (não A/B ainda).',
    delivers: ['Landing Page personalizada (S11)', 'Brand DNA: cores e fontes reais da marca', 'SEO audit integrado (Lighthouse)', 'Relatório mensal de evolução', 'Alertas: score caiu, concorrente abriu', '3 recomendações/mês priorizadas'],
    channels: ['Email (D+1, D+3, D+7 pós Raio-X)', 'WhatsApp (follow-up)', 'Indicação de clientes'],
    persona: 'Problem Aware (63% do mercado) — "Tenho menos pacientes, não sei por que"',
    color: 'primary' as const, icon: 'ri-shield-check-line',
    surfaceIds: ['S11', 'S8', 'S9', 'S13'],  // S11 live · S8/S9/S13 planned
  },
  {
    tier: 'pro', name: 'Dominio', price: 'R$497/mes', priceLabel: 'Pro',
    cost: '~$0.15/mes', margin: '95%',
    pipeline: 'Sentinela + L4 (IBGE) + L5 (CNPJ) · S11 full stack', signals: 73,
    description: 'TUDO do Sentinela + Contexto IBGE (renda, PIB) + CNPJ validado + Radar de Mercado contínuo + Channel Health Matrix + Benchmark comparativo.',
    delivers: ['TOP 5 concorrentes com comparison table', 'Radar de Mercado: sua posição vs concorrentes', 'Contexto IBGE: renda do bairro, PIB per capita', 'CNPJ validado: CNAE, regime, sócios', 'Channel Health Matrix (CAC × Ticket × Recorrência)', 'Relatório de Inteligência de Nicho (TAM + gaps)'],
    channels: ['Ligação pessoal (founder)', 'Email com dados REAIS do concorrente', 'WhatsApp com comparison table'],
    persona: 'Solution Aware (12% do mercado) — "Já ouvi falar de SEO/Google Ads"',
    color: 'warning' as const, icon: 'ri-trophy-line',
    surfaceIds: ['S11', 'S8'],  // mesmas superfícies do Sentinela + dados L4/L5
  },
  {
    tier: 'scale', name: 'Escala', price: 'R$997/mes', priceLabel: 'Scale',
    cost: '~$0.20/mes', margin: '95%',
    pipeline: 'Domínio + L6 (Geração multi-surface) + L7 (Analytics)', signals: 87,
    description: 'TUDO do Dominio + AI Daily Briefing via WhatsApp + Copilot IA + Social Media Strategy + Marketplace Intelligence + Brand monitoring + Consultoria mensal com founder.',
    delivers: ['AI Daily Briefing via WhatsApp (todo dia 07:00)', 'Copilot IA: "O que eu faco hoje?" → resposta com dados reais', 'Social Media Strategy: calendario editorial + sugestoes de posts', 'Marketplace Intelligence: dados agregados de marketplaces', 'Brand monitoring + Content Strategy 12 meses', 'Marketing plan 13 secoes (flagship)', 'Consultoria mensal 30min com founder'],
    channels: ['Consultoria pessoal', 'Relatorio executivo trimestral', 'Acesso prioritario'],
    persona: 'Clientes que escalam — "Quero dominar o mercado da minha regiao"',
    color: 'error' as const, icon: 'ri-rocket-2-line',
    surfaceIds: ['S7', 'S15'],  // S7 Social/Ads planned · S15 Cockpit planned
  },
  {
    tier: 'enterprise', name: 'Growth OS', price: 'a partir de R$1.497/mes', priceLabel: 'Enterprise',
    cost: '~$0.30/mes', margin: '90%',
    pipeline: 'Todos os hubs + Multi-user + White-label', signals: 47,
    description: 'Para agencias de marketing, franquias e negocios com equipe. TUDO do Escala + Multi-user (3-10 usuarios) + White-label + Team Analytics + Client Portal + Approval Workflow + API Access.',
    delivers: [
      'Multi-user: 3-10 usuarios com roles (admin, analista, cliente)', 'White-label: dashboard com logo e cores do cliente',
      'Client Portal: cada cliente acessa SEU cockpit', 'Team Analytics: produtividade da equipe',
      'Approval Workflow: recomendacoes passam por aprovacao', 'Bulk Operations: aplicar acao em TODOS os clientes',
      'API Access: REST API para sistemas proprios', 'SLA Tracking + Revenue Attribution',
      'Client Health Score: risco de churn por cliente', 'Multi-unit Dashboard: visao consolidada de franquias/redes',
    ],
    channels: ['Demo personalizada', 'Onboarding dedicado', 'Suporte prioritario'],
    persona: 'Agencias de marketing, franquias, redes multi-unidades, negocios com equipe de marketing',
    color: 'info' as const, icon: 'ri-building-2-line',
    surfaceIds: ['S9', 'S3'],  // S9 Portal planned · S3 Dashboard live (admin)
  },
]

// ═══ Personas (derivadas dos dados reais do Supabase) ═══
const PERSONAS = [
  {
    name: 'Dra. Clinica Estabelecida', pct: '~60%', schwartz: 'Problem Aware',
    age: '35-55 anos', clinic: '5+ anos', ticket: 'R$500/consulta',
    pain: 'Antes tinha fila de espera, agora tenho horarios vagos',
    behavior: 'Instagram pessoal, site Wix de 2018, nunca olhou GMB',
    approach: 'Sua clinica esta invisivel para 5.000 pessoas que buscam dentista todo mes na sua regiao.',
    product: 'Sentinela (R$197/mes)',
  },
  {
    name: 'Dr. Recem-formado', pct: '~10%', schwartz: 'Solution Aware',
    age: '28-35 anos', clinic: '<2 anos', ticket: 'R$200/consulta',
    pain: 'Preciso de pacientes rapido, nao tenho nome ainda',
    behavior: 'Google Ads (gastando mal), Instagram ativo, site proprio',
    approach: 'Voce gasta com Google Ads sem saber se funciona. Eu mostro exatamente onde seu dinheiro deveria ir.',
    product: 'Sentinela + Criacao de site',
  },
  {
    name: 'Dr. Tradicional de Bairro', pct: '~25%', schwartz: 'Unaware',
    age: '50+ anos', clinic: '20+ anos', ticket: 'R$100/consulta (popular)',
    pain: 'Sempre foi boca-a-boca, nunca precisei de propaganda',
    behavior: 'Sem site, sem Instagram, GMB criado automaticamente',
    approach: 'Seu perfil no Google tem foto de 2015 e telefone errado. Paciente que pesquisa dentista perto nao te acha.',
    product: 'Raio-X gratuito → Site basico → Sentinela',
  },
]

const PROJECTION = [
  { month: 1, sentinela: 3, dominio: 0, mrr: 591 },
  { month: 2, sentinela: 7, dominio: 1, mrr: 1876 },
  { month: 3, sentinela: 12, dominio: 2, mrr: 3358 },
  { month: 6, sentinela: 30, dominio: 5, mrr: 8395 },
  { month: 12, sentinela: 60, dominio: 12, mrr: 17784 },
]

function planStatus(plan: typeof PLANS[0], surfaceData: SurfaceData | null): { label: string; color: 'success' | 'warning' | 'info' | 'default' | 'error' } {
  if (!surfaceData) return { label: 'superfícies: ?', color: 'default' }
  const surfaces = plan.surfaceIds.map(id => surfaceData.surfaces.find(s => s.id === id)).filter(Boolean) as SurfaceDef[]
  const liveCount = surfaces.filter(s => s.status === 'live').length
  const partialCount = surfaces.filter(s => s.status === 'partial').length
  if (liveCount === surfaces.length) return { label: 'superfícies: ✅ live', color: 'success' }
  if (liveCount > 0) return { label: `${liveCount}/${surfaces.length} live · ${partialCount} partial`, color: 'warning' }
  return { label: `${surfaces.length} planned`, color: 'info' }
}

const SolutionsPage = async ({ params }: { params: Promise<{ lang: string }> }) => {
  const { lang } = await params
  const user = await getSessionUser()

  if (user?.role !== 'admin') redirect(`/${lang}/app`)

  // ═══ Surface Health (dados REAIS do warp-surface-status.json) ═══
  const surfaceData = getSurfaces()

  return (
    <Grid container spacing={6}>
      {/* Header */}
      <Grid size={{ xs: 12 }}>
        <Typography variant='h4'>🎯 Solucoes adsentice</Typography>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap', mt: 1 }}>
          <Typography variant='body2' color='text.secondary'>
            Nossos produtos — do lead magnet ao enterprise · Superfícies Warp (22 definidas, 2 live)
          </Typography>
          <Chip label='Strategic Plan v2.0' size='small' color='primary' variant='tonal' />
          <Chip label={`S10 live · S11 live`} size='small' color='success' variant='tonal' />
        </Box>
      </Grid>

      {/* ═══ SURFACE HEALTH · C1 fix ═══ */}
      <Grid size={{ xs: 12 }}>
        <Alert severity={surfaceData ? 'info' : 'warning'} variant='outlined'>
          <Typography variant='subtitle2' fontWeight={700} gutterBottom>
            🏥 Surface Health · {surfaceData ? `${surfaceData.summary.live}/${surfaceData.summary.total} live` : 'dados indisponíveis'}
          </Typography>
          {surfaceData ? (
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Chip label={`${surfaceData.summary.live} live`} size='small' color='success' variant='tonal' />
              <Chip label={`${surfaceData.summary.partial} partial`} size='small' color='warning' variant='tonal' />
              <Chip label={`${surfaceData.summary.planned} planned`} size='small' color='default' variant='tonal' />
              <Chip label={`Total: ${surfaceData.summary.total} superfícies`} size='small' variant='outlined' />
            </Box>
          ) : (
            <Typography variant='caption'>warp-surface-status.json não encontrado</Typography>
          )}
          <Typography variant='caption' color='text.secondary' sx={{ mt: 1, display: 'block' }}>
            Cada plano depende de superfícies Warp para entregar valor ao cliente.
            Superfícies em &quot;planned&quot; ainda não têm rota ou código — o plano que as promete está vendendo produto em desenvolvimento.
          </Typography>
        </Alert>
      </Grid>

      {/* ═══ TOP METRICS ═══ */}
      <Grid size={{ xs: 6, sm: 2 }}>
        <CardStatVertical stats='5' title='Planos' subtitle='Free → R$1.497/mes' avatarColor='primary' avatarIcon='ri-stack-line' trendNumber='5' trend='positive' />
      </Grid>
      <Grid size={{ xs: 6, sm: 2.4 }}>
        <CardStatVertical stats='R$17.8K' title='MRR Projetado' subtitle='12 meses, cenario conservador' avatarColor='success' avatarIcon='ri-money-dollar-circle-line' trendNumber='17784' trend='positive' />
      </Grid>
      <Grid size={{ xs: 6, sm: 2.4 }}>
        <CardStatVertical stats='95%' title='Margem Media' subtitle='Custo $0.03-0.20/lead' avatarColor='warning' avatarIcon='ri-percent-line' trendNumber='95' trend='positive' />
      </Grid>
      <Grid size={{ xs: 6, sm: 2.4 }}>
        <CardStatVertical stats='Dia 1' title='Break-even' subtitle='Custo operacional: R$0' avatarColor='info' avatarIcon='ri-timer-flash-line' trendNumber='1' trend='positive' />
      </Grid>
      <Grid size={{ xs: 6, sm: 2.4 }}>
        <CardStatVertical stats='R$0' title='Google Ads CAC' subtitle='Nosso CAC: R$0 (organico)' avatarColor='error' avatarIcon='ri-google-line' trendNumber='0' trend='positive' />
      </Grid>

      {/* ═══ PLANOS ═══ */}
      <Grid size={{ xs: 12 }}>
        <Typography variant='h5' gutterBottom>
          <Chip label='PLANOS' size='medium' color='primary' sx={{ mr: 1, fontWeight: 700 }} />
          Pipeline L0-L4 → Produto
        </Typography>
        <Typography variant='body2' color='text.secondary' sx={{ mb: 2 }}>
          Cada plano corresponde a uma camada de enriquecimento. Quanto mais camadas, mais valor entregue.
        </Typography>
      </Grid>

      {PLANS.map((plan) => {
        const pStatus = planStatus(plan, surfaceData)
        const surfaces = surfaceData
          ? plan.surfaceIds.map(id => surfaceData.surfaces.find(s => s.id === id)).filter(Boolean) as SurfaceDef[]
          : []

        return (
          <Grid key={plan.name} size={{ xs: 12, md: 6 }}>
            <Card sx={{ borderTop: 3, borderColor: `${plan.color}.main` }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Box sx={{ width: 48, height: 48, borderRadius: 'var(--r-md)', bgcolor: `${plan.color}.50`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <i className={plan.icon} style={{ fontSize: '1.5rem', color: `var(--mui-palette-${plan.color}-main)` }} />
                    </Box>
                    <Box>
                      <Typography variant='h6'>{plan.name}</Typography>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Chip label={plan.price} size='small' color={plan.color} variant='tonal' sx={{ fontWeight: 700 }} />
                        <Chip label={plan.priceLabel} size='small' variant='outlined' />
                      </Box>
                    </Box>
                  </Box>
                  <Box sx={{ textAlign: 'right' }}>
                    <Typography variant='caption' color='text.secondary' component='div'>Margem</Typography>
                    <Typography variant='body2' fontWeight={700} color='success.main'>{plan.margin}</Typography>
                  </Box>
                </Box>

                <Typography variant='body2' color='text.secondary' sx={{ mb: 2 }}>{plan.description}</Typography>

                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
                  <Chip label={`Pipeline: ${plan.pipeline}`} size='small' variant='outlined' color='info' />
                  <Chip label={`${plan.signals} sinais`} size='small' variant='outlined' />
                  <Chip label={`Custo: ${plan.cost}`} size='small' variant='outlined' color='warning' />
                  <Chip label={pStatus.label} size='small' color={pStatus.color} variant='tonal' />
                </Box>

                {/* Surface badges per plan */}
                {surfaces.length > 0 && (
                  <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 2 }}>
                    {surfaces.map(s => {
                      const sc = surfaceStatusChip(s.status)
                      return (
                        <Chip key={s.id}
                          label={`${s.id} ${s.name} · ${sc.label}`}
                          size='small' variant='outlined' color={sc.color}
                          sx={{ fontSize: '0.65rem' }}
                        />
                      )
                    })}
                  </Box>
                )}

                <Typography variant='caption' fontWeight={600} color='text.secondary' gutterBottom component='div'>
                  O que entrega:
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, mb: 2 }}>
                  {plan.delivers.map((d, i) => (
                    <Typography key={i} variant='caption' sx={{ fontFamily: 'monospace', fontSize: '0.7rem' }}>• {d}</Typography>
                  ))}
                </Box>

                <Divider sx={{ my: 1 }} />
                <Typography variant='caption' color='text.secondary'>
                  <strong>Canais:</strong> {plan.channels.join(' · ')}
                </Typography>
                <Box sx={{ mt: 1 }}>
                  <Chip label={plan.persona} size='small' color={plan.color} variant='tonal' sx={{ fontSize: '0.65rem' }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        )
      })}

      {/* ═══ 3 PERSONAS ═══ */}
      <Grid size={{ xs: 12 }}>
        <Typography variant='h5' gutterBottom sx={{ mt: 2 }}>
          <Chip label='PERSONAS' size='medium' color='secondary' sx={{ mr: 1, fontWeight: 700 }} />
          Derivadas dos dados REAIS do Supabase
        </Typography>
      </Grid>

      {PERSONAS.map((p) => (
        <Grid key={p.name} size={{ xs: 12, md: 4 }}>
          <Card>
            <CardContent>
              <Typography variant='subtitle1' fontWeight={700} gutterBottom>{p.name}</Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1.5 }}>
                <Chip label={`${p.pct} do mercado`} size='small' color='secondary' variant='tonal' />
                <Chip label={p.schwartz} size='small' variant='outlined' />
                <Chip label={p.product} size='small' color='success' variant='tonal' sx={{ fontSize: '0.65rem' }} />
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                <Typography variant='caption' color='text.secondary'><strong>Idade:</strong> {p.age}</Typography>
                <Typography variant='caption' color='text.secondary'><strong>Clinica:</strong> {p.clinic} · Ticket: {p.ticket}</Typography>
                <Typography variant='caption' color='text.secondary'><strong>Dor:</strong> &ldquo;{p.pain}&rdquo;</Typography>
                <Typography variant='caption' color='text.secondary'><strong>Comportamento:</strong> {p.behavior}</Typography>
                <Box sx={{ mt: 1, p: 1.5, bgcolor: 'var(--pastel-sky)', borderRadius: 1 }}>
                  <Typography variant='caption' fontWeight={600}>🎯 Abordagem:</Typography>
                  <Typography variant='caption' color='text.secondary'>&ldquo;{p.approach}&rdquo;</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      ))}

      {/* ═══ PROJECAO ═══ */}
      <Grid size={{ xs: 12, md: 6 }}>
        <Card>
          <CardContent>
            <Typography variant='h6' gutterBottom>📈 Projecao Financeira (12 meses)</Typography>
            <Typography variant='caption' color='text.secondary' sx={{ mb: 2, display: 'block' }}>
              Cenario conservador · Break-even: Mes 1 · CAC: R$0 (organico)
            </Typography>
            <Box sx={{ mt: 2 }}>
              {PROJECTION.map((m) => (
                <Box key={m.month} sx={{ mb: 1.5 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant='body2' fontWeight={600}>Mes {m.month}</Typography>
                    <Typography variant='body2'>{m.sentinela} Sentinela · {m.dominio} Dominio</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <LinearProgress variant='determinate' value={Math.min((m.mrr / 20000) * 100, 100)}
                      color={m.mrr > 5000 ? 'success' : m.mrr > 2000 ? 'warning' : 'primary'}
                      sx={{ flex: 1, height: 8, borderRadius: 4 }} />
                    <Typography variant='body2' fontWeight={700} color='success.main'>R${m.mrr.toLocaleString('pt-BR')}</Typography>
                  </Box>
                </Box>
              ))}
            </Box>
          </CardContent>
        </Card>
      </Grid>

      {/* ═══ HUBS · Social + Marketplaces ═══ */}
      <Grid size={{ xs: 12, md: 6 }}>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <i className='ri-instagram-line' style={{ fontSize: '1.5rem', color: '#e1306c' }} />
              <Typography variant='h6'>📱 Social Media Hub</Typography>
            </Box>
            <Typography variant='body2' color='text.secondary' sx={{ mb: 2 }}>
              Detecta presenca em Instagram, Facebook, YouTube, TikTok, LinkedIn. Monitora frequencia de postagem,
              engajamento, link na bio e ultimo post. Compara com concorrentes locais.
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1.5 }}>
              <Chip label='Instagram' size='small' variant='outlined' />
              <Chip label='Facebook' size='small' variant='outlined' />
              <Chip label='TikTok' size='small' variant='outlined' />
              <Chip label='YouTube' size='small' variant='outlined' />
              <Chip label='LinkedIn' size='small' variant='outlined' />
            </Box>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Chip label='Social Presence (+10)' size='small' color='info' variant='tonal' />
              <Chip label='Social Engagement (+15)' size='small' color='info' variant='tonal' />
            </Box>
          </CardContent>
        </Card>
        <Card sx={{ mt: 2 }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <i className='ri-shopping-bag-3-line' style={{ fontSize: '1.5rem', color: '#f59e0b' }} />
              <Typography variant='h6'>🛒 Marketplaces Hub</Typography>
            </Box>
            <Typography variant='body2' color='text.secondary' sx={{ mb: 2 }}>
              Detecta presenca em marketplaces: iFood, Rappi, Booking, Mercado Livre, Doctoralia.
              Customer Independence Score.
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Chip label='iFood' size='small' variant='outlined' color='error' />
              <Chip label='Booking' size='small' variant='outlined' color='primary' />
              <Chip label='Mercado Livre' size='small' variant='outlined' color='warning' />
              <Chip label='Doctoralia' size='small' variant='outlined' color='info' />
            </Box>
          </CardContent>
        </Card>
      </Grid>

      {/* ═══ COCKPIT TOP-K ═══ */}
      <Grid size={{ xs: 12 }}>
        <Card sx={{ bgcolor: '#0a0a0a', color: '#fafafa' }}>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box sx={{ width: 32, height: 32, borderRadius: 'var(--r-sm)', background: 'linear-gradient(135deg, #0070f3, #0050a3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#fff' }}>FP</span>
                </Box>
                <Typography variant='h6' color='#fafafa'>🕹️ Cockpit TOP-K</Typography>
                <Chip label='Inspirado no EVO-API Founder Panel' size='small' variant='outlined' sx={{ color: '#a1a1aa', borderColor: '#27272a' }} />
              </Box>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Chip label='S15: planned' size='small' color='default' variant='tonal' />
              </Box>
            </Box>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 3 }}>
                <Box sx={{ p: 1.5, bgcolor: '#111113', borderRadius: 1, border: '1px solid #1f1f22' }}>
                  <Typography variant='caption' color='#71717a' component='div'>NarrativeCard</Typography>
                  <Typography variant='body2' color='#fafafa' fontWeight={600} sx={{ mt: 0.5 }}>&ldquo;Sua clinica esta invisivel para 5.000 pessoas&rdquo;</Typography>
                  <Typography variant='caption' color='#a1a1aa'>Explica O QUE acontece, nao apenas numeros</Typography>
                </Box>
              </Grid>
              <Grid size={{ xs: 12, sm: 3 }}>
                <Box sx={{ p: 1.5, bgcolor: '#111113', borderRadius: 1, border: '1px solid #1f1f22' }}>
                  <Typography variant='caption' color='#71717a' component='div'>AlertLane</Typography>
                  <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5, flexWrap: 'wrap' }}>
                    <Chip label='🔴 18 avaliacoes' size='small' sx={{ bgcolor: '#f43f5e22', color: '#f43f5e', fontSize: '0.6rem', height: 18 }} />
                    <Chip label='🟡 Score caindo' size='small' sx={{ bgcolor: '#f59e0b22', color: '#f59e0b', fontSize: '0.6rem', height: 18 }} />
                    <Chip label='🟢 Site +rapido' size='small' sx={{ bgcolor: '#10b98122', color: '#10b981', fontSize: '0.6rem', height: 18 }} />
                  </Box>
                  <Typography variant='caption' color='#a1a1aa'>Prioridades: critico → atencao → info</Typography>
                </Box>
              </Grid>
              <Grid size={{ xs: 12, sm: 3 }}>
                <Box sx={{ p: 1.5, bgcolor: '#111113', borderRadius: 1, border: '1px solid #1f1f22' }}>
                  <Typography variant='caption' color='#71717a' component='div'>Copilot IA</Typography>
                  <Typography variant='body2' color='#0070f3' fontWeight={600} sx={{ mt: 0.5, fontFamily: 'monospace', fontSize: '0.75rem' }}>&ldquo;O que eu faco hoje?&rdquo;</Typography>
                  <Typography variant='caption' color='#a1a1aa'>Chat lateral com IA ancorada em dados reais</Typography>
                </Box>
              </Grid>
              <Grid size={{ xs: 12, sm: 3 }}>
                <Box sx={{ p: 1.5, bgcolor: '#111113', borderRadius: 1, border: '1px solid #1f1f22' }}>
                  <Typography variant='caption' color='#71717a' component='div'>PatchCard</Typography>
                  <Chip label='Aplicar recomendacao →' size='small' color='info' variant='tonal' sx={{ mt: 0.5 }} />
                  <Typography variant='caption' color='#a1a1aa'>1 clique = executa ou agenda acao</Typography>
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Grid>

      {/* ═══ GROWTH OS TEAM ═══ */}
      <Grid size={{ xs: 12 }}>
        <Typography variant='h5' gutterBottom sx={{ mt: 2 }}>
          <Chip label='GROWTH OS · TEAM' size='medium' color='info' sx={{ mr: 1, fontWeight: 700 }} />
          Para Agencias · Franquias · Equipes
        </Typography>
      </Grid>

      <Grid size={{ xs: 12, md: 6 }}>
        <Card>
          <CardContent>
            <Typography variant='h6' gutterBottom>🏢 Funcionalidades Team</Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {[
                { feat: 'Multi-user (3-10)', desc: 'Admin, Analista, Cliente, Somente Leitura', color: 'primary' },
                { feat: 'White-label', desc: 'Dashboard com logo e cores do cliente final', color: 'info' },
                { feat: 'Client Portal', desc: 'Cada cliente acessa SEU cockpit', color: 'success' },
                { feat: 'Team Analytics', desc: 'Produtividade: quem respondeu mais? Quem fechou mais?', color: 'warning' },
                { feat: 'Approval Workflow', desc: 'Recomendacoes passam por aprovacao antes de executar', color: 'secondary' },
                { feat: 'Bulk Operations', desc: 'Aplicar acao em TODOS os clientes de uma vez', color: 'error' },
              ].map((t) => (
                <Box key={t.feat} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Chip label={t.feat} size='small' color={t.color as any} variant='tonal' />
                  <Typography variant='caption' color='text.secondary'>{t.desc}</Typography>
                </Box>
              ))}
            </Box>
          </CardContent>
        </Card>
      </Grid>

      <Grid size={{ xs: 12, md: 6 }}>
        <Card>
          <CardContent>
            <Typography variant='h6' gutterBottom>🔐 Roles & Permissoes (RBAC)</Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {[
                { role: 'Admin (agencia)', perms: 'Gerencia todos os clientes, usuarios, billing, white-label', color: 'error' },
                { role: 'Analista (agencia)', perms: 'Executa diagnosticos, responde reviews, aplica recomendacoes', color: 'warning' },
                { role: 'Cliente (negocio)', perms: 'Acesso somente ao seu cockpit, aprova/rejeita recomendacoes', color: 'primary' },
                { role: 'Somente Leitura', perms: 'Visualiza dashboard, nao interage', color: 'info' },
              ].map((r) => (
                <Box key={r.role}>
                  <Chip label={r.role} size='small' color={r.color as any} variant='tonal' sx={{ mb: 0.5 }} />
                  <Typography variant='caption' color='text.secondary' component='div'>{r.perms}</Typography>
                </Box>
              ))}
            </Box>
          </CardContent>
        </Card>

        <Card sx={{ mt: 2 }}>
          <CardContent>
            <Typography variant='h6' gutterBottom>💰 Precificacao Growth OS</Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {[
                { tier: 'Solo', users: 1, clients: 1, price: 'R$997' },
                { tier: 'Team', users: 5, clients: 10, price: 'R$1.497' },
                { tier: 'Agency', users: 20, clients: 50, price: 'R$2.997' },
                { tier: 'Enterprise', users: 'ilimitado', clients: 'ilimitado', price: 'R$4.997' },
              ].map((p) => (
                <Box key={p.tier} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                    <Typography variant='body2' fontWeight={600}>{p.tier}</Typography>
                    <Chip label={`${p.users} users · ${p.clients} clientes`} size='small' variant='outlined' sx={{ fontSize: '0.6rem' }} />
                  </Box>
                  <Typography variant='body2' fontWeight={700} color='primary.main'>{p.price}/mes</Typography>
                </Box>
              ))}
            </Box>
          </CardContent>
        </Card>
      </Grid>

      {/* ═══ ANTI-ESTRATEGIA ═══ */}
      <Grid size={{ xs: 12 }}>
        <Alert severity='info' variant='outlined'>
          <Typography variant='subtitle2' fontWeight={700} gutterBottom>🎯 Metricas de Sucesso (90 dias)</Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {[
              'Leads enriquecidos: 8.626 → 15.000',
              'Categorias prospectadas: 6/29 → 15/29',
              'Clientes pagantes: 0 → 10',
              'MRR: R$0 → R$1.970',
              'S10 Raio-X gerados: 4 → 100',
              'BOA: 0.88 → 0.95',
            ].map(m => (
              <Chip key={m} label={m} size='small' color='info' variant='outlined' sx={{ fontFamily: 'monospace', fontSize: '0.7rem' }} />
            ))}
          </Box>
        </Alert>
      </Grid>
    </Grid>
  )
}

export default SolutionsPage
