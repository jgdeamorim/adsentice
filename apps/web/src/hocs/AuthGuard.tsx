// Type Imports
import type { Locale } from '@configs/i18n'
import type { ChildrenType } from '@core/types'

// Component Imports
import AuthRedirect from '@/components/AuthRedirect'

// Supabase (adsentice · auth managed)
import { getSessionUser } from '@/libs/supabase/server'

export default async function AuthGuard({ children, locale }: ChildrenType & { locale: Locale }) {
  const user = await getSessionUser()

  return <>{user ? children : <AuthRedirect lang={locale} />}</>
}
