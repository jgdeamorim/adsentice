
// adsentice · Admin / Criteria — Pain Criteria v1.2
// Schwartz Awareness Levels + Compound Score + ESC Lead Scoring
import { redirect } from 'next/navigation'

import Grid from '@mui/material/Grid2'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import Chip from '@mui/material/Chip'
import Box from '@mui/material/Box'
import Divider from '@mui/material/Divider'

import CardStatVertical from '@components/card-statistics/Vertical'
import { getSessionUser } from '@/libs/supabase/server'
import { SCHWARTZ_LEVELS } from '@/lib/scoring'

interface PainSignal {
  id: string
  name: string
  condition: string
  points: number
  dimension: 'Fit' | 'Engagement' | 'Intent'
  layer: 'L0' | 'L1' | 'L2' | 'L3'
  description: string
  impact: string
}

const FIT_SIGNALS: PainSignal[] = [
  { id: 'F1', name: 'Categoria no ICP', condition: 'category ∈ 57 categorias BR', points: 15, dimension: 'Fit', layer: 'L0', description: 'Negócio está nas categorias-alvo do adsentice', impact: 'Lead fora do ICP = desperdício de aquisição.' },
  { id: 'F2', name: 'Porte do Negócio', condition: 'rating_votes ≥ 10', points: 10, dimension: 'Fit', layer: 'L0', description: 'Negócio estabelecido com volume suficiente de avaliações', impact: 'Negócios com poucas reviews são arriscados (podem ser novos ou inativos).' },
  { id: 'F3', name: 'Tem Website', condition: 'website ≠ null', points: 10, dimension: 'Fit', layer: 'L0', description: 'Presença web com domínio próprio', impact: 'Sem website = invisível online (40pts Intent!). Lead precisa de site antes de SEO.' },
  { id: 'F4', name: 'Tem Telefone', condition: 'phone ≠ null', points: 5, dimension: 'Fit', layer: 'L0', description: 'Canal de contato existe no perfil', impact: 'Sem telefone = difícil contato. +15pts Intent se também sem website (R5).' },
  { id: 'F5', name: 'Região Mapeada', condition: 'address presente', points: 5, dimension: 'Fit', layer: 'L0', description: 'Endereço preenchido no GMB', impact: 'Permite validação NAP e cálculo de densidade competitiva.' },
  { id: 'F6', name: 'Horário Preenchido', condition: 'business_status = OPERATIONAL', points: 5, dimension: 'Fit', layer: 'L0', description: 'Negócio operacional com horário no GMB', impact: 'Negócio ativo = pode atender leads. Fechado = excluir.' },
  { id: 'F7', name: 'Descrição Preenchida', condition: 'description ≠ null', points: 5, dimension: 'Fit', layer: 'L0', description: 'Descrição do negócio no GMB', impact: 'Sem descrição = SEO local fraco. 5 minutos para corrigir.' },
  { id: 'F8', name: 'Serviços Listados', condition: 'categories[] length ≥ 2', points: 5, dimension: 'Fit', layer: 'L0', description: 'Múltiplas categorias no GMB', impact: 'Cada categoria extra = +alcance. Concorrentes usam 5-7 categorias.' },
  { id: 'F9', name: 'Domínio Próprio', condition: 'website é domínio próprio', points: 5, dimension: 'Fit', layer: 'L0', description: 'Não é Wix, Linktree, Facebook como site', impact: 'Domínio próprio = profissional. Wix/Linktree = amador, perde credibilidade.' },
  { id: 'F10', name: 'CNPJ Ativo', condition: 'business_status = OPERATIONAL', points: 5, dimension: 'Fit', layer: 'L0', description: 'Negócio não marcado como fechado', impact: 'Anti-falso-positivo R3: fechado = excluir.' },
]

