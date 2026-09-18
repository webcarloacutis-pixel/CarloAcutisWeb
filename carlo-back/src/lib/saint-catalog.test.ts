import { describe, expect, it } from "vitest";
import { catalogContinent, matchesSaintMetadata, normalizeCatalogText, readSaintCatalogFilters } from "./saint-catalog";

const none = { query: "", continent: "", country: "", century: "" };
describe("server saint card filter semantics", () => {
  it("matches existing query aliases and accent/space normalization", () => {
    expect(readSaintCatalogFilters({ busqueda: "  SÁNTA  FeLicidad ", continente: "América del sur", pais: "Colombia", siglo: "20" }))
      .toEqual({ query: "santa felicidad", continent: "south-america", country: "colombia", century: "20" });
    expect(normalizeCatalogText("A\u0301gata\n prueba")).toBe("agata prueba");
    expect(catalogContinent("Sin documentar")).toBe("unknown");
  });
  it.each([{ q: ["a", "b"] }, { q: "x".repeat(201) }, { country: {} }])("rejects invalid filters before SQL %j", value => {
    expect(() => readSaintCatalogFilters(value)).toThrow("INVALID_FILTER");
  });
  it("supports combined continent aliases, country ISO/name and century ranges", () => {
    const saint = { birthContinent: "south-america", birthCountryCode: "CO", deathYear: 1901 };
    expect(matchesSaintMetadata(saint, { ...none, continent: "america", country: "colombia", century: "20-21" })).toBe(true);
    expect(matchesSaintMetadata(saint, { ...none, country: "co", century: "20" })).toBe(true);
    expect(matchesSaintMetadata(saint, { ...none, continent: "europe" })).toBe(false);
    expect(matchesSaintMetadata(saint, { ...none, country: "it" })).toBe(false);
  });
  it.each([[0, "unknown", true], [null, "unknown", true], [-1, "bce", true], [-100, "bce", true],
    [100, "1", true], [101, "2", true], [1900, "19", true], [1901, "20", true],
    [1901, "21-20", false], [1901, "invalid", false], [1901, "00", false], [null, "20", false]] as const)("checks death century %s -> %s", (deathYear, century, expected) => {
    expect(matchesSaintMetadata({ birthContinent: null, birthCountryCode: null, deathYear }, { ...none, century })).toBe(expected);
  });
  it("treats missing continent as unknown and does not invent missing countries", () => {
    const saint = { birthContinent: null, birthCountryCode: null, deathYear: null };
    expect(matchesSaintMetadata(saint, { ...none, continent: "unknown" })).toBe(true);
    expect(matchesSaintMetadata(saint, { ...none, country: "co" })).toBe(false);
  });
});
