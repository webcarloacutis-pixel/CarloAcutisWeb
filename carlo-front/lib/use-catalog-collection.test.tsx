// @vitest-environment jsdom
import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { useCatalogCollection } from './use-catalog-collection'
const reads = vi.hoisted(() => vi.fn())
vi.mock('./public-collection', () => ({ fetchPublicCollection: reads }))
afterEach(() => { cleanup(); reads.mockReset() })
function pending<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>(yes => { resolve = yes }); return { promise, resolve } }

it('hides an earlier resource and reports loading while a new resource is pending', async () => {
  const next = pending<{id:string}[]>()
  reads.mockResolvedValueOnce([{id:'old'}]).mockReturnValueOnce(next.promise)
  const view = renderHook(({url}) => useCatalogCollection<{id:string}>(url), {initialProps:{url:'/api/saints?view=map'}})
  await waitFor(() => expect(view.result.current.items).toEqual([{id:'old'}]))
  const oldSignal = reads.mock.calls[0][1].signal as AbortSignal
  view.rerender({url:'/api/other-resource'})
  expect(oldSignal.aborted).toBe(true)
  expect(view.result.current.items).toEqual([])
  expect(view.result.current.loading).toBe(true)
  await act(async () => next.resolve([{id:'fresh'}]))
  expect(view.result.current.items).toEqual([{id:'fresh'}])
  expect(view.result.current.loading).toBe(false)
})

it('does not present mutation-invalidated metadata as current or accept a late response', async () => {
  const late = pending<{id:string}[]>(), fresh = pending<{id:string}[]>()
  reads.mockReturnValueOnce(late.promise).mockReturnValueOnce(fresh.promise)
  const view = renderHook(() => useCatalogCollection<{id:string}>('/api/saints?view=map'))
  act(() => window.dispatchEvent(new Event('catalog:saints-changed')))
  await act(async () => { late.resolve([{id:'obsolete'}]); fresh.resolve([{id:'current'}]) })
  expect(view.result.current.items).toEqual([{id:'current'}])
  expect(reads).toHaveBeenCalledTimes(2)
})
