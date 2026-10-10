// @vitest-environment jsdom
import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'

vi.mock('./api-url', () => ({ apiUrl: (path: string) => '/api' + path }))
const request = vi.hoisted(() => ({ fetch: vi.fn() }))
vi.mock('./public-collection', () => ({ fetchPublicCollection: request.fetch }))
afterEach(() => { cleanup(); vi.resetModules(); request.fetch.mockReset() })
function deferred<T>() { let resolve!: (value: T) => void, reject!: (error: Error) => void; const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no }); return { promise, resolve, reject } }
const rows = [{ id: 'fixture-saint', name: 'Fixture saint', slug: 'fixture-saint' }]

it('shares one in-flight public read and keeps it alive until the final consumer leaves', async () => {
  const pending = deferred<typeof rows>()
  request.fetch.mockReturnValue(pending.promise)
  const { useSaintNames } = await import('./use-saint-names')
  const first = renderHook(() => useSaintNames()), second = renderHook(() => useSaintNames())
  expect(request.fetch).toHaveBeenCalledTimes(1)
  const signal = request.fetch.mock.calls[0][1].signal as AbortSignal
  first.unmount()
  expect(signal.aborted).toBe(false)
  await act(async () => pending.resolve(rows))
  await waitFor(() => expect(second.result.current.items).toEqual(rows))
  expect(second.result.current.loading).toBe(false)
  second.unmount()
})

it('aborts abandoned work and never lets a stale response repopulate the cache', async () => {
  const old = deferred<typeof rows>(), fresh = deferred<typeof rows>()
  request.fetch.mockReturnValueOnce(old.promise).mockReturnValueOnce(fresh.promise)
  const { useSaintNames } = await import('./use-saint-names')
  const first = renderHook(() => useSaintNames())
  const signal = request.fetch.mock.calls[0][1].signal as AbortSignal
  first.unmount()
  expect(signal.aborted).toBe(true)
  const second = renderHook(() => useSaintNames())
  await act(async () => { old.resolve([{ ...rows[0], name: 'Obsolete' }]); fresh.resolve(rows) })
  await waitFor(() => expect(second.result.current.items).toEqual(rows))
  const cached = renderHook(() => useSaintNames())
  expect(cached.result.current.items).toEqual(rows)
  expect(request.fetch).toHaveBeenCalledTimes(2)
})

it('invalidates all subscribers once on catalog mutation and cancels the older generation', async () => {
  const old = deferred<typeof rows>(), fresh = deferred<typeof rows>()
  request.fetch.mockReturnValueOnce(old.promise).mockReturnValueOnce(fresh.promise)
  const { useSaintNames } = await import('./use-saint-names')
  const first = renderHook(() => useSaintNames()), second = renderHook(() => useSaintNames())
  const signal = request.fetch.mock.calls[0][1].signal as AbortSignal
  act(() => window.dispatchEvent(new Event('catalog:saints-changed')))
  expect(signal.aborted).toBe(true)
  expect(request.fetch).toHaveBeenCalledTimes(2)
  await act(async () => { fresh.resolve(rows); old.resolve([{ ...rows[0], name: 'Obsolete' }]) })
  await waitFor(() => expect(first.result.current.items).toEqual(rows))
  expect(second.result.current.items).toEqual(rows)
})

it('stops after failure and explicit retry updates every mounted consumer', async () => {
  request.fetch.mockRejectedValueOnce(new Error('fixture private error')).mockResolvedValueOnce(rows)
  const { useSaintNames } = await import('./use-saint-names')
  const first = renderHook(() => useSaintNames()), second = renderHook(() => useSaintNames())
  await waitFor(() => expect(first.result.current.error).toBeTruthy())
  expect(second.result.current.error).toBeTruthy()
  expect(first.result.current.loading).toBe(false)
  expect(request.fetch).toHaveBeenCalledTimes(1)
  act(() => first.result.current.retry())
  await waitFor(() => expect(first.result.current.items).toEqual(rows))
  expect(second.result.current.items).toEqual(rows)
  expect(request.fetch).toHaveBeenCalledTimes(2)
})

it('does not reuse options after all consumers leave and a catalog mutation occurs elsewhere', async () => {
  const fresh = [{ ...rows[0], name: 'Updated fixture' }]
  request.fetch.mockResolvedValueOnce(rows).mockResolvedValueOnce(fresh)
  const { useSaintNames } = await import('./use-saint-names')
  const first = renderHook(() => useSaintNames())
  await waitFor(() => expect(first.result.current.items).toEqual(rows))
  first.unmount()
  act(() => window.dispatchEvent(new Event('catalog:saints-changed')))
  expect(request.fetch).toHaveBeenCalledTimes(1)
  const next = renderHook(() => useSaintNames())
  await waitFor(() => expect(next.result.current.items).toEqual(fresh))
  expect(request.fetch).toHaveBeenCalledTimes(2)
})
