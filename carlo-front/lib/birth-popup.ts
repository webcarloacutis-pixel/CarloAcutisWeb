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
  const list = documentRef.createElement("div")
  const controls = documentRef.createElement("div")
  const previous = documentRef.createElement("button"), next = documentRef.createElement("button")
  const status = documentRef.createElement("span")
  status.setAttribute("aria-live", "polite")
  previous.type = next.type = "button"
  previous.textContent = "Anterior"; next.textContent = "Siguiente"
  previous.className = next.className = "border rounded px-2 py-1 disabled:opacity-50"
  controls.className = "flex flex-wrap items-center gap-2"
  controls.append(previous, status, next)
  let page = 0
  function renderPage() {
    list.replaceChildren()
    for (const saint of group.slice(page * 20, (page + 1) * 20)) {
      const link = documentRef.createElement("a")
      link.href = "/santos/" + encodeURIComponent(saint.slug)
      link.textContent = saint.name
      link.className = "block underline"
      list.append(link)
    }
    previous.disabled = page === 0
    next.disabled = (page + 1) * 20 >= group.length
    status.textContent = `${page * 20 + 1}–${Math.min((page + 1) * 20, group.length)} de ${group.length}`
  }
  previous.addEventListener("click", () => { if (page > 0) { page--; renderPage() } })
  next.addEventListener("click", () => { if ((page + 1) * 20 < group.length) { page++; renderPage() } })
  renderPage()
  popup.append(list)
  if (group.length > 20) popup.append(controls)
  const country = documentRef.createElement("a")
  country.href = "/santos?" + new URLSearchParams({ country: first.birthCountryCode || "" })
  country.textContent = "Ver santos nacidos en " + countryName(first.birthCountryCode)
  country.className = "block underline mt-2"
  popup.append(country)
  return popup
}
