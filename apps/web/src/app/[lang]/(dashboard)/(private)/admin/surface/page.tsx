// adsentice · Admin / Surface Dashboard — ADR-0031
// 22 superfícies Warp · Status LIVE/PARTIAL/PLANNED
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

export const dynamic = 'force-dynamic'

const GROUP_LABELS: Record<string, { label: string; icon: string; color: string }> = {
  client:     { label: 'Client-Facing', icon: '🔵', color: '#1976d2' },
  internal:   { label: 'Internal', icon: '🟡', color: '#ed6c02' },
  commercial: { label: 'Commercial', icon: '🟢', color: '#2e7d32' },
  acquisition:{ label: 'Acquisition', icon: '🟣', color: '#7b1fa2' },
  technical:  { label: 'Technical', icon: '⚪', color: '#757575' },
}

const PLAN_LABELS: Record<string, { label: string; color: 'error' | 'warning' | 'info' | 'success' | 'default' }> = {
  r0:       { label: 'Raio-X R$0', color: 'success' },
  r197:     { label: 'Sentinela R$197', color: 'info' },
  r497:     { label: 'Domínio R$497', color: 'warning' },
  r997:     { label: 'Escala R$997', color: 'error' },
  internal: { label: 'Interno', color: 'default' },
}

interface SurfaceInfo {
  id: string; name: string; group: string; plan: string
  segment: string; skills: string[]; tokens: string[]
  status: string; route: string | null; warpModule: string | null
  previews: number; routeLive: boolean; warpCode: boolean; isLive: boolean
}

