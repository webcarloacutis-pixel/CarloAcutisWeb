import { createHash, randomUUID } from "node:crypto";
import { prisma } from "./prisma";
import { HttpError } from "./errors";
import { intSetting } from "./config";
import type { AiBudget } from "./ai-budget";
export const inputHash = (value: string) => createHash("sha256").update(value).digest("hex");
type Result = { text: string; model: string };
export async function withAiIdempotency(id: string, hash: string, work: () => Promise<Result>, options: { budget?: AiBudget; onStage?: () => void } = {}): Promise<Result> {
  const run = <T>(query: () => Promise<T>) => options.budget ? options.budget.run(query) : query();
  options.onStage?.();
  const existing = await run(() => prisma.aiRequest.findUnique({ where: { id } }));
  if (existing && existing.inputHash !== hash) throw new HttpError(409, "AI_REQUEST_CONFLICT");
  if (existing?.response && existing.model && existing.expiresAt.getTime() > Date.now()) return { text: existing.response, model: existing.model };
  const owner = randomUUID();
  const now = new Date();
  const leaseUntil = new Date(now.getTime() + (options.budget?.remaining() ?? intSetting("OPENAI_TIMEOUT_MS",25000,1000,30000)) + 15000);
  const expiresAt = new Date(now.getTime() + 86400000);
  const rows = await run(() => prisma.$queryRaw<Array<{id:string}>>`
    INSERT INTO "AiRequest" ("id","inputHash","leaseOwner","leaseUntil","expiresAt") VALUES (${id},${hash},${owner},(${leaseUntil}::timestamptz AT TIME ZONE 'UTC'),(${expiresAt}::timestamptz AT TIME ZONE 'UTC'))
    ON CONFLICT ("id") DO UPDATE SET "leaseOwner"=${owner}, "leaseUntil"=(${leaseUntil}::timestamptz AT TIME ZONE 'UTC'), "expiresAt"=(${expiresAt}::timestamptz AT TIME ZONE 'UTC'), "response"=NULL, "model"=NULL
    WHERE "AiRequest"."inputHash"=${hash} AND "AiRequest"."leaseUntil" < (${now}::timestamptz AT TIME ZONE 'UTC') AND ("AiRequest"."response" IS NULL OR "AiRequest"."expiresAt" <= (${now}::timestamptz AT TIME ZONE 'UTC'))
    RETURNING "id"
  `);
  if (rows.length === 0) {
    const completed = await run(() => prisma.aiRequest.findUnique({where:{id}}));
    if (completed?.inputHash !== hash) throw new HttpError(409,"AI_REQUEST_CONFLICT");
    if (completed?.response && completed.model && completed.expiresAt.getTime() > Date.now()) return {text:completed.response,model:completed.model};
    throw new HttpError(429,"AI_REQUEST_IN_PROGRESS");
  }
  // A failed/uncertain provider attempt keeps its short lease to prevent immediate duplicate billing.
  const result = await run(work);
  options.onStage?.();
  const saved = await run(() => prisma.aiRequest.updateMany({
    where:{id,inputHash:hash,leaseOwner:owner,leaseUntil:{gt:new Date()}},
    data:{response:result.text,model:result.model,leaseUntil:new Date(0)},
  }));
  if (saved.count !== 1) throw new HttpError(503,"AI_PERSISTENCE_FAILED");
  return result;
}
