'use client'

import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import Chip from '@mui/material/Chip'
import LinearProgress from '@mui/material/LinearProgress'
import Paper from '@mui/material/Paper'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Button from '@mui/material/Button'

interface Target {
  city: string; district: string; category: string; categoryLabel: string
  score: number
  breakdown: { painScore: number; ticketScore: number; densityScore: number; fixabilityScore: number; coverageScore: number }
  estimatedLeads: number; suggestedRadius: number; avgTicket: number
  action: string; strategy: string
}

interface AutoQueue {
  targets: Target[]
  meta: { totalGaps: number; priorityTargets: number; estimatedCost: number; estimatedMRR: number }
}

interface Props {
  autoMode: boolean
  autoModeType: 'coverage' | 'intelligence'
  autoLoading: boolean
  autoQueue: AutoQueue | null
  onToggleAuto: () => void
  onToggleType: (type: 'coverage' | 'intelligence') => void
  onMapDistrict: (district: string, city: string, radius: number) => void
}

export default function DiscoveryAutoPilot({
  autoMode, autoModeType, autoLoading, autoQueue,
  onToggleAuto, onToggleType, onMapDistrict,
}: Props) {
  return (
    <Card sx={{ borderLeft: 4, borderColor: autoMode ? 'success.main' : 'divider', bgcolor: autoMode ? 'success.50' : undefined }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
          <Box>
            <Typography variant='h6' fontWeight={700}>
              {autoMode
                ? autoModeType === 'intelligence'
                  ? '🧠 Auto-Discovery · Inteligência de Mercado'
                  : '📋 Auto-Discovery · Cobertura Automática'
                : '📍 Localização Manual'}
            </Typography>
            <Typography variant='caption' color='text.secondary'>
              {autoMode
                ? autoModeType === 'intelligence'
                  ? 'Analisa mercado completo: dor + ticket + concorrência + persona. Enriquecimento L0→L1→L2→L3.'
                  : 'Varre distritos não mapeados. Busca → enriquece L0+L1 → próximo gap. Meta: 100% de cobertura.'}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            {autoMode && (
              <Box sx={{ display: 'flex', gap: 0.5, mr: 1 }}>
                <Chip label='📋 Cobertura' clickable size='small'
                  color={autoModeType === 'coverage' ? 'primary' : 'default'}
                  variant={autoModeType === 'coverage' ? 'filled' : 'outlined'}
                  onClick={() => onToggleType('coverage')} />
                <Chip label='🧠 Inteligência' clickable size='small'
                  color={autoModeType === 'intelligence' ? 'primary' : 'default'}
                  variant={autoModeType === 'intelligence' ? 'filled' : 'outlined'}
                  onClick={() => onToggleType('intelligence')} />
              </Box>
            )}
            <Chip
              label={autoMode ? '🟢 Automático ON' : '⚪ Manual — Busca por cidade'}
              clickable size='medium'
              color={autoMode ? 'success' : 'default'}
              variant={autoMode ? 'filled' : 'outlined'}
              onClick={onToggleAuto}
              sx={{ fontWeight: 700 }}
            />
          </Box>
        </Box>

        {autoMode && autoLoading && (
          <Box sx={{ mt: 2, textAlign: 'center' }}>
            <LinearProgress sx={{ mb: 1 }} />
            <Typography variant='caption' color='text.secondary'>
              {autoModeType === 'coverage' ? 'Analisando distritos não mapeados...' : 'Analisando mercado...'}
            </Typography>
          </Box>
        )}

        {autoMode && autoQueue && (
          <>
            <Box sx={{ mt: 2, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <Chip label={`${autoQueue.meta.totalGaps} gaps`} size='small' color='error' variant='tonal' />
              <Chip label={`${autoQueue.meta.priorityTargets} alta prioridade`} size='small' color='warning' variant='tonal' />
              <Chip label={`~$${autoQueue.meta.estimatedCost}`} size='small' color='info' variant='tonal' />
              {autoModeType === 'intelligence' && (
                <Chip label={`~R$${autoQueue.meta.estimatedMRR.toLocaleString('pt-BR')}/mês potencial`} size='small' color='success' variant='tonal' />
              )}
              <Chip
                label={autoModeType === 'intelligence' ? 'Pipeline: L0→L1→L2→L3' : 'Pipeline: L0+L1'}
                size='small' variant='outlined'
                sx={{ fontFamily: 'monospace', fontSize: '0.65rem' }}
              />
            </Box>

            {autoQueue.targets.length > 0 && (
              <Box sx={{ mt: 2 }}>
                <Typography variant='subtitle2' fontWeight={600} gutterBottom>
                  {autoModeType === 'coverage' ? `🗺️ Distritos a Mapear (${autoQueue.targets.length})` : `🎯 Alvos Priorizados (${autoQueue.targets.length})`}
                </Typography>
                <TableContainer component={Paper} variant='outlined'>
                  <Table size='small'>
                    <TableHead>
                      <TableRow>
                        <TableCell width={30}>#</TableCell>
                        <TableCell>Distrito</TableCell>
                        {autoModeType === 'intelligence' ? (
                          <>
                            <TableCell width={60}>Score</TableCell>
                            <TableCell width={150}>Critérios</TableCell>
                            <TableCell width={180}>Estratégia</TableCell>
                          </>
                        ) : (
                          <TableCell width={120}>Status</TableCell>
                        )}
                        <TableCell width={80}>Ação</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {autoQueue.targets.slice(0, autoModeType === 'coverage' ? 12 : 8).map((t, i) => (
                        <TableRow key={t.district}
                          sx={{ bgcolor: i === 0 ? 'success.50' : i < 3 ? 'warning.50' : undefined }}>
                          <TableCell>
                            <Typography fontWeight={700} color={i === 0 ? 'success.main' : i < 3 ? 'warning.main' : 'text.secondary'}>
                              {i + 1}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant='body2' fontWeight={600}>{t.district}</Typography>
                            <Typography variant='caption' color='text.secondary'>
                              ~{t.estimatedLeads} leads · {t.suggestedRadius}km{autoModeType === 'intelligence' ? ` · R$${t.avgTicket}/mês` : ''}
                            </Typography>
                          </TableCell>
                          {autoModeType === 'intelligence' ? (
                            <>
                              <TableCell>
                                <Chip label={t.score} size='small'
                                  color={t.score >= 80 ? 'error' : t.score >= 60 ? 'warning' : t.score >= 40 ? 'info' : 'default'}
                                  variant='tonal' />
                              </TableCell>
                              <TableCell>
                                <Box sx={{ display: 'flex', gap: 0.3, flexWrap: 'wrap' }}>
                                  <Chip label={`Dor ${t.breakdown.painScore}`} size='small' variant='outlined' sx={{ fontSize: '0.6rem', height: 18 }} />
                                  <Chip label={`Ticket ${t.breakdown.ticketScore}`} size='small' variant='outlined' sx={{ fontSize: '0.6rem', height: 18 }} />
                                  <Chip label={`Conc. ${t.breakdown.densityScore}`} size='small' variant='outlined' sx={{ fontSize: '0.6rem', height: 18 }} />
                                </Box>
                              </TableCell>
                              <TableCell>
                                <Typography variant='caption' color='text.secondary' sx={{ lineHeight: 1.2 }}>
                                  {t.strategy}
                                </Typography>
                              </TableCell>
                            </>
                          ) : (
                            <TableCell>
                              <Chip label={t.score >= 80 ? '🔥 Prioridade' : t.score >= 60 ? '⭐ Mapear' : '📋 Pendente'}
                                size='small'
                                color={t.score >= 80 ? 'error' : t.score >= 60 ? 'warning' : 'default'}
                                variant='tonal' />
                            </TableCell>
                          )}
                          <TableCell>
                            <Button variant='contained' size='small' color={i === 0 ? 'success' : 'primary'}
                              onClick={() => onMapDistrict(t.district, t.city, t.suggestedRadius)}
                              sx={{ fontSize: '0.7rem', whiteSpace: 'nowrap' }}>
                              {i === 0 ? '🎯 Ir' : 'Mapear'}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
