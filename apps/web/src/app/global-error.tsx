'use client'

import Button from '@mui/material/Button'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html>
      <body>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', gap: 3, p: 4 }}>
          <Typography variant='h2' fontWeight={800} color='error.main'>500</Typography>
          <Typography variant='h5'>Erro crítico</Typography>
          <Typography variant='body1' color='text.secondary'>
            {error.message || 'Ocorreu um erro inesperado.'}
          </Typography>
          <Button variant='contained' onClick={reset}>
            Tentar novamente
          </Button>
        </Box>
      </body>
    </html>
  )
}
