// @vitest-environment jsdom
import { act } from "@testing-library/react"
import { renderToString } from "react-dom/server"
import { hydrateRoot } from "react-dom/client"
import { expect, it, vi } from "vitest"
import { ScriptureSearchAdvanced } from "./scripture-search-advanced"
import { SaintsFilters } from "./saints-filters"
import { PrayersSearch } from "./prayers-search"
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }), useSearchParams: () => new URLSearchParams("busqueda=ISAIAS%2041%3A10") }))
vi.mock("@/contexts/language-context", () => ({ useLanguage: () => ({ language: "es", t: (key: string) => key }) }))
it.each([
  ["scripture", <ScriptureSearchAdvanced key="scripture" />],
  ["saints", <SaintsFilters key="saints" filters={{ query: "", country: "", century: "", continent: "" }} countries={[]} onChange={() => {}} />],
  ["prayers", <PrayersSearch key="prayers" saints={[]} occasions={[]} />],
] as const)("keeps %s search controls disabled until listeners are hydrated", async (_, element) => {
  const host = document.createElement("div")
  host.innerHTML = renderToString(element)
  document.body.append(host)
  const controls = () => [...host.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLButtonElement>("input, select, button")]
  expect(controls().length).toBeGreaterThan(0)
  expect(controls().every((control) => control.disabled)).toBe(true)
  let root!: ReturnType<typeof hydrateRoot>
  await act(async () => { root = hydrateRoot(host, element) })
  expect(controls().every((control) => !control.disabled)).toBe(true)
  await act(async () => { root.unmount() })
  host.remove()
})
