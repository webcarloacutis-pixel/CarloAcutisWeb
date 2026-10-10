import { afterEach, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from '@/app/api/[...path]/route'
import { backendOrigin } from './backend-origin'
afterEach(()=>{vi.restoreAllMocks();vi.unstubAllEnvs();vi.unstubAllGlobals()})
it('uses HTTPS for a public Render hostport and gives explicit BACKEND_URL precedence',()=>{
  vi.stubEnv('BACKEND_URL','');vi.stubEnv('BACKEND_HOSTPORT','acutis-api-staging.onrender.com')
  expect(backendOrigin()).toBe('https://acutis-api-staging.onrender.com')
  vi.stubEnv('BACKEND_URL','http://127.0.0.1:4100');expect(backendOrigin()).toBe('http://127.0.0.1:4100')
  vi.stubEnv('BACKEND_URL','http://acutis-api-staging.onrender.com');expect(()=>backendOrigin()).toThrow('HTTPS')
})
it.each([['auth','me',401],['saints','',502]] as const)('preserves upstream status for %s and logs correlation without secrets',async(first,second,status)=>{
  vi.stubEnv('BACKEND_URL','http://127.0.0.1:4100');const log=vi.spyOn(console,'info').mockImplementation(()=>{})
  vi.stubGlobal('fetch',vi.fn().mockResolvedValue(status===401?Response.json({error:'NOT_AUTHENTICATED'},{status}):new Response('private ingress html',{status,headers:{'content-type':'text/html'}})))
  const request=new NextRequest('https://example.invalid/api/'+first,{headers:{cookie:'private-session'}})
  const response=await GET(request,{params:Promise.resolve({path:second?[first,second]:[first]})})
  expect(response.status).toBe(status);expect(response.headers.get('X-Request-Id')).toMatch(/^[a-f0-9-]{36}$/)
  expect(await response.text()).not.toContain('private');expect(JSON.stringify(log.mock.calls)).not.toContain('private')
  expect(log.mock.calls[0][1]).toMatchObject({stage:'PROXY',httpStatus:status})
})
it('returns 503 for unreachable backend and passes the next recovered response with no automatic retries',async()=>{
  vi.stubEnv('BACKEND_URL','http://127.0.0.1:4100');vi.spyOn(console,'info').mockImplementation(()=>{})
  const fetcher=vi.fn().mockRejectedValueOnce(new Error('private error')).mockResolvedValueOnce(Response.json({ok:true}));vi.stubGlobal('fetch',fetcher)
  const request=()=>new NextRequest('https://example.invalid/api/ready'),context={params:Promise.resolve({path:['ready']})}
  expect((await GET(request(),context)).status).toBe(503);expect((await GET(request(),context)).status).toBe(200);expect(fetcher).toHaveBeenCalledTimes(2)
})

it.each(['application/json', 'text/html'])('preserves safe limit/correlation headers for a %s rejection', async contentType => {
  vi.stubEnv('BACKEND_URL', 'http://127.0.0.1:4100')
  vi.spyOn(console, 'info').mockImplementation(() => {})
  const requestId = '12345678-1234-1234-1234-123456789abc'
  const headers = {
    'content-type': contentType, 'retry-after': '60', 'ratelimit': 'limit=10, remaining=0, reset=60',
    'ratelimit-policy': '10;w=60', 'ratelimit-limit': '10', 'ratelimit-remaining': '0', 'ratelimit-reset': '60',
    'x-ratelimit-limit': '10', 'x-ratelimit-remaining': '0', 'x-ratelimit-reset': '60',
    'x-backend-revision': 'a'.repeat(40), 'x-request-id': requestId,
    'set-cookie': 'fixture_cookie=expired; Max-Age=0; HttpOnly; Secure; SameSite=Lax',
    'authorization': 'fixture-sensitive', 'x-admin-key': 'fixture-sensitive',
    'x-debug-connection': 'fixture-sensitive', 'connection': 'keep-alive', 'keep-alive': 'timeout=5',
    'transfer-encoding': 'chunked', 'content-length': '999',
  }
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(contentType === 'application/json' ? '{"error":"RATE_LIMITED"}' : '<h1>fixture-sensitive</h1>', { status: 429, headers })))
  const response = await GET(new NextRequest('https://example.invalid/api/saints', { headers: { 'x-request-id': requestId } }), { params: Promise.resolve({ path: ['saints'] }) })
  expect(response.status).toBe(429)
  for (const key of ['retry-after', 'ratelimit', 'ratelimit-policy', 'ratelimit-limit', 'ratelimit-remaining', 'ratelimit-reset', 'x-ratelimit-limit', 'x-ratelimit-remaining', 'x-ratelimit-reset', 'x-backend-revision', 'x-request-id', 'set-cookie']) {
    expect(response.headers.get(key), key).toBe(headers[key as keyof typeof headers])
  }
  for (const key of ['authorization', 'x-admin-key', 'x-debug-connection', 'connection', 'keep-alive', 'transfer-encoding', 'content-length']) expect(response.headers.has(key), key).toBe(false)
  expect(response.headers.get('content-type')).toContain('application/json')
  expect(response.headers.get('cache-control')).toBe('private, no-store')
  expect(await response.text()).not.toContain('fixture-sensitive')
})

it('does not forward a normally allowed header nominated by Connection', async () => {
  vi.stubEnv('BACKEND_URL', 'http://127.0.0.1:4100')
  vi.spyOn(console, 'info').mockImplementation(() => {})
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ error: 'RATE_LIMITED' }, { status: 429,
    headers: { 'connection': 'X-RateLimit-Limit', 'x-ratelimit-limit': '10', 'retry-after': '60' } })))
  const response = await GET(new NextRequest('https://example.invalid/api/saints'), { params: Promise.resolve({ path: ['saints'] }) })
  expect(response.headers.has('x-ratelimit-limit')).toBe(false)
  expect(response.headers.get('retry-after')).toBe('60')
})
