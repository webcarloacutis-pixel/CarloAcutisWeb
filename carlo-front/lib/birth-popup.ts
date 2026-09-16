import { countryName, type PublicSaint } from "./content-filters"
/** Untrusted catalogue fields enter the popup exclusively as text or encoded route segments. */
export function createBirthPopup(group: PublicSaint[], documentRef: Document = document): HTMLElement {
  if (!group.length) throw new Error("A birthplace popup requires a saint.")
  const first = group[0]
  const popup = documentRef.createElement("div")
  popup.className = "space-y-2 max-h-64 overflow-y-auto"
  const heading = documentRef.createElement("p")
  heading.className = "font-semibold"
  heading.textContent = first.birthPlace + " · " + countryName(first.birthCountryCode)
  popup.append(heading)
  const precision = documentRef.createElement("p")
  precision.textContent = group.every((saint) => saint.birthPrecision === "exact") ? "Lugar documentado" : "Ubicación aproximada de la ciudad; no indica una casa natal exacta."
  popup.append(precision)
  for (const saint of group) {
    const link = documentRef.createElement("a")
    link.href = "/santos/" + encodeURIComponent(saint.slug)
    link.textContent = saint.name
    link.className = "block underline"
    popup.append(link)
  }
  const country = documentRef.createElement("a")
  country.href = "/santos?" + new URLSearchParams({ country: first.birthCountryCode || "" })
  country.textContent = "Ver santos nacidos en " + countryName(first.birthCountryCode)
  country.className = "block underline mt-2"
  popup.append(country)
  return popup
}
