import { describe, expect, it } from "vitest"
import { compatibleCountry, deathCentury, filterPrayers, filterSaints, filterScripture, groupBirthLocations, hasBirthCoordinates, matchesPrayerCategory, queryValue, readSaintFilters, type PublicSaint } from "./content-filters"
import { scriptureData } from "./scripture-data"
const saints: PublicSaint[] = [
  { id: "1", slug: "a", name: "San Martín", deathYear: 1639, birthCountryCode: "PE", birthContinent: "south-america" },
  { id: "2", slug: "b", name: "Santa María", deathYear: 2001, birthCountryCode: "US", birthContinent: "north-america" },
  { id: "3", slug: "c", name: "San Martín", deathYear: null, birthCountryCode: "IT", birthContinent: "europe" },
]
describe("death-century catalogue contract", () => {
  it.each([[-101, -2], [-100, -1], [-1, -1], [100, 1], [101, 2], [1900, 19], [1901, 20], [2000, 20], [2001, 21]])("%i belongs to century %i", (year, century) => {
    expect(deathCentury(year)).toBe(century)
  })
  it.each([null, undefined, 0, 2000.5, NaN, Infinity])("does not invent a century for %s", (year) => expect(deathCentury(year)).toBeNull())
  it("combines normalized query, birthplace continent, country and death century", () => {
    expect(filterSaints(saints, readSaintFilters(new URLSearchParams("q= SAN  MARTIN &continent=América&country=Perú&century=16-20"))).map((s) => s.id)).toEqual(["1"])
  })
  it("keeps BCE, approximate numbered years and unknown dates distinct", () => {
    const historical = [...saints, {id:"bce",slug:"bce",name:"Fecha anterior",deathYear:-4}];
    expect(filterSaints(historical,readSaintFilters(new URLSearchParams("century=bce"))).map(s=>s.id)).toEqual(["bce"]);
    expect(filterSaints(historical,readSaintFilters(new URLSearchParams("century=unknown"))).map(s=>s.id)).toEqual(["3"]);
    expect(filterSaints(historical,readSaintFilters(new URLSearchParams("century=1")))).toHaveLength(0);
  });
  it("preserves America alias covering both geographical continents", () => expect(filterSaints(saints, readSaintFilters(new URLSearchParams("continent=america")))).toHaveLength(2))
  it("preserves the undocumented continent filter and its legacy URL alias", () => {
    const undocumented = { id: "unknown", slug: "unknown", name: "Nacimiento sin documentar", birthContinent: null }
    expect(filterSaints([...saints, undocumented], readSaintFilters(new URLSearchParams("continent=desconocido")))).toEqual([undocumented])
    expect(filterSaints([...saints, undocumented], readSaintFilters(new URLSearchParams("continent=unknown")))).toEqual([undocumented])
  })
  it("excludes missing death years and unknown filters", () => {
    expect(filterSaints(saints, readSaintFilters(new URLSearchParams("century=21"))).map((s) => s.id)).toEqual(["2"])
    expect(filterSaints(saints, readSaintFilters(new URLSearchParams("continent=unknown")))).toEqual([])
    expect(filterSaints(saints, readSaintFilters(new URLSearchParams("century=0")))).toEqual([])
  })
  it("retains a compatible country and clears an incompatible one", () => {
    expect(compatibleCountry(saints, "PE", "america")).toBe("PE")
    expect(compatibleCountry(saints, "PE", "europe")).toBe("")
  })
  it("bounds URL values and selects the first repeated parameter", () => {
    expect(queryValue({ q: ["abc", "ignored"] }, "q")).toBe("abc")
    expect(queryValue({ q: "x".repeat(2000) }, "q")).toHaveLength(200)
    expect(readSaintFilters(new URLSearchParams({ q: "San " })).query).toBe("San ")
  })
})
describe("documented birthplace markers", () => {
  const located: PublicSaint = { ...saints[0], birthPlace: "Asís", birthLat: 43.071111, birthLng: 12.614722, birthPrecision: "city", birthSources: ["https://whc.unesco.org/en/list/990/maps/"] }
  it("never treats legacy nationality/location or unknown values as birthplace", () => {
    expect(hasBirthCoordinates({ ...saints[0], country: "Italia" })).toBe(false)
    expect(hasBirthCoordinates({ ...located, birthLat: 0, birthLng: 0 })).toBe(false)
    expect(hasBirthCoordinates({ ...located, birthLat: NaN })).toBe(false)
    expect(hasBirthCoordinates({ ...located, birthLat: 91 })).toBe(false)
    expect(hasBirthCoordinates({ ...located, birthSources: [] })).toBe(false)
  })
  it("groups exactly overlapping locations without displacing the factual coordinates", () => {
    const groups = groupBirthLocations([located, { ...located, id: "overlap" }, saints[2]])
    expect(groups).toHaveLength(1)
    expect(groups[0]).toHaveLength(2)
    expect(groups[0][0].birthLat).toBe(43.071111)
  })
})
describe("prayer and scripture URL searches", () => {
  const prayers = [
    { id: "a", title: "Oración de paz", content: "Párrafo primero.\n\nSeñor, danos fortaleza.", category: "Fortaleza", saintName: "San Martín", occasion: "Día difícil" },
    { id: "b", title: "Vacía", content: "Sin categoría", category: null },
  ]
  it("uses the same classification for category counters and results", () => {
    const category = "proteccion-y-fortaleza"
    expect(prayers.filter((p) => matchesPrayerCategory(p.category, category))).toEqual(filterPrayers(prayers, new URLSearchParams({ categoria: category })))
    expect(filterPrayers(prayers, new URLSearchParams({ categoria: category }))).toHaveLength(1)
    expect(filterPrayers(prayers, new URLSearchParams({ categoria: "xyz" }))).toEqual([])
  })
  it("combines aliases, accents and spaces without rewriting prayer content", () => {
    const result = filterPrayers(prayers, new URLSearchParams({ busqueda: "  SENOR,  danos ", santo: "san-martin", ocasion: "dia-dificil" }))
    expect(result).toHaveLength(1)
    expect(result[0].content).toBe(prayers[0].content)
  })
  it("searches scripture accents, references and categories from the same source", () => {
    expect(filterScripture(scriptureData, " ISAIAS  41:10 ", "")[0]?.id).toBe("1")
    const result = filterScripture(scriptureData, "", "miedo-y-ansiedad")
    expect(result.length).toBeGreaterThan(0)
    expect(result.every((verse) => verse.category === "Miedo y Ansiedad")).toBe(true)
    expect(filterScripture(scriptureData, "", "does-not-exist")).toEqual([])
  })
})
