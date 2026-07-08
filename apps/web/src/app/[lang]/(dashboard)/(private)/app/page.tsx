// adsentice · Dashboard CLIENT — o produto do tenant: leads por região · score · propostas. (qualquer usuário logado)
// MUI Imports
import Grid from '@mui/material/Grid2'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import Chip from '@mui/material/Chip'

// Supabase (adsentice · auth managed)
import { getSessionUser } from '@/libs/supabase/server'

const CLIENT_METRICS = [
  { title: 'Leads captados', value: '—', desc: 'Negócios locais por região (GMB)', icon: 'ri-map-pin-line' },
  { title: 'Score médio', value: '—', desc: 'As 7 dimensões (0–100)', icon: 'ri-speed-up-line' },
  { title: 'Propostas', value: '—', desc: 'Diagnóstico → CTA', icon: 'ri-file-list-3-line' },
  { title: 'Reputação', value: '—', desc: 'Reviews · owner-answer rate', icon: 'ri-star-line' }
]

const ClientDashboard = async ({ params }: { params: Promise<{ lang: string }> }) => {
  await params
  const user = await getSessionUser()

  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12 }}>
        <div className='flex items-center gap-3 flex-wrap'>
          <Typography variant='h4'>Meu Painel · adsentice</Typography>
          <Chip label={`tenant: ${user?.tenantId ?? '—'}`} color='success' size='small' variant='tonal' />
        </div>
        <Typography>Seus leads locais, score e propostas de melhoria. ({user?.email})</Typography>
      </Grid>
      {CLIENT_METRICS.map(m => (
        <Grid key={m.title} size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent className='flex flex-col gap-1'>
              <div className='flex items-center justify-between'>
                <i className={`${m.icon} text-[28px] text-primary`} />
                <Typography variant='h5'>{m.value}</Typography>
              </div>
              <Typography variant='h6'>{m.title}</Typography>
              <Typography variant='body2'>{m.desc}</Typography>
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  )
}

export default ClientDashboard
