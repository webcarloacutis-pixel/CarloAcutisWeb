// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, expect, it, vi } from "vitest"
import { TranslatedText } from "./translated-text"
import { postAiTranslate } from "@/lib/ai-client"
const settings = vi.hoisted(() => ({ language: "en" }))
vi.mock("@/contexts/language-context", () => ({ useLanguage: () => ({ language: settings.language, t:(key:string)=>key }) }))
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
  const view = render(<TranslatedText allowTranslation text="Fuente anterior" />)
  fireEvent.click(screen.getByRole("button"))
  const signal = vi.mocked(postAiTranslate).mock.calls[0][1]!
  view.rerender(<TranslatedText allowTranslation text="Fuente actual" />)
  expect(signal.aborted).toBe(true)
  fireEvent.click(screen.getByRole("button"))
  await act(async () => { old.resolve({ translated: "OLD RESULT" }); await old.promise })
  expect(screen.queryByText("OLD RESULT")).toBeNull()
  expect(screen.getByText("Fuente actual")).toBeTruthy()
  await act(async () => { current.resolve({ translated: "CURRENT RESULT" }); await current.promise })
  expect(screen.getByText("CURRENT RESULT")).toBeTruthy()
})
it("returns to the original language immediately without reusing a stale translation", async () => {
  const pending = deferred()
  vi.mocked(postAiTranslate).mockReturnValueOnce(pending.promise)
  const view = render(<TranslatedText allowTranslation text="Texto original" />)
  fireEvent.click(screen.getByRole("button"))
  settings.language = "es"
  view.rerender(<TranslatedText allowTranslation text="Texto original" />)
  await act(async () => { pending.resolve({ translated: "STALE" }); await pending.promise })
  expect(screen.getByText("Texto original")).toBeTruthy()
  expect(screen.queryByText("STALE")).toBeNull()
})
it("retains the original text when the translation provider fails", async () => {
  vi.mocked(postAiTranslate).mockRejectedValueOnce(new Error("Unavailable"))
  render(<TranslatedText allowTranslation text="Texto que permanece" />)
  fireEvent.click(screen.getByRole("button"))
  await act(async () => { await Promise.resolve() })
  expect(screen.getByText("Texto que permanece")).toBeTruthy()
})

it("does not translate any field or fixed label automatically on mount, rerender or language change", () => {
  const view=render(<><TranslatedText text="Catalog original" /><TranslatedText allowTranslation text="Detail original" /></>)
  settings.language="fr"
  view.rerender(<><TranslatedText text="Catalog original" /><TranslatedText allowTranslation text="Detail original" /></>)
  expect(postAiTranslate).not.toHaveBeenCalled()
  expect(screen.getByText("Catalog original").getAttribute("lang")).toBe("es")
})
it("does not restart an explicit request after switching languages away and back",async()=>{
  const pending=deferred();vi.mocked(postAiTranslate).mockReturnValueOnce(pending.promise)
  const view=render(<TranslatedText allowTranslation text="No resend source" />)
  fireEvent.click(screen.getByRole("button"))
  settings.language="fr";view.rerender(<TranslatedText allowTranslation text="No resend source" />)
  settings.language="en";view.rerender(<TranslatedText allowTranslation text="No resend source" />)
  await act(async()=>{pending.resolve({translated:"cancelled"});await pending.promise})
  expect(postAiTranslate).toHaveBeenCalledOnce();expect(screen.getByText("No resend source")).toBeTruthy()
})
