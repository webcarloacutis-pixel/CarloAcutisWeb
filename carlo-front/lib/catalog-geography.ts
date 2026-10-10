import { continentTranslations } from './continent-translations'

/** Fixed continent UI names; alpha-country names use locale data without rewriting catalog fields. */
export function geographicName(code: string, language: string): string {
  if (Object.hasOwn(continentTranslations.es, code)) return continentTranslations[language]?.[code] ?? continentTranslations.es[code]
  try { return new Intl.DisplayNames([language], { type:'region' }).of(code) || code }
  catch { return code }
}
