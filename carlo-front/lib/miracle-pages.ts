import { publicRequest, publicJson, publicContractError } from "./public-request"

export type MiracleCard = {
  id: string; saintId: string; title: string; details: string | null; type: string | null;
  date: string | null; location: string | null; witnesses: string | null; approved: boolean;
  createdAt: string; updatedAt: string; saintName: string; saintSlug: string;
}
export type MiraclePage = {
  items: MiracleCard[]; total: number; nextCursor: string | null; previousCursor: string | null;
  hasMore: boolean; hasPrevious: boolean; offset: number; revision: string;
  metadata: { facets: { types: string[] }; approvedTotal: number };
}
export type MiracleFilters = { query: string; saintId?: string; type?: string; approved?: boolean }
export function miraclePageUrl(path: string, filters: MiracleFilters, cursor: string | null = null) {
  const query = new URLSearchParams({ view: "cards", limit: "12" })
  if (filters.query) query.set("q", filters.query.slice(0, 200))
  if (filters.saintId) query.set("saintId", filters.saintId)
  if (filters.type) query.set("type", filters.type)
  if (filters.approved !== undefined) query.set("approved", String(filters.approved))
  if (cursor) query.set("cursor", cursor)
  return path + "?" + query
}
function record(value: unknown): value is Record<string, unknown> { return value !== null && typeof value === "object" && !Array.isArray(value) }
function cursorValue(value: unknown): value is string | null { return value === null || typeof value === "string" && /^[\w-]{1,1024}$/.test(value) }
export function validateMiraclePage(value: unknown, currentCursor: string): MiraclePage {
  if (!record(value) || !Array.isArray(value.items) || value.items.length > 12 ||
      !Number.isSafeInteger(value.total) || Number(value.total) < 0 || !Number.isSafeInteger(value.offset) || Number(value.offset) < 0 ||
      typeof value.revision !== "string" || !value.revision || !cursorValue(value.nextCursor) || !cursorValue(value.previousCursor) ||
      typeof value.hasMore !== "boolean" || typeof value.hasPrevious !== "boolean") throw new Error("La página de milagros no es válida.")
  const ids = new Set<string>()
  for (const item of value.items) {
    if (!record(item) || typeof item.id !== "string" || !item.id || ids.has(item.id) || typeof item.saintId !== "string" || typeof item.title !== "string" ||
        typeof item.approved !== "boolean" || typeof item.saintName !== "string" || typeof item.saintSlug !== "string") throw new Error("La página de milagros contiene registros inválidos o repetidos.")
    ids.add(item.id)
  }
  const end = Number(value.offset) + value.items.length
  if (end > Number(value.total) || value.hasMore !== Boolean(value.nextCursor) || value.hasMore !== (end < Number(value.total)) ||
      value.hasPrevious !== (Number(value.offset) > 0) || !value.hasPrevious && value.previousCursor !== null ||
      value.nextCursor === currentCursor || value.previousCursor !== null && value.previousCursor === currentCursor ||
      Number(value.total) > 0 && !value.items.length || !currentCursor && Number(value.offset) !== 0) throw new Error("La paginación de milagros no es coherente.")
  if (!record(value.metadata) || !record(value.metadata.facets) || !Array.isArray(value.metadata.facets.types) ||
      value.metadata.facets.types.some(type => typeof type !== "string") || !Number.isSafeInteger(value.metadata.approvedTotal) ||
      Number(value.metadata.approvedTotal) < 0 || Number(value.metadata.approvedTotal) > Number(value.total)) throw new Error("Los filtros de milagros no son válidos.")
  return value as MiraclePage
}
export async function requestMiraclePage(url: string, signal: AbortSignal, fetcher: typeof fetch = fetch) {
  const response = await publicRequest(url, { cache: "no-store", credentials: "include", signal }, fetcher)
  const body = await publicJson(response)
  try { return validateMiraclePage(body, new URL(url, "http://catalog.invalid").searchParams.get("cursor") || "") } catch { return publicContractError(response) }
}
