// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { translations } from '@/lib/translations'
import { MiraclesList } from './miracles-list'

const state = vi.hoisted(() => ({language:'en', namesLoading:true, namesError:null as string|null, pageLoading:false, pageError:null as string|null}))
vi.mock('@/contexts/language-context', () => ({useLanguage:() => ({language:state.language,t:(key:string)=>translations[state.language]?.[key] || key})}))
vi.mock('@/lib/use-saint-names', () => ({useSaintNames:()=>({items:[], loading:state.namesLoading,error:state.namesError,retry:vi.fn()})}))
vi.mock('@/lib/use-miracle-page', () => ({useMiraclePage:()=>({page:{items:[],total:0,metadata:{approvedTotal:0,facets:{types:[]}},hasMore:false,hasPrevious:false},previousPage:null,loading:state.pageLoading,error:state.pageError,retry:vi.fn()})}))
afterEach(()=>{cleanup();state.language='en';state.namesLoading=true;state.namesError=null;state.pageLoading=false;state.pageError=null})

it('does not announce an empty catalogue while selector metadata is still loading',()=>{
  render(<MiraclesList />)
  expect(screen.queryByText('No se encontraron milagros')).toBeNull()
  expect(screen.queryByText(translations.en['catalog.miraclesEmpty'])).toBeNull()
  expect(screen.getByRole('status').textContent).toBe(translations.en['catalog.miraclesLoading'])
})

it('shows localized temporary unavailability without an empty-state claim or internal code',()=>{
  state.namesLoading=false;state.pageError='catalog.temporarilyUnavailable'
  render(<MiraclesList />)
  expect(screen.getByRole('alert').textContent).toContain(translations.en['catalog.temporarilyUnavailable'])
  expect(screen.getByRole('alert').textContent).not.toMatch(/catalog\.|CATALOG_|[a-f0-9]{8}-/)
  expect(screen.queryByText(translations.en['catalog.miraclesEmpty'])).toBeNull()
})

it('shows a real empty response only after both reads finish',()=>{
  state.namesLoading=false
  render(<MiraclesList />)
  expect(screen.getByText(translations.en['catalog.miraclesEmpty'])).toBeTruthy()
  expect(screen.queryByRole('alert')).toBeNull()
})
