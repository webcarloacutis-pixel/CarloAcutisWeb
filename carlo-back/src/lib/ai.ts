import OpenAI from "openai";
import { createHmac, randomUUID } from "node:crypto";
import { prisma } from "./prisma";
import { intSetting } from "./config";
import { HttpError } from "./errors";
import { classifyAiProviderError, ensureAiConfigured } from "./ai-errors";
export interface AiCompletionInput {
  system: string;
  user: string;
  maxTokens: number;
  temperature?: number;
  model?: string;
  maxRetries?: 0 | 1;
  signal?: AbortSignal;
}
export const aiModel = () => process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";
export function privateHash(value: string) {
  const key = process.env.JWT_SECRET;
  if (!key || key.length < 32) throw new HttpError(503, "AUTH_NOT_CONFIGURED");
  return createHmac("sha256", key).update(value).digest("hex");
}
export async function consumeQuota(scope: string, limit: number, windowMs: number) {
  const window = Math.floor(Date.now() / windowMs);
  const key = privateHash(scope + ":" + window);
  const expiresAt = new Date((window + 1) * windowMs);
  const rows = await prisma.$queryRaw<Array<{ count: number }>>`
    INSERT INTO "ApiQuota" ("key", "count", "expiresAt") VALUES (${key}, 1, (${expiresAt}::timestamptz AT TIME ZONE 'UTC'))
    ON CONFLICT ("key") DO UPDATE SET "count" = "ApiQuota"."count" + 1
    WHERE "ApiQuota"."count" < ${limit}
    RETURNING "count"
  `;
  if (rows.length === 0) throw new HttpError(429, "AI_QUOTA_EXCEEDED");
}
export async function withAiCapacity<T>(work: () => Promise<T>): Promise<T> {
  const slots = intSetting("AI_MAX_CONCURRENCY", 2, 1, 8);
  const timeout = intSetting("OPENAI_TIMEOUT_MS", 25000, 1000, 30000);
  const owner = randomUUID();
  let lease: string | undefined;
  for (let slot = 0; slot < slots; slot += 1) {
    const id = "provider:" + slot;
    await prisma.aiLease.upsert({ where: { id }, create: { id, expiresAt: new Date(0) }, update: {} });
    const claimed = await prisma.aiLease.updateMany({
      where: { id, expiresAt: { lt: new Date() } }, data: { owner, expiresAt: new Date(Date.now() + timeout + 10000) },
    });
    if (claimed.count === 1) { lease = id; break; }
  }
  if (!lease) throw new HttpError(429, "AI_BUSY");
  try {
    // Shared across replicas; counts attempts conservatively, including provider failures.
    await consumeQuota("provider:daily", intSetting("AI_DAILY_REQUEST_LIMIT", 100, 1, 10000), 86400000);
    return await work();
  } finally {
    await prisma.aiLease.updateMany({ where: { id: lease, owner }, data: { owner: null, expiresAt: new Date(0) } });
  }
}
export async function runAiCompletion(input: AiCompletionInput): Promise<{ text: string; model: string }> {
  ensureAiConfigured();
  if (!Number.isInteger(input.maxTokens) || input.maxTokens < 1 || input.maxTokens > 2048 || input.user.length > 32000 || input.system.length > 10000) throw new HttpError(400, "INVALID_AI_REQUEST");
  const model = input.model || aiModel();
  const timeout = intSetting("OPENAI_TIMEOUT_MS", 25000, 1000, 30000);
  if (input.signal?.aborted) throw new HttpError(504, "AI_TIMEOUT");
  return withAiCapacity(async () => {
    // Capacity acquisition awaits PostgreSQL; cancellation can arrive before listeners exist.
    if (input.signal?.aborted) throw new HttpError(504, "AI_TIMEOUT");
    const controller = new AbortController();
    const abort = () => controller.abort();
    input.signal?.addEventListener("abort", abort, { once: true });
    const timer = setTimeout(abort, timeout);
    try {
      const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY!.trim(), maxRetries: 0, timeout, logLevel: "off" });
      for (let attempt = 0; ; attempt += 1) {
        try {
          const completion = await client.chat.completions.create({
            model, messages: [{ role: "system", content: input.system }, { role: "user", content: input.user }],
            max_completion_tokens: input.maxTokens, temperature: input.temperature ?? 0.2,
          }, { signal: controller.signal, maxRetries: 0 });
          const choice = completion.choices?.[0];
          const result = choice?.message?.content?.trim();
          if (!result || choice.finish_reason !== "stop") throw new HttpError(502, "AI_RESPONSE_INVALID");
          return { text: result, model: completion.model || model };
        } catch (error: unknown) {
          if (controller.signal.aborted) throw new HttpError(504, "AI_TIMEOUT");
          const classified = classifyAiProviderError(error);
          if (classified.code === "AI_RATE_LIMIT" && attempt < (input.maxRetries ?? 0)) {
            await new Promise<void>((resolve, reject) => {
              const onAbort = () => { clearTimeout(delay); reject(new HttpError(504, "AI_TIMEOUT")); };
              const delay = setTimeout(() => { controller.signal.removeEventListener("abort", onAbort); resolve(); }, 300);
              controller.signal.addEventListener("abort", onAbort, { once: true });
            });
            await consumeQuota("provider:daily", intSetting("AI_DAILY_REQUEST_LIMIT", 100, 1, 10000), 86400000);
            continue;
          }
          throw classified;
        }
      }
    } finally {
      clearTimeout(timer);
      input.signal?.removeEventListener("abort", abort);
    }
  });
}
