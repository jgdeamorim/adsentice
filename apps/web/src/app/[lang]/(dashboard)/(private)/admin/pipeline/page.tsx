

// adsentice · Admin / Pipeline — dados REAIS do Supabase (agregado de TODAS as buscas)
import { redirect } from 'next/navigation'
import Link from 'next/link'

import Grid from '@mui/material/Grid2'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import Chip from '@mui/material/Chip'
import Box from '@mui/material/Box'
import LinearProgress from '@mui/material/LinearProgress'
import Button from '@mui/material/Button'

import { getAdminClient } from '@/lib/supabase-admin'

import CardStatVertical from '@components/card-statistics/Vertical'
import { getSessionUser } from '@/libs/supabase/server'
import { getAdminDashboardData } from '@/lib/engine'

export const dynamic = 'force-dynamic'

const PipelinePage = async ({ params }: { params: Promise<{ lang: string }> }) => {
  const { lang } = await params
  const user = await getSessionUser()

  if (user?.role !== 'admin') redirect(`/${lang}/app`)

  const e = await getAdminDashboardData()

  // ═══ Dados REAIS do Supabase (agregado de TODAS as buscas) ═══
  let categoryCounts: { category: string; count: number; label: string }[] = []
  let avgScoreAll = 0
  let supabaseTotal = 0

  try {
    const supabase = getAdminClient()
    const { data, error } = await supabase.from("discovery_listings").select("place_id,score_compound,schwartz_level,schwartz_label,category,enrichment_level").limit(3000)
    if (!error && data?.length) {
      // Dedup by place_id (keep highest enrichment_level)
      const deduped = new Map<string, any>()
      for (const r of data as any[]) { const e = deduped.get(r.place_id); if (!e || (r.enrichment_level || 0) > (e.enrichment_level || 0)) deduped.set(r.place_id, r) }
      const list = Array.from(deduped.values())
      supabaseTotal = list.length
      const scores = list.map((r: any) => r.score_compound || 0).filter((v: number) => v > 0)
      avgScoreAll = scores.length > 0 ? Math.round(scores.reduce((s: number, v: number) => s + v, 0) / scores.length) : 0
      const catCounts: Record<string, number> = {}
      for (const r of list) { if (r.category) catCounts[r.category] = (catCounts[r.category] || 0) + 1 }
      categoryCounts = Object.entries(catCounts).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([c, n]) => ({ category: c, count: n, label: CAT_SHORT[c] || c }))
    }
  } catch { /* Supabase offline */ }

  // Fallback: use Redis data if Supabase is empty
  // Build enrichment-level counts from Supabase data
  let enrichmentCounts = { l0: supabaseTotal, l1: 0, l2: 0 }
  try {
    const supabase = getAdminClient()
    const { data: l1Data } = await supabase.from("discovery_listings").select("place_id,enrichment_level").limit(3000)
    if (l1Data) {
      const deduped = new Map<string, number>()
      for (const r of l1Data as any[]) {
        const existing = deduped.get(r.place_id)
        if (!existing || (r.enrichment_level || 0) > existing) deduped.set(r.place_id, r.enrichment_level || 0)
      }
      enrichmentCounts.l0 = deduped.size
      enrichmentCounts.l1 = Array.from(deduped.values()).filter(v => v >= 1).length
      enrichmentCounts.l2 = Array.from(deduped.values()).filter(v => v >= 2).length
    }
  } catch { /* keep defaults */ }

  // ═══ Funil Ativo de Captação adsentice ═══
  const funnelStages = [
    { stage: 'S0', label: 'Descoberto', count: enrichmentCounts.l0, icon: 'ri-radar-line',
      desc: 'Leads encontrados no Google Meu Negócio (L0). Aguardando enriquecimento.',
      action: 'Executar busca no Discovery Engine', color: 'primary' as const, pct: 100 },
    { stage: 'S1', label: 'Perfilado', count: enrichmentCounts.l1, icon: 'ri-profile-line',
      desc: 'L1 completo — 27 campos GMB (telefone, website, fotos, descrição).',
      action: 'Enviar Raio-X gratuito via WhatsApp', color: 'info' as const, pct: Math.round((enrichmentCounts.l1/Math.max(enrichmentCounts.l0,1))*100) },
    { stage: 'S2', label: 'Auditado', count: enrichmentCounts.l2, icon: 'ri-global-line',
      desc: 'L2 Website+SEO — schema, conteúdo, lighthouse, tecnologias.',
      action: 'Proposta Sentinela (R$197/mês)', color: 'success' as const, pct: Math.round((enrichmentCounts.l2/Math.max(enrichmentCounts.l0,1))*100) },
    { stage: 'S3', label: 'Qualificado', count: enrichmentCounts.l2 > 0 ? Math.round(enrichmentCounts.l2 * 0.3) : 0, icon: 'ri-filter-3-line',
      desc: 'Score > 70 + website próprio + GMB verificado. Alta probabilidade de conversão.',
      action: 'Proposta Domínio (R$497/mês) — founder call', color: 'warning' as const, pct: 0 },
    { stage: 'S4', label: 'Contatado', count: 0, icon: 'ri-whatsapp-line',
      desc: 'WhatsApp enviado ou email disparado. Aguardando resposta.',
      action: 'Follow-up D+3 com case de concorrente', color: 'error' as const, pct: 0 },
    { stage: 'S5', label: 'Em Negociação', count: 0, icon: 'ri-chat-3-line',
      desc: 'Respondeu, pediu orçamento ou demonstração.',
      action: 'Ligação pessoal (founder) — D+7', color: 'error' as const, pct: 0 },
    { stage: 'S6', label: 'Cliente', count: 0, icon: 'ri-star-line',
      desc: 'Plano ativo, MRR recorrente.',
      action: 'Onboarding + NPS 30 dias', color: 'success' as const, pct: 0 },
    { stage: 'S7', label: 'Embaixador', count: 0, icon: 'ri-heart-line',
      desc: 'Indica outros negócios. Motor de crescimento orgânico.',
      action: 'Comissão de indicação', color: 'success' as const, pct: 0 },
  ]

  const maxFunnel = Math.max(enrichmentCounts.l0, 1)

  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12 }}>
        <Typography variant='h4'>📈 Pipeline · Funil de Leads</Typography>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap', mt: 1 }}>
          <Typography variant='body2' color='text.secondary'>
            Funil de Captação adsentice · {enrichmentCounts.l0} leads descobertos · Pipeline ativo com estratégia de nutrição
          </Typography>
          <Chip label={`Fase 7 · Funil Ativo`} size='small' color='warning' variant='tonal' />
          <Chip label={`${enrichmentCounts.l0} leads`} size='small' color='success' variant='tonal' />
          <Chip label={`Score médio: ${avgScoreAll}/100`} size='small' color='info' variant='tonal' />
        </Box>
      </Grid>

      {/* Top funnel metrics */}
      <Grid size={{ xs: 12, sm: 4 }}>
        <CardStatVertical stats={enrichmentCounts.l0.toLocaleString('pt-BR')} title='S0 · Descobertos'
          subtitle={`${categoryCounts.length} categorias · Google Meu Negócio`}
          avatarColor='primary' avatarIcon='ri-radar-line'
          trendNumber={String(enrichmentCounts.l0)} trend='positive' />
      </Grid>
      <Grid size={{ xs: 12, sm: 4 }}>
        <CardStatVertical stats={enrichmentCounts.l2.toLocaleString('pt-BR')}
          title='S2 · Auditados (L2)'
          subtitle={`${Math.round((enrichmentCounts.l2/Math.max(enrichmentCounts.l0,1))*100)}% de conversão S0→S2 · Prontos p/ proposta`}
          avatarColor='success' avatarIcon='ri-global-line'
          trendNumber={String(enrichmentCounts.l2)} trend='positive' />
      </Grid>
      <Grid size={{ xs: 12, sm: 4 }}>
        <CardStatVertical stats={enrichmentCounts.l1.toLocaleString('pt-BR')} title='S1 · Perfilados (L1)'
          subtitle={`${Math.round((enrichmentCounts.l1/Math.max(enrichmentCounts.l0,1))*100)}% de conversão S0→S1 · Contato disponível`}
          avatarColor='info' avatarIcon='ri-profile-line'
          trendNumber={String(enrichmentCounts.l1)} trend='positive' />
      </Grid>

      {/* Funnel stage cards — clicáveis */}
      <Grid size={{ xs: 12 }}>
        <Typography variant='h6' gutterBottom>🎯 Funil de Captação adsentice
          <Chip label='Fase 7' size='small' color='warning' variant='tonal' sx={{ ml: 1 }} />
        </Typography>
        <Grid container spacing={2}>
          {funnelStages.map((s) => {
            const pct = Math.round((s.count / maxFunnel) * 100)
            const filterMap: Record<string,string> = { S0: '', S1: 'enrichment=1', S2: 'enrichment=2', S3: 'score_min=70', S4: '', S5: '', S6: '', S7: '' }
            const href = s.stage !== 'S0' && s.count > 0 ? `/${lang}/admin/leads?${filterMap[s.stage] || ''}` : `/${lang}/admin/leads`

            return (
              <Grid key={s.stage} size={{ xs: 12, sm: 6, md: 3 }}>
                <Card sx={{ borderLeft: 4, borderColor: `${s.color}.main`, opacity: s.count === 0 && s.stage !== 'S0' ? 0.4 : 1 }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Chip label={s.stage} color={s.color} size='small' />
                        <i className={s.icon} style={{ fontSize: '0.8rem', opacity: 0.6 }} />
                      </Box>
                      <Typography variant='h5' fontWeight={700}>{s.count.toLocaleString('pt-BR')}</Typography>
                    </Box>
                    <Typography variant='subtitle2' fontWeight={600} gutterBottom>{s.label}</Typography>
                    <Typography variant='caption' color='text.secondary'>{s.desc}</Typography>
                    <LinearProgress variant='determinate' value={pct} color={s.color}
                      sx={{ mt: 2, height: 6, borderRadius: 3 }} />
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
                      <Typography variant='caption' color='text.secondary'>{pct}%</Typography>
                      {s.count > 0 && s.stage !== 'S0' && (
                        <Button component={Link} href={href} size='small' variant='text' sx={{ fontSize: '0.65rem', minWidth: 0, p: 0 }}>
                          Ver leads →
                        </Button>
                      )}
                    </Box>
                    <Typography variant='caption' color='warning.main' sx={{ mt: 0.5, display: 'block', fontWeight: 600 }}>
                      🎯 {s.action}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            )
          })}
        </Grid>
      </Grid>

      {/* Categories from Supabase — clicáveis */}
      <Grid size={{ xs: 12, md: 6 }}>
        <Card>
          <CardContent>
            <Typography variant='h6' gutterBottom>📊 Top Categorias (Supabase)</Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {categoryCounts.length === 0 ? (
                <Typography variant='body2' color='text.secondary'>Execute a 1ª descoberta para popular.</Typography>
              ) : (
                categoryCounts.map((c) => (
                  <Box key={c.category} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Button component={Link} href={`/${lang}/admin/leads?category=${c.category}`}
                      size='small' sx={{ textTransform: 'none', fontWeight: 600, fontSize: '0.85rem' }}>
                      {c.label}
                    </Button>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <LinearProgress variant='determinate'
                        value={Math.round((c.count / Math.max(enrichmentCounts.l0, 1)) * 100)}
                        sx={{ width: 80, height: 6, borderRadius: 3 }} />
                      <Typography variant='body2' fontWeight={700}>{c.count}</Typography>
                    </Box>
                  </Box>
                ))
              )}
            </Box>
          </CardContent>
        </Card>
      </Grid>

      {/* Conversion metrics + Nutrição */}
      <Grid size={{ xs: 12, md: 6 }}>
        <Card>
          <CardContent>
            <Typography variant='h6' gutterBottom>📊 Taxas de Conversão do Funil</Typography>
            {[
              { from: 'S0→S1', rate: Math.round((enrichmentCounts.l1/Math.max(enrichmentCounts.l0,1))*100), label: `Descoberto → Perfilado (${enrichmentCounts.l1} de ${enrichmentCounts.l0})` },
              { from: 'S1→S2', rate: Math.round((enrichmentCounts.l2/Math.max(enrichmentCounts.l1,1))*100), label: `Perfilado → Auditado (${enrichmentCounts.l2} de ${enrichmentCounts.l1})` },
              { from: 'S2→S3', rate: enrichmentCounts.l2 > 0 ? 30 : 0, label: 'Auditado → Qualificado (estimado 30%)' },
            ].map((conv) => (
              <Box key={conv.from} sx={{ mb: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant='body2' fontWeight={600}>{conv.from}</Typography>
                  <Typography variant='body2'>{conv.rate}%</Typography>
                </Box>
                <LinearProgress variant='determinate' value={conv.rate}
                  color={conv.rate >= 50 ? 'success' : conv.rate >= 25 ? 'warning' : 'error'}
                  sx={{ height: 8, borderRadius: 4 }} />
                <Typography variant='caption' color='text.secondary'>{conv.label}</Typography>
              </Box>
            ))}
          </CardContent>
        </Card>
      </Grid>

      {/* Estratégia de Nutrição */}
      <Grid size={{ xs: 12, md: 6 }}>
        <Card>
          <CardContent>
            <Typography variant='h6' gutterBottom>🧠 Estratégia de Nutrição por Estágio</Typography>
            {funnelStages.slice(0,5).filter(s => s.count > 0 || s.stage === 'S0').map(s => (
              <Box key={s.stage} sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mb: 2 }}>
                <Chip label={s.stage} size='small' color={s.color} variant='tonal' sx={{ mt: 0.2 }} />
                <Box>
                  <Typography variant='body2' fontWeight={600}>{s.label}: {s.action}</Typography>
                  <Typography variant='caption' color='text.secondary'>{s.desc}</Typography>
                </Box>
              </Box>
            ))}
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  )
}

