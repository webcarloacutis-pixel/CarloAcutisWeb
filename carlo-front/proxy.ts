import { NextRequest, NextResponse } from 'next/server'
import { apiUrl } from './lib/api-url'
import { publicRequest } from './lib/public-request'
import { normalizeContentLocale } from './lib/content-locale'

/** Check existence before Suspense can commit HTTP200 for a missing detail. */
export async function proxy(request: NextRequest) {
  const locale = normalizeContentLocale(request.nextUrl.searchParams.get('lang') || request.cookies.get('acutis_locale')?.value)
  const forwarded = new Headers(request.headers)
  forwarded.set('x-acutis-locale', locale)
  const next = () => NextResponse.next({request:{headers:forwarded}})
  if (!['GET', 'HEAD'].includes(request.method)) return next()
  const match = /^\/santos\/([^/]+)\/?$/.exec(request.nextUrl.pathname)
  if (!match) return next()
  let slug: string
  try { slug = decodeURIComponent(match[1]) } catch { return next() }
  try {
    // A public, bodyless probe; no cookies/credentials, retries or readiness call.
    const response = await publicRequest(apiUrl('/saints/' + encodeURIComponent(slug)), {
      method: 'HEAD', cache: 'no-store', signal: AbortSignal.timeout(4_000),
    }, fetch, true)
    if (response.status === 404) {
      const missing = request.nextUrl.clone()
      missing.pathname = '/_catalogue_not_found'
      missing.search = ''
      const rewrite = NextResponse.rewrite(missing, { status: 404, request:{headers:forwarded} })
      rewrite.headers.set('Cache-Control', 'no-store')
      return rewrite
    }
  } catch {
    // An unavailable backend is not evidence of a nonexistent saint. The detail
    // keeps its existing bounded read and classified error UI/logs in that case.
  }
  return next()
}

export const config = { matcher: ['/((?!api|_next|.*\\..*).*)'] }
