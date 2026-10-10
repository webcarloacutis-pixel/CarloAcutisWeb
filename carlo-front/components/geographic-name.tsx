"use client"
import { useLanguage } from '@/contexts/language-context'
import { geographicName } from '@/lib/catalog-geography'

export function GeographicName({ code }: { code?: string | null }) {
  const { language, t } = useLanguage()
  return <>{code && /^[A-Z]{2}$/.test(code) ? geographicName(code, language) : t('catalog.notDocumented')}</>
}
