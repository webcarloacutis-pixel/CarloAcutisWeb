const responseContext = new WeakMap<Response, { requestId: string; started: number }>()

export const PUBLIC_READ_TIMEOUT_MS = 35_000
export class PublicReadError extends Error {
  constructor(readonly code: string, readonly requestId: string, readonly status = 0) {
    super("No se pudo cargar el catálogo completo. Vuelve a intentarlo.")
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
    if (!response.ok && !(allowNotFound && response.status === 404)) { code = "CATALOG_HTTP_ERROR"; throw new PublicReadError(code, requestId, status) }
    responseContext.set(response, { requestId, started })
    return response
  } catch (error) {
    if (error instanceof PublicReadError) throw error
    const deadlineExpired = options.signal?.aborted && options.signal.reason instanceof DOMException && options.signal.reason.name === "TimeoutError"
    code = timeout.aborted || deadlineExpired ? "CATALOG_TIMEOUT" : options.signal?.aborted ? "CATALOG_CANCELLED" : "CATALOG_UNAVAILABLE"
    throw new PublicReadError(code, requestId)
  } finally {
    if (typeof window === "undefined") console.info("PUBLIC_READ", { requestId, stage: "SERVER_READ", code, httpStatus: status, durationMs: Math.round(performance.now() - started) })
  }
}

/** Safe UI classification. Upstream bodies and exception messages stay out of visitor-facing text. */
export function catalogErrorKey(error: unknown): string {
  if (error instanceof PublicReadError) {
    if (error.status === 429) return 'catalog.rateLimited'
    if (error.status === 401 || error.status === 403) return 'catalog.accessDenied'
    if (error.status >= 500 || ['CATALOG_TIMEOUT', 'CATALOG_UNAVAILABLE'].includes(error.code)) return 'catalog.temporarilyUnavailable'
  }
  return 'catalog.failed'
}

/** Do not log parse errors/bodies: provider responses may contain private information. */
export function publicContractError(response: Response, code: "CATALOG_JSON_INVALID" | "CATALOG_CONTRACT_INVALID" = "CATALOG_CONTRACT_INVALID"): never {
  const context = responseContext.get(response) ?? { requestId: crypto.randomUUID(), started: performance.now() }
  if (typeof window === "undefined") console.error("PUBLIC_READ", { requestId: context.requestId, stage: "DECODE", code,
    httpStatus: response.status, durationMs: Math.round(performance.now() - context.started) })
  throw new PublicReadError(code, context.requestId)
}

export async function publicJson(response: Response): Promise<unknown> {
  try { return await response.json() } catch { return publicContractError(response, "CATALOG_JSON_INVALID") }
}