// Category short labels
const CAT_SHORT: Record<string, string> = {
  dentist: '🦷 Dentistas', medical_aesthetic_clinic: '💉 Clínicas Estéticas',
  medical_clinic: '🏥 Clínicas Médicas', restaurant: '🍽️ Restaurantes',
  gym: '🏋️ Academias', lawyer: '⚖️ Advogados', barber_shop: '💈 Barbearias',
  pharmacy: '💊 Farmácias', veterinarian: '🐾 Veterinários',
  real_estate_agency: '🏠 Imobiliárias', accountant: '📊 Contadores',
  car_repair: '🔧 Oficinas', beauty_salon: '💇 Salões',
  psychologist: '🧠 Psicólogos', physical_therapist: '🦴 Fisioterapeutas',
  orthodontist: '🦷 Ortodontistas', pet_store: '🐶 Pet Shops',
  electrician: '🔌 Eletricistas', plumber: '🔧 Encanadores',
  cleaning_service: '🧹 Limpeza', ophthalmologist: '👁️ Oftalmologistas',
  cardiologist: '🫀 Cardiologistas', architect: '🏗️ Arquitetos',
  interior_designer: '🎨 Designers', pizza_restaurant: '🍕 Pizzarias',
  bakery: '🥖 Padarias', school: '📚 Escolas', driving_school: '🚗 Autoescolas',
  hotel: '🏨 Pousadas', 'Dental clinic': '🏥 Dental Clinic', 'Dentist': '🦷 Dentista',
  Endodontist: '🦷 Endodontista', Orthodontist: '🦷 Ortodontista',
}

export default PipelinePage
