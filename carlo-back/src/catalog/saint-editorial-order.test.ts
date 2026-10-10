import { expect, it } from "vitest";
import configuration from "./santos_orden_popularidad_editorial.json";
import { compareEditorialSaints, saintEditorialOrder, validateEditorialSaintOrder } from "./saint-editorial-order";

it("retains the179 original identities and ranks only by ID, not translated names or AI scores", () => {
  expect(saintEditorialOrder).toEqual(configuration.santos);
  expect(new Set(saintEditorialOrder.map(row => row.id)).size).toBe(179);
  expect(new Set(saintEditorialOrder.map(row => row.slug)).size).toBe(179);
  expect(saintEditorialOrder.map(row => row.orden)).toEqual(Array.from({ length: 179 }, (_, i) => i + 1));
  for (const locale of ["es", "en", "zh", "hi", "ar", "pt", "ru", "fr", "ja", "de", "ko", "it", "tr", "vi", "pl"]) {
    const translated = [...saintEditorialOrder].reverse().map(row => ({ id: row.id, name: locale + ": " + row.name }));
    expect(translated.sort(compareEditorialSaints).map(row => row.id)).toEqual(configuration.santos.map(row => row.id));
  }
});

it("preserves additional legitimate records after ranked identities with a stable name/ID tie-breaker", () => {
  const extra = [{ id: "extra-z", name: "Ágata" }, { id: "extra-a", name: "Agata" }, { id: "extra-b", name: "ZZZ" }];
  const records = [...extra, ...saintEditorialOrder].sort(compareEditorialSaints);
  expect(records).toHaveLength(182);
  expect(records.slice(0,179).map(row => row.id)).toEqual(saintEditorialOrder.map(row => row.id));
  expect(records.slice(179)).toEqual([extra[1], extra[0], extra[2]]);
  expect(records[0].id).toBe("catalog-expansion-2026-200");
});

it.each(["duplicate-id", "duplicate-slug", "missing", "nonconsecutive", "wrong-first", "second-pinned"])("rejects malformed configuration: %s", kind => {
  const invalid = structuredClone(configuration);
  if (kind === "duplicate-id") invalid.santos[1].id = invalid.santos[0].id;
  if (kind === "duplicate-slug") invalid.santos[1].slug = invalid.santos[0].slug;
  if (kind === "missing") invalid.santos.pop();
  if (kind === "nonconsecutive") invalid.santos[1].orden = 3;
  if (kind === "wrong-first") invalid.santos[0].name = "Other identity";
  if (kind === "second-pinned") invalid.santos[1].fijado = true;
  expect(() => validateEditorialSaintOrder(invalid)).toThrow("INVALID_EDITORIAL_SAINT_ORDER");
});
