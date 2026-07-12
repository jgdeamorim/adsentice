
// adsentice · Admin / Criteria — configuração dos Pain Criteria v1.1
// 20 sinais em 3 tiers com thresholds, pesos, e explicações
import { redirect } from 'next/navigation'
import Grid from '@mui/material/Grid2'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import Chip from '@mui/material/Chip'
import Box from '@mui/material/Box'
import LinearProgress from '@mui/material/LinearProgress'
import Divider from '@mui/material/Divider'
import CardStatVertical from '@components/card-statistics/Vertical'
import { getSessionUser } from '@/libs/supabase/server'

interface PainSignal {
  id: string
  name: string
  condition: string
  points: number
  tier: 1 | 2 | 3
  category: string
  description: string
  impact: string
}

const PAIN_SIGNALS: PainSignal[] = [
  // TIER 1 · CRÍTICO
  { id: 'T1.1', name: 'Website Invisível', condition: 'Tem site E SEO < 30%', points: 35, tier: 1, category: 'Website', description: 'Existe mas ninguém acha — o pior cenário', impact: 'Perda total de tráfego orgânico. Clientes não encontram o negócio.' },
  { id: 'T1.2', name: 'Reputação Tóxica', condition: 'Rating ≤ 3.5★ E reviews > 5', points: 35, tier: 1, category: 'Reputação', description: 'Reviews negativas visíveis com volume suficiente', impact: 'Clientes desistem ao ver avaliações ruins. Perda direta de receita.' },
  { id: 'T1.3', name: 'Negócio Estagnado', condition: '0 reviews nos últimos 60 dias', points: 20, tier: 1, category: 'Engajamento', description: 'Sem atividade recente — possível abandono', impact: 'Sinal de que o dono não está ativo no digital. Lead mais difícil de converter.' },
  { id: 'T1.4', name: 'Owner Ausente', condition: 'Reviews ≤2★ sem resposta', points: 30, tier: 1, category: 'Engajamento', description: 'Não engaja com cliente — perde vendas', impact: 'Cliente reclama e ninguém responde. Imagem de descaso.' },
  { id: 'T1.5', name: 'Sem Presença Web', condition: 'Sem website', points: 25, tier: 1, category: 'Website', description: 'Invisível online — só existe no GMB', impact: 'Limita o que podemos vender. Lead precisa de site antes de SEO.' },

  // TIER 2 · ALTO
  { id: 'T2.1', name: 'SEO Abaixo da Média', condition: 'Tem site E SEO 30-60%', points: 20, tier: 2, category: 'Website', description: 'Abaixo da média BR (~50%). Melhorável', impact: 'Otimização traz resultado rápido. Fácil de demonstrar ROI.' },
  { id: 'T2.2', name: 'Reputação Medíocre', condition: 'Rating 3.5-3.8★ E reviews > 10', points: 20, tier: 2, category: 'Reputação', description: 'Não é terrível mas afasta clientes', impact: 'Poucas melhorias já sobem a nota. Quick win demonstrável.' },
  { id: 'T2.3', name: 'Perfil Abandonado', condition: '< 3 fotos no GMB', points: 20, tier: 2, category: 'GMB', description: 'Parece largado — cliente desconfia', impact: 'Adicionar fotos é grátis e aumenta confiança imediatamente.' },
  { id: 'T2.4', name: 'Sem WhatsApp', condition: 'Tem telefone mas NÃO é WhatsApp', points: 15, tier: 2, category: 'Contato', description: 'Canal #1 de venda no Brasil ausente', impact: 'Brasil: 80%+ das vendas SMB são por WhatsApp. Sem ele = perde venda.' },
  { id: 'T2.5', name: 'Pressão Competitiva', condition: '≥ 3 concorrentes no raio de 3km', points: 15, tier: 2, category: 'Concorrência', description: 'Mercado disputado — precisa se destacar', impact: 'Lead sente a concorrência. Nossa proposta de diferenciação é o que ele precisa.' },
  { id: 'T2.6', name: 'Reviews Caindo', condition: 'Média 60d < média geral', points: 20, tier: 2, category: 'Reputação', description: 'Tendência negativa — vai piorar', impact: 'Urgência embutida. Se não agir agora, rating vai cair mais.' },

  // TIER 3 · MODERADO
  { id: 'T3.1', name: 'Sem Analytics', condition: 'Tem site MAS sem GA4/Pixel', points: 10, tier: 3, category: 'Website', description: 'Não mede tráfego — decisões no escuro', impact: 'Dono não sabe quantas pessoas visitam o site. Fácil de instalar e mostrar valor.' },
  { id: 'T3.2', name: 'Não Anuncia', condition: 'Sem Google Ads ativo', points: 8, tier: 3, category: 'Ads', description: 'Não investe em aquisição paga', impact: 'Oportunidade de upsell futuro (gestão de Ads).' },
  { id: 'T3.3', name: 'CMS Desatualizado', condition: 'WordPress sem updates > 6 meses', points: 8, tier: 3, category: 'Website', description: 'Risco de segurança', impact: 'Vender auditoria técnica + atualização. Porta de entrada.' },
  { id: 'T3.4', name: 'Sem Blog/Conteúdo', condition: 'Sem blog ou último post > 90 dias', points: 5, tier: 3, category: 'Conteúdo', description: 'Sem estratégia de conteúdo', impact: 'Conteúdo é o que ranqueia. Lead não investe nisso.' },
  { id: 'T3.5', name: 'Mobile Ruim', condition: 'Performance mobile < 40', points: 10, tier: 3, category: 'Website', description: '70%+ do tráfego é mobile no BR', impact: 'Maioria dos clientes acessa pelo celular. Site quebrado no mobile = perda de venda.' },
]

