import { forwardedClientAddress } from "@/lib/forwarded-client-address"
import { backendOrigin } from "@/lib/backend-origin"
import { NextRequest } from 'next/server'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
const allowed = new Set(['saints','prayers','miracles','auth','conversations','ai','discover-saint','descubrir-saint','health','ready','popularity'])
const privateHeaders = { 'Cache-Control': 'private, no-store' }
async function proxy(request: NextRequest, context: { params: Promise<{path: string[]}> }) {
  const { path } = await context.params
  if (!allowed.has(path[0]) || path.some(segment => !segment || segment === '.' || segment === '..' || /[\/\\]/.test(segment)) || request.nextUrl.search.length > 2048) return Response.json({error:'Invalid API path'}, {status:404,headers:privateHeaders})
  let target: URL
  try {
    target = new URL(backendOrigin())
    if (!['http:', 'https:'].includes(target.protocol) || target.username || target.password || target.pathname !== '/') throw new Error()
    target.pathname = '/' + path.map(encodeURIComponent).join('/')
    target.search = request.nextUrl.search
  } catch { return Response.json({error:'Service unavailable'}, {status:503,headers:privateHeaders}) }
  const headers = new Headers()
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
  try {
    const upstream=await fetch(target,{method:request.method,headers,body:body as BodyInit,cache:'no-store',redirect:'manual',signal:AbortSignal.any([request.signal,AbortSignal.timeout(35000)])})
    const out=new Headers()
    for(const key of ['content-type','cache-control','x-total-count','x-next-cursor','retry-after','vary']) { const value=upstream.headers.get(key); if(value)out.set(key,value) }
    for(const cookie of upstream.headers.getSetCookie()) out.append('set-cookie',cookie)
    if(['auth','conversations','ai'].includes(path[0]) || !['GET','HEAD'].includes(request.method)) out.set('cache-control','private, no-store')
    return new Response(upstream.body,{status:upstream.status,headers:out})
  } catch { return Response.json({error:'Service unavailable'},{status:503,headers:privateHeaders}) }
}
export { proxy as GET, proxy as POST, proxy as PATCH, proxy as PUT, proxy as DELETE, proxy as HEAD }
