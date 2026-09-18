// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, expect, it, vi } from "vitest"
import { SaintsCatalog } from "./saints-catalog"

const navigation = vi.hoisted(() => ({ query: "" }))
vi.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams(navigation.query) }))
vi.mock("@/components/catalog-image", () => ({ CatalogImage: () => <span data-testid="synthetic-image" /> }))
vi.mock("@/contexts/language-context", () => ({ useLanguage: () => ({ language: "es", t: (key: string) => key }) }))
vi.mock("@/components/translated-text", () => ({ TranslatedText: ({ text }: { text: string }) => <>{text}</> }))
vi.mock("@/components/world-map-leaflet", () => ({ WorldMapLeaflet: () => null }))

function page() {
  return {
    items: Array.from({ length: 12 }, (_, index) => ({ id: "saint-" + index, name: "Santo " + index, slug: "saint-" + index,
      createdAt: "2026-01-01", updatedAt: "2026-01-01", biographyExcerpt: "Contenido sintético " + index, popularityEstimate: null })),
    total: 179, nextCursor: "opaque_next", previousCursor: null, hasPrevious: false, offset: 0, hasMore: true,
    revision: "fixture-r1", rankingMode: "alphabetical-unrated", metadata: { facets: { countries: [{ code: "IT", continent: "europe" }, { code: "CO", continent: "south-america" }] } },
  }
}
beforeEach(() => { navigation.query = "" })
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks() })

it("requests one12-item server page and displays the global total without downloading later pages", async () => {
  const fetcher = vi.fn(async (_input: unknown) => Response.json(page()))
  vi.stubGlobal("fetch", fetcher)
  render(<SaintsCatalog />)
  await waitFor(() => expect(fetcher).toHaveBeenCalled())
  const first = new URL(String(fetcher.mock.calls[0][0]), "http://fixture.invalid")
  expect(first.searchParams.get("view")).toBe("cards")
  expect(first.searchParams.get("limit")).toBe("12")
  expect(await screen.findByText("179 santos encontrados")).toBeTruthy()
  expect(screen.getAllByRole("link", { name: /^Ver biografía de / })).toHaveLength(12)
  expect(fetcher).toHaveBeenCalledTimes(1)
  expect(screen.getByText("Contenido sintético 11")).toBeTruthy()
  expect(screen.getByText(/Orden alfabético/)).toBeTruthy()
  expect(screen.queryByText(/^Orden: popularidad estimada/)).toBeNull()
})

it("sends combined global filters and keeps them in next-page navigation without scrolling", async () => {
  navigation.query = "q=final&continent=europe&country=IT&century=16-20"
  const fetcher = vi.fn(async (_input: unknown) => Response.json(page()))
  vi.stubGlobal("fetch", fetcher)
  const push = vi.spyOn(window.history, "pushState").mockImplementation(() => {})
  const scroll = vi.spyOn(window, "scrollTo").mockImplementation(() => {})
  render(<SaintsCatalog />)
  expect(await screen.findByText("179 santos encontrados")).toBeTruthy()
  const sent = new URL(String(fetcher.mock.calls[0][0]), "http://fixture.invalid").searchParams
  expect(Object.fromEntries(["q", "continent", "country", "century"].map(key => [key, sent.get(key)]))).toEqual({ q: "final", continent: "europe", country: "IT", century: "16-20" })
  fireEvent.click(screen.getByRole("button", { name: "Siguiente" }))
  const target = new URL(String(push.mock.calls[0][2]), "http://fixture.invalid")
  expect(target.searchParams.get("cursor")).toBe("opaque_next")
  expect(target.searchParams.get("q")).toBe("final")
  expect(target.searchParams.get("country")).toBe("IT")
  expect(scroll).not.toHaveBeenCalled()
})

it("retains the selected global country when it is absent from this card page", async () => {
  navigation.query = "country=Colombia"
  vi.stubGlobal("fetch", vi.fn(async (_input: unknown) => Response.json(page())))
  render(<SaintsCatalog />)
  await screen.findByText("179 santos encontrados")
  const country = screen.getByLabelText("País de nacimiento") as HTMLSelectElement
  expect(country.value).toBe("CO")
  expect([...country.options].some(option => option.value === "IT")).toBe(true)
})
