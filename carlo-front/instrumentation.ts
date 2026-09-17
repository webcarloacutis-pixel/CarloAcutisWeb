import type { Instrumentation } from "next"

/** Link React's public digest to safe server diagnostics; never log request URLs/bodies. */
export const onRequestError: Instrumentation.onRequestError = async (error) => {
  const item = error as Error & { code?: unknown; requestId?: unknown; digest?: string }
  const permitted = new Set(["CATALOG_HTTP_ERROR", "CATALOG_TIMEOUT", "CATALOG_CANCELLED", "CATALOG_UNAVAILABLE"])
  const code = typeof item.code === "string" && permitted.has(item.code) ? item.code : "SERVER_RENDER_FAILED"
  const requestId = typeof item.requestId === "string" && /^[a-f0-9-]{36}$/i.test(item.requestId) ? item.requestId : null
  const digest = item.digest && /^[a-zA-Z0-9_-]{1,80}$/.test(item.digest) ? item.digest : null
  console.error("SERVER_RENDER", { requestId, stage: "SERVER_RENDER", code, digest })
}
