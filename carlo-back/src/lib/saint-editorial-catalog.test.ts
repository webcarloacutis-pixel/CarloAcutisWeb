import { Prisma } from "@prisma/client";
import type { Request } from "express";
import { beforeEach, expect, it, vi } from "vitest";
import editorial from "../catalog/santos_orden_popularidad_editorial.json";
import { SAINT_METHODOLOGY_VERSION } from "../popularity/domain";
import { normalizeRankingName } from "../popularity/ranking";
import { readSaintCards } from "./saint-catalog";

const db = vi.hoisted(() => ({ tx: {
  saint: { findMany: vi.fn() }, popularityEstimate: { findMany: vi.fn() }, $queryRaw: vi.fn(),
} }));
vi.mock("./prisma", () => ({ prisma: { $transaction: (work: (tx: typeof db.tx) => unknown) => work(db.tx) } }));

// Original identities, with explicitly synthetic metadata/excerpts; no production IO.
const identities = editorial.santos;
const updatedAt = new Date("2026-10-10T00:00:00Z");
const metadata = identities.map(row => ({ id: row.id, name: row.name, updatedAt,
  birthCountryCode: "IT", birthContinent: "europe", deathYear: 2006 }));
const request = (query: Record<string, string> = {}) => ({ query: { view: "cards", ...query } }) as unknown as Request;

beforeEach(() => {
  vi.clearAllMocks();
  db.tx.saint.findMany.mockImplementation(async (args: { where?: { id: { in: string[] } } }) => args.where
    ? args.where.id.in.map(id => ({ ...metadata.find(row => row.id === id)!, slug: identities.find(row => row.id === id)!.slug, createdAt: updatedAt }))
    : [...metadata].reverse());
  db.tx.popularityEstimate.findMany.mockResolvedValue([{ contentType: "saint", contentId: identities[identities.length - 1].id,
    score: 100, generatedAt: updatedAt, model: "synthetic-only", methodologyVersion: SAINT_METHODOLOGY_VERSION, inputHash: "a".repeat(64) }]);
  db.tx.$queryRaw.mockImplementation(async (sql: Prisma.Sql) => sql.strings.join("").includes('left("biography"')
    ? sql.values.map(id => ({ id, biographyExcerpt: "Synthetic excerpt only." }))
    : metadata.filter(row => normalizeRankingName(row.name).includes(String(sql.values[0]))).map(row => ({ id: row.id })));
});

it("uses the exact attached editorial order before selecting the first lightweight page, regardless of AI scores", async () => {
  const page = await readSaintCards(request());
  expect(page.rankingMode).toBe("editorial");
  expect(page.items.map(row => row.id)).toEqual(identities.slice(0, 12).map(row => row.id));
  expect(page.total).toBe(179);
  expect(page.items[0]).toMatchObject({ id: identities[0].id, name: identities[0].name, slug: identities[0].slug });
  expect(page.items.every(row => !("biography" in row))).toBe(true);
  expect(db.tx.saint.findMany.mock.calls[0][0].select.biography).toBeUndefined();
  expect(db.tx.saint.findMany.mock.calls[1][0].where.id.in).toHaveLength(12);
});

it("paginates all179 identities once, in order, and retains exact previous-page navigation", async () => {
  let page = await readSaintCards(request());
  const ids: string[] = [];
  for (let iteration = 0; ; iteration++) {
    expect(iteration).toBeLessThan(15);
    ids.push(...page.items.map(row => row.id));
    if (!page.nextCursor) break;
    page = await readSaintCards(request({ cursor: page.nextCursor }));
  }
  expect(ids).toEqual(identities.map(row => row.id));
  expect(new Set(ids).size).toBe(179);
  const first = await readSaintCards(request());
  const second = await readSaintCards(request({ cursor: first.nextCursor! }));
  const third = await readSaintCards(request({ cursor: second.nextCursor! }));
  const previous = await readSaintCards(request({ cursor: third.previousCursor! }));
  expect(previous.items.map(row => row.id)).toEqual(second.items.map(row => row.id));
});

it("orders the eligible search results without injecting Carlo into nonmatching filters", async () => {
  const page = await readSaintCards(request({ q: "José" }));
  const expected = identities.filter(row => normalizeRankingName(row.name).includes("jose"));
  expect(page.items.map(row => row.id)).toEqual(expected.map(row => row.id));
  expect(page.items.some(row => row.id === identities[0].id)).toBe(false);
  expect((await readSaintCards(request({ continent: "south-america" }))).items).toEqual([]);
});

it("honors explicit alphabetical/AI order and rejects cross-order cursors", async () => {
  const alphabetical = await readSaintCards(request({ sort: "alphabetical" }));
  const expected = [...metadata].sort((a,b) => {
    const left = normalizeRankingName(a.name), right = normalizeRankingName(b.name);
    return left < right ? -1 : left > right ? 1 : a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });
  expect(alphabetical.items.map(row => row.id)).toEqual(expected.slice(0,12).map(row => row.id));
  expect(alphabetical.rankingMode).toBe("alphabetical");
  expect((await readSaintCards(request({ sort: "ai-estimate" }))).items[0].id).toBe(identities[identities.length - 1].id);
  const first = await readSaintCards(request());
  await expect(readSaintCards(request({ sort: "alphabetical", cursor: first.nextCursor! }))).rejects.toThrow("INVALID_CURSOR");
  await expect(readSaintCards(request({ sort: "unsupported" }))).rejects.toThrow("INVALID_SORT");
});
