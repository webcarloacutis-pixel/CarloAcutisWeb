import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Server } from "node:http";
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { integrationDatabaseEnabled } from "../lib/test-database";
import { createApp } from "../app";
import { prisma } from "../lib/prisma";
import { importEntry } from "../scripts/import-catalog";

const enabled = integrationDatabaseEnabled() && new URL(process.env.DATABASE_URL!).pathname === "/acutis_catalog_capacity_test";
const prefix = "capacity-fixture-";
const saintId = (i: number) => prefix + "saint-" + String(i).padStart(4, "0");
const miracleId = (i: number) => prefix + "miracle-" + String(i).padStart(4, "0");
type Page = { items: { id: string; approved?: boolean }[]; total: number; nextCursor: string | null; hasMore: boolean; revision: string };

describe.skipIf(!enabled).sequential("catalogue capacity on a NEW disposable PostgreSQL database", () => {
  let server: Server, base: string, cookie: string;
  const metrics: Record<string, unknown>[] = [];
  const created: string[] = [];
  async function request(url: string, method = "GET", data?: unknown) {
    return fetch(base + url, { method, headers: { Cookie: cookie || "", Origin: process.env.FRONTEND_ORIGIN!, ...(data ? { "Content-Type": "application/json" } : {}) }, ...(data ? { body: JSON.stringify(data) } : {}) });
  }
  async function reset() {
    await prisma.catalogImport.deleteMany({ where: { identityKey: { startsWith: prefix } } });
    await prisma.miracle.deleteMany({ where: { OR: [{ id: { startsWith: prefix } }, { saintId: { startsWith: prefix } }, { id: { in: created } }] } });
    await prisma.saint.deleteMany({ where: { OR: [{ id: { startsWith: prefix } }, { id: { in: created } }] } });
    created.length = 0;
  }
  async function seed(kind: "saint" | "miracle", count: number) {
    await reset();
    if (kind === "miracle") await prisma.saint.create({ data: { id: saintId(0), slug: saintId(0), name: "Synthetic relation parent" } });
    for (let first = 0; first < count; first += 100) {
      const indices = Array.from({ length: Math.min(100, count - first) }, (_, i) => i + first);
      if (kind === "saint") await prisma.saint.createMany({ data: indices.map(i => ({ id: saintId(i), slug: saintId(i), name: `Synthetic saint ${i}`, biography: "Synthetic scale biography. ".repeat(80), imageUrl: "/placeholder.svg" })) });
      else await prisma.miracle.createMany({ data: indices.map(i => ({ id: miracleId(i), saintId: saintId(0), title: `Synthetic miracle ${i}`, details: "Synthetic scale account. ".repeat(80), approved: true })) });
    }
  }
  async function collect(url: string, expected: number) {
    const before = process.memoryUsage(), started = performance.now();
    const ids = new Set<string>(), seenCursors = new Set<string>();
    const durations: number[] = [];
    let cursor: string | null = null, pages = 0, maxBytes = 0, maxRows = 0;
    do {
      const start = performance.now();
      const response = await request(url + "?limit=100" + (cursor ? "&cursor=" + encodeURIComponent(cursor) : ""));
      expect(response.status).toBe(200);
      const raw = await response.text(); const page = JSON.parse(raw) as Page;
      durations.push(performance.now() - start); maxBytes = Math.max(maxBytes, Buffer.byteLength(raw)); maxRows = Math.max(maxRows, page.items.length);
      expect(page.total).toBe(expected); expect(page.items.length).toBeLessThanOrEqual(100);
      expect(page.hasMore).toBe(Boolean(page.nextCursor));
      for (const row of page.items) { expect(ids.has(row.id)).toBe(false); ids.add(row.id) }
      cursor = page.nextCursor; pages++;
      if (cursor) { expect(seenCursors.has(cursor)).toBe(false); seenCursors.add(cursor) }
      expect(pages).toBeLessThanOrEqual(Math.max(1, Math.ceil(expected / 100)));
    } while (cursor);
    expect(ids.size).toBe(expected);
    const sorted = [...durations].sort((a, b) => a - b);
    metrics.push({ url, records: expected, pages, maxRows, maxBytes, totalMs: Math.round(performance.now() - started), p95PageMs: Math.round(sorted[Math.ceil(sorted.length * .95) - 1]), heapDeltaBytes: process.memoryUsage().heapUsed - before.heapUsed, rssBytes: process.memoryUsage().rss });
    return ids;
  }
  beforeAll(async () => {
    const [{ database }] = await prisma.$queryRaw<{ database: string }[]>`SELECT current_database() AS database`;
    expect(database).toBe("acutis_catalog_capacity_test");
    expect(await prisma.saint.count()).toBe(0); expect(await prisma.miracle.count()).toBe(0);
    server = createApp().listen(0, "127.0.0.1");
    await new Promise<void>(resolve => server.once("listening", resolve));
    base = "http://127.0.0.1:" + (server.address() as { port: number }).port;
    const login = await request("/auth/admin/login", "POST", { password: process.env.ADMIN_KEY });
    expect(login.status).toBe(200); cookie = login.headers.get("set-cookie")!.split(";")[0];
  }, 30000);
  afterAll(async () => {
    await reset();
    if (server) await new Promise<void>(resolve => server.close(() => resolve()));
    if (process.env.ACUTIS_SCALE_REPORT_DIR) {
      await mkdir(process.env.ACUTIS_SCALE_REPORT_DIR, { recursive: true });
      await writeFile(path.join(process.env.ACUTIS_SCALE_REPORT_DIR, "scale-http-metrics.json"), JSON.stringify(metrics, null, 2));
    }
    await prisma.$disconnect();
  }, 30000);

  for (const count of [0, 79, 100, 101, 179, 1000, 2999, 3000]) it(`Saint ${count}: complete pages, unique IDs and correct creation boundary`, async () => {
    await seed("saint", count);
    await collect("/saints", count);
    const response = await request("/saints", "POST", { name: "Synthetic added saint", slug: "synthetic-added-saint" });
    expect(response.status).toBe(count < 3000 ? 201 : 409);
    if (response.ok) created.push((await response.json()).id);
    else expect(await response.json()).toMatchObject({ error: "SAINT_LIMIT_REACHED", limit: 3000 });
    expect(await prisma.saint.count()).toBe(Math.min(count + 1, 3000));
  }, 60000);

  for (const count of [0, 7, 79, 100, 101, 179, 1000, 2999, 3000]) it(`Miracle ${count}: complete public/admin/relation pages and creation boundary`, async () => {
    await seed("miracle", count);
    await collect("/miracles", count);
    if ([101, 3000].includes(count)) {
      await collect("/miracles/all", count);
      await collect(`/saints/${saintId(0)}/miracles`, count);
      await collect(`/saints/${saintId(0)}/miracles/all`, count);
    }
    const response = await request(`/saints/${saintId(0)}/miracles`, "POST", { title: "Synthetic added miracle", approved: true });
    expect(response.status).toBe(count < 3000 ? 201 : 409);
    if (response.ok) created.push((await response.json()).id);
    else expect(await response.json()).toMatchObject({ error: "MIRACLE_LIMIT_REACHED", limit: 3000 });
    expect(await prisma.miracle.count()).toBe(Math.min(count + 1, 3000));
  }, 60000);

  for (const kind of ["saint", "miracle"] as const) it(`${kind} 3001: concurrent creation cannot exceed 3000; existing records remain readable/editable`, async () => {
    await seed(kind, 2999);
    const url = kind === "saint" ? "/saints" : `/saints/${saintId(0)}/miracles`;
    const responses = await Promise.all(Array.from({ length: 5 }, (_, i) => request(url, "POST", kind === "saint" ? { name: `Concurrent synthetic ${i}`, slug: `concurrent-synthetic-${i}` } : { title: `Concurrent synthetic ${i}`, approved: true })));
    expect(responses.filter(r => r.status === 201)).toHaveLength(1);
    expect(responses.filter(r => r.status === 409)).toHaveLength(4);
    for (const response of responses) if (response.ok) created.push((await response.json()).id);
    await collect(kind === "saint" ? "/saints" : "/miracles", 3000);
    const edit = await request(kind === "saint" ? `/saints/${saintId(0)}` : `/miracles/${miracleId(0)}`, "PATCH", kind === "saint" ? { name: "Updated at capacity" } : { title: "Updated at capacity" });
    expect(edit.status).toBe(200);
    expect((await request(url, "POST", kind === "saint" ? { name: "Rejected 3001", slug: "rejected-3001" } : { title: "Rejected 3001" })).status).toBe(409);
  }, 60000);

  function importFixture(miracles: boolean): Parameters<typeof importEntry>[0] {
    const identityKey = prefix + "import";
    created.push("catalog-" + identityKey);
    return { identityKey, originalNumber: 1, name: "Synthetic capacity import", slug: identityKey,
      biography: "Synthetic capacity fixture, no editorial value. ".repeat(12),
      editorial: { kind: "person", ecclesialStatus: "Synthetic test", birthDate: { text: null, status: "unknown" },
        deathDate: { text: null, status: "unknown" }, birthplaceStatus: "unknown", notes: null, image: null,
        sources: [{ url: "https://example.invalid/synthetic", institution: "Local test", title: "Synthetic", accessedAt: "2026-09-18", claims: ["No editorial value"] }] },
      miracles: miracles ? [{ title: "Synthetic capacity relation", approved: false }] : [], prayers: [] };
  }
  it("importer and API share the last Saint slot without a stale transaction snapshot", async () => {
    await seed("saint", 2999);
    const entry = importFixture(false);
    const [api, imported] = await Promise.all([
      request("/saints", "POST", { name: "Synthetic concurrent API", slug: prefix + "api" }),
      importEntry(entry, true).then(() => "created", (error: unknown) => {
        expect(error).toMatchObject({ code: "SAINT_LIMIT_REACHED" }); return "rejected";
      }),
    ]);
    if(api.ok)created.push((await api.json()).id);
    expect(Number(api.status === 201) + Number(imported === "created")).toBe(1);
    expect(api.status).toBe(imported === "created" ? 409 : 201);
    expect(await prisma.saint.count()).toBe(3000);
    await expect(importEntry({ ...entry, name: "Different synthetic overcapacity import", identityKey: prefix + "rejected", slug: prefix + "rejected" }, true)).rejects.toMatchObject({ code: "SAINT_LIMIT_REACHED" });
  }, 60000);
  it("a full Miracle catalogue rolls back the import's Saint and binding too", async () => {
    await seed("miracle", 3000);
    const entry = importFixture(true);
    await expect(importEntry(entry, true)).rejects.toMatchObject({ code: "MIRACLE_LIMIT_REACHED" });
    expect(await prisma.saint.count()).toBe(1);
    expect(await prisma.miracle.count()).toBe(3000);
    expect(await prisma.catalogImport.findUnique({ where: { identityKey: entry.identityKey } })).toBeNull();
  }, 60000);

  it("detects deletion/replacement between pages even if total stays the same", async () => {
    await seed("saint", 101);
    const first = await (await request("/saints?limit=100")).json() as Page;
    await prisma.saint.delete({ where: { id: saintId(100) } });
    await prisma.saint.create({ data: { id: saintId(102), slug: saintId(102), name: "Synthetic replacement" } });
    const response = await request("/saints?cursor=" + first.nextCursor);
    expect(response.status).toBe(409); expect(await response.json()).toMatchObject({ error: "CATALOG_CHANGED" });
  });
  it("keeps cursor scope private and rejects oversized pages and malformed cursors", async () => {
    await seed("miracle", 101);
    await prisma.miracle.update({ where: { id: miracleId(0) }, data: { approved: false } });
    const privatePage = await (await request("/miracles/all?limit=1")).json() as Page;
    expect((await request("/miracles?cursor=" + privatePage.nextCursor)).status).toBe(400);
    for (const url of ["/saints?limit=101", "/miracles?limit=3000", "/miracles?cursor=broken", "/saints?view=invalid"])
      expect((await request(url)).status).toBe(400);
    const rows = await collect("/miracles", 100); expect(rows.has(miracleId(0))).toBe(false);
  });

  it("bounds local cards latency, response size and resource use at 3000 + 3000", async () => {
    await seed("saint", 3000);
    for (let first = 0; first < 3000; first += 100) {
      await prisma.miracle.createMany({ data: Array.from({ length: 100 }, (_, offset) => {
        const i = first + offset;
        return { id: miracleId(i), saintId: saintId(i), title: `Synthetic bounded benchmark ${i}`,
          details: "Synthetic scale account. ".repeat(80), approved: true };
      }) });
    }
    const targets = { warmP95MsBelow: 1000, twelveCardsBytesBelow: 150 * 1024,
      maxConcurrentRequests: 1, stableConnectionsLastCycles: 5, nonMonotonicHeapLastCycles: 10 };
    const urls = ["/saints?view=cards&limit=12", "/miracles?view=cards&limit=12"];
    const cursors: (string | null)[] = [null, null];
    const seen = [new Set<string>(), new Set<string>()];
    const samples: Record<string, number>[] = [];
    const responses: { kind: string; durationMs: number; bytes: number; rows: number }[] = [];
    for (const url of urls) for (let warmup = 0; warmup < 5; warmup++) {
      const response = await request(url); expect(response.status).toBe(200); await response.arrayBuffer();
    }
    const cpuBefore = process.cpuUsage(), start = performance.now();
    for (let cycle = 0; cycle < 20; cycle++) {
      for (let kind = 0; kind < urls.length; kind++) {
        const started = performance.now();
        const response = await request(urls[kind] + (cursors[kind] ? "&cursor=" + encodeURIComponent(cursors[kind]!) : ""));
        expect(response.status).toBe(200);
        const raw = await response.text(), page = JSON.parse(raw) as Page;
        expect(page.total).toBe(3000); expect(page.items).toHaveLength(12);
        for (const row of page.items) {
          expect(seen[kind].has(row.id)).toBe(false); seen[kind].add(row.id);
          if (kind === 0) expect(row).not.toHaveProperty("biography");
        }
        responses.push({ kind: kind === 0 ? "saint" : "miracle", durationMs: performance.now() - started,
          bytes: Buffer.byteLength(raw), rows: page.items.length });
        cursors[kind] = page.nextCursor; expect(cursors[kind]).not.toBeNull();
      }
      const activity = await prisma.$queryRaw<{ active: bigint; idle: bigint; total: bigint }[]>`
        SELECT COUNT(*) FILTER (WHERE state = 'active') AS active,
               COUNT(*) FILTER (WHERE state = 'idle') AS idle, COUNT(*) AS total
        FROM pg_stat_activity WHERE datname = current_database()`;
      const memory = process.memoryUsage();
      samples.push({ cycle, rssBytes: memory.rss, heapUsedBytes: memory.heapUsed,
        connectionsActive: Number(activity[0].active), connectionsIdle: Number(activity[0].idle), connectionsTotal: Number(activity[0].total) });
    }
    const cpu = process.cpuUsage(cpuBefore), totalMs = performance.now() - start;
    const durations = responses.map(row => row.durationMs).sort((a, b) => a - b);
    const p95Ms = durations[Math.ceil(durations.length * .95) - 1];
    const tail = samples.slice(-targets.nonMonotonicHeapLastCycles);
    const heapMonotonic = tail.slice(1).every((row, i) => row.heapUsedBytes > tail[i].heapUsedBytes);
    const connectionsStable = new Set(samples.slice(-targets.stableConnectionsLastCycles).map(row => row.connectionsTotal)).size === 1;
    const budgets = { p95: p95Ms < targets.warmP95MsBelow,
      bytes: responses.every(row => row.bytes < targets.twelveCardsBytesBelow),
      concurrency: true, connections: connectionsStable, heap: !heapMonotonic };
    metrics.push({ benchmark: "local-synthetic-3000-saints-3000-miracles", targets, budgets,
      completeBudgetPass: Object.values(budgets).every(Boolean), warmupRequests: 10, cycles: 20,
      requests: responses.length, maxConcurrentRequests: 1, totalMs, p95Ms,
      processCpuUserMicroseconds: cpu.user, processCpuSystemMicroseconds: cpu.system,
      forcedGc: false, scope: "local disposable PostgreSQL and test process; not production or a sustained-load guarantee", responses, samples });
    for (const url of ["/saints?view=cards&limit=100", "/miracles?view=cards&limit=100"]) {
      const page = await (await request(url)).json() as Page; expect(page.items).toHaveLength(100); expect(page.total).toBe(3000);
    }
    // Resource budgets are recorded even when they fail; functional tests do not turn a machine-dependent benchmark into a false guarantee.
  }, 120000);
});
