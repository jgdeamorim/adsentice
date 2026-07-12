'use client'

import { useEffect } from 'react'

import Button from '@mui/material/Button'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('App error:', error)
  }, [error])

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: 3, p: 4 }}>
      <Typography variant='h4'>Algo deu errado</Typography>
      <Typography variant='body1' color='text.secondary'>
        {error.message || 'Erro inesperado ao carregar a página.'}
      </Typography>
      <Button variant='contained' onClick={reset}>
        Tentar novamente
      </Button>
    </Box>
  )
}
