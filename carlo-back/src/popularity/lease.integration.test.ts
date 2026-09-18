import { integrationDatabaseEnabled } from "../lib/test-database";
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { PrismaClient } from "@prisma/client";
import { prismaEstimateRepository } from "./prisma-repository";
import { inputHash, METHODOLOGY_VERSION, SAINT_METHODOLOGY_VERSION, type CompletionProvider, type PopularityContent } from "./domain";
import { createContentSource, saintContent, saintSelect } from "./content-source";
import { generateBatch, SpendBudget } from "./runner";

const enabled = integrationDatabaseEnabled();
describe.skipIf(!enabled)("popularity shared PostgreSQL lease (real isolated DB, simulated provider)", () => {
  let first: PrismaClient;
  let second: PrismaClient;
  const ownedIds: string[] = [];
  const ownedSaintIds: string[] = [];
  const item = (): PopularityContent => {
    const contentId = "audit-pop-" + randomUUID(); ownedIds.push(contentId);
    return { contentType: "verse", contentId, title: "Lease integration fixture", text: "Synthetic text", category: null };
  };
  beforeAll(async () => {
    const target = new URL(process.env.DATABASE_URL ?? "");
    if (!["localhost", "127.0.0.1"].includes(target.hostname) || target.port !== "55439" ||
        !["/acutis_repair_test", "/acutis_catalog_capacity_test"].includes(target.pathname)) throw new Error("ISOLATED_DATABASE_REQUIRED");
    first = new PrismaClient({ datasources: { db: { url: target.href } } });
    second = new PrismaClient({ datasources: { db: { url: target.href } } });
    await Promise.all([first.$connect(), second.$connect()]);
  });
  afterAll(async () => {
    if (first) {
      // Delete only the exact synthetic IDs created by this test invocation.
      if (ownedIds.length) await first.popularityEstimate.deleteMany({ where: { contentType: "verse", contentId: { in: ownedIds } } });
      if (ownedSaintIds.length) {
        await first.popularityEstimate.deleteMany({ where: { contentType: "saint", contentId: { in: ownedSaintIds } } });
        await first.saint.deleteMany({ where: { id: { in: ownedSaintIds } } });
      }
      await first.$disconnect();
    }
    if (second) await second.$disconnect();
  });

  it("one of two independent clients wins an atomic claim", async () => {
    const content = item();
    const a = prismaEstimateRepository(first), b = prismaEstimateRepository(second);
    const claims = await Promise.all([a.acquire(content, "owner-a", 10000), b.acquire(content, "owner-b", 10000)]);
    expect(claims.filter(Boolean)).toHaveLength(1);
  });

  it("expired owner cannot overwrite a successor or clear its lease", async () => {
    const content = item();
    const a = prismaEstimateRepository(first), b = prismaEstimateRepository(second);
    expect(await a.acquire(content, "old-owner", 10000)).toBe(true);
    await first.popularityEstimate.update({
      where: { contentType_contentId: { contentType: "verse", contentId: content.contentId } },
      data: { leaseUntil: new Date(0) },
    });
    expect(await b.acquire(content, "new-owner", 10000)).toBe(true);
    const estimate = { score: 66, generatedAt: new Date(), model: "test-model",
      methodologyVersion: METHODOLOGY_VERSION, inputHash: inputHash(content, "test-model") };
    expect(await a.save(content, "old-owner", { ...estimate, score: 99 })).toBe(false);
    await a.release(content, "old-owner");
    expect(await b.save(content, "new-owner", estimate)).toBe(true);
    expect(await a.read(content)).toMatchObject({ score: 66, model: "test-model", generatedAt: estimate.generatedAt });
  });

  it("two runners trigger one simulated request and preserve the resulting valid row", async () => {
    const content = item();
    let notify!: () => void; const started = new Promise<void>(resolve => { notify = resolve; });
    let release!: () => void; const barrier = new Promise<void>(resolve => { release = resolve; });
    const provider = vi.fn<CompletionProvider>(async () => {
      notify(); await barrier;
      return { text: JSON.stringify({ contentType: "verse", contentId: content.contentId, score: 61 }), model: "fake-snapshot" };
    });
    const common = {
      source: { read: async () => content }, provider, model: "fake-model", timeoutMs: 10000,
      budget: new SpendBudget({ maxUsd: 1, inputUsdPerMillion: 1, outputUsdPerMillion: 1 }),
    };
    const job = generateBatch([content], { ...common, repository: prismaEstimateRepository(first) });
    await started;
    const duplicate = await generateBatch([content], { ...common, repository: prismaEstimateRepository(second) });
    expect(duplicate.results[0].status).toBe("leased");
    release();
    expect((await job).results[0].status).toBe("generated");
    expect(provider).toHaveBeenCalledTimes(1);
  });
  it("persists a saint methodology in the existing schema and resumes with no second simulated request", async () => {
    const id = "audit-pop-saint-" + randomUUID(); ownedSaintIds.push(id);
    const row = await first.saint.create({ data: { id, slug: id, name: "Synthetic isolated ranking fixture",
      biography: "Synthetic public identity only, never production content." }, select: saintSelect });
    const content = saintContent(row);
    const provider = vi.fn<CompletionProvider>(async () => ({ text: JSON.stringify({ contentType: "saint", contentId: id, score: 0 }), model: "mock-snapshot" }));
    const options = { source: createContentSource(first, "unused"), repository: prismaEstimateRepository(first), provider,
      model: "mock-model", timeoutMs: 10000, budget: new SpendBudget({ maxUsd: 1, inputUsdPerMillion: 1, outputUsdPerMillion: 1 }) };
    const initial = await generateBatch([content], options);
    expect(initial.results[0].status).toBe("generated");
    expect(await first.popularityEstimate.findUnique({ where: { contentType_contentId: { contentType: "saint", contentId: id } } }))
      .toMatchObject({ score: 0, model: "mock-snapshot", methodologyVersion: SAINT_METHODOLOGY_VERSION, inputHash: inputHash(content, "mock-model") });
    expect((await generateBatch([content], { ...options, source: createContentSource(second, "unused"), repository: prismaEstimateRepository(second) })).results[0].status).toBe("unchanged");
    expect(provider).toHaveBeenCalledTimes(1);
  });

});
