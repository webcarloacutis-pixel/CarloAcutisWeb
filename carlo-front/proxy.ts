import { NextRequest, NextResponse } from 'next/server'
import { apiUrl } from './lib/api-url'
import { publicRequest } from './lib/public-request'

/** Check existence before Suspense can commit HTTP200 for a missing detail. */
export async function proxy(request: NextRequest) {
  if (!['GET', 'HEAD'].includes(request.method)) return NextResponse.next()
  const match = /^\/santos\/([^/]+)\/?$/.exec(request.nextUrl.pathname)
  if (!match) return NextResponse.next()
  let slug: string
  try { slug = decodeURIComponent(match[1]) } catch { return NextResponse.next() }
  try {
    // A public, bodyless probe; no cookies/credentials, retries or readiness call.
    const response = await publicRequest(apiUrl('/saints/' + encodeURIComponent(slug)), {
      method: 'HEAD', cache: 'no-store', signal: AbortSignal.timeout(4_000),
    }, fetch, true)
    if (response.status === 404) {
      const missing = request.nextUrl.clone()
      missing.pathname = '/_catalogue_not_found'
      missing.search = ''
      const rewrite = NextResponse.rewrite(missing, { status: 404 })
      rewrite.headers.set('Cache-Control', 'no-store')
      return rewrite
    }
  } catch {
    // An unavailable backend is not evidence of a nonexistent saint. The detail
    // keeps its existing bounded read and classified error UI/logs in that case.
  }
  return NextResponse.next()
}

export const config = { matcher: '/santos/:slug' }
