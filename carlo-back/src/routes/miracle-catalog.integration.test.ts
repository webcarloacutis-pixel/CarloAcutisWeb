import { randomUUID } from "node:crypto";
import type { Server } from "node:http";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../app";
import { prisma } from "../lib/prisma";
import { integrationDatabaseEnabled } from "../lib/test-database";

const enabled = integrationDatabaseEnabled(), prefix = "miracle-cards-fixture-" + randomUUID() + "-";
const saintA = prefix + "saint-a", saintB = prefix + "saint-b";
const itemId = (i: number) => prefix + String(i).padStart(3, "0");
type Page = { items: { id: string; saintId: string; approved: boolean; saint: { id: string; name: string; slug: string } }[];
  total: number; hasMore: boolean; nextCursor: string | null; previousCursor: string | null; hasPrevious: boolean; offset: number;
  metadata: { approvedTotal: number; facets: { types: string[] } } };

describe.skipIf(!enabled).sequential("miracle server cards retain public/admin/relationship boundaries", () => {
  let server: Server, base: string, cookie = "";
  async function get(path: string, authenticated = false) { return fetch(base + path, { headers: authenticated ? { Cookie: cookie } : {} }); }
  async function page(path = "/miracles?view=cards", authenticated = false): Promise<Page> {
    const response = await get(path, authenticated); expect(response.status).toBe(200); return response.json() as Promise<Page>;
  }
  beforeAll(async () => {
    await prisma.saint.createMany({ data: [{ id: saintA, slug: saintA, name: "Ágata synthetic relation" }, { id: saintB, slug: saintB, name: "Other synthetic relation" }] });
    await prisma.miracle.createMany({ data: Array.from({ length: 179 }, (_, i) => ({ id: itemId(i), saintId: i % 2 ? saintB : saintA,
      title: "Synthetic miracle " + i, details: i === 177 ? "Marcador aislado final 100%_literal" : "Synthetic-only details.",
      type: i === 178 ? "PENDING_PRIVATE_TYPE" : i % 2 ? "Curación" : "Eucarístico", approved: i !== 178,
      createdAt: new Date(Date.UTC(2026, 0, 1) + i * 1000) })) });
    server = createApp().listen(0, "127.0.0.1"); await new Promise<void>(resolve => server.once("listening", resolve));
    base = "http://127.0.0.1:" + (server.address() as { port: number }).port;
    const login = await fetch(base + "/auth/admin/login", { method: "POST", headers: { "Content-Type": "application/json", Origin: process.env.FRONTEND_ORIGIN! }, body: JSON.stringify({ password: process.env.ADMIN_KEY }) });
    expect(login.status).toBe(200); cookie = login.headers.get("set-cookie")!.split(";")[0];
  }, 30000);
  afterAll(async () => {
    if (server) await new Promise<void>(resolve => server.close(() => resolve()));
    await prisma.miracle.deleteMany({ where: { id: { startsWith: prefix } } });
    await prisma.saint.deleteMany({ where: { id: { in: [saintA, saintB] } } }); await prisma.$disconnect();
  }, 30000);
  it("returns twelve details with joined identities and collects all pages without duplicates", async () => {
    let current = await page(); expect(current.items).toHaveLength(12); expect(current.total).toBe(178);
    expect(current.items[0]).toMatchObject({ id: itemId(177), saint: { id: saintB, name: "Other synthetic relation" } });
    expect(current.metadata).toMatchObject({ approvedTotal: 178 });
    expect(current.metadata.facets.types).not.toContain("PENDING_PRIVATE_TYPE");
    const all: string[] = [];
    for (let i = 0; ; i++) {
      expect(i).toBeLessThan(15); all.push(...current.items.map(row => row.id));
      if (!current.nextCursor) break;
      current = await page("/miracles?view=cards&cursor=" + encodeURIComponent(current.nextCursor));
    }
    expect(all).toHaveLength(178); expect(new Set(all).size).toBe(178); expect(all).not.toContain(itemId(178));
  });
  it("combines details/saint-name search, type, relation and approved filters", async () => {
    const filtered = await page("/miracles?view=cards&q=marcador%20aislado&saintId=" + saintB + "&type=" + encodeURIComponent("Curación") + "&approved=true");
    expect(filtered.items.map(row => row.id)).toEqual([itemId(177)]);
    expect((await page("/miracles?view=cards&q=100%25_literal")).items.map(row => row.id)).toEqual([itemId(177)]);
    expect((await page("/miracles?view=cards&q=agata")).total).toBe(89);
    expect((await page("/miracles?view=cards&verified=false")).total).toBe(0);
    expect((await page("/miracles?view=cards&q=does-not-exist")).total).toBe(0);
  });
  it("enforces admin authentication and cannot reuse a private cursor or leak private facets", async () => {
    expect((await get("/miracles/all?view=cards")).status).toBe(401);
    const admin = await page("/miracles/all?view=cards", true); expect(admin.total).toBe(179);
    expect(admin.metadata.facets.types).toContain("PENDING_PRIVATE_TYPE");
    expect((await get("/miracles?view=cards&cursor=" + encodeURIComponent(admin.nextCursor!))).status).toBe(400);
    const pending = await page("/miracles/all?view=cards&approved=false", true);
    expect(pending.items.map(row => row.id)).toEqual([itemId(178)]); expect(pending.metadata.approvedTotal).toBe(0);
    expect((await get("/miracles/all?view=cards", true)).headers.get("cache-control")).toBe("private, no-store");
  });
  it("keeps Saint relations scoped, returns real 404 and retains the legacy ID list", async () => {
    expect((await page(`/saints/${saintA}/miracles?view=cards`)).total).toBe(89);
    expect((await page(`/saints/${saintA}/miracles/all?view=cards`, true)).total).toBe(90);
    expect((await page(`/saints/${saintA}/miracles?view=cards&saintId=${saintB}`)).total).toBe(0);
    expect((await get("/saints/missing-synthetic/miracles?view=cards")).status).toBe(404);
    const legacy = await page("/miracles?limit=100"); expect(legacy.items).toHaveLength(100);
    expect(legacy.items.map(row => row.id)).toEqual([...legacy.items.map(row => row.id)].sort());
  });
  it("returns prior-page cursors and rejects invalid filters, scope and limits", async () => {
    const first = await page(), second = await page("/miracles?view=cards&cursor=" + encodeURIComponent(first.nextCursor!));
    const third = await page("/miracles?view=cards&cursor=" + encodeURIComponent(second.nextCursor!));
    expect(second).toMatchObject({ previousCursor: null, hasPrevious: true, offset: 12 });
    expect((await page("/miracles?view=cards&cursor=" + encodeURIComponent(third.previousCursor!))).items).toEqual(second.items);
    for (const suffix of ["&limit=101", "&limit=0", "&approved=invalid", "&q=a&q=b", "&cursor=malformed", "&type=other&cursor=" + encodeURIComponent(first.nextCursor!)]) {
      expect((await get("/miracles?view=cards" + suffix)).status).toBe(400);
    }
  });
  it("invalidates a page sequence when a relation identity or miracle changes", async () => {
    const first = await page();
    await prisma.saint.update({ where: { id: saintA }, data: { name: "Changed synthetic relation" } });
    expect((await get("/miracles?view=cards&cursor=" + encodeURIComponent(first.nextCursor!))).status).toBe(409);
    const after = await page();
    await prisma.miracle.update({ where: { id: itemId(0) }, data: { title: "Changed synthetic miracle" } });
    const stale = await get("/miracles?view=cards&cursor=" + encodeURIComponent(after.nextCursor!));
    expect(stale.status).toBe(409); expect(await stale.json()).toMatchObject({ error: "CATALOG_CHANGED" });
  });
});
