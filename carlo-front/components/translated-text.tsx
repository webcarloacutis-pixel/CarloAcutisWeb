"use client"
import { useEffect, useState } from "react"
import { useLanguage } from "@/contexts/language-context"
import { acquireTranslation } from "@/lib/translation-client"

/** Editorial content remains visible; only an explicit action requests a translation. */
export function TranslatedText({ text, className, allowTranslation = false }: { text: string; className?: string; allowTranslation?: boolean }) {
  const { language } = useLanguage()
  // Remount per source/language so returning to a cancelled request never resends it.
  return <Translation key={JSON.stringify([language,text])} text={text} className={className} allowTranslation={allowTranslation} />
}
function Translation({ text, className, allowTranslation }: { text: string; className?: string; allowTranslation: boolean }) {
  const { language, t } = useLanguage()
  const key = JSON.stringify([language, text])
  const [requested, setRequested] = useState("")
  const [result, setResult] = useState<{ key: string; value?: string; failed?: boolean } | null>(null)
  const current = result?.key === key ? result : null
  const loading = requested === key && !current
  useEffect(() => {
    if (!allowTranslation || requested !== key || language === "es" || !text) return
    let cancelled = false
    const request = acquireTranslation(text, language)
    request.promise.then(value => {
      if (!cancelled) setResult({ key, value })
    }).catch(() => { if (!cancelled) setResult({ key, failed: true }) })
    return () => { cancelled = true; request.release() }
  }, [allowTranslation, requested, key, text, language])
  return <span className={className}>
    <span lang={current?.value ? language : "es"}>{current?.value || text}</span>
    {language !== "es" && !current?.value && <small className="block text-muted-foreground">{t("content.originalSpanish")}</small>}
    {allowTranslation && language !== "es" && !current && <button type="button" className="block underline text-sm mt-2" disabled={loading} onClick={() => setRequested(key)}>{t(loading ? "common.loading" : "content.translate")}</button>}
    {current?.failed && <small role="status" className="block">{t("content.translationUnavailable")}</small>}
  </span>
}
