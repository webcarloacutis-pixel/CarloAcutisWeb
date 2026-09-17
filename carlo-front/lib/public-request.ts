export const PUBLIC_READ_TIMEOUT_MS = 35_000
export class PublicReadError extends Error {
  constructor(readonly code: string, readonly requestId: string) {
    super("No se pudo cargar el catálogo completo. " + code + " " + requestId)
  }
}
/** Bounded public reads. No user/session/provider dependency and no automatic retry. */
export async function publicRequest(url: string, options: RequestInit = {}, fetcher: typeof fetch = fetch, allowNotFound = false) {
  const requestId = crypto.randomUUID(), started = performance.now()
  const headers = new Headers(options.headers)
  headers.set("X-Request-Id", requestId)
  const timeout = AbortSignal.timeout(PUBLIC_READ_TIMEOUT_MS)
  let code = "OK", status = 0
  try {
    const response = await fetcher(url, { ...options, headers, redirect: "manual", signal: options.signal ? AbortSignal.any([options.signal, timeout]) : timeout })
    status = response.status
    if (!response.ok && !(allowNotFound && response.status === 404)) { code = "CATALOG_HTTP_ERROR"; throw new PublicReadError(code, requestId) }
    return response
  } catch (error) {
    if (error instanceof PublicReadError) throw error
    code = timeout.aborted ? "CATALOG_TIMEOUT" : options.signal?.aborted ? "CATALOG_CANCELLED" : "CATALOG_UNAVAILABLE"
    throw new PublicReadError(code, requestId)
  } finally {
    if (typeof window === "undefined") console.info("PUBLIC_READ", { requestId, stage: "SERVER_READ", code, httpStatus: status, durationMs: Math.round(performance.now() - started) })
  }
}
