import { expect, it, vi } from "vitest"
import { fetchPublicCollection } from "./public-collection"
function page(rows: { id: string }[], headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(rows), { headers })
}
it("collects later pages before exposing a catalogue", async () => {
  const fetcher = vi.fn().mockResolvedValueOnce(page([{ id: "1" }], { "X-Next-Cursor": "1", "X-Total-Count": "2" })).mockResolvedValueOnce(page([{ id: "2" }], { "X-Total-Count": "2" }))
  expect(await fetchPublicCollection("/api/saints", {}, fetcher)).toEqual([{ id: "1" }, { id: "2" }])
  expect(fetcher.mock.calls[1][0]).toContain("cursor=1")
})
it("never returns partial results when a later page fails", async () => {
  const fetcher = vi.fn().mockResolvedValueOnce(page([{ id: "1" }], { "X-Next-Cursor": "1" })).mockResolvedValueOnce(new Response("unavailable", { status: 503 }))
  await expect(fetchPublicCollection("/api/saints", {}, fetcher)).rejects.toThrow("completo")
})
it("rejects repeated cursors/rows and truncated final collections", async () => {
  const repeated = vi.fn().mockResolvedValue(page([{ id: "1" }], { "X-Next-Cursor": "1" }))
  await expect(fetchPublicCollection("/api/saints", {}, repeated)).rejects.toThrow()
  await expect(fetchPublicCollection("/api/saints", {}, vi.fn().mockResolvedValue(page([{ id: "1" }], { "X-Total-Count": "2" })))).rejects.toThrow("completo")
})
