// @vitest-environment jsdom
import { cleanup, render } from "@testing-library/react"
import { afterEach, expect, it, vi } from "vitest"
import { ScrollToResults } from "./scroll-to-results"

const query = vi.hoisted(() => ({ value: "q=oracion&categoria=esperanza" }))
vi.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams(query.value) }))
afterEach(() => { cleanup(); vi.restoreAllMocks() })
it("leaves manual document position unchanged on initial search and subsequent filter changes", () => {
  const scroll = vi.fn()
  const spy = vi.spyOn(document, "getElementById").mockReturnValue({ scrollIntoView: scroll } as unknown as HTMLElement)
  const view = render(<ScrollToResults />)
  query.value = "categoria=otra"
  view.rerender(<ScrollToResults />)
  expect(scroll).not.toHaveBeenCalled()
  expect(spy).not.toHaveBeenCalled()
})
