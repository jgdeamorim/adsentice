// adsentice · Admin / Surface Dashboard — ADR-0031 + ADR-0032
// 22 superfícies Warp · Qdrant live · skills · componentes · Materio
// medido=verdade · 2026-07-17

import { Suspense } from 'react'
import { redirect } from 'next/navigation'

import Grid from '@mui/material/Grid2'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import Chip from '@mui/material/Chip'
import Box from '@mui/material/Box'
import LinearProgress from '@mui/material/LinearProgress'
import Alert from '@mui/material/Alert'
import Tooltip from '@mui/material/Tooltip'

import { getSessionUser } from '@/libs/supabase/server'
import WarpComposeDemo from '@/components/WarpComposeDemo'

export const dynamic = 'force-dynamic'

const GROUP_META: Record<string, { label: string; icon: string; border: string }> = {
  client:      { label: 'Client-Facing', icon: '🔵', border: '#1976d2' },
  internal:    { label: 'Internal',      icon: '🟡', border: '#ed6c02' },
  commercial:  { label: 'Commercial',    icon: '🟢', border: '#2e7d32' },
  acquisition: { label: 'Acquisition',   icon: '🟣', border: '#7b1fa2' },
  technical:   { label: 'Technical',     icon: '⚪', border: '#757575' },
}

const PLAN_META: Record<string, { label: string; color: 'error'|'warning'|'info'|'success'|'default' }> = {
  r0:       { label: 'Raio-X R$0',       color: 'success' },
  r197:     { label: 'Sentinela R$197',   color: 'info' },
  r497:     { label: 'Domínio R$497',     color: 'warning' },
  r997:     { label: 'Escala R$997',      color: 'error' },
  internal: { label: 'Interno',           color: 'default' },
}

interface SurfaceInfo {
  id: string; name: string; group: string; plan: string
  segment: string; skills: string[]; tokens: string[]
  status: string; route: string | null; warpModule: string | null
  previews: number; routeLive: boolean; warpCode: boolean; warpLines: number
  isLive: boolean; skillsTotal: number; skillsWired: number; skillsWiredPct: number
}

async function fetchSurfaces(): Promise<{ surfaces: SurfaceInfo[]; summary: any; specialists: any[]; artifacts: any[]; conversion: any[] }> {
  try {
    const base = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
    const res = await fetch(`${base}/api/surface/status`, { cache: 'no-store' })
    if (res.ok) {
      const d = await res.json()
      return { surfaces: d.surfaces || [], summary: d.summary, specialists: d.specialists || [], artifacts: d.artifacts || [], conversion: d.conversion || [] }
    }
  } catch {}
  return { surfaces: [], summary: null, specialists: [], artifacts: [], conversion: [] }
}

export default async function SurfacePage(props: { params: Promise<{ lang: string }> }) {
  const { lang } = await props.params
  const user = await getSessionUser()
  if (user?.role !== 'admin') redirect(`/${lang}/app`)

  return (
    <Grid container spacing={4}>
      <Grid size={{ xs: 12 }}>
        <Typography variant='h4'>📊 Warp Surface Dashboard</Typography>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap', mt: 1 }}>
          <Typography variant='body2' color='text.secondary'>
            22 superfícies · 5 grupos · Qdrant live · medido=verdade
          </Typography>
          <Chip label='ADR-0031' size='small' color='primary' variant='tonal' />
          <Chip label='ADR-0032' size='small' color='secondary' variant='tonal' />
        </Box>
      </Grid>
      <Suspense fallback={<Grid size={{ xs: 12 }}><LinearProgress /></Grid>}>
        <SurfaceContent lang={lang} />
      </Suspense>
    </Grid>
  )
}

