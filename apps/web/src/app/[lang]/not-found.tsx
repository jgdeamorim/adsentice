import Link from 'next/link'

import Button from '@mui/material/Button'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'

export default function NotFound() {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: 3, p: 4 }}>
      <Typography variant='h2' fontWeight={800} color='text.secondary'>404</Typography>
      <Typography variant='h5'>Página não encontrada</Typography>
      <Typography variant='body1' color='text.secondary'>
        A página que você procura não existe ou foi movida.
      </Typography>
      <Button variant='contained' component={Link} href='/'>
        Voltar ao início
      </Button>
    </Box>
  )
}
