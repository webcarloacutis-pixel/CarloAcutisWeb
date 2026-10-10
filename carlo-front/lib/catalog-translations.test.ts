import { expect, it } from 'vitest'
import { translations } from './translations'
import { catalogTranslations } from './catalog-translations'
import { formatTranslation } from './format-translation'

it('provides every catalogue UI label in all existing languages with consistent placeholders',()=>{
  const languages=['es','en','zh','hi','ar','pt','ru','fr','ja','de','ko','it','tr','vi','pl']
  const required=['catalog.temporarilyUnavailable','catalog.rateLimited','catalog.accessDenied','catalog.failed','catalog.firstPage',
    'catalog.saintsLoading','catalog.saintsCount','catalog.saintsEmpty','catalog.miraclesLoading','catalog.miraclesEmpty',
    'catalog.filterMiracles','catalog.searchMiracles','catalog.allSaints','catalog.allTypes','catalog.onlyApproved',
    'catalog.miraclesCount','catalog.approvedCount','catalog.adjustFilters','catalog.attributedTo','catalog.approved',
    'catalog.witnesses','catalog.witnessCount','catalog.pagination','catalog.range','catalog.birth','catalog.death','catalog.canonization',
    'catalog.readBiography','catalog.orderAi','catalog.orderAlphabetical','catalog.searchSaints','catalog.birthContinent',
    'catalog.birthCountry','catalog.deathCentury','catalog.allContinents','catalog.allCountries','catalog.allCenturies']
  for(const language of languages)for(const key of required){
    expect(translations[language][key],language+':'+key).toBeTruthy()
    expect(translations[language][key]).not.toBe(key)
    expect(translations[language][key]?.match(/\{\w+\}/g)?.sort()||[]).toEqual(translations.es[key]?.match(/\{\w+\}/g)?.sort()||[])
  }
  for(const language of languages)for(const [key,text] of Object.entries(catalogTranslations.es)){
    expect(catalogTranslations[language][key],language+':'+key).toBeTruthy()
    expect(catalogTranslations[language][key].match(/\{\w+\}/g)?.sort()||[]).toEqual(text.match(/\{\w+\}/g)?.sort()||[])
  }
})

it('formats placeholders without changing names or interpreting them as HTML',()=>{
  expect(formatTranslation('Found {count}: {name}',{count:12,name:'<name>{count}</name>'})).toBe('Found 12: <name>{count}</name>')
  expect(formatTranslation('{missing}',{})).toBe('{missing}')
})
