'use client'

// adsentice · auth managed pelo Supabase (cookies + middleware) — não precisa de SessionProvider.
// Passthrough: mantém o nome/props (ex: basePath) pra não quebrar o Providers até a limpeza da estrutura.
import type { ReactNode } from 'react'

export const NextAuthProvider = ({ children }: { children: ReactNode; [key: string]: unknown }) => {
  return <>{children}</>
}
