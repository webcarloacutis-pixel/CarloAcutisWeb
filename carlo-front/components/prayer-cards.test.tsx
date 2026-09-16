// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, expect, it } from "vitest"
import { FeaturedPrayers } from "./featured-prayers"
import { PrayersResults } from "./prayers-results"
import { prayersData } from "@/lib/prayers-data"
afterEach(cleanup)
it("renders the complete existing long prayer in featured and result cards", () => {
  const original = prayersData[0]
  const prayer = { id: original.id, title: original.title, content: original.text, saintName: original.saint, occasion: original.occasion }
  render(<><FeaturedPrayers prayers={[prayer]} /><PrayersResults prayers={[prayer]} /></>)
  const cards = screen.getAllByText(original.text, { exact: true })
  expect(cards).toHaveLength(2)
  for (const card of cards) expect(card.textContent).toBe(original.text)
  expect(screen.getByText("Popularidad estimada por IA: sin estimación disponible")).toBeTruthy()
  expect(screen.queryByText("98%")).toBeNull()
})
