"use client"
import { useEffect, useMemo, useState } from "react"
import { useLanguage } from "@/contexts/language-context"
import manifest from "@/content/catalog-translation-manifest.json"
import { localizeCatalogRecord, validateTranslationPack, type CatalogKind, type CatalogTranslationPack } from "./catalog-localization"
import { publicJson, publicRequest } from "./public-request"
const cache = new Map<string, CatalogTranslationPack>()
const requests = new Map<string, Promise<CatalogTranslationPack>>()
let active = 0
const waiting: (() => void)[] = []
async function readPack(url: string, kind: CatalogKind, id: string, locale: string) {
  const saved = cache.get(url)
  if (saved) { cache.delete(url); cache.set(url, saved); return saved }
  const pending = requests.get(url)
  if (pending) return pending
  const request = (async () => {
    if (active >= 4) await new Promise<void>(resolve => waiting.push(resolve))
    else active++
    try {
      const response = await publicRequest(url, { credentials: "omit", cache: "force-cache", signal: AbortSignal.timeout(5000) })
      const pack = validateTranslationPack(await publicJson(response), kind, id, locale)
      cache.set(url, pack)
      while (cache.size > 64) cache.delete(cache.keys().next().value!)
      return pack
    } finally { const release = waiting.shift(); if (release) release(); else active-- }
  })()
  requests.set(url, request)
  try { return await request } finally { requests.delete(url) }
}
export function useCatalogLocalization<T extends { id: string }>(kind: CatalogKind, source: T) {
  const { language } = useLanguage()
  const entities = manifest.entities[kind] as Record<string, string[]>
  const available = entities[source.id]?.includes(language) && language !== "es"
  const url = available ? `/catalog-translations/${manifest.version}/${kind}/${encodeURIComponent(source.id)}/${language}.json` : ""
  const [result, setResult] = useState<{ url: string; pack?: CatalogTranslationPack; failed?: boolean }>({ url: "" })
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    if (!url) return
    let current = true
    void readPack(url, kind, source.id, language).then(pack => { if (current) setResult({ url, pack }) }).catch(() => { if (current) setResult({ url, failed: true }) })
    // Immutable static translations can finish into their public cache; obsolete responses never update this entity.
    return () => { current = false }
  }, [url, kind, source.id, language, attempt])
  const pack = result.url === url ? result.pack : cache.get(url)
  const localized = useMemo(() => localizeCatalogRecord(source, pack), [source, pack])
  return { ...localized, language, pending: language !== "es" && !pack, failed: result.url === url && !!result.failed,
    retry: () => { if (attempt < 2) setAttempt(value => value + 1) }, canRetry: attempt < 2 }
}
