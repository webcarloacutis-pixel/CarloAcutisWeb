// @vitest-environment jsdom
import { act, cleanup, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, expect, it, vi } from "vitest"
import { TranslatedText } from "./translated-text"
import { postAiTranslate } from "@/lib/ai-client"
const settings = vi.hoisted(() => ({ language: "en" }))
vi.mock("@/contexts/language-context", () => ({ useLanguage: () => ({ language: settings.language }) }))
vi.mock("@/lib/ai-client", () => ({ postAiTranslate: vi.fn() }))
beforeEach(() => { settings.language = "en"; localStorage.clear(); vi.mocked(postAiTranslate).mockReset() })
afterEach(cleanup)
function deferred() {
  let resolve!: (value: { translated: string }) => void
  const promise = new Promise<{ translated: string }>((done) => { resolve = done })
  return { promise, resolve }
}
it("aborts and rejects a late translation for a previous source", async () => {
  const old = deferred(), current = deferred()
  vi.mocked(postAiTranslate).mockReturnValueOnce(old.promise).mockReturnValueOnce(current.promise)
  const view = render(<TranslatedText text="Fuente anterior" />)
  const signal = vi.mocked(postAiTranslate).mock.calls[0][1]!
  view.rerender(<TranslatedText text="Fuente actual" />)
  expect(signal.aborted).toBe(true)
  await act(async () => { old.resolve({ translated: "OLD RESULT" }); await old.promise })
  expect(screen.queryByText("OLD RESULT")).toBeNull()
  expect(screen.getByText("Fuente actual")).toBeTruthy()
  await act(async () => { current.resolve({ translated: "CURRENT RESULT" }); await current.promise })
  expect(screen.getByText("CURRENT RESULT")).toBeTruthy()
})
it("returns to the original language immediately without reusing a stale translation", async () => {
  const pending = deferred()
  vi.mocked(postAiTranslate).mockReturnValueOnce(pending.promise)
  const view = render(<TranslatedText text="Texto original" />)
  settings.language = "es"
  view.rerender(<TranslatedText text="Texto original" />)
  await act(async () => { pending.resolve({ translated: "STALE" }); await pending.promise })
  expect(screen.getByText("Texto original")).toBeTruthy()
  expect(screen.queryByText("STALE")).toBeNull()
})
it("retains the original text when the translation provider fails", async () => {
  vi.mocked(postAiTranslate).mockRejectedValueOnce(new Error("Unavailable"))
  render(<TranslatedText text="Texto que permanece" />)
  await act(async () => { await Promise.resolve() })
  expect(screen.getByText("Texto que permanece")).toBeTruthy()
})
