"use client"
import { createContext, useContext, useEffect, useMemo, useSyncExternalStore, type ReactNode } from "react"
import { translations } from "@/lib/translations"
import { normalizeContentLocale } from "@/lib/content-locale"
export type LanguageContextType = { language: string; setLanguage: (language: string) => void; t: (key: string) => string }
const LanguageContext = createContext<string | null>(null)
let memoryLanguage: string = "es"
function getLanguage(): string {
  if (typeof window === "undefined") return "es"
  const query = new URLSearchParams(window.location.search).get("lang")
  const cookie = document.cookie.split(";").map(item => item.trim()).find(item => item.startsWith("acutis_locale="))?.slice("acutis_locale=".length)
  if (query || cookie) return normalizeContentLocale(query || cookie)
  try { return normalizeContentLocale(localStorage.getItem("language") || localStorage.getItem("lang") || localStorage.getItem("locale") || memoryLanguage) }
  catch { return memoryLanguage }
}
function subscribe(listener: () => void) {
  window.addEventListener("storage", listener)
  window.addEventListener("acutis-language", listener)
  window.addEventListener("popstate", listener)
  return () => { window.removeEventListener("storage", listener); window.removeEventListener("acutis-language", listener); window.removeEventListener("popstate", listener) }
}
function persistLanguage(input: string) {
  memoryLanguage = normalizeContentLocale(input)
  try { localStorage.setItem("language", memoryLanguage) } catch { /* Memory remains available when storage is disabled. */ }
  document.cookie = `acutis_locale=${memoryLanguage}; Path=/; Max-Age=31536000; SameSite=Lax${window.location.protocol === "https:" ? "; Secure" : ""}`
}
function setLanguage(input: string) {
  persistLanguage(input)
  // Preserve the current route and every filter. Explicit URL locale wins on reload/back.
  const url = new URL(window.location.href)
  url.searchParams.set("lang", memoryLanguage)
  window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash)
  window.dispatchEvent(new Event("acutis-language"))
}
export function LanguageProvider({ children, initialLanguage = "es" }: { children: ReactNode; initialLanguage?: string }) {
  // Persist URL/legacy preferences for ordinary links without changing a deferred boundary's SSR snapshot.
  useEffect(() => { persistLanguage(getLanguage()) }, [])
  return <LanguageContext.Provider value={normalizeContentLocale(initialLanguage)}>{children}</LanguageContext.Provider>
}
export function useLanguage() {
  const context = useContext(LanguageContext)
  if (context === null) throw new Error("useLanguage debe usarse dentro de LanguageProvider")
  // Each consumer hydrates from its request's original snapshot as its server HTML.
  // A provider-level locale update can otherwise reach a still-dehydrated boundary.
  const language = useSyncExternalStore(subscribe, getLanguage, () => context)
  return useMemo<LanguageContextType>(() => ({
    language, setLanguage,
    t: (key) => translations[language]?.[key] ?? translations.es?.[key] ?? key,
  }), [language])
}
