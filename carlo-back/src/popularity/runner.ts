import { randomUUID } from "node:crypto";
import {
  buildPrompt, inputHash, isValidEstimate, MAX_OUTPUT_TOKENS, METHODOLOGY_VERSION,
  parseScore, PopularityError, SYSTEM_PROMPT, validateContent,
  type CompletionProvider, type ContentSource, type EstimateRepository, type PopularityContent,
} from "./domain";

export interface BudgetConfig { maxUsd: number; inputUsdPerMillion: number; outputUsdPerMillion: number }
export class SpendBudget {
  private spentMicros = 0;
  readonly maxMicros: number;
  constructor(private readonly config: BudgetConfig) {
    if (![config.maxUsd, config.inputUsdPerMillion, config.outputUsdPerMillion].every(n => Number.isFinite(n) && n > 0) ||
        config.maxUsd > 100 || config.inputUsdPerMillion > 1000 || config.outputUsdPerMillion > 1000) {
      throw new PopularityError("INVALID_SPEND_CONFIG");
    }
    this.maxMicros = Math.floor(config.maxUsd * 1000000);
  }
  reserve(system: string, user: string, outputTokens: number): void {
    // A UTF-8 byte per possible token plus generous message/protocol overhead.
    // This is a conservative application estimate, never a provider billing guarantee.
    const inputBound = Buffer.byteLength(system + user, "utf8") + 2048;
    const costMicros = Math.ceil(inputBound * this.config.inputUsdPerMillion + outputTokens * this.config.outputUsdPerMillion);
    if (this.spentMicros + costMicros > this.maxMicros) throw new PopularityError("SPEND_LIMIT");
    this.spentMicros += costMicros; // Reserve failed/timeout attempts too; never refund unknown billing.
  }
  get reservedUsd(): number { return this.spentMicros / 1000000; }
}

export interface RunnerOptions {
  repository: EstimateRepository;
  source: ContentSource;
  provider: CompletionProvider;
  model: string;
  budget: SpendBudget;
  timeoutMs?: number;
  retries?: 0 | 1;
  signal?: AbortSignal;
}
export type ItemStatus = "generated" | "unchanged" | "leased" | "missing" | "changed" | "failed" | "budget_exhausted";
export interface ItemResult { contentType: string; contentId: string; status: ItemStatus; code?: string }
export interface BatchResult { results: ItemResult[]; reservedUsd: number }

function safeErrorCode(error: unknown): string {
  if (error instanceof PopularityError) return error.code;
  if (error && typeof error === "object" && "code" in error && error.code === "AI_TIMEOUT") return "PROVIDER_TIMEOUT";
  return "PROVIDER_OR_STORAGE_FAILURE";
}
function retryable(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const status = (error as { status?: unknown; statusCode?: unknown }).status ??
    (error as { statusCode?: unknown }).statusCode;
  return [429, 502, 503, 504].includes(status as number);
}

