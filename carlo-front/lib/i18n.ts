import type { translations } from "./translations"

export const languages = [
  { code: "es" as const, name: "Español", flag: "🇪🇸" },
  { code: "en" as const, name: "English", flag: "🇺🇸" },
  { code: "zh" as const, name: "中文", flag: "🇨🇳" },
  { code: "hi" as const, name: "हिन्दी", flag: "🇮🇳" },
  { code: "ar" as const, name: "العربية", flag: "🇸🇦" },
  { code: "pt" as const, name: "Português", flag: "🇧🇷" },
  { code: "ru" as const, name: "Русский", flag: "🇷🇺" },
  { code: "fr" as const, name: "Français", flag: "🇫🇷" },
  { code: "ja" as const, name: "日本語", flag: "🇯🇵" },
  { code: "de" as const, name: "Deutsch", flag: "🇩🇪" },
  { code: "ko" as const, name: "한국어", flag: "🇰🇷" },
  { code: "it" as const, name: "Italiano", flag: "🇮🇹" },
  { code: "tr" as const, name: "Türkçe", flag: "🇹🇷" },
  { code: "vi" as const, name: "Tiếng Việt", flag: "🇻🇳" },
  { code: "pl" as const, name: "Polski", flag: "🇵🇱" },
] as const

// ✅ Tipo de códigos basado en el array (fuente única de verdad)
export type LanguageCode = (typeof languages)[number]["code"]

// ✅ Default language tipado
export const defaultLanguage: LanguageCode = "es"

// ✅ Tipo de un item completo (por si lo necesitas)
export type Language = (typeof languages)[number]

// (Opcional) si quieres asegurar que translations tiene esas keys:
// export type TranslationLanguageCode = keyof typeof translations
// y podrías comparar/validar en runtime si algún día lo necesitas.
