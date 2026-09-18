import { publicRequest, publicJson } from "./public-request"

export const CATALOG_REQUEST_SIZE = 100
const MAX_COLLECTION_PAGES = 1000 // Safety guard, not a limit on the catalogue's total.

function pageUrl(url: string, cursor: string) {
  const parsed = new URL(url, "http://catalog.invalid")
  parsed.searchParams.set("limit", String(CATALOG_REQUEST_SIZE))
  parsed.searchParams.delete("cursor")
  if (cursor) parsed.searchParams.set("cursor", cursor)
  return /^https?:\/\//.test(url) ? parsed.href : parsed.pathname + parsed.search
}

/** Sequential, deduplicated reads. Never expose a plausible but partial catalogue. */
export async function fetchPublicCollection<T extends { id: string }>(
  url: string,
  options: RequestInit = {},
  fetcher: typeof fetch = fetch,
): Promise<T[]> {
  const rows = new Map<string, T>(), cursors = new Set<string>()
  let cursor = "", expectedTotal: number | undefined, revision: string | undefined
  for (let page = 0; page < MAX_COLLECTION_PAGES; page++) {
    const response = await publicRequest(pageUrl(url, cursor), options, fetcher)
    const body: unknown = await publicJson(response)
    const envelope = !Array.isArray(body) && body !== null && typeof body === "object" ? body as Record<string, unknown> : null
    const items = envelope ? envelope.items : body
    const totalHeader = response.headers.get("X-Total-Count")
    const total: unknown = envelope ? envelope.total : totalHeader === null ? undefined : /^\d+$/.test(totalHeader) ? Number(totalHeader) : NaN
    const next: unknown = envelope ? envelope.nextCursor : response.headers.get("X-Next-Cursor") || null
    const hasMore: unknown = envelope ? envelope.hasMore : Boolean(next)
    if (!Array.isArray(items) || items.length > CATALOG_REQUEST_SIZE || items.some(row => !row || typeof row !== "object" || typeof row.id !== "string" || !row.id))
      throw new Error("El catálogo recibido no es válido.")
    if ((total !== undefined && (!Number.isSafeInteger(total) || Number(total) < 0)) || (envelope && total === undefined) ||
        (next !== null && (typeof next !== "string" || !next)) || typeof hasMore !== "boolean" || hasMore !== Boolean(next))
      throw new Error("La paginación del catálogo no es válida.")
    if (typeof total === "number") {
      if (expectedTotal !== undefined && expectedTotal !== total) throw new Error("El catálogo cambió durante la consulta. Vuelve a intentarlo.")
      expectedTotal = total
    }
    if (envelope?.revision !== undefined) {
      if (typeof envelope.revision !== "string" || (revision !== undefined && revision !== envelope.revision))
        throw new Error("El catálogo cambió durante la consulta. Vuelve a intentarlo.")
      revision = envelope.revision
    }
    const previousSize = rows.size
    for (const row of items as T[]) if (!rows.has(row.id)) rows.set(row.id, row)
    if (expectedTotal !== undefined && rows.size > expectedTotal) throw new Error("El catálogo cambió durante la consulta. Vuelve a intentarlo.")
    if (!hasMore) {
      if (expectedTotal !== undefined && rows.size !== expectedTotal) throw new Error("No se pudo cargar el catálogo completo.")
      return [...rows.values()]
    }
    if (!items.length || rows.size === previousSize || (expectedTotal !== undefined && rows.size >= expectedTotal) || typeof next !== "string" || cursors.has(next))
      throw new Error("La paginación del catálogo no es válida.")
    cursors.add(next); cursor = next
  }
  throw new Error("El catálogo supera el límite de consulta.")
}

/** Statistics need one small page, not a second download of the whole collection. */
export async function fetchCollectionTotal(url: string, options: RequestInit = {}, fetcher: typeof fetch = fetch): Promise<number> {
  const parsed = new URL(url, "http://catalog.invalid")
  parsed.searchParams.set("limit", "1")
  const response = await publicRequest(/^https?:\/\//.test(url) ? parsed.href : parsed.pathname + parsed.search, options, fetcher)
  const body: unknown = await publicJson(response)
  const header = response.headers.get("X-Total-Count")
  const total = body && !Array.isArray(body) && typeof body === "object" && "total" in body ? body.total
    : header !== null && /^\d+$/.test(header) ? Number(header) : undefined
  if (typeof total !== "number" || !Number.isSafeInteger(total) || total < 0) throw new Error("No se pudo consultar el total del catálogo.")
  return total
}
