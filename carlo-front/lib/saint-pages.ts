import { publicRequest, publicJson, publicContractError } from "./public-request"
import { countryName, matchesContinent, normalizeText, type PublicSaint, type SaintFilters } from "./content-filters"
import type { PopularityEstimateData } from "./popularity-display"

export const SAINT_CARD_PAGE_SIZE = 12
export type SaintCard = PublicSaint & { biographyExcerpt?: string | null; createdAt: string; updatedAt: string; popularityEstimate: PopularityEstimateData | null }
export type SaintPage = {
  items: SaintCard[]; total: number; nextCursor: string | null; previousCursor: string | null;
  hasMore: boolean; hasPrevious: boolean; offset: number; revision: string;
  rankingMode: "ai-estimate" | "alphabetical-unrated";
  metadata: { facets: { countries: { code: string; continent: string | null }[] } };
}

export function saintPageUrl(filters: SaintFilters, cursor = "", size = SAINT_CARD_PAGE_SIZE) {
  const params = new URLSearchParams({ view: "cards", limit: String(size) })
  if (filters.query) params.set("q", filters.query.slice(0, 200))
  if (filters.continent) params.set("continent", filters.continent.slice(0, 200))
  if (filters.country) params.set("country", filters.country.slice(0, 200))
  if (filters.century) params.set("century", filters.century.slice(0, 200))
  if (cursor) params.set("cursor", cursor)
  return "/saints?" + params
}

function record(value: unknown): value is Record<string, unknown> { return value !== null && typeof value === "object" && !Array.isArray(value) }
function cursorValue(value: unknown): value is string | null { return value === null || typeof value === "string" && /^[\w-]{1,1024}$/.test(value) }
export function validateSaintPage(value: unknown, size: number, currentCursor: string): SaintPage {
  if (!record(value) || !Array.isArray(value.items) || value.items.length > size ||
      !Number.isSafeInteger(value.total) || Number(value.total) < 0 ||
      !Number.isSafeInteger(value.offset) || Number(value.offset) < 0 ||
      typeof value.revision !== "string" || !value.revision ||
      !cursorValue(value.nextCursor) || !cursorValue(value.previousCursor) ||
      typeof value.hasMore !== "boolean" || typeof value.hasPrevious !== "boolean" ||
      !["ai-estimate", "alphabetical-unrated"].includes(String(value.rankingMode))) throw new Error("La página del catálogo no es válida.")
  const ids = new Set<string>()
  for (const item of value.items) {
    if (!record(item) || typeof item.id !== "string" || !item.id || ids.has(item.id) || typeof item.name !== "string" || typeof item.slug !== "string") throw new Error("La página del catálogo contiene fichas inválidas o repetidas.")
    ids.add(item.id)
  }
  const end = Number(value.offset) + value.items.length
  if (end > Number(value.total) || value.hasMore !== Boolean(value.nextCursor) || value.hasMore !== (end < Number(value.total)) ||
      value.hasPrevious !== (Number(value.offset) > 0) || !value.hasPrevious && value.previousCursor !== null ||
      value.nextCursor === currentCursor || value.previousCursor !== null && value.previousCursor === currentCursor ||
      Number(value.total) > 0 && !value.items.length || !currentCursor && Number(value.offset) !== 0) throw new Error("La paginación del catálogo no es coherente.")
  if (!record(value.metadata) || !record(value.metadata.facets) || !Array.isArray(value.metadata.facets.countries) ||
      value.metadata.facets.countries.some(item => !record(item) || typeof item.code !== "string" || !/^[A-Z]{2}$/.test(item.code) || item.continent !== null && typeof item.continent !== "string")) throw new Error("Los filtros del catálogo no son válidos.")
  return value as SaintPage
}

export async function requestSaintPage(url: string, signal: AbortSignal, fetcher: typeof fetch = fetch): Promise<SaintPage> {
  const parsed = new URL(url, "http://catalog.invalid")
  const response = await publicRequest(url, { cache: "no-store", credentials: "include", signal }, fetcher)
  const body = await publicJson(response)
  try { return validateSaintPage(body, Number(parsed.searchParams.get("limit")), parsed.searchParams.get("cursor") || "") } catch { return publicContractError(response) }
}

/** Public pages only. Bounded cache; no private session or backend credential is stored. */
export function createSaintPageCache(maxPages = 24, lifetimeMs = 20_000) {
  const pages = new Map<string, { value: SaintPage; expires: number; scope: string }>()
  function scope(url: string) { const parsed = new URL(url, "http://catalog.invalid"); parsed.searchParams.delete("cursor"); return parsed.pathname + parsed.search }
  return {
    get(url: string, now = Date.now()) {
      const page = pages.get(url)
      if (!page || page.expires <= now) { pages.delete(url); return undefined }
      pages.delete(url); pages.set(url, page)
      return page.value
    },
    set(url: string, value: SaintPage, now = Date.now()) {
      const selected = scope(url)
      for (const [key, cached] of pages) {
        if (cached.scope !== selected) continue
        if (cached.value.revision !== value.revision) { pages.delete(key); continue }
        if (key !== url && cached.value.offset !== value.offset && cached.value.items.some(previous => value.items.some(item => item.id === previous.id))) throw new Error("El catálogo repitió fichas entre páginas. Vuelve a la primera página.")
      }
      pages.delete(url); pages.set(url, { value, expires: now + lifetimeMs, scope: selected })
      while (pages.size > maxPages) pages.delete(pages.keys().next().value!)
    },
    clear() { pages.clear() },
    get size() { return pages.size },
  }
}

export function saintFilterCountries(facets: SaintPage["metadata"]["facets"]["countries"], continent: string) {
  return [...new Set(facets.filter(item => matchesContinent(item.continent, continent)).map(item => item.code))]
    .map(code => ({ code, label: countryName(code) })).sort((a, b) => a.label.localeCompare(b.label, "es"))
}
export function canonicalFilterCountry(country: string, facets: SaintPage["metadata"]["facets"]["countries"]) {
  const match = facets.find(item => [normalizeText(item.code), normalizeText(countryName(item.code))].includes(normalizeText(country)))
  return match?.code || country
}
