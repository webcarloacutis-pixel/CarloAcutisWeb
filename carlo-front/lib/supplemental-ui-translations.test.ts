import { expect, it } from 'vitest'
import { supplementalUiTranslations } from './supplemental-ui-translations'
import { supplementalFieldTranslations } from './supplemental-field-translations'
import { supplementalPrayerTranslations } from './supplemental-prayer-translations'
import { translations } from './translations'
import { editorialInterfaceTranslations } from './editorial-interface-translations'
import { chromeInterfaceTranslations } from './chrome-interface-translations'
import { supplementalScriptureTranslations } from './supplemental-scripture-translations'
import { pageShellTranslations } from './page-shell-translations'
import { legacyInterfaceTranslations } from './legacy-interface-translations'

const languages=['es','en','zh','hi','ar','pt','ru','fr','ja','de','ko','it','tr','vi','pl']
const resources={interface:supplementalUiTranslations,fields:supplementalFieldTranslations,prayers:supplementalPrayerTranslations,editorial:editorialInterfaceTranslations,chrome:chromeInterfaceTranslations,scripture:supplementalScriptureTranslations,shell:pageShellTranslations,legacy:legacyInterfaceTranslations}

it('has every supplemental interface key in all existing languages with matching placeholders',()=>{
  for(const [name,resource] of Object.entries(resources)){
    expect(Object.keys(resource).sort(),name).toEqual([...languages].sort())
    const keys=Object.keys(resource.es).sort()
    for(const language of languages){
      expect(Object.keys(resource[language]).sort(),name+':'+language).toEqual(keys)
      for(const key of keys){
        const text=resource[language][key]
        expect(typeof text,name+':'+language+':'+key).toBe('string')
        expect(text.trim(),name+':'+language+':'+key).not.toBe('')
        expect(text.match(/\{\w+\}/g)?.sort()||[]).toEqual(resource.es[key].match(/\{\w+\}/g)?.sort()||[])
      }
    }
  }
  expect(Object.keys(supplementalPrayerTranslations.es)).toHaveLength(31)
})

it('preserves Unicode rather than replacing letters or punctuation with question marks',()=>{
  for(const [name,resource] of Object.entries(resources))for(const [language,entries] of Object.entries(resource))for(const [key,text] of Object.entries(entries)){
    expect(text,name+':'+language+':'+key).not.toMatch(/\p{L}\?\p{L}|\?{2,}|\uFFFD/u)
  }
})

it('merges supplemental resources into the website language catalog',()=>{
  for(const language of languages)for(const [key,text] of Object.entries(supplementalUiTranslations[language])){
    expect(translations[language][key],language+':'+key).toBe(text)
  }
  for(const language of languages)for(const resource of [supplementalFieldTranslations,supplementalPrayerTranslations])for(const [key,text] of Object.entries(resource[language])){
    expect(supplementalUiTranslations[language][key],language+':'+key).toBe(text)
  }
  for(const language of languages)for(const [key,text] of Object.entries(editorialInterfaceTranslations[language])){
    expect(translations[language][key],language+':'+key).toBe(text)
  }
  for(const language of languages)for(const [key,text] of Object.entries(chromeInterfaceTranslations[language])){
    expect(translations[language][key],language+':'+key).toBe(text)
  }
  for(const language of languages)for(const [key,text] of Object.entries(supplementalScriptureTranslations[language])){
    expect(translations[language][key],language+':'+key).toBe(text)
  }
  for(const language of languages)for(const [key,text] of Object.entries(pageShellTranslations[language])){
    expect(translations[language][key],language+':'+key).toBe(text)
  }
  for(const language of languages)for(const [key,text] of Object.entries(legacyInterfaceTranslations[language])){
    expect(translations[language][key],language+':'+key).toBe(text)
  }
})