const ENGAGEMENT_SIGNALS: PainSignal[] = [
  { id: 'E1', name: 'Rating Bom', condition: 'rating_value ≥ 4.0', points: 15, dimension: 'Engagement', layer: 'L0', description: 'Lead se importa com reputação', impact: 'Rating alto = orgulho do negócio. Rating baixo = oportunidade de melhoria.' },
  { id: 'E2', name: 'Reviews Recentes', condition: 'review_velocity > 0 nos últimos 60d', points: 15, dimension: 'Engagement', layer: 'L0', description: 'Atividade recente — negócio não está parado', impact: 'Sem reviews recentes = possível abandono (T1.3 legacy).' },
  { id: 'E3', name: 'Fotos Suficientes', condition: 'total_photos ≥ benchmark por categoria', points: 10, dimension: 'Engagement', layer: 'L0', description: 'Dentista: 15 min · Restaurante: 25 min · Veja benchmarks', impact: 'Fotos insuficientes = perfil largado. Cliente desconfia.' },
  { id: 'E4', name: 'Perfil Reivindicado', condition: 'is_claimed = true', points: 10, dimension: 'Engagement', layer: 'L0', description: 'Dono controla o próprio perfil', impact: 'NÃO reivindicado = I1 (25pts Intent). Maior sinal de abandono.' },
  { id: 'E5', name: 'WhatsApp Business', condition: 'telefone é WhatsApp', points: 10, dimension: 'Engagement', layer: 'L0', description: 'Canal #1 de venda no Brasil', impact: 'Sem WhatsApp = perde ~80% dos clientes potenciais no BR.' },
  { id: 'E6', name: 'Posts no GMB', condition: 'total_photos ≥ benchmark.good', points: 5, dimension: 'Engagement', layer: 'L0', description: 'Proxy: fotos acima da média indicam perfil ativo', impact: 'GMB ativo = dono investe tempo no digital.' },
  { id: 'E7', name: 'Q&A Ativo', condition: 'descrição > 50 chars + is_claimed', points: 5, dimension: 'Engagement', layer: 'L0', description: 'Proxy: tem descrição E é reivindicado', impact: 'Perfil completo + reivindicado = dono engajado.' },
]

const INTENT_SIGNALS: PainSignal[] = [
  { id: 'I1', name: 'NÃO Reivindicado', condition: 'is_claimed = false', points: 25, dimension: 'Intent', layer: 'L0', description: 'NÃO controla o próprio perfil GMB', impact: 'Maior sinal de urgência. Lead não sabe que existe painel GMB. Fácil de resolver.' },
  { id: 'I2', name: 'Reputação Tóxica', condition: 'rating ≤ 3.5 E reviews ≥ 5', points: 20, dimension: 'Intent', layer: 'L0', description: 'Reviews negativas visíveis com volume suficiente', impact: 'Clientes fogem ao ver avaliações ruins. Perda direta de receita. Urgente.' },
  { id: 'I3', name: 'Perfil Abandonado', condition: 'total_photos < 3 OU reviews < 5', points: 15, dimension: 'Intent', layer: 'L0', description: 'Parece largado — cliente desconfia', impact: 'Sinal de que o dono não está ativo no digital. Lead mais difícil de converter.' },
]

const WEBSITE_SIGNALS: PainSignal[] = [
  { id: 'W1', name: 'Sem HTTPS', condition: 'HTTP apenas (Lighthouse)', points: 20, dimension: 'Intent', layer: 'L1', description: 'Site sem segurança — Chrome mostra "Não seguro"', impact: 'Risco de segurança real. Perde cliente imediatamente.' },
  { id: 'W2', name: 'Core Web Vitals Ruins', condition: 'LCP > 4s OU CLS > 0.25', points: 10, dimension: 'Engagement', layer: 'L1', description: 'Performance abaixo do aceitável', impact: '70% dos usuários abandonam site que demora > 3s.' },
  { id: 'W3', name: 'Mobile Ruim', condition: 'Mobile score < 40', points: 10, dimension: 'Engagement', layer: 'L1', description: 'Experiência mobile quebrada', impact: '70%+ do tráfego BR é mobile. Site quebrado = venda perdida.' },
  { id: 'W4', name: 'Sem Meta Tags', condition: 'Title OU description ausente', points: 8, dimension: 'Engagement', layer: 'L1', description: 'SEO on-page básico ausente', impact: 'Google não sabe do que se trata a página. Ranqueia mal.' },
  { id: 'W5', name: 'Sem Analytics', condition: 'Nenhum GA4/GTM/Pixel detectado', points: 10, dimension: 'Engagement', layer: 'L1', description: 'Não mede tráfego — decisões no escuro', impact: 'Dono não sabe quantas pessoas visitam o site. Fácil de instalar.' },
  { id: 'W6', name: 'CMS Desatualizado', condition: 'WordPress sem updates > 6 meses', points: 5, dimension: 'Engagement', layer: 'L1', description: 'Risco de segurança', impact: 'Vender auditoria técnica + atualização. Porta de entrada.' },
  { id: 'W7', name: 'Sem Blog/Conteúdo', condition: 'Último post > 90 dias', points: 5, dimension: 'Fit', layer: 'L1', description: 'Sem estratégia de conteúdo', impact: 'Conteúdo é o que ranqueia. Lead não investe nisso.' },
  { id: 'W8', name: 'Sem Schema Markup', condition: 'JSON-LD LocalBusiness ausente', points: 5, dimension: 'Engagement', layer: 'L1', description: 'Dados estruturados ausentes', impact: 'Google não entende o negócio. Perde rich results.' },
]

