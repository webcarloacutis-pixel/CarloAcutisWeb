import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import type { Server } from "node:http";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../app";
import { prisma } from "../lib/prisma";
import { integrationDatabaseEnabled } from "../lib/test-database";

const enabled = integrationDatabaseEnabled();
const prefix = "year-constraint-fixture-" + randomUUID() + "-";
const saintId = prefix + "existing";
const rejectedSlug = prefix + "rejected";

describe.skipIf(!enabled).sequential("known death-year CHECK rejects an unsupported BCE write safely (disposable SQL)", () => {
  let server: Server | undefined, base = "", cookie = "", targetVerified = false;
  async function request(path: string, method: string, body?: unknown) {
    return fetch(base + path, { method, headers: {
      Origin: process.env.FRONTEND_ORIGIN!, ...(cookie ? { Cookie: cookie } : {}),
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
    }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  }
  async function rawSnapshot() {
    return prisma.$queryRaw<Array<{ persisted: Record<string, unknown> }>>`
      SELECT to_jsonb(s) AS persisted FROM "Saint" s WHERE "id" = ${saintId}`;
  }
  beforeAll(async () => {
    const target = new URL(process.env.DATABASE_URL ?? "");
    expect([target.hostname, target.port, target.pathname, target.searchParams.get("schema")])
      .toEqual(["127.0.0.1", "55439", "/acutis_repair_test", "public"]);
    expect(target.searchParams.get("sslmode")).toBe("require");
    expect(target.searchParams.get("sslaccept")).toBe("strict");
    expect(existsSync(target.searchParams.get("sslcert") ?? "")).toBe(true);
    const [identity] = await prisma.$queryRaw<Array<{ database: string; schema: string; tls: boolean }>>`
      SELECT current_database() AS database, current_schema() AS schema,
        (SELECT ssl FROM pg_stat_ssl WHERE pid = pg_backend_pid()) AS tls`;
    expect(identity).toEqual({ database: "acutis_repair_test", schema: "public", tls: true });
    targetVerified = true;
    await prisma.saint.create({ data: { id: saintId, slug: saintId, name: "Synthetic existing year fixture", biography: "Preserved local biography", deathYear: 1900 } });
    server = createApp().listen(0, "127.0.0.1");
    await new Promise<void>(resolve => server!.once("listening", resolve));
    base = "http://127.0.0.1:" + (server.address() as { port: number }).port;
    const login = await request("/auth/admin/login", "POST", { password: process.env.ADMIN_KEY });
    expect(login.status).toBe(200);
    cookie = login.headers.get("set-cookie")!.split(";")[0];
  }, 30000);
  afterAll(async () => {
    if (cookie && server?.listening) await request("/auth/admin/logout", "POST");
    if (server) { server.closeAllConnections(); await new Promise<void>(resolve => server!.close(() => resolve())); }
    if (targetVerified) await prisma.saint.deleteMany({ where: { OR: [{ id: { startsWith: prefix } }, { slug: { startsWith: prefix } }] } });
    await prisma.$disconnect();
  }, 30000);
  it("records only the actual Prisma error shape, never SQL or row contents", async () => {
    const before = await rawSnapshot();
    let failure: unknown;
    try { await prisma.saint.update({ where: { id: saintId }, data: { deathYear: -4 } }); } catch (error) { failure = error; }
    expect(failure).toBeDefined();
    const error = failure as { name?: unknown; code?: unknown; meta?: Record<string, unknown>; message?: unknown };
    const meta = error.meta ?? {};
    const containsConstraint = (value: unknown) => typeof value === "string" && value.includes("Saint_deathYear_check");
    const normalizedMessage = typeof error.message === "string" ? error.message.split('\\"').join('"') : "";
    console.info("BCE_CONSTRAINT_FIXTURE_SHAPE", {
      name: typeof error.name === "string" ? error.name : null,
      code: typeof error.code === "string" && /^P\d{4}$/.test(error.code) ? error.code : null,
      metaKeys: Object.keys(meta), metaTypes: Object.fromEntries(Object.entries(meta).map(([key, value]) => [key, typeof value])),
      exactConstraintInMessage: containsConstraint(error.message),
      exactConstraintInDatabaseError: containsConstraint(meta.database_error),
      postgresErrorToken: normalizedMessage.includes("PostgresError"),
      sqlState23514: normalizedMessage.includes('code: "23514"'),
      rustSqlState23514: normalizedMessage.includes("SqlState(E23514)"),
      exactConstraintField: normalizedMessage.includes('constraint: Some("Saint_deathYear_check")'),
      exactCheckMessage: normalizedMessage.includes('violates check constraint "Saint_deathYear_check"'),
    });
    expect(containsConstraint(error.message) || containsConstraint(meta.database_error)).toBe(true);
    expect(JSON.stringify(await rawSnapshot()) === JSON.stringify(before), "Rejected BCE write must preserve all stored columns").toBe(true);
  });
  it("returns controlled HTTP400 for the existing specific death-year CHECK and preserves the row", async () => {
    const before = await rawSnapshot();
    const response = await request("/saints/" + saintId, "PATCH", { biography: "Must roll back", deathYear: -4 });
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ error: "INVALID_NUMBER" });
    expect(JSON.stringify(await rawSnapshot()) === JSON.stringify(before), "HTTP rejection must leave every stored column unchanged").toBe(true);
  });
  it("rejects a new BCE saint with the same controlled error and no persisted row or capacity charge", async () => {
    const beforeCount = await prisma.saint.count();
    const response = await request("/saints", "POST", { name: "Rejected synthetic BCE fixture", slug: rejectedSlug, deathYear: -4 });
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ error: "INVALID_NUMBER" });
    expect(await prisma.saint.count()).toBe(beforeCount);
    expect(await prisma.saint.count({ where: { slug: rejectedSlug } })).toBe(0);
  });
});
