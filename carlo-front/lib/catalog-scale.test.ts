import { afterEach, describe, expect, it, vi } from "vitest"
import { fetchCollectionTotal, fetchPublicCollection } from "./public-collection"
import { filterSaints, groupBirthLocations, type PublicSaint } from "./content-filters"

afterEach(() => vi.restoreAllMocks())
const response = (items: { id: string }[], total: number, nextCursor: string | null, revision = "fixture") => new Response(JSON.stringify({ items, total, nextCursor, hasMore: Boolean(nextCursor), revision }))

describe("complete catalogue reads at scale", () => {
  for (const count of [0, 7, 79, 100, 101, 179, 1000, 2999, 3000, 3001]) it(`${count} existing records: sequential pages of 100 and no duplicate IDs`, async () => {
    vi.spyOn(console, "info").mockImplementation(() => {})
    let active = 0, peak = 0
    const requests = new Set<string>()
    const fetcher = vi.fn(async (input: string | URL | Request) => {
      const url = new URL(String(input), "http://fixture.invalid")
      expect(url.searchParams.getAll("limit")).toEqual(["100"])
      expect(url.searchParams.get("view")).toBe("names")
      expect(requests.has(url.href)).toBe(false); requests.add(url.href)
      const offset = Number(url.searchParams.get("cursor") || "0")
      active++; peak = Math.max(peak, active)
      await Promise.resolve()
      const items = Array.from({ length: Math.min(100, count - offset) }, (_, index) => ({ id: String(offset + index) }))
      active--
      return response(items, count, offset + items.length < count ? String(offset + items.length) : null)
    })
    const rows = await fetchPublicCollection("/api/saints?view=names&limit=999", {}, fetcher)
    expect(rows).toHaveLength(count); expect(new Set(rows.map(row => row.id)).size).toBe(count)
    expect(fetcher).toHaveBeenCalledTimes(Math.max(1, Math.ceil(count / 100)))
    expect(peak).toBe(1)
  })

  it("deduplicates overlapping IDs without dropping later records", async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(response([{ id: "1" }, { id: "2" }], 3, "next"))
      .mockResolvedValueOnce(response([{ id: "2" }, { id: "3" }], 3, null))
    expect(await fetchPublicCollection("/api/miracles", {}, fetcher)).toEqual([{ id: "1" }, { id: "2" }, { id: "3" }])
  })

  it.each(["total", "revision", "loop", "missing", "inconsistent"])("rejects %s changes rather than exposing a partial catalogue", async kind => {
    const first = response([{ id: "1" }], 3, "next")
    const second = kind === "total" ? response([{ id: "2" }], 2, null)
      : kind === "revision" ? response([{ id: "2" }, { id: "3" }], 3, null, "changed")
      : kind === "loop" ? response([{ id: "2" }], 3, "next")
      : kind === "missing" ? response([{ id: "3" }], 3, null)
      : new Response(JSON.stringify({ items: [{ id: "2" }], total: 3, hasMore: true, nextCursor: null }))
    const fetcher = vi.fn().mockResolvedValueOnce(first).mockResolvedValueOnce(second)
    await expect(fetchPublicCollection("/api/saints", {}, fetcher)).rejects.toThrow()
    expect(fetcher).toHaveBeenCalledTimes(2)
  })

  it("rejects a giant single response, honours cancellation, and gets totals with only one row", async () => {
    await expect(fetchPublicCollection("/api/saints", {}, vi.fn().mockResolvedValue(response(Array.from({ length: 101 }, (_, i) => ({ id: String(i) })), 101, null)))).rejects.toThrow("válido")
    const controller = new AbortController()
    const fetcher = vi.fn((_input, init) => { expect(init?.signal?.aborted).toBe(true); return Promise.reject(new DOMException("Aborted", "AbortError")) })
    controller.abort()
    await expect(fetchPublicCollection("/api/saints", { signal: controller.signal }, fetcher)).rejects.toThrow("CATALOG_CANCELLED")
    const totalFetcher = vi.fn().mockResolvedValue(response([{ id: "1" }], 3000, "next"))
    expect(await fetchCollectionTotal("/api/miracles/all", {}, totalFetcher)).toBe(3000)
    expect(String(totalFetcher.mock.calls[0][0])).toContain("limit=1")
    expect(totalFetcher).toHaveBeenCalledTimes(1)
  })
})

it("filters all 3000 saints including the last record and groups map locations linearly", () => {
  const rows: PublicSaint[] = Array.from({ length: 3000 }, (_, i) => ({
    id: String(i), slug: "synthetic-" + i, name: "Synthetic " + i, biography: "Synthetic biography",
    birthCountryCode: i % 2 ? "CO" : "IT", birthContinent: i % 2 ? "south-america" : "europe",
    deathYear: i % 2 ? 1950 : 1750, birthPlace: "Synthetic city", birthLat: 4.7, birthLng: -74.1,
    birthPrecision: "city", birthSources: ["https://example.invalid/synthetic"],
  }))
  expect(filterSaints(rows, { query: "Synthetic 2999", country: "CO", continent: "south-america", century: "20" }).map(row => row.id)).toEqual(["2999"])
  expect(filterSaints(rows, { query: "", country: "CO", continent: "europe", century: "20" })).toHaveLength(0)
  expect(groupBirthLocations(rows)[0]).toHaveLength(3000)
})
