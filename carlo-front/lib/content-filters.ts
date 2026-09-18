import type { Editorial } from "./editorial"
import type { ScriptureVerse } from "./scripture-data"

export const MAX_QUERY_LENGTH = 200
export type QueryValues = URLSearchParams | Record<string, string | string[] | undefined>
export function queryValue(values: QueryValues, ...keys: string[]): string {
  for (const key of keys) {
    const value = values instanceof URLSearchParams ? values.get(key) : values[key]
    if (value != null) return (Array.isArray(value) ? value[0] || "" : value).slice(0, MAX_QUERY_LENGTH)
  }
  return ""
}
export function normalizeText(value: string | null | undefined): string {
  return (value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim().replace(/\s+/g, " ")
}
export function categoryKey(value: string | null | undefined): string {
  return normalizeText(value).replace(/\s+/g, "-")
}
export const CONTINENTS = [
  { code: "europe", label: "Europa" }, { code: "asia", label: "Asia" },
  { code: "africa", label: "África" }, { code: "north-america", label: "América del Norte" },
  { code: "south-america", label: "América del Sur" }, { code: "oceania", label: "Oceanía" },
  { code: "antarctica", label: "Antártida" },
] as const
export function continentKey(value: string | null | undefined): string {
  const key = categoryKey(value)
  const aliases: Record<string, string> = {
    europa: "europe", america: "america", "america-del-norte": "north-america",
    norteamerica: "north-america", "america-del-sur": "south-america", sudamerica: "south-america",
    antartida: "antarctica", desconocido: "unknown", "sin-documentar": "unknown",
  }
  return aliases[key] || key
}
export function matchesContinent(actual: string | null | undefined, selected: string): boolean {
  if (!selected) return true
  const key = continentKey(actual)
  const selectedKey = continentKey(selected)
  if (selectedKey === "unknown") return !CONTINENTS.some((continent) => continent.code === key)
  return selectedKey === "america" ? ["north-america", "south-america"].includes(key) : key === selectedKey
}
export function countryName(code: string | null | undefined): string {
  if (!code || !/^[A-Z]{2}$/.test(code)) return "País de nacimiento sin documentar"
  return new Intl.DisplayNames(["es"], { type: "region" }).of(code) || code
}
export type PublicSaint = {
  editorial?: Editorial | null;
  id: string; slug: string; name: string; title?: string | null; country?: string | null;
  feastDay?: string | null; imageUrl?: string | null; biography?: string | null;
  patronOf?: string[] | null; canonizationYear?: number | null;
  deathYear?: number | null; birthCountryCode?: string | null; birthContinent?: string | null;
  birthPlace?: string | null; birthLat?: number | null; birthLng?: number | null;
  birthPrecision?: string | null; birthSources?: unknown;
  createdAt?: string; updatedAt?: string;
}
export type SaintFilters = { query: string; continent: string; country: string; century: string }
export function readSaintFilters(values: QueryValues): SaintFilters {
  return {
    query: queryValue(values, "q", "busqueda", "query"),
    continent: continentKey(queryValue(values, "continent", "continente")),
    country: queryValue(values, "country", "pais").trim(),
    century: queryValue(values, "century", "siglo").trim(),
  }
}
export function deathCentury(year: number | null | undefined): number | null {
  return typeof year === "number" && Number.isInteger(year) && year !== 0 ? Math.sign(year) * Math.ceil(Math.abs(year) / 100) : null
}
export function matchesCentury(year: number | null | undefined, selected: string): boolean {
  if (!selected) return true
  const century = deathCentury(year)
  if (selected === "bce") return century !== null && century < 0
  if (selected === "unknown") return century === null
  const match = /^(\d{1,2})(?:-(\d{1,2}))?$/.exec(selected)
  if (century === null || !match) return false
  const low = Number(match[1]), high = Number(match[2] || match[1])
  return low > 0 && high >= low && century >= low && century <= high
}
export function matchesCountry(saint: PublicSaint, selected: string): boolean {
  if (!selected) return true
  if (!saint.birthCountryCode) return false
  return normalizeText(selected) === normalizeText(saint.birthCountryCode) ||
    normalizeText(selected) === normalizeText(countryName(saint.birthCountryCode))
}
export function filterSaints(saints: PublicSaint[], filters: SaintFilters): PublicSaint[] {
  const query = normalizeText(filters.query)
  return saints.filter((saint) =>
    (!query || normalizeText([saint.name, saint.title, saint.biography].filter(Boolean).join(" ")).includes(query)) &&
    matchesContinent(saint.birthContinent, filters.continent) &&
    matchesCountry(saint, filters.country) && matchesCentury(saint.deathYear, filters.century),
  )
}
export function compatibleCountry(saints: PublicSaint[], country: string, continent: string): string {
  if (!country || !continent) return country
  return saints.some((saint) => matchesCountry(saint, country) && matchesContinent(saint.birthContinent, continent)) ? country : ""
}
export function hasBirthCoordinates(saint: PublicSaint): boolean {
  return typeof saint.birthLat === "number" && Number.isFinite(saint.birthLat) && Math.abs(saint.birthLat) <= 90 &&
    typeof saint.birthLng === "number" && Number.isFinite(saint.birthLng) && Math.abs(saint.birthLng) <= 180 &&
    !(saint.birthLat === 0 && saint.birthLng === 0) && Boolean(saint.birthPlace) &&
    ["city", "approximate", "exact"].includes(saint.birthPrecision || "") &&
    Array.isArray(saint.birthSources) && saint.birthSources.length > 0
}
export function groupBirthLocations(saints: PublicSaint[]): PublicSaint[][] {
  const groups = new Map<string, PublicSaint[]>()
  for (const saint of saints.filter(hasBirthCoordinates)) {
    const key = saint.birthLat + "," + saint.birthLng
    const group = groups.get(key)
    if (group) group.push(saint)
    else groups.set(key, [saint])
  }
  return [...groups.values()]
}
export const PRAYER_CATEGORIES = [
  { title: "Protección y Fortaleza", description: "Oraciones para pedir protección divina y fortaleza espiritual", tags: ["Protección", "Fortaleza", "Valor"] },
  { title: "Sanación y Consuelo", description: "Oraciones para momentos de enfermedad y necesidad de consuelo", tags: ["Sanación", "Consuelo", "Enfermedad"] },
  { title: "Gratitud y Alabanza", description: "Oraciones de agradecimiento y alabanza a Dios", tags: ["Gratitud", "Alabanza", "Acción de gracias"] },
  { title: "Guía y Sabiduría", description: "Oraciones para pedir guía divina y sabiduría", tags: ["Guía", "Sabiduría", "Discernimiento"] },
  { title: "Intercesión y Petición", description: "Oraciones de intercesión por otros y peticiones especiales", tags: ["Intercesión", "Petición", "Necesidades"] },
  { title: "Devoción Mariana", description: "Oraciones dedicadas a la Santísima Virgen María", tags: ["Virgen María", "Rosario", "Advocaciones marianas"] },
]
export type PublicPrayer = {
  id: string; title: string; content: string; category?: string | null; saintName?: string | null;
  occasion?: string | null; updatedAt?: string;
}
export function matchesPrayerCategory(actual: string | null | undefined, selected: string): boolean {
  if (!selected) return true
  const value = categoryKey(actual), key = categoryKey(selected)
  if (!value) return false
  const group = PRAYER_CATEGORIES.find((category) => categoryKey(category.title) === key)
  if (group) return value === key || group.tags.some((tag) => categoryKey(tag) === value)
  return value === key
}
export function filterPrayers<T extends PublicPrayer>(prayers: T[], values: QueryValues): T[] {
  const query = normalizeText(queryValue(values, "q", "query", "busqueda"))
  const saint = categoryKey(queryValue(values, "santo", "saint"))
  const occasion = categoryKey(queryValue(values, "ocasion", "occasion"))
  const category = queryValue(values, "categoria", "category").trim()
  return prayers.filter((prayer) =>
    (!query || normalizeText(prayer.title + " " + prayer.content).includes(query)) &&
    (!saint || categoryKey(prayer.saintName) === saint) &&
    (!occasion || categoryKey(prayer.occasion) === occasion) &&
    matchesPrayerCategory(prayer.category, category),
  )
}
export function filterScripture(verses: ScriptureVerse[], query: string, category: string): ScriptureVerse[] {
  const term = normalizeText(query)
  return verses.filter((verse) =>
    (!category || categoryKey(verse.category) === categoryKey(category)) &&
    (!term || normalizeText([verse.text, verse.reference, ...verse.emotions, ...verse.keywords].join(" ")).includes(term)),
  )
}