const CriteriaPage = async ({ params }: { params: Promise<{ lang: string }> }) => {
  const { lang } = await params
  const user = await getSessionUser()

  if (user?.role !== 'admin') redirect(`/${lang}/app`)

  const fitPts = FIT_SIGNALS.reduce((s, sig) => s + sig.points, 0)
  const engPts = ENGAGEMENT_SIGNALS.reduce((s, sig) => s + sig.points, 0)
  const intentPts = INTENT_SIGNALS.reduce((s, sig) => s + sig.points, 0)

  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12 }}>
        <Typography variant='h4'>🎯 Critérios de Atração</Typography>
        <Typography variant='body2' color='text.secondary'>
          Pain Criteria v1.2 — Score Composto (Fit×0.40 + Engagement×0.35 + Intent×0.25) · Schwartz Awareness Levels
        </Typography>
      </Grid>

      {/* ── Dimension Summary Cards ── */}
      <Grid size={{ xs: 12, sm: 4 }}>
        <CardStatVertical
          stats={`${FIT_SIGNALS.length}`}
          title='Fit · ICP Match'
          subtitle={`${fitPts}pts max · 10 sinais · peso 0.40`}
          avatarColor='primary'
          avatarIcon='ri-user-search-line'
          trendNumber={String(FIT_SIGNALS.length)}
          trend='positive'
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 4 }}>
        <CardStatVertical
          stats={`${ENGAGEMENT_SIGNALS.length}`}
          title='Engagement · Atividade'
          subtitle={`${engPts}pts max · 7 sinais · peso 0.35`}
          avatarColor='warning'
          avatarIcon='ri-bar-chart-line'
          trendNumber={String(ENGAGEMENT_SIGNALS.length)}
          trend='positive'
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 4 }}>
        <CardStatVertical
          stats={`${INTENT_SIGNALS.length}`}
          title='Intent · Urgência'
          subtitle={`${intentPts}pts max · 3 sinais · peso 0.25`}
          avatarColor='error'
          avatarIcon='ri-alert-line'
          trendNumber={String(INTENT_SIGNALS.length)}
          trend='negative'
        />
      </Grid>

      {/* ── Schwartz Awareness Levels ── */}
      <Grid size={{ xs: 12 }}>
        <Card>
          <CardContent>
            <Typography variant='h6' gutterBottom>🧠 Níveis de Consciência (Eugene Schwartz, 1966)</Typography>
            <Typography variant='body2' sx={{ mb: 3 }}>
              O Score Composto determina o nível de consciência do lead — e cada nível tem uma regra de abordagem.
              Baseado em 50+ anos de direct response marketing.
            </Typography>
            <Grid container spacing={3}>
              {([1, 2, 3, 4, 5] as const).map((level) => {
                const def = SCHWARTZ_LEVELS[level]
                const ranges = ['0-29', '30-49', '50-69', '70-84', '85-100']
                const colors = ['success', 'info', 'warning', 'error', 'error'] as const

                
return (
                  <Grid key={level} size={{ xs: 12, sm: 4, md: 2.4 }}>
                    <Card sx={{ borderLeft: 4, borderColor: `${colors[level - 1]}.main` }}>
                      <CardContent>
                        <Typography variant='subtitle2' fontWeight={700}>{def.label}</Typography>
                        <Typography variant='h5' fontWeight={800} sx={{ color: `${colors[level - 1]}.main` }}>
                          {ranges[level - 1]}
                        </Typography>
                        <Typography variant='caption' color='text.secondary' sx={{ display: 'block', mb: 1 }}>
                          {def.action}
                        </Typography>
                        <Divider sx={{ my: 1 }} />
                        <Typography variant='caption' color='error.main' fontWeight={600}>
                          🚫 {def.messagingRule}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                )
              })}
            </Grid>
          </CardContent>
        </Card>
      </Grid>

      {/* ── Compound Score Formula ── */}
      <Grid size={{ xs: 12 }}>
        <Card sx={{ bgcolor: 'var(--pastel-sky)' }}>
          <CardContent>
            <Typography variant='h6' gutterBottom>📐 Fórmula do Score Composto</Typography>
            <Grid container spacing={3} alignItems='center'>
              <Grid size={{ xs: 12, md: 6 }}>
                <Box sx={{ fontFamily: 'monospace', fontSize: '1.1rem', p: 2, bgcolor: 'white', borderRadius: 1 }}>
                  <Typography variant='body1' sx={{ fontFamily: 'monospace' }}>
                    <strong>Fit</strong> (0-70 → 0-100) × <Chip label='0.40' size='small' color='primary' variant='tonal' /><br />
                    + <strong>Engagement</strong> (0-70 → 0-100) × <Chip label='0.35' size='small' color='warning' variant='tonal' /><br />
                    + <strong>Intent</strong> (0-60 → 0-100) × <Chip label='0.25' size='small' color='error' variant='tonal' /><br />
                    ─────────────────────────<br />
                    = <strong>Score Composto</strong> (0-100)
                  </Typography>
                </Box>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <Typography variant='body2' sx={{ mb: 1 }}>
                  Cada dimensão é normalizada para 0-100 antes da ponderação.
                  Sinais com dados ausentes = 0pts (conservador).
                </Typography>
                <Typography variant='body2' sx={{ mb: 1 }}>
                  <strong>Confiança:</strong> fração dos 20 sinais com dados disponíveis (0-1).
                  Quanto mais camadas de enriquecimento (L0→L3), maior a confiança.
                </Typography>
                <Typography variant='caption' color='text.secondary'>
                  Inspirado no lead scoring architecture do ESC gui.marketing e 50+ anos de direct response (Eugene Schwartz).
                </Typography>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Grid>

      {/* ── Decay + Calibration ── */}
      <Grid size={{ xs: 12, sm: 6 }}>
        <Card>
          <CardContent>
            <Typography variant='h6' gutterBottom>⏳ Decay de Engagement</Typography>
            <Typography variant='body2' sx={{ mb: 2 }}>
              Scoring sem decay gera leads fantasmas em &lt;90 dias (ESC anti-pattern #3).
            </Typography>
            <Box sx={{ fontFamily: 'monospace', fontSize: '0.85rem', p: 1.5, bgcolor: 'grey.50', borderRadius: 1 }}>
              <Typography variant='caption' component='div' sx={{ fontFamily: 'monospace' }}>
                Após <strong>30 dias</strong> sem nova interação:<br />
                → <strong>-5 pts/dia</strong> no Engagement Score<br />
                → Mínimo: <strong>5 pts</strong> (nunca zera)<br />
                → Novo sinal (review, foto, post) = <strong>reset</strong><br />
                → Fit e Intent <strong>NÃO</strong> sofrem decay (são estruturais)
              </Typography>
            </Box>
          </CardContent>
        </Card>
      </Grid>
      <Grid size={{ xs: 12, sm: 6 }}>
        <Card>
          <CardContent>
            <Typography variant='h6' gutterBottom>📅 Calibração Mensal</Typography>
            <Typography variant='body2' sx={{ mb: 1 }}>
              <strong>Frequência:</strong> 1º dia útil de cada mês
            </Typography>
            <Box component='ul' sx={{ pl: 2, '& li': { fontSize: '0.85rem', mb: 0.5 } }}>
              <li>Taxa de conversão real por nível Schwartz</li>
              <li>% Problem Aware → Solution Aware (target: 10-20%)</li>
              <li>% Solution Aware → Product Aware (target: 5-10%)</li>
              <li>% de falsos positivos (lead quente que não converteu)</li>
              <li>Recalcular pesos se necessário</li>
              <li>Ajustar thresholds dos níveis Schwartz</li>
              <li>Atualizar decay rate baseado no ciclo de vendas real</li>
            </Box>
          </CardContent>
        </Card>
      </Grid>

      {/* ── Fit Signals ── */}
      <Grid size={{ xs: 12 }}>
        <Typography variant='h6' gutterBottom>
          <Chip label={`FIT · ICP MATCH (${FIT_SIGNALS.length} sinais)`} color='primary' size='small' sx={{ mr: 1 }} />
          Peso 0.40 — O lead é o cliente ideal? Max 70pts raw
        </Typography>
        <Grid container spacing={3}>
          {FIT_SIGNALS.map((sig) => (
            <Grid key={sig.id} size={{ xs: 12, sm: 6, md: 4 }}>
              <Card sx={{ borderTop: 3, borderColor: 'primary.main' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Chip label={sig.id} size='small' color='primary' variant='tonal' />
                    <Chip label={`${sig.points} pts`} size='small' color='primary' variant='outlined' />
                  </Box>
                  <Typography variant='subtitle2' fontWeight={700} gutterBottom>{sig.name}</Typography>
                  <Typography variant='caption' component='div' sx={{ fontFamily: 'monospace', bgcolor: 'grey.50', p: 0.5, borderRadius: 1, mb: 1 }}>
                    {sig.condition}
                  </Typography>
                  <Typography variant='body2' color='text.secondary' sx={{ mb: 1 }}>{sig.description}</Typography>
                  <Divider sx={{ my: 1 }} />
                  <Typography variant='caption' color='primary.main' fontWeight={600}>
                    💡 {sig.impact}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Grid>

      {/* ── Engagement Signals ── */}
      <Grid size={{ xs: 12 }}>
        <Typography variant='h6' gutterBottom>
          <Chip label={`ENGAGEMENT · ATIVIDADE (${ENGAGEMENT_SIGNALS.length} sinais)`} color='warning' size='small' sx={{ mr: 1 }} />
          Peso 0.35 — O lead se importa com presença digital? Max 70pts raw
        </Typography>
        <Grid container spacing={3}>
          {ENGAGEMENT_SIGNALS.map((sig) => (
            <Grid key={sig.id} size={{ xs: 12, sm: 6, md: 4 }}>
              <Card sx={{ borderTop: 3, borderColor: 'warning.main' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Chip label={sig.id} size='small' color='warning' variant='tonal' />
                    <Chip label={`${sig.points} pts`} size='small' color='warning' variant='outlined' />
                  </Box>
                  <Typography variant='subtitle2' fontWeight={700} gutterBottom>{sig.name}</Typography>
                  <Typography variant='caption' component='div' sx={{ fontFamily: 'monospace', bgcolor: 'grey.50', p: 0.5, borderRadius: 1, mb: 1 }}>
                    {sig.condition}
                  </Typography>
                  <Typography variant='body2' color='text.secondary' sx={{ mb: 1 }}>{sig.description}</Typography>
                  <Divider sx={{ my: 1 }} />
                  <Typography variant='caption' color='warning.main' fontWeight={600}>
                    💡 {sig.impact}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Grid>

      {/* ── Intent Signals ── */}
      <Grid size={{ xs: 12 }}>
        <Typography variant='h6' gutterBottom>
          <Chip label={`INTENT · URGÊNCIA (${INTENT_SIGNALS.length} sinais)`} color='error' size='small' sx={{ mr: 1 }} />
          Peso 0.25 — O lead está em momento de compra? Max 60pts raw
        </Typography>
        <Grid container spacing={3}>
          {INTENT_SIGNALS.map((sig) => (
            <Grid key={sig.id} size={{ xs: 12, sm: 6, md: 4 }}>
              <Card sx={{ borderTop: 3, borderColor: 'error.main' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Chip label={sig.id} size='small' color='error' variant='tonal' />
                    <Chip label={`${sig.points} pts`} size='small' color='error' variant='outlined' />
                  </Box>
                  <Typography variant='subtitle2' fontWeight={700} gutterBottom>{sig.name}</Typography>
                  <Typography variant='caption' component='div' sx={{ fontFamily: 'monospace', bgcolor: 'grey.50', p: 0.5, borderRadius: 1, mb: 1 }}>
                    {sig.condition}
                  </Typography>
                  <Typography variant='body2' color='text.secondary' sx={{ mb: 1 }}>{sig.description}</Typography>
                  <Divider sx={{ my: 1 }} />
                  <Typography variant='caption' color='error.main' fontWeight={600}>
                    💡 {sig.impact}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Grid>

      {/* ── Website Signals (Tier 3 · Lighthouse) ── */}
      <Grid size={{ xs: 12 }}>
        <Typography variant='h6' gutterBottom>
          <Chip label='WEBSITE · TIER 3' color='info' size='small' sx={{ mr: 1 }} />
          Enriquecimento Lighthouse · 8 sinais · +73pts distribuídos
          <Chip label='Simulado até v0.3' size='small' color='default' variant='tonal' sx={{ ml: 2 }} />
        </Typography>
        <Grid container spacing={3}>
          {WEBSITE_SIGNALS.map((sig) => (
            <Grid key={sig.id} size={{ xs: 12, sm: 6, md: 4 }}>
              <Card sx={{ borderTop: 3, borderColor: 'info.main', opacity: 0.8 }}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Chip label={sig.id} size='small' color='info' variant='tonal' />
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Chip label={sig.dimension} size='small' color={sig.dimension === 'Intent' ? 'error' : 'warning'} variant='outlined' />
                      <Chip label={`${sig.points} pts`} size='small' color='info' variant='outlined' />
                    </Box>
                  </Box>
                  <Typography variant='subtitle2' fontWeight={700} gutterBottom>{sig.name}</Typography>
                  <Typography variant='caption' component='div' sx={{ fontFamily: 'monospace', bgcolor: 'grey.50', p: 0.5, borderRadius: 1, mb: 1 }}>
                    {sig.condition}
                  </Typography>
                  <Typography variant='caption' color='text.secondary'>{sig.impact}</Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Grid>

      {/* ── Anti-False-Positive Rules ── */}
      <Grid size={{ xs: 12 }}>
        <Card sx={{ bgcolor: 'var(--pastel-sky)' }}>
          <CardContent>
            <Typography variant='h6' gutterBottom>🛡️ Regras Anti-Falso-Positivo</Typography>
            <Grid container spacing={2}>
              {[
                'Sem GMB → ignorar (sem dados para avaliar)',
                '< 3 reviews → reduzir peso do rating em 50% (amostra pequena)',
                'Fechado (business_status ≠ OPERATIONAL) → excluir',
                'Franquia/Rede (> 5 locações) → classificar ENTERPRISE',
                'Sem telefone E sem website → +15 pts bônus no Intent (offline total)',
                'Tem website mas sem dados de SEO → usar estimativa GMB',
              ].map((rule, i) => (
                <Grid key={i} size={{ xs: 12, sm: 6 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Chip label={`R${i + 1}`} size='small' variant='outlined' />
                    <Typography variant='body2'>{rule}</Typography>
                  </Box>
                </Grid>
              ))}
            </Grid>
          </CardContent>
        </Card>
      </Grid>

      {/* ── Derived Fields ── */}
      <Grid size={{ xs: 12 }}>
        <Card>
          <CardContent>
            <Typography variant='h6' gutterBottom>🔧 Campos Derivados (calculados pelo Scoring Engine)</Typography>
            <Grid container spacing={2}>
              {[
                ['whatsapp_detected', 'Regex DDI 55 + celular no telefone', '95% precisão para números BR'],
                ['review_velocity', 'rating_votes / 36 meses (estimativa)', 'Reviews/mês. < 1 = estagnado, > 10 = ativo'],
                ['photos_per_rating', 'total_photos / rating_votes', '< 0.5 = não investe em imagem, > 2.0 = visualmente ativo'],
                ['category_coverage', 'categories[] length vs TOP 5 concorrentes', '< 50% das categorias = tráfego perdido'],
                ['description_quality', 'Score 0-60: length + keywords + CTA + link + localização', '25/60 = descrição largada, 50/60 = excelente'],
                ['domain_type', 'proprio | wix | linktree | facebook | google_sites', 'Domínio próprio = profissional. Linktree = não é website.'],
              ].map(([field, condition, note]) => (
                <Grid key={field} size={{ xs: 12, sm: 6 }}>
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mb: 1 }}>
                    <Chip label={field} size='small' color='secondary' variant='tonal' sx={{ fontFamily: 'monospace', fontSize: '0.7rem' }} />
                    <Box>
                      <Typography variant='body2' fontWeight={600}>{condition}</Typography>
                      <Typography variant='caption' color='text.secondary'>{note}</Typography>
                    </Box>
                  </Box>
                </Grid>
              ))}
            </Grid>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  )
}

export default CriteriaPage
