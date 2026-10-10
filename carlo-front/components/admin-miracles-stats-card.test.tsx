// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { AdminMiraclesStatsCard } from './admin-miracles-stats-card'
import { getMiraclesBySaintId } from '@/lib/admin-utils'
import { LanguageProvider } from '@/contexts/language-context'
import { translations } from '@/lib/translations'

beforeEach(()=>localStorage.setItem('language','es'))
afterEach(() => { cleanup(); vi.unstubAllGlobals() })
it('counts 3000 authenticated records and public approvals with two one-row requests', async () => {
  const fetcher=vi.fn(async (input: unknown, options: RequestInit) => {
    const url = new URL(String(input), 'http://fixture.invalid')
    expect(url.searchParams.get('limit')).toBe('1')
    expect(options.credentials).toBe('include')
    if (url.pathname === '/api/miracles/all') return Response.json({items:[{id:'pending-fixture',approved:false}],total:3000,nextCursor:'next',hasMore:true})
    expect(url.pathname).toBe('/api/miracles')
    return Response.json({items:[{id:'approved-fixture',approved:true}],total:2900,nextCursor:'next',hasMore:true})
  })
  vi.stubGlobal('fetch',fetcher)
  render(<LanguageProvider><AdminMiraclesStatsCard /></LanguageProvider>)
  expect(await screen.findByText('2900 aprobados en el catálogo')).toBeTruthy()
  expect(screen.getByText('3000')).toBeTruthy()
  expect(fetcher).toHaveBeenCalledTimes(2)
})
it.each([[401,'catalog.accessDenied'],[503,'catalog.temporarilyUnavailable']] as const)('distinguishes an admin rejection with status %i without presenting an empty total', async (status,key) => {
  const fetcher=vi.fn(async () => Response.json({error:'private diagnostic'},{status}))
  vi.stubGlobal('fetch',fetcher)
  render(<LanguageProvider><AdminMiraclesStatsCard /></LanguageProvider>)
  const alert=await screen.findByRole('alert')
  expect(alert.textContent).toBe(translations.es[key])
  expect(screen.queryByText('0')).toBeNull()
  expect(screen.queryByText('0 aprobados en el catálogo')).toBeNull()
  expect(screen.queryByText(/private diagnostic/)).toBeNull()
  expect(fetcher).toHaveBeenCalledTimes(2)
})
it('loads pending saint miracles only from the authenticated admin endpoint', async () => {
  const fetcher=vi.fn(async (input:unknown, options:RequestInit) => {
    expect(String(input)).toMatch(/^\/api\/saints\/fixture-saint\/miracles\/all\?/)
    expect(options.credentials).toBe('include')
    return Response.json([{id:'pending-fixture',saintId:'fixture-saint',title:'Pending fixture',approved:false}])
  })
  vi.stubGlobal('fetch',fetcher)
  expect(await getMiraclesBySaintId('fixture-saint')).toMatchObject([{id:'pending-fixture',verified:false}])
})
