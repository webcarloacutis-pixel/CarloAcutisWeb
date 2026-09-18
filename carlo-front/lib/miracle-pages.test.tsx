// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from "@testing-library/react"
import { afterEach, expect, it, vi } from "vitest"
import { MiraclesList } from "@/components/miracles-list"
import { SaintMiracles } from "@/components/saint-miracles"
import { AdminMiraclesList } from "@/components/admin-miracles-list"

vi.mock("@/contexts/language-context", () => ({ useLanguage: () => ({ language: "es", t: (key: string) => key }) }))
afterEach(() => { cleanup(); vi.unstubAllGlobals() })
function fixture() {
  return {
    items: Array.from({ length: 12 }, (_, index) => ({ id: "m" + index, saintId: "saint", title: "Relato sintético " + index, details: "Texto completo sintético " + index,
      type: "Curación", date: null, location: null, witnesses: null, approved: true, createdAt: "2026-01-01", updatedAt: "2026-01-01", saintName: "Santo de prueba", saintSlug: "saint" })),
    total: 3000, offset: 0, hasPrevious: false, previousCursor: null, hasMore: true, nextCursor: "next_page", revision: "r1",
    metadata: { facets: { types: ["Curación", "Eucarístico"] }, approvedTotal: 3000 },
  }
}
function install() {
  const fetcher = vi.fn(async (input: unknown) => {
    const url = new URL(String(input), "http://fixture.invalid")
    if (url.pathname === "/api/saints") return Response.json([{ id: "saint", name: "Santo de prueba", slug: "saint" }], { headers: { "X-Total-Count": "1" } })
    return Response.json(fixture())
  })
  vi.stubGlobal("fetch", fetcher)
  return fetcher
}

for (const mode of ["public", "admin", "relation"] as const) it(`${mode} miracles request only12 complete rows and retain global totals`, async () => {
  const fetcher = install()
  render(mode === "public" ? <MiraclesList /> : mode === "admin" ? <AdminMiraclesList /> : <SaintMiracles saintId="saint" />)
  await waitFor(() => expect(fetcher.mock.calls.some(([input]) => new URL(String(input), "http://fixture.invalid").pathname.includes("miracles"))).toBe(true))
  const requests = () => fetcher.mock.calls.map(([input]) => new URL(String(input), "http://fixture.invalid")).filter(url => url.pathname.includes("miracles"))
  expect(requests()[0].searchParams.get("view")).toBe("cards")
  expect(requests()[0].searchParams.get("limit")).toBe("12")
  expect(await screen.findByText("Relato sintético 11")).toBeTruthy()
  expect(screen.getAllByText(/^Relato sintético \d+$/)).toHaveLength(12)
  expect(screen.getByText("1–12 de 3000")).toBeTruthy()
  expect(requests()).toHaveLength(1)
  if (mode === "relation") expect(requests()[0].pathname).toBe("/api/saints/saint/miracles")
  if (mode === "admin") expect(requests()[0].pathname).toBe("/api/miracles/all")
})
