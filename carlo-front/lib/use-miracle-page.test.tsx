// @vitest-environment jsdom
import { act, cleanup, render, screen } from "@testing-library/react"
import { afterEach, expect, it, vi } from "vitest"
import { useMiraclePage } from "./use-miracle-page"
import type { MiraclePage } from "./miracle-pages"

const request = vi.hoisted(() => vi.fn())
vi.mock("./miracle-pages", () => ({ requestMiraclePage: request }))
afterEach(() => { cleanup(); request.mockReset() })
function page(title: string): MiraclePage {
  return { items: [{ id: title, title, saintId: "s", details: "Synthetic", approved: true, type: null, date: null, location: null, witnesses: null,
    createdAt: "2026-01-01", updatedAt: "2026-01-01", saintName: "Santo", saintSlug: "s" }], total: 1, offset: 0, hasMore: false,
    hasPrevious: false, nextCursor: null, previousCursor: null, revision: "r1", metadata: { facets: { types: [] }, approvedTotal: 1 } }
}
function View({ path }: { path: string }) {
  const result = useMiraclePage(path)
  return <div>{(result.page || result.previousPage)?.items.map(item => <p key={item.id}>{item.title}</p>)}{result.loading && <p>Cargando</p>}</div>
}

it("never exposes an administrative previous page while the public resource is loading", async () => {
  let resolvePublic!: (result: MiraclePage) => void
  request.mockImplementation((url: string) => url.includes("/all") ? Promise.resolve(page("Synthetic private pending")) : new Promise<MiraclePage>(resolve => { resolvePublic = resolve }))
  const view = render(<View path="/api/miracles/all?view=cards&limit=12" />)
  expect(await screen.findByText("Synthetic private pending")).toBeTruthy()
  view.rerender(<View path="/api/miracles?view=cards&limit=12" />)
  expect(screen.queryByText("Synthetic private pending")).toBeNull()
  await vi.waitFor(() => expect(request).toHaveBeenCalledTimes(2))
  await act(async () => resolvePublic(page("Synthetic public approved")))
  expect(await screen.findByText("Synthetic public approved")).toBeTruthy()
  expect(screen.queryByText("Synthetic private pending")).toBeNull()
})

it("aborts an obsolete private read and ignores its late response", async () => {
  let resolvePrivate!: (result: MiraclePage) => void
  let privateSignal: AbortSignal | undefined
  request.mockImplementation((url: string, signal: AbortSignal) => {
    if (!url.includes("/all")) return Promise.resolve(page("Synthetic approved"))
    privateSignal = signal
    return new Promise<MiraclePage>(resolve => { resolvePrivate = resolve })
  })
  const view = render(<View path="/api/miracles/all?view=cards&limit=12" />)
  await vi.waitFor(() => expect(privateSignal).toBeDefined())
  view.rerender(<View path="/api/miracles?view=cards&limit=12" />)
  expect(privateSignal?.aborted).toBe(true)
  expect(await screen.findByText("Synthetic approved")).toBeTruthy()
  await act(async () => resolvePrivate(page("Late private response")))
  expect(screen.queryByText("Late private response")).toBeNull()
})

it("does not reuse private cached records after the authenticated view unmounts", async () => {
  request.mockResolvedValueOnce(page("Synthetic first session")).mockResolvedValueOnce(page("Synthetic second session"))
  const first = render(<View path="/api/miracles/all?view=cards&limit=12" />)
  expect(await screen.findByText("Synthetic first session")).toBeTruthy()
  first.unmount()
  render(<View path="/api/miracles/all?view=cards&limit=12" />)
  expect(screen.queryByText("Synthetic first session")).toBeNull()
  expect(await screen.findByText("Synthetic second session")).toBeTruthy()
  expect(request).toHaveBeenCalledTimes(2)
})
