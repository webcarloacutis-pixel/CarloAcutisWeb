"use client"
import { useHydrated } from "@/lib/use-hydrated"
import { T } from "@/components/t"
import { useLanguage } from "@/contexts/language-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { CONTINENTS, type SaintFilters } from "@/lib/content-filters"
import { Filter } from "lucide-react"
import { geographicName } from '@/lib/catalog-geography'

type Props = {
  filters: SaintFilters
  countries: { code: string; label: string }[]
  onChange: (filters: SaintFilters, replace?: boolean) => void
  mapOnly?: boolean
}
const selectClass = "block h-10 w-full rounded-md border border-input bg-background px-3 py-0 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
export function SaintsFilters({ filters, countries, onChange, mapOnly = false }: Props) {
  const hydrated = useHydrated()
  const { t, language } = useLanguage()
  const continents = [...CONTINENTS, { code: "america", label: "América (Norte y Sur)" }, { code: "unknown", label: "Sin documentar" }]
  return (
    <div className="bg-card rounded-lg p-6 mb-8 border">
      <h2 className="font-playfair text-lg font-semibold flex items-center gap-2 mb-4">
        <Filter className="h-5 w-5 text-primary" aria-hidden="true" /><T k="saints.filters.title" />
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
        {!mapOnly && <label className="text-sm space-y-2">
          <span>{t('catalog.searchSaints')}</span>
          <Input disabled={!hydrated} aria-label={t('catalog.searchSaints')} placeholder={t("saints.filters.searchPlaceholder")} value={filters.query} maxLength={200}
            onChange={(event) => onChange({ ...filters, query: event.target.value }, true)} />
        </label>}
        <label className="text-sm space-y-2">
          <span>{t('catalog.birthContinent')}</span>
          <select disabled={!hydrated} aria-label={t('catalog.birthContinent')} className={selectClass} value={filters.continent} onChange={(event) => onChange({ ...filters, continent: event.target.value })}>
            <option value="">{t('catalog.allContinents')}</option>
            {filters.continent && !continents.some((item) => item.code === filters.continent) && <option value={filters.continent}>{t('catalog.unavailableOption')}</option>}
            {continents.map((item) => <option key={item.code} value={item.code}>{item.code === 'unknown' ? t('catalog.notDocumented') : geographicName(item.code, language)}</option>)}
          </select>
        </label>
        <label className="text-sm space-y-2">
          <span>{t('catalog.birthCountry')}</span>
          <select disabled={!hydrated} aria-label={t('catalog.birthCountry')} className={selectClass} value={filters.country} onChange={(event) => onChange({ ...filters, country: event.target.value })}>
            <option value="">{t('catalog.allCountries')}</option>
            {filters.country && !countries.some((item) => item.code === filters.country) && <option value={filters.country}>{t('catalog.unavailableOption')}</option>}
            {countries.map((item) => <option key={item.code} value={item.code}>{geographicName(item.code, language)}</option>)}
          </select>
        </label>
        {!mapOnly && <label className="text-sm space-y-2">
          <span>{t('catalog.deathCentury')}</span>
          <select disabled={!hydrated} aria-label={t('catalog.deathCentury')} className={selectClass} value={filters.century} onChange={(event) => onChange({ ...filters, century: event.target.value })}>
            <option value="">{t('catalog.allCenturies')}</option>
            <option value="1-5">{t('catalog.century')} I–V</option><option value="6-10">{t('catalog.century')} VI–X</option>
            <option value="11-15">{t('catalog.century')} XI–XV</option><option value="16-20">{t('catalog.century')} XVI–XX</option>
            <option value="21">{t('catalog.century')} XXI</option><option value="bce">{t('catalog.beforeEra')}</option><option value="unknown">{t('catalog.unknownDeath')}</option>
            {filters.century && !["1-5", "6-10", "11-15", "16-20", "21", "bce", "unknown"].includes(filters.century) && <option value={filters.century}>{t('catalog.century')} {filters.century}</option>}
          </select>
        </label>}
        <Button disabled={!hydrated} variant="outline" onClick={() => onChange({ query: "", continent: "", country: "", century: "" })}><T k="saints.filters.clear" /></Button>
      </div>
      {!mapOnly && <p className="text-xs text-muted-foreground mt-3">{t('catalog.centuryHelp')}</p>}
    </div>
  )
}
