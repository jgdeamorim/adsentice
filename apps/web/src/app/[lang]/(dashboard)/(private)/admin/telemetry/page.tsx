

// adsentice · Admin / Telemetry — Finding Alerts + Route Health + Event Log
// Padrão EVO-API :7700/health + capital.RS capital-observability
import { redirect } from 'next/navigation'

import Grid from '@mui/material/Grid2'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import Chip from '@mui/material/Chip'
import Box from '@mui/material/Box'
import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Paper from '@mui/material/Paper'

import { getSessionUser } from '@/libs/supabase/server'
import { getAlerts, getEvents, getRouteStats } from '@/lib/telemetry'
import { execSync } from 'child_process'

export const dynamic = 'force-dynamic'

const TelemetryPage = async ({ params }: { params: Promise<{ lang: string }> }) => {
  const { lang } = await params
  const user = await getSessionUser()
  if (user?.role !== 'admin') redirect(`/${lang}/app`)

  const alerts = getAlerts()
  const activeAlerts = alerts.filter(a => !a.acknowledged)
  const events = getEvents(50)
  const stats = getRouteStats()
  const recentErrors = events.filter(e => e.status >= 400)

  // Árbitro DeepSeek verdict (Redis, TTL 2h)
  let arbiterVerdict: any = null
  try {
    const raw = execSync("redis-cli -p 6396 --no-auth-warning GET adsentice:telemetry:arbiter_verdict", { timeout: 2000, stdio: ["ignore", "pipe", "ignore"] }).toString().trim()
    if (raw) arbiterVerdict = JSON.parse(raw)
  } catch { /* offline */ }

  const healthStatus = activeAlerts.length > 0 ? '⚠️ Degraded' : '✅ Healthy'
  const healthColor = activeAlerts.filter(a => a.level === 'critical').length > 0 ? 'error' as const
    : activeAlerts.length > 0 ? 'warning' as const : 'success' as const

  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant='h4'>📡 Telemetria · Finding Alerts</Typography>
            <Typography variant='body2' color='text.secondary'>
              Padrão EVO-API k0_breath + capital.RS capital-observability
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Chip label={healthStatus} color={healthColor} size='medium' variant='tonal' />
            <Chip label={`${events.length} eventos`} size='medium' variant='outlined' />
            <Button variant='outlined' size='small' href='/api/health' target='_blank'>
              JSON ↗
            </Button>
          </Box>
        </Box>
      </Grid>

      {/* ═══ Active Alerts ═══ */}
      {activeAlerts.length > 0 && (
        <Grid size={{ xs: 12 }}>
          <Alert severity={activeAlerts.some(a => a.level === 'critical') ? 'error' : 'warning'} variant='filled'>
            <Typography variant='h6' gutterBottom>
              🚨 {activeAlerts.length} Finding Alert{activeAlerts.length > 1 ? 's' : ''} Ativo{activeAlerts.length > 1 ? 's' : ''}
            </Typography>
            {activeAlerts.slice(0, 5).map(a => (
              <Box key={a.id} sx={{ mb: 1 }}>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                  <Chip label={a.level} size='small' color={a.level === 'critical' ? 'error' : a.level === 'warning' ? 'warning' : 'info'} />
                  <Typography variant='body2' fontWeight={600}>{a.route}</Typography>
                  <Typography variant='caption' color='text.secondary'>×{a.count}</Typography>
                </Box>
                <Typography variant='body2' sx={{ ml: 1 }}>{a.message}</Typography>
                {a.detail && <Typography variant='caption' color='text.secondary' sx={{ fontFamily: 'monospace', fontSize: '0.7rem', ml: 1 }}>{a.detail?.slice(0, 200)}</Typography>}
              </Box>
            ))}
          </Alert>
        </Grid>
      )}

      {/* ═══ Arbiter Verdict (DeepSeek SRE) ═══ */}
      {arbiterVerdict ? (
        <Grid size={{ xs: 12 }}>
          <Card sx={{ bgcolor: arbiterVerdict.verdict?.includes('🔴') ? 'error.50' : arbiterVerdict.verdict?.includes('🟡') ? 'warning.50' : 'success.50', border: '1px solid', borderColor: arbiterVerdict.verdict?.includes('🔴') ? 'error.main' : arbiterVerdict.verdict?.includes('🟡') ? 'warning.main' : 'success.main' }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant='h6'>🤖 Árbitro DeepSeek · Parecer SRE</Typography>
                  <Chip label={`${arbiterVerdict.events_analyzed} eventos analisados`} size='small' variant='outlined' />
                  <Chip label={arbiterVerdict.at?.slice(0, 16).replace('T', ' ')} size='small' variant='outlined' />
                </Box>
                <Chip label='Automático (dispara ao detectar erro)' size='small' color='info' variant='tonal' />
              </Box>
              <Typography variant='body2' sx={{ whiteSpace: 'pre-line', fontFamily: 'system-ui', lineHeight: 1.8 }}>
                {arbiterVerdict.verdict}
              </Typography>
              <Typography variant='caption' color='text.secondary' sx={{ mt: 1, display: 'block' }}>
                Acionado automaticamente quando um erro crítico é detectado. TTL 2h. DeepSeek V4 Flash analisa padrões de falha e sugere root cause.
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      ) : (
        <Grid size={{ xs: 12 }}>
          <Alert severity='info'>
            <Typography variant='body2'>
              🤖 <strong>Árbitro DeepSeek ainda não acionado.</strong> O parecer SRE é gerado automaticamente quando um erro crítico (HTTP 500+) é detectado nas rotas. Execute buscas no Discovery para popular a telemetria.
            </Typography>
          </Alert>
        </Grid>
      )}

      {/* ═══ Route Health ═══ */}
      <Grid size={{ xs: 12, md: 6 }}>
        <Card>
          <CardContent>
            <Typography variant='h6' gutterBottom>🛤️ Route Health</Typography>
            {Object.keys(stats).length === 0 ? (
              <Typography variant='body2' color='text.secondary'>Nenhuma rota registrada ainda. Execute buscas Discovery para popular.</Typography>
            ) : (
              <TableContainer>
                <Table size='small'>
                  <TableHead>
                    <TableRow>
                      <TableCell>Route</TableCell>
                      <TableCell align='right'>Total</TableCell>
                      <TableCell align='right'>Errors</TableCell>
                      <TableCell align='right'>Avg Latency</TableCell>
                      <TableCell align='right'>Health</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {Object.entries(stats).map(([route, s]) => (
                      <TableRow key={route}>
                        <TableCell><Typography variant='caption' sx={{ fontFamily: 'monospace', fontSize: '0.65rem' }}>{route}</Typography></TableCell>
                        <TableCell align='right'><Typography variant='body2'>{s.total}</Typography></TableCell>
                        <TableCell align='right'><Typography variant='body2' color={s.errors > 0 ? 'error.main' : 'text.secondary'}>{s.errors}</Typography></TableCell>
                        <TableCell align='right'><Typography variant='body2'>{s.avg_latency_ms}ms</Typography></TableCell>
                        <TableCell align='right'>
                          <Chip label={s.errors === 0 ? '✅' : s.errors / s.total > 0.5 ? '🔴' : '🟡'} size='small'
                            color={s.errors === 0 ? 'success' : s.errors / s.total > 0.5 ? 'error' : 'warning'} variant='tonal' />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </CardContent>
        </Card>
      </Grid>

      {/* ═══ Recent Events ═══ */}
      <Grid size={{ xs: 12, md: 6 }}>
        <Card>
          <CardContent>
            <Typography variant='h6' gutterBottom>📋 Últimos Eventos ({events.length})</Typography>
            <Box sx={{ maxHeight: 400, overflow: 'auto' }}>
              {events.length === 0 ? (
                <Typography variant='body2' color='text.secondary'>Nenhum evento registrado.</Typography>
              ) : (
                events.slice(0, 20).map((e, i) => (
                  <Box key={i} sx={{ display: 'flex', gap: 1, alignItems: 'center', py: 0.5, borderBottom: '1px solid', borderColor: 'divider' }}>
                    <Chip label={e.status} size='small' color={e.status >= 400 ? 'error' : 'success'} variant='tonal' sx={{ minWidth: 42 }} />
                    <Typography variant='caption' sx={{ fontFamily: 'monospace', fontSize: '0.6rem', flex: 1 }}>{e.route}</Typography>
                    <Typography variant='caption' color='text.secondary'>{e.latency_ms}ms</Typography>
                    <Typography variant='caption' color='text.secondary' sx={{ fontSize: '0.6rem' }}>{e.timestamp?.slice(11, 19)}</Typography>
                  </Box>
                ))
              )}
            </Box>
          </CardContent>
        </Card>
      </Grid>

      {/* ═══ Error Log ═══ */}
      {recentErrors.length > 0 && (
        <Grid size={{ xs: 12 }}>
          <Card sx={{ bgcolor: 'error.50' }}>
            <CardContent>
              <Typography variant='h6' gutterBottom color='error.main'>🔥 Recent Errors ({recentErrors.length})</Typography>
              {recentErrors.slice(0, 10).map((e, i) => (
                <Box key={i} sx={{ mb: 1, p: 1, bgcolor: 'background.paper', borderRadius: 1 }}>
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 0.5 }}>
                    <Chip label={e.status} size='small' color='error' />
                    <Typography variant='body2' fontWeight={600}>{e.route}</Typography>
                    <Typography variant='caption' color='text.secondary'>{e.latency_ms}ms · {e.provider || 'HTTP'}</Typography>
                  </Box>
                  {e.error && <Typography variant='caption' sx={{ fontFamily: 'monospace', fontSize: '0.7rem', color: 'error.main' }}>{e.error?.slice(0, 300)}</Typography>}
                  {e.detail && <Typography variant='caption' color='text.secondary' sx={{ fontFamily: 'monospace', fontSize: '0.65rem' }}>{e.detail?.slice(0, 200)}</Typography>}
                </Box>
              ))}
            </Box>
          </CardContent>
        </Card>
      </Grid>
    )}
    </Grid>
  )
}

export default TelemetryPage
