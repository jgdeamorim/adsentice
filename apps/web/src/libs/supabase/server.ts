// adsentice · Supabase server client (server components / actions / route handlers). Cookies via next/headers.
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

export const createClient = async () => {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
          } catch {
            // chamado de um Server Component (read-only) — o middleware cuida do refresh. Ignorar.
          }
        }
      }
    }
  )
}

/** A sessão do usuário no server: user + role + tenant_id (das custom claims em app_metadata). */
export const getSessionUser = async () => {
  const supabase = await createClient()
  const {
    data: { user }
  } = await supabase.auth.getUser()

  if (!user) return null

  return {
    id: user.id,
    email: user.email ?? null,
    role: (user.app_metadata?.role as 'admin' | 'client' | undefined) ?? 'client',
    tenantId: (user.app_metadata?.tenant_id as string | undefined) ?? null
  }
}
