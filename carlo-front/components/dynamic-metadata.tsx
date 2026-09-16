"use client"

import { useLanguage } from "@/contexts/language-context"
import { useEffect } from "react"

export function DynamicMetadata() {
  const { language } = useLanguage()
  useEffect(() => {
    // Route metadata belongs to Next. Missing translation keys must not replace it.
    document.documentElement.lang = language
  }, [language])
  return null
}
