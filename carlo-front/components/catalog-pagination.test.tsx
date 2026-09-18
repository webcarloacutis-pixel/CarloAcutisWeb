// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, renderHook, screen } from "@testing-library/react"
import { afterEach, expect, it } from "vitest"
import { CatalogPagination, useCatalogPage } from "./catalog-pagination"
import { createBirthPopup } from "@/lib/birth-popup"
import type { PublicSaint } from "@/lib/content-filters"
afterEach(cleanup)

it.each([0, 7, 79, 100, 101, 179, 1000, 2999, 3000])("keeps DOM windows bounded at %i records and exposes the final record", count => {
  const items = Array.from({ length: count }, (_, id) => ({ id }))
  const { result, rerender } = renderHook(({ rows }) => useCatalogPage(rows), { initialProps: { rows: items } })
  expect(result.current.items.length).toBeLessThanOrEqual(12)
  act(() => result.current.onPage(99999))
  expect(result.current.items.length).toBeLessThanOrEqual(12)
  if (count) expect(result.current.items.at(-1)?.id).toBe(count - 1)
  rerender({ rows: items.slice(-1) })
  expect(result.current.index).toBe(0)
})

it("has usable previous/next controls without accumulating earlier cards", () => {
  const items = Array.from({ length: 3000 }, (_, id) => id)
  function Example() {
    const page = useCatalogPage(items)
    return <><ul>{page.items.map(id => <li key={id}>{id}</li>)}</ul><CatalogPagination {...page} label="santos" /></>
  }
  render(<Example />)
  expect(screen.getAllByRole("listitem")).toHaveLength(12)
  fireEvent.click(screen.getByRole("button", { name: "Siguiente" }))
  expect(screen.getAllByRole("listitem")).toHaveLength(12)
  expect(screen.getAllByRole("listitem")[0].textContent).toBe("12")
  fireEvent.click(screen.getByRole("button", { name: "Anterior" }))
  expect(screen.getAllByRole("listitem")[0].textContent).toBe("0")
})

it("keeps a shared birthplace popup at 20 links plus its country link", () => {
  const rows: PublicSaint[] = Array.from({ length: 3000 }, (_, id) => ({ id: String(id), slug: "fixture-" + id, name: "Synthetic " + id, birthPlace: "Synthetic city", birthCountryCode: "CO" }))
  const popup = createBirthPopup(rows)
  document.body.append(popup)
  expect(popup.querySelectorAll("a")).toHaveLength(21)
  fireEvent.click(screen.getByRole("button", { name: "Siguiente" }))
  expect(popup.querySelectorAll("a")).toHaveLength(21)
  expect(popup.querySelector("a")?.textContent).toBe("Synthetic 20")
  popup.remove()
})
