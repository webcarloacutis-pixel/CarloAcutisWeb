"use client"
import { useEffect, useState, useSyncExternalStore } from "react"
import { useLanguage } from "@/contexts/language-context"
import { postAiTranslate } from "@/lib/ai-client"
function hashTiny(text: string) {
  let hash = 5381
  for (let index = 0; index < text.length; index++) hash = (hash * 33) ^ text.charCodeAt(index)
  return (hash >>> 0).toString(16)
}
function subscribe(listener: () => void) {
  window.addEventListener("storage", listener)
  window.addEventListener("acutis-translation", listener)
  return () => { window.removeEventListener("storage", listener); window.removeEventListener("acutis-translation", listener) }
}
function readCache(key: string): string | null {
  try { return localStorage.getItem(key) } catch { return null }
}
export function TranslatedText({ text, className }: { text: string; className?: string }) {
  const { language } = useLanguage()
  const key = "tr:" + language + ":" + hashTiny(text || "")
  const rawCache = useSyncExternalStore(subscribe, () => readCache(key), () => null)
  let cached = ""
  try {
    const record = JSON.parse(rawCache || "null")
    // Compare the full source as well as the compact cache key; hash collisions cannot reuse unrelated text.
    if (record?.source === text && record?.language === language && typeof record?.translation === "string") cached = record.translation
  } catch { /* Older unversioned cache entries cannot establish the source identity. */ }
  const [result, setResult] = useState<{ key: string; source: string; translation: string } | null>(null)
  const current = result?.key === key && result.source === text ? result : null
  const loading = Boolean(text && language !== "es" && !cached && !current)
  useEffect(() => {
    if (!text || language === "es" || cached) return
    const controller = new AbortController()
    postAiTranslate({ text, targetLang: language }, controller.signal).then((response) => {
      if (controller.signal.aborted) return
      const translation = response.translated || response.translation || response.text
      if (typeof translation !== "string" || !translation.trim()) throw new Error("Translation unavailable")
      setResult({ key, source: text, translation })
      try {
        localStorage.setItem(key, JSON.stringify({ source: text, language, translation }))
        window.dispatchEvent(new Event("acutis-translation"))
      } catch { /* The current translation still remains available in memory. */ }
    }).catch(() => {
      if (!controller.signal.aborted) setResult({ key, source: text, translation: "" })
    })
    return () => controller.abort()
  }, [text, language, key, cached])
  const output = language === "es" ? text : cached || current?.translation || text
  return <span className={className}>{output}{loading && <span className="opacity-60"> …</span>}</span>
}
