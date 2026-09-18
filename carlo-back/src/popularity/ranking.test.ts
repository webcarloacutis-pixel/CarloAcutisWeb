import { describe, expect, it } from "vitest";
import { compareSaintRank, normalizeRankingName, publicSaintEstimate, saintRankingRevision } from "./ranking";
import { SAINT_METHODOLOGY_VERSION, type EstimateRow } from "./domain";

const estimate: EstimateRow = { contentType: "saint", contentId: "a", score: 72,
  generatedAt: new Date("2026-09-18T00:00:00Z"), model: "mock-model",
  methodologyVersion: SAINT_METHODOLOGY_VERSION, inputHash: "a".repeat(64) };
const saints = [{ id: "a", name: "Santa Ágata", updatedAt: new Date("2026-09-01T00:00:00Z") }];

describe("global saint ranking metadata", () => {
  it("normalizes accented Unicode and whitespace without runtime locale ordering", () => {
    expect(normalizeRankingName("  SANTA  A\u0301GATA\t")).toBe("santa agata");
  });
  it("globally ranks all 3000 items before paging, with zero before unknowns and stable ties", () => {
    const items = Array.from({ length: 3000 }, (_, i) => ({ id: String(i).padStart(4, "0"),
      name: "Santo " + String(i).padStart(4, "0"), popularityScore: null as number | null }));
    items[2999].popularityScore = 99; items[2998].popularityScore = 0;
    items[2997].popularityScore = 99;
    const sorted = [...items].sort(compareSaintRank);
    expect(sorted.slice(0, 3).map(item => item.id)).toEqual(["2997", "2999", "2998"]);
    expect(new Set(sorted.flatMap((_item, index) => index % 100 ? [] : sorted.slice(index, index + 100).map(x => x.id))).size).toBe(3000);
    expect(items[0].id).toBe("0000");
    expect([{ id: "z", name: "Ágata", popularityScore: 72 }, { id: "a", name: "Agata", popularityScore: 72 }]
      .sort(compareSaintRank).map(x => x.id)).toEqual(["a", "z"]);
  });
  it.each([-1, 101, NaN, Infinity, 1.5])("places invalid score %s with unknowns", score => {
    expect(compareSaintRank({ id: "a", name: "A", popularityScore: score }, { id: "b", name: "B", popularityScore: 0 })).toBeGreaterThan(0);
  });
  it("only exports valid saint estimates, with ISO provenance", () => {
    expect(publicSaintEstimate(estimate)).toMatchObject({ score: 72, generatedAt: "2026-09-18T00:00:00.000Z" });
    expect(publicSaintEstimate({ ...estimate, score: 0 })?.score).toBe(0);
    expect(publicSaintEstimate(null)).toBeNull();
    expect(publicSaintEstimate({ ...estimate, contentType: "verse" })).toBeNull();
    expect(publicSaintEstimate({ ...estimate, generatedAt: new Date("invalid") })).toBeNull();
    expect(publicSaintEstimate({ ...estimate, score: null })).toBeNull();
    expect(publicSaintEstimate({ ...estimate, inputHash: "bad" })).toBeNull();
  });
  it("invalidates cursors when scores, provenance or content change, not row input order", () => {
    const revision = saintRankingRevision(saints, [estimate]);
    expect(revision).toMatch(/^[a-f0-9]{32}$/);
    for (const change of [{ score: 73 }, { generatedAt: new Date("2026-09-19") }, { model: "next" },
      { methodologyVersion: "v2" }, { inputHash: "b".repeat(64) }]) {
      expect(saintRankingRevision(saints, [{ ...estimate, ...change }])).not.toBe(revision);
    }
    expect(saintRankingRevision(saints, [])).not.toBe(revision);
    expect(saintRankingRevision([{ ...saints[0], name: "Renamed" }], [estimate])).not.toBe(revision);
    const two = [...saints, { ...saints[0], id: "b" }];
    expect(saintRankingRevision(two, [estimate])).toBe(saintRankingRevision([...two].reverse(), [estimate]));
    expect(saintRankingRevision(saints, [estimate, { ...estimate, contentId: "missing" }])).toBe(revision);
  });
});
