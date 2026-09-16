// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { AdminMiraclesStatsCard } from './admin-miracles-stats-card'
import { getMiraclesBySaintId } from '@/lib/admin-utils'

afterEach(() => { cleanup(); vi.unstubAllGlobals() })
it('counts every authenticated admin page including pending miracles', async () => {
  const fetcher=vi.fn(async (input: unknown, options: RequestInit) => {
    expect(String(input)).toMatch(/^\/api\/miracles\/all\?/)
    expect(options.credentials).toBe('include')
    if (String(input).includes('cursor=')) return Response.json([{id:'pending-fixture',approved:false}], {headers:{'X-Total-Count':'2'}})
    return Response.json([{id:'approved-fixture',approved:true}], {headers:{'X-Next-Cursor':'approved-fixture','X-Total-Count':'2'}})
  })
  vi.stubGlobal('fetch',fetcher)
  render(<AdminMiraclesStatsCard />)
  expect(await screen.findByText('1 verificados')).toBeTruthy()
  expect(screen.getByText('2')).toBeTruthy()
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
