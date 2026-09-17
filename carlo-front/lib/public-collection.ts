import { publicRequest } from "./public-request"
/** Read every page before filtering; failures never become a plausible partial catalogue. */
export async function fetchPublicCollection<T extends { id: string }>(
  url: string,
  options: RequestInit = {},
  fetcher: typeof fetch = fetch,
): Promise<T[]> {
  const rows: T[] = []
  const ids = new Set<string>(), cursors = new Set<string>()
  let cursor = ""
  for (let page = 0; page < 1000; page++) {
    const separator = url.includes("?") ? "&" : "?"
    const response = await publicRequest(url + separator + new URLSearchParams({ limit: "100", ...(cursor ? { cursor } : {}) }), options, fetcher)
    const data: unknown = await response.json()
    if (!Array.isArray(data) || data.some((row) => !row || typeof row !== "object" || typeof row.id !== "string")) {
      throw new Error("El catálogo recibido no es válido.")
    }
    for (const row of data as T[]) {
      if (ids.has(row.id)) throw new Error("El catálogo cambió durante la consulta. Vuelve a intentarlo.")
      ids.add(row.id); rows.push(row)
    }
    const next = response.headers.get("X-Next-Cursor") || ""
    if (!next) {
      const total = response.headers.get("X-Total-Count")
      if (total !== null && (!/^\d+$/.test(total) || Number(total) !== rows.length)) {
        throw new Error("No se pudo cargar el catálogo completo.")
      }
      return rows
    }
    if (!data.length || cursors.has(next)) throw new Error("La paginación del catálogo no es válida.")
    cursors.add(next); cursor = next
  }
  throw new Error("El catálogo supera el límite de consulta.")
}
