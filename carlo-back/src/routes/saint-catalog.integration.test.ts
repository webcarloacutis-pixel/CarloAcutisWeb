import { randomUUID } from "node:crypto";
import type { Server } from "node:http";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../app";
import { prisma } from "../lib/prisma";
import { integrationDatabaseEnabled } from "../lib/test-database";
import { SAINT_METHODOLOGY_VERSION } from "../popularity/domain";

const enabled = integrationDatabaseEnabled();
const prefix = "rank-fixture-" + randomUUID() + "-";
const fixtureId = (i: number) => prefix + String(i).padStart(3, "0");
type Page = { items: { id: string; popularityEstimate: { score: number } | null }[]; total: number; hasMore: boolean; nextCursor: string | null;
  revision: string; offset: number; previousCursor: string | null; hasPrevious: boolean; rankingMode: string; metadata: { facets: { countries: { code: string; continent: string | null }[] } } };

describe.skipIf(!enabled).sequential("server-paged global ranking (disposable SQL, synthetic estimates)", () => {
  let server: Server, base: string;
  const query = "zzrankfixture";
  const firstPath = "/saints?view=cards&q=" + query;
  async function page(url = firstPath): Promise<Page> {
    const response = await fetch(base + url); expect(response.status).toBe(200); return response.json() as Promise<Page>;
  }
  beforeAll(async () => {
    await prisma.saint.createMany({ data: Array.from({ length: 179 }, (_, i) => ({ id: fixtureId(i), slug: fixtureId(i),
      name: i === 176 ? "Ágata " + query : i === 177 ? "Agata " + query : "Synthetic " + query + " " + i,
      biography: i === 178 ? "Marcador final completo. Porcentaje 100%_literal" : "Synthetic-only biography.",
      deathYear: i === 178 ? 1995 : i === 0 ? 1 : i === 1 ? null : 1800,
      country: i === 178 ? "Colombia synthetic" : null, birthCountryCode: i === 178 ? "CO" : "IT", birthContinent: i === 178 ? "south-america" : "europe" })) });
    await prisma.popularityEstimate.createMany({ data: [[178, 99], [176, 70], [177, 70], [175, 0]].map(([i, score]) => ({
      contentType: "saint", contentId: fixtureId(i), score, generatedAt: new Date(), model: "synthetic-only",
      methodologyVersion: SAINT_METHODOLOGY_VERSION, inputHash: "a".repeat(64),
    })) });
    server = createApp().listen(0, "127.0.0.1");
    await new Promise<void>(resolve => server.once("listening", resolve));
    base = "http://127.0.0.1:" + (server.address() as { port: number }).port;
  }, 30000);
  afterAll(async () => {
    if (server) await new Promise<void>(resolve => server.close(() => resolve()));
    await prisma.popularityEstimate.deleteMany({ where: { contentType: "saint", contentId: { startsWith: prefix } } });
    await prisma.saint.deleteMany({ where: { id: { startsWith: prefix } } });
    await prisma.$disconnect();
  }, 30000);
  it("answers public HEAD existence without content and keeps missing details HTTP404", async () => {
    const found = await fetch(base + "/saints/" + fixtureId(0), { method: "HEAD" });
    expect(found.status).toBe(200); expect(await found.text()).toBe("");
    expect(found.headers.get("content-type")).toBeNull();
    expect(found.headers.get("cache-control")).toContain("public");
    const missing = await fetch(base + "/saints/" + fixtureId(999), { method: "HEAD" });
    expect(missing.status).toBe(404); expect(await missing.text()).toBe("");
    const detail = await fetch(base + "/saints/" + fixtureId(0));
    expect(detail.status).toBe(200); expect((await detail.json() as { biography: string }).biography).toBe("Synthetic-only biography.");
  });
  it("sorts globally beyond item100, preserves null/zero/tie semantics and returns only requested cards", async () => {
    let current = await page();
    expect(current.items).toHaveLength(12); expect(current.total).toBe(179); expect(current.rankingMode).toBe("ai-estimate");
    expect(current.items.slice(0, 4).map(row => row.id)).toEqual([178, 176, 177, 175].map(fixtureId));
    expect(current.items[3].popularityEstimate?.score).toBe(0); expect(current.items[4].popularityEstimate).toBeNull();
    expect(current.metadata.facets.countries).toEqual(expect.arrayContaining([{ code: "CO", continent: "south-america" }, { code: "IT", continent: "europe" }]));
    const found: string[] = [];
    for (let i = 0; ; i++) {
      expect(i).toBeLessThan(15); found.push(...current.items.map(row => row.id));
      expect(current.hasMore).toBe(Boolean(current.nextCursor));
      if (!current.nextCursor) break;
      current = await page(firstPath + "&cursor=" + encodeURIComponent(current.nextCursor));
    }
    expect(found).toHaveLength(179); expect(new Set(found).size).toBe(179);
  });
  it("combines full-biography search with country/continent/century filters and treats search punctuation literally", async () => {
    const filtered = await page("/saints?view=cards&q=marcador%20final&continent=america&country=Colombia&century=20");
    expect(filtered.items.map(row => row.id)).toEqual([fixtureId(178)]);
    expect((await page("/saints?view=cards&q=" + encodeURIComponent(fixtureId(178)))).items.map(row => row.id)).toEqual([fixtureId(178)]);
    expect((await page("/saints?view=cards&q=Colombia%20synthetic")).items.map(row => row.id)).toEqual([fixtureId(178)]);
    expect((await page("/saints?view=cards&q=" + encodeURIComponent("agata " + query))).items.map(row => row.id)).toEqual([fixtureId(176), fixtureId(177)]);
    expect((await page("/saints?view=cards&q=100%25_literal")).items.map(row => row.id)).toEqual([fixtureId(178)]);
    expect((await page(firstPath + "&country=CO&continent=europe")).total).toBe(0);
    // Current migrated schema only permits positive deathYear; BCE filtering must return zero honestly.
    // Negative-year filter logic remains covered by saint-catalog.test.ts without altering the schema.
    expect((await page(firstPath + "&century=bce")).items).toEqual([]);
    expect((await page(firstPath + "&century=1")).items.map(row => row.id)).toEqual([fixtureId(0)]);
    expect((await page(firstPath + "&century=unknown")).items.map(row => row.id)).toEqual([fixtureId(1)]);
  });
  it("rejects invalid/cross-filter cursors and excessive limits without changing legacy ID pagination", async () => {
    const first = await page(firstPath + "&limit=100"); expect(first.items).toHaveLength(100);
    for (const path of [firstPath + "&limit=101", firstPath + "&limit=0", firstPath + "&cursor=bad", firstPath + "&q=other",
      firstPath + "&country=CO&cursor=" + encodeURIComponent(first.nextCursor!)]) {
      expect((await fetch(base + path)).status).toBe(400);
    }
    const legacy = await page("/saints?limit=100");
    expect(legacy.items.map(row => row.id)).toEqual([...legacy.items.map(row => row.id)].sort());
    expect(legacy.items.every(row => !("popularityEstimate" in row))).toBe(true);
  });
  it("returns exact previous-page cursors after direct navigation and projects the map without biographies", async () => {
    const first = await page(); const second = await page(firstPath + "&cursor=" + encodeURIComponent(first.nextCursor!));
    expect(first).toMatchObject({ offset: 0, hasPrevious: false, previousCursor: null });
    expect(second).toMatchObject({ offset: 12, hasPrevious: true, previousCursor: null });
    const third = await page(firstPath + "&cursor=" + encodeURIComponent(second.nextCursor!));
    expect(third).toMatchObject({ offset: 24, hasPrevious: true });
    const previous = await page(firstPath + "&cursor=" + encodeURIComponent(third.previousCursor!));
    expect(previous.items.map(row => row.id)).toEqual(second.items.map(row => row.id));
    const map = await page("/saints?view=map&q=" + query);
    expect(map.items).toHaveLength(100);
    expect(map.items.every(row => !("biography" in row) && !("editorial" in row) && "birthSources" in row)).toBe(true);
    expect((await page("/saints?view=map&q=marcador%20final")).total).toBe(1);
    expect((await fetch(base + "/saints?view=map&cursor=" + encodeURIComponent(first.nextCursor!))).status).toBe(400);
  });
  it("invalidates a cursor if estimates or source fields change between pages", async () => {
    const first = await page();
    await prisma.popularityEstimate.update({ where: { contentType_contentId: { contentType: "saint", contentId: fixtureId(178) } }, data: { score: 5 } });
    const stale = await fetch(base + firstPath + "&cursor=" + encodeURIComponent(first.nextCursor!));
    expect(stale.status).toBe(409); expect(await stale.json()).toMatchObject({ error: "CATALOG_CHANGED" });
    const next = await page();
    await prisma.saint.update({ where: { id: fixtureId(0) }, data: { imageUrl: "/synthetic-updated-image.webp" } });
    expect((await fetch(base + firstPath + "&cursor=" + encodeURIComponent(next.nextCursor!))).status).toBe(409);
  });
  it("does not advertise an AI ranking without any valid estimates", async () => {
    await prisma.popularityEstimate.deleteMany({ where: { contentType: "saint", contentId: { startsWith: prefix } } });
    const result = await page(); expect(result.rankingMode).toBe("alphabetical-unrated");
    expect(result.total).toBe(179); expect(result.items.every(row => row.popularityEstimate === null)).toBe(true);
  });
});
