import { afterEach, expect, it, vi } from 'vitest'
import { geographicName } from './catalog-geography'
import { continentCodes, continentTranslations } from './continent-translations'
import { CONTINENTS } from './content-filters'
import { languages } from './i18n'

afterEach(() => vi.restoreAllMocks())
it('localizes geography independently of stored catalog filters and preserves unknown input',()=>{
  expect(geographicName('europe','en')).toBe('Europe')
  expect(geographicName('DE','en')).toBe('Germany')
  expect(geographicName('DE','es')).toBe('Alemania')
  expect(geographicName('invalid','en')).toBe('invalid')
  expect(geographicName('constructor','en')).toBe('constructor')
})

it('provides every existing continent label in all fifteen languages without depending on Intl', () => {
  vi.spyOn(Intl, 'DisplayNames').mockImplementation(function () { throw new Error('Unavailable locale data') })
  expect(Object.keys(continentTranslations).sort()).toEqual(languages.map(language => language.code).sort())
  expect(continentCodes).toEqual([...CONTINENTS.map(continent => continent.code), 'america'])
  for (const { code: language } of languages) for (const continent of continentCodes) {
    const value = geographicName(continent, language)
    expect(value).toBe(continentTranslations[language][continent])
    expect(value.trim()).not.toBe('')
    expect(value).not.toBe(continent)
    expect(value).not.toMatch(/^\d{3}$/)
    expect(value).not.toContain('\uFFFD')
  }
  for (const continent of CONTINENTS) expect(geographicName(continent.code, 'es')).toBe(continent.label)
  expect(geographicName('america', 'es')).toBe('América (Norte y Sur)')
  expect(geographicName('europe', 'unsupported')).toBe('Europa')
  expect(Intl.DisplayNames).not.toHaveBeenCalled()
})
