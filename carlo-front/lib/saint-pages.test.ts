// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { canonicalFilterCountry, createSaintPageCache, requestSaintPage, saintFilterCountries, saintPageUrl, validateSaintPage, type SaintPage } from "./saint-pages"

function fixture(total = 179, offset = 0, size = 12): SaintPage {
  const count = Math.min(size, total - offset)
  return {
    items: Array.from({ length: count }, (_, i) => ({ id: "s" + (offset + i), name: "Santo " + (offset + i), slug: "s-" + (offset + i), createdAt: "2026-01-01", updatedAt: "2026-01-01", popularityEstimate: null })),
    total, offset, hasMore: offset + count < total, hasPrevious: offset > 0,
    nextCursor: offset + count < total ? "cursor_" + (offset + count) : null,
    previousCursor: offset > size ? "cursor_" + (offset - size) : null,
    revision: "r1", rankingMode: "alphabetical-unrated", metadata: { facets: { countries: [{ code: "IT", continent: "europe" }, { code: "CO", continent: "south-america" }] } },
  }
}

describe("bounded pages independent of total catalogue size", () => {
  for (const total of [0, 79, 100, 101, 179, 1000, 2999, 3000, 3001]) it(`${total} records remain accessible12 at a time without automatic follow-up requests`, async () => {
    let calls = 0
    const fetcher: typeof fetch = async input => {
      calls++
      const url = new URL(String(input), "http://fixture.invalid")
      expect(url.searchParams.get("limit")).toBe("12")
      const offset = Number((url.searchParams.get("cursor") || "cursor_0").split("_")[1])
      return Response.json(fixture(total, offset))
    }
    const initial = saintPageUrl({ query: "", country: "", continent: "", century: "" })
    let result = await requestSaintPage(initial, new AbortController().signal, fetcher)
    expect(calls).toBe(1)
    const ids = new Set(result.items.map(item => item.id))
    while (result.hasMore) {
      result = await requestSaintPage(initial + "&cursor=" + result.nextCursor, new AbortController().signal, fetcher)
      expect(result.items.length).toBeLessThanOrEqual(12)
      for (const item of result.items) { expect(ids.has(item.id)).toBe(false); ids.add(item.id) }
    }
    expect(ids.size).toBe(total)
    expect(calls).toBe(Math.max(1, Math.ceil(total / 12)))
  })
})

it("encodes global filters and opaque cursor without accepting a giant page size implicitly", () => {
  const value = new URL(saintPageUrl({ query: "María & paz", country: "IT", continent: "europe", century: "16-20" }, "opaque_abc"), "http://fixture.invalid")
  expect(Object.fromEntries(value.searchParams)).toEqual({ view: "cards", limit: "12", q: "María & paz", continent: "europe", country: "IT", century: "16-20", cursor: "opaque_abc" })
})

it("rejects duplicate IDs, repeated cursor, bad totals and malformed facets", () => {
  const good = fixture()
  expect(() => validateSaintPage({ ...good, items: [good.items[0], good.items[0]] }, 12, "")).toThrow()
  expect(() => validateSaintPage({ ...good, nextCursor: "current" }, 12, "current")).toThrow()
  expect(() => validateSaintPage({ ...good, total: 1 }, 12, "")).toThrow()
  expect(() => validateSaintPage({ ...good, metadata: {} }, 12, "")).toThrow()
  expect(() => validateSaintPage(fixture(179, 12), 12, "cursor_12")).not.toThrow()
  expect(validateSaintPage(fixture(179, 12), 12, "cursor_12").previousCursor).toBeNull()
})

it("bounds cache memory, expires entries and invalidates other pages when revision changes", () => {
  const cache = createSaintPageCache(2, 100)
  cache.set("/saints?view=cards&limit=12", fixture(), 0)
  cache.set("/saints?view=cards&limit=12&cursor=cursor_12", fixture(179, 12), 0)
  expect(cache.get("/saints?view=cards&limit=12", 50)?.total).toBe(179)
  cache.set("/saints?view=cards&limit=12&cursor=cursor_24", fixture(179, 24), 50)
  expect(cache.size).toBe(2)
  expect(cache.get("/saints?view=cards&limit=12&cursor=cursor_12", 50)).toBeUndefined()
  cache.set("/saints?view=cards&limit=12", { ...fixture(), revision: "r2" }, 60)
  expect(cache.size).toBe(1)
  expect(cache.get("/saints?view=cards&limit=12", 160)).toBeUndefined()
})

it("does not cache pages that repeat a record across different offsets of one revision", () => {
  const cache = createSaintPageCache()
  cache.set("/saints?limit=12", fixture())
  expect(() => cache.set("/saints?limit=12&cursor=cursor_12", { ...fixture(179, 12), items: [fixture().items[0], ...fixture(179, 12).items.slice(1)] })).toThrow(/repitió fichas/)
})

it("uses global facets rather than visible cards for country compatibility and aliases", () => {
  const facets = fixture().metadata.facets.countries
  expect(saintFilterCountries(facets, "america")).toEqual([{ code: "CO", label: "Colombia" }])
  expect(saintFilterCountries(facets, "asia")).toEqual([])
  expect(canonicalFilterCountry("italia", facets)).toBe("IT")
  expect(canonicalFilterCountry("unknown", facets)).toBe("unknown")
})
