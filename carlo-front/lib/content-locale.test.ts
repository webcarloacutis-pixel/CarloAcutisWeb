import { expect, it } from 'vitest'
import { contentLocales,normalizeContentLocale,htmlContentLocale } from './content-locale'
it('normalizes the fifteen offered languages and legacy country flags',()=>{
  expect(contentLocales).toHaveLength(15)
  for(const code of contentLocales)expect(normalizeContentLocale(code)).toBe(code)
  for(const code of ['cn','CN','zh-CN','zh-Hans','zh_CN'])expect(normalizeContentLocale(code)).toBe('zh')
  expect(htmlContentLocale('cn')).toBe('zh-CN')
  expect(normalizeContentLocale('us')).toBe('en')
  expect(normalizeContentLocale('unknown')).toBe('es')
})
