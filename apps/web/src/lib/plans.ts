// ══════════════════════════════════════════════════════════════════
// ADSENTICE · Strategic Plans v2.0 — fonte canônica
// Usado por: /admin/solutions, /admin/costs, /admin/settings
// medido=verdade · 2026-07-15
// ══════════════════════════════════════════════════════════════════

export interface StrategicPlan {
  tier: 'free' | 'starter' | 'pro' | 'scale' | 'enterprise'
  name: string
  price: string        // "R$0", "R$197/mes", etc.
  priceNum: number     // 0, 197, 497, 997, 1497
  costUsd: number      // custo estimado DataForSEO por lead
  costLabel: string    // "$0.0305/lead", "~$0.10/mes", etc.
  margin: string       // "Lead magnet", "95%", etc.
  pipeline: string
  signals: number
  description: string
  delivers: string[]
  channels: string[]
  persona: string
  color: 'success' | 'primary' | 'warning' | 'error' | 'info'
  icon: string
}

export const STRATEGIC_PLANS: StrategicPlan[] = [
  {
    tier: 'free', name: 'Raio-X', price: 'R$0', priceNum: 0,
    costUsd: 0.0305, costLabel: '$0.0305/lead', margin: 'Lead magnet',
    pipeline: 'L0+L1+L2', signals: 37,
    description: 'Diagnóstico de 1 página com score composto, nível Schwartz, TOP 3 gaps detectados e 1 recomendação acionável.',
    delivers: ['Score composto (Fit/Engagement/Intent)', 'Nível Schwartz', 'TOP 3 gaps', '1 recomendação gratuita'],
    channels: ['Google Maps', 'WhatsApp', 'Blog SEO', 'Instagram adsentice'],
    persona: '100% do mercado — lead magnet universal',
    color: 'success', icon: 'ri-search-eye-line',
  },
  {
    tier: 'starter', name: 'Sentinela', price: 'R$197/mês', priceNum: 197,
    costUsd: 0.050, costLabel: '~$0.05/lead', margin: '95%+',
    pipeline: 'Raio-X + recorrente mensal', signals: 37,
    description: 'Cockpit TOP-K diário com 3 prioridades. Monitoramento mensal do score, AlertLane de problemas críticos.',
    delivers: ['Cockpit TOP-K diário', 'AlertLane: críticos→atenção→info', 'Relatório mensal', '3 recomendações/mês priorizadas'],
    channels: ['Email (D+1, D+3, D+7)', 'WhatsApp follow-up', 'Indicação de clientes'],
    persona: 'Problem Aware (63% do mercado)',
    color: 'primary', icon: 'ri-shield-check-line',
  },
  {
    tier: 'pro', name: 'Domínio', price: 'R$497/mês', priceNum: 497,
    costUsd: 0.070, costLabel: '~$0.07/lead', margin: '97%+',
    pipeline: 'Sentinela + L3', signals: 41,
    description: 'TUDO do Sentinela + Radar de Mercado contínuo + Channel Health Matrix + Benchmark comparativo.',
    delivers: ['TOP 5 concorrentes', 'Radar de Mercado', 'Channel Health Matrix', 'Relatório de Inteligência de Nicho'],
    channels: ['Ligação pessoal (founder)', 'Email com dados REAIS', 'WhatsApp com comparison table'],
    persona: 'Solution Aware (12% do mercado)',
    color: 'warning', icon: 'ri-trophy-line',
  },
  {
    tier: 'scale', name: 'Escala', price: 'R$997/mês', priceNum: 997,
    costUsd: 0.100, costLabel: '~$0.10/lead', margin: '98%+',
    pipeline: 'Domínio + L4', signals: 47,
    description: 'TUDO do Domínio + AI Daily Briefing via WhatsApp + Copilot IA + Social Media Strategy + Consultoria mensal.',
    delivers: ['AI Daily Briefing WhatsApp (07:00)', 'Copilot IA', 'Social Media Strategy', 'Consultoria mensal 30min'],
    channels: ['Consultoria pessoal', 'Relatório executivo trimestral', 'Acesso prioritário'],
    persona: 'Clientes que escalam — "Quero dominar o mercado"',
    color: 'error', icon: 'ri-rocket-2-line',
  },
  {
    tier: 'enterprise', name: 'Growth OS', price: 'a partir de R$1.497/mês', priceNum: 1497,
    costUsd: 0.150, costLabel: '~$0.15/lead', margin: '90%+',
    pipeline: 'Todos os hubs + Multi-user + White-label', signals: 47,
    description: 'Para agências, franquias e negócios com equipe. TUDO do Escala + Multi-user + White-label + API Access.',
    delivers: ['Multi-user (3-10)', 'White-label', 'Client Portal', 'API Access', 'SLA Tracking'],
    channels: ['Demo personalizada', 'Onboarding dedicado', 'Suporte prioritário'],
    persona: 'Agências de marketing, franquias, redes',
    color: 'info', icon: 'ri-building-2-line',
  },
]
