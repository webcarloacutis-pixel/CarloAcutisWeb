// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, expect, it, vi } from "vitest"
import { AdminPrayersStatsCard } from "./admin-prayers-stats-card"

afterEach(() => { cleanup(); vi.unstubAllGlobals() })

it("counts pending prayers beyond100 from the private total using two one-row requests", async () => {
  const fetcher = vi.fn(async (input: unknown, options: RequestInit) => {
    const url = new URL(String(input), "http://fixture.invalid")
    expect(url.searchParams.get("limit")).toBe("1")
    expect(options.credentials).toBe("include")
    const all = url.pathname === "/api/prayers/all"
    expect(["/api/prayers/all", "/api/prayers/approved"]).toContain(url.pathname)
    return Response.json([{ id: all ? "pending" : "approved", approved: !all }], {
      headers: { "X-Total-Count": all ? "179" : "79", "X-Next-Cursor": "next" },
    })
  })
  vi.stubGlobal("fetch", fetcher)
  render(<AdminPrayersStatsCard />)
  expect(await screen.findByText("79 aprobadas")).toBeTruthy()
  expect(screen.getByText("179")).toBeTruthy()
  expect(fetcher).toHaveBeenCalledTimes(2)
})

it("shows unauthorized totals as an error without claiming a zero total", async () => {
  vi.stubGlobal("fetch", vi.fn(async () => Response.json({ error: "NOT_AUTHENTICATED" }, { status: 401 })))
  render(<AdminPrayersStatsCard />)
  expect(await screen.findByRole("alert")).toBeTruthy()
  expect(screen.queryByText("0")).toBeNull()
  expect(screen.queryByText("0 aprobadas")).toBeNull()
})

it("reports an empty complete collection only after both valid responses", async () => {
  vi.stubGlobal("fetch", vi.fn(async () => Response.json([], { headers: { "X-Total-Count": "0" } })))
  render(<AdminPrayersStatsCard />)
  expect(await screen.findByText("0 aprobadas")).toBeTruthy()
  expect(screen.getByText("0")).toBeTruthy()
  expect(screen.queryByRole("alert")).toBeNull()
})
