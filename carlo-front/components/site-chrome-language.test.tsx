// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { LanguageProvider } from '@/contexts/language-context'
import { Header } from './header'
import NotFound from '@/app/not-found'
import { PopularityEstimate } from './popularity-estimate'
import { Footer } from './footer'
import { CatalogPagination } from './catalog-pagination'
import { SaintPagePagination } from './saint-page-pagination'
import { SaintsMapSidebar } from './saints-map-sidebar'

vi.mock('next/navigation',()=>({usePathname:()=>'/santos'}))
vi.mock('./language-selector',()=>({LanguageSelector:()=>null}))
beforeEach(()=>localStorage.setItem('language','en'))
afterEach(cleanup)

it('translates both navigation landmarks and the mobile menu controls without changing navigation',()=>{
  render(<LanguageProvider><Header /></LanguageProvider>)
  expect(screen.getByRole('navigation',{name:'Main navigation'})).toBeTruthy()
  const open=screen.getByRole('button',{name:'Open menu'})
  fireEvent.click(open)
  expect(screen.getByRole('navigation',{name:'Mobile navigation'})).toBeTruthy()
  expect(screen.getByRole('button',{name:'Close menu'}).getAttribute('aria-expanded')).toBe('true')
  fireEvent.keyDown(document,{key:'Escape'})
  expect(screen.queryByRole('navigation',{name:'Mobile navigation'})).toBeNull()
  expect(screen.getByRole('button',{name:'Open menu'}).getAttribute('aria-expanded')).toBe('false')
})

it('translates a missing deep route and retains the route back to the catalogue',()=>{
  render(<LanguageProvider><NotFound /></LanguageProvider>)
  expect(screen.getByRole('heading',{name:'Content not found'})).toBeTruthy()
  expect(screen.getByText('We could not find the page you requested.')).toBeTruthy()
  expect(screen.getByRole('link',{name:'Back to the saints catalogue'}).getAttribute('href')).toBe('/santos')
})

it('translates popularity feedback while preserving its model, method, date and score',()=>{
  const estimate={score:61,generatedAt:'2026-09-18T10:00:00Z',model:'public-model',methodologyVersion:'fixture-v1',inputHash:'a'.repeat(64)}
  render(<LanguageProvider><PopularityEstimate estimate={estimate}/><PopularityEstimate estimate={{...estimate,score:101}}/></LanguageProvider>)
  expect(screen.getByText('AI-estimated popularity: 61/100')).toBeTruthy()
  expect(screen.getByText('AI-estimated popularity: no estimate available')).toBeTruthy()
  expect(screen.getByText(/Model: public-model\. Method: fixture-v1\. Date: 2026-09-18\./)).toBeTruthy()
})

it('uses the selected language for footer branding and preserves the original Spanish name',()=>{
  render(<LanguageProvider><Footer/></LanguageProvider>)
  expect(screen.getByRole('link',{name:'Saints and Miracles'}).getAttribute('href')).toBe('/')
  act(()=>{localStorage.setItem('language','es');window.dispatchEvent(new Event('acutis-language'))})
  expect(screen.getByRole('link',{name:'Santos y Milagros'}).getAttribute('href')).toBe('/')
})

it('preserves miracle-account specificity in both pagination landmarks and their navigation',()=>{
  const onPage=vi.fn(),onCursor=vi.fn()
  const page={total:24,offset:0,items:Array.from({length:12},(_,id)=>({id})),hasMore:true,hasPrevious:false,nextCursor:'fixture-next',previousCursor:null}
  render(<LanguageProvider><CatalogPagination index={0} size={12} total={24} onPage={onPage} label="relatos de milagros"/><SaintPagePagination page={page} onCursor={onCursor} label="relatos de milagros"/></LanguageProvider>)
  expect(screen.getAllByRole('navigation',{name:'Pagination: miracle accounts'})).toHaveLength(2)
  const next=screen.getAllByRole('button',{name:'Next'})
  fireEvent.click(next[0]);fireEvent.click(next[1])
  expect(onPage).toHaveBeenCalledExactlyOnceWith(1)
  expect(onCursor).toHaveBeenCalledExactlyOnceWith('fixture-next')
  act(()=>{localStorage.setItem('language','es');window.dispatchEvent(new Event('acutis-language'))})
  expect(screen.getAllByRole('navigation',{name:'Paginación: relatos de milagros'})).toHaveLength(2)
})

it('retains the localized map landmark, original Spanish label and bounded page navigation',()=>{
  const saints=Array.from({length:21},(_,id)=>({id:String(id),slug:'fixture-'+id,name:'Synthetic '+id,birthCountryCode:'IT'}))
  render(<LanguageProvider><SaintsMapSidebar saints={saints} allSaints={saints}/></LanguageProvider>)
  expect(screen.getByRole('navigation',{name:'Pagination: saints on the map'})).toBeTruthy()
  expect(screen.getAllByRole('listitem')).toHaveLength(20)
  fireEvent.click(screen.getByRole('button',{name:'Next'}))
  expect(screen.getAllByRole('listitem')).toHaveLength(1)
  expect(screen.getByText('Synthetic 20')).toBeTruthy()
  expect(screen.queryByText('Synthetic 0')).toBeNull()
  act(()=>{localStorage.setItem('language','es');window.dispatchEvent(new Event('acutis-language'))})
  expect(screen.getByRole('navigation',{name:'Paginación: santos del mapa'})).toBeTruthy()
})
