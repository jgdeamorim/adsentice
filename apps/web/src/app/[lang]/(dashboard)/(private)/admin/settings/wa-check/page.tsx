'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

import Grid from '@mui/material/Grid2'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import Chip from '@mui/material/Chip'
import Button from '@mui/material/Button'
import Box from '@mui/material/Box'
import Alert from '@mui/material/Alert'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import LinearProgress from '@mui/material/LinearProgress'
import Paper from '@mui/material/Paper'

interface WaStatus {
  pending: { count: number; city: string; category: string; since: string } | null
  lastRun: string | null
  history: WaEntry[]
  stats: { dbPhones: number; totalVerified: number; totalBusiness: number; businessRate: number }
}

interface WaEntry {
  ts: string
  total: number
  business: number
  personal: number
  notFound: number
  errors: number
  latencyMs: number
  sampleBusiness?: { phone: string; name: string }[]
}

interface TriggerResult {
  entry: WaEntry
  stats: { total: number; business: number; personal: number; notFound: number; businessRate: number }
  sampleBusiness: { phone: string; name: string }[]
}

export default function WaCheckPage() {
  const [status, setStatus] = useState<WaStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState<TriggerResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  // ── Evolution API connection state ──
  const [evoStatus, setEvoStatus] = useState<{ connected: boolean; instance: any; offline: boolean }>({ connected: false, instance: null, offline: false })
  const [qrRefresh, setQrRefresh] = useState(0)        // cache-bust key for QR image
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchEvoStatus = useCallback(async () => {
    try {
      const r = await fetch('/api/wa-check/evolution')
      if (!r.ok) return
      const data = await r.json()
      if (data.offline) { setEvoStatus({ connected: false, instance: null, offline: true }); return }
      const inst = Array.isArray(data) ? data.find((i: any) => i.name === 'adsentice') : null
      const connected = inst?.connectionStatus === 'open'
      setEvoStatus({ connected, instance: inst, offline: false })

      // Se conectou, para o polling
      if (connected && pollingRef.current) {
        clearInterval(pollingRef.current)
        pollingRef.current = null
      }
      // QR auto-refresh — força reload da imagem
      if (!connected) setQrRefresh(prev => prev + 1)
    } catch { setEvoStatus({ connected: false, instance: null, offline: true }) }
  }, [])

  const fetchStatus = useCallback(async () => {
    try {
      const r = await fetch('/api/wa-check/status')
      if (r.ok) setStatus(await r.json())
    } catch { /* fail-soft */ }
    setLoading(false)
  }, [])

  // Poll Evolution API a cada 8s enquanto não conectado (QR code expira)
  useEffect(() => {
    fetchEvoStatus()
    fetchStatus()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (evoStatus.connected || evoStatus.offline) {
      if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null }
      return
    }
    if (!pollingRef.current) {
      pollingRef.current = setInterval(fetchEvoStatus, 8000)
    }
    return () => {
      if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null }
    }
  }, [evoStatus.connected, evoStatus.offline, fetchEvoStatus])

  // ── Polling de progresso durante execução ──
  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (running) {
      progressRef.current = setInterval(fetchStatus, 2000)
      return () => { if (progressRef.current) clearInterval(progressRef.current) }
    } else {
      if (progressRef.current) { clearInterval(progressRef.current); progressRef.current = null }
    }
  }, [running, fetchStatus])

  const handleTrigger = async () => {
    setRunning(true); setError(null); setResult(null)
    try {
      const r = await fetch('/api/wa-check/trigger', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
      const data = await r.json()
      if (r.ok) {
        setResult(data)
        await fetchStatus()
        // Continua polling até status='done'
        if (data.hasMore) {
          // Auto-poll status a cada 2s até terminar
          const poll = setInterval(async () => {
            const sr = await fetch('/api/wa-check/trigger', { method: 'GET' })
            const sp = await sr.json()
            if (sp.status === 'done') {
              clearInterval(poll)
              setRunning(false)
              await fetchStatus()
            }
          }, 2000)
          // timeout de segurança: 5 min
          setTimeout(() => { clearInterval(poll); setRunning(false) }, 300000)
        } else {
          setRunning(false)
        }
      }
      else setError(data.error || 'Erro desconhecido')
    } catch (e: any) { setError(e.message); setRunning(false) }
  }

  const handleDismiss = async () => {
    await fetch('/api/wa-check/pending', { method: 'DELETE' })
    await fetchStatus()
  }

  if (loading) return <LinearProgress sx={{ mt: 4 }} />

  return (
    <Grid container spacing={6}>
      {/* ═══ HEADER ═══ */}
      <Grid size={{ xs: 12 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
          <Typography variant='h4'>📱 Wa-Check · WhatsApp Verification</Typography>
          <Chip label='v122' size='small' color='primary' variant='tonal' />
        </Box>
        <Typography variant='body2' color='text.secondary'>
          Verificador de WhatsApp Business via wa.me público. Confirma se o número tem conta real (og:title ≠ &quot;Share on WhatsApp&quot;) e se é Business Account.
          Engine: Evolution API 2.3.7 (:3100) — ADR-0042.
        </Typography>
      </Grid>

      {/* ═══ EVOLUTION API CONNECTION ═══ */}
      <Grid size={{ xs: 12, md: 4 }}>
        <Card sx={{ bgcolor: evoStatus.offline ? 'var(--pastel-red)' : evoStatus.connected ? 'var(--pastel-green)' : 'var(--pastel-yellow)' }}>
          <CardContent>
            <Typography variant='h6' gutterBottom>
              {evoStatus.offline ? '🔴 Evolution API Offline' : evoStatus.connected ? '🟢 WhatsApp Conectado' : '🟡 Aguardando QR Code'}
            </Typography>
            {evoStatus.instance && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant='body2'>Status:</Typography>
                  <Chip label={evoStatus.instance.connectionStatus} size='small' color={evoStatus.connected ? 'success' : 'warning'} variant='tonal' />
                </Box>
                {evoStatus.instance.ownerJid && (
                  <Typography variant='caption'>JID: {evoStatus.instance.ownerJid}</Typography>
                )}
                {evoStatus.instance.profileName && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                    {evoStatus.instance.profilePicUrl && (
                      <Box component='img' src={evoStatus.instance.profilePicUrl} sx={{ width: 40, height: 40, borderRadius: '50%' }} alt='' />
                    )}
                    <Typography variant='body2' fontWeight={600}>{evoStatus.instance.profileName}</Typography>
                  </Box>
                )}
              </Box>
            )}
            {evoStatus.offline && (
              <Typography variant='body2' color='text.secondary'>Não foi possível conectar à Evolution API em :3100. Verifique se o servidor está rodando.</Typography>
            )}
            {!evoStatus.connected && !evoStatus.offline && (
              <Typography variant='body2' color='text.secondary'>Escaneie o QR Code abaixo com WhatsApp → Aparelhos conectados → Conectar um aparelho</Typography>
            )}
          </CardContent>
        </Card>
      </Grid>

      {/* ═══ QR CODE ═══ */}
      {!evoStatus.connected && !evoStatus.offline && (
        <Grid size={{ xs: 12, md: 4 }}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant='h6' gutterBottom>📱 QR Code — Escaneie para Conectar</Typography>
              <Box
                component='img'
                src={`/api/wa-check/qrcode?t=${qrRefresh}`}
                alt='QR Code WhatsApp'
                sx={{ width: 200, height: 200, imageRendering: 'pixelated' }}
              />
              <Typography variant='caption' color='text.secondary' sx={{ display: 'block', mt: 1 }}>
                O QR code é atualizado a cada recarregamento da página.
              </Typography>
              <Button size='small' variant='outlined' onClick={fetchEvoStatus} sx={{ mt: 1 }}>
                🔄 Verificar Conexão
              </Button>
            </CardContent>
          </Card>
        </Grid>
      )}

      {/* ═══ STATUS CARDS ═══ */}
      <Grid size={{ xs: 12, md: 3 }}>
        <Card>
          <CardContent sx={{ textAlign: 'center' }}>
            <Typography variant='h3' fontWeight={800} color='primary.main'>{status?.stats.dbPhones || 0}</Typography>
            <Typography variant='body2' color='text.secondary'>Phones no Banco (L0+)</Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid size={{ xs: 12, md: 3 }}>
        <Card>
          <CardContent sx={{ textAlign: 'center' }}>
            <Typography variant='h3' fontWeight={800} color='info.main'>{status?.stats.totalVerified || 0}</Typography>
            <Typography variant='body2' color='text.secondary'>Já Verificados</Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid size={{ xs: 12, md: 3 }}>
        <Card>
          <CardContent sx={{ textAlign: 'center' }}>
            <Typography variant='h3' fontWeight={800} color='success.main'>{status?.stats.totalBusiness || 0}</Typography>
            <Typography variant='body2' color='text.secondary'>💼 Business Confirmados</Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid size={{ xs: 12, md: 3 }}>
        <Card>
          <CardContent sx={{ textAlign: 'center' }}>
            <Typography variant='h3' fontWeight={800} color='warning.main'>{status?.stats.businessRate || 0}%</Typography>
            <Typography variant='body2' color='text.secondary'>Taxa Business</Typography>
          </CardContent>
        </Card>
      </Grid>

      {/* ═══ PROGRESS BAR (fila ativa) ═══ */}
      {running && status?.progress && status.progress.total > 0 && (
        <Grid size={{ xs: 12 }}>
          <Alert severity='info' variant='outlined'>
            <Typography variant='body2' fontWeight={600} gutterBottom>
              ⏳ Processando fila: {status.progress.processed}/{status.progress.total} verificados
            </Typography>
            <LinearProgress
              variant='determinate'
              value={Math.round((status.progress.processed / status.progress.total) * 100)}
              sx={{ mt: 1, height: 8, borderRadius: 4 }}
            />
            <Typography variant='caption' color='text.secondary' sx={{ mt: 0.5, display: 'block' }}>
              Padrão humano: 5-10 concorrentes alternando · 2-3s entre lotes · 15-60s entre páginas · evita bloqueio
            </Typography>
          </Alert>
        </Grid>
      )}

      {/* ═══ SCHEDULER STATUS (v131) ═══ */}
      {status?.progress && status.progress.status !== 'idle' && !running && (
        <Grid size={{ xs: 12 }}>
          <Alert severity='info' variant='outlined'>
            <Typography variant='body2' fontWeight={600} gutterBottom>
              ⏰ Fila Agendada · {status.progress.status === 'queue-empty' ? 'Aguardando novos phones' : status.progress.status === 'running' ? 'Em execução' : status.progress.status}
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Chip label={`${status.progress.queueLen || 0} na fila`} size='small' color='info' variant='tonal' />
              <Chip label={`BRT: ${new Date().toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo' })}`} size='small' variant='outlined' />
              <Chip label='Pausa 23:30-06:00 BRT' size='small' color='warning' variant='outlined' />
              <Button size='small' onClick={handleTrigger} sx={{ ml: 'auto' }}>▶️ Retomar Agora</Button>
            </Box>
            <Typography variant='caption' color='text.secondary' sx={{ mt: 0.5, display: 'block' }}>
              Modo auto: 50 phones por vez · 20-60min entre lotes · padrão humano anti-bloqueio
            </Typography>
          </Alert>
        </Grid>
      )}

      {/* ═══ PENDING ALERT ═══ */}
      {status?.pending && status.pending.count > 0 && (
        <Grid size={{ xs: 12 }}>
          <Alert
            severity='warning'
            variant='outlined'
            action={
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button size='small' color='inherit' onClick={handleDismiss}>Ignorar</Button>
                <Button size='small' variant='outlined' color='warning' onClick={handleTrigger} disabled={running}>
                  {running ? '⏳ Verificando...' : '▶️ Executar Wa-Check'}
                </Button>
              </Box>
            }
          >
            <Typography variant='body2' fontWeight={600}>
              🔴 {status.pending.count} phones pendentes de verificação
            </Typography>
            <Typography variant='caption'>
              Detectados em {status.pending.city}/{status.pending.category} · último discovery: {new Date(status.pending.since).toLocaleString('pt-BR')}
            </Typography>
          </Alert>
        </Grid>
      )}

      {/* ═══ RESULT ═══ */}
      {result && (
        <Grid size={{ xs: 12 }}>
          <Alert severity={result.stats.business > 0 ? 'success' : 'info'} variant='outlined'>
            <Typography variant='body2' fontWeight={600} gutterBottom>
              ✅ Verificação concluída em {(result.entry.latencyMs / 1000).toFixed(1)}s
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1 }}>
              <Chip label={`${result.stats.total} total`} size='small' color='default' variant='tonal' />
              <Chip label={`💼 ${result.stats.business} Business`} size='small' color='primary' variant='tonal' />
              <Chip label={`📱 ${result.stats.personal} Celular`} size='small' color='success' variant='tonal' />
              <Chip label={`📵 ${result.stats.notFound} Não encontrado`} size='small' color='default' variant='tonal' />
              {(result.entry.errors || 0) > 0 && <Chip label={`❌ ${result.entry.errors} erros`} size='small' color='error' variant='tonal' />}
            </Box>
            {result.sampleBusiness && result.sampleBusiness.length > 0 && (
              <Box>
                <Typography variant='caption' fontWeight={600}>💼 Business detectados:</Typography>
                {result.sampleBusiness.map((s, i) => (
                  <Chip key={i} label={`${s.name} (${s.phone})`} size='small' color='primary' variant='outlined' sx={{ mr: 0.5, mt: 0.5, fontSize: '0.65rem' }} />
                ))}
              </Box>
            )}
          </Alert>
        </Grid>
      )}

      {error && (
        <Grid size={{ xs: 12 }}>
          <Alert severity='error' variant='outlined'>{error}</Alert>
        </Grid>
      )}

      {/* ═══ ÚLTIMO RUN ═══ */}
      <Grid size={{ xs: 12 }}>
        <Typography variant='h6' gutterBottom>
          📊 Última Execução
        </Typography>
        <Typography variant='body2' color='text.secondary'>
          {status?.lastRun ? new Date(status.lastRun).toLocaleString('pt-BR') : 'Nunca executado'}
        </Typography>
      </Grid>

      {/* ═══ HISTORY TABLE ═══ */}
      <Grid size={{ xs: 12 }}>
        <Typography variant='h6' gutterBottom>
          📋 Histórico de Execuções
        </Typography>
        {(!status?.history || status.history.length === 0) ? (
          <Paper sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant='body2' color='text.secondary'>
              Nenhuma execução registrada. Execute um discovery com L0 primeiro, depois clique em &quot;Executar Wa-Check&quot; para verificar os números.
            </Typography>
          </Paper>
        ) : (
          <Table size='small'>
            <TableHead>
              <TableRow>
                <TableCell>Data</TableCell>
                <TableCell align='right'>Total</TableCell>
                <TableCell align='right'>💼 Business</TableCell>
                <TableCell align='right'>📱 Celular</TableCell>
                <TableCell align='right'>📵 Não Encontrado</TableCell>
                <TableCell align='right'>⏱️ Latência</TableCell>
                <TableCell>💼 Amostra Business</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {status.history.map((h, i) => (
                <TableRow key={i} hover>
                  <TableCell><Typography variant='caption'>{new Date(h.ts).toLocaleString('pt-BR')}</Typography></TableCell>
                  <TableCell align='right'><Chip label={String(h.total)} size='small' variant='tonal' /></TableCell>
                  <TableCell align='right'><Chip label={String(h.business)} size='small' color='primary' variant='tonal' /></TableCell>
                  <TableCell align='right'><Chip label={String(h.personal)} size='small' color='success' variant='tonal' /></TableCell>
                  <TableCell align='right'><Chip label={String(h.notFound)} size='small' color='default' variant='tonal' /></TableCell>
                  <TableCell align='right'><Typography variant='caption'>{(h.latencyMs / 1000).toFixed(1)}s</Typography></TableCell>
                  <TableCell>
                    {h.sampleBusiness?.slice(0, 3).map((s, j) => (
                      <Chip key={j} label={s.name.slice(0, 15)} size='small' color='primary' variant='outlined' sx={{ mr: 0.3, fontSize: '0.6rem', height: 18 }} />
                    ))}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Grid>

      {/* ═══ MANUAL TRIGGER ═══ */}
      <Grid size={{ xs: 12 }}>
        <Card>
          <CardContent>
            <Typography variant='h6' gutterBottom>🔧 Execução Manual</Typography>
            <Typography variant='body2' color='text.secondary' sx={{ mb: 2 }}>
              Dispara verificação WhatsApp em todos os phones pendentes. O wa-check acessa wa.me/{'{numero}'} e lê o og:title para confirmar se é Business Account.
              Custo: $0 (wa.me é público). Timeout: 5s por número. Lote: 15 concorrentes.
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
              <Button
                variant='contained'
                color='primary'
                onClick={handleTrigger}
                disabled={running}
                startIcon={<i className='ri-whatsapp-line' />}
              >
                {running ? '⏳ Executando Wa-Check...' : '▶️ Executar Wa-Check nos Pendentes'}
              </Button>
              {status?.pending && (
                <Chip label={`${status.pending.count} pendentes`} size='small' color='warning' variant='tonal' />
              )}
              {status?.lastRun && (
                <Chip label={`Último: ${new Date(status.lastRun).toLocaleString('pt-BR')}`} size='small' variant='outlined' />
              )}
            </Box>
          </CardContent>
        </Card>
      </Grid>

      {/* ═══ INFO ═══ */}
      <Grid size={{ xs: 12 }}>
        <Alert severity='info' variant='outlined'>
          <Typography variant='body2' fontWeight={600} gutterBottom>📖 Como funciona o Wa-Check</Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            <Typography variant='caption'>1. Discovery L0 captura phones via DataForSEO ($0.048/página)</Typography>
            <Typography variant='caption'>2. Alerta automático: flag Redis adsen­tice:wa-check:pending com contagem</Typography>
            <Typography variant='caption'>3. Wa-Check acessa wa.me/{'{55DDD9XXXX-XXXX}'} com User-Agent WhatsApp</Typography>
            <Typography variant='caption'>4. Lê og:title — se ≠ &quot;Share on WhatsApp&quot;, é conta real</Typography>
            <Typography variant='caption'>5. Lê og:description — se contém &quot;Business Account&quot;, é 💼 Business</Typography>
            <Typography variant='caption'>6. Resultados salvos no Redis (TTL 30d) — NÃO persiste no Supabase ainda (v2 pendente)</Typography>
          </Box>
        </Alert>
      </Grid>
    </Grid>
  )
}
