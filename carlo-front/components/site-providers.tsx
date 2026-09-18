"use client"
import { Suspense, type ReactNode } from 'react'
import { LanguageProvider } from '@/contexts/language-context'
import { UserProvider } from '@/contexts/user-context'

export function SiteProviders({children}:{children:ReactNode}) {
  // Session/language effects must commit with the subtree they personalize.
  // An effect outside this boundary can update still-unhydrated server HTML.
  return <Suspense fallback={null}><LanguageProvider><UserProvider>{children}</UserProvider></LanguageProvider></Suspense>
}