const THRESHOLDS = {
  lead: 40,
  quente: 55,
  urgente: 70,
}

const CriteriaPage = async ({ params }: { params: Promise<{ lang: string }> }) => {
  const { lang } = await params
  const user = await getSessionUser()
  if (user?.role !== 'admin') redirect(`/${lang}/app`)

  const tier1Count = PAIN_SIGNALS.filter(s => s.tier === 1).length
  const tier2Count = PAIN_SIGNALS.filter(s => s.tier === 2).length
  const tier3Count = PAIN_SIGNALS.filter(s => s.tier === 3).length
  const totalPoints = PAIN_SIGNALS.reduce((s, sig) => s + sig.points, 0)

  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12 }}>
        <Typography variant='h4'>🎯 Critérios de Atração</Typography>
        <Typography variant='body2' color='text.secondary'>
          Pain Criteria v1.1 — 20 sinais em 3 tiers. Thresholds: LEAD ≥{THRESHOLDS.lead} · QUENTE ≥{THRESHOLDS.quente} · URGENTE ≥{THRESHOLDS.urgente}
        </Typography>
      </Grid>

      {/* Summary cards */}
      <Grid size={{ xs: 12, sm: 4 }}>
        <CardStatVertical
          stats={`${tier1Count}`}
          title='Tier 1 · Crítico'
          subtitle={`${PAIN_SIGNALS.filter(s => s.tier === 1).reduce((s, sig) => s + sig.points, 0)} pontos · dor grave`}
          avatarColor='error'
          avatarIcon='ri-alert-line'
          trendNumber={String(tier1Count)}
          trend='negative'
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 4 }}>
        <CardStatVertical
          stats={`${tier2Count}`}
          title='Tier 2 · Alto'
          subtitle={`${PAIN_SIGNALS.filter(s => s.tier === 2).reduce((s, sig) => s + sig.points, 0)} pontos · gaps significativos`}
          avatarColor='warning'
          avatarIcon='ri-error-warning-line'
          trendNumber={String(tier2Count)}
          trend='positive'
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 4 }}>
        <CardStatVertical
          stats={`${tier3Count}`}
          title='Tier 3 · Moderado'
          subtitle={`${PAIN_SIGNALS.filter(s => s.tier === 3).reduce((s, sig) => s + sig.points, 0)} pontos · oportunidades`}
          avatarColor='info'
          avatarIcon='ri-lightbulb-line'
          trendNumber={String(tier3Count)}
          trend='positive'
        />
      </Grid>

      {/* Threshold explanation */}
      <Grid size={{ xs: 12 }}>
        <Card>
          <CardContent>
            <Typography variant='h6' gutterBottom>📊 Como o Score de Dor funciona</Typography>
            <Typography variant='body2' sx={{ mb: 3 }}>
              Cada sinal detectado soma pontos. O total define a prioridade do lead.
              Múltiplos sinais Tier 1 = lead URGENTE. Sinais Tier 3 sozinhos = lead frio.
            </Typography>
            <Grid container spacing={3}>
              {[
                { label: '🟢 SAUDÁVEL', range: `0-${THRESHOLDS.lead - 1}`, color: 'success', desc: 'Não é lead. Monitorar.' },
                { label: '🟡 LEAD', range: `${THRESHOLDS.lead}-${THRESHOLDS.quente - 1}`, color: 'info', desc: 'Lead potencial. Nutrir com conteúdo.' },
                { label: '🟠 QUENTE', range: `${THRESHOLDS.quente}-${THRESHOLDS.urgente - 1}`, color: 'warning', desc: 'Lead qualificado. Abordar com diagnóstico.' },
                { label: '🔴 URGENTE', range: `≥${THRESHOLDS.urgente}`, color: 'error', desc: 'Múltiplas dores críticas. Contato IMEDIATO.' },
              ].map((t) => (
                <Grid key={t.label} size={{ xs: 12, sm: 3 }}>
                  <Card sx={{ borderLeft: 4, borderColor: `${t.color}.main` }}>
                    <CardContent>
                      <Typography variant='subtitle2' fontWeight={700}>{t.label}</Typography>
                      <Typography variant='h5' fontWeight={800}>{t.range}</Typography>
                      <Typography variant='caption' color='text.secondary'>{t.desc}</Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </CardContent>
        </Card>
      </Grid>

      {/* Tier 1 signals */}
      <Grid size={{ xs: 12 }}>
        <Typography variant='h6' gutterBottom>
          <Chip label={`TIER 1 · CRÍTICO (${tier1Count} sinais)`} color='error' size='small' sx={{ mr: 1 }} />
          Dor grave — 2 sinais = lead URGENTE
        </Typography>
        <Grid container spacing={3}>
          {PAIN_SIGNALS.filter(s => s.tier === 1).map((sig) => (
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
                  <Typography variant='body2' color='text.secondary'>{sig.description}</Typography>
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

      {/* Tier 2 signals */}
      <Grid size={{ xs: 12 }}>
        <Typography variant='h6' gutterBottom>
          <Chip label={`TIER 2 · ALTO (${tier2Count} sinais)`} color='warning' size='small' sx={{ mr: 1 }} />
          Gaps significativos — combinar 2-3 = lead QUENTE
        </Typography>
        <Grid container spacing={3}>
          {PAIN_SIGNALS.filter(s => s.tier === 2).map((sig) => (
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
                  <Typography variant='caption' color='text.secondary'>{sig.impact}</Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Grid>

      {/* Tier 3 signals */}
      <Grid size={{ xs: 12 }}>
        <Typography variant='h6' gutterBottom>
          <Chip label={`TIER 3 · MODERADO (${tier3Count} sinais)`} color='info' size='small' sx={{ mr: 1 }} />
          Oportunidades — reforçam Tiers 1-2
        </Typography>
        <Grid container spacing={3}>
          {PAIN_SIGNALS.filter(s => s.tier === 3).map((sig) => (
            <Grid key={sig.id} size={{ xs: 12, sm: 6, md: 4 }}>
              <Card sx={{ borderTop: 3, borderColor: 'info.main' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Chip label={sig.id} size='small' color='info' variant='tonal' />
                    <Chip label={`${sig.points} pts`} size='small' color='info' variant='outlined' />
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

      {/* Anti-false-positive rules */}
      <Grid size={{ xs: 12 }}>
        <Card sx={{ bgcolor: 'var(--pastel-sky)' }}>
          <CardContent>
            <Typography variant='h6' gutterBottom>🛡️ Regras Anti-Falso-Positivo</Typography>
            <Grid container spacing={2}>
              {[
                'Sem GMB → ignorar (sem dados para avaliar)',
                '< 3 reviews → reduzir peso do rating (amostra pequena)',
                'Fechado (business_status ≠ OPERATIONAL) → excluir',
                'Franquia/Rede (> 5 locações) → classificar ENTERPRISE',
                'Sem telefone E sem website → +10 pts bônus (offline total)',
                'Tem website mas sem dados de SEO → usar estimativa GMB',
              ].map((rule, i) => (
                <Grid key={i} size={{ xs: 12, sm: 6 }}>
                  <Typography variant='body2'>
                    <Chip label={`R${i + 1}`} size='small' variant='outlined' sx={{ mr: 1 }} />
                    {rule}
                  </Typography>
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
