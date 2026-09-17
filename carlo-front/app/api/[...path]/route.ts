import { forwardedClientAddress } from "@/lib/forwarded-client-address"
import { backendOrigin } from "@/lib/backend-origin"
import { NextRequest } from 'next/server'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
const allowed = new Set(['saints','prayers','miracles','auth','conversations','ai','discover-saint','descubrir-saint','health','ready','popularity'])
const privateHeaders = { 'Cache-Control': 'private, no-store' }
async function proxy(request: NextRequest, context: { params: Promise<{path: string[]}> }) {
  const { path } = await context.params
  const ai=path[0]==='ai'
  const supplied=request.headers.get('x-request-id')
  const requestId=supplied && /^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i.test(supplied)?supplied:crypto.randomUUID()
  const started=performance.now()
  function log(code: string, httpStatus: number) {
    console.info('API_PROXY', {requestId, stage:'PROXY', code, httpStatus, durationMs:Math.round(performance.now()-started)})
  }
  function unavailable(code:'CONFIGURATION_MISSING'|'UPSTREAM_UNAVAILABLE'|'UPSTREAM_TIMEOUT'|'REQUEST_CANCELLED', status=503) {
    log(code,status)
    const aiCode=code==='CONFIGURATION_MISSING'?'AI_CONFIGURATION_MISSING':code==='UPSTREAM_TIMEOUT'?'AI_TIMEOUT':'AI_UPSTREAM_UNAVAILABLE'
    return Response.json({error:ai?aiCode:code,requestId},{status,headers:{...privateHeaders,'X-Request-Id':requestId}})
  }
  if (!allowed.has(path[0]) || path.some(segment => !segment || segment === '.' || segment === '..' || /[\/\\]/.test(segment)) || request.nextUrl.search.length > 2048) return Response.json({error:'Invalid API path'}, {status:404,headers:privateHeaders})
  let target: URL
  try {
    target = new URL(backendOrigin())
    if (!['http:', 'https:'].includes(target.protocol) || target.username || target.password || target.pathname !== '/') throw new Error()
    target.pathname = '/' + path.map(encodeURIComponent).join('/')
    target.search = request.nextUrl.search
  } catch { return unavailable('CONFIGURATION_MISSING') }
  const headers = new Headers()
  headers.set('x-request-id',requestId)
  for (const key of ['accept','content-type','cookie','origin']) {
    const value=request.headers.get(key); if(value) headers.set(key,value)
  }
  // Enable only behind an ingress that appends the actual client address.
  const address = forwardedClientAddress(request.headers.get('x-forwarded-for'), process.env.FORWARD_TRUSTED_IP)
  if (address) headers.set('x-forwarded-for', address)
  let body: Uint8Array | undefined
  if (!['GET','HEAD'].includes(request.method) && request.body) {
    const reader=request.body.getReader(); const chunks: Uint8Array[]=[]; let size=0
    while(true) {
      const item=await reader.read(); if(item.done) break
      size+=item.value.length
      if(size>65536) { await reader.cancel(); return Response.json({error:'Request too large'},{status:413,headers:privateHeaders}) }
      chunks.push(item.value)
    }
    body=new Uint8Array(size); let offset=0
    for(const chunk of chunks){body.set(chunk,offset);offset+=chunk.length}
  }
  const timeout=AbortSignal.timeout(35000)
  try {
    const upstream=await fetch(target,{method:request.method,headers,body:body as BodyInit,cache:'no-store',redirect:'manual',signal:AbortSignal.any([request.signal,timeout])})
    const out=new Headers()
    for(const key of ['content-type','cache-control','x-total-count','x-next-cursor','retry-after','vary','x-request-id','x-backend-revision']) { const value=upstream.headers.get(key); if(value)out.set(key,value) }
    for(const cookie of upstream.headers.getSetCookie()) out.append('set-cookie',cookie)
    if(['auth','conversations','ai'].includes(path[0]) || !['GET','HEAD'].includes(request.method)) out.set('cache-control','private, no-store')
    out.set('X-Request-Id',requestId)
    log(upstream.ok?'OK':upstream.status<500?'UPSTREAM_REJECTED':'UPSTREAM_HTTP_ERROR',upstream.status)
    // Ingress HTML errors are not provider responses. Preserve status and hide the HTML.
    if(upstream.status>=400 && !upstream.headers.get('content-type')?.includes('application/json')) {
      await upstream.body?.cancel()
      return Response.json({error:ai?'AI_UPSTREAM_UNAVAILABLE':'UPSTREAM_HTTP_ERROR',requestId},{status:upstream.status,headers:{...privateHeaders,'X-Request-Id':requestId}})
    }
    return new Response(upstream.body,{status:upstream.status,headers:out})
  } catch { return request.signal.aborted ? unavailable('REQUEST_CANCELLED',499) : timeout.aborted ? unavailable('UPSTREAM_TIMEOUT',504) : unavailable('UPSTREAM_UNAVAILABLE') }
}
export { proxy as GET, proxy as POST, proxy as PATCH, proxy as PUT, proxy as DELETE, proxy as HEAD }
