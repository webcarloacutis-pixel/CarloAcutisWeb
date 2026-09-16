"use client"
import { useSearchParams } from "next/navigation"
import { SaintsFilters } from "@/components/saints-filters"
import { SaintsList } from "@/components/saints-list"
import { SaintsMapSidebar } from "@/components/saints-map-sidebar"
import { WorldMapLeaflet } from "@/components/world-map-leaflet"
import { MapLegend } from "@/components/map-legend"
import { compatibleCountry, countryName, filterSaints, matchesContinent, matchesCountry, readSaintFilters, type PublicSaint, type SaintFilters } from "@/lib/content-filters"

export function SaintsExplorer({ saints, mapOnly = false }: { saints: PublicSaint[]; mapOnly?: boolean }) {
  const searchParams = useSearchParams()
  const parsed = readSaintFilters(new URLSearchParams(searchParams.toString()))
  const filters = { ...parsed, country: parsed.country ? saints.find((saint) => matchesCountry(saint, parsed.country))?.birthCountryCode || parsed.country : "" }
  const countries = [...new Set(saints.filter((saint) => matchesContinent(saint.birthContinent, filters.continent)).map((saint) => saint.birthCountryCode).filter((code): code is string => Boolean(code)))]
    .map((code) => ({ code, label: countryName(code) })).sort((a, b) => a.label.localeCompare(b.label, "es"))
  const filtered = filterSaints(saints, mapOnly ? { ...filters, query: "", century: "" } : filters)
  function change(next: SaintFilters, replace = false) {
    if (next.continent !== filters.continent) next.country = compatibleCountry(saints, next.country, next.continent)
    const params = new URLSearchParams()
    if (!mapOnly && next.query) params.set("q", next.query)
    if (next.continent) params.set("continent", next.continent)
    if (next.country) params.set("country", next.country)
    if (!mapOnly && next.century) params.set("century", next.century)
    const url = (mapOnly ? "/mapa" : "/santos") + (params.size ? "?" + params : "")
    if (replace) window.history.replaceState(null, "", url)
    else window.history.pushState(null, "", url)
  }
  return <>
    <SaintsFilters filters={filters} countries={countries} onChange={change} mapOnly={mapOnly} />
    {mapOnly ? <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      <div className="lg:col-span-3 min-w-0">
        <div className="bg-card rounded-lg border p-4 mb-4"><WorldMapLeaflet saints={filtered} /></div>
        <MapLegend />
      </div>
      <div className="lg:col-span-1 min-w-0"><SaintsMapSidebar saints={filtered} allSaints={saints} /></div>
    </div> : <SaintsList key={JSON.stringify(filters)} saints={filtered} />}
  </>
}
