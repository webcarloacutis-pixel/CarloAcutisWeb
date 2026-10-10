// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { ScriptureSearchAdvanced } from './scripture-search-advanced'
import { FeaturedVerses } from './featured-verses'
import { EmotionalCategories } from './emotional-categories'
import { supplementalScriptureTranslations, scriptureEmotionTranslationKey } from '@/lib/supplemental-scripture-translations'
import { scriptureData } from '@/lib/scripture-data'
import { categoryKey, filterScripture } from '@/lib/content-filters'
import { formatTranslation } from '@/lib/format-translation'

const state = vi.hoisted(() => ({ language: 'en', query: '', push: vi.fn() }))
const labels = supplementalScriptureTranslations.en
vi.mock('@/contexts/language-context', () => ({ useLanguage: () => ({ language: state.language, t: (key: string) => supplementalScriptureTranslations[state.language][key] ?? key }) }))
vi.mock('@/lib/use-hydrated', () => ({ useHydrated: () => true }))
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: state.push }), useSearchParams: () => new URLSearchParams(state.query) }))
afterEach(() => { cleanup(); vi.clearAllMocks(); state.language = 'en'; state.query = '' })

it('shows the verse search heading in the selected interface language', () => {
  render(<ScriptureSearchAdvanced />)
  expect(screen.getByRole('heading', { name: labels['supplemental.scripture.searchTitle'] })).toBeTruthy()
})

it('shows the featured heading in the selected interface language', () => {
  render(<FeaturedVerses />)
  expect(screen.getByRole('heading', { name: labels['supplemental.scripture.featuredTitle'] })).toBeTruthy()
})

it('shows the emotional category heading in the selected interface language', () => {
  render(<EmotionalCategories />)
  expect(screen.getByRole('heading', { name: labels['supplemental.scripture.categoriesTitle'] })).toBeTruthy()
})

it('renders all supported interface languages while preserving the original verses and references', () => {
  for (const [language, copy] of Object.entries(supplementalScriptureTranslations)) {
    state.language = language
    const view = render(<><ScriptureSearchAdvanced /><FeaturedVerses /><EmotionalCategories /></>)
    for (const key of ['searchTitle', 'featuredTitle', 'categoriesTitle']) expect(screen.getByRole('heading', { name: copy['supplemental.scripture.' + key] })).toBeTruthy()
    const search = screen.getByRole('searchbox', { name: copy['supplemental.scripture.searchLabel'] })
    expect(search.getAttribute('placeholder')).toBe(copy['supplemental.scripture.searchPlaceholder'])
    for (const verse of scriptureData.filter(row => ['1', '2', '3', '4'].includes(row.id))) {
      expect(screen.getByText(verse.text, { exact: true }).textContent).toBe(verse.text)
      expect(screen.getByText('— ' + verse.reference, { exact: true })).toBeTruthy()
    }
    view.unmount()
  }
})

it('keeps original emotion queries and category routes when their visible labels are translated', () => {
  render(<><ScriptureSearchAdvanced /><EmotionalCategories /></>)
  fireEvent.click(screen.getByRole('button', { name: 'hope' }))
  const route = new URL(state.push.mock.calls[0][0], 'http://local.invalid')
  expect(route.pathname).toBe('/versiculos')
  expect(route.searchParams.get('busqueda')).toBe('esperanza')
  const links = screen.getAllByRole('link', { name: labels['supplemental.scripture.exploreVerses'] })
  const originals = ['Miedo y Ansiedad', 'Tristeza y Dolor', 'Esperanza y Alegría', 'Fe y Confianza', 'Paz y Tranquilidad', 'Fortaleza y Valor']
  expect(links).toHaveLength(originals.length)
  links.forEach((link, index) => {
    const categoryRoute = new URL(link.getAttribute('href')!, 'http://local.invalid')
    expect(categoryRoute.searchParams.get('categoria')).toBe(categoryKey(originals[index]))
    expect(screen.getByText(labels[`supplemental.scripture.category.${index}.title`], { exact: true })).toBeTruthy()
  })
})

it('finds localized suggestions but sends the original corpus emotion when selected', () => {
  render(<ScriptureSearchAdvanced />)
  fireEvent.change(screen.getByRole('searchbox', { name: labels['supplemental.scripture.searchLabel'] }), { target: { value: 'hop' } })
  const suggestion = formatTranslation(labels['supplemental.scripture.suggestionLabel'], { emotion: 'hope', count: filterScripture(scriptureData, 'esperanza', '').length })
  expect(screen.getByRole('list', { name: labels['supplemental.scripture.suggestions'] })).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: suggestion }))
  expect(new URL(state.push.mock.calls[0][0], 'http://local.invalid').searchParams.get('busqueda')).toBe('esperanza')
})

it('renders actual filtered counts, reflections and prayers with localized labels', () => {
  state.language = 'ar'
  state.query = 'busqueda=paz&categoria=paz-y-tranquilidad'
  const copy = supplementalScriptureTranslations.ar
  const originals = filterScripture(scriptureData, 'paz', 'paz-y-tranquilidad')
  expect(originals.length).toBeGreaterThan(0)
  render(<ScriptureSearchAdvanced />)
  expect(screen.getByRole('status').textContent).toBe(formatTranslation(copy['supplemental.scripture.resultsCount'], { count: originals.length }))
  expect(screen.getByText(formatTranslation(copy['supplemental.scripture.categoryLabel'], { category: copy['supplemental.scripture.category.4.title'] }), { exact: true })).toBeTruthy()
  for (const verse of originals) {
    expect(screen.getByText(verse.text, { exact: true }).textContent).toBe(verse.text)
    if (verse.reflection) expect(screen.getByText(verse.reflection, { exact: true }).textContent).toBe(verse.reflection)
    if (verse.prayer) expect(screen.getByText(verse.prayer, { exact: true }).textContent).toBe(verse.prayer)
  }
  expect(screen.getAllByText(copy['supplemental.scripture.relatedEmotions'], { exact: true })).toHaveLength(originals.length)
})

it('provides complete Unicode resources with identical placeholders and emotion coverage', () => {
  expect(Object.keys(supplementalScriptureTranslations).sort()).toEqual(['es', 'en', 'fr', 'pt', 'it', 'de', 'zh', 'hi', 'ar', 'ru', 'ja', 'ko', 'tr', 'vi', 'pl'].sort())
  const keys = Object.keys(supplementalScriptureTranslations.es).sort()
  expect(keys).toHaveLength(71)
  for (const [language, copy] of Object.entries(supplementalScriptureTranslations)) {
    expect(Object.keys(copy).sort(), language).toEqual(keys)
    for (const key of keys) {
      expect(typeof copy[key], language + ':' + key).toBe('string')
      expect(copy[key].trim(), language + ':' + key).not.toBe('')
      expect(copy[key], language + ':' + key).not.toMatch(/\uFFFD|\p{L}\?\p{L}/u)
      expect(copy[key].match(/\{\w+\}/g)?.sort() || []).toEqual(supplementalScriptureTranslations.es[key].match(/\{\w+\}/g)?.sort() || [])
    }
    for (const original of scriptureData.flatMap(verse => verse.emotions)) {
      const key = scriptureEmotionTranslationKey(original)
      expect(Boolean(key), original).toBe(true)
      expect(typeof copy[key!], language + ':' + original).toBe('string')
    }
  }
})
