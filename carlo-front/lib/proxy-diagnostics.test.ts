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
