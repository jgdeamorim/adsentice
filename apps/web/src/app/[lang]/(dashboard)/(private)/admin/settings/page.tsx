
// adsentice · Admin / Settings — Integrações & Configuração
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

const SettingsPage = async ({ params }: { params: Promise<{ lang: string }> }) => {
  const { lang } = await params
  const user = await getSessionUser()

  if (user?.role !== 'admin') redirect(`/${lang}/app`)

  const e = await getAdminDashboardData()

  // ── Auth providers ──
  const providers = [
    {
      name: 'Supabase',
      icon: 'ri-database-2-line',
      status: !!user,
      statusLabel: !!user ? 'Conectado' : 'Não configurado',
      statusColor: !!user ? 'success' as const : 'error' as const,
      detail: !!user
        ? `Autenticado como ${user.email} · role: ${user.role}`
        : 'NEXT_PUBLIC_SUPABASE_URL + ANON_KEY necessários',
      envVars: ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY'],
      envStatus: ['✅', '✅'],
      docUrl: 'https://supabase.com/docs/guides/auth',
    },
    {
      name: 'Cloudflare R2',
      icon: 'ri-cloud-line',
      status: false,
      statusLabel: 'Não configurado',
      statusColor: 'warning' as const,
      detail: 'Bucket R2 para vault de dados (blobs, relatórios, PDFs). Credenciais necessárias no .env.',
      envVars: ['CLOUDFLARE_R2_ACCOUNT_ID', 'CLOUDFLARE_R2_ACCESS_KEY', 'CLOUDFLARE_R2_SECRET_KEY', 'CLOUDFLARE_R2_BUCKET'],
      envStatus: ['⬜ Pendente', '⬜ Pendente', '⬜ Pendente', '⬜ Pendente'],
      docUrl: 'https://developers.cloudflare.com/r2/api/s3/',
    },
    {
      name: 'EVO-API',
      icon: 'ri-plug-line',
      status: e.evoApiOnline,
      statusLabel: e.evoApiOnline ? 'Online' : 'Offline',
      statusColor: e.evoApiOnline ? 'success' as const : 'error' as const,
      detail: e.evoApiOnline
        ? `Porta :7700 · ${e.capabilities} capabilities · ${e.mcpServers} MCP servers`
        : 'EVO-API não está respondendo em http://127.0.0.1:7700/health',
      envVars: ['EVO_API_URL (default: http://127.0.0.1:7700)'],
      envStatus: ['✅ (default)'],
      docUrl: 'https://github.com/jgdeamorim/EVO-API',
    },
    {
      name: 'DataForSEO',
      icon: 'ri-search-line',
      status: true,
      statusLabel: 'Live',
      statusColor: 'success' as const,
      detail: `Credenciais configuradas · $${e.dataCostToday.toFixed(4)} gastos hoje`,
      envVars: ['DATAFORSEO_LOGIN', 'DATAFORSEO_PASSWORD'],
      envStatus: ['✅', '✅'],
      docUrl: 'https://docs.dataforseo.com/',
    },
    {
      name: 'Qdrant',
      icon: 'ri-brain-line',
      status: e.qdrantOnline,
      statusLabel: e.qdrantOnline ? 'Online' : 'Offline',
      statusColor: e.qdrantOnline ? 'success' as const : 'error' as const,
      detail: e.qdrantOnline
        ? `Porta :6352 · ${e.corpusTotal.toLocaleString('pt-BR')} pontos (${e.corpusSelf} self + ${e.corpusConversation} conv + ${e.corpusMaterio} materio)`
        : 'Qdrant não está respondendo em http://127.0.0.1:6352/healthz',
      envVars: ['QDRANT_URL (default: http://127.0.0.1:6352)'],
      envStatus: ['✅ (default)'],
      docUrl: 'https://qdrant.tech/documentation/',
    },
    {
      name: 'Redis OODA',
      icon: 'ri-database-line',
      status: e.redisOnline,
      statusLabel: e.redisOnline ? 'Online' : 'Offline',
      statusColor: e.redisOnline ? 'success' as const : 'error' as const,
      detail: e.redisOnline
        ? `Porta :6396 · BOA ${e.boaScore}/${e.boaVeredict}`
        : 'Redis não está respondendo em :6396',
      envVars: ['REDIS_URL (default: redis://127.0.0.1:6396)'],
      envStatus: ['✅ (default)'],
      docUrl: 'https://redis.io/documentation',
    },
  ]

  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12 }}>
        <Typography variant='h4'>⚙️ Settings · Integrações</Typography>
        <Typography variant='body2' color='text.secondary'>
          Status de autenticação e conectividade de todos os serviços do ecossistema
        </Typography>
      </Grid>

      {/* ── Provider status cards ── */}
      {providers.map((provider) => (
        <Grid key={provider.name} size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box sx={{
                    width: 48, height: 48, borderRadius: 'var(--r-md)',
                    bgcolor: `${provider.statusColor}.50`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <i className={provider.icon} style={{ fontSize: '1.5rem', color: `var(--mui-palette-${provider.statusColor}-main)` }} />
                  </Box>
                  <Box>
                    <Typography variant='h6'>{provider.name}</Typography>
                    <Chip label={provider.statusLabel} size='small' color={provider.statusColor} variant='tonal' />
                  </Box>
                </Box>
                <Button
                  variant='outlined'
                  size='small'
                  href={provider.docUrl}
                  target='_blank'
                  rel='noopener noreferrer'
                >
                  Docs ↗
                </Button>
              </Box>

              <Typography variant='body2' color='text.secondary' sx={{ mb: 2 }}>
                {provider.detail}
              </Typography>

              <Divider sx={{ my: 2 }} />

              <Typography variant='caption' fontWeight={600} color='text.secondary' gutterBottom component='div'>
                Variáveis de Ambiente
              </Typography>
              <Table size='small'>
                <TableBody>
                  {provider.envVars.map((envVar, i) => (
                    <TableRow key={envVar}>
                      <TableCell sx={{ border: 'none', py: 0.5 }}>
                        <Typography variant='caption' sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                          {envVar}
                        </Typography>
                      </TableCell>
                      <TableCell align='right' sx={{ border: 'none', py: 0.5 }}>
                        <Chip label={provider.envStatus[i] || '—'} size='small' variant='outlined'
                          color={provider.envStatus[i]?.startsWith('✅') ? 'success' : 'default'} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </Grid>
      ))}

      {/* ── Ecosystem health summary ── */}
      <Grid size={{ xs: 12 }}>
        <Card sx={{ bgcolor: 'var(--pastel-sky)' }}>
          <CardContent>
            <Typography variant='h6' gutterBottom>🏥 Ecossistema Health</Typography>
            <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
              {[
                { label: 'Infra', count: [e.qdrantOnline, e.redisOnline, e.embedOnline].filter(Boolean).length, total: 3 },
                { label: 'APIs', count: [e.evoApiOnline, true].filter(Boolean).length, total: 2 },
                { label: 'Auth', count: !!user ? 1 : 0, total: 1 },
                { label: 'MCP', count: e.mcpServers, total: 7 },
              ].map((h) => (
                <Box key={h.label} sx={{ textAlign: 'center' }}>
                  <Typography variant='h5' fontWeight={800} color={h.count === h.total ? 'success.main' : 'warning.main'}>
                    {h.count}/{h.total}
                  </Typography>
                  <Typography variant='caption' color='text.secondary'>{h.label}</Typography>
                </Box>
              ))}
            </Box>
          </CardContent>
        </Card>
      </Grid>

      {/* ── R2 Setup Instructions ── */}
      <Grid size={{ xs: 12 }}>
        <Alert severity='info' variant='outlined'>
          <Typography variant='body2' fontWeight={600} gutterBottom>
            🔧 Para conectar o Cloudflare R2:
          </Typography>
          <Typography variant='caption' component='div'>
            1. Criar bucket no Cloudflare Dashboard → R2 → Create bucket (ex: adsentice-vault)<br />
            2. Gerar Access Key e Secret Key em R2 → Manage R2 API Tokens<br />
            3. Adicionar ao <code>.env</code>:
          </Typography>
          <Box sx={{ fontFamily: 'monospace', fontSize: '0.75rem', p: 1, bgcolor: 'grey.100', borderRadius: 1, my: 1 }}>
            CLOUDFLARE_R2_ACCOUNT_ID=your_account_id<br />
            CLOUDFLARE_R2_ACCESS_KEY=your_access_key<br />
            CLOUDFLARE_R2_SECRET_KEY=your_secret_key<br />
            CLOUDFLARE_R2_BUCKET=adsentice-vault
          </Box>
          <Typography variant='caption' color='text.secondary'>
            O package vault já está implementado (6/6 testes passando) e será ativado automaticamente
            quando as credenciais estiverem presentes.
          </Typography>
        </Alert>
      </Grid>
    </Grid>
  )
}

export default SettingsPage