async function callWithDeadline(provider: CompletionProvider, request: Omit<Parameters<CompletionProvider>[0], "signal">,
  timeoutMs: number, parentSignal?: AbortSignal): ReturnType<CompletionProvider> {
  const controller = new AbortController();
  let timeout: ReturnType<typeof setTimeout> | undefined;
  let rejectAbort: (reason: unknown) => void = () => undefined;
  const abort = () => { controller.abort(); rejectAbort(new PopularityError("CANCELLED")); };
  try {
    if (parentSignal?.aborted) throw new PopularityError("CANCELLED");
    return await Promise.race([
      new Promise<never>((_resolve, reject) => {
        rejectAbort = reject;
        timeout = setTimeout(() => {
          controller.abort();
          reject(new PopularityError("PROVIDER_TIMEOUT"));
        }, timeoutMs);
        parentSignal?.addEventListener("abort", abort, { once: true });
      }),
      provider({ ...request, signal: controller.signal }),
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
    parentSignal?.removeEventListener("abort", abort);
  }
}

export async function generateBatch(contents: readonly PopularityContent[], options: RunnerOptions): Promise<BatchResult> {
  const timeoutMs = options.timeoutMs ?? 25000;
  const retries = options.retries ?? 0;
  if (!Number.isInteger(timeoutMs) || timeoutMs < 10 || timeoutMs > 60000 ||
      ![0, 1].includes(retries) || contents.length > 100 ||
      !/^[a-zA-Z0-9][a-zA-Z0-9:._/-]{0,127}$/.test(options.model)) throw new PopularityError("INVALID_RUN_CONFIG");
  const results: ItemResult[] = [];
  const seen = new Set<string>();
  for (const candidate of contents) {
    const key = { contentType: candidate.contentType, contentId: candidate.contentId };
    const result = (status: ItemStatus, code?: string): ItemResult => ({ ...key, status, ...(code ? { code } : {}) });
    const uniqueKey = key.contentType + ":" + key.contentId;
    if (seen.has(uniqueKey)) { results.push(result("unchanged", "DUPLICATE_INPUT")); continue; }
    seen.add(uniqueKey);
    if (options.signal?.aborted) { results.push(result("failed", "CANCELLED")); break; }
    const owner = randomUUID();
    let acquired = false;
    let keepLease = false;
    try {
      validateContent(candidate);
      const current = await options.source.read(key);
      if (!current) { results.push(result("missing")); continue; }
      const hash = inputHash(current, options.model);
      const previous = await options.repository.read(key);
      if (isValidEstimate(previous) && previous.inputHash === hash &&
          previous.methodologyVersion === METHODOLOGY_VERSION) {
        results.push(result("unchanged")); continue;
      }
      acquired = await options.repository.acquire(key, owner, timeoutMs * (retries + 1) + 10000);
      if (!acquired) { results.push(result("leased")); continue; }
      // Another command may have completed between our initial read and lease claim.
      const locked = await options.repository.read(key);
      if (isValidEstimate(locked) && locked.inputHash === hash && locked.methodologyVersion === METHODOLOGY_VERSION) {
        results.push(result("unchanged")); continue;
      }
      const user = buildPrompt(current);
      let completion: Awaited<ReturnType<CompletionProvider>> | undefined;
      for (let attempt = 0; attempt <= retries; attempt++) {
        options.budget.reserve(SYSTEM_PROMPT, user, MAX_OUTPUT_TOKENS);
        try {
          completion = await callWithDeadline(options.provider, {
            system: SYSTEM_PROMPT, user, model: options.model, maxTokens: MAX_OUTPUT_TOKENS, maxRetries: 0,
          }, timeoutMs, options.signal);
          break;
        } catch (error) {
          // Timeout/cancellation has uncertain provider billing/completion: never retry.
          if (["PROVIDER_TIMEOUT", "CANCELLED"].includes(safeErrorCode(error))) keepLease = true;
          if (attempt === retries || keepLease || !retryable(error)) throw error;
        }
      }
      if (!completion || typeof completion.model !== "string" || !completion.model.trim() || completion.model.length > 200) {
        throw new PopularityError("INVALID_PROVIDER_OUTPUT");
      }
      const score = parseScore(completion.text, current);
      const latest = await options.source.read(key);
      if (!latest || inputHash(latest, options.model) !== hash) {
        results.push(result("changed", "CONTENT_CHANGED_DURING_GENERATION")); continue;
      }
      const saved = await options.repository.save(key, owner, {
        score, model: completion.model, generatedAt: new Date(),
        methodologyVersion: METHODOLOGY_VERSION, inputHash: hash,
      });
      results.push(saved ? result("generated") : result("leased", "LEASE_LOST"));
    } catch (error) {
      const code = safeErrorCode(error);
      results.push(result(code === "SPEND_LIMIT" ? "budget_exhausted" : "failed", code));
      if (code === "SPEND_LIMIT" || code === "CANCELLED") break;
    } finally {
      if (acquired && !keepLease) {
        // Owner fencing prevents one worker from releasing another worker's lease.
        try { await options.repository.release(key, owner); } catch { /* Lease still expires in DB. */ }
      }
    }
  }
  return { results, reservedUsd: options.budget.reservedUsd };
}