async function fetchSurfaces(): Promise<{ surfaces: SurfaceInfo[]; summary: any }> {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/surface/status`, { cache: 'no-store' })
    if (res.ok) return res.json()
  } catch {}
  return { surfaces: [], summary: null }
}

export default async function SurfacePage(props: { params: Promise<{ lang: string }> }) {
  const { lang } = await props.params
  const user = await getSessionUser()
  if (user?.role !== 'admin') redirect(`/${lang}/app`)

  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12 }}>
        <Typography variant='h4'>📊 Warp Surface Dashboard</Typography>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap', mt: 1 }}>
          <Typography variant='body2' color='text.secondary'>
            22 superfícies · 9 módulos · 5 grupos · 59 skills de marketing
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
  const { surfaces, summary } = await fetchSurfaces()

  if (!summary || !surfaces.length) {
    return (
      <Grid size={{ xs: 12 }}>
        <Alert severity='info'>
          API surface/status offline. Execute <strong>recall v036.1</strong> no terminal.
        </Alert>
      </Grid>
    )
  }

  // Group surfaces
  const groups = ['client', 'internal', 'commercial', 'acquisition', 'technical']
  const byGroup = groups.map(g => ({
    key: g,
    ...GROUP_LABELS[g],
    surfaces: surfaces.filter(s => s.group === g),
    live: surfaces.filter(s => s.group === g && s.isLive).length,
    total: surfaces.filter(s => s.group === g).length,
  }))

  return (
    <>
      {/* ── Summary KPIs ── */}
      <Grid size={{ xs: 12 }} container spacing={3}>
        <Grid size={{ xs: 6, sm: 2.4 }}>
          <SummaryCard value={summary.total} label='Superfícies' color='primary.main' />
        </Grid>
        <Grid size={{ xs: 6, sm: 2.4 }}>
          <SummaryCard value={summary.live} label='Live' color='success.main' />
        </Grid>
        <Grid size={{ xs: 6, sm: 2.4 }}>
          <SummaryCard value={summary.partial} label='Partial' color='warning.main' />
        </Grid>
        <Grid size={{ xs: 6, sm: 2.4 }}>
          <SummaryCard value={summary.planned} label='Planned' color='text.secondary' />
        </Grid>
        <Grid size={{ xs: 6, sm: 2.4 }}>
          <SummaryCard value={summary.previewsTotal} label='Previews Geradas' color='secondary.main' />
        </Grid>
      </Grid>

      {/* ═══ PROGRESS BAR ═══ */}
      <Grid size={{ xs: 12 }}>
        <Card sx={{ bgcolor: 'grey.50' }}>
          <CardContent sx={{ py: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography variant='subtitle2' fontWeight={700} sx={{ minWidth: 120 }}>
                Progresso Warp
              </Typography>
              <Box sx={{ flex: 1 }}>
                <Box sx={{ display: 'flex', height: 12, borderRadius: 6, overflow: 'hidden', mb: 0.5 }}>
                  <Box sx={{ width: `${(summary.live/summary.total)*100}%`, bgcolor: 'success.main', transition: 'width 0.5s' }} />
                  <Box sx={{ width: `${(summary.partial/summary.total)*100}%`, bgcolor: 'warning.main', transition: 'width 0.5s' }} />
                  <Box sx={{ flex: 1, bgcolor: 'divider' }} />
                </Box>
                <Typography variant='caption' color='text.secondary'>
                  {summary.live + summary.partial}/{summary.total} ativas · {summary.warpModules} módulos Warp · {Math.round(((summary.live + summary.partial)/summary.total)*100)}% concluído
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Grid>

      {/* ═══ SURFACE CARDS BY GROUP ═══ */}
      {byGroup.map(group => (
        <Grid key={group.key} size={{ xs: 12 }}>
          <Box sx={{ mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant='h6' fontWeight={700}>
              {group.icon} {group.label}
            </Typography>
            <Chip label={`${group.live}/${group.total} live`} size='small' color={group.live > 0 ? 'success' : 'default'} variant='tonal' />
          </Box>
          <Grid container spacing={2}>
            {group.surfaces.map(s => (
              <Grid key={s.id} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
                <SurfaceCard surface={s} lang={lang} />
              </Grid>
            ))}
          </Grid>
        </Grid>
      ))}

      {/* ═══ LEGEND ═══ */}
      <Grid size={{ xs: 12 }}>
        <Alert severity='info' sx={{ bgcolor: 'grey.50', border: '1px solid', borderColor: 'divider' }}>
          <Typography variant='caption'>
            🟢 LIVE: superfície ativa com código ou previews · 🟡 PARTIAL: esboço ou template existente · 🔴 PLANNED: documentada na matriz Warp.
            Skills referenciam os 59 frameworks de marketing ingeridos no Qdrant (Corey Haines + Kim Barrett).
          </Typography>
        </Alert>
      </Grid>
    </>
  )
}

// ── Surface Card ──
function SurfaceCard({ surface: s, lang }: { surface: SurfaceInfo; lang: string }) {
  const group = GROUP_LABELS[s.group] || { color: '#999' }
  const plan = PLAN_LABELS[s.plan] || { label: s.plan, color: 'default' as const }
  const statusColor = s.isLive ? 'success' : s.status === 'partial' ? 'warning' : 'default'

  return (
    <Card
      sx={{
        height: '100%', display: 'flex', flexDirection: 'column',
        borderLeft: '3px solid', borderColor: group.color,
        opacity: s.isLive ? 1 : s.status === 'partial' ? 0.85 : 0.7,
        transition: 'box-shadow 0.2s', '&:hover': { boxShadow: 4 },
      }}
    >
      <CardContent sx={{ flex: 1, pb: 1.5 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
          <Typography variant='overline' fontWeight={700} color='text.secondary'
            sx={{ fontFamily: 'monospace', fontSize: '0.6rem', letterSpacing: 1 }}>
            {s.id}
          </Typography>
          <Chip
            label={s.isLive ? '🟢 LIVE' : s.status === 'partial' ? '🟡 PARTIAL' : '🔴 PLANNED'}
            size='small' variant='tonal' color={statusColor}
            sx={{ fontSize: '0.6rem', height: 20 }} />
        </Box>

        {/* Name */}
        <Typography variant='subtitle2' fontWeight={700} sx={{ mb: 0.5, lineHeight: 1.3 }}>
          {s.name}
        </Typography>

        {/* Plan + Segment */}
        <Box sx={{ display: 'flex', gap: 0.5, mb: 1, flexWrap: 'wrap' }}>
          <Chip label={plan.label} size='small' color={plan.color} variant='tonal' sx={{ height: 18, fontSize: '0.55rem' }} />
          {s.route && (
            <Chip label={s.route} size='small' variant='outlined' sx={{ height: 18, fontSize: '0.55rem', fontFamily: 'monospace' }} />
          )}
          {s.warpCode && (
            <Tooltip title={`packages/warp/src/${s.warpModule}`}>
              <Chip label='⚡ Warp' size='small' color='secondary' variant='tonal' sx={{ height: 18, fontSize: '0.55rem' }} />
            </Tooltip>
          )}
        </Box>

        {/* Skills */}
        <Box sx={{ display: 'flex', gap: 0.3, flexWrap: 'wrap', mb: 1 }}>
          {s.skills.slice(0, 4).map(skill => (
            <Chip key={skill} label={skill} size='small' variant='outlined'
              sx={{ height: 18, fontSize: '0.55rem', opacity: 0.8 }} />
          ))}
          {s.skills.length > 4 && (
            <Tooltip title={s.skills.slice(4).join(', ')}>
              <Chip label={`+${s.skills.length - 4}`} size='small' variant='outlined'
                sx={{ height: 18, fontSize: '0.55rem', opacity: 0.8 }} />
            </Tooltip>
          )}
        </Box>

        {/* Tokens */}
        <Box sx={{ display: 'flex', gap: 0.3, flexWrap: 'wrap', mb: s.previews > 0 ? 1 : 0 }}>
          {s.tokens.map(tok => (
            <Chip key={tok} label={tok} size='small'
              sx={{ height: 16, fontSize: '0.5rem', bgcolor: 'grey.100', fontFamily: 'monospace' }} />
          ))}
        </Box>

        {/* Previews count */}
        {s.previews > 0 && (
          <Box sx={{ mt: 'auto', pt: 1, borderTop: '1px solid', borderColor: 'divider' }}>
            <Typography variant='caption' color='secondary.main' fontWeight={600}>
              📄 {s.previews} previews geradas
            </Typography>
            {s.warpModule && (
              <Typography variant='caption' color='text.secondary' display='block' sx={{ fontFamily: 'monospace', fontSize: '0.55rem' }}>
                packages/warp/src/{s.warpModule}
              </Typography>
            )}
          </Box>
        )}
      </CardContent>
    </Card>
  )
}

// ── KPI Summary Card ──
function SummaryCard({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <Card sx={{ textAlign: 'center', borderTop: '3px solid', borderColor: color }}>
      <CardContent sx={{ py: 2 }}>
        <Typography variant='h4' fontWeight={800} sx={{ color }}>{value}</Typography>
        <Typography variant='caption' color='text.secondary'>{label}</Typography>
      </CardContent>
    </Card>
  )
}
