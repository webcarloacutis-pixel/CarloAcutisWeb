// @vitest-environment jsdom
import { renderToString } from 'react-dom/server'
import { hydrateRoot, type Root } from 'react-dom/client'
import { afterEach, expect, it, vi } from 'vitest'
import { LanguageProvider } from '@/contexts/language-context'
import { SaintsFilters } from './saints-filters'

afterEach(() => vi.restoreAllMocks())

it.each(['en', 'ar'])('hydrates continent options with saved %s when browser Intl returns numeric region codes', async (language) => {
  localStorage.setItem('language', language)
  const onChange = vi.fn()
  const filters = { query: 'Santa Felicidad', continent: '', country: '', century: '' }
  const tree = <LanguageProvider><SaintsFilters filters={filters} countries={[{ code: 'DE', label: 'Alemania' }]} onChange={onChange} /></LanguageProvider>
  const host = document.createElement('div')
  host.innerHTML = renderToString(tree)
  document.body.append(host)
  expect(host.querySelector('option[value="europe"]')?.textContent).toBe('Europa')
  const serverValues = [...host.querySelectorAll('option')].map(option => option.value)
  const NativeDisplayNames = Intl.DisplayNames
  // The real Next dev browser trace reports client "150" versus SSR "Europa".
  // Alpha-country names remain implemented, matching the scope of that failure.
  vi.spyOn(Intl, 'DisplayNames').mockImplementation(function (locales, options) {
    const display = new NativeDisplayNames(locales, options)
    const nativeOf = display.of.bind(display)
    display.of = code => /^\d{3}$/.test(code) ? code : nativeOf(code)
    return display
  })
  expect(new Intl.DisplayNames(['es'], { type: 'region' }).of('150')).toBe('150')
  const errors: unknown[] = []
  let root: Root | undefined
  try {
    root = hydrateRoot(host, tree, { onRecoverableError: error => errors.push(error) })
    await new Promise(resolve => setTimeout(resolve, 100))
    expect(errors, 'Browser numeric-region fallback must not replace the server continent text').toEqual([])
    expect(host.querySelector('option[value="europe"]')?.textContent).toBe(language === 'ar' ? 'أوروبا' : 'Europe')
    expect(host.querySelector('option[value="DE"]')?.textContent).toBe(new NativeDisplayNames([language], { type: 'region' }).of('DE'))
    expect([...host.querySelectorAll('option')].map(option => option.value)).toEqual(serverValues)
    const continent = host.querySelector<HTMLSelectElement>('select:has(option[value="europe"])')!
    expect(continent.disabled).toBe(false)
    continent.value = 'europe'
    continent.dispatchEvent(new Event('change', { bubbles: true }))
    expect(onChange).toHaveBeenCalledWith({ ...filters, continent: 'europe' })
  } finally { root?.unmount(); host.remove() }
})
