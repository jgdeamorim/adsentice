'use client'

// React Imports
import { useState } from 'react'

// Next Imports
import Link from 'next/link'
import { useParams, useRouter, useSearchParams } from 'next/navigation'

// MUI Imports
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'
import IconButton from '@mui/material/IconButton'
import InputAdornment from '@mui/material/InputAdornment'
import Checkbox from '@mui/material/Checkbox'
import Button from '@mui/material/Button'
import FormControlLabel from '@mui/material/FormControlLabel'
import Divider from '@mui/material/Divider'

// Third-party Imports
import { Controller, useForm } from 'react-hook-form'
import { valibotResolver } from '@hookform/resolvers/valibot'
import { object, minLength, string, email, pipe, nonEmpty } from 'valibot'
import type { SubmitHandler } from 'react-hook-form'
import type { InferInput } from 'valibot'

// Type Imports
import type { Mode } from '@core/types'
import type { Locale } from '@configs/i18n'

// Component Imports
import Logo from '@components/layout/shared/Logo'
import Illustrations from '@components/Illustrations'

// Config Imports
import themeConfig from '@configs/themeConfig'

// Hook Imports
import { useImageVariant } from '@core/hooks/useImageVariant'

// Util Imports
import { getLocalizedUrl } from '@/utils/i18n'

// Supabase (adsentice · auth managed · admin/client)
import { createClient } from '@/libs/supabase/client'

type ErrorType = {
  message: string[]
}

type FormData = InferInput<typeof schema>

const schema = object({
  email: pipe(string(), minLength(1, 'Informe o e-mail'), email('E-mail inválido')),
  password: pipe(string(), nonEmpty('Informe a senha'), minLength(6, 'A senha tem no mínimo 6 caracteres'))
})

const Login = ({ mode }: { mode: Mode }) => {
  // States
  const [isPasswordShown, setIsPasswordShown] = useState(false)
  const [errorState, setErrorState] = useState<ErrorType | null>(null)

  // Vars
  const darkImg = '/images/pages/auth-v1-mask-dark.png'
  const lightImg = '/images/pages/auth-v1-mask-light.png'

  // Hooks
  const router = useRouter()
  const searchParams = useSearchParams()
  const { lang: locale } = useParams()
  const authBackground = useImageVariant(mode, lightImg, darkImg)
  const supabase = createClient()

  const {
    control,
    handleSubmit,
    formState: { errors }
  } = useForm<FormData>({
    resolver: valibotResolver(schema),
    defaultValues: { email: '', password: '' }
  })

  const handleClickShowPassword = () => setIsPasswordShown(show => !show)

  const onSubmit: SubmitHandler<FormData> = async (data: FormData) => {
    const { data: signIn, error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password
    })

    if (!error) {
      // redireciona por ROLE: admin → /admin · client → /app (ou o destino guardado, se veio de rota protegida)
      const role = signIn.user?.app_metadata?.role
      const roleDest = role === 'admin' ? '/admin' : '/app'
      const redirectURL = searchParams.get('redirectTo')

      router.replace(getLocalizedUrl(redirectURL && redirectURL !== '/' ? redirectURL : roleDest, locale as Locale))
      router.refresh()
    } else {
      setErrorState({ message: [error.message] })
    }
  }

  const handleGoogle = () =>
    supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?redirectTo=${searchParams.get('redirectTo') ?? '/'}`
      }
    })

  return (
    <div className='flex flex-col justify-center items-center min-bs-[100dvh] relative p-6'>
      <Card className='flex flex-col sm:is-[450px]'>
        <CardContent className='p-6 sm:!p-12'>
          <Link href={getLocalizedUrl('/', locale as Locale)} className='flex justify-center items-center mbe-6'>
            <Logo />
          </Link>
          <div className='flex flex-col gap-5'>
            <div>
              <Typography variant='h4'>{`Bem-vindo ao ${themeConfig.templateName} 👋`}</Typography>
              <Typography className='mbs-1'>Entre na sua conta para começar</Typography>
            </div>
            <form noValidate autoComplete='off' onSubmit={handleSubmit(onSubmit)} className='flex flex-col gap-5'>
              <Controller
                name='email'
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    autoFocus
                    fullWidth
                    type='email'
                    label='E-mail'
                    onChange={e => {
                      field.onChange(e.target.value)
                      errorState !== null && setErrorState(null)
                    }}
                    {...((errors.email || errorState !== null) && {
                      error: true,
                      helperText: errors?.email?.message || errorState?.message[0]
                    })}
                  />
                )}
              />
              <Controller
                name='password'
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label='Senha'
                    id='login-password'
                    type={isPasswordShown ? 'text' : 'password'}
                    onChange={e => {
                      field.onChange(e.target.value)
                      errorState !== null && setErrorState(null)
                    }}
                    slotProps={{
                      input: {
                        endAdornment: (
                          <InputAdornment position='end'>
                            <IconButton
                              size='small'
                              edge='end'
                              onClick={handleClickShowPassword}
                              onMouseDown={e => e.preventDefault()}
                              aria-label='mostrar/ocultar senha'
                            >
                              <i className={isPasswordShown ? 'ri-eye-off-line' : 'ri-eye-line'} />
                            </IconButton>
                          </InputAdornment>
                        )
                      }
                    }}
                    {...(errors.password && { error: true, helperText: errors.password.message })}
                  />
                )}
              />
              <div className='flex justify-between items-center gap-x-3 gap-y-1 flex-wrap'>
                <FormControlLabel control={<Checkbox defaultChecked />} label='Lembrar de mim' />
                <Typography className='text-end' color='primary.main' component={Link} href='/forgot-password'>
                  Esqueceu a senha?
                </Typography>
              </div>
              <Button fullWidth variant='contained' type='submit'>
                Entrar
              </Button>
              <Divider className='gap-3'>ou</Divider>
              <Button
                fullWidth
                color='secondary'
                variant='outlined'
                startIcon={<i className='ri-google-fill' />}
                onClick={handleGoogle}
              >
                Entrar com Google
              </Button>
            </form>
          </div>
        </CardContent>
      </Card>
      <Illustrations maskImg={{ src: authBackground }} />
    </div>
  )
}

export default Login
