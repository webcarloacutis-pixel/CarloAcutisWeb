// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { translations } from '@/lib/translations'
import { supplementalUiTranslations } from '@/lib/supplemental-ui-translations'
import { PRAYER_CATEGORIES, categoryKey } from '@/lib/content-filters'
import { MapLegend } from './map-legend'
import { PrayersSearch } from './prayers-search'
import { PrayersResults } from './prayers-results'
import { AdminPrayersList } from './admin-prayers-list'
import { MiracleForm } from './miracle-form'
import { AuthModal } from './auth-modal'
const state=vi.hoisted(()=>({language:'fr',push:vi.fn(),login:vi.fn(),register:vi.fn()}))
vi.mock('@/contexts/language-context',()=>({useLanguage:()=>({language:state.language,t:(key:string)=>translations[state.language]?.[key]??key})}))
vi.mock('@/contexts/user-context',()=>({useUser:()=>({login:state.login,register:state.register,error:''})}))
vi.mock('@/lib/use-hydrated',()=>({useHydrated:()=>true}))
vi.mock('next/navigation',()=>({useRouter:()=>({push:state.push,refresh:vi.fn()})}))
afterEach(()=>{cleanup();vi.unstubAllGlobals();vi.clearAllMocks();state.language='fr'})

it('renders the map instructions in every supported interface language',()=>{
  for(const language of Object.keys(supplementalUiTranslations)){
    state.language=language
    const view=render(<MapLegend />)
    expect(screen.getByText(translations[language]['supplemental.mapLegend'])).toBeTruthy()
    expect(screen.getByText(translations[language]['supplemental.mapMarkersHelp'])).toBeTruthy()
    view.unmount()
  }
})

it('changes interface labels while prayer wording and names remain authentic',()=>{
  const prayer={id:'fixture',title:'Oración documentada',content:'Texto auténtico sin traducción automática.',saintName:'Carlo Acutis'}
  const view=render(<><MapLegend /><PrayersResults prayers={[prayer]} /></>)
  state.language='ja';view.rerender(<><MapLegend /><PrayersResults prayers={[prayer]} /></>)
  expect(screen.getByText(translations.ja['supplemental.mapLegend'])).toBeTruthy()
  expect(screen.getByText(prayer.title)).toBeTruthy()
  expect(screen.getByText(prayer.content)).toBeTruthy()
  expect(screen.getByText(prayer.saintName)).toBeTruthy()
})

it('localizes category labels while preserving original filter values and saint names',()=>{
  const original=PRAYER_CATEGORIES[0].title
  render(<PrayersSearch saints={['Carlo Acutis']} occasions={['Fiesta documentada']} categories={[original]} initialCategory={original} />)
  const category=screen.getByRole('combobox',{name:translations.fr['supplemental.category']}) as HTMLSelectElement
  expect(category.value).toBe(original)
  expect(screen.getByRole('option',{name:translations.fr['supplemental.prayerCategory.0.title']}).getAttribute('value')).toBe(original)
  expect(screen.getByRole('option',{name:'Carlo Acutis'})).toBeTruthy()
  fireEvent.click(screen.getByRole('button',{name:translations.fr['common.search']}))
  const route=new URL(state.push.mock.calls[0][0],'http://fixture.invalid')
  expect(route.searchParams.get('categoria')).toBe(original)
  expect(categoryKey(route.searchParams.get('categoria')||'')).toBe(categoryKey(original))
  fireEvent.click(screen.getByRole('button',{name:translations.fr['supplemental.clearPrayerSearch']}))
  expect(state.push).toHaveBeenLastCalledWith('/oraciones')
})

it('shows a localized outage and validates prayer creation before any write',async()=>{
  const fetcher=vi.fn(async()=>Response.json({error:'DATABASE_NOT_READY',detail:'private diagnostic'},{status:503}))
  vi.stubGlobal('fetch',fetcher)
  const alert=vi.fn();vi.stubGlobal('alert',alert)
  render(<AdminPrayersList />)
  expect((await screen.findByRole('alert')).textContent).toBe(translations.fr['catalog.temporarilyUnavailable'])
  expect(screen.queryByText(/private diagnostic|DATABASE_NOT_READY|0 prières/)).toBeNull()
  fireEvent.click(screen.getByRole('button',{name:translations.fr['supplemental.newPrayer']}))
  fireEvent.click(screen.getByRole('button',{name:translations.fr['supplemental.create']}))
  expect(alert).toHaveBeenCalledWith(translations.fr['supplemental.titleContentRequired'])
  expect(fetcher).toHaveBeenCalledTimes(1)
})

it('uses translated witness actions without rewriting the witness name',()=>{
  render(<MiracleForm onClose={vi.fn()} onSave={vi.fn()} />)
  fireEvent.change(screen.getByRole('textbox',{name:translations.fr['catalog.witnesses']}),{target:{value:'Carlo Acutis'}})
  fireEvent.click(screen.getByRole('button',{name:translations.fr['supplemental.addWitness']}))
  expect(screen.getByText('Carlo Acutis')).toBeTruthy()
  fireEvent.click(screen.getByRole('button',{name:'Retirer le témoin Carlo Acutis'}))
  expect(screen.queryByText('Carlo Acutis')).toBeNull()
})

it('localizes password visibility and signup help while retaining password limits',async()=>{
  render(<AuthModal isOpen onClose={vi.fn()} />)
  expect(screen.getByRole('button',{name:translations.fr['supplemental.closeAccess']})).toBeTruthy()
  const password=document.querySelector<HTMLInputElement>('#password')!
  expect(password.type).toBe('password')
  fireEvent.click(screen.getByRole('button',{name:translations.fr['supplemental.showPassword']}))
  expect(password.type).toBe('text')
  fireEvent.click(screen.getByRole('button',{name:translations.fr['supplemental.hidePassword']}))
  expect(password.type).toBe('password')
  fireEvent.click(screen.getByRole('button',{name:"S'inscrire"}))
  await waitFor(()=>expect(screen.getByText(translations.fr['supplemental.passwordHelp'])).toBeTruthy())
  expect(password.minLength).toBe(12)
  expect(password.maxLength).toBe(72)
})
