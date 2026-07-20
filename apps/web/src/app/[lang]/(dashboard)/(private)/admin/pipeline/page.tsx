

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

  const _dashboard = await getAdminDashboardData()

  // ═══ Dados REAIS do Supabase — 1 query única (dedup place_id · v089 fix double-query + cap) ═══
  let categoryCounts: { category: string; count: number; label: string }[] = []
  let avgScoreAll = 0
  const enrichmentCounts = { l0: 0, l2a: 0, l2b: 0, l3: 0, l4: 0, l5: 0 }

  try {
    const supabase = getAdminClient()
    const { data, error } = await supabase.from("discovery_listings")
      .select("place_id,score_compound,category,enrichment_level,phone,website,l3_social_links,l3_whatsapp,cnpj_enriched,ibge_renda")
      .order("enrichment_level", { ascending: false }).limit(2000)

    if (!error && data?.length) {
      const deduped = new Map<string, any>()

      for (const r of data as any[]) {
        const e = deduped.get(r.place_id)
        if (!e || (r.enrichment_level || 0) > (e.enrichment_level || 0)) deduped.set(r.place_id, r)
      }

      const list = Array.from(deduped.values())
      enrichmentCounts.l0 = list.length
      enrichmentCounts.l2a = list.filter((r: any) => (r.enrichment_level || 0) >= 2).length
      enrichmentCounts.l2b = list.filter((r: any) => r.website && (r.enrichment_level || 0) >= 2).length
      enrichmentCounts.l3 = list.filter((r: any) => r.l3_social_links != null || (r.enrichment_level || 0) >= 3).length
      enrichmentCounts.l4 = list.filter((r: any) => r.ibge_renda != null).length
      enrichmentCounts.l5 = list.filter((r: any) => r.cnpj_enriched).length

      const scores = list.map((r: any) => r.score_compound || 0).filter((v: number) => v > 0)
      avgScoreAll = scores.length > 0 ? Math.round(scores.reduce((s: number, v: number) => s + v, 0) / scores.length) : 0
      const catCounts: Record<string, number> = {}

      for (const r of list) { if (r.category) catCounts[r.category] = (catCounts[r.category] || 0) + 1 }
      categoryCounts = Object.entries(catCounts).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([c, n]) => ({ category: c, count: n, label: CAT_SHORT[c] || c }))
    }
  } catch { /* Supabase offline */ }

  // ═══ Runbooks por estágio (ADR-0051 #2) · condition + cost + autoTrigger ═══
  const RUNBOOKS: Record<string, { condition: string; action: string; cost: number; autoTrigger: boolean; planLink: string }> = {
    S0: { condition: "opportunityScore > 50", action: "Discovery automático em gaps prioritários", cost: 0.048, autoTrigger: false, planLink: "/admin/discovery" },
    S1: { condition: "scoreCompound > 70 AND wa_is_business = true", action: "Enviar Raio-X via WhatsApp (S10)", cost: 0, autoTrigger: true, planLink: "/admin/leads" },
    S2: { condition: "hasWebsite AND enrichmentLevel >= 2", action: "Gerar S11-MK (MockUp ReBrand, R$0.001)", cost: 0.001, autoTrigger: false, planLink: "/admin/surface" },
    S3: { condition: "scoreCompound > 60 AND competitorCount > 5", action: "Gerar S11K (Landing Técnica, R$0.093)", cost: 0.093, autoTrigger: false, planLink: "/admin/surface" },
    S4: { condition: "ibgeRenda > 2000 AND scoreCompound > 70", action: "Proposta Domínio (R$497/mês)", cost: 0.02, autoTrigger: false, planLink: "/admin/solutions" },
    S5: { condition: "cnpjEnriched = true", action: "Qualificação fiscal completa — prosseguir para proposta", cost: 0, autoTrigger: true, planLink: "/admin/leads" },
    S6: { condition: "proposalGenerated = true", action: "Follow-up D+3 com dados reais do concorrente", cost: 0, autoTrigger: true, planLink: "/admin/leads" },
    S7: { condition: "planActive = true", action: "Onboarding + NPS 30 dias + A/B tracking ativo", cost: 0, autoTrigger: true, planLink: "/admin/surface" },
  }

  // ═══ Funil de Captação — 7 camadas de enriquecimento (ADR-0046) ═══
  const funnelStages = [
    { stage: 'S0', label: 'L0 · GMB Data', count: enrichmentCounts.l0, icon: 'ri-radar-line',
      desc: 'Leads encontrados no Google Meu Negócio. Nome, telefone, endereço, rating, 41 campos.',
      action: RUNBOOKS.S0.action, color: 'primary' as const, pct: 100, runbook: RUNBOOKS.S0 },
    { stage: 'S1', label: 'L2a · SEO Técnico', count: enrichmentCounts.l2a, icon: 'ri-global-line',
      desc: 'Lighthouse, CMS, analytics, meta tags, HTTPS, schema.org. 12 sinais W1-W12.',
      action: RUNBOOKS.S1.action, color: 'info' as const, pct: Math.round((enrichmentCounts.l2a/Math.max(enrichmentCounts.l0,1))*100), runbook: RUNBOOKS.S1 },
    { stage: 'S2', label: 'L2b · Conteúdo+DNA', count: enrichmentCounts.l2b, icon: 'ri-palette-line',
      desc: 'Serviços, equipe, convênios, Brand DNA (cores+fontes), UX. Crawler modular .TS · $0.',
      action: RUNBOOKS.S2.action, color: 'secondary' as const, pct: Math.round((enrichmentCounts.l2b/Math.max(enrichmentCounts.l0,1))*100), runbook: RUNBOOKS.S2 },
    { stage: 'S3', label: 'L3 · Competitive', count: enrichmentCounts.l3, icon: 'ri-bar-chart-2-line',
      desc: 'Backlinks, Share of Voice, keyword gaps, concorrentes. DataForSEO · $0.08/lead.',
      action: RUNBOOKS.S3.action, color: 'success' as const, pct: Math.round((enrichmentCounts.l3/Math.max(enrichmentCounts.l0,1))*100), runbook: RUNBOOKS.S3 },
    { stage: 'S4', label: 'L4 · IBGE Contexto', count: enrichmentCounts.l4, icon: 'ri-map-pin-line',
      desc: 'Renda média, PIB per capita, população do município. Supabase · $0.',
      action: RUNBOOKS.S4.action, color: 'warning' as const, pct: Math.round((enrichmentCounts.l4/Math.max(enrichmentCounts.l0,1))*100), runbook: RUNBOOKS.S4 },
    { stage: 'S5', label: 'L5 · CNPJ', count: enrichmentCounts.l5, icon: 'ri-government-line',
      desc: 'CNAE validado, regime tributário, sócios. ReceitaWS · $0 (3/min, fila assíncrona).',
      action: RUNBOOKS.S5.action, color: 'error' as const, pct: Math.round((enrichmentCounts.l5/Math.max(enrichmentCounts.l0,1))*100), runbook: RUNBOOKS.S5 },
    { stage: 'S6', label: 'L6 · Proposta', count: 0, icon: 'ri-file-text-line',
      desc: 'S11-MK enviado (MockUp ReBrand) ou S11K entregue (Landing Técnica).',
      action: RUNBOOKS.S6.action, color: 'error' as const, pct: 0, runbook: RUNBOOKS.S6 },
    { stage: 'S7', label: 'L7 · Cliente', count: 0, icon: 'ri-star-line',
      desc: 'Plano ativo. A/B tracking. Learning loop → próximos leads melhores.',
      action: RUNBOOKS.S7.action, color: 'success' as const, pct: 0, runbook: RUNBOOKS.S7 },
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

      {/* Top funnel metrics — camadas de enriquecimento */}
      <Grid size={{ xs: 12, sm: 4 }}>
        <CardStatVertical stats={enrichmentCounts.l0.toLocaleString('pt-BR')} title='L0 · GMB Data'
          subtitle={`${categoryCounts.length} categorias · Google Meu Negócio`}
          avatarColor='primary' avatarIcon='ri-radar-line'
          trendNumber={String(enrichmentCounts.l0)} trend='positive' />
      </Grid>
      <Grid size={{ xs: 12, sm: 4 }}>
        <CardStatVertical stats={enrichmentCounts.l2a.toLocaleString('pt-BR')}
          title='L2a · SEO Técnico'
          subtitle={`${Math.round((enrichmentCounts.l2a/Math.max(enrichmentCounts.l0,1))*100)}% de conversão · Lighthouse, CMS, analytics`}
          avatarColor='info' avatarIcon='ri-global-line'
          trendNumber={String(enrichmentCounts.l2a)} trend='positive' />
      </Grid>
      <Grid size={{ xs: 12, sm: 4 }}>
        <CardStatVertical stats={enrichmentCounts.l2b.toLocaleString('pt-BR')}
          title='L2b · Conteúdo+DNA'
          subtitle={`${Math.round((enrichmentCounts.l2b/Math.max(enrichmentCounts.l0,1))*100)}% c/ website · Crawler modular .TS`}
          avatarColor='secondary' avatarIcon='ri-palette-line'
          trendNumber={String(enrichmentCounts.l2b)} trend='positive' />
      </Grid>
      <Grid size={{ xs: 12, sm: 4 }}>
        <CardStatVertical stats={enrichmentCounts.l3.toLocaleString('pt-BR')}
          title='L3 · Competitive Intel'
          subtitle={`${Math.round((enrichmentCounts.l3/Math.max(enrichmentCounts.l0,1))*100)}% com backlinks/SOV · DataForSEO`}
          avatarColor='success' avatarIcon='ri-bar-chart-2-line'
          trendNumber={String(enrichmentCounts.l3)} trend={enrichmentCounts.l3 > 0 ? 'positive' : undefined} />
      </Grid>
      <Grid size={{ xs: 12, sm: 4 }}>
        <CardStatVertical stats={enrichmentCounts.l4.toLocaleString('pt-BR')}
          title='L4 · Contexto IBGE'
          subtitle={`${Math.round((enrichmentCounts.l4/Math.max(enrichmentCounts.l0,1))*100)}% com renda/PIB · Supabase`}
          avatarColor='warning' avatarIcon='ri-map-pin-line'
          trendNumber={String(enrichmentCounts.l4)} trend={enrichmentCounts.l4 > 0 ? 'positive' : undefined} />
      </Grid>
      <Grid size={{ xs: 12, sm: 4 }}>
        <CardStatVertical stats={enrichmentCounts.l5.toLocaleString('pt-BR')}
          title='L5 · CNPJ Validados'
          subtitle={`${Math.round((enrichmentCounts.l5/Math.max(enrichmentCounts.l0,1))*100)}% dos leads · CNAE + regime + sócios`}
          avatarColor='error' avatarIcon='ri-government-line'
          trendNumber={String(enrichmentCounts.l5)} trend={enrichmentCounts.l5 > 0 ? 'positive' : undefined} />
      </Grid>

      {/* Funnel stage cards — clicáveis */}
      <Grid size={{ xs: 12 }}>
        <Typography variant='h6' gutterBottom>🎯 Funil de Captação adsentice
          <Chip label='Fase 7' size='small' color='warning' variant='tonal' sx={{ ml: 1 }} />
        </Typography>
        <Grid container spacing={2}>
          {funnelStages.map((s) => {
            const pct = Math.round((s.count / maxFunnel) * 100)
            const filterMap: Record<string,string> = { S0: '', S1: 'enrichment=2', S2: 'has_website=1', S3: 'enrichment=3', S4: '', S5: 'cnpj=1', S6: '', S7: '' }
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
                    {(s as any).runbook && (
                      <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5 }}>
                        <Chip label={(s as any).runbook.autoTrigger ? '🤖 Auto' : '👤 Manual'} size='small' variant='tonal'
                          color={(s as any).runbook.autoTrigger ? 'success' : 'default'} sx={{ height: 18, fontSize: '0.6rem' }} />
                        {(s as any).runbook.cost > 0 && (
                          <Chip label={`\$${(s as any).runbook.cost}`} size='small' variant='tonal'
                            color='warning' sx={{ height: 18, fontSize: '0.6rem' }} />
                        )}
                      </Box>
                    )}
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
            <Typography variant='h6' gutterBottom>📊 Taxas de Conversão do Funil (7 camadas)</Typography>
            {[
              { from: 'L0→L2a', rate: Math.round((enrichmentCounts.l2a/Math.max(enrichmentCounts.l0,1))*100), label: `GMB → SEO Técnico (${enrichmentCounts.l2a} de ${enrichmentCounts.l0})` },
              { from: 'L2a→L2b', rate: Math.round((enrichmentCounts.l2b/Math.max(enrichmentCounts.l2a,1))*100), label: `SEO → Conteúdo+DNA (${enrichmentCounts.l2b} de ${enrichmentCounts.l2a})` },
              { from: 'L2b→L3', rate: Math.round((enrichmentCounts.l3/Math.max(enrichmentCounts.l2b,1))*100), label: `Conteúdo → Competitive Intel (${enrichmentCounts.l3} de ${enrichmentCounts.l2b})` },
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
