import { describe, expect, it } from "vitest";
import { compareMiracleCards, readMiracleCatalogFilters } from "./miracle-catalog";

describe("miracle cards preserve search and approval filters", () => {
  it("normalizes query, supports verified alias and preserves exact type labels", () => {
    expect(readMiracleCatalogFilters({ q: "  CURACIÓN  ", saintId: "saint-1", type: " Eucarístico ", verified: "true" }))
      .toEqual({ query: "curacion", saintId: "saint-1", type: "Eucarístico", approved: true });
    expect(readMiracleCatalogFilters({ approved: "false" }).approved).toBe(false);
    expect(readMiracleCatalogFilters({})).toEqual({ query: "", saintId: "", type: "", approved: null });
  });
  it.each([{ approved: "yes" }, { approved: "true", verified: "false" }, { q: "x".repeat(201) }, { type: ["a", "b"] }, { saintId: {} }])("rejects invalid filters %j", values => { expect(() => readMiracleCatalogFilters(values)).toThrow("INVALID_FILTER"); });
  it("orders by approval then creation time and ID, never an invented miracle popularity score", () => {
    const old = new Date("2026-01-01"), recent = new Date("2026-02-01");
    const items = [{ id: "c", approved: false, createdAt: recent }, { id: "b", approved: true, createdAt: old },
      { id: "d", approved: true, createdAt: recent }, { id: "a", approved: true, createdAt: old }];
    expect(items.sort(compareMiracleCards).map(row => row.id)).toEqual(["d", "a", "b", "c"]);
  });
});
