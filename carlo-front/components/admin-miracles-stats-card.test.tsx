// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { AdminMiraclesStatsCard } from './admin-miracles-stats-card'
import { getMiraclesBySaintId } from '@/lib/admin-utils'

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
  render(<AdminMiraclesStatsCard />)
  expect(await screen.findByText('2900 verificados')).toBeTruthy()
  expect(screen.getByText('3000')).toBeTruthy()
  expect(fetcher).toHaveBeenCalledTimes(2)
})
it('reports an unauthorized admin response as an error', async () => {
  vi.stubGlobal('fetch',vi.fn(async () => Response.json({error:'UNAUTHORIZED'},{status:401})))
  render(<AdminMiraclesStatsCard />)
  expect(await screen.findByText(/Error:/)).toBeTruthy()
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
