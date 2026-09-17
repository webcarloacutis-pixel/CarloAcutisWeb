// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { LanguageProvider } from '@/contexts/language-context'
import { languages } from '@/lib/i18n'
import { translations } from '@/lib/translations'
import { serviceTranslations } from '@/lib/service-translations'
import { T } from './t'
afterEach(()=>{cleanup();localStorage.clear();vi.unstubAllGlobals()})
it.each(languages)('renders fixed chat labels immediately in $code without any request',({code})=>{
  const fetcher=vi.fn();vi.stubGlobal('fetch',fetcher);localStorage.setItem('language',code)
  render(<LanguageProvider><T k="chat.quick.prayer" /></LanguageProvider>)
  expect(screen.getByText(translations[code]['chat.quick.prayer'])).toBeTruthy();expect(fetcher).not.toHaveBeenCalled()
  expect(Object.keys(serviceTranslations[code])).toEqual(Object.keys(serviceTranslations.es))
  for(const value of Object.values(serviceTranslations[code]))expect(value.trim().length).toBeGreaterThan(0)
})
