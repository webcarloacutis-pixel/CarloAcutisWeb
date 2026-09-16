// @vitest-environment jsdom
import { expect, it } from "vitest"
import { createBirthPopup } from "./birth-popup"
it("never interprets catalogue text as popup HTML, events, or executable URLs", () => {
  const payload = "<img src=x onerror=alert(1)>"
  const slug = "javascript:alert(1)' onclick='alert(2)"
  const popup = createBirthPopup([{ id: "test", slug, name: payload, birthPlace: "<script>alert(3)</script>", birthCountryCode: "IT", birthPrecision: "city" }])
  expect(popup.textContent).toContain(payload)
  expect(popup.querySelector("img, script")).toBeNull()
  expect(popup.querySelector("a")?.getAttribute("href")).toBe("/santos/" + encodeURIComponent(slug))
  expect([...popup.querySelectorAll("*")].flatMap((element) => [...element.attributes]).some((attribute) => attribute.name.startsWith("on"))).toBe(false)
})
it("keeps every saint in an overlapping birthplace accessible", () => {
  const popup = createBirthPopup([
    { id: "1", slug: "francisco", name: "Francisco", birthPlace: "Asís", birthCountryCode: "IT", birthPrecision: "city" },
    { id: "2", slug: "clara", name: "Clara", birthPlace: "Asís", birthCountryCode: "IT", birthPrecision: "city" },
  ])
  expect([...popup.querySelectorAll("a")].map((link) => link.textContent)).toEqual(["Francisco", "Clara", "Ver santos nacidos en Italia"])
  expect(popup.textContent).toContain("Ubicación aproximada de la ciudad")
})
