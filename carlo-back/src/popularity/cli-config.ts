import { isAbsolute, resolve } from "node:path";
import { PopularityError, type ContentType } from "./domain";
import type { BudgetConfig } from "./runner";

export interface CliOptions { execute: boolean; kind: ContentType; limit: number; after?: string; verseFile: string }
export function parseCliArgs(args: readonly string[], cwd: string): CliOptions {
  const options: CliOptions = {
    execute: false, kind: "verse", limit: 20,
    verseFile: resolve(cwd, "../carlo-front/lib/scripture-data.ts"),
  };
  const used = new Set<string>();
  for (let index = 0; index < args.length; index++) {
    const arg = args[index];
    if (used.has(arg)) throw new PopularityError("DUPLICATE_ARGUMENT");
    used.add(arg);
    if (arg === "--execute") { options.execute = true; continue; }
    if (arg === "--dry-run") continue;
    const value = args[++index];
    if (!value || value.startsWith("--")) throw new PopularityError("INVALID_ARGUMENT");
    if (arg === "--kind" && ["prayer", "verse", "saint"].includes(value)) options.kind = value as ContentType;
    else if (arg === "--limit" && /^\d+$/.test(value) && Number(value) >= 1 && Number(value) <= 100) options.limit = Number(value);
    else if (arg === "--after" && /^[a-zA-Z0-9_-]{1,128}$/.test(value)) options.after = value;
    else if (arg === "--verse-file") options.verseFile = resolve(cwd, value);
    else throw new PopularityError("INVALID_ARGUMENT");
  }
  if (used.has("--execute") && used.has("--dry-run")) throw new PopularityError("CONFLICTING_ARGUMENTS");
  return options;
}
type Environment = Record<string, string | undefined>;
function positiveNumber(env: Environment, name: string): number {
  const raw = env[name];
  if (!raw || !/^\d+(?:\.\d+)?$/.test(raw)) throw new PopularityError("MISSING_OR_INVALID_" + name);
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0) throw new PopularityError("MISSING_OR_INVALID_" + name);
  return value;
}
export function executionConfig(env: Environment): { model: string; ledgerFile: string; budget: BudgetConfig; timeoutMs: number; retries: 0 | 1 } {
  if (env.POPULARITY_ALLOW_PAID_REQUESTS !== "true" || env.AI_ENABLED !== "true") {
    throw new PopularityError("PAID_REQUESTS_NOT_AUTHORIZED");
  }
  if ((env.POPULARITY_PROVIDER ?? "openai") !== "openai") throw new PopularityError("UNSUPPORTED_PROVIDER");
  if (!env.OPENAI_API_KEY?.trim()) throw new PopularityError("PROJECT_AI_CREDENTIAL_REQUIRED");
  const model = env.POPULARITY_MODEL || env.OPENAI_MODEL;
  if (!model || !/^[a-zA-Z0-9][a-zA-Z0-9:._/-]{0,127}$/.test(model)) throw new PopularityError("MODEL_REQUIRED");
  const ledgerFile = env.POPULARITY_SPEND_LEDGER_FILE;
  if (!ledgerFile || !isAbsolute(ledgerFile)) throw new PopularityError("ABSOLUTE_SPEND_LEDGER_PATH_REQUIRED");
  const timeoutMs = env.POPULARITY_TIMEOUT_MS ? positiveNumber(env, "POPULARITY_TIMEOUT_MS") : 25000;
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1000 || timeoutMs > 60000) throw new PopularityError("INVALID_TIMEOUT");
  const retries = env.POPULARITY_RETRIES ?? "0";
  if (!["0", "1"].includes(retries)) throw new PopularityError("INVALID_RETRIES");
  return {
    model, ledgerFile, timeoutMs, retries: Number(retries) as 0 | 1,
    budget: {
      maxUsd: positiveNumber(env, "POPULARITY_MAX_SPEND_USD"),
      inputUsdPerMillion: positiveNumber(env, "POPULARITY_INPUT_USD_PER_MILLION"),
      outputUsdPerMillion: positiveNumber(env, "POPULARITY_OUTPUT_USD_PER_MILLION"),
    },
  };
}
export function assertDatabaseTarget(env: Environment): void {
  let target: URL;
  try { target = new URL(env.DATABASE_URL ?? ""); } catch { throw new PopularityError("DATABASE_TARGET_REQUIRED"); }
  if (!["postgres:", "postgresql:"].includes(target.protocol) ||
      !env.POPULARITY_DATABASE_HOST || target.host !== env.POPULARITY_DATABASE_HOST ||
      !env.POPULARITY_DATABASE_NAME || decodeURIComponent(target.pathname.slice(1)) !== env.POPULARITY_DATABASE_NAME) {
    throw new PopularityError("DATABASE_TARGET_MISMATCH");
  }
}
