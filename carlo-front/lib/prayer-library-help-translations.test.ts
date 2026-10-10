import { expect, it } from 'vitest'
import { languages } from './i18n'
import { prayerHelpKeys, prayerLibraryHelpTranslations } from './prayer-library-help-translations'
import { translations } from './translations'

it('provides the five instructions directly in all fifteen languages and keeps exact original Spanish wording', () => {
  expect(Object.keys(prayerLibraryHelpTranslations).sort()).toEqual(languages.map(language => language.code).sort())
  for (const { code } of languages) for (const key of prayerHelpKeys) {
    const translated = prayerLibraryHelpTranslations[code]['prayerHelp.' + key]
    expect(translated.trim()).not.toBe('')
    expect(translated).not.toContain('\uFFFD')
    expect(translations[code]['prayerHelp.' + key]).toBe(translated)
  }
  expect(prayerHelpKeys.map(key => translations.es['prayerHelp.' + key])).toEqual([
    'Busca por santo, ocasión o necesidad', 'Explora las categorías temáticas', 'Lee con devoción y recogimiento', 'Adapta las oraciones a tu situación', 'Practica la oración regularmente',
  ])
})
