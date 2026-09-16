"use client"
import { createContext, useContext, useMemo, useSyncExternalStore, type ReactNode } from "react"
import { translations } from "@/lib/translations"
export type LanguageContextType = { language: string; setLanguage: (language: string) => void; t: (key: string) => string }
const LanguageContext = createContext<LanguageContextType | null>(null)
const ALIASES: Record<string, string> = { us: "en", cn: "zh", sa: "ar", br: "pt", jp: "ja", kr: "ko" }
let memoryLanguage = "es"
function normalizeLang(input?: string | null): string {
  const raw = (input || "").toLowerCase().trim()
  const normalized = ALIASES[raw] || raw.split("-")[0] || "es"
  return translations[normalized] ? normalized : "es"
}
function getLanguage(): string {
  if (typeof window === "undefined") return "es"
  try { return normalizeLang(localStorage.getItem("language") || localStorage.getItem("lang") || localStorage.getItem("locale") || memoryLanguage) }
  catch { return memoryLanguage }
}
function subscribe(listener: () => void) {
  window.addEventListener("storage", listener)
  window.addEventListener("acutis-language", listener)
  return () => { window.removeEventListener("storage", listener); window.removeEventListener("acutis-language", listener) }
}
function setLanguage(input: string) {
  memoryLanguage = normalizeLang(input)
  try { localStorage.setItem("language", memoryLanguage) } catch { /* Memory remains available when storage is disabled. */ }
  window.dispatchEvent(new Event("acutis-language"))
}
export function LanguageProvider({ children }: { children: ReactNode }) {
  const language = useSyncExternalStore(subscribe, getLanguage, () => "es")
  const value = useMemo<LanguageContextType>(() => ({
    language, setLanguage,
    t: (key) => translations[language]?.[key] ?? translations.es?.[key] ?? key,
  }), [language])
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}
export function useLanguage() {
  const context = useContext(LanguageContext)
  if (!context) throw new Error("useLanguage debe usarse dentro de LanguageProvider")
  return context
}
