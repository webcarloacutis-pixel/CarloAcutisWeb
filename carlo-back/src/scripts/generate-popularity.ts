import "dotenv/config";
import type { PrismaClient } from "@prisma/client";
import { inputHash, methodologyFor, PopularityError, type PopularityContent } from "../popularity/domain";
import { assertDatabaseTarget, executionConfig, parseCliArgs } from "../popularity/cli-config";
import { createContentSource, prayerContent, prayerSelect, readVerses, saintContent, saintSelect } from "../popularity/content-source";
import { openSpendLedger } from "../popularity/spend-ledger";
import { batchContinuation, generateBatch } from "../popularity/runner";

export async function main(args = process.argv.slice(2)): Promise<void> {
  const options = parseCliArgs(args, process.cwd());
  const configuration = options.execute ? executionConfig(process.env) : null;
  // Budget validation happens before any database connection or provider import.
  const ledger = configuration ? openSpendLedger(configuration.ledgerFile, configuration.model, configuration.budget) : null;
  const budget = ledger?.budget ?? null;
  let client: PrismaClient | null = null;
  const controller = new AbortController();
  const cancel = () => controller.abort();
  process.once("SIGINT", cancel);
  process.once("SIGTERM", cancel);
  try {
    if (options.kind !== "verse" || options.execute) {
      assertDatabaseTarget(process.env);
      client = (await import("../lib/prisma")).prisma;
    }
    let contents: PopularityContent[];
    if (options.kind === "verse") {
      contents = (await readVerses(options.verseFile))
        .sort((a, b) => a.contentId < b.contentId ? -1 : a.contentId > b.contentId ? 1 : 0)
        .filter(item => !options.after || item.contentId > options.after).slice(0, options.limit);
    } else if (options.kind === "saint") {
      if (!client) throw new PopularityError("DATABASE_REQUIRED");
      const rows = await client.saint.findMany({
        where: options.after ? { id: { gt: options.after } } : {},
        select: saintSelect, orderBy: { id: "asc" }, take: options.limit,
      });
      contents = rows.map(saintContent);
    } else {
      if (!client) throw new PopularityError("DATABASE_REQUIRED");
      const rows = await client.prayer.findMany({
        where: { approved: true, ...(options.after ? { id: { gt: options.after } } : {}) },
        select: prayerSelect, orderBy: { id: "asc" }, take: options.limit,
      });
      contents = rows.map(prayerContent);
    }
    const model = configuration?.model || process.env.POPULARITY_MODEL || process.env.OPENAI_MODEL || "not-configured";
    const nextCursor = contents.length === options.limit ? contents[contents.length - 1]?.contentId ?? null : null;
    if (!options.execute) {
      process.stdout.write(JSON.stringify({
        mode: "dry-run", methodologyVersion: methodologyFor(options.kind), model,
        count: contents.length, nextCursor,
        items: contents.map(content => ({
          contentType: content.contentType, contentId: content.contentId, inputHash: inputHash(content, model),
        })),
        providerCalls: 0, databaseWrites: 0,
      }, null, 2) + "\n");
      return;
    }
    if (!client || !configuration || !budget) throw new PopularityError("INVALID_RUN_CONFIG");
    const { runAiCompletion } = await import("../lib/ai");
    const { prismaEstimateRepository } = await import("../popularity/prisma-repository");
    const result = await generateBatch(contents, {
      repository: prismaEstimateRepository(client),
      source: createContentSource(client, options.verseFile),
      provider: runAiCompletion, model: configuration.model, budget,
      timeoutMs: configuration.timeoutMs, retries: configuration.retries, signal: controller.signal,
    });
    const continuation = batchContinuation(contents, result.results, options.after, options.limit);
    process.stdout.write(JSON.stringify({ mode: "execute", ...result, ...continuation }, null, 2) + "\n");
    if (continuation.retryRequired) process.exitCode = 1;
  } finally {
    process.removeListener("SIGINT", cancel);
    process.removeListener("SIGTERM", cancel);
    try { if (client) await client.$disconnect(); } finally { ledger?.close(); }
  }
}
if (require.main === module) {
  main().catch((error: unknown) => {
    // Never print a provider response, connection URL, credential, or input content.
    process.stderr.write(JSON.stringify({
      error: error instanceof PopularityError ? error.code : "POPULARITY_COMMAND_FAILED",
    }) + "\n");
    process.exitCode = 1;
  });
}
