"use client"
import { useLanguage } from "@/contexts/language-context"
export default function Loading() {
  const { t } = useLanguage()
  return <main className="min-h-screen grid place-items-center" aria-busy="true"><p role="status">{t("common.loading")}</p></main>
}
