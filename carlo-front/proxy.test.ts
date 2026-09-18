import { afterEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { proxy } from './proxy'

afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs() })

describe('saint detail existence before streaming', () => {
  function request(path = '/santos/santa-felicidad', method = 'GET') {
    vi.stubEnv('BACKEND_URL', 'http://127.0.0.1:4197')
    return new NextRequest('http://127.0.0.1:3197' + path, { method, headers: { cookie: 'private-session-must-not-be-forwarded' } })
  }
  it('keeps a real saint and sends only a bounded public HEAD without private headers', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 200 }))
    vi.stubGlobal('fetch', fetcher)
    const response = await proxy(request())
    expect(response.headers.get('x-middleware-next')).toBe('1')
    expect(fetcher).toHaveBeenCalledTimes(1)
    const [url, init] = fetcher.mock.calls[0]
    expect(url).toBe('http://127.0.0.1:4197/saints/santa-felicidad')
    expect(init).toMatchObject({ method: 'HEAD', cache: 'no-store', redirect: 'manual' })
    expect(init?.signal).toBeInstanceOf(AbortSignal)
    expect(new Headers(init?.headers).has('cookie')).toBe(false)
    expect(new Headers(init?.headers).has('authorization')).toBe(false)
  })
  it('rewrites only a confirmed404 to the existing not-found UI with HTTP404', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 404 })))
    const incoming = request('/santos/missing?private=discard')
    const response = await proxy(incoming)
    expect(response.status).toBe(404)
    expect(response.headers.get('x-middleware-rewrite')).toBe(incoming.nextUrl.origin + '/_catalogue_not_found')
    expect(response.headers.get('cache-control')).toBe('no-store')
  })
  for (const status of [401, 429, 500, 503]) it(`does not mistake upstream${status} for a missing saint`, async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status })))
    expect((await proxy(request())).headers.get('x-middleware-next')).toBe('1')
  })
  it('preserves the normal error path on network failure, without automatic retries', async () => {
    const fetcher = vi.fn().mockRejectedValue(new Error('synthetic network error'))
    vi.stubGlobal('fetch', fetcher)
    expect((await proxy(request())).headers.get('x-middleware-next')).toBe('1')
    expect(fetcher).toHaveBeenCalledTimes(1)
  })
  for (const [path, method] of [['/santos', 'GET'], ['/santos/test', 'POST'], ['/santos/bad%ZZ', 'GET']]) {
    it(`does not probe unrelated/invalid requests: ${method} ${path}`, async () => {
      const fetcher = vi.fn();vi.stubGlobal('fetch', fetcher)
      await proxy(request(path, method));expect(fetcher).not.toHaveBeenCalled()
    })
  }
})
