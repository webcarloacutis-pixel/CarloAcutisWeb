"use client"

import { useLanguage } from "@/contexts/language-context"
import { useEffect } from "react"
import { htmlContentLocale } from "@/lib/content-locale"

export function DynamicMetadata() {
  const { language } = useLanguage()
  useEffect(() => {
    // Route metadata belongs to Next. Missing translation keys must not replace it.
    document.documentElement.lang = htmlContentLocale(language)
    document.documentElement.dir = language === "ar" ? "rtl" : "ltr"
  }, [language])
  return null
}
