"use client"

import { useLanguage } from "@/contexts/language-context"
import { useEffect } from "react"

export function DynamicMetadata() {
  const { t, language } = useLanguage()

  useEffect(() => {
    // Update document title
    document.title = t("metadata.title")

    // Update meta description
    const metaDescription = document.querySelector('meta[name="description"]')
    if (metaDescription) {
      metaDescription.setAttribute("content", t("metadata.description"))
    }

    // Update meta keywords
    const metaKeywords = document.querySelector('meta[name="keywords"]')
    if (metaKeywords) {
      metaKeywords.setAttribute("content", t("metadata.keywords"))
    }

    // Update document language
    document.documentElement.lang = language
  }, [t, language])

  return null
}
