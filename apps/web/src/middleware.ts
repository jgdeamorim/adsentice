// adsentice · middleware — refresh da sessão Supabase + proteção de rota (admin/client). Respeita o [lang] do Materio.
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// páginas públicas (sem login) — as telas de auth + marketing. O resto do app é protegido.
const AUTH_PAGES = ['login', 'register', 'forgot-password', 'reset-password', 'verify-email', 'two-steps']
const PUBLIC_PREFIXES = ['front-pages', 'auth'] // marketing + o callback OAuth

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
        }
      }
    }
  )

  const {
    data: { user }
  } = await supabase.auth.getUser()

  // decompõe o path: /{lang}/{seg1}/...
  const segments = request.nextUrl.pathname.split('/').filter(Boolean)
  const lang = segments[0] && segments[0].length === 2 ? segments[0] : 'en'
  const rest = segments[0] && segments[0].length === 2 ? segments.slice(1) : segments
  const first = rest[0] ?? ''

  const isAuthPage = AUTH_PAGES.includes(first)
  const isPublic = isAuthPage || PUBLIC_PREFIXES.includes(first) || rest.length === 0 && !user

  // logado tentando ver a tela de login → manda pro dashboard
  if (user && isAuthPage) {
    return NextResponse.redirect(new URL(`/${lang}`, request.url))
  }

  // não-logado em rota protegida → manda pro login (guardando o destino)
  if (!user && !isPublic) {
    const url = new URL(`/${lang}/login`, request.url)
    url.searchParams.set('redirectTo', request.nextUrl.pathname)
    return NextResponse.redirect(url)
  }

  // rota de admin exige role=admin (as custom claims vêm de app_metadata)
  if (user && first === 'admin') {
    const role = (user.app_metadata?.role as string | undefined) ?? 'client'
    if (role !== 'admin') {
      return NextResponse.redirect(new URL(`/${lang}/not-authorized`, request.url))
    }
  }

  return response
}

export const config = {
  // roda em tudo, menos assets estáticos e o _next
  matcher: ['/((?!_next/static|_next/image|favicon.ico|images|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)']
}
