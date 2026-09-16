import { createHash, randomUUID } from "node:crypto";
import { prisma } from "./prisma";
import { HttpError } from "./errors";
import { intSetting } from "./config";
export const inputHash = (value: string) => createHash("sha256").update(value).digest("hex");
type Result = { text: string; model: string };
export async function withAiIdempotency(id: string, hash: string, work: () => Promise<Result>): Promise<Result> {
  const existing = await prisma.aiRequest.findUnique({ where: { id } });
  if (existing && existing.inputHash !== hash) throw new HttpError(409, "AI_REQUEST_CONFLICT");
  if (existing?.response && existing.model && existing.expiresAt.getTime() > Date.now()) return { text: existing.response, model: existing.model };
  const owner = randomUUID();
  const now = new Date();
  const leaseUntil = new Date(now.getTime() + intSetting("OPENAI_TIMEOUT_MS",25000,1000,30000) + 15000);
  const expiresAt = new Date(now.getTime() + 86400000);
  const rows = await prisma.$queryRaw<Array<{id:string}>>`
    INSERT INTO "AiRequest" ("id","inputHash","leaseOwner","leaseUntil","expiresAt") VALUES (${id},${hash},${owner},(${leaseUntil}::timestamptz AT TIME ZONE 'UTC'),(${expiresAt}::timestamptz AT TIME ZONE 'UTC'))
    ON CONFLICT ("id") DO UPDATE SET "leaseOwner"=${owner}, "leaseUntil"=(${leaseUntil}::timestamptz AT TIME ZONE 'UTC'), "expiresAt"=(${expiresAt}::timestamptz AT TIME ZONE 'UTC')
    WHERE "AiRequest"."inputHash"=${hash} AND "AiRequest"."leaseUntil" < (${now}::timestamptz AT TIME ZONE 'UTC') AND "AiRequest"."response" IS NULL
    RETURNING "id"
  `;
  if (rows.length === 0) {
    const completed = await prisma.aiRequest.findUnique({where:{id}});
    if (completed?.inputHash !== hash) throw new HttpError(409,"AI_REQUEST_CONFLICT");
    if (completed?.response && completed.model) return {text:completed.response,model:completed.model};
    throw new HttpError(429,"AI_REQUEST_IN_PROGRESS");
  }
  // A failed/uncertain provider attempt keeps its short lease to prevent immediate duplicate billing.
  const result = await work();
  const saved = await prisma.aiRequest.updateMany({
    where:{id,inputHash:hash,leaseOwner:owner,leaseUntil:{gt:new Date()}},
    data:{response:result.text,model:result.model,leaseUntil:new Date(0)},
  });
  if (saved.count !== 1) throw new HttpError(409,"AI_REQUEST_LEASE_LOST");
  return result;
}
