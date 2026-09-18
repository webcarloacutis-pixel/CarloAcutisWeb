// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, expect, it, vi } from "vitest"
import { SaintMatcherForm } from "./saint-matcher-form"

afterEach(() => { cleanup(); vi.unstubAllGlobals() })

it("exposes every selectable quality and growth area as a native toggle button", () => {
  render(<SaintMatcherForm />)
  const quality = screen.getByRole("button", { name: "Compasivo" })
  const challenge = screen.getByRole("button", { name: "Impaciencia" })
  const submit = screen.getByRole("button", { name: "Descubrir mis santos afines" })
  expect(quality.tagName).toBe("BUTTON")
  expect(quality.getAttribute("type")).toBe("button")
  expect(quality.getAttribute("aria-pressed")).toBe("false")
  expect((submit as HTMLButtonElement).disabled).toBe(true)
  fireEvent.click(quality)
  expect(quality.getAttribute("aria-pressed")).toBe("true")
  expect((submit as HTMLButtonElement).disabled).toBe(false)
  fireEvent.click(quality)
  expect((submit as HTMLButtonElement).disabled).toBe(true)
  fireEvent.click(challenge)
  expect(challenge.getAttribute("aria-pressed")).toBe("true")
  expect((submit as HTMLButtonElement).disabled).toBe(false)
})

it("submits selected traits without duplicates and preserves negative HTTP feedback", async () => {
  const fetcher = vi.fn(async () => Response.json({ error: "RATE_LIMITED" }, { status: 429 }))
  vi.stubGlobal("fetch", fetcher)
  render(<SaintMatcherForm />)
  const quality = screen.getByRole("button", { name: "Compasivo" })
  fireEvent.click(quality); fireEvent.click(quality); fireEvent.click(quality)
  fireEvent.click(screen.getByRole("button", { name: "Impaciencia" }))
  fireEvent.click(screen.getByRole("button", { name: "Descubrir mis santos afines" }))
  expect(await screen.findByText("RATE_LIMITED")).toBeTruthy()
  expect(fetcher).toHaveBeenCalledTimes(1)
  const call = fetcher.mock.calls[0] as unknown as [string, RequestInit]
  expect(JSON.parse(String(call[1].body))).toEqual({ about: "", qualities: ["Compasivo"], growthAreas: ["Impaciencia"] })
})
