export const contentLocales = ["es", "en", "zh", "hi", "ar", "pt", "ru", "fr", "ja", "de", "ko", "it", "tr", "vi", "pl"] as const
export type ContentLocale = typeof contentLocales[number]
const aliases: Record<string, string> = { us: "en", cn: "zh", sa: "ar", br: "pt", jp: "ja", kr: "ko" }
export function normalizeContentLocale(input?: string | null): ContentLocale {
  const raw = (input || "").trim().toLowerCase()
  const code = aliases[raw] || raw.split(/[-_]/)[0]
  return contentLocales.includes(code as ContentLocale) ? code as ContentLocale : "es"
}
export function htmlContentLocale(locale: string): string { return normalizeContentLocale(locale) === "zh" ? "zh-CN" : normalizeContentLocale(locale) }
