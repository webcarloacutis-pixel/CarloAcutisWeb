import { expect, it } from 'vitest'
import { supplementalFieldTranslations } from './supplemental-field-translations'
import { PRAYER_CATEGORIES } from './content-filters'

it('provides all field and static-category interface labels in all established languages',()=>{
  expect(Object.keys(supplementalFieldTranslations).sort()).toEqual(['es','en','zh','hi','ar','pt','ru','fr','ja','de','ko','it','tr','vi','pl'].sort())
  const required=Object.keys(supplementalFieldTranslations.es).sort()
  expect(required).toHaveLength(52)
  for(const [language,entries] of Object.entries(supplementalFieldTranslations)){
    expect(Object.keys(entries).sort(),language).toEqual(required)
    for(const [key,text] of Object.entries(entries)){
      expect(typeof text,language+':'+key).toBe('string')
      expect(text.trim(),language+':'+key).not.toBe('')
      expect(text,language+':'+key).not.toBe(key)
    }
  }
})

it('keeps the original Spanish category labels and filter vocabulary unchanged',()=>{
  PRAYER_CATEGORIES.forEach((category,index)=>{
    const entries=supplementalFieldTranslations.es
    expect(entries['supplemental.prayerCategory.'+index+'.title']).toBe(category.title)
    expect(entries['supplemental.prayerCategory.'+index+'.description']).toBe(category.description)
    category.tags.forEach((tag,offset)=>expect(entries['supplemental.prayerCategory.'+index+'.tag'+offset]).toBe(tag))
  })
  expect(supplementalFieldTranslations.es['supplemental.field.birthCountryCode']).toBe('País actual de nacimiento (código ISO)')
  expect(supplementalFieldTranslations.en['supplemental.field.birthYear']).toBe('Birth year')
})
