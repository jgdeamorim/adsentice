// adsentice · Dashboard ADMIN (o control plane) — só role=admin (guard server + middleware). Placeholder do engine.
import { redirect } from 'next/navigation'

// MUI Imports
import Grid from '@mui/material/Grid2'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import Chip from '@mui/material/Chip'

// Supabase (adsentice · auth managed)
import { getSessionUser } from '@/libs/supabase/server'

const ADMIN_CARDS = [
  { title: 'Capabilities', desc: 'As 73 caps DataForSEO + status/saúde', icon: 'ri-stack-line' },
  { title: 'Tenants', desc: 'Clientes · spend-cap · centro de custos', icon: 'ri-building-line' },
  { title: 'Score & Soluções', desc: 'As 7 dimensões + os bundles vendáveis', icon: 'ri-scales-3-line' },
  { title: 'Cofre & Métricas', desc: 'O ouro (queries) · custo → margem → ROI', icon: 'ri-safe-2-line' }
]

const AdminDashboard = async ({ params }: { params: Promise<{ lang: string }> }) => {
  const { lang } = await params
  const user = await getSessionUser()

  // defesa em profundidade (o middleware já barra /admin sem role=admin)
  if (user?.role !== 'admin') {
    redirect(`/${lang}/app`)
  }

  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12 }}>
        <div className='flex items-center gap-3 flex-wrap'>
          <Typography variant='h4'>Control Plane · adsentice</Typography>
          <Chip label='ADMIN' color='primary' size='small' variant='tonal' />
        </div>
        <Typography>Gerencie o engine — capabilities, tenants, score, custo. ({user?.email})</Typography>
      </Grid>
      {ADMIN_CARDS.map(c => (
        <Grid key={c.title} size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent className='flex flex-col gap-2'>
              <i className={`${c.icon} text-[28px] text-primary`} />
              <Typography variant='h6'>{c.title}</Typography>
              <Typography variant='body2'>{c.desc}</Typography>
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  )
}

export default AdminDashboard
