"use client"
import { useHydrated } from "@/lib/use-hydrated"
import { T } from "@/components/t"
import { useLanguage } from "@/contexts/language-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { CONTINENTS, type SaintFilters } from "@/lib/content-filters"
import { Filter } from "lucide-react"

type Props = {
  filters: SaintFilters
  countries: { code: string; label: string }[]
  onChange: (filters: SaintFilters, replace?: boolean) => void
  mapOnly?: boolean
}
const selectClass = "block h-10 w-full rounded-md border border-input bg-background px-3 py-0 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
export function SaintsFilters({ filters, countries, onChange, mapOnly = false }: Props) {
  const hydrated = useHydrated()
  const { t } = useLanguage()
  const continents = [...CONTINENTS, { code: "america", label: "América (Norte y Sur)" }, { code: "unknown", label: "Sin documentar" }]
  return (
    <div className="bg-card rounded-lg p-6 mb-8 border">
      <h2 className="font-playfair text-lg font-semibold flex items-center gap-2 mb-4">
        <Filter className="h-5 w-5 text-primary" aria-hidden="true" /><T k="saints.filters.title" />
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
        {!mapOnly && <label className="text-sm space-y-2">
          <span>Buscar santos</span>
          <Input disabled={!hydrated} aria-label="Buscar santos" placeholder={t("saints.filters.searchPlaceholder")} value={filters.query} maxLength={200}
            onChange={(event) => onChange({ ...filters, query: event.target.value }, true)} />
        </label>}
        <label className="text-sm space-y-2">
          <span>Continente de nacimiento</span>
          <select disabled={!hydrated} aria-label="Continente de nacimiento" className={selectClass} value={filters.continent} onChange={(event) => onChange({ ...filters, continent: event.target.value })}>
            <option value="">Todos los continentes</option>
            {filters.continent && !continents.some((item) => item.code === filters.continent) && <option value={filters.continent}>Continente no disponible</option>}
            {continents.map((item) => <option key={item.code} value={item.code}>{item.label}</option>)}
          </select>
        </label>
        <label className="text-sm space-y-2">
          <span>País de nacimiento</span>
          <select disabled={!hydrated} aria-label="País de nacimiento" className={selectClass} value={filters.country} onChange={(event) => onChange({ ...filters, country: event.target.value })}>
            <option value="">Todos los países</option>
            {filters.country && !countries.some((item) => item.code === filters.country) && <option value={filters.country}>País no disponible</option>}
            {countries.map((item) => <option key={item.code} value={item.code}>{item.label}</option>)}
          </select>
        </label>
        {!mapOnly && <label className="text-sm space-y-2">
          <span>Siglo de fallecimiento</span>
          <select disabled={!hydrated} aria-label="Siglo de fallecimiento" className={selectClass} value={filters.century} onChange={(event) => onChange({ ...filters, century: event.target.value })}>
            <option value="">Todos los siglos</option>
            <option value="1-5">Siglos I–V</option><option value="6-10">Siglos VI–X</option>
            <option value="11-15">Siglos XI–XV</option><option value="16-20">Siglos XVI–XX</option>
            <option value="21">Siglo XXI</option><option value="bce">Antes de nuestra era</option><option value="unknown">Fallecimiento desconocido o no aplicable</option>
            {filters.century && !["1-5", "6-10", "11-15", "16-20", "21", "bce", "unknown"].includes(filters.century) && <option value={filters.century}>Siglo {filters.century}</option>}
          </select>
        </label>}
        <Button disabled={!hydrated} variant="outline" onClick={() => onChange({ query: "", continent: "", country: "", century: "" })}><T k="saints.filters.clear" /></Button>
      </div>
      {!mapOnly && <p className="text-xs text-muted-foreground mt-3">El siglo usa el año de fallecimiento documentado. Las fechas desconocidas no se incluyen al elegir un siglo.</p>}
    </div>
  )
}