async function SurfaceContent({ lang }: { lang: string }) {
  const { surfaces, summary, specialists, artifacts, conversion } = await fetchSurfaces()

  if (!summary || !surfaces.length) {
    return (
      <Grid size={{ xs: 12 }}>
        <Alert severity='info'>
          Qdrant offline ou API surface/status indisponível. Execute <strong>recall v037</strong>.
        </Alert>
      </Grid>
    )
  }

  const groups = ['client', 'internal', 'commercial', 'acquisition', 'technical']

  return (
    <>
      {/* ═══ QDRANT LIVE BANNER ═══ */}
      {summary.qdrantLive && summary.kgStats && (
        <Grid size={{ xs: 12 }}>
          <Card sx={{ bgcolor: 'secondary.50', border: '1px solid', borderColor: 'secondary.main' }}>
            <CardContent sx={{ py: 1.5 }}>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
                <Chip label='🧠 Qdrant Live' size='small' color='secondary' />
                <Typography variant='body2'>
                  <strong>{summary.kgStats.corpusTotal?.toLocaleString('pt-BR')}</strong> pontos no corpus Warp
                </Typography>
                <Chip label={`📦 ${summary.kgStats.componentsTotal} componentes`} size='small' variant='outlined' />
                <Chip label={`📐 ${summary.kgStats.skillsTotal} skills`} size='small' variant='outlined' />
                <Chip label={`🎨 ${summary.kgStats.materioTokensTotal} tokens Materio`} size='small' variant='outlined' />
                <Chip label={`📚 ${summary.kgStats.designKnowledgeTotal?.toLocaleString('pt-BR')} design pts`} size='small' variant='outlined' />
                {summary.kgStats.materioCategories && Object.keys(summary.kgStats.materioCategories).length > 0 && (
                  <Tooltip title={Object.entries(summary.kgStats.materioCategories).map(([k,v]) => `${k}: ${v}`).join(' · ')}>
                    <Chip label='🎨 Materio' size='small' color='secondary' variant='tonal' />
                  </Tooltip>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      )}

      {/* ═══ INTEND COMPOSER DEMO ═══ */}
      <Grid size={{ xs: 12 }}>
        <WarpComposeDemo />
      </Grid>

      {/* ═══ ESPECIALISTAS DE SURFACE (g0: gramática por surface) ═══ */}
      {specialists.length > 0 && (
        <Grid size={{ xs: 12 }}>
          <Box sx={{ mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant='h6' fontWeight={700}>🧭 Especialistas de Surface</Typography>
            <Chip label={`${specialists.length} registrados no Router`} size='small' color='secondary' variant='tonal' />
            <Typography variant='caption' color='text.secondary'>g0: specialist emite gramática, renderer aplica materials</Typography>
          </Box>
          <Grid container spacing={2}>
            {specialists.map((sp: any) => (
              <Grid key={sp.surfaceId} size={{ xs: 12, md: 6 }}>
                <Card sx={{ height: '100%', borderTop: '3px solid', borderColor: 'secondary.main' }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                      <Typography variant='subtitle1' fontWeight={700}>
                        <span style={{ fontFamily: 'monospace', opacity: 0.7 }}>{sp.surfaceId}</span> · {sp.name}
                      </Typography>
                      <Chip label={`${sp.slots.length} slots`} size='small' variant='tonal' color='secondary' />
                    </Box>
                    <Box sx={{ display: 'flex', gap: 0.4, flexWrap: 'wrap', mb: 1.5, alignItems: 'center' }}>
                      {sp.slots.map((sl: any, i: number) => (
                        <Box key={sl.name} sx={{ display: 'flex', alignItems: 'center', gap: 0.4 }}>
                          <Tooltip title={sl.objective || sl.type}>
                            <Chip label={sl.name} size='small' variant='outlined'
                              sx={{ height: 20, fontSize: '0.6rem', fontFamily: 'monospace' }} />
                          </Tooltip>
                          {i < sp.slots.length - 1 && <Typography variant='caption' color='text.disabled'>→</Typography>}
                        </Box>
                      ))}
                    </Box>
                    <Box sx={{ display: 'flex', gap: 0.4, flexWrap: 'wrap' }}>
                      {sp.skills.map((sk: string) => (
                        <Chip key={sk} label={sk} size='small' sx={{ height: 18, fontSize: '0.55rem', bgcolor: 'grey.100' }} />
                      ))}
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Grid>
      )}

      {/* ═══ CONVERSÃO A/B POR ESTRATÉGIA (loop f0 · s11_events) ═══ */}
      {conversion.length > 0 && (
        <Grid size={{ xs: 12 }}>
          <Box sx={{ mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant='h6' fontWeight={700}>🎯 Conversão A/B por Estratégia</Typography>
            <Chip label='vocab.conversion KG · variante congelada por visitante' size='small' color='success' variant='tonal' />
          </Box>
          <Grid container spacing={2}>
            {conversion.map((c: any) => {
              const best = Math.max(...conversion.filter((x: any) => x.surface === c.surface).map((x: any) => x.rate))
              const isWinner = c.rate > 0 && c.rate === best
              return (
                <Grid key={`${c.surface}-${c.variant}`} size={{ xs: 12, sm: 6, md: 4 }}>
                  <Card sx={{
                    height: '100%', borderLeft: '4px solid',
                    borderColor: isWinner ? 'success.main' : 'divider',
                    bgcolor: isWinner ? 'success.50' : 'background.paper',
                  }}>
                    <CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                        <Typography variant='subtitle2' fontWeight={700} sx={{ fontFamily: 'monospace' }}>
                          {c.surface} · variante {c.variant}
                        </Typography>
                        {isWinner && <Chip label='🏆 liderando' size='small' color='success' variant='tonal' sx={{ height: 20 }} />}
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 2, mb: 1 }}>
                        <Typography variant='h4' fontWeight={800} color={isWinner ? 'success.main' : 'text.primary'}>
                          {c.rate}%
                        </Typography>
                        <Typography variant='caption' color='text.secondary'>
                          {c.clicks} cliques / {c.views} views
                        </Typography>
                      </Box>
                      {c.hypothesis && (
                        <Typography variant='caption' color='text.secondary' sx={{ display: 'block', mb: 0.5, fontStyle: 'italic' }}>
                          {c.hypothesis}
                        </Typography>
                      )}
                      {c.headline && (
                        <Typography variant='caption' sx={{ display: 'block', fontWeight: 600 }}>
                          "{c.headline}"
                        </Typography>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
              )
            })}
          </Grid>
        </Grid>
      )}

      {/* ═══ ARTEFATOS PUBLICADOS (ADR-0038 série) ═══ */}
      {artifacts.length > 0 && (
        <Grid size={{ xs: 12 }}>
          <Card>
            <CardContent sx={{ py: 1.5 }}>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
                <Chip label='📦 Artefatos publicados' size='small' color='info' />
                {artifacts.slice(0, 6).map((a: any) => (
                  <Tooltip key={`${a.place_id}-${a.surface}-${a.version}-${a.ab_variant}`}
                    title={`${a.headline || ''} · expira ${a.expires_at?.slice(0, 10) || '?'}`}>
                    <Chip
                      label={`${a.surface} v${a.version}${a.ab_variant || ''} · ${a.copy_model || '?'}`}
                      size='small' variant='outlined'
                      color={a.status === 'published' ? 'success' : 'default'}
                      sx={{ fontFamily: 'monospace', fontSize: '0.6rem' }} />
                  </Tooltip>
                ))}
                <Typography variant='caption' color='text.secondary'>
                  TTL 30d · R2 + Supabase (ADR-0038)
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      )}

      {/* ═══ KPI CARDS ═══ */}
      <Grid size={{ xs: 12 }} container spacing={2}>
        <Grid size={{ xs: 4, sm: 2.4 }}>
          <KpiCard value={summary.total} label='Superfícies' color='primary.main' />
        </Grid>
        <Grid size={{ xs: 4, sm: 2.4 }}>
          <KpiCard value={summary.live} label='Live' color='success.main' />
        </Grid>
        <Grid size={{ xs: 4, sm: 2.4 }}>
          <KpiCard value={summary.partial} label='Partial' color='warning.main' />
        </Grid>
        <Grid size={{ xs: 4, sm: 2.4 }}>
          <KpiCard value={summary.planned} label='Planned' color='text.secondary' />
        </Grid>
        <Grid size={{ xs: 4, sm: 2.4 }}>
          <KpiCard value={summary.previewsTotal} label='Previews' color='secondary.main' />
        </Grid>
        <Grid size={{ xs: 4, sm: 2.4 }}>
          <KpiCard value={summary.warpModulesTotal} label='Módulos Warp' color='info.main' />
        </Grid>
      </Grid>

      {/* ═══ PROGRESS BAR ═══ */}
      <Grid size={{ xs: 12 }}>
        <Box sx={{ display: 'flex', height: 14, borderRadius: 7, overflow: 'hidden', bgcolor: 'grey.100' }}>
          <Box sx={{ width: `${(summary.live/summary.total)*100}%`, bgcolor: 'success.main', transition: 'width 0.5s' }} />
          <Box sx={{ width: `${(summary.partial/summary.total)*100}%`, bgcolor: 'warning.main', transition: 'width 0.5s' }} />
          <Box sx={{ flex: 1, bgcolor: 'grey.200' }} />
        </Box>
        <Typography variant='caption' color='text.secondary' sx={{ mt: 0.5, display: 'block' }}>
          {summary.progressPct}% completo · {summary.routesLive} rotas live · {summary.warpLinesTotal.toLocaleString('pt-BR')} linhas Warp
        </Typography>
      </Grid>

      {/* ═══ SURFACE CARDS BY GROUP ═══ */}
      {groups.map(group => {
        const groupSurfaces = surfaces.filter(s => s.group === group)
        if (!groupSurfaces.length) return null
        const meta = GROUP_META[group] || { label: group, icon: '📋', border: '#999' }
        const liveCount = groupSurfaces.filter(s => s.isLive).length

        return (
          <Grid key={group} size={{ xs: 12 }}>
            <Box sx={{ mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant='h6' fontWeight={700}>
                {meta.icon} {meta.label}
              </Typography>
              <Chip label={`${liveCount}/${groupSurfaces.length} live`} size='small'
                color={liveCount > 0 ? 'success' : 'default'} variant='tonal' />
            </Box>
            <Grid container spacing={2}>
              {groupSurfaces.map(s => (
                <Grid key={s.id} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
                  <SurfaceCard surface={s} groupBorder={meta.border} />
                </Grid>
              ))}
            </Grid>
          </Grid>
        )
      })}

      {/* ═══ LEGEND ═══ */}
      <Grid size={{ xs: 12 }}>
        <Alert severity='info' sx={{ bgcolor: 'grey.50' }}>
          <Typography variant='caption'>
            🟢 LIVE: ativa com código ou previews · 🟡 PARTIAL: esboço existente · 🔴 PLANNED: documentada na matriz.
            Dados Qdrant consultados ao vivo (18.423 pontos). Skills de marketing ingeridas dos 59 frameworks Corey Haines + Kim Barrett.
          </Typography>
        </Alert>
      </Grid>
    </>
  )
}

// ── Surface Card ──
function SurfaceCard({ surface: s, groupBorder }: { surface: SurfaceInfo; groupBorder: string }) {
  const plan = PLAN_META[s.plan] || { label: s.plan, color: 'default' as const }
  const statusMeta = s.isLive
    ? { label: '🟢 LIVE', color: 'success' as const }
    : s.status === 'partial'
      ? { label: '🟡 PARTIAL', color: 'warning' as const }
      : { label: '🔴 PLANNED', color: 'default' as const }

  return (
    <Card sx={{
      height: '100%', display: 'flex', flexDirection: 'column',
      borderLeft: '4px solid', borderColor: groupBorder,
      opacity: s.isLive ? 1 : s.status === 'partial' ? 0.9 : 0.75,
      transition: 'box-shadow 0.2s, opacity 0.2s',
      '&:hover': { boxShadow: 6, opacity: 1 },
    }}>
      <CardContent sx={{ flex: 1, pb: 1.5, display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
          <Box>
            <Typography variant='overline' fontWeight={700} color='text.secondary'
              sx={{ fontFamily: 'monospace', fontSize: '0.6rem', letterSpacing: 1, lineHeight: 1 }}>
              {s.id}
            </Typography>
            <Typography variant='subtitle2' fontWeight={700} sx={{ lineHeight: 1.3 }}>
              {s.name}
            </Typography>
          </Box>
          <Chip label={statusMeta.label} size='small' variant='tonal' color={statusMeta.color}
            sx={{ fontSize: '0.6rem', height: 20 }} />
        </Box>

        {/* Meta chips */}
        <Box sx={{ display: 'flex', gap: 0.5, mb: 1, flexWrap: 'wrap' }}>
          <Chip label={plan.label} size='small' color={plan.color} variant='tonal'
            sx={{ height: 18, fontSize: '0.55rem' }} />
          {s.route && s.routeLive && (
            <Tooltip title="Rota ativa em produção">
              <Chip label={s.route} size='small' variant='outlined' color='success'
                sx={{ height: 18, fontSize: '0.55rem', fontFamily: 'monospace' }} />
            </Tooltip>
          )}
          {s.warpCode && (
            <Tooltip title={`packages/warp/src/${s.warpModule} · ${s.warpLines} linhas`}>
              <Chip label={`⚡ ${s.warpLines}L`} size='small' color='secondary' variant='tonal'
                sx={{ height: 18, fontSize: '0.55rem', fontFamily: 'monospace' }} />
            </Tooltip>
          )}
        </Box>

        {/* Skills with wire status */}
        <Box sx={{ display: 'flex', gap: 0.3, flexWrap: 'wrap', mb: 1 }}>
          {s.skills.slice(0, 4).map(skill => (
            <Chip key={skill} label={skill} size='small' variant='outlined'
              sx={{ height: 18, fontSize: '0.55rem', opacity: 0.85 }} />
          ))}
          {s.skills.length > 4 && (
            <Tooltip title={s.skills.slice(4).join(', ')}>
              <Chip label={`+${s.skills.length - 4}`} size='small' variant='outlined'
                sx={{ height: 18, fontSize: '0.55rem' }} />
            </Tooltip>
          )}
        </Box>

        {/* Tokens */}
        <Box sx={{ display: 'flex', gap: 0.3, flexWrap: 'wrap', mb: 1 }}>
          {s.tokens.map(tok => (
            <Chip key={tok} label={tok} size='small'
              sx={{
                height: 16, fontSize: '0.5rem', fontFamily: 'monospace',
                bgcolor: tok.startsWith('🔴') ? 'error.50'
                  : tok.startsWith('🟡') ? 'warning.50'
                  : 'grey.100',
              }} />
          ))}
        </Box>

        {/* Footer: previews + warp module */}
        <Box sx={{ mt: 'auto', pt: 1, borderTop: '1px solid', borderColor: 'divider' }}>
          {s.previews > 0 ? (
            <Typography variant='caption' color='secondary.main' fontWeight={600}>
              📄 {s.previews} previews geradas
            </Typography>
          ) : s.warpCode ? (
            <Typography variant='caption' color='info.main' fontWeight={600}>
              ⚡ {s.warpLines} linhas de código Warp
            </Typography>
          ) : (
            <Typography variant='caption' color='text.disabled'>
              — não implementado
            </Typography>
          )}
        </Box>
      </CardContent>
    </Card>
  )
}

// ── KPI Card ──
function KpiCard({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <Card sx={{ textAlign: 'center', borderTop: '3px solid', borderColor: color }}>
      <CardContent sx={{ py: 1.5 }}>
        <Typography variant='h5' fontWeight={800} sx={{ color }}>{value}</Typography>
        <Typography variant='caption' color='text.secondary'>{label}</Typography>
      </CardContent>
    </Card>
  )
}
