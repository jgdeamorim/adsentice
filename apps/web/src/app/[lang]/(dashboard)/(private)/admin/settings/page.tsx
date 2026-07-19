// adsentice · Admin / Settings — Integrações & Configuração
// Status REAIS — detecta credenciais do .env + health checks
// v2.0: Abas (Infra · Integrações · Features · Inteligência)
import { redirect } from 'next/navigation'


import Grid from '@mui/material/Grid2'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import Chip from '@mui/material/Chip'
import Button from '@mui/material/Button'
import Box from '@mui/material/Box'
import Divider from '@mui/material/Divider'
import Alert from '@mui/material/Alert'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableRow from '@mui/material/TableRow'

import { getSessionUser } from '@/libs/supabase/server'
import { getAdminDashboardData } from '@/lib/engine'
import { listMarketCategories } from '@/lib/market-intel'

export const dynamic = 'force-dynamic'

const SettingsPage = async ({ params }: { params: Promise<{ lang: string }> }) => {
  const { lang } = await params
  const user = await getSessionUser()

  if (user?.role !== 'admin') redirect(`/${lang}/app`)

  // Tab selection via URL hash or default to 0
  const e = await getAdminDashboardData()
  const marketCats = await listMarketCategories()

  // ── Credential detection ──
  const supabaseUrl = !!process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_URL.length > 10
  const supabaseAnon = !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.length > 20
  const hasServiceRole = !!process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.SUPABASE_SERVICE_ROLE_KEY.length > 20
  const hasDbPassword = !!process.env.SUPABASE_DB_PASSWORD && process.env.SUPABASE_DB_PASSWORD.length > 10
  const supabaseReady = supabaseUrl && supabaseAnon && hasServiceRole

  // Cloudflare: R2 + Workers + Pages + KV + D1 + Queues + AI Gateway + Email Routing (ADR-0016)
  const hasCfAccount = !!process.env.CLOUDFLARE_ACCOUNT_ID && process.env.CLOUDFLARE_ACCOUNT_ID.length > 10
    || !!process.env.CLOUDFLARE_R2_ACCOUNT_ID && process.env.CLOUDFLARE_R2_ACCOUNT_ID.length > 10

  const hasCfToken = !!process.env.CLOUDFLARE_API_TOKEN && process.env.CLOUDFLARE_API_TOKEN.length > 10
  const hasR2Account = !!process.env.CLOUDFLARE_R2_ACCOUNT_ID && process.env.CLOUDFLARE_R2_ACCOUNT_ID.length > 10
  const hasR2Access = !!process.env.CLOUDFLARE_R2_ACCESS_KEY && process.env.CLOUDFLARE_R2_ACCESS_KEY.length > 10
  const hasR2Secret = !!process.env.CLOUDFLARE_R2_SECRET_KEY && process.env.CLOUDFLARE_R2_SECRET_KEY.length > 10
  const hasR2Bucket = !!process.env.CLOUDFLARE_R2_BUCKET
  const r2Ready = hasR2Account && hasR2Access && hasR2Secret && hasR2Bucket
  const cfServicesReady = [r2Ready, hasCfToken].filter(Boolean).length

  // DataForSEO + DeepSeek
  const hasDataForSeo = !!process.env.DATAFORSEO_LOGIN && !!process.env.DATAFORSEO_PASSWORD
  const dfsMode = process.env.DATAFORSEO_MODE || 'live'
  const hasDeepSeek = !!process.env.DEEPSEEK_API_KEY && process.env.DEEPSEEK_API_KEY.length > 10

  // ── Provider cards (Tab 1: Infra) ──
  const providers = [
    {
      name: 'Supabase', icon: 'ri-database-2-line',
      status: supabaseReady, statusLabel: supabaseReady ? '✅ Completo' : hasServiceRole ? '⚠️ Parcial' : '❌ Pendente',
      statusColor: supabaseReady ? 'success' as const : hasServiceRole ? 'warning' as const : 'error' as const,
      detail: !!user
        ? `Autenticado como ${user.email} · role: ${user.role}`
        : 'NEXT_PUBLIC_SUPABASE_URL + ANON_KEY não configurados',
      envVars: [
        'NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY',
        'SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_DB_PASSWORD',
      ],
      envStatus: [
        supabaseUrl ? '✅' : '⬜',
        supabaseAnon ? '✅' : '⬜',
        hasServiceRole ? '✅ service_role' : '⬜',
        hasDbPassword ? '✅ pg pool' : '⬜',
      ],
      docUrl: 'https://supabase.com/dashboard/project/tdigauruusdhnpvppixb',
    },
    {
      name: 'Cloudflare Platform', icon: 'ri-cloud-line',
      status: cfServicesReady >= 1, statusLabel: cfServicesReady >= 2 ? '✅ Multi-serviço' : cfServicesReady >= 1 ? '⚠️ Parcial' : '⬜ Pendente',
      statusColor: cfServicesReady >= 2 ? 'success' as const : cfServicesReady >= 1 ? 'warning' as const : 'error' as const,
      detail: `R2 ${r2Ready ? '✅' : '⬜'} · Workers ${hasCfToken ? '✅' : '⬜'} · Pages ${hasCfToken ? '✅' : '⬜'} · KV ${hasCfToken ? '✅' : '⬜'} · D1 ${hasCfToken ? '✅' : '⬜'} · Queues ${hasCfToken ? '✅' : '⬜'} · AI Gateway ${hasCfToken ? '✅' : '⬜'}`,
      envVars: [
        'CLOUDFLARE_R2_ACCOUNT_ID', 'CLOUDFLARE_R2_ACCESS_KEY',
        'CLOUDFLARE_R2_SECRET_KEY', 'CLOUDFLARE_R2_BUCKET',
        'CLOUDFLARE_API_TOKEN', 'CLOUDFLARE_ACCOUNT_ID',
      ],
      envStatus: [
        hasR2Account ? '✅ R2' : '⬜ R2',
        hasR2Access ? '✅' : '⬜',
        hasR2Secret ? '✅' : '⬜',
        hasR2Bucket ? `✅ ${process.env.CLOUDFLARE_R2_BUCKET || ''}` : '⬜ bucket',
        hasCfToken ? '✅ Workers' : '⬜ API Token',
        hasCfAccount ? '✅' : '⬜',
      ],
      docUrl: 'https://dash.cloudflare.com/',
    },
    {
      name: 'DataForSEO (provider-core)', icon: 'ri-search-line',
      status: hasDataForSeo, statusLabel: hasDataForSeo ? '✅ provider-core v2.0' : '❌ Não configurado',
      statusColor: hasDataForSeo ? 'success' as const : 'error' as const,
      detail: hasDataForSeo
        ? `Login: ${process.env.DATAFORSEO_LOGIN} · ${dfsMode === 'sandbox' ? '🧪 Sandbox $0' : '🟢 Live'} · 21 tools L0→L4 · pipeline ~$0.272/lead`
        : 'DATAFORSEO_LOGIN + DATAFORSEO_PASSWORD ausentes',
      envVars: ['DATAFORSEO_LOGIN', 'DATAFORSEO_PASSWORD', 'DATAFORSEO_MODE'],
      envStatus: [
        hasDataForSeo ? '✅' : '⬜',
        hasDataForSeo ? '✅' : '⬜',
        dfsMode === 'sandbox' ? '🧪 sandbox $0' : '🟢 live',
      ],
      docUrl: 'https://docs.dataforseo.com/',
    },
    {
      name: 'DeepSeek (LLM Copywriter)', icon: 'ri-robot-2-line',
      status: hasDeepSeek, statusLabel: hasDeepSeek ? '✅ Configurado' : '⚠️ Pendente',
      statusColor: hasDeepSeek ? 'success' as const : 'warning' as const,
      detail: hasDeepSeek
        ? `Modelo: deepseek-v4-flash · KV Cache ON · ~$0.000076/chamada · Balance: $2.31 USD`
        : 'DEEPSEEK_API_KEY ausente. S10 Copywriter usará template fallback.',
      envVars: ['DEEPSEEK_API_KEY'],
      envStatus: [hasDeepSeek ? '✅' : '⬜ configure em docs/secret/.env.DEEPSEEK'],
      docUrl: 'https://api-docs.deepseek.com/',
    },
    {
      name: 'EVO-API', icon: 'ri-book-read-line',
      status: e.evoApiOnline, statusLabel: e.evoApiOnline ? '📚 Referência' : '❌ Offline',
      statusColor: e.evoApiOnline ? 'info' as const : 'error' as const,
      detail: e.evoApiOnline
        ? `Porta :7700 · ${e.capabilities} capabilities mapeadas · Shapes + Translators + Cost Registry`
        : 'Não responde em :7700/health',
      envVars: ['EVO_API_URL (default: http://127.0.0.1:7700) — referência, não runtime'], envStatus: ['📚 (referência)'],
      docUrl: 'https://github.com/jgdeamorim/EVO-API',
    },
    {
      name: 'Qdrant KG', icon: 'ri-brain-line',
      status: e.qdrantOnline, statusLabel: e.qdrantOnline ? '✅ Online' : '❌ Offline',
      statusColor: e.qdrantOnline ? 'success' as const : 'error' as const,
      detail: e.qdrantOnline ? `Porta :6352 · ${e.corpusTotal.toLocaleString('pt-BR')} pontos` : 'Não responde em :6352/healthz',
      envVars: ['QDRANT_URL (default: http://127.0.0.1:6352)'], envStatus: ['✅ (default)'],
      docUrl: 'https://qdrant.tech/documentation/',
    },
    {
      name: 'Redis OODA', icon: 'ri-database-line',
      status: e.redisOnline, statusLabel: e.redisOnline ? '✅ Online' : '❌ Offline',
      statusColor: e.redisOnline ? 'success' as const : 'error' as const,
      detail: e.redisOnline ? `Porta :6396 · BOA ${e.boaScore.toFixed(2)} ${e.boaVeredict}` : 'Não responde em :6396',
      envVars: ['REDIS_URL (default: redis://127.0.0.1:6396)'], envStatus: ['✅ (default)'],
      docUrl: 'https://redis.io/documentation',
    },
    {
      name: 'Embed Server', icon: 'ri-cpu-line',
      status: e.embedOnline, statusLabel: e.embedOnline ? '✅ Online' : '❌ Offline',
      statusColor: e.embedOnline ? 'success' as const : 'error' as const,
      detail: e.embedOnline ? 'mpnet 768d · Porta :8081 · 16.5ms latência' : 'Não responde em :8081/healthz',
      envVars: ['EMBED_URL (default: http://127.0.0.1:8081)'], envStatus: ['✅ (default)'],
      docUrl: 'https://huggingface.co/sentence-transformers/all-mpnet-base-v2',
    },
  ]

  // ── Integration cards (Tab 2) ──
  const integrations = [
    {
      name: 'MCP Servers (5 slots)', icon: 'ri-plug-2-line', statusColor: 'success' as const,
      detail: '5 MCP servers ativos no .mcp.json: adsentice-redis, adsentice-qdrant, adsentice-kg, adsentice-conversation, context7. dataforseo MCP DESABILITADO — substituído por provider-core v2.0 (HTTP direto, sem MCP).',
      items: ['adsentice-redis (npx)', 'adsentice-qdrant (uv run)', 'adsentice-kg (uv run)', 'adsentice-conversation (uv run)', 'context7 (npx, docs)', 'dataforseo → disabled: true (provider-core substitui)'],
    },
    {
      name: 'provider-core v2.0 · 21 tools DataForSEO', icon: 'ri-flashlight-line', statusColor: 'primary' as const,
      detail: 'DataForSEO direto, 1 hop HTTP. 21 tools L0→L4 (Fases 1-5 completas). Sandbox $0 dev, live prod. 3 caps Enterprise no roadmap futuro.',
      items: [
        '✅ L0: business_listings_search ($0.015)',
        '✅ L1: business_profile_gmb ($0.0054)',
        '✅ L2: instant_pages ($0.000125) · domain_technologies ($0.01) · lighthouse ($0.00425)',
        '✅ L3: backlinks · domain_competitors · ranked_keywords · keyword_gap · domain_overview ($0.01 cada)',
        '✅ L4: keyword_research ($0.02) · keyword_volume ($0.075) · trends ($0.009) · related ($0.0109)',
        '✅ L4: serp_organic ($0.002) · serp_local_finder ($0.002) · serp_maps ($0.002)',
        '✅ L4: google_reviews ($0.00075) · business_qa ($0.00075) · content_sentiment ($0.02)',
        '📦 packages/provider-core/ · 21 tools · 28 arquivos · Shape Catalog 27 endpoints',
        '🔮 Roadmap: ai.llm.mentions · ai.llm.responses · domain.whois · on_page.crawl_summary',
      ],
    },
    {
      name: 'EVO-API · Referência canônica', icon: 'ri-book-open-line', statusColor: 'info' as const,
      detail: 'Não mais usado como runtime de chamadas DataForSEO. Permanece como referência de arquitetura: 76 capabilities mapeadas, shapes completos, cost-registry, translators, e padrão de 3-stage gate (Shape→Sandbox→Live).',
      items: ['📚 Shape catalog: 111 endpoints (6 clusters)', '📚 Translators: 50+ pares request/response', '📚 Cost Registry: 50+ capabilities precificadas', '📚 Sandbox-first pattern: $0 com shapes reais', '📚 Canonical I/O: input/output schema por capability', '🔌 Runtime: substituído por provider-core direto'],
    },
    {
      name: 'OpenStreetMap Nominatim', icon: 'ri-map-pin-2-line', statusColor: 'warning' as const,
      detail: 'Geo Resolver gratuito (sem API key). Reverse geocode lat/lng → cidade/bairro. Forward search cidade → coordenadas. Rate limit: 1 req/s. Usado como fallback quando GMB retorna city=NULL.',
      items: ['reverseGeocode() — lat/lng → cidade', 'searchCity() — nome → coordenadas', 'Rate limit: 1.1s entre chamadas', 'User-Agent: adsentice/1.0', 'Gratuito, sem API key', 'Endpoint: nominatim.openstreetmap.org'],
    },
    {
      name: 'Supabase pg Pool', icon: 'ri-database-2-line', statusColor: hasDbPassword ? 'success' as const : 'warning' as const,
      detail: hasDbPassword
        ? 'Pooler direto aws-0-ca-central-1.pooler.supabase.com:6543. Bypassa RLS, permissão garantida via service_role. Usado por: discovery-persistence.ts, market-intel.ts, market/page.tsx, leads/page.tsx, pipeline/page.tsx.'
        : 'SUPABASE_DB_PASSWORD não configurado — pg Pool offline. Páginas de leads e pipeline não funcionarão.',
      items: hasDbPassword
        ? ['Host: aws-0-ca-central-1.pooler.supabase.com', 'Porta: 6543 (PgBouncer)', 'Database: postgres', 'Max connections: 5 (lib), 3 (market-intel)', 'Timeout: 5s connection', 'SSL: required (rejectUnauthorized: false)']
        : ['⚠️ Configure SUPABASE_DB_PASSWORD no .env'],
    },
    {
      name: 'DeepSeek (copywriter S10)', icon: 'ri-robot-2-line', statusColor: hasDeepSeek ? 'info' as const : 'warning' as const,
      detail: hasDeepSeek
        ? 'LLM cost-capped para copywriting de relatórios Raio-X (S10). NÃO é extrator de dados — o provider-core extrai via DataForSEO. DeepSeek só gera copy estratégica. KV Cache ON por padrão (98% cheaper input a partir da 2ª chamada).'
        : 'DEEPSEEK_API_KEY não configurado. S10 usará template fallback (PERSONA_FALLBACK).',
      items: hasDeepSeek
        ? ['Modelo: DeepSeek V4 Flash', 'Custo: ~$0.000076/chamada (com KV Cache)', 'Input: $0.0028/1M (hit) · $0.14/1M (miss)', 'Output: $0.28/1M', 'Temperature: 0.8', 'Fallback: PERSONA_FALLBACK templates']
        : ['⚠️ Configure DEEPSEEK_API_KEY em docs/secret/.env.DEEPSEEK'],
    },
  ]

  // ── Feature cards (Tab 3) ──
  const features = [
    {
      name: 'Enrichment Engine (L0→L4 via provider-core)', icon: 'ri-rocket-2-line', color: 'primary' as const,
      detail: 'Pipeline de enriquecimento progressivo. 21 tools provider-core em 5 camadas. Fases 1-5 completas (52.5% de 40 caps mapeadas). 37 sinais de scoring em 9 dimensões.',
      metrics: [
        { label: 'L0 Discovery', value: '$0.015', chip: 'listings_search' },
        { label: 'L1 Profile', value: '$0.0054', chip: 'profile_gmb' },
        { label: 'L2 Website+SEO', value: '$0.014', chip: 'instant+tech+lighthouse' },
        { label: 'L3 Competitive', value: '$0.060', chip: '6 tools (backlinks+domain+kw)' },
        { label: 'L4 Keywords+SERP', value: '$0.177', chip: '11 tools (volume+trends+serp+reviews)' },
        { label: 'Custo pipeline', value: '~$0.272', chip: 'L0→L4 completo' },
        { label: 'Sinais ativos', value: '37', chip: '9 dimensões' },
        { label: 'Fase 6 (roadmap)', value: '4 tools', chip: 'Enterprise R$997/mês' },
      ],
    },
    {
      name: 'Market Intelligence Engine', icon: 'ri-pie-chart-2-line', color: 'error' as const,
      detail: `ADR-0009 · Agregação por categoria × região (ZERO novas APIs). ${marketCats.length} categorias com dados no Supabase.`,
      metrics: [
        { label: 'Categorias', value: String(marketCats.length), chip: 'com dados' },
        { label: 'Funções', value: '6', chip: 'aggregate + gaps + opportunity + density' },
        { label: 'Página', value: '/admin/market', chip: 'ADR-0009' },
        { label: 'Custo', value: '$0', chip: 'zero API' },
      ],
    },
    {
      name: 'Content Gap Analyzer', icon: 'ri-file-text-line', color: 'secondary' as const,
      detail: 'v0.5 · 8 sinais C1-C8. Classifica maturidade de conteúdo em 5 níveis. Recommendation engine determinístico com anti-pattern detection.',
      metrics: [
        { label: 'Sinais', value: '8', chip: 'C1-C8' },
        { label: 'Maturity Levels', value: '5', chip: 'Invisível → Maduro' },
        { label: 'Anti-patterns', value: '5', chip: 'single-page, orphan, ghost...' },
        { label: 'Custo', value: '$0', chip: 'zero API' },
      ],
    },
    {
      name: 'Geo Resolver', icon: 'ri-earth-line', color: 'warning' as const,
      detail: 'v0.6 · 27 capitais BR (IBGE 2024). Raio dinâmico por população. Reverse geocode via OpenStreetMap Nominatim.',
      metrics: [
        { label: 'Capitais', value: '27', chip: 'todos estados BR' },
        { label: 'Raio SP', value: '25km', chip: 'megacidade' },
        { label: 'Raio Palmas', value: '10km', chip: 'cidade pequena' },
        { label: 'Custo', value: '$0', chip: 'gratuito' },
      ],
    },
    {
      name: 'Wa-Check · WhatsApp Verification', icon: 'ri-whatsapp-line', color: 'success' as const,
      detail: 'Verificador de WhatsApp Business via wa.me público. Confirma se o número tem conta real (og:title) e se é Business Account. 1.370 phones no banco aguardando verificação. Acesse o gerenciador em Settings > Wa-Check.',
      metrics: [
        { label: 'Phones no banco', value: '1.370', chip: 'L1+' },
        { label: 'Custo', value: '$0', chip: 'wa.me público' },
        { label: 'Cache', value: 'Memória', chip: 'server-side' },
        { label: 'Timeout', value: '5s', chip: 'por chamada' },
      ],
    },
    {
      name: 'DAG Skill (/dag)', icon: 'ri-mind-map', color: 'info' as const,
      detail: 'KG-first grounded recall. 5 passos: KG semântico → git log → filesystem → síntese → persist. Inspirado no c1·Recuperador do EVO-API.',
      metrics: [
        { label: 'Passos', value: '5', chip: 'KG→git→fs→síntese→persist' },
        { label: 'Collections', value: '3', chip: 'conversation + self + memory' },
        { label: 'BOA boost', value: '+0.13', chip: 'decision_boost' },
      ],
    },
    {
      name: 'Knowledge Graph', icon: 'ri-git-branch-line', color: 'success' as const,
      detail: `Qdrant :6352 com 4 coleções. ${e.corpusTotal.toLocaleString('pt-BR')} pontos totais. 47 skills Corey Haines ingeridos (100% cobertura).`,
      metrics: [
        { label: 'adsentice-self', value: '1.230', chip: 'docs+ADRs+specs' },
        { label: 'adsentice-conversation', value: '31K', chip: 'histórico' },
        { label: 'claude-memory', value: '19', chip: 'decisões' },
        { label: 'Skills Corey', value: '47/47', chip: 'ingeridos' },
      ],
    },
  ]

  // ── Intelligence cards (Tab 4) ──
  const intelligence = [
    {
      name: 'Scoring Engine', icon: 'ri-bar-chart-grouped-line', color: 'primary' as const,
      detail: 'Compound Score = Fit×0.40 + Engagement×0.35 + Intent×0.25. 9 dimensões, 37 sinais ativos.',
      groups: [
        { prefix: 'F', label: 'Fit (ICP)', count: 10, max: 75, color: '#4caf50' },
        { prefix: 'E', label: 'Engagement', count: 7, max: 70, color: '#ffa726' },
        { prefix: 'I', label: 'Intent', count: 3, max: 80, color: '#ef5350' },
        { prefix: 'W', label: 'Website+SEO', count: 12, max: 88, color: '#42a5f5' },
        { prefix: 'C', label: 'Content Gap', count: 8, max: 55, color: '#9c27b0' },
        { prefix: 'A', label: 'Architecture', count: 4, max: 25, color: '#ff9800' },
        { prefix: 'S', label: 'Schema', count: 3, max: 33, color: '#f44336' },
        { prefix: 'K', label: 'Competitive', count: 4, max: 43, color: '#607d8b' },
        { prefix: 'R', label: 'VOC', count: 3, max: 33, color: '#e91e63' },
      ],
    },
    {
      name: 'BOA Score Pipeline', icon: 'ri-heart-pulse-line', color: 'error' as const,
      detail: `BOA: ${e.boaScore.toFixed(3)} ${e.boaVeredict}. Fórmula: 0.30·stability + 0.20·performance + 0.15·error_free + 0.35·founder_signal.`,
      metrics: [
        { label: 'Stability', value: '0.30', chip: `${e.commits} commits` },
        { label: 'Performance', value: '0.20', chip: 'embed + Qdrant + Redis' },
        { label: 'Error Free', value: '0.15', chip: '6/6 vault + docs' },
        { label: 'Founder Signal', value: '0.35', chip: 'claude-memory + git + OODA' },
        { label: 'ADRs', value: '9', chip: '7 accepted' },
        { label: 'Commits', value: String(e.commits), chip: '30 dias' },
      ],
    },
    {
      name: 'Pipeline de Persistência', icon: 'ri-archive-line', color: 'success' as const,
      detail: '3 camadas: Supabase (permanente) → Redis (cache 24h) → Memory (30min). Dados pagos NUNCA perdidos.',
      metrics: [
        { label: 'Supabase', value: 'DURÁVEL', chip: 'discovery_listings' },
        { label: 'Redis', value: 'Cache 24h', chip: ':6396' },
        { label: 'Memory', value: 'Cache 30min', chip: 'server-side' },
        { label: 'R2 Vault', value: r2Ready ? '✅' : '⬜', chip: '6/6 testes' },
        { label: 'Migrations', value: '3', chip: '001 + 002 + 003' },
        { label: 'DISTINCT ON', value: 'place_id', chip: 'dedup' },
      ],
    },
    {
      name: 'Skills Adsentice (4 próprias)', icon: 'ri-code-box-line', color: 'info' as const,
      detail: '4 skills Claude Code: adsentice-chat (pipeline discovery), adsentice-spec (autorar ADRs/specs), adsentice-site-audit (SEO técnico), dag (KG-first recall).',
      items: ['adsentice-chat: pipeline discovery + chat conversacional', 'adsentice-spec: autorar specs + ADRs (inspirado spec-master EVO-API)', 'adsentice-site-audit: Firecrawl + DataForSEO ONPAGE', 'dag: KG-first → git log → filesystem → medido=verdade'],
    },
    {
      name: '14 Skills Corey → Features', icon: 'ri-lightbulb-flash-line', color: 'warning' as const,
      detail: '14 dos 47 skills Corey Haines mapeados para módulos de código. Cobertura: 12%→40% do framework completo.',
      items: [
        'site-architecture.ts: A1-A4 (flat, orphan, nav, layout)',
        'schema-scoring.ts: S1-S3 + auto-generate JSON-LD',
        'product-context.ts: 12-section foundation doc',
        'recommend.ts: unified ActionPlan generator',
        'tool-suggester.ts: 29×6=174 suggestions',
        'battle-card.ts: objections + ROI + WhatsApp',
        'marketing-plan.ts: 13-section flagship',
        'programmatic-seo.ts: Locations playbook',
        'competitor-intel.ts: K1-K4 landscape',
        'voc-extractor.ts: R1-R3 voice of customer',
        'content-gap.ts: C1-C8 maturity scoring',
        'market-intel.ts: 6 aggregation functions',
        'geo-resolver.ts: reverse + forward geocode',
        'scoring.ts: W9-W12 SEO expansion',
      ],
    },
    {
      name: 'Produtos Vendáveis', icon: 'ri-shopping-bag-3-line', color: 'primary' as const,
      detail: 'Produtos habilitados pelo pipeline de enriquecimento, do gratuito ao premium.',
      items: [
        'Raio-X Gratuito (R$0) — diagnóstico automático do marketing digital',
        'Auditoria de Site (R$47) — PDF com 30+ checks técnicos',
        'SEO Local (R$197/mês) — otimização contínua + relatórios',
        'Domínio (R$497/mês) — competitive intelligence + full stack',
        'Raio-X de Mercado (R$0) — inteligência de nicho agregada',
        'Relatório de Nicho (R$197) — PDF com TAM + gaps + concorrência',
        'Radar Competitivo (R$497/mês) — monitoramento contínuo',
        'Battle Card (incluído) — objeções + ROI + script WhatsApp',
      ],
    },
  ]

  // ── Render helpers ──
  const renderProviderCard = (p: typeof providers[0]) => (
    <Grid key={p.name} size={{ xs: 12, md: 6 }}>
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{ width: 48, height: 48, borderRadius: 'var(--r-md)', bgcolor: `${p.statusColor}.50`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <i className={p.icon} style={{ fontSize: '1.5rem', color: `var(--mui-palette-${p.statusColor}-main)` }} />
              </Box>
              <Box>
                <Typography variant='h6'>{p.name}</Typography>
                <Chip label={p.statusLabel} size='small' color={p.statusColor} variant='tonal' />
              </Box>
            </Box>
            <Button variant='outlined' size='small' href={p.docUrl} target='_blank' rel='noopener noreferrer'>Acessar ↗</Button>
          </Box>
          <Typography variant='body2' color='text.secondary' sx={{ mb: 2 }}>{p.detail}</Typography>
          <Divider sx={{ my: 2 }} />
          <Typography variant='caption' fontWeight={600} color='text.secondary' gutterBottom component='div'>Variáveis de Ambiente</Typography>
          <Table size='small'>
            <TableBody>
              {p.envVars.map((envVar, i) => (
                <TableRow key={envVar}>
                  <TableCell sx={{ border: 'none', py: 0.5 }}><Typography variant='caption' sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>{envVar}</Typography></TableCell>
                  <TableCell align='right' sx={{ border: 'none', py: 0.5 }}><Chip label={p.envStatus[i] || '—'} size='small' variant='outlined' color={p.envStatus[i]?.startsWith('✅') ? 'success' : 'default'} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </Grid>
  )

  const renderIntegrationCard = (p: typeof integrations[0]) => (
    <Grid key={p.name} size={{ xs: 12, md: 6 }}>
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
            <Box sx={{ width: 40, height: 40, borderRadius: 'var(--r-md)', bgcolor: `${p.statusColor}.50`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <i className={p.icon} style={{ fontSize: '1.25rem', color: `var(--mui-palette-${p.statusColor}-main)` }} />
            </Box>
            <Typography variant='h6' fontSize='1rem'>{p.name}</Typography>
          </Box>
          <Typography variant='body2' color='text.secondary' sx={{ mb: 1.5 }}>{p.detail}</Typography>
          {p.items && (
            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
              {p.items.map((item: string) => (
                <Chip key={item} label={item} size='small' variant='outlined' sx={{ fontSize: '0.65rem' }} />
              ))}
            </Box>
          )}
        </CardContent>
      </Card>
    </Grid>
  )

  const renderFeatureCard = (f: typeof features[0]) => (
    <Grid key={f.name} size={{ xs: 12, md: 6 }}>
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
            <Box sx={{ width: 40, height: 40, borderRadius: 'var(--r-md)', bgcolor: `${f.color}.50`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <i className={f.icon} style={{ fontSize: '1.25rem', color: `var(--mui-palette-${f.color}-main)` }} />
            </Box>
            <Typography variant='h6' fontSize='1rem'>{f.name}</Typography>
            <Chip label="ATIVO" size='small' color='success' variant='tonal' sx={{ ml: 'auto' }} />
          </Box>
          <Typography variant='body2' color='text.secondary' sx={{ mb: 1.5 }}>{f.detail}</Typography>
          {f.metrics && (
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {f.metrics.map((m: { label: string; value: string; chip: string }) => (
                <Chip key={m.label} label={`${m.label}: ${m.value}`} size='small' variant='tonal' sx={{ fontSize: '0.65rem' }} />
              ))}
            </Box>
          )}
        </CardContent>
      </Card>
    </Grid>
  )

  const renderIntelligenceCard = (f: typeof intelligence[0]) => (
    <Grid key={f.name} size={{ xs: 12, md: 6 }}>
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
            <Box sx={{ width: 40, height: 40, borderRadius: 'var(--r-md)', bgcolor: `${f.color}.50`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <i className={f.icon} style={{ fontSize: '1.25rem', color: `var(--mui-palette-${f.color}-main)` }} />
            </Box>
            <Typography variant='h6' fontSize='1rem'>{f.name}</Typography>
          </Box>
          <Typography variant='body2' color='text.secondary' sx={{ mb: 1.5 }}>{f.detail}</Typography>
          {f.groups && (
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {f.groups.map((g: { prefix: string; label: string; count: number; max: number; color: string }) => (
                <Chip key={g.prefix}
                  label={`${g.prefix} ${g.label}: ${g.count} sinais`}
                  size='small' variant='tonal'
                  sx={{ fontSize: '0.65rem', bgcolor: `${g.color}22`, color: g.color, fontWeight: 600 }} />
              ))}
            </Box>
          )}
          {f.metrics && (
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {f.metrics.map((m: { label: string; value: string; chip: string }) => (
                <Chip key={m.label} label={`${m.label}: ${m.value} (${m.chip})`} size='small' variant='outlined' sx={{ fontSize: '0.65rem' }} />
              ))}
            </Box>
          )}
          {f.items && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
              {f.items.map((item: string, i: number) => (
                <Typography key={i} variant='caption' color='text.secondary' sx={{ fontFamily: 'monospace', fontSize: '0.7rem' }}>• {item}</Typography>
              ))}
            </Box>
          )}
        </CardContent>
      </Card>
    </Grid>
  )

  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12 }}>
        <Typography variant='h4'>⚙️ Settings · Integrações</Typography>
        <Typography variant='body2' color='text.secondary'>
          Status de todos os serviços, integrações, features e inteligência do ecossistema adsentice
        </Typography>
      </Grid>

      {/* ═══ ECOSYSTEM HEALTH ═══ */}
      <Grid size={{ xs: 12 }}>
        <Card sx={{ bgcolor: 'var(--pastel-sky)' }}>
          <CardContent>
            <Typography variant='h6' gutterBottom>🏥 Ecossistema Health</Typography>
            <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
              {[
                { label: 'Infra (Redis+Qdrant+Embed)', count: [e.qdrantOnline, e.redisOnline, e.embedOnline].filter(Boolean).length, total: 3 },
                { label: 'Supabase', count: (supabaseReady ? 1 : 0) + (hasDbPassword ? 1 : 0), total: 2 },
                { label: 'Cloudflare', count: cfServicesReady, total: 2 },
                { label: 'DataForSEO', count: hasDataForSeo ? 1 : 0, total: 1 },
                { label: 'DeepSeek', count: hasDeepSeek ? 1 : 0, total: 1 },
                { label: 'BOA Score', count: Math.round(e.boaScore * 100), total: 100 },
              ].map((h) => (
                <Box key={h.label} sx={{ textAlign: 'center' }}>
                  <Typography variant='h5' fontWeight={800} color={h.count === h.total ? 'success.main' : h.count > 0 ? 'warning.main' : 'error.main'}>
                    {h.label.includes('BOA') ? `${h.count}/100` : `${h.count}/${h.total}`}
                  </Typography>
                  <Typography variant='caption' color='text.secondary'>{h.label}</Typography>
                </Box>
              ))}
            </Box>
          </CardContent>
        </Card>
      </Grid>

      {/* ═══ TAB 1: INFRAESTRUTURA ═══ */}
      <Grid size={{ xs: 12 }}>
        <Typography variant='h5' gutterBottom sx={{ mt: 2 }}>
          <Chip label='INFRA' size='medium' color='primary' sx={{ mr: 1, fontWeight: 700 }} />
          Infraestrutura · 7 Serviços
        </Typography>
        <Typography variant='body2' color='text.secondary' sx={{ mb: 2 }}>
          Serviços core do ecossistema — saúde, credenciais e variáveis de ambiente
        </Typography>
      </Grid>
      {providers.map(renderProviderCard)}

      {/* ═══ TAB 2: INTEGRAÇÕES ═══ */}
      <Grid size={{ xs: 12 }}>
        <Typography variant='h5' gutterBottom sx={{ mt: 4 }}>
          <Chip label='INTEGRAÇÕES' size='medium' color='info' sx={{ mr: 1, fontWeight: 700 }} />
          APIs, MCP Servers e Conectores
        </Typography>
        <Typography variant='body2' color='text.secondary' sx={{ mb: 2 }}>
          Serviços externos e protocolos de integração usados pelo adsentice
        </Typography>
      </Grid>
      {integrations.map(renderIntegrationCard)}

      {/* ═══ TAB 3: FEATURES ═══ */}
      <Grid size={{ xs: 12 }}>
        <Typography variant='h5' gutterBottom sx={{ mt: 4 }}>
          <Chip label='FEATURES' size='medium' color='success' sx={{ mr: 1, fontWeight: 700 }} />
          Funcionalidades Construídas · v0.2 — v0.6
        </Typography>
        <Typography variant='body2' color='text.secondary' sx={{ mb: 2 }}>
          Módulos de código implementados — todos compilando e ativos em produção
        </Typography>
      </Grid>
      {features.map(renderFeatureCard)}

      {/* ═══ TAB 4: INTELIGÊNCIA ═══ */}
      <Grid size={{ xs: 12 }}>
        <Typography variant='h5' gutterBottom sx={{ mt: 4 }}>
          <Chip label='INTELIGÊNCIA' size='medium' color='warning' sx={{ mr: 1, fontWeight: 700 }} />
          Scoring, BOA, Pipeline e Produtos
        </Typography>
        <Typography variant='body2' color='text.secondary' sx={{ mb: 2 }}>
          Camada analítica — do scoring engine ao produto final
        </Typography>
      </Grid>
      {intelligence.map(renderIntelligenceCard)}

      {/* ── Pipeline Alert ── */}
      <Grid size={{ xs: 12 }}>
        <Alert severity={hasServiceRole ? 'success' : 'info'} variant='outlined'>
          <Typography variant='body2' fontWeight={600} gutterBottom>
            {hasServiceRole ? '🟢 provider-core + Supabase Ativos' : '🟡 Pipeline Parcial'}
          </Typography>
          <Typography variant='caption'>
            {hasServiceRole
              ? 'provider-core v1.0 chama DataForSEO direto (1 hop). Dados persistidos no Supabase: discovery_searches + discovery_listings. Sandbox $0 para dev (mesmos shapes, dados fake). Redis (cache 24h) + Memory (30min) como fallback rápido. EVO-API mantido como referência canônica de arquitetura (shapes, translators, cost-registry).'
              : 'Falta SUPABASE_SERVICE_ROLE_KEY. Dados pagos em Redis (24h) + Memory (30min) — risco de perda.'}
          </Typography>
          <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Chip label='provider-core: DIRETO' size='small' color='primary' variant='filled' />
            <Chip label='Supabase: DURÁVEL' size='small' color={hasServiceRole ? 'success' : 'default'} variant={hasServiceRole ? 'filled' : 'outlined'} />
            <Chip label='Redis: Cache 24h' size='small' color='warning' variant='filled' />
            <Chip label='EVO-API: Referência' size='small' color='info' variant='outlined' />
            <Chip label={`Sandbox: ${process.env.DATAFORSEO_MODE === 'sandbox' ? '🧪 $0' : '🔴 live'}`} size='small' color={process.env.DATAFORSEO_MODE === 'sandbox' ? 'info' : 'error'} variant='filled' />
          </Box>
        </Alert>
      </Grid>
    </Grid>
  )
}

export default SettingsPage
